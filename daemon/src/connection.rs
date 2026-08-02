use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};

use base64::engine::general_purpose::STANDARD;
use base64::Engine;
use tokio::net::unix::OwnedWriteHalf;
use tokio::net::{UnixListener, UnixStream};
use tokio::sync::{Mutex as AsyncMutex, Notify};
use uuid::Uuid;

use crate::framing::{read_frame, write_frame};
use crate::project::Project;
use crate::protocol::{ClientMessage, DaemonMessage, ProjectInfo, TerminalInfo};
use crate::store;
use crate::terminal::{TerminalConfig, TerminalHandle, DEFAULT_SCROLLBACK_LINES};

/// Shared Daemon state: every Project and every Terminal, regardless of
/// which connection created them.
pub struct Registry {
    config_path: PathBuf,
    projects: Mutex<HashMap<String, Project>>,
    terminals: Mutex<HashMap<String, Arc<TerminalHandle>>>,
}

impl Registry {
    /// Loads persisted Projects/Terminal configs from `config_path` (empty
    /// if the file doesn't exist or fails to parse — see `store::load`).
    /// Reloaded Terminals start `Parado`: whatever process they had is long
    /// gone now that the Daemon itself restarted.
    fn new(config_path: PathBuf) -> Arc<Self> {
        let (loaded_projects, loaded_terminals) = store::load(&config_path);

        let projects = loaded_projects
            .into_iter()
            .map(|p| (p.id.clone(), p))
            .collect();
        let terminals = loaded_terminals
            .into_iter()
            .map(|(id, config)| (id.clone(), TerminalHandle::reload(id, config)))
            .collect();

        Arc::new(Self {
            config_path,
            projects: Mutex::new(projects),
            terminals: Mutex::new(terminals),
        })
    }
}

/// Persists the current Projects/Terminal configs to disk. Failures are
/// logged, not fatal — a persistence hiccup shouldn't take down an
/// otherwise-healthy connection or in-memory state.
///
/// Called explicitly after each config-changing `handle_message` arm
/// (`CreateProject`, `CreateTerminal`, `DeleteTerminal`, `DeleteProject`) —
/// there's no structural guard for this, so a future message that changes
/// persisted config (e.g. a rename/update) must remember to call it too.
fn persist(registry: &Arc<Registry>) {
    let projects: Vec<Project> = registry
        .projects
        .lock()
        .unwrap()
        .values()
        .map(|p| Project {
            id: p.id.clone(),
            name: p.name.clone(),
        })
        .collect();
    let terminals: Vec<(String, TerminalConfig)> = registry
        .terminals
        .lock()
        .unwrap()
        .values()
        .map(|t| (t.id.clone(), t.config_snapshot()))
        .collect();

    if let Err(err) = store::save(&registry.config_path, &projects, &terminals) {
        eprintln!(
            "httyml-daemon: failed to persist config to {:?}: {err:#}",
            registry.config_path
        );
    }
}

type SharedWriter = Arc<AsyncMutex<OwnedWriteHalf>>;

/// Binds the Unix socket at `socket_path` and serves client connections
/// until a `ClientMessage::Shutdown` arrives or the process is killed,
/// loading (and persisting to) Project/Terminal config at `config_path`.
/// Removes any stale socket file left over from a previous run before
/// binding.
pub async fn run(socket_path: &Path, config_path: &Path) -> anyhow::Result<()> {
    if socket_path.exists() {
        std::fs::remove_file(socket_path)?;
    }
    if let Some(parent) = socket_path.parent() {
        std::fs::create_dir_all(parent)?;
    }

    let listener = UnixListener::bind(socket_path)?;
    let registry = Registry::new(config_path.to_path_buf());
    // Deliberately not `std::process::exit` — `run` is also driven in-process
    // by the integration test suite (many `run` calls in one test binary),
    // where exiting the process would tear down every other test with it.
    // Returning from this loop is enough: the standalone binary's `main`
    // ends right after, which exits the real process just as surely.
    let shutdown = Arc::new(Notify::new());

    loop {
        tokio::select! {
            accepted = listener.accept() => {
                let (stream, _addr) = accepted?;
                let registry = registry.clone();
                let shutdown = shutdown.clone();
                tokio::spawn(async move {
                    if let Err(err) = handle_connection(stream, registry, shutdown).await {
                        eprintln!("httyml-daemon: connection error: {err:#}");
                    }
                });
            }
            _ = shutdown.notified() => {
                return Ok(());
            }
        }
    }
}

fn lookup(registry: &Arc<Registry>, terminal_id: &str) -> Option<Arc<TerminalHandle>> {
    registry.terminals.lock().unwrap().get(terminal_id).cloned()
}

/// Kills a Terminal's process (if any) and removes it from the registry —
/// the shared tail end of `DeleteTerminal` and each Terminal `DeleteProject`
/// cascades over. Takes the handle directly rather than re-looking it up, so
/// a caller that already scanned the registry (like the `DeleteProject`
/// cascade) doesn't lock it again per Terminal.
fn stop_and_forget(registry: &Arc<Registry>, handle: &Arc<TerminalHandle>) {
    log_err(handle.stop());
    registry.terminals.lock().unwrap().remove(&handle.id);
}

/// Logs a fire-and-forget command's failure (e.g. writing to a `Parado`
/// Terminal) instead of silently dropping it — these commands have no
/// response in the protocol, so this is the only visibility into failures.
fn log_err(result: anyhow::Result<()>) {
    if let Err(err) = result {
        eprintln!("httyml-daemon: {err:#}");
    }
}

async fn handle_connection(
    stream: UnixStream,
    registry: Arc<Registry>,
    shutdown: Arc<Notify>,
) -> anyhow::Result<()> {
    let (mut read_half, write_half) = stream.into_split();
    let writer: SharedWriter = Arc::new(AsyncMutex::new(write_half));

    loop {
        let frame = match read_frame(&mut read_half).await {
            Ok(f) => f,
            Err(_) => break, // client disconnected
        };
        let msg: ClientMessage = serde_json::from_slice(&frame)?;
        handle_message(msg, &registry, &writer, &shutdown).await?;
    }
    Ok(())
}

async fn send(writer: &SharedWriter, msg: &DaemonMessage) -> anyhow::Result<()> {
    let payload = serde_json::to_vec(msg)?;
    let mut w = writer.lock().await;
    write_frame(&mut *w, &payload).await?;
    Ok(())
}

async fn handle_message(
    msg: ClientMessage,
    registry: &Arc<Registry>,
    writer: &SharedWriter,
    shutdown: &Arc<Notify>,
) -> anyhow::Result<()> {
    match msg {
        ClientMessage::CreateProject { name } => {
            let id = Uuid::new_v4().to_string();
            registry.projects.lock().unwrap().insert(
                id.clone(),
                Project {
                    id: id.clone(),
                    name: name.clone(),
                },
            );
            persist(registry);
            send(
                writer,
                &DaemonMessage::ProjectCreated {
                    project_id: id,
                    name,
                },
            )
            .await?;
        }
        ClientMessage::ListProjects => {
            let projects = registry
                .projects
                .lock()
                .unwrap()
                .values()
                .map(|p| ProjectInfo {
                    id: p.id.clone(),
                    name: p.name.clone(),
                })
                .collect();
            send(writer, &DaemonMessage::Projects { projects }).await?;
        }
        ClientMessage::ListTerminals { project_id } => {
            let terminals = registry
                .terminals
                .lock()
                .unwrap()
                .values()
                .filter(|t| t.project_id == project_id)
                .map(|t| {
                    let cfg = t.config_snapshot();
                    TerminalInfo {
                        id: t.id.clone(),
                        name: cfg.name,
                        cwd: cfg.cwd,
                        startup_command: cfg.startup_command,
                        env_vars: cfg.env_vars,
                        shell: cfg.shell,
                        scrollback_lines: cfg.scrollback_lines,
                        state: t.state(),
                    }
                })
                .collect();
            send(
                writer,
                &DaemonMessage::Terminals {
                    project_id,
                    terminals,
                },
            )
            .await?;
        }
        ClientMessage::CreateTerminal {
            project_id,
            cwd,
            name,
            startup_command,
            env_vars,
            shell,
            scrollback_lines,
        } => {
            let id = Uuid::new_v4().to_string();
            let handle = TerminalHandle::spawn(
                id.clone(),
                TerminalConfig {
                    project_id,
                    cwd,
                    name,
                    startup_command,
                    env_vars,
                    shell,
                    scrollback_lines: scrollback_lines.unwrap_or(DEFAULT_SCROLLBACK_LINES),
                },
            )?;
            registry
                .terminals
                .lock()
                .unwrap()
                .insert(id.clone(), handle);
            persist(registry);
            send(writer, &DaemonMessage::Created { terminal_id: id }).await?;
        }
        ClientMessage::UpdateTerminal {
            terminal_id,
            cwd,
            name,
            startup_command,
            env_vars,
            shell,
            scrollback_lines,
        } => {
            if let Some(handle) = lookup(registry, &terminal_id) {
                handle.update_config(
                    cwd,
                    name,
                    startup_command,
                    env_vars,
                    shell,
                    scrollback_lines.unwrap_or(DEFAULT_SCROLLBACK_LINES),
                );
                persist(registry);
                send(writer, &DaemonMessage::TerminalUpdated { terminal_id }).await?;
            } else {
                send(
                    writer,
                    &DaemonMessage::Error {
                        message: format!("unknown terminal {terminal_id}"),
                    },
                )
                .await?;
            }
        }
        ClientMessage::Attach { terminal_id } => {
            let Some(handle) = lookup(registry, &terminal_id) else {
                send(
                    writer,
                    &DaemonMessage::Error {
                        message: format!("unknown terminal {terminal_id}"),
                    },
                )
                .await?;
                return Ok(());
            };

            // Snapshot and subscribe atomically so no chunk the reader thread
            // produces around this moment is lost (a gap) or shown twice.
            let (snapshot, state, mut output_rx, mut state_rx) = handle.snapshot_and_subscribe();
            send(
                writer,
                &DaemonMessage::Scrollback {
                    terminal_id: terminal_id.clone(),
                    data: STANDARD.encode(snapshot),
                },
            )
            .await?;
            send(
                writer,
                &DaemonMessage::StateChanged {
                    terminal_id: terminal_id.clone(),
                    state,
                },
            )
            .await?;

            let writer = writer.clone();
            tokio::spawn(async move {
                use tokio::sync::broadcast::error::RecvError;
                loop {
                    tokio::select! {
                        chunk = output_rx.recv() => {
                            let chunk = match chunk {
                                Ok(chunk) => chunk,
                                // Fell behind the ring buffer — some output was
                                // dropped, but the Sender is still alive and
                                // producing more, so keep forwarding rather
                                // than abandoning this attach permanently.
                                Err(RecvError::Lagged(_)) => continue,
                                Err(RecvError::Closed) => break,
                            };
                            let msg = DaemonMessage::Output {
                                terminal_id: terminal_id.clone(),
                                data: STANDARD.encode(chunk),
                            };
                            if send(&writer, &msg).await.is_err() {
                                break;
                            }
                        }
                        state = state_rx.recv() => {
                            let state = match state {
                                Ok(state) => state,
                                Err(RecvError::Lagged(_)) => continue,
                                Err(RecvError::Closed) => break,
                            };
                            let msg = DaemonMessage::StateChanged {
                                terminal_id: terminal_id.clone(),
                                state,
                            };
                            if send(&writer, &msg).await.is_err() {
                                break;
                            }
                        }
                    }
                }
            });
        }
        ClientMessage::Write { terminal_id, data } => {
            if let Some(handle) = lookup(registry, &terminal_id) {
                match STANDARD.decode(data) {
                    Ok(bytes) => log_err(handle.write_input(&bytes)),
                    Err(err) => eprintln!("httyml-daemon: invalid Write payload: {err:#}"),
                }
            }
        }
        ClientMessage::Resize {
            terminal_id,
            rows,
            cols,
        } => {
            if let Some(handle) = lookup(registry, &terminal_id) {
                log_err(handle.resize(rows, cols));
            }
        }
        ClientMessage::Stop { terminal_id } => {
            if let Some(handle) = lookup(registry, &terminal_id) {
                log_err(handle.stop());
            }
        }
        ClientMessage::Restart { terminal_id } => {
            if let Some(handle) = lookup(registry, &terminal_id) {
                log_err(handle.restart());
            }
        }
        ClientMessage::DeleteTerminal { terminal_id } => {
            // Kill the process first (if any) so deleting a running Terminal
            // never leaves an orphaned process behind once its TerminalHandle
            // is dropped.
            if let Some(handle) = lookup(registry, &terminal_id) {
                stop_and_forget(registry, &handle);
            }
            persist(registry);
            send(writer, &DaemonMessage::TerminalDeleted { terminal_id }).await?;
        }
        ClientMessage::DeleteProject { project_id } => {
            let handles: Vec<Arc<TerminalHandle>> = registry
                .terminals
                .lock()
                .unwrap()
                .values()
                .filter(|t| t.project_id == project_id)
                .cloned()
                .collect();
            for handle in &handles {
                stop_and_forget(registry, handle);
            }
            registry.projects.lock().unwrap().remove(&project_id);
            persist(registry);
            send(writer, &DaemonMessage::ProjectDeleted { project_id }).await?;
        }
        ClientMessage::Ping => {
            send(
                writer,
                &DaemonMessage::Pong {
                    build_id: crate::BUILD_ID.to_string(),
                },
            )
            .await?;
        }
        ClientMessage::Shutdown => {
            shutdown.notify_one();
        }
    }
    Ok(())
}
