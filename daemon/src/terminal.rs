use std::collections::{HashMap, VecDeque};
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

/// A Terminal's lifecycle state. `Stopped` is a user-initiated stop;
/// `Exited` is the process exiting on its own (and records why).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum TerminalState {
    Running,
    Stopped,
    Exited { exit_code: i32 },
}

/// The live PTY/process bits of a Terminal — present only while `Running`.
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

/// What a Terminal is created (and re-created, on restart or reload) with.
/// Bundled into one struct because `TerminalHandle::spawn`'s parameter list
/// was already at five and only grows as more config becomes configurable
/// (ticket 05 adds env vars, shell, and a scrollback override here). Also
/// what gets persisted to disk — see `crate::store`.
#[derive(Debug, Clone)]
pub struct TerminalConfig {
    pub project_id: String,
    /// Empty falls back to the Daemon's own `$HOME` (or `/` if that's unset)
    /// at spawn time — see `start_process`.
    pub cwd: String,
    pub name: Option<String>,
    pub startup_command: Option<String>,
    pub env_vars: HashMap<String, String>,
    /// Either a bare command name resolved via `PATH` (e.g. `"bash"`) or an
    /// absolute path (e.g. `"/bin/zsh"`). `None` (or empty) falls back to
    /// the Daemon's own `$SHELL`, or `/bin/sh` if that's unset.
    pub shell: Option<String>,
    pub scrollback_lines: usize,
}

/// A PTY-backed Terminal, owned by the Daemon. Its identity (`id`,
/// `scrollback`, `tx`) outlives any single process: stopping kills the
/// process but keeps the config and history; restarting spawns a fresh
/// process reusing whatever `config` currently holds — which `update_config`
/// can change in place (see its doc comment for what that does and doesn't
/// affect immediately).
pub struct TerminalHandle {
    pub id: String,
    pub project_id: String,
    config: Mutex<TerminalConfig>,
    /// Serializes `stop`, `restart`, and `handle_process_exit` against each
    /// other so none of the three can act on a `process`/`state` pair that
    /// another one is concurrently changing.
    lifecycle: Mutex<()>,
    /// Incremented on every `start_process` call; tags each `LiveProcess`
    /// with the generation that created it (see `LiveProcess::generation`).
    generation: AtomicU64,
    process: Mutex<Option<LiveProcess>>,
    /// Last size the client reported, kept on the handle (not on
    /// `LiveProcess`) so a `restart` spawns its PTY already matching the
    /// visible pane instead of the 80x24 default — a TUI launched from a
    /// startup command (whiptail, dialog, ...) reads the size once at
    /// startup and would otherwise draw itself at the wrong size.
    size: Mutex<(u16, u16)>,
    state: Mutex<TerminalState>,
    pub scrollback: Arc<Mutex<Scrollback>>,
    pub tx: broadcast::Sender<Vec<u8>>,
    pub state_tx: broadcast::Sender<TerminalState>,
}

impl TerminalHandle {
    const SHELL_FALLBACK_PATH: &'static str =
        "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin";
    /// (rows, cols) used until the client reports its actual pane size.
    const DEFAULT_SIZE: (u16, u16) = (24, 80);
    /// The PTY is a real terminal emulator (xterm.js) on the other end, but
    /// the daemon is a sidecar whose own `TERM` is whatever the desktop
    /// launcher happened to export (often unset, or `dumb`). Without this
    /// only shells that set `TERM` themselves in their rc files came out
    /// right, and everything else (ncurses TUIs, colours) misbehaved.
    const DEFAULT_TERM: &'static str = "xterm-256color";

    /// Builds a Terminal from config without starting a process — always
    /// `Stopped` until `start_process` runs. Shared by `spawn` (which starts
    /// immediately, for quick-create) and `reload` (which doesn't, since a
    /// reloaded Terminal's previous process is long gone).
    fn build(id: String, config: TerminalConfig) -> Arc<TerminalHandle> {
        let project_id = config.project_id.clone();
        let scrollback = Arc::new(Mutex::new(Scrollback::new(config.scrollback_lines)));
        let (tx, _rx) = broadcast::channel(1024);
        let (state_tx, _rx) = broadcast::channel(16);

        Arc::new(TerminalHandle {
            id,
            project_id,
            config: Mutex::new(config),
            lifecycle: Mutex::new(()),
            generation: AtomicU64::new(0),
            process: Mutex::new(None),
            size: Mutex::new(Self::DEFAULT_SIZE),
            state: Mutex::new(TerminalState::Stopped),
            scrollback,
            tx,
            state_tx,
        })
    }

    pub fn spawn(id: String, config: TerminalConfig) -> anyhow::Result<Arc<TerminalHandle>> {
        let handle = Self::build(id, config);
        handle.start_process()?;
        Ok(handle)
    }

    /// Reconstructs a Terminal from persisted config on Daemon startup,
    /// without starting a process — whatever ran before is gone now that
    /// the Daemon itself restarted. Starts `Stopped`; `restart()` spawns a
    /// fresh process reusing this same config, same as restarting a
    /// Terminal the user stopped themselves.
    pub fn reload(id: String, config: TerminalConfig) -> Arc<TerminalHandle> {
        Self::build(id, config)
    }

    pub fn state(&self) -> TerminalState {
        *self.state.lock().unwrap()
    }

    /// Snapshots this Terminal's current config, e.g. to persist to disk or
    /// to prefill the edit page.
    pub fn config_snapshot(&self) -> TerminalConfig {
        self.config.lock().unwrap().clone()
    }

    /// Replaces the stored config wholesale (`id`/`project_id` are identity,
    /// not config, and stay fixed). `name` is metadata and applies
    /// immediately; `cwd`/`startup_command`/`env_vars`/`shell` only affect a
    /// running process on its next `restart` — they can't be changed
    /// underneath an already-spawned process.
    pub fn update_config(
        &self,
        cwd: String,
        name: Option<String>,
        startup_command: Option<String>,
        env_vars: HashMap<String, String>,
        shell: Option<String>,
        scrollback_lines: usize,
    ) {
        let mut cfg = self.config.lock().unwrap();
        cfg.cwd = cwd;
        cfg.name = name;
        cfg.startup_command = startup_command;
        cfg.env_vars = env_vars;
        cfg.shell = shell;
        cfg.scrollback_lines = scrollback_lines;
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

    fn looks_like_runtime_mount_path(entry: &str) -> bool {
        entry.starts_with("/tmp/.mount_") || entry.contains("/.mount_")
    }

    fn sanitize_inherited_path(path: &str) -> String {
        let mut kept = Vec::new();
        for entry in path.split(':') {
            if !Self::looks_like_runtime_mount_path(entry) {
                kept.push(entry);
            }
        }
        if kept.is_empty() {
            Self::SHELL_FALLBACK_PATH.to_string()
        } else {
            kept.join(":")
        }
    }

    /// Strips AppImage/runtime-only environment leakage inherited by the
    /// sidecar process before spawning a user-facing PTY shell.
    fn sanitize_inherited_runtime_env(cmd: &mut CommandBuilder) {
        for key in ["APPDIR", "APPIMAGE", "ARGV0", "OWD"] {
            cmd.env_remove(key);
        }

        if let Ok(path) = std::env::var("PATH") {
            let clean_path = Self::sanitize_inherited_path(&path);
            if clean_path != path {
                cmd.env("PATH", clean_path);
            }
        }

        for key in [
            "LD_LIBRARY_PATH",
            "PYTHONHOME",
            "PYTHONPATH",
            "PYTHONEXECUTABLE",
        ] {
            if let Ok(value) = std::env::var(key) {
                if Self::looks_like_runtime_mount_path(&value) {
                    cmd.env_remove(key);
                }
            }
        }
    }

    fn start_process(self: &Arc<Self>) -> anyhow::Result<()> {
        // Cloned up front so the PTY spawn below doesn't run with the config
        // lock held — `update_config` must never block on a slow spawn.
        let cfg = self.config.lock().unwrap().clone();

        let (rows, cols) = *self.size.lock().unwrap();

        let pty_system = native_pty_system();
        let pair = pty_system.openpty(PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        })?;

        let shell = cfg
            .shell
            .as_deref()
            .filter(|s| !s.is_empty())
            .map(str::to_string)
            .or_else(|| std::env::var("SHELL").ok())
            .unwrap_or_else(|| "/bin/sh".to_string());
        let mut cmd = CommandBuilder::new(shell);
        Self::sanitize_inherited_runtime_env(&mut cmd);
        // Before `cfg.env_vars` so a Terminal's own `TERM` still wins.
        cmd.env("TERM", Self::DEFAULT_TERM);
        let cwd = if cfg.cwd.is_empty() {
            std::env::var("HOME").unwrap_or_else(|_| "/".to_string())
        } else {
            cfg.cwd.clone()
        };
        cmd.cwd(&cwd);
        for (key, value) in &cfg.env_vars {
            cmd.env(key, value);
        }

        let child = pair.slave.spawn_command(cmd)?;
        drop(pair.slave);

        let mut writer = pair.master.take_writer()?;
        if let Some(startup) = &cfg.startup_command {
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
        self.set_state(TerminalState::Running);
        crate::logging::info(format!("terminal {} started", self.id));

        let handle = self.clone();
        std::thread::spawn(move || {
            let mut buf = [0u8; 4096];
            loop {
                match reader.read(&mut buf) {
                    Ok(0) => break,
                    Ok(n) => {
                        let chunk = buf.as_slice()[..n].to_vec();
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
        self.set_state(TerminalState::Exited { exit_code });
        crate::logging::info(format!("terminal {} exited with code {exit_code}", self.id));
    }

    fn set_state(&self, state: TerminalState) {
        *self.state.lock().unwrap() = state;
        let _ = self.state_tx.send(state);
    }

    /// Kills the running process and moves to `Stopped`. The config (cwd,
    /// name, startup command) and scrollback are untouched. A no-op if
    /// there's no live process (already `Stopped` or `Exited`) — in
    /// particular this must NOT force `Stopped` over an `Exited` the
    /// reader thread already recorded.
    pub fn stop(&self) -> anyhow::Result<()> {
        let _guard = self.lifecycle.lock().unwrap();
        let live = self.process.lock().unwrap().take();
        if let Some(mut live) = live {
            // Kill the whole foreground process group, not just the shell.
            // An interactive shell's job control puts each foreground
            // command in its own process group — `npm run dev`, `sleep`,
            // whatever's actively running — separate from the shell's own
            // group. Killing only the shell's pid (what `child.kill()`
            // does) leaves that job running as an orphan that still holds
            // the pty open: its reader thread never sees EOF, and keeps
            // forwarding its output into this same Terminal's
            // scrollback/broadcast indefinitely, interleaved with whatever
            // gets started next. `process_group_leader` reads the pty's
            // *current* foreground group via tcgetpgrp — the shell itself
            // when idle, the active job when one is running — so signaling
            // its negative reaches the whole group either way.
            if let Some(pgid) = live.master.process_group_leader() {
                unsafe {
                    libc::kill(-pgid, libc::SIGKILL);
                }
            }
            let _ = live.child.kill();
            let _ = live.child.wait();
            self.set_state(TerminalState::Stopped);
            crate::logging::info(format!("terminal {} stopped", self.id));
        }
        Ok(())
    }

    /// Spawns a fresh process reusing the stored config. A no-op if already
    /// `Running`. Holds `lifecycle` across the whole check-then-spawn so a
    /// second concurrent call can't also pass the check and orphan a
    /// process by overwriting the first one's `LiveProcess`.
    pub fn restart(self: &Arc<Self>) -> anyhow::Result<()> {
        let _guard = self.lifecycle.lock().unwrap();
        if self.state() == TerminalState::Running {
            return Ok(());
        }
        self.start_process()
    }

    fn not_running(&self) -> anyhow::Error {
        anyhow::anyhow!("terminal {} is not running", self.id)
    }

    /// The Terminal's *actual* current directory: reads the live shell
    /// process's `/proc/<pid>/cwd` symlink, which reflects `cd` the instant
    /// it runs (a shell's own cwd, not a child command's — `cd` is a shell
    /// builtin that mutates the shell process's cwd directly). Falls back
    /// to the configured cwd when there's no live process to read, or the
    /// read fails (permissions, not on Linux, the process just exited),
    /// mirroring `start_process`'s own cwd fallback.
    pub fn live_cwd(&self) -> String {
        let pid = self
            .process
            .lock()
            .unwrap()
            .as_ref()
            .and_then(|live| live.child.process_id());
        if let Some(pid) = pid {
            if let Ok(target) = std::fs::read_link(format!("/proc/{pid}/cwd")) {
                return target.display().to_string();
            }
        }

        let cfg = self.config.lock().unwrap();
        if cfg.cwd.is_empty() {
            std::env::var("HOME").unwrap_or_else(|_| "/".to_string())
        } else {
            cfg.cwd.clone()
        }
    }

    pub fn write_input(&self, data: &[u8]) -> anyhow::Result<()> {
        let mut process = self.process.lock().unwrap();
        let live = process.as_mut().ok_or_else(|| self.not_running())?;
        live.writer.write_all(data)?;
        live.writer.flush()?;
        Ok(())
    }

    /// Records the size even when nothing is running, so the next
    /// `start_process` opens its PTY at the size the client last reported
    /// (see the `size` field).
    pub fn resize(&self, rows: u16, cols: u16) -> anyhow::Result<()> {
        if rows > 0 && cols > 0 {
            *self.size.lock().unwrap() = (rows, cols);
        }
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

#[cfg(test)]
mod tests {
    use super::TerminalHandle;

    #[test]
    fn detects_appimage_mount_entries() {
        assert!(TerminalHandle::looks_like_runtime_mount_path(
            "/tmp/.mount_httymlhPhdFi/usr/bin"
        ));
        assert!(TerminalHandle::looks_like_runtime_mount_path(
            "/run/user/1000/.mount_demo/usr/lib"
        ));
        assert!(!TerminalHandle::looks_like_runtime_mount_path("/usr/bin"));
    }

    #[test]
    fn removes_mount_paths_from_path() {
        let input = "/tmp/.mount_httymlhPhdFi/usr/bin:/usr/local/bin:/usr/bin";
        let clean = TerminalHandle::sanitize_inherited_path(input);
        assert_eq!(clean, "/usr/local/bin:/usr/bin");
    }

    #[test]
    fn falls_back_when_all_entries_are_mount_paths() {
        let input = "/tmp/.mount_foo/usr/bin:/tmp/.mount_foo/usr/sbin";
        let clean = TerminalHandle::sanitize_inherited_path(input);
        assert_eq!(clean, TerminalHandle::SHELL_FALLBACK_PATH);
    }
}
