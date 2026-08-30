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

- [x] 1. Fix TERM environment variable for all shells (currently only bash) `export TERM=xterm-256color`
- [x] 2. Fix whiptail size not matching Terminal size (currently only bash)
- [ ] 3. Terminal resize / font size / wheel zoom
- [ ] 4. Daemon auto-restart / health check with app-side reconnect banner
- [x] 5. Global keyboard shortcuts for Terminal switching
- [x] 6. Export/import Project + Terminal configs as JSON
- [ ] 7. Themeable terminal color schemes
- [ ] 8. Automated build release for Linux (Tauri)
- [ ] 9. Project templates (predefined Terminal set with cwd/startup command)
- [ ] 10. Per-Terminal notifications on process exit or pattern match (e.g. "Build failed")
- [ ] 11. Layout presets — split panes, grid view for multiple Terminals at once
- [ ] 12. Remote Daemon support (opt-in, currently local-only by design — see ADR-0005)
- [ ] 13. Terminal search / fuzzy jump across all Projects
- [ ] 14. Session recording + replay of Terminal output
