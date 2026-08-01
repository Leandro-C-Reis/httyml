use std::collections::HashMap;

use serde::{Deserialize, Serialize};

use crate::terminal::TerminalState;

/// Messages the app sends to the Daemon over the Unix socket.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum ClientMessage {
    CreateProject {
        name: String,
    },
    ListProjects,
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
    /// Permanently removes a Terminal's config and state — distinct from
    /// `Stop`, which preserves both. Kills the process first if running.
    DeleteTerminal {
        terminal_id: String,
    },
    /// Permanently removes a Project and cascades to all its Terminals.
    DeleteProject {
        project_id: String,
    },
}

/// A Project as listed to the app — just an id and a name.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectInfo {
    pub id: String,
    pub name: String,
}

/// A Terminal as listed to the app, scoped to a Project.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TerminalInfo {
    pub id: String,
    pub name: Option<String>,
    pub state: TerminalState,
}

/// Messages the Daemon sends back to the app over the same connection.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum DaemonMessage {
    ProjectCreated {
        project_id: String,
        name: String,
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
    TerminalDeleted {
        terminal_id: String,
    },
    ProjectDeleted {
        project_id: String,
    },
    Error {
        message: String,
    },
}
