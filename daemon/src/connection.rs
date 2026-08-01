use std::collections::HashMap;
use std::path::Path;
use std::sync::{Arc, Mutex};

use base64::engine::general_purpose::STANDARD;
use base64::Engine;
use tokio::net::unix::OwnedWriteHalf;
use tokio::net::{UnixListener, UnixStream};
use tokio::sync::Mutex as AsyncMutex;
use uuid::Uuid;

use crate::framing::{read_frame, write_frame};
use crate::protocol::{ClientMessage, DaemonMessage};
use crate::terminal::{TerminalHandle, DEFAULT_SCROLLBACK_LINES};

pub type Registry = Arc<Mutex<HashMap<String, Arc<TerminalHandle>>>>;
type SharedWriter = Arc<AsyncMutex<OwnedWriteHalf>>;

/// Binds the Unix socket at `socket_path` and serves client connections until
/// the process is killed. Removes any stale socket file left over from a
/// previous run before binding.
pub async fn run(socket_path: &Path) -> anyhow::Result<()> {
    if socket_path.exists() {
        std::fs::remove_file(socket_path)?;
    }
    if let Some(parent) = socket_path.parent() {
        std::fs::create_dir_all(parent)?;
    }

    let listener = UnixListener::bind(socket_path)?;
    let registry: Registry = Arc::new(Mutex::new(HashMap::new()));

    loop {
        let (stream, _addr) = listener.accept().await?;
        let registry = registry.clone();
        tokio::spawn(async move {
            if let Err(err) = handle_connection(stream, registry).await {
                eprintln!("httyml-daemon: connection error: {err:#}");
            }
        });
    }
}

fn lookup(registry: &Registry, terminal_id: &str) -> Option<Arc<TerminalHandle>> {
    registry.lock().unwrap().get(terminal_id).cloned()
}

/// Logs a fire-and-forget command's failure (e.g. writing to a `Parado`
/// Terminal) instead of silently dropping it — these commands have no
/// response in the protocol, so this is the only visibility into failures.
fn log_err(result: anyhow::Result<()>) {
    if let Err(err) = result {
        eprintln!("httyml-daemon: {err:#}");
    }
}

async fn handle_connection(stream: UnixStream, registry: Registry) -> anyhow::Result<()> {
    let (mut read_half, write_half) = stream.into_split();
    let writer: SharedWriter = Arc::new(AsyncMutex::new(write_half));

    loop {
        let frame = match read_frame(&mut read_half).await {
            Ok(f) => f,
            Err(_) => break, // client disconnected
        };
        let msg: ClientMessage = serde_json::from_slice(&frame)?;
        handle_message(msg, &registry, &writer).await?;
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
    registry: &Registry,
    writer: &SharedWriter,
) -> anyhow::Result<()> {
    match msg {
        ClientMessage::CreateTerminal {
            cwd,
            name,
            startup_command,
        } => {
            let id = Uuid::new_v4().to_string();
            let handle = TerminalHandle::spawn(
                id.clone(),
                cwd,
                name,
                startup_command,
                DEFAULT_SCROLLBACK_LINES,
            )?;
            registry.lock().unwrap().insert(id.clone(), handle);
            send(writer, &DaemonMessage::Created { terminal_id: id }).await?;
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
                loop {
                    tokio::select! {
                        chunk = output_rx.recv() => {
                            let Ok(chunk) = chunk else { break };
                            let msg = DaemonMessage::Output {
                                terminal_id: terminal_id.clone(),
                                data: STANDARD.encode(chunk),
                            };
                            if send(&writer, &msg).await.is_err() {
                                break;
                            }
                        }
                        state = state_rx.recv() => {
                            let Ok(state) = state else { break };
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
    }
    Ok(())
}
