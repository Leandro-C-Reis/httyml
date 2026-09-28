use std::time::{SystemTime, UNIX_EPOCH};

/// Generates a diagnostic build ID. Daemon replacement uses the independent
/// package version so rebuilding at the same version preserves live terminals.
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
    // touch build.rs itself.
    println!("cargo:rerun-if-changed=src");
    println!("cargo:rerun-if-changed=build.rs");
}
