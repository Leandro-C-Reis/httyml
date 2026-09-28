#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Lets the Tauri app query "what build is the on-disk binary" without
    // spawning a full daemon — used to compare against a running instance's
    // build ID for diagnostics. Exits immediately without touching the socket.
    if std::env::args().nth(1).as_deref() == Some("--build-id") {
        println!("{}", httyml_daemon::BUILD_ID);
        return Ok(());
    }
    if std::env::args().nth(1).as_deref() == Some("--version") {
        println!("{}", env!("CARGO_PKG_VERSION"));
        return Ok(());
    }

    let socket_path = httyml_daemon::default_socket_path();
    let config_path = httyml_daemon::default_config_path();
    httyml_daemon::logging::init(&httyml_daemon::default_log_path());
    httyml_daemon::run(&socket_path, &config_path).await
}
