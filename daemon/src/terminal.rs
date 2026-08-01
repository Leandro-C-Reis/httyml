use std::collections::VecDeque;
use std::io::{Read, Write};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, Mutex};

use portable_pty::{native_pty_system, Child, CommandBuilder, MasterPty, PtySize};
use serde::{Deserialize, Serialize};
use tokio::sync::broadcast;

pub const DEFAULT_SCROLLBACK_LINES: usize = 10_000;

/// Bounded, line-oriented history of a Terminal's raw output.
pub struct Scrollback {
    lines: VecDeque<Vec<u8>>,
    current: Vec<u8>,
    max_lines: usize,
}

impl Scrollback {
    pub fn new(max_lines: usize) -> Self {
        Self {
            lines: VecDeque::new(),
            current: Vec::new(),
            max_lines,
        }
    }

    pub fn push(&mut self, data: &[u8]) {
        for &b in data {
            self.current.push(b);
            if b == b'\n' {
                self.lines.push_back(std::mem::take(&mut self.current));
                while self.lines.len() > self.max_lines {
                    self.lines.pop_front();
                }
            }
        }
    }

    pub fn snapshot(&self) -> Vec<u8> {
        let mut out = Vec::new();
        for line in &self.lines {
            out.extend_from_slice(line);
        }
        out.extend_from_slice(&self.current);
        out
    }

    pub fn line_count(&self) -> usize {
        self.lines.len()
    }
}

/// A Terminal's lifecycle state. `Parado` is a user-initiated stop;
/// `Encerrado` is the process exiting on its own (and records why).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum TerminalState {
    Rodando,
    Parado,
    Encerrado { exit_code: i32 },
}

/// The live PTY/process bits of a Terminal — present only while `Rodando`.
/// `generation` identifies which `start_process` call produced it, so a
/// reader thread from a since-replaced process can tell "the process I was
/// reading died" apart from "a restart already installed a newer one" —
/// see `handle_process_exit`.
struct LiveProcess {
    generation: u64,
    master: Box<dyn MasterPty + Send>,
    writer: Box<dyn Write + Send>,
    child: Box<dyn Child + Send>,
}

/// A PTY-backed Terminal, owned by the Daemon. Its identity (`id`, `cwd`,
/// `scrollback`, `tx`) outlives any single process: stopping kills the
/// process but keeps the config and history; restarting spawns a fresh
/// process reusing that same config.
pub struct TerminalHandle {
    pub id: String,
    pub name: Option<String>,
    pub cwd: String,
    startup_command: Option<String>,
    /// Serializes `stop`, `restart`, and `handle_process_exit` against each
    /// other so none of the three can act on a `process`/`state` pair that
    /// another one is concurrently changing.
    lifecycle: Mutex<()>,
    /// Incremented on every `start_process` call; tags each `LiveProcess`
    /// with the generation that created it (see `LiveProcess::generation`).
    generation: AtomicU64,
    process: Mutex<Option<LiveProcess>>,
    state: Mutex<TerminalState>,
    pub scrollback: Arc<Mutex<Scrollback>>,
    pub tx: broadcast::Sender<Vec<u8>>,
    pub state_tx: broadcast::Sender<TerminalState>,
}

impl TerminalHandle {
    pub fn spawn(
        id: String,
        cwd: String,
        name: Option<String>,
        startup_command: Option<String>,
        scrollback_lines: usize,
    ) -> anyhow::Result<Arc<TerminalHandle>> {
        let scrollback = Arc::new(Mutex::new(Scrollback::new(scrollback_lines)));
        let (tx, _rx) = broadcast::channel(1024);
        let (state_tx, _rx) = broadcast::channel(16);

        let handle = Arc::new(TerminalHandle {
            id,
            name,
            cwd,
            startup_command,
            lifecycle: Mutex::new(()),
            generation: AtomicU64::new(0),
            process: Mutex::new(None),
            state: Mutex::new(TerminalState::Parado),
            scrollback,
            tx,
            state_tx,
        });

        handle.start_process()?;
        Ok(handle)
    }

    pub fn state(&self) -> TerminalState {
        *self.state.lock().unwrap()
    }

    /// Snapshots the scrollback, current state, and subscribes to both live
    /// output and state changes as one atomic step, so a chunk the reader
    /// thread produces around the same moment lands in exactly one of the
    /// two (never both, never neither) — see the reader thread below, which
    /// pushes to scrollback and broadcasts under this same lock.
    pub fn snapshot_and_subscribe(
        &self,
    ) -> (
        Vec<u8>,
        TerminalState,
        broadcast::Receiver<Vec<u8>>,
        broadcast::Receiver<TerminalState>,
    ) {
        let sb = self.scrollback.lock().unwrap();
        let output_rx = self.tx.subscribe();
        (
            sb.snapshot(),
            self.state(),
            output_rx,
            self.state_tx.subscribe(),
        )
    }

    fn start_process(self: &Arc<Self>) -> anyhow::Result<()> {
        let pty_system = native_pty_system();
        let pair = pty_system.openpty(PtySize {
            rows: 24,
            cols: 80,
            pixel_width: 0,
            pixel_height: 0,
        })?;

        let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/sh".to_string());
        let mut cmd = CommandBuilder::new(shell);
        cmd.cwd(&self.cwd);

        let child = pair.slave.spawn_command(cmd)?;
        drop(pair.slave);

        let mut writer = pair.master.take_writer()?;
        if let Some(startup) = &self.startup_command {
            writer.write_all(startup.as_bytes())?;
            writer.write_all(b"\n")?;
        }

        let mut reader = pair.master.try_clone_reader()?;
        let generation = self.generation.fetch_add(1, Ordering::SeqCst);

        *self.process.lock().unwrap() = Some(LiveProcess {
            generation,
            master: pair.master,
            writer,
            child,
        });
        self.set_state(TerminalState::Rodando);

        let handle = self.clone();
        std::thread::spawn(move || {
            let mut buf = [0u8; 4096];
            loop {
                match reader.read(&mut buf) {
                    Ok(0) => break,
                    Ok(n) => {
                        let chunk = buf[..n].to_vec();
                        if let Ok(mut sb) = handle.scrollback.lock() {
                            sb.push(&chunk);
                            let _ = handle.tx.send(chunk);
                        }
                    }
                    Err(_) => break,
                }
            }
            handle.handle_process_exit(generation);
        });

        Ok(())
    }

    /// Called by the reader thread once its PTY closes. Only acts if
    /// `process` still holds the *same generation* this reader thread was
    /// spawned for: if it's `None`, `stop` already reaped it; if it holds a
    /// different (newer) generation, a `restart` already replaced it while
    /// this stale thread was still blocked in `read` — either way, someone
    /// else already decided this Terminal's state and this stale thread
    /// must not touch (or reap) a process that isn't its own.
    fn handle_process_exit(&self, generation: u64) {
        let _guard = self.lifecycle.lock().unwrap();
        let mut process = self.process.lock().unwrap();
        let is_mine = matches!(process.as_ref(), Some(live) if live.generation == generation);
        if !is_mine {
            return;
        }
        let mut live = process.take().unwrap();
        drop(process);
        let exit_code = live
            .child
            .wait()
            .map(|status| status.exit_code() as i32)
            .unwrap_or(-1);
        self.set_state(TerminalState::Encerrado { exit_code });
    }

    fn set_state(&self, state: TerminalState) {
        *self.state.lock().unwrap() = state;
        let _ = self.state_tx.send(state);
    }

    /// Kills the running process and moves to `Parado`. The config (cwd,
    /// name, startup command) and scrollback are untouched. A no-op if
    /// there's no live process (already `Parado` or `Encerrado`) — in
    /// particular this must NOT force `Parado` over an `Encerrado` the
    /// reader thread already recorded.
    pub fn stop(&self) -> anyhow::Result<()> {
        let _guard = self.lifecycle.lock().unwrap();
        let live = self.process.lock().unwrap().take();
        if let Some(mut live) = live {
            let _ = live.child.kill();
            let _ = live.child.wait();
            self.set_state(TerminalState::Parado);
        }
        Ok(())
    }

    /// Spawns a fresh process reusing the stored config. A no-op if already
    /// `Rodando`. Holds `lifecycle` across the whole check-then-spawn so a
    /// second concurrent call can't also pass the check and orphan a
    /// process by overwriting the first one's `LiveProcess`.
    pub fn restart(self: &Arc<Self>) -> anyhow::Result<()> {
        let _guard = self.lifecycle.lock().unwrap();
        if self.state() == TerminalState::Rodando {
            return Ok(());
        }
        self.start_process()
    }

    fn not_running(&self) -> anyhow::Error {
        anyhow::anyhow!("terminal {} is not running", self.id)
    }

    pub fn write_input(&self, data: &[u8]) -> anyhow::Result<()> {
        let mut process = self.process.lock().unwrap();
        let live = process.as_mut().ok_or_else(|| self.not_running())?;
        live.writer.write_all(data)?;
        live.writer.flush()?;
        Ok(())
    }

    pub fn resize(&self, rows: u16, cols: u16) -> anyhow::Result<()> {
        let process = self.process.lock().unwrap();
        let live = process.as_ref().ok_or_else(|| self.not_running())?;
        live.master.resize(PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        })?;
        Ok(())
    }
}
