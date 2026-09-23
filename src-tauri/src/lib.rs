use std::collections::HashMap;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use std::time::Duration;

use base64::engine::general_purpose::STANDARD;
use base64::Engine;
use httyml_daemon::framing::{read_frame, write_frame};
use httyml_daemon::project::ProjectScript;
use httyml_daemon::protocol::{
    ClientMessage, DaemonMessage, ProjectInfo, TerminalConfigInfo, TerminalInfo,
};
use httyml_daemon::{default_log_path, default_socket_path, read_daemon_pid};
use tauri::{AppHandle, Emitter, State};
use tauri_plugin_shell::ShellExt;
use tokio::net::UnixStream;
use tokio::sync::{mpsc, Mutex};

/// An attached Terminal's connection: the sender half of its outgoing
/// channel, plus the reader task's handle so a delete can tear both
/// directions down instead of leaving them idling forever on a Terminal
/// that no longer exists.
struct AttachedTerminal {
    connection_id: u64,
    sender: mpsc::UnboundedSender<ClientMessage>,
    reader_task: tokio::task::AbortHandle,
    writer_task: tokio::task::AbortHandle,
}

struct AttachedTerminals {
    entries: Arc<Mutex<HashMap<String, AttachedTerminal>>>,
    next_connection_id: AtomicU64,
}

impl AttachedTerminals {
    /// Sends `msg_for(terminal_id)` to an already-attached Terminal's connection.
    async fn send(
        &self,
        terminal_id: String,
        msg_for: impl FnOnce(String) -> ClientMessage,
    ) -> Result<(), String> {
        let mut entries = self.entries.lock().await;
        let closed = entries
            .get(&terminal_id)
            .ok_or_else(|| "terminal not attached".to_string())?
            .sender
            .send(msg_for(terminal_id.clone()))
            .is_err();
        if !closed {
            return Ok(());
        }
        if let Some(entry) = entries.remove(&terminal_id) {
            entry.reader_task.abort();
            entry.writer_task.abort();
        }
        Err("terminal connection closed".to_string())
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
            entry.writer_task.abort();
        }
    }

    /// Drops every stream before stopping or replacing the daemon. A later
    /// TerminalView mount can then attach afresh and receive its replayed
    /// scrollback instead of hitting the old idempotent entry.
    async fn forget_all(&self) {
        let entries: Vec<AttachedTerminal> = self
            .entries
            .lock()
            .await
            .drain()
            .map(|(_, entry)| entry)
            .collect();
        for entry in entries {
            entry.reader_task.abort();
            entry.writer_task.abort();
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

const DAEMON_TIMEOUT: Duration = Duration::from_secs(1);

#[derive(serde::Serialize, Clone)]
struct DaemonStatus {
    /// `Running` answers Ping, `Stopped` has no socket listener, and
    /// `Unresponsive` still owns the socket but cannot complete the handshake.
    state: String,
    pid: Option<u32>,
    build_id: Option<String>,
    log_path: String,
}

#[derive(serde::Serialize)]
struct DaemonLogs {
    path: String,
    content: String,
    truncated: bool,
}

async fn daemon_status_snapshot() -> DaemonStatus {
    match tokio::time::timeout(DAEMON_TIMEOUT, send_one(ClientMessage::Ping)).await {
        Ok(Ok(DaemonMessage::Pong { build_id, pid })) => DaemonStatus {
            state: "Running".to_string(),
            pid: Some(pid),
            build_id: Some(build_id),
            log_path: default_log_path().display().to_string(),
        },
        _ if is_daemon_running().await => DaemonStatus {
            state: "Unresponsive".to_string(),
            pid: read_daemon_pid(),
            build_id: None,
            log_path: default_log_path().display().to_string(),
        },
        _ => DaemonStatus {
            state: "Stopped".to_string(),
            pid: None,
            build_id: None,
            log_path: default_log_path().display().to_string(),
        },
    }
}

/// Runs the sidecar binary itself with `--build-id` (exits immediately,
/// never touches the socket) to learn what build is actually on disk right
/// now, independent of whatever's currently running.
async fn on_disk_build_id(app: &AppHandle) -> Result<String, String> {
    let output = app
        .shell()
        .sidecar("httyml-daemon")
        .map_err(|e| e.to_string())?
        .args(["--build-id"])
        .output()
        .await
        .map_err(|e| e.to_string())?;
    Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
}

/// True if a running Daemon's own reported build doesn't match what's on
/// disk — including if it doesn't answer `Ping` at all, which covers a
/// Daemon old enough to predate this handshake entirely.
async fn running_daemon_is_stale(app: &AppHandle) -> Result<bool, String> {
    let running_build_id =
        match tokio::time::timeout(DAEMON_TIMEOUT, send_one(ClientMessage::Ping)).await {
            Ok(Ok(DaemonMessage::Pong { build_id, .. })) => build_id,
            _ => return Ok(true),
        };
    Ok(running_build_id != on_disk_build_id(app).await?)
}

async fn wait_until_daemon_stops() -> bool {
    for _ in 0..50 {
        if !is_daemon_running().await {
            return true;
        }
        tokio::time::sleep(Duration::from_millis(100)).await;
    }
    false
}

/// A graceful shutdown deliberately does not wait for a reply: the daemon
/// exits after it stops every PTY, so a closed socket is the acknowledgement.
async fn request_daemon_shutdown() -> Result<(), String> {
    if !is_daemon_running().await {
        return Ok(());
    }
    let _ = tokio::time::timeout(DAEMON_TIMEOUT, send_one(ClientMessage::Shutdown)).await;
    if wait_until_daemon_stops().await {
        Ok(())
    } else {
        Err("daemon did not stop; use Force kill if it remains unresponsive".to_string())
    }
}

#[tauri::command]
async fn ensure_daemon(app: AppHandle) -> Result<(), String> {
    if is_daemon_running().await {
        if !running_daemon_is_stale(&app).await? {
            return Ok(());
        }
        // A stale Daemon (a different build than what's on disk — usually
        // left over from an earlier `tauri dev` session, or a crash that
        // didn't clean up) is still holding the socket, silently shadowing
        // whatever was just built. Replace it: this drops any live
        // Terminal process back to `Stopped`, same as any other Daemon
        // restart (see `TerminalHandle::reload`'s doc comment) — Terminals
        // themselves aren't lost, since their config is persisted.
        request_daemon_shutdown().await?;
    }
    spawn_daemon_sidecar(&app).await
}

#[tauri::command]
async fn daemon_status() -> DaemonStatus {
    daemon_status_snapshot().await
}

#[tauri::command]
async fn read_daemon_logs() -> Result<DaemonLogs, String> {
    let (content, truncated) =
        httyml_daemon::read_log_tail(512 * 1024).map_err(|err| err.to_string())?;
    Ok(DaemonLogs {
        path: default_log_path().display().to_string(),
        content,
        truncated,
    })
}

#[tauri::command]
async fn start_daemon(app: AppHandle) -> Result<(), String> {
    match daemon_status_snapshot().await.state.as_str() {
        "Running" => Ok(()),
        "Unresponsive" => {
            Err("daemon is unresponsive; force kill it before starting a replacement".to_string())
        }
        _ => spawn_daemon_sidecar(&app).await,
    }
}

#[tauri::command]
async fn stop_daemon(state: State<'_, AttachedTerminals>) -> Result<(), String> {
    state.forget_all().await;
    request_daemon_shutdown().await
}

#[tauri::command]
async fn restart_daemon(app: AppHandle, state: State<'_, AttachedTerminals>) -> Result<(), String> {
    state.forget_all().await;
    request_daemon_shutdown().await?;
    spawn_daemon_sidecar(&app).await
}

#[tauri::command]
async fn force_kill_daemon(state: State<'_, AttachedTerminals>) -> Result<(), String> {
    state.forget_all().await;
    httyml_daemon::force_kill_daemon().map_err(|err| err.to_string())?;
    if wait_until_daemon_stops().await {
        Ok(())
    } else {
        Err("daemon process was signalled but its socket is still present".to_string())
    }
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
async fn update_project(
    project_id: String,
    name: String,
    description: Option<String>,
    color: Option<String>,
    icon: Option<String>,
    default_cwd: String,
) -> Result<ProjectInfo, String> {
    match send_one(ClientMessage::UpdateProject {
        project_id,
        name,
        description,
        color,
        icon,
        default_cwd,
    })
    .await?
    {
        DaemonMessage::ProjectUpdated { project } => Ok(project),
        DaemonMessage::Error { message } => Err(message),
        _ => Err("unexpected response from daemon".to_string()),
    }
}

#[tauri::command]
async fn set_project_scripts(
    project_id: String,
    scripts: Vec<ProjectScript>,
) -> Result<ProjectInfo, String> {
    match send_one(ClientMessage::SetProjectScripts {
        project_id,
        scripts,
    })
    .await?
    {
        DaemonMessage::ProjectUpdated { project } => Ok(project),
        DaemonMessage::Error { message } => Err(message),
        _ => Err("unexpected response from daemon".to_string()),
    }
}

/// Reads the `scripts` block of `<cwd>/package.json`, for the side menu's
/// "scripts found in this directory" panel. A missing or unparsable file is
/// an empty list, not an error: a Terminal sitting in a directory without a
/// package.json is the normal case, not a failure.
#[tauri::command]
async fn read_package_scripts(cwd: String) -> Result<Vec<(String, String)>, String> {
    if cwd.is_empty() {
        return Ok(Vec::new());
    }
    let path = std::path::Path::new(&cwd).join("package.json");
    let Ok(bytes) = std::fs::read(&path) else {
        return Ok(Vec::new());
    };
    let Ok(json) = serde_json::from_slice::<serde_json::Value>(&bytes) else {
        return Ok(Vec::new());
    };
    let Some(scripts) = json.get("scripts").and_then(|s| s.as_object()) else {
        return Ok(Vec::new());
    };
    Ok(scripts
        .iter()
        .filter_map(|(name, command)| {
            command
                .as_str()
                .map(|command| (name.clone(), command.to_string()))
        })
        .collect())
}

/// Starts VS Code for a directory without sending a command through a
/// Terminal's PTY. The executable is fixed and the directory is passed as a
/// single argument, so this never invokes a shell.
#[tauri::command]
fn open_in_vscode(cwd: String) -> Result<(), String> {
    if cwd.trim().is_empty() {
        return Err("cannot open VS Code without a directory".to_string());
    }

    std::process::Command::new("code")
        .arg(&cwd)
        .stdin(std::process::Stdio::null())
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .spawn()
        .map(|_| ())
        .map_err(|error| {
            format!(
                "could not start VS Code; make sure the code command is available on PATH: {error}"
            )
        })
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
async fn reorder_projects(project_ids: Vec<String>) -> Result<Vec<ProjectInfo>, String> {
    match send_one(ClientMessage::ReorderProjects { project_ids }).await? {
        DaemonMessage::Projects { projects } => Ok(projects),
        DaemonMessage::Error { message } => Err(message),
        _ => Err("unexpected response from daemon".to_string()),
    }
}

/// On-disk shape of an exported config file: every Project/Terminal the
/// Daemon persists, plus whatever app-level settings the Daemon itself
/// doesn't know about (currently just the chosen color theme) — `extra`
/// captures those without this file format (or the Daemon's own protocol)
/// needing to know what they are.
#[derive(serde::Serialize, serde::Deserialize)]
struct ExportedConfig {
    projects: Vec<ProjectInfo>,
    terminals: Vec<TerminalConfigInfo>,
    #[serde(flatten)]
    extra: serde_json::Map<String, serde_json::Value>,
}

#[tauri::command]
async fn export_config(
    path: String,
    extra: serde_json::Map<String, serde_json::Value>,
) -> Result<(), String> {
    let (projects, terminals) = match send_one(ClientMessage::ExportConfig).await? {
        DaemonMessage::Config {
            projects,
            terminals,
        } => (projects, terminals),
        DaemonMessage::Error { message } => return Err(message),
        _ => return Err("unexpected response from daemon".to_string()),
    };
    let json = serde_json::to_string_pretty(&ExportedConfig {
        projects,
        terminals,
        extra,
    })
    .map_err(|e| e.to_string())?;
    std::fs::write(&path, json).map_err(|e| e.to_string())
}

#[derive(serde::Serialize)]
struct ImportConfigResult {
    projects: Vec<ProjectInfo>,
    terminal_count: usize,
    extra: serde_json::Map<String, serde_json::Value>,
}

/// Reads `path` and wholesale-replaces every Project/Terminal with what it
/// contains — see `ClientMessage::ImportConfig` for what that cascade does
/// to whatever was there before.
#[tauri::command]
async fn import_config(path: String) -> Result<ImportConfigResult, String> {
    let bytes = std::fs::read(&path).map_err(|e| e.to_string())?;
    let file: ExportedConfig = serde_json::from_slice(&bytes).map_err(|e| e.to_string())?;
    match send_one(ClientMessage::ImportConfig {
        projects: file.projects,
        terminals: file.terminals,
    })
    .await?
    {
        DaemonMessage::Config {
            projects,
            terminals,
        } => Ok(ImportConfigResult {
            terminal_count: terminals.len(),
            projects,
            extra: file.extra,
        }),
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

    let connection_id = state.next_connection_id.fetch_add(1, Ordering::Relaxed);
    let stream = UnixStream::connect(default_socket_path())
        .await
        .map_err(|e| e.to_string())?;
    let (mut read_half, mut write_half) = stream.into_split();
    let (tx, mut rx) = mpsc::unbounded_channel::<ClientMessage>();

    tx.send(ClientMessage::Attach {
        terminal_id: terminal_id.clone(),
    })
    .map_err(|_| "channel closed".to_string())?;

    let writer_task = tokio::spawn(async move {
        while let Some(msg) = rx.recv().await {
            let Ok(payload) = serde_json::to_vec(&msg) else {
                continue;
            };
            if write_frame(&mut write_half, &payload).await.is_err() {
                break;
            }
        }
    })
    .abort_handle();

    let event_name = format!("terminal-output-{terminal_id}");
    let entries = state.entries.clone();
    let reader_terminal_id = terminal_id.clone();
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
        // A daemon restart or a lost sidecar connection must not leave an
        // idempotent entry behind. Only remove our own generation: a newer
        // attachment may already have replaced this one.
        let mut entries = entries.lock().await;
        let is_current = entries
            .get(&reader_terminal_id)
            .is_some_and(|entry| entry.connection_id == connection_id);
        if is_current {
            if let Some(entry) = entries.remove(&reader_terminal_id) {
                entry.writer_task.abort();
            }
        }
    })
    .abort_handle();

    state.entries.lock().await.insert(
        terminal_id,
        AttachedTerminal {
            connection_id,
            sender: tx,
            reader_task,
            writer_task,
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

/// The Terminal's live current directory (reflects `cd`, not just its
/// configured default) — for a UI element that polls this while visible.
#[tauri::command]
async fn get_terminal_cwd(terminal_id: String) -> Result<String, String> {
    match send_one(ClientMessage::GetCwd { terminal_id }).await? {
        DaemonMessage::Cwd { cwd, .. } => Ok(cwd),
        DaemonMessage::Error { message } => Err(message),
        _ => Err("unexpected response from daemon".to_string()),
    }
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
async fn detach_terminal(
    state: State<'_, AttachedTerminals>,
    terminal_id: String,
) -> Result<(), String> {
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
        .plugin(tauri_plugin_dialog::init())
        .manage(AttachedTerminals {
            entries: Arc::new(Mutex::new(HashMap::new())),
            next_connection_id: AtomicU64::new(1),
        })
        .invoke_handler(tauri::generate_handler![
            ensure_daemon,
            daemon_status,
            read_daemon_logs,
            start_daemon,
            stop_daemon,
            restart_daemon,
            force_kill_daemon,
            create_project,
            update_project,
            set_project_scripts,
            read_package_scripts,
            open_in_vscode,
            list_projects,
            reorder_projects,
            export_config,
            import_config,
            list_terminals,
            create_terminal,
            update_terminal,
            attach_terminal,
            detach_terminal,
            write_terminal,
            get_terminal_cwd,
            resize_terminal,
            stop_terminal,
            restart_terminal,
            delete_terminal,
            delete_project
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
