use std::fs::{self, File, OpenOptions};
use std::io::Write;
use std::path::Path;
use std::sync::{Mutex, OnceLock};
use std::time::{SystemTime, UNIX_EPOCH};

/// Keep the current log small enough to show comfortably in the Settings
/// screen while retaining the previous generation for post-restart diagnosis.
const MAX_LOG_BYTES: u64 = 1024 * 1024;

static LOG_FILE: OnceLock<Mutex<File>> = OnceLock::new();

/// Starts the optional file logger used by the standalone daemon binary.
/// Library-driven integration tests deliberately do not call this, keeping
/// their temporary daemon instances independent of a developer's real log.
pub fn init(path: &Path) {
    let Some(parent) = path.parent() else {
        eprintln!("httyml-daemon: log path has no parent: {path:?}");
        return;
    };
    if let Err(err) = fs::create_dir_all(parent) {
        eprintln!("httyml-daemon: failed to create log directory {parent:?}: {err}");
        return;
    }

    if let Ok(metadata) = fs::metadata(path) {
        if metadata.len() >= MAX_LOG_BYTES {
            let previous = path.with_extension("log.1");
            let _ = fs::remove_file(&previous);
            if let Err(err) = fs::rename(path, &previous) {
                eprintln!("httyml-daemon: failed to rotate log {path:?}: {err}");
            }
        }
    }

    match OpenOptions::new().create(true).append(true).open(path) {
        Ok(file) => {
            let _ = LOG_FILE.set(Mutex::new(file));
        }
        Err(err) => eprintln!("httyml-daemon: failed to open log {path:?}: {err}"),
    }
}

fn write(level: &str, message: &str) {
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs())
        .unwrap_or_default();
    let line = format!("[{timestamp}] {level} {message}");
    eprintln!("httyml-daemon: {line}");
    if let Some(file) = LOG_FILE.get() {
        if let Ok(mut file) = file.lock() {
            let _ = writeln!(file, "{line}");
        }
    }
}

pub fn info(message: impl AsRef<str>) {
    write("INFO", message.as_ref());
}

pub fn error(message: impl AsRef<str>) {
    write("ERROR", message.as_ref());
}
