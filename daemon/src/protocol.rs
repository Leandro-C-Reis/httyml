use serde::{Deserialize, Serialize};

/// Messages the app sends to the Daemon over the Unix socket.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum ClientMessage {
    CreateTerminal {
        cwd: String,
        name: Option<String>,
        startup_command: Option<String>,
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
}

/// Messages the Daemon sends back to the app over the same connection.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum DaemonMessage {
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
    Error {
        message: String,
    },
}
