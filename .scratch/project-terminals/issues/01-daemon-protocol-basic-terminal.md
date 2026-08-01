# 01 — Daemon, protocol, basic Terminal

**What to build:** A background Daemon (Rust, bundled Tauri sidecar) that the app starts automatically if not already running. App and Daemon talk over a Unix domain socket using length-prefixed JSON messages. User can quick-create a Terminal (only cwd required) that spawns a real PTY, renders live in the app as an interactive shell (xterm.js), survives the app closing, and replays buffered scrollback (default 10,000 lines) on attach.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [x] App detects whether the Daemon is reachable over the socket; if not, spawns the bundled sidecar Daemon automatically
- [x] Creating a Terminal requires only a working directory (defaults to the last-used directory); name and startup command are optional and may be left blank
- [x] A newly created Terminal starts immediately as a real PTY process (`rodando` state)
- [x] The Terminal renders as a live, interactive shell — keystrokes, arrow keys, control sequences, and colors behave as in a real terminal
- [x] Resizing the Terminal's visible area resizes the underlying PTY (verified against a program that reacts to terminal size)
- [x] Attaching to a Terminal returns its buffered scrollback (up to 10,000 lines by default) before streaming further live output
- [x] Closing the app window does not kill the Daemon or the Terminal's process
- [x] Daemon integration tests (real socket, real short-lived shell commands, temporary socket path per test) cover: quick-create, attach with scrollback replay, write input, resize
- [x] UI component tests cover the quick-create form (cwd required, name/startup-command optional) and the rendered terminal view, mocking only the socket/invoke client boundary

## Comments

Implemented in commit 4780fca. Notes on a couple of criteria:

- "Closing the app window does not kill the Daemon or the Terminal's process" holds by construction (the Daemon is a separate OS process the app merely connects a socket to) rather than by an explicit kill-guard; not independently covered by an automated test.
- The `TerminalView` UI tests mock `@xterm/xterm` itself in addition to the socket/invoke boundary (`../lib/daemon`) — real xterm.js needs a canvas context jsdom doesn't provide, so mocking it was the pragmatic choice to keep the seam testable headlessly. The tests do verify our own decode/attach/write glue against the mocked terminal, not xterm's own rendering.
- Could not open the actual Tauri window in this environment to visually verify the running app (non-interactive sandbox, no display) — verified instead via the Daemon's real-PTY/real-socket integration tests, frontend component tests, `tsc`, `cargo clippy`, and a full `npm run build` pass.
- Code-reviewed (Standards + Spec axes) before commit; fixed a real attach-time race between scrollback snapshot and live-output subscription, a CONTEXT.md glossary drift (`ServerMessage`/`server.rs` → `DaemonMessage`/`connection.rs`), duplicated socket-path logic, and a missing neobrutalism border-radius token.
