use std::collections::HashMap;

use serde::{Deserialize, Serialize};

use crate::project::ProjectScript;
use crate::terminal::TerminalState;

/// Messages the app sends to the Daemon over the Unix socket.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum ClientMessage {
    CreateProject {
        name: String,
    },
    /// Replaces a Project's editable fields wholesale. Identity (`id`) and
    /// its Terminals are untouched; `default_cwd` only prefills the create
    /// Terminal form, it never moves an existing Terminal (see ADR-0004).
    UpdateProject {
        project_id: String,
        name: String,
        #[serde(default)]
        description: Option<String>,
        #[serde(default)]
        color: Option<String>,
        #[serde(default)]
        icon: Option<String>,
        #[serde(default)]
        default_cwd: String,
    },
    /// Replaces a Project's saved scripts wholesale — the app owns their
    /// order and identity, the Daemon only stores them.
    SetProjectScripts {
        project_id: String,
        scripts: Vec<ProjectScript>,
    },
    ListProjects,
    /// Replaces the display order of every Project. Ids not among the
    /// Daemon's known Projects are ignored; any known Project missing from
    /// the list keeps its relative place at the end, so a partial list
    /// never drops a Project from the registry.
    ReorderProjects {
        project_ids: Vec<String>,
    },
    ListTerminals {
        project_id: String,
    },
    CreateTerminal {
        project_id: String,
        cwd: String,
        name: Option<String>,
        startup_command: Option<String>,
        #[serde(default)]
        env_vars: HashMap<String, String>,
        /// A bare command name resolved via `PATH` (e.g. `"bash"`) or an
        /// absolute path. `None`/empty falls back to the Daemon's `$SHELL`.
        #[serde(default)]
        shell: Option<String>,
        /// `None` uses the Daemon's default (see `DEFAULT_SCROLLBACK_LINES`).
        #[serde(default)]
        scrollback_lines: Option<usize>,
    },
    /// Replaces a Terminal's stored config wholesale. `name`/`cwd`/etc. take
    /// effect for the process only on the next `Restart` — a running
    /// process can't have its cwd/command/shell/env changed underneath it.
    UpdateTerminal {
        terminal_id: String,
        cwd: String,
        name: Option<String>,
        startup_command: Option<String>,
        #[serde(default)]
        env_vars: HashMap<String, String>,
        #[serde(default)]
        shell: Option<String>,
        #[serde(default)]
        scrollback_lines: Option<usize>,
    },
    Attach {
        terminal_id: String,
    },
    Write {
        terminal_id: String,
        /// base64-encoded bytes to write to the PTY
        data: String,
    },
    Resize {
        terminal_id: String,
        rows: u16,
        cols: u16,
    },
    Stop {
        terminal_id: String,
    },
    Restart {
        terminal_id: String,
    },
    /// Asks for the Terminal's *live* current directory (see
    /// `TerminalHandle::live_cwd`), not the configured/default one already
    /// in `TerminalInfo` — for a UI element that tracks `cd` reactively.
    GetCwd {
        terminal_id: String,
    },
    /// Permanently removes a Terminal's config and state — distinct from
    /// `Stop`, which preserves both. Kills the process first if running.
    DeleteTerminal {
        terminal_id: String,
    },
    /// Permanently removes a Project and cascades to all its Terminals.
    DeleteProject {
        project_id: String,
    },
    /// Asks for every Project and Terminal config exactly as persisted —
    /// for the app's "export configuration" feature. Never includes live
    /// process state, same as everything else the Daemon persists.
    ExportConfig,
    /// Wholesale-replaces every Project and Terminal with exactly what's
    /// given — the app's "import configuration" feature. Every Terminal
    /// currently running is stopped and its process killed first, same as
    /// `DeleteProject`'s cascade, so nothing from the state being replaced
    /// is left running underneath it. Imported Terminals start `Stopped`,
    /// same as any reload — see `TerminalHandle::reload`.
    ImportConfig {
        projects: Vec<ProjectInfo>,
        terminals: Vec<TerminalConfigInfo>,
    },
    /// Asks the Daemon to report its build — see `DaemonMessage::Pong` and
    /// `ensure_daemon` in the Tauri app, which uses this to tell a stale
    /// Daemon process apart from the one on disk.
    Ping,
    /// Terminates the Daemon process immediately. A local, same-user Unix
    /// socket already grants full control over every Terminal (stop,
    /// delete, ...), so this adds no meaningful new attack surface — it
    /// exists so `ensure_daemon` can replace a stale Daemon it detected via
    /// `Ping`/`Pong` before spawning a fresh one.
    Shutdown,
}

/// A Project as listed to the app: identity plus the metadata the sidebar
/// and the edit page render (see `crate::project::Project`).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectInfo {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub color: Option<String>,
    #[serde(default)]
    pub icon: Option<String>,
    #[serde(default)]
    pub default_cwd: String,
    #[serde(default)]
    pub scripts: Vec<ProjectScript>,
}

/// A Terminal as listed to the app, scoped to a Project. Carries its full
/// config (not just id/name/state) so the app can render the cwd chip in
/// the terminal header and prefill the edit page without a second round
/// trip.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TerminalInfo {
    pub id: String,
    pub name: Option<String>,
    pub cwd: String,
    pub startup_command: Option<String>,
    pub env_vars: HashMap<String, String>,
    pub shell: Option<String>,
    pub scrollback_lines: usize,
    pub state: TerminalState,
}

/// A Terminal's config plus id, for export/import — everything
/// `TerminalInfo` has except `state`, which the Daemon never persists
/// either (see `store`): an imported or exported Terminal has no live
/// process to report state for anyway.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TerminalConfigInfo {
    pub id: String,
    pub project_id: String,
    pub cwd: String,
    pub name: Option<String>,
    pub startup_command: Option<String>,
    #[serde(default)]
    pub env_vars: HashMap<String, String>,
    #[serde(default)]
    pub shell: Option<String>,
    pub scrollback_lines: usize,
}

/// Messages the Daemon sends back to the app over the same connection.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum DaemonMessage {
    ProjectCreated {
        project_id: String,
        name: String,
    },
    ProjectUpdated {
        project: ProjectInfo,
    },
    Projects {
        projects: Vec<ProjectInfo>,
    },
    Terminals {
        project_id: String,
        terminals: Vec<TerminalInfo>,
    },
    Created {
        terminal_id: String,
    },
    TerminalUpdated {
        terminal_id: String,
    },
    /// Sent once, immediately after Attach, with the buffered scrollback.
    Scrollback {
        terminal_id: String,
        /// base64-encoded bytes
        data: String,
    },
    /// Sent continuously after Attach, as live output arrives.
    Output {
        terminal_id: String,
        /// base64-encoded bytes
        data: String,
    },
    /// Sent once right after Attach with the current state, then again
    /// every time it changes (stop, restart, ...).
    StateChanged {
        terminal_id: String,
        state: TerminalState,
    },
    Cwd {
        terminal_id: String,
        cwd: String,
    },
    TerminalDeleted {
        terminal_id: String,
    },
    ProjectDeleted {
        project_id: String,
    },
    /// Reply to both `ExportConfig` (the current state, verbatim) and
    /// `ImportConfig` (the state right after replacing it, confirming what
    /// actually stuck).
    Config {
        projects: Vec<ProjectInfo>,
        terminals: Vec<TerminalConfigInfo>,
    },
    Error {
        message: String,
    },
    /// Reply to `ClientMessage::Ping`, reporting this process's `BUILD_ID`.
    Pong {
        build_id: String,
        pid: u32,
    },
}
