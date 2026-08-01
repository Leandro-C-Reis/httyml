pub mod connection;
pub mod framing;
pub mod protocol;
pub mod terminal;

use std::path::PathBuf;

pub use connection::run;

/// The Unix socket path the Daemon binds and app clients connect to.
pub fn default_socket_path() -> PathBuf {
    let base = std::env::var("XDG_RUNTIME_DIR").unwrap_or_else(|_| "/tmp".to_string());
    PathBuf::from(base).join("httyml.sock")
}
