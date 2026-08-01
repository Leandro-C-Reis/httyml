# Daemon ships as a bundled Tauri sidecar, started on-demand

The Daemon is not a separately installed binary (`cargo install`, system package) — it's compiled and bundled inside the Tauri app as a sidecar, which the app spawns itself the first time it's needed and leaves running across app restarts. This only works because the app always knows where the Daemon binary is and how to launch it; a separately installed Daemon would push setup friction onto the user for no benefit in a single-user desktop app.
