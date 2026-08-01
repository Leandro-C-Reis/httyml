pub mod connection;
pub mod framing;
pub mod project;
pub mod protocol;
pub mod store;
pub mod terminal;

use std::path::PathBuf;

pub use connection::run;

/// The Unix socket path the Daemon binds and app clients connect to.
pub fn default_socket_path() -> PathBuf {
    let base = std::env::var("XDG_RUNTIME_DIR").unwrap_or_else(|_| "/tmp".to_string());
    PathBuf::from(base).join("httyml.sock")
}

/// Where Project/Terminal config is persisted (see `store`), following the
/// XDG base directory convention.
pub fn default_config_path() -> PathBuf {
    let base = std::env::var("XDG_CONFIG_HOME")
        .map(PathBuf::from)
        .unwrap_or_else(|_| {
            let home = std::env::var("HOME").unwrap_or_else(|_| "/tmp".to_string());
            PathBuf::from(home).join(".config")
        });
    base.join("httyml").join("projects.json")
}
