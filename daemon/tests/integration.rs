use std::time::Duration;

use base64::engine::general_purpose::STANDARD;
use base64::Engine;
use httyml_daemon::framing::{read_frame, write_frame};
use httyml_daemon::protocol::{ClientMessage, DaemonMessage};
use httyml_daemon::terminal::TerminalState;
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

    async fn create_project(&mut self, name: &str) -> String {
        self.send(&ClientMessage::CreateProject {
            name: name.to_string(),
        })
        .await;
        match self.recv().await {
            DaemonMessage::ProjectCreated { project_id, .. } => project_id,
            other => panic!("expected ProjectCreated, got {other:?}"),
        }
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

    /// Keep receiving frames until a StateChanged matching `expected` arrives.
    async fn expect_state(&mut self, expected: TerminalState) {
        let deadline = tokio::time::Instant::now() + Duration::from_secs(5);
        loop {
            let remaining = deadline.saturating_duration_since(tokio::time::Instant::now());
            if remaining.is_zero() {
                panic!("timed out waiting for state {expected:?}");
            }
            let frame = timeout(remaining, read_frame(&mut self.stream))
                .await
                .unwrap_or_else(|_| panic!("timed out waiting for state {expected:?}"))
                .unwrap();
            let msg: DaemonMessage = serde_json::from_slice(&frame).unwrap();
            if let DaemonMessage::StateChanged { state, .. } = msg {
                if state == expected {
                    return;
                }
            }
        }
    }

    /// Keep receiving frames until a `TerminalDeleted` for `expected_id`
    /// arrives — skips over interleaved Output/StateChanged frames from a
    /// still-attached connection, same reasoning as `expect_state`.
    async fn expect_terminal_deleted(&mut self, expected_id: &str) {
        let deadline = tokio::time::Instant::now() + Duration::from_secs(5);
        loop {
            let remaining = deadline.saturating_duration_since(tokio::time::Instant::now());
            if remaining.is_zero() {
                panic!("timed out waiting for TerminalDeleted({expected_id})");
            }
            let frame = timeout(remaining, read_frame(&mut self.stream))
                .await
                .unwrap_or_else(|_| panic!("timed out waiting for TerminalDeleted({expected_id})"))
                .unwrap();
            let msg: DaemonMessage = serde_json::from_slice(&frame).unwrap();
            if let DaemonMessage::TerminalDeleted { terminal_id } = msg {
                assert_eq!(terminal_id, expected_id);
                return;
            }
        }
    }

    /// Asserts no further frame arrives within `duration`.
    async fn expect_silence(&mut self, duration: Duration) {
        let result = timeout(duration, read_frame(&mut self.stream)).await;
        assert!(
            result.is_err(),
            "expected no further frames for {duration:?}, but one arrived"
        );
    }

    /// Reads and discards any frames that arrive within `duration`, without
    /// asserting anything. Used to absorb output a killed process had
    /// already flushed to the PTY before the kill signal took effect.
    async fn drain_briefly(&mut self, duration: Duration) {
        let deadline = tokio::time::Instant::now() + duration;
        loop {
            let remaining = deadline.saturating_duration_since(tokio::time::Instant::now());
            if remaining.is_zero() {
                return;
            }
            if timeout(remaining, read_frame(&mut self.stream))
                .await
                .is_err()
            {
                return;
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
    let project_id = client.create_project("test-project").await;
    client
        .send(&ClientMessage::CreateTerminal {
            project_id: project_id.clone(),
            env_vars: std::collections::HashMap::new(),
            shell: None,
            scrollback_lines: None,
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
    let project_id = client.create_project("test-project").await;
    client
        .send(&ClientMessage::CreateTerminal {
            project_id: project_id.clone(),
            env_vars: std::collections::HashMap::new(),
            shell: None,
            scrollback_lines: None,
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
    let project_id = client.create_project("test-project").await;
    client
        .send(&ClientMessage::CreateTerminal {
            project_id: project_id.clone(),
            env_vars: std::collections::HashMap::new(),
            shell: None,
            scrollback_lines: None,
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

#[tokio::test]
async fn stop_kills_the_process_and_marks_it_parado() {
    let (_dir, socket_path) = temp_socket_path();
    spawn_daemon(socket_path.clone());

    let mut client = TestClient::connect(&socket_path).await;
    let project_id = client.create_project("test-project").await;
    client
        .send(&ClientMessage::CreateTerminal {
            project_id: project_id.clone(),
            env_vars: std::collections::HashMap::new(),
            shell: None,
            scrollback_lines: None,
            cwd: "/tmp".to_string(),
            name: None,
            startup_command: Some("while true; do echo tick; sleep 0.05; done".to_string()),
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
    client.expect_state(TerminalState::Rodando).await;

    // Confirm the loop is actually producing output before stopping it.
    client.expect_output_containing("tick").await;

    client
        .send(&ClientMessage::Stop {
            terminal_id: terminal_id.clone(),
        })
        .await;
    client.expect_state(TerminalState::Parado).await;

    // The kill signal doesn't retroactively erase a tick the loop had
    // already flushed to the PTY microseconds earlier — absorb that one
    // straggler, then confirm the loop itself is truly dead, not just quiet.
    client.drain_briefly(Duration::from_millis(150)).await;
    client.expect_silence(Duration::from_millis(300)).await;
}

#[tokio::test]
async fn restart_spawns_a_fresh_process_using_the_stored_config() {
    let (_dir, socket_path) = temp_socket_path();
    spawn_daemon(socket_path.clone());

    let mut client = TestClient::connect(&socket_path).await;
    let project_id = client.create_project("test-project").await;
    client
        .send(&ClientMessage::CreateTerminal {
            project_id: project_id.clone(),
            env_vars: std::collections::HashMap::new(),
            shell: None,
            scrollback_lines: None,
            cwd: "/tmp".to_string(),
            name: None,
            startup_command: Some("echo restart-marker".to_string()),
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
    client.expect_state(TerminalState::Rodando).await;
    client.expect_output_containing("restart-marker").await;

    client
        .send(&ClientMessage::Stop {
            terminal_id: terminal_id.clone(),
        })
        .await;
    client.expect_state(TerminalState::Parado).await;

    client
        .send(&ClientMessage::Restart {
            terminal_id: terminal_id.clone(),
        })
        .await;
    client.expect_state(TerminalState::Rodando).await;

    // The startup command ran again on the fresh process — same stored config.
    client.expect_output_containing("restart-marker").await;
}

#[tokio::test]
async fn config_survives_stop_independently_of_restart_reuse() {
    let (_socket_dir, socket_path) = temp_socket_path();
    spawn_daemon(socket_path.clone());

    // A dedicated cwd (distinct from the shared "/tmp" other tests use) so
    // matching this exact path in output can't be a coincidence.
    let cwd_dir = tempfile::tempdir().unwrap();
    let expected_cwd = std::fs::canonicalize(cwd_dir.path())
        .unwrap()
        .display()
        .to_string();

    let mut client = TestClient::connect(&socket_path).await;
    let project_id = client.create_project("test-project").await;
    client
        .send(&ClientMessage::CreateTerminal {
            project_id: project_id.clone(),
            env_vars: std::collections::HashMap::new(),
            shell: None,
            scrollback_lines: None,
            cwd: cwd_dir.path().display().to_string(),
            name: Some("my-terminal".to_string()),
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
    client.expect_state(TerminalState::Rodando).await;

    client
        .send(&ClientMessage::Write {
            terminal_id: terminal_id.clone(),
            data: STANDARD.encode("pwd\n"),
        })
        .await;
    client.expect_output_containing(&expected_cwd).await;

    client
        .send(&ClientMessage::Stop {
            terminal_id: terminal_id.clone(),
        })
        .await;
    client.expect_state(TerminalState::Parado).await;

    // Nothing so far proves the *config* (as opposed to just the dead
    // process) survived — restart on a process reusing `cwd` is the only
    // way this protocol exposes that, so check it independently of the
    // startup_command-reuse assertion the other restart test makes.
    client
        .send(&ClientMessage::Restart {
            terminal_id: terminal_id.clone(),
        })
        .await;
    client.expect_state(TerminalState::Rodando).await;

    client
        .send(&ClientMessage::Write {
            terminal_id,
            data: STANDARD.encode("pwd\n"),
        })
        .await;
    client.expect_output_containing(&expected_cwd).await;
}

#[tokio::test]
async fn process_exiting_on_its_own_transitions_to_encerrado_with_exit_code() {
    let (_dir, socket_path) = temp_socket_path();
    spawn_daemon(socket_path.clone());

    let mut client = TestClient::connect(&socket_path).await;
    let project_id = client.create_project("test-project").await;
    client
        .send(&ClientMessage::CreateTerminal {
            project_id: project_id.clone(),
            env_vars: std::collections::HashMap::new(),
            shell: None,
            scrollback_lines: None,
            cwd: "/tmp".to_string(),
            name: None,
            startup_command: Some("echo before-exit; exit 7".to_string()),
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

    client.expect_output_containing("before-exit").await;
    client
        .expect_state(TerminalState::Encerrado { exit_code: 7 })
        .await;
}

#[tokio::test]
async fn scrollback_remains_attachable_after_the_process_exits_on_its_own() {
    let (_dir, socket_path) = temp_socket_path();
    spawn_daemon(socket_path.clone());

    let mut client = TestClient::connect(&socket_path).await;
    let project_id = client.create_project("test-project").await;
    client
        .send(&ClientMessage::CreateTerminal {
            project_id: project_id.clone(),
            env_vars: std::collections::HashMap::new(),
            shell: None,
            scrollback_lines: None,
            cwd: "/tmp".to_string(),
            name: None,
            startup_command: Some("echo exit-scrollback-marker; exit 3".to_string()),
        })
        .await;
    let terminal_id = match client.recv().await {
        DaemonMessage::Created { terminal_id } => terminal_id,
        other => panic!("expected Created, got {other:?}"),
    };

    // Give the process time to print and exit before attaching fresh.
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
        text.contains("exit-scrollback-marker"),
        "expected scrollback to survive the process exiting on its own, got: {text:?}"
    );

    client
        .expect_state(TerminalState::Encerrado { exit_code: 3 })
        .await;
}

#[tokio::test]
async fn restart_works_from_encerrado_same_as_from_parado() {
    let (_dir, socket_path) = temp_socket_path();
    spawn_daemon(socket_path.clone());

    let mut client = TestClient::connect(&socket_path).await;
    let project_id = client.create_project("test-project").await;
    client
        .send(&ClientMessage::CreateTerminal {
            project_id: project_id.clone(),
            env_vars: std::collections::HashMap::new(),
            shell: None,
            scrollback_lines: None,
            cwd: "/tmp".to_string(),
            name: None,
            startup_command: Some("echo encerrado-restart-marker; exit 1".to_string()),
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
        .expect_output_containing("encerrado-restart-marker")
        .await;
    client
        .expect_state(TerminalState::Encerrado { exit_code: 1 })
        .await;

    client
        .send(&ClientMessage::Restart {
            terminal_id: terminal_id.clone(),
        })
        .await;
    client.expect_state(TerminalState::Rodando).await;

    // The startup command ran again on the fresh process — same stored config.
    client
        .expect_output_containing("encerrado-restart-marker")
        .await;
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn rapid_stop_restart_cycles_never_corrupt_a_later_process() {
    // Regression test: a killed process's reader thread only notices EOF
    // asynchronously, after `stop()` has already returned. If a `restart`
    // races in during that window, the stale reader thread must not mistake
    // the newly-installed process for its own dead one (see the
    // `generation` tag on `LiveProcess` / `handle_process_exit`) — that bug
    // would either hang future stop/restart calls or spuriously mark a
    // perfectly live process `Encerrado`.
    let (_dir, socket_path) = temp_socket_path();
    spawn_daemon(socket_path.clone());

    let mut client = TestClient::connect(&socket_path).await;
    let project_id = client.create_project("test-project").await;
    client
        .send(&ClientMessage::CreateTerminal {
            project_id: project_id.clone(),
            env_vars: std::collections::HashMap::new(),
            shell: None,
            scrollback_lines: None,
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

    // Stop immediately followed by restart, with no delay — racing the
    // stop-killed process's reader thread against the restart, repeatedly.
    for _ in 0..20 {
        client
            .send(&ClientMessage::Stop {
                terminal_id: terminal_id.clone(),
            })
            .await;
        client
            .send(&ClientMessage::Restart {
                terminal_id: terminal_id.clone(),
            })
            .await;
    }

    // Give any stale reader threads from earlier generations time to notice
    // EOF and (if the bug were present) clobber the final process or wedge
    // `lifecycle` forever.
    tokio::time::sleep(Duration::from_millis(300)).await;

    // The terminal must still be genuinely usable: commands still run...
    client
        .send(&ClientMessage::Write {
            terminal_id: terminal_id.clone(),
            data: STANDARD.encode("echo still-alive\n"),
        })
        .await;
    client.expect_output_containing("still-alive").await;

    // ...and a fresh stop/restart still completes. `expect_state`'s 5s
    // timeout is what actually catches the bug: a stale thread stuck
    // blocking on `child.wait()` for a live process would hold `lifecycle`
    // forever and hang these.
    client
        .send(&ClientMessage::Stop {
            terminal_id: terminal_id.clone(),
        })
        .await;
    client.expect_state(TerminalState::Parado).await;

    client
        .send(&ClientMessage::Restart {
            terminal_id: terminal_id.clone(),
        })
        .await;
    client.expect_state(TerminalState::Rodando).await;
}

#[tokio::test]
async fn create_project_and_list_it() {
    let (_dir, socket_path) = temp_socket_path();
    spawn_daemon(socket_path.clone());

    let mut client = TestClient::connect(&socket_path).await;
    let project_id = client.create_project("httyml").await;

    client.send(&ClientMessage::ListProjects).await;
    let projects = match client.recv().await {
        DaemonMessage::Projects { projects } => projects,
        other => panic!("expected Projects, got {other:?}"),
    };

    assert_eq!(projects.len(), 1);
    assert_eq!(projects[0].id, project_id);
    assert_eq!(projects[0].name, "httyml");
}

#[tokio::test]
async fn list_projects_returns_every_created_project() {
    let (_dir, socket_path) = temp_socket_path();
    spawn_daemon(socket_path.clone());

    let mut client = TestClient::connect(&socket_path).await;
    let first = client.create_project("first-project").await;
    let second = client.create_project("second-project").await;

    client.send(&ClientMessage::ListProjects).await;
    let mut projects = match client.recv().await {
        DaemonMessage::Projects { projects } => projects,
        other => panic!("expected Projects, got {other:?}"),
    };
    projects.sort_by(|a, b| a.name.cmp(&b.name));

    assert_eq!(projects.len(), 2);
    assert_eq!(projects[0].id, first);
    assert_eq!(projects[0].name, "first-project");
    assert_eq!(projects[1].id, second);
    assert_eq!(projects[1].name, "second-project");
}

#[tokio::test]
async fn list_terminals_is_scoped_to_its_project() {
    let (_dir, socket_path) = temp_socket_path();
    spawn_daemon(socket_path.clone());

    let mut client = TestClient::connect(&socket_path).await;
    let project_a = client.create_project("project-a").await;
    let project_b = client.create_project("project-b").await;

    client
        .send(&ClientMessage::CreateTerminal {
            project_id: project_a.clone(),
            env_vars: std::collections::HashMap::new(),
            shell: None,
            scrollback_lines: None,
            cwd: "/tmp".to_string(),
            name: Some("in-a".to_string()),
            startup_command: None,
        })
        .await;
    let terminal_a = match client.recv().await {
        DaemonMessage::Created { terminal_id } => terminal_id,
        other => panic!("expected Created, got {other:?}"),
    };

    client
        .send(&ClientMessage::CreateTerminal {
            project_id: project_b.clone(),
            env_vars: std::collections::HashMap::new(),
            shell: None,
            scrollback_lines: None,
            cwd: "/tmp".to_string(),
            name: Some("in-b".to_string()),
            startup_command: None,
        })
        .await;
    let terminal_b = match client.recv().await {
        DaemonMessage::Created { terminal_id } => terminal_id,
        other => panic!("expected Created, got {other:?}"),
    };

    client
        .send(&ClientMessage::ListTerminals {
            project_id: project_a.clone(),
        })
        .await;
    let (returned_project, terminals_in_a) = match client.recv().await {
        DaemonMessage::Terminals {
            project_id,
            terminals,
        } => (project_id, terminals),
        other => panic!("expected Terminals, got {other:?}"),
    };

    assert_eq!(returned_project, project_a);
    assert_eq!(terminals_in_a.len(), 1);
    assert_eq!(terminals_in_a[0].id, terminal_a);
    assert_eq!(terminals_in_a[0].name.as_deref(), Some("in-a"));
    assert!(terminals_in_a.iter().all(|t| t.id != terminal_b));
}

#[tokio::test]
async fn configured_env_vars_are_present_in_the_shell() {
    let (_dir, socket_path) = temp_socket_path();
    spawn_daemon(socket_path.clone());

    let mut client = TestClient::connect(&socket_path).await;
    let project_id = client.create_project("test-project").await;

    let mut env_vars = std::collections::HashMap::new();
    env_vars.insert("HTTYML_TEST_VAR".to_string(), "hello-env".to_string());

    client
        .send(&ClientMessage::CreateTerminal {
            project_id,
            env_vars,
            shell: None,
            scrollback_lines: None,
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
        .send(&ClientMessage::Write {
            terminal_id,
            data: STANDARD.encode("echo VAR-IS-$HTTYML_TEST_VAR\n"),
        })
        .await;

    client.expect_output_containing("VAR-IS-hello-env").await;
}

#[tokio::test]
async fn configured_shell_is_used_to_spawn_the_process() {
    let (_dir, socket_path) = temp_socket_path();
    spawn_daemon(socket_path.clone());

    let mut client = TestClient::connect(&socket_path).await;
    let project_id = client.create_project("test-project").await;

    let expected_shell = std::fs::canonicalize("/bin/sh")
        .unwrap()
        .display()
        .to_string();

    client
        .send(&ClientMessage::CreateTerminal {
            project_id,
            env_vars: std::collections::HashMap::new(),
            shell: Some("/bin/sh".to_string()),
            scrollback_lines: None,
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
        .send(&ClientMessage::Write {
            terminal_id,
            data: STANDARD.encode("readlink -f /proc/$$/exe\n"),
        })
        .await;

    client.expect_output_containing(&expected_shell).await;
}

#[tokio::test]
async fn custom_scrollback_limit_evicts_older_lines() {
    let (_dir, socket_path) = temp_socket_path();
    spawn_daemon(socket_path.clone());

    let mut client = TestClient::connect(&socket_path).await;
    let project_id = client.create_project("test-project").await;

    client
        .send(&ClientMessage::CreateTerminal {
            project_id,
            env_vars: std::collections::HashMap::new(),
            shell: None,
            scrollback_lines: Some(20),
            cwd: "/tmp".to_string(),
            name: None,
            startup_command: Some("for i in $(seq 1 200); do echo line-$i; done".to_string()),
        })
        .await;
    let terminal_id = match client.recv().await {
        DaemonMessage::Created { terminal_id } => terminal_id,
        other => panic!("expected Created, got {other:?}"),
    };

    // Wait for the loop to fully finish producing output before attaching.
    tokio::time::sleep(Duration::from_millis(500)).await;

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
        text.contains("line-200"),
        "expected the most recent line to survive eviction, got: {text:?}"
    );
    assert!(
        !text.lines().any(|line| line == "line-1"),
        "expected the earliest lines to have been evicted at the 20-line limit, got: {text:?}"
    );
}

#[tokio::test]
async fn empty_shell_string_falls_back_to_the_default_shell() {
    let (_dir, socket_path) = temp_socket_path();
    spawn_daemon(socket_path.clone());

    let mut client = TestClient::connect(&socket_path).await;
    let project_id = client.create_project("test-project").await;

    client
        .send(&ClientMessage::CreateTerminal {
            project_id,
            env_vars: std::collections::HashMap::new(),
            shell: Some(String::new()),
            scrollback_lines: None,
            cwd: "/tmp".to_string(),
            name: None,
            startup_command: Some("echo shell-fallback-ok".to_string()),
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

    client.expect_output_containing("shell-fallback-ok").await;
}

#[tokio::test]
async fn delete_terminal_kills_the_process_and_removes_it_permanently() {
    let (_dir, socket_path) = temp_socket_path();
    spawn_daemon(socket_path.clone());

    let mut client = TestClient::connect(&socket_path).await;
    let project_id = client.create_project("test-project").await;

    client
        .send(&ClientMessage::CreateTerminal {
            project_id: project_id.clone(),
            env_vars: std::collections::HashMap::new(),
            shell: None,
            scrollback_lines: None,
            cwd: "/tmp".to_string(),
            name: None,
            startup_command: Some("while true; do echo delete-tick; sleep 0.05; done".to_string()),
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
    client.expect_output_containing("delete-tick").await;

    client
        .send(&ClientMessage::DeleteTerminal {
            terminal_id: terminal_id.clone(),
        })
        .await;
    client.expect_terminal_deleted(&terminal_id).await;

    // The kill signal doesn't retroactively erase a tick the loop had
    // already flushed to the PTY microseconds earlier — absorb that one
    // straggler, then confirm the loop itself is truly dead.
    client.drain_briefly(Duration::from_millis(150)).await;
    client.expect_silence(Duration::from_millis(300)).await;

    // Gone from its Project's list.
    client
        .send(&ClientMessage::ListTerminals {
            project_id: project_id.clone(),
        })
        .await;
    match client.recv().await {
        DaemonMessage::Terminals { terminals, .. } => {
            assert!(terminals.iter().all(|t| t.id != terminal_id))
        }
        other => panic!("expected Terminals, got {other:?}"),
    }

    // Cannot be attached to — it no longer exists.
    let mut second_client = TestClient::connect(&socket_path).await;
    second_client
        .send(&ClientMessage::Attach {
            terminal_id: terminal_id.clone(),
        })
        .await;
    match second_client.recv().await {
        DaemonMessage::Error { .. } => {}
        other => panic!("expected Error for a deleted terminal, got {other:?}"),
    }

    // And cannot be restarted: Restart on an unknown id is a silent no-op
    // (nothing to restart), so attaching afterward still fails the same way
    // rather than finding a freshly-respawned Terminal.
    second_client
        .send(&ClientMessage::Restart {
            terminal_id: terminal_id.clone(),
        })
        .await;
    second_client
        .send(&ClientMessage::Attach { terminal_id })
        .await;
    match second_client.recv().await {
        DaemonMessage::Error { .. } => {}
        other => panic!("expected restart to have no effect on a deleted terminal, got {other:?}"),
    }
}

#[tokio::test]
async fn delete_project_cascades_to_its_terminals() {
    let (_dir, socket_path) = temp_socket_path();
    spawn_daemon(socket_path.clone());

    let mut client = TestClient::connect(&socket_path).await;
    let project_id = client.create_project("cascade-project").await;
    let other_project_id = client.create_project("untouched-project").await;

    client
        .send(&ClientMessage::CreateTerminal {
            project_id: other_project_id.clone(),
            env_vars: std::collections::HashMap::new(),
            shell: None,
            scrollback_lines: None,
            cwd: "/tmp".to_string(),
            name: Some("survivor".to_string()),
            startup_command: None,
        })
        .await;
    let survivor_terminal = match client.recv().await {
        DaemonMessage::Created { terminal_id } => terminal_id,
        other => panic!("expected Created, got {other:?}"),
    };

    client
        .send(&ClientMessage::CreateTerminal {
            project_id: project_id.clone(),
            env_vars: std::collections::HashMap::new(),
            shell: None,
            scrollback_lines: None,
            cwd: "/tmp".to_string(),
            name: Some("first".to_string()),
            startup_command: None,
        })
        .await;
    let terminal_one = match client.recv().await {
        DaemonMessage::Created { terminal_id } => terminal_id,
        other => panic!("expected Created, got {other:?}"),
    };

    client
        .send(&ClientMessage::CreateTerminal {
            project_id: project_id.clone(),
            env_vars: std::collections::HashMap::new(),
            shell: None,
            scrollback_lines: None,
            cwd: "/tmp".to_string(),
            name: Some("second".to_string()),
            startup_command: None,
        })
        .await;
    let terminal_two = match client.recv().await {
        DaemonMessage::Created { terminal_id } => terminal_id,
        other => panic!("expected Created, got {other:?}"),
    };

    client
        .send(&ClientMessage::DeleteProject {
            project_id: project_id.clone(),
        })
        .await;
    match client.recv().await {
        DaemonMessage::ProjectDeleted {
            project_id: deleted,
        } => {
            assert_eq!(deleted, project_id)
        }
        other => panic!("expected ProjectDeleted, got {other:?}"),
    }

    client.send(&ClientMessage::ListProjects).await;
    match client.recv().await {
        DaemonMessage::Projects { projects } => {
            assert!(projects.iter().all(|p| p.id != project_id))
        }
        other => panic!("expected Projects, got {other:?}"),
    }

    for terminal_id in [terminal_one, terminal_two] {
        client.send(&ClientMessage::Attach { terminal_id }).await;
        match client.recv().await {
            DaemonMessage::Error { .. } => {}
            other => panic!("expected Error for a cascade-deleted terminal, got {other:?}"),
        }
    }

    // A Terminal in a different, untouched Project must survive the cascade.
    client.send(&ClientMessage::ListProjects).await;
    match client.recv().await {
        DaemonMessage::Projects { projects } => {
            assert!(projects.iter().any(|p| p.id == other_project_id))
        }
        other => panic!("expected Projects, got {other:?}"),
    }
    client
        .send(&ClientMessage::Attach {
            terminal_id: survivor_terminal,
        })
        .await;
    match client.recv().await {
        DaemonMessage::Scrollback { .. } => {}
        other => panic!("expected the survivor Terminal to still be attachable, got {other:?}"),
    }
}
