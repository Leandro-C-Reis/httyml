# 01 — Daemon, protocol, basic Terminal

**What to build:** A background Daemon (Rust, bundled Tauri sidecar) that the app starts automatically if not already running. App and Daemon talk over a Unix domain socket using length-prefixed JSON messages. User can quick-create a Terminal (only cwd required) that spawns a real PTY, renders live in the app as an interactive shell (xterm.js), survives the app closing, and replays buffered scrollback (default 10,000 lines) on attach.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] App detects whether the Daemon is reachable over the socket; if not, spawns the bundled sidecar Daemon automatically
- [ ] Creating a Terminal requires only a working directory (defaults to the last-used directory); name and startup command are optional and may be left blank
- [ ] A newly created Terminal starts immediately as a real PTY process (`rodando` state)
- [ ] The Terminal renders as a live, interactive shell — keystrokes, arrow keys, control sequences, and colors behave as in a real terminal
- [ ] Resizing the Terminal's visible area resizes the underlying PTY (verified against a program that reacts to terminal size)
- [ ] Attaching to a Terminal returns its buffered scrollback (up to 10,000 lines by default) before streaming further live output
- [ ] Closing the app window does not kill the Daemon or the Terminal's process
- [ ] Daemon integration tests (real socket, real short-lived shell commands, temporary socket path per test) cover: quick-create, attach with scrollback replay, write input, resize
- [ ] UI component tests cover the quick-create form (cwd required, name/startup-command optional) and the rendered terminal view, mocking only the socket/invoke client boundary
