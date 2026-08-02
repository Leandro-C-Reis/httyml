use std::collections::HashMap;
use std::time::Duration;

use base64::engine::general_purpose::STANDARD;
use base64::Engine;
use httyml_daemon::default_socket_path;
use httyml_daemon::framing::{read_frame, write_frame};
use httyml_daemon::protocol::{ClientMessage, DaemonMessage, ProjectInfo, TerminalInfo};
use tauri::{AppHandle, Emitter, State};
use tauri_plugin_shell::ShellExt;
use tokio::net::UnixStream;
use tokio::sync::{mpsc, Mutex};

/// An attached Terminal's connection: the sender half of its outgoing
/// channel, plus the reader task's handle so a delete can tear both
/// directions down instead of leaving them idling forever on a Terminal
/// that no longer exists.
struct AttachedTerminal {
    sender: mpsc::UnboundedSender<ClientMessage>,
    reader_task: tokio::task::AbortHandle,
}

struct AttachedTerminals {
    entries: Mutex<HashMap<String, AttachedTerminal>>,
}

impl AttachedTerminals {
    /// Sends `msg_for(terminal_id)` to an already-attached Terminal's connection.
    async fn send(
        &self,
        terminal_id: String,
        msg_for: impl FnOnce(String) -> ClientMessage,
    ) -> Result<(), String> {
        let entries = self.entries.lock().await;
        let entry = entries
            .get(&terminal_id)
            .ok_or_else(|| "terminal not attached".to_string())?;
        entry
            .sender
            .send(msg_for(terminal_id))
            .map_err(|_| "channel closed".to_string())
    }

    /// Tears down an attached Terminal's connection: aborts its reader task
    /// (which also drops its half of the socket) and drops the sender,
    /// which closes the writer task's channel and ends that task too. A
    /// no-op if the Terminal was never attached. Called when a Terminal is
    /// deleted, so its connection doesn't idle forever referencing a
    /// terminal_id that no longer exists.
    async fn forget(&self, terminal_id: &str) {
        if let Some(entry) = self.entries.lock().await.remove(terminal_id) {
            entry.reader_task.abort();
        }
    }
}

async fn is_daemon_running() -> bool {
    UnixStream::connect(default_socket_path()).await.is_ok()
}

async fn spawn_daemon_sidecar(app: &AppHandle) -> Result<(), String> {
    let (mut _rx, _child) = app
        .shell()
        .sidecar("httyml-daemon")
        .map_err(|e| e.to_string())?
        .spawn()
        .map_err(|e| e.to_string())?;

    for _ in 0..50 {
        if is_daemon_running().await {
            return Ok(());
        }
        tokio::time::sleep(Duration::from_millis(100)).await;
    }
    Err("daemon did not start in time".to_string())
}

async fn send_one(msg: ClientMessage) -> Result<DaemonMessage, String> {
    let mut stream = UnixStream::connect(default_socket_path())
        .await
        .map_err(|e| e.to_string())?;
    let payload = serde_json::to_vec(&msg).map_err(|e| e.to_string())?;
    write_frame(&mut stream, &payload)
        .await
        .map_err(|e| e.to_string())?;
    let frame = read_frame(&mut stream).await.map_err(|e| e.to_string())?;
    serde_json::from_slice(&frame).map_err(|e| e.to_string())
}

#[tauri::command]
async fn ensure_daemon(app: AppHandle) -> Result<(), String> {
    if is_daemon_running().await {
        return Ok(());
    }
    spawn_daemon_sidecar(&app).await
}

#[tauri::command]
async fn create_project(name: String) -> Result<String, String> {
    match send_one(ClientMessage::CreateProject { name }).await? {
        DaemonMessage::ProjectCreated { project_id, .. } => Ok(project_id),
        DaemonMessage::Error { message } => Err(message),
        _ => Err("unexpected response from daemon".to_string()),
    }
}

#[tauri::command]
async fn list_projects() -> Result<Vec<ProjectInfo>, String> {
    match send_one(ClientMessage::ListProjects).await? {
        DaemonMessage::Projects { projects } => Ok(projects),
        DaemonMessage::Error { message } => Err(message),
        _ => Err("unexpected response from daemon".to_string()),
    }
}

#[tauri::command]
async fn list_terminals(project_id: String) -> Result<Vec<TerminalInfo>, String> {
    match send_one(ClientMessage::ListTerminals { project_id }).await? {
        DaemonMessage::Terminals { terminals, .. } => Ok(terminals),
        DaemonMessage::Error { message } => Err(message),
        _ => Err("unexpected response from daemon".to_string()),
    }
}

#[tauri::command]
#[allow(clippy::too_many_arguments)]
async fn create_terminal(
    project_id: String,
    cwd: String,
    name: Option<String>,
    startup_command: Option<String>,
    env_vars: HashMap<String, String>,
    shell: Option<String>,
    scrollback_lines: Option<usize>,
) -> Result<String, String> {
    match send_one(ClientMessage::CreateTerminal {
        project_id,
        cwd,
        name,
        startup_command,
        env_vars,
        shell,
        scrollback_lines,
    })
    .await?
    {
        DaemonMessage::Created { terminal_id } => Ok(terminal_id),
        DaemonMessage::Error { message } => Err(message),
        _ => Err("unexpected response from daemon".to_string()),
    }
}

#[tauri::command]
#[allow(clippy::too_many_arguments)]
async fn update_terminal(
    terminal_id: String,
    cwd: String,
    name: Option<String>,
    startup_command: Option<String>,
    env_vars: HashMap<String, String>,
    shell: Option<String>,
    scrollback_lines: Option<usize>,
) -> Result<(), String> {
    match send_one(ClientMessage::UpdateTerminal {
        terminal_id,
        cwd,
        name,
        startup_command,
        env_vars,
        shell,
        scrollback_lines,
    })
    .await?
    {
        DaemonMessage::TerminalUpdated { .. } => Ok(()),
        DaemonMessage::Error { message } => Err(message),
        _ => Err("unexpected response from daemon".to_string()),
    }
}

/// Opens a persistent connection to the daemon for this Terminal, forwarding
/// its Scrollback/Output frames to the frontend as `terminal-output-<id>` events.
/// Idempotent: attaching an already-attached Terminal is a no-op — the
/// caller must `detach_terminal` first if it actually wants a fresh
/// connection (and the Scrollback replay that comes with one), e.g. when
/// its own view unmounted without the backend knowing.
#[tauri::command]
async fn attach_terminal(
    app: AppHandle,
    state: State<'_, AttachedTerminals>,
    terminal_id: String,
) -> Result<(), String> {
    {
        let entries = state.entries.lock().await;
        if entries.contains_key(&terminal_id) {
            return Ok(());
        }
    }

    let stream = UnixStream::connect(default_socket_path())
        .await
        .map_err(|e| e.to_string())?;
    let (mut read_half, mut write_half) = stream.into_split();
    let (tx, mut rx) = mpsc::unbounded_channel::<ClientMessage>();

    tx.send(ClientMessage::Attach {
        terminal_id: terminal_id.clone(),
    })
    .map_err(|_| "channel closed".to_string())?;

    tokio::spawn(async move {
        while let Some(msg) = rx.recv().await {
            let Ok(payload) = serde_json::to_vec(&msg) else {
                continue;
            };
            if write_frame(&mut write_half, &payload).await.is_err() {
                break;
            }
        }
    });

    let event_name = format!("terminal-output-{terminal_id}");
    let reader_task = tokio::spawn(async move {
        loop {
            let frame = match read_frame(&mut read_half).await {
                Ok(f) => f,
                Err(_) => break,
            };
            let Ok(msg) = serde_json::from_slice::<DaemonMessage>(&frame) else {
                continue;
            };
            if app.emit(&event_name, msg).is_err() {
                break;
            }
        }
    })
    .abort_handle();

    state.entries.lock().await.insert(
        terminal_id,
        AttachedTerminal {
            sender: tx,
            reader_task,
        },
    );
    Ok(())
}

#[tauri::command]
async fn write_terminal(
    state: State<'_, AttachedTerminals>,
    terminal_id: String,
    data: String,
) -> Result<(), String> {
    state
        .send(terminal_id, |terminal_id| ClientMessage::Write {
            terminal_id,
            data: STANDARD.encode(data),
        })
        .await
}

#[tauri::command]
async fn resize_terminal(
    state: State<'_, AttachedTerminals>,
    terminal_id: String,
    rows: u16,
    cols: u16,
) -> Result<(), String> {
    state
        .send(terminal_id, |terminal_id| ClientMessage::Resize {
            terminal_id,
            rows,
            cols,
        })
        .await
}

#[tauri::command]
async fn stop_terminal(
    state: State<'_, AttachedTerminals>,
    terminal_id: String,
) -> Result<(), String> {
    state
        .send(terminal_id, |terminal_id| ClientMessage::Stop {
            terminal_id,
        })
        .await
}

#[tauri::command]
async fn restart_terminal(
    state: State<'_, AttachedTerminals>,
    terminal_id: String,
) -> Result<(), String> {
    state
        .send(terminal_id, |terminal_id| ClientMessage::Restart {
            terminal_id,
        })
        .await
}

/// Tears down an attached Terminal's connection without touching the
/// Terminal itself — called when its view unmounts (e.g. switching away
/// from a Project), so a later `attach_terminal` for the same id creates a
/// genuinely fresh connection instead of hitting the idempotent no-op
/// below and skipping the daemon's replayed Scrollback. Idempotent: a no-op
/// if it was never attached, or already detached.
#[tauri::command]
async fn detach_terminal(state: State<'_, AttachedTerminals>, terminal_id: String) -> Result<(), String> {
    state.forget(&terminal_id).await;
    Ok(())
}

/// Deletes a Terminal and, if it was attached, tears down that connection
/// too — otherwise it would idle forever referencing a terminal_id that no
/// longer exists.
#[tauri::command]
async fn delete_terminal(
    state: State<'_, AttachedTerminals>,
    terminal_id: String,
) -> Result<(), String> {
    let result = match send_one(ClientMessage::DeleteTerminal {
        terminal_id: terminal_id.clone(),
    })
    .await?
    {
        DaemonMessage::TerminalDeleted { .. } => Ok(()),
        DaemonMessage::Error { message } => Err(message),
        _ => Err("unexpected response from daemon".to_string()),
    };
    state.forget(&terminal_id).await;
    result
}

/// Deletes a Project (cascading to its Terminals) and tears down the
/// connection for any of those Terminals that were attached.
#[tauri::command]
async fn delete_project(
    state: State<'_, AttachedTerminals>,
    project_id: String,
) -> Result<(), String> {
    let terminal_ids: Vec<String> = match send_one(ClientMessage::ListTerminals {
        project_id: project_id.clone(),
    })
    .await?
    {
        DaemonMessage::Terminals { terminals, .. } => terminals.into_iter().map(|t| t.id).collect(),
        _ => Vec::new(),
    };

    let result = match send_one(ClientMessage::DeleteProject {
        project_id: project_id.clone(),
    })
    .await?
    {
        DaemonMessage::ProjectDeleted { .. } => Ok(()),
        DaemonMessage::Error { message } => Err(message),
        _ => Err("unexpected response from daemon".to_string()),
    };
    for terminal_id in terminal_ids {
        state.forget(&terminal_id).await;
    }
    result
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .manage(AttachedTerminals {
            entries: Mutex::new(HashMap::new()),
        })
        .invoke_handler(tauri::generate_handler![
            ensure_daemon,
            create_project,
            list_projects,
            list_terminals,
            create_terminal,
            update_terminal,
            attach_terminal,
            detach_terminal,
            write_terminal,
            resize_terminal,
            stop_terminal,
            restart_terminal,
            delete_terminal,
            delete_project
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
