use std::collections::VecDeque;
use std::io::{Read, Write};
use std::sync::{Arc, Mutex};

use portable_pty::{native_pty_system, Child, CommandBuilder, MasterPty, PtySize};
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

/// A live PTY-backed Terminal, owned by the Daemon.
pub struct TerminalHandle {
    pub id: String,
    pub name: Option<String>,
    pub cwd: String,
    master: Mutex<Box<dyn MasterPty + Send>>,
    writer: Mutex<Box<dyn Write + Send>>,
    pub scrollback: Arc<Mutex<Scrollback>>,
    pub tx: broadcast::Sender<Vec<u8>>,
    _child: Mutex<Box<dyn Child + Send>>,
}

impl TerminalHandle {
    pub fn spawn(
        id: String,
        cwd: String,
        name: Option<String>,
        startup_command: Option<String>,
        scrollback_lines: usize,
    ) -> anyhow::Result<Arc<TerminalHandle>> {
        let pty_system = native_pty_system();
        let pair = pty_system.openpty(PtySize {
            rows: 24,
            cols: 80,
            pixel_width: 0,
            pixel_height: 0,
        })?;

        let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/sh".to_string());
        let mut cmd = CommandBuilder::new(shell);
        cmd.cwd(&cwd);

        let child = pair.slave.spawn_command(cmd)?;
        drop(pair.slave);

        let mut writer = pair.master.take_writer()?;
        if let Some(startup) = &startup_command {
            writer.write_all(startup.as_bytes())?;
            writer.write_all(b"\n")?;
        }

        let mut reader = pair.master.try_clone_reader()?;
        let scrollback = Arc::new(Mutex::new(Scrollback::new(scrollback_lines)));
        let (tx, _rx) = broadcast::channel(1024);

        let handle = Arc::new(TerminalHandle {
            id,
            name,
            cwd,
            master: Mutex::new(pair.master),
            writer: Mutex::new(writer),
            scrollback: scrollback.clone(),
            tx: tx.clone(),
            _child: Mutex::new(child),
        });

        std::thread::spawn(move || {
            let mut buf = [0u8; 4096];
            loop {
                match reader.read(&mut buf) {
                    Ok(0) => break,
                    Ok(n) => {
                        let chunk = buf[..n].to_vec();
                        // Push and broadcast under the same lock snapshot_and_subscribe()
                        // synchronizes on, so an attach can never see a chunk in neither
                        // (a gap) or both (a duplicate) of the scrollback and the live stream.
                        if let Ok(mut sb) = scrollback.lock() {
                            sb.push(&chunk);
                            let _ = tx.send(chunk);
                        }
                    }
                    Err(_) => break,
                }
            }
        });

        Ok(handle)
    }

    /// Snapshots the scrollback and subscribes to live output as one atomic
    /// step, so a chunk the reader thread produces around the same moment
    /// lands in exactly one of the two (never both, never neither) — see the
    /// reader thread above, which pushes to scrollback and broadcasts under
    /// this same lock.
    pub fn snapshot_and_subscribe(&self) -> (Vec<u8>, broadcast::Receiver<Vec<u8>>) {
        let sb = self.scrollback.lock().unwrap();
        (sb.snapshot(), self.tx.subscribe())
    }

    pub fn write_input(&self, data: &[u8]) -> anyhow::Result<()> {
        let mut w = self.writer.lock().unwrap();
        w.write_all(data)?;
        w.flush()?;
        Ok(())
    }

    pub fn resize(&self, rows: u16, cols: u16) -> anyhow::Result<()> {
        self.master.lock().unwrap().resize(PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        })?;
        Ok(())
    }
}
