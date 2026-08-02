# httyml

Desktop app (Tauri + React + TypeScript) for managing dev projects, where each Project groups a set of persistent Linux Terminals used to run dev commands.

## Architecture

- **App** — Tauri/React frontend, client only. Connects/disconnects to Daemon via socket, never persists state itself.
- **Daemon** — separate process, bundled as a Tauri sidecar. Owns and keeps PTYs alive even with app closed. Starts on-demand.
- **Terminal** — interactive shell session (PTY) managed by Daemon: name (optional), cwd, startup command (optional), env vars, shell, scrollback size. Always local, never SSH.
- **Project** — logical grouping of Terminals, identified by name only. No fixed root directory.

See [CONTEXT.md](CONTEXT.md) for domain vocabulary and [docs/adr/](docs/adr/) for design decisions.

## Terminal states

`running` (active process), `stopped` (user-stopped, config preserved), `exited` (process died on its own, exit code kept).

## Dev setup

```bash
npm install
npm run dev      # builds daemon sidecar, then starts Vite + Tauri dev
npm test         # vitest
```

Daemon lives in [daemon/](daemon/) (Rust), built via `scripts/build-daemon-sidecar.sh`.

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

## Roadmap

- [ ] Terminal search / fuzzy jump across all Projects
- [ ] Session recording + replay of Terminal output
- [ ] Per-Terminal notifications on process exit or pattern match (e.g. "Build failed")
- [ ] Layout presets — split panes, grid view for multiple Terminals at once
- [ ] Project templates (predefined Terminal set with cwd/startup command)
- [ ] Export/import Project + Terminal configs as JSON
- [ ] Global keyboard shortcuts for Terminal switching
- [ ] Daemon auto-restart / health check with app-side reconnect banner
- [ ] Remote Daemon support (opt-in, currently local-only by design — see ADR-0005)
- [ ] Themeable terminal color schemes
