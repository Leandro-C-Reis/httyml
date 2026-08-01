# 05 — Rich Terminal configuration

**What to build:** Extend Terminal creation beyond quick-create with optional name, startup command, environment variables, shell choice, and a per-Terminal scrollback line limit override.

**Blocked by:** 04 — Projects and tabs

**Status:** ready-for-agent

- [x] Terminal creation form supports optional name, startup command, environment variables, shell choice (bash/zsh/fish), and scrollback line limit override — all optional, quick-create still available/default
- [x] A configured startup command runs automatically when the Terminal starts
- [x] Configured environment variables are present in the Terminal's shell environment
- [x] The selected shell is used to spawn the Terminal's process
- [x] A configured scrollback limit overrides the 10,000-line default for that Terminal, verified by eviction behavior at the custom limit
- [x] Daemon integration tests cover: creating a Terminal with each optional field set, startup command executing, env vars present in the shell, custom scrollback limit eviction
- [ ] UI tests cover: the rich-config form fields, submission with partial and full optional fields — **deliberately skipped**: user asked to skip new frontend tests this ticket and verify manually instead (existing QuickCreateForm/App tests updated only enough to keep passing)

## Comments

Implemented in commit (see git log). `TerminalConfig`/`TerminalHandle` gained `env_vars`/`shell` fields (stored like `cwd`/`startup_command`, so restart reuses them the same way). Advanced fields (shell select, env-vars textarea, scrollback override) live in a collapsed `<details>` block in `QuickCreateForm` so quick-create stays the fast default path.

Code review found no correctness bugs — env vars, shell selection, scrollback override, and restart-preservation all verified sound (traced through `portable-pty`'s `CommandBuilder` source). Applied two defensive polish fixes: an empty-string `shell` now falls back to the default instead of reaching `CommandBuilder` unchecked (new test: `empty_shell_string_falls_back_to_the_default_shell`), and added missing doc comments clarifying `shell`'s format contract (bare PATH-resolved name vs. absolute path) in both `terminal.rs` and `protocol.rs`. Declined one suggested refactor (collapsing `create_terminal`'s 7 Tauri command params into a struct) — real IPC behavior here can't be verified end-to-end in this environment, and the risk of silently breaking a working path outweighed the quality-only benefit; left the `#[allow(clippy::too_many_arguments)]` as an honest marker instead.
