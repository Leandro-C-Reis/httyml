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

struct AttachedTerminals {
    senders: Mutex<HashMap<String, mpsc::UnboundedSender<ClientMessage>>>,
}

impl AttachedTerminals {
    /// Sends `msg_for(terminal_id)` to an already-attached Terminal's connection.
    async fn send(
        &self,
        terminal_id: String,
        msg_for: impl FnOnce(String) -> ClientMessage,
    ) -> Result<(), String> {
        let senders = self.senders.lock().await;
        let tx = senders
            .get(&terminal_id)
            .ok_or_else(|| "terminal not attached".to_string())?;
        tx.send(msg_for(terminal_id))
            .map_err(|_| "channel closed".to_string())
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
async fn create_terminal(
    project_id: String,
    cwd: String,
    name: Option<String>,
    startup_command: Option<String>,
) -> Result<String, String> {
    match send_one(ClientMessage::CreateTerminal {
        project_id,
        cwd,
        name,
        startup_command,
    })
    .await?
    {
        DaemonMessage::Created { terminal_id } => Ok(terminal_id),
        DaemonMessage::Error { message } => Err(message),
        _ => Err("unexpected response from daemon".to_string()),
    }
}

/// Opens a persistent connection to the daemon for this Terminal, forwarding
/// its Scrollback/Output frames to the frontend as `terminal-output-<id>` events.
/// Idempotent: attaching an already-attached Terminal is a no-op.
#[tauri::command]
async fn attach_terminal(
    app: AppHandle,
    state: State<'_, AttachedTerminals>,
    terminal_id: String,
) -> Result<(), String> {
    {
        let senders = state.senders.lock().await;
        if senders.contains_key(&terminal_id) {
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
    tokio::spawn(async move {
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
    });

    state.senders.lock().await.insert(terminal_id, tx);
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .manage(AttachedTerminals {
            senders: Mutex::new(HashMap::new()),
        })
        .invoke_handler(tauri::generate_handler![
            ensure_daemon,
            create_project,
            list_projects,
            list_terminals,
            create_terminal,
            attach_terminal,
            write_terminal,
            resize_terminal,
            stop_terminal,
            restart_terminal
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
