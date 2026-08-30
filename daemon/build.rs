use std::time::{SystemTime, UNIX_EPOCH};

/// Generates a `BUILD_ID` constant that's different on every compile, so a
/// running Daemon can be told apart from what's currently on disk — see
/// `ensure_daemon` in the Tauri app, which uses this to detect and replace a
/// stale Daemon process instead of silently talking to outdated code.
fn main() {
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("system clock is before the Unix epoch")
        .as_nanos();

    let out_dir = std::env::var("OUT_DIR").expect("OUT_DIR is set by cargo");
    let dest = std::path::Path::new(&out_dir).join("build_id.rs");
    std::fs::write(dest, format!("pub const BUILD_ID: &str = \"{nanos}\";\n"))
        .expect("failed to write generated build_id.rs");

    // Without this, cargo treats build.rs's own output as cacheable and
    // reuses the same BUILD_ID across incremental rebuilds that didn't
    // touch build.rs itself — defeating the entire point.
    println!("cargo:rerun-if-changed=src");
    println!("cargo:rerun-if-changed=build.rs");
}
