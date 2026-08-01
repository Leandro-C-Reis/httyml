# 05 — Rich Terminal configuration

**What to build:** Extend Terminal creation beyond quick-create with optional name, startup command, environment variables, shell choice, and a per-Terminal scrollback line limit override.

**Blocked by:** 04 — Projects and tabs

**Status:** ready-for-agent

- [ ] Terminal creation form supports optional name, startup command, environment variables, shell choice (bash/zsh/fish), and scrollback line limit override — all optional, quick-create still available/default
- [ ] A configured startup command runs automatically when the Terminal starts
- [ ] Configured environment variables are present in the Terminal's shell environment
- [ ] The selected shell is used to spawn the Terminal's process
- [ ] A configured scrollback limit overrides the 10,000-line default for that Terminal, verified by eviction behavior at the custom limit
- [ ] Daemon integration tests cover: creating a Terminal with each optional field set, startup command executing, env vars present in the shell, custom scrollback limit eviction
- [ ] UI tests cover: the rich-config form fields, submission with partial and full optional fields
