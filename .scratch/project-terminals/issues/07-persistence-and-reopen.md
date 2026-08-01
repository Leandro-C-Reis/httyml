# 07 — Persistence and reopening the app

**What to build:** Project and Terminal configuration persists to a local JSON file and survives Daemon restarts. Reopening the app shows last-known status for every Project/Terminal without auto-attaching to any of them — attaching (scrollback fetch + live output) only happens when the user opens a specific Terminal's tab.

**Blocked by:** 03 — Terminal exits on its own, 05 — Rich Terminal configuration, 06 — Delete Terminal and Project

**Status:** ready-for-agent

- [ ] Project and Terminal configuration (name, cwd, startup command, env vars, shell, scrollback limit) persists to a local JSON file, written on every mutation
- [ ] Restarting the Daemon process reloads Projects/Terminals configuration from the JSON file
- [ ] Reopening the app populates the sidebar and tab bars with last-known status (`rodando`/`parado`/`encerrado`) without attaching to any Terminal's live output automatically
- [ ] Clicking a specific Terminal's tab is what triggers attach (scrollback fetch + live subscription); unopened tabs never attach
- [ ] Daemon integration tests cover: config surviving a Daemon process restart, status query without attach, attach only upon explicit request
- [ ] UI tests cover: app-open state showing statuses without live connections, attach happening only on tab click
