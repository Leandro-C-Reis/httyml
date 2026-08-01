#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let socket_path = httyml_daemon::default_socket_path();
    let config_path = httyml_daemon::default_config_path();
    httyml_daemon::run(&socket_path, &config_path).await
}
