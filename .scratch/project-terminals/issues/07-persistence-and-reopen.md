# 07 — Persistence and reopening the app

**What to build:** Project and Terminal configuration persists to a local JSON file and survives Daemon restarts. Reopening the app shows last-known status for every Project/Terminal without auto-attaching to any of them — attaching (scrollback fetch + live output) only happens when the user opens a specific Terminal's tab.

**Blocked by:** 03 — Terminal exits on its own, 05 — Rich Terminal configuration, 06 — Delete Terminal and Project

**Status:** ready-for-agent

- [x] Project and Terminal configuration (name, cwd, startup command, env vars, shell, scrollback limit) persists to a local JSON file, written on every mutation
- [x] Restarting the Daemon process reloads Projects/Terminals configuration from the JSON file
- [x] Reopening the app populates the sidebar and tab bars with last-known status (`rodando`/`parado`/`encerrado`) without attaching to any Terminal's live output automatically
- [x] Clicking a specific Terminal's tab is what triggers attach (scrollback fetch + live subscription); unopened tabs never attach
- [x] Daemon integration tests cover: config surviving a Daemon process restart, status query without attach, attach only upon explicit request
- [ ] UI tests cover: app-open state showing statuses without live connections, attach happening only on tab click — **deliberately skipped**: user asked to skip new frontend tests across this whole feature and verify manually instead

## Comments

Implemented in commit (see git log). This is the last ticket of the project-terminals feature — all 7 tickets done.

New `daemon/src/store.rs` handles JSON persistence (atomic write: temp file + rename) as a clean disk-format boundary, separate from the domain structs (`PersistedProject`/`PersistedTerminal` vs. `Project`/`TerminalConfig`), same pattern already used for the wire protocol (`ProjectInfo`/`TerminalInfo`). `TerminalHandle::reload()` reconstructs a Terminal from disk without starting a process — it always comes back `Parado`, since whatever it was running is gone the moment the Daemon itself restarted (live process state was never persisted, only config — CONTEXT.md / ADR-0001).

On the frontend, `App.tsx` needed a real behavioral change, not just wiring: previously every Terminal in a Project rendered a `TerminalView` immediately (kept mounted-but-hidden across tab switches, from ticket 01's original design). That attached all of them the moment a Project was selected, which is exactly what this ticket forbids. Reworked to track `openedTerminalIds` separately from the full Terminal list — only a tab click (`TerminalTabBar`'s `onSelect`) or a just-created Terminal opens (and so attaches) one; listing/selecting a Project never does.

Code review confirmed both CONTEXT.md rules are upheld (persistence is Daemon-only; the app never touches the JSON file) and flagged two small things, both fixed: a stray Rust-doc-style `///` comment in `App.tsx` (this codebase uses `//`), and added a maintenance note on `persist()` — it's called explicitly at 4 call sites in `connection.rs` with no structural guard, so a future config-changing operation must remember to call it too.
