# Project & Terminal Manager

Status: ready-for-agent

## Problem Statement

I develop several applications at once, each needing multiple long-running Linux shell sessions (dev servers, watchers, editors, ad-hoc commands). Plain terminal windows don't survive being closed, don't group related sessions together, and give no quick way to tell "still running" from "crashed" without staring at scrollback.

## Solution

A desktop app (this repo, Tauri) that groups Terminals under named Projects. Each Terminal is a real, interactive shell session whose process is owned by a background Daemon — so it keeps running even if the app window is closed. Reopening the app shows every Project and Terminal with its last-known status, and only reconnects to a Terminal's live output when you actually open its tab.

## User Stories

1. As a developer, I want to create a Project by giving it just a name, so that I can group related Terminals without needing a fixed directory.
2. As a developer, I want to see all my Projects listed in a fixed sidebar, so that I can switch between them at a glance.
3. As a developer, I want to select a Project in the sidebar, so that the main area shows only that Project's Terminals as tabs.
4. As a developer, I want to create a new Terminal quickly by picking a working directory, so that I can start working immediately without filling out a full form.
5. As a developer, I want a newly created Terminal to default to the last directory I selected, so that repeated terminal creation is fast.
6. As a developer, I want the name and startup command fields to be optional when creating a Terminal, so that quick creation isn't blocked by unnecessary input.
7. As a developer, I want a newly created Terminal to start running immediately, so that I don't need an extra step to begin using it.
8. As a developer, I want to optionally name a Terminal, so that I can identify its purpose in the tab bar.
9. As a developer, I want to optionally configure a startup command for a Terminal, so that repetitive commands (e.g. `npm run dev`) run automatically each time it starts.
10. As a developer, I want to optionally configure environment variables for a Terminal, so that I can isolate different runtime configurations (e.g. `NODE_ENV=test`) per Terminal.
11. As a developer, I want to choose which shell a Terminal uses (bash/zsh/fish), so that I can match my preferred environment per Terminal.
12. As a developer, I want each Terminal's working directory to be independent of the others in its Project, so that a Project can group unrelated directories.
13. As a developer, I want to interact with a Terminal exactly like a real shell (arrow keys, control sequences, colors), so that it feels like a native terminal emulator.
14. As a developer, I want a Terminal's process to keep running when I close the app, so that long-lived processes (dev servers, watchers) aren't interrupted.
15. As a developer, I want the app to start the background Daemon automatically if it isn't already running, so that I never manage a background service by hand.
16. As a developer, I want reopening the app to show every Project and Terminal with its last known status, without auto-reconnecting to all of them, so that the app opens quickly regardless of how many Terminals are alive.
17. As a developer, I want clicking a Terminal's tab to connect at that moment and show buffered scrollback plus live output, so that I only pay the reconnect cost for Terminals I actually look at.
18. As a developer, I want to manually stop a Terminal, so that I can free resources for processes I no longer need running.
19. As a developer, I want a stopped Terminal to keep its configuration (name, cwd, startup command, env vars, shell), so that I can restart it later with identical settings.
20. As a developer, I want to explicitly delete a Terminal, separate from stopping it, so that removing it from a Project is a deliberate action distinct from merely stopping its process.
21. As a developer, I want to see when a Terminal's process exited on its own versus being stopped by me, so that I can tell a crash apart from an intentional stop.
22. As a developer, I want to see the exit code on a Terminal that exited on its own, so that I can gauge whether something went wrong without digging further.
23. As a developer, I want the scrollback of a Terminal that exited on its own to remain visible, so that I can read the error that caused it to exit.
24. As a developer, I want each Terminal to retain up to 10,000 lines of scrollback by default, so that I have reasonable history without unbounded memory growth.
25. As a developer, I want to override the scrollback line limit per Terminal, so that I can keep more history for a particularly verbose or important one.
26. As a developer, I want Project and Terminal configuration stored in a local JSON file, so that I can inspect or hand-edit it if needed.
27. As a developer, I want the app and Daemon to communicate only over a local Unix domain socket, so that no other machine on the network can access or interfere with my Terminals.
28. As a developer, I want all Terminals to run strictly on my local machine (no remote/SSH), so the tool stays simple with no network/auth handling.
29. As a developer, I want the Daemon bundled inside the app itself, so that setting up the tool is a single install with no separate step.
30. As a developer, I want resizing a Terminal's visible area to resize the underlying PTY, so that programs that respond to terminal size (like `vim` or progress bars) render correctly.
31. As a developer, I want the app's visual style to follow the project's neobrutalism design system, so it's visually consistent with the rest of the product's UI conventions.

## Implementation Decisions

- Two independent processes: the Tauri app (React frontend + thin Rust glue) and a separate Daemon (Rust) that owns all Terminal PTYs and all Project/Terminal state. See ADR-0001.
- Daemon is compiled and bundled as a Tauri sidecar binary; the app checks whether it's reachable over the socket and spawns it on demand if not. No systemd/boot-time service. See ADR-0006.
- Daemon implements its own PTY multiplexer (`portable-pty` or equivalent) rather than shelling out to tmux/screen. See ADR-0002.
- App↔Daemon transport is a Unix domain socket; messages are length-prefixed JSON. See ADR-0003.
- Message/operation surface the Daemon needs to support: create Project, list Projects, delete Project; create Terminal (cwd required, name/startup-command/env-vars/shell/scrollback-limit optional with sane defaults), list Terminals for a Project, attach to a Terminal (returns buffered scrollback, then subscribes to live output), write input to a Terminal, resize a Terminal (rows/cols), stop a Terminal, restart a Terminal (from `parado` or `encerrado`, using stored config), delete a Terminal.
- Terminal state machine: `rodando` → `parado` (user-initiated stop, config retained) or `encerrado` (process exited on its own; records exit code and is distinguished from `parado` in both data and UI). Both `parado` and `encerrado` can transition back to `rodando` via restart. `deleted` is reachable only via the explicit delete action and is terminal.
- Project = name only (see ADR-0004). No fixed directory at the Project level; each Terminal owns its own cwd independently.
- Persistence split: Project/Terminal *configuration* (name, cwd, startup command, env vars, shell, scrollback limit) persists to a single local JSON file, written by the Daemon on every mutation. Live process state (current status, exit code, scrollback buffer contents) lives only in Daemon memory — not persisted, lost if the Daemon itself restarts.
- Scrollback is a bounded ring buffer per Terminal, default 10,000 lines, overridable per Terminal.
- Frontend renders one xterm.js instance per open Terminal tab; keystrokes forward to the Daemon through the app's Rust glue layer, output chunks stream back into the matching xterm.js instance.
- On app open: populate sidebar Projects and each Project's Terminal tabs with last-known status only — no socket attach, no scrollback fetch, no live subscription until the user actually clicks a Terminal's tab.
- Quick-create flow: only cwd is required (defaults to the last directory used in that context); name and startup command left blank if not supplied. The created Terminal starts immediately (goes straight to `rodando`).
- Stop and delete are distinct Daemon operations — stop flips state and kills the process only; delete removes the Terminal's config and state permanently.
- No remote/SSH Terminal type in this iteration (ADR-0005). Keep the Terminal schema shaped so a "remote" variant could be added later without a redesign, but do no work toward it now.
- All new UI (Project sidebar, Terminal tab bar, creation forms, status indicators) follows the repo's neobrutalism design system, with `rodando`/`parado`/`encerrado` visually distinguished (e.g. color-coded).

## Testing Decisions

- Test external behavior only — protocol-observable outcomes for the Daemon, user-visible rendering/interaction for the UI. Not internal struct fields, not internal component state.
- **Daemon seam** (highest seam for the backend): integration tests spin up a real Daemon instance bound to a temporary Unix socket path per test (no shared/global socket across tests), send real length-prefixed JSON requests, and assert on real responses. Use real short-lived shell commands (e.g. `sh -c '...; exit N'`) as the underlying process rather than mocking the PTY layer, so `encerrado` transitions and exit codes are exercised for real.
  - Cover at minimum: quick-create (cwd only, immediate `rodando`), full rich-config create, attach returning buffered scrollback then live output, write input, resize, stop (→ `parado`, config retained), restart from `parado`, process exits on its own (→ `encerrado` with correct exit code, scrollback preserved), delete (config gone, not just stopped), scrollback ring-buffer eviction at the configured line limit, per-Terminal scrollback limit override, and on-demand daemon-startup detection from the app side.
- **UI seam**: component tests (React Testing Library) mocking only the socket/invoke client boundary — never the Daemon's internal logic, which is already covered by the Daemon seam.
  - Cover at minimum: Project sidebar list and switching, Terminal tab bar with distinct status indicators (including exit code display for `encerrado`), quick-create form (optional fields, last-directory default), rich-config form, stop vs. delete as visibly separate actions, and attach-on-click-only behavior (no eager attach for tabs not yet opened).
- No prior art exists in this repo yet (fresh scaffold, no tests present) — this spec establishes the initial testing conventions: Rust integration tests for the Daemon, React Testing Library (+ Vitest) for the frontend. Later features should follow the same two seams rather than inventing new ones.

## Out of Scope

- Remote/SSH terminals (ADR-0005).
- systemd/boot-time Daemon startup — on-demand only.
- Split-pane or grid Terminal layouts — tabs only, for now.
- Auto-reconnect/eager-attach of all Terminals when the app opens.
- Multi-user or networked (TCP) access to the Daemon.
- tmux/screen integration or interop.
- SQLite or any database-backed storage for configuration.
- Search within terminal output, copy/paste enhancements, custom keyboard shortcuts.
- Project-level directory, color, or tag metadata beyond a name.

## Further Notes

- Bundling the Daemon as a sidecar requires a Tauri external-binaries/sidecar configuration entry — a build-config concern to handle during implementation, not specified further here.
- Exact on-disk paths for the JSON config file and the Unix socket (e.g. under XDG state/config directories) are left to the implementing agent, following standard Linux XDG conventions.
