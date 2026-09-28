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

## Linux releases

GitHub Actions builds AppImage, DEB, and RPM packages for x86_64 and ARM64 on a
stable `vMAJOR.MINOR.PATCH` tag. The workflow checks the app version in
`package.json`, `package-lock.json`, `src-tauri/tauri.conf.json`, and
`src-tauri/Cargo.toml`; all four must match the tag without its `v` prefix.
It creates a draft release while both architectures build, verifies the six
signed packages and updater entries, and only then publishes the release.

To prepare a release, update those four app versions together (for npm, use
`npm version X.Y.Z --no-git-tag-version` to update the lockfile), run the tests,
commit the changes on `master`, and push a matching `vX.Y.Z` tag. The daemon's
version in `daemon/Cargo.toml` is independent: bump it when its code or wire
protocol changes. The release check rejects daemon changes without a version
bump. An app-only release can therefore keep a running daemon and its Terminal
processes alive after the app restarts.

The updater checks the public GitHub Release manifest when the desktop app
starts. Users choose whether to install and whether to restart now or later.
If the bundled daemon version changed, the first app startup after restarting
replaces the old daemon and ends running Terminal processes. AppImage updates
replace the portable image; DEB and RPM updates may request system privileges.

Update bundles are signed with Tauri's updater key. The public key is in the
Tauri config; GitHub Actions uses the `TAURI_SIGNING_PRIVATE_KEY` and
`TAURI_SIGNING_PRIVATE_KEY_PASSWORD` repository secrets. Keep a secure backup
of the private key and password: existing installs cannot trust updates signed
with a replacement key. See the [Tauri updater guide](https://v2.tauri.app/plugin/updater/).

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
- [x] 8. Automated build release for Linux (Tauri)
- [ ] 9. Project templates (predefined Terminal set with cwd/startup command)
- [ ] 10. Per-Terminal notifications on process exit or pattern match (e.g. "Build failed")
- [ ] 11. Layout presets — split panes, grid view for multiple Terminals at once
- [ ] 12. Remote Daemon support (opt-in, currently local-only by design — see ADR-0005)
- [ ] 13. Terminal search / fuzzy jump across all Projects
- [ ] 14. Session recording + replay of Terminal output
