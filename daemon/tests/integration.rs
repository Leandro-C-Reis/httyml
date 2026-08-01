use std::time::Duration;

use base64::engine::general_purpose::STANDARD;
use base64::Engine;
use httyml_daemon::framing::{read_frame, write_frame};
use httyml_daemon::protocol::{ClientMessage, DaemonMessage};
use tokio::net::UnixStream;
use tokio::time::timeout;

struct TestClient {
    stream: UnixStream,
}

impl TestClient {
    async fn connect(socket_path: &std::path::Path) -> Self {
        // The daemon is started concurrently; retry until the socket exists.
        for _ in 0..100 {
            if let Ok(stream) = UnixStream::connect(socket_path).await {
                return Self { stream };
            }
            tokio::time::sleep(Duration::from_millis(20)).await;
        }
        panic!("could not connect to daemon socket at {socket_path:?}");
    }

    async fn send(&mut self, msg: &ClientMessage) {
        let payload = serde_json::to_vec(msg).unwrap();
        write_frame(&mut self.stream, &payload).await.unwrap();
    }

    async fn recv(&mut self) -> DaemonMessage {
        let frame = timeout(Duration::from_secs(5), read_frame(&mut self.stream))
            .await
            .expect("timed out waiting for daemon response")
            .unwrap();
        serde_json::from_slice(&frame).unwrap()
    }

    /// Keep receiving Output frames until one contains `needle`, or time out.
    async fn expect_output_containing(&mut self, needle: &str) -> String {
        let deadline = tokio::time::Instant::now() + Duration::from_secs(5);
        let mut collected = String::new();
        loop {
            let remaining = deadline.saturating_duration_since(tokio::time::Instant::now());
            if remaining.is_zero() {
                panic!("timed out waiting for output containing {needle:?}, got: {collected:?}");
            }
            let frame = timeout(remaining, read_frame(&mut self.stream))
                .await
                .unwrap_or_else(|_| {
                    panic!("timed out waiting for output containing {needle:?}, got: {collected:?}")
                })
                .unwrap();
            let msg: DaemonMessage = serde_json::from_slice(&frame).unwrap();
            if let DaemonMessage::Output { data, .. } = msg {
                let bytes = STANDARD.decode(data).unwrap();
                collected.push_str(&String::from_utf8_lossy(&bytes));
                if collected.contains(needle) {
                    return collected;
                }
            }
        }
    }
}

fn temp_socket_path() -> (tempfile::TempDir, std::path::PathBuf) {
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("httyml-test.sock");
    (dir, path)
}

fn spawn_daemon(socket_path: std::path::PathBuf) {
    tokio::spawn(async move {
        let _ = httyml_daemon::run(&socket_path).await;
    });
}

#[tokio::test]
async fn quick_create_starts_a_live_shell_immediately() {
    let (_dir, socket_path) = temp_socket_path();
    spawn_daemon(socket_path.clone());

    let mut client = TestClient::connect(&socket_path).await;
    client
        .send(&ClientMessage::CreateTerminal {
            cwd: "/tmp".to_string(),
            name: None,
            startup_command: None,
        })
        .await;

    let terminal_id = match client.recv().await {
        DaemonMessage::Created { terminal_id } => terminal_id,
        other => panic!("expected Created, got {other:?}"),
    };

    client
        .send(&ClientMessage::Attach {
            terminal_id: terminal_id.clone(),
        })
        .await;
    match client.recv().await {
        DaemonMessage::Scrollback { .. } => {}
        other => panic!("expected Scrollback, got {other:?}"),
    }

    let echo = "echo hello-from-terminal\n";
    client
        .send(&ClientMessage::Write {
            terminal_id,
            data: STANDARD.encode(echo),
        })
        .await;

    client.expect_output_containing("hello-from-terminal").await;
}

#[tokio::test]
async fn attach_replays_buffered_scrollback() {
    let (_dir, socket_path) = temp_socket_path();
    spawn_daemon(socket_path.clone());

    let mut client = TestClient::connect(&socket_path).await;
    client
        .send(&ClientMessage::CreateTerminal {
            cwd: "/tmp".to_string(),
            name: None,
            startup_command: Some("echo scrollback-marker".to_string()),
        })
        .await;
    let terminal_id = match client.recv().await {
        DaemonMessage::Created { terminal_id } => terminal_id,
        other => panic!("expected Created, got {other:?}"),
    };

    // Give the startup command time to produce output before attaching.
    tokio::time::sleep(Duration::from_millis(300)).await;

    client
        .send(&ClientMessage::Attach {
            terminal_id: terminal_id.clone(),
        })
        .await;
    let scrollback = match client.recv().await {
        DaemonMessage::Scrollback { data, .. } => STANDARD.decode(data).unwrap(),
        other => panic!("expected Scrollback, got {other:?}"),
    };
    let text = String::from_utf8_lossy(&scrollback);
    assert!(
        text.contains("scrollback-marker"),
        "expected scrollback replay to contain the startup command's output, got: {text:?}"
    );
}

#[tokio::test]
async fn resize_changes_the_pty_size_seen_by_the_shell() {
    let (_dir, socket_path) = temp_socket_path();
    spawn_daemon(socket_path.clone());

    let mut client = TestClient::connect(&socket_path).await;
    client
        .send(&ClientMessage::CreateTerminal {
            cwd: "/tmp".to_string(),
            name: None,
            startup_command: None,
        })
        .await;
    let terminal_id = match client.recv().await {
        DaemonMessage::Created { terminal_id } => terminal_id,
        other => panic!("expected Created, got {other:?}"),
    };

    client
        .send(&ClientMessage::Attach {
            terminal_id: terminal_id.clone(),
        })
        .await;
    match client.recv().await {
        DaemonMessage::Scrollback { .. } => {}
        other => panic!("expected Scrollback, got {other:?}"),
    }

    client
        .send(&ClientMessage::Resize {
            terminal_id: terminal_id.clone(),
            rows: 40,
            cols: 120,
        })
        .await;
    // Let the resize take effect before the shell reports its size.
    tokio::time::sleep(Duration::from_millis(100)).await;

    client
        .send(&ClientMessage::Write {
            terminal_id,
            data: STANDARD.encode("stty size\n"),
        })
        .await;

    client.expect_output_containing("40 120").await;
}
