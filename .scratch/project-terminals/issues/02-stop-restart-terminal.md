# 02 — Stop and restart Terminal

**What to build:** User can manually stop a running Terminal, which kills its process and preserves its configuration in a distinct `parado` state. User can restart a `parado` Terminal, spawning a fresh process with the same stored configuration.

**Blocked by:** 01 — Daemon, protocol, basic Terminal

**Status:** ready-for-agent

- [ ] User can stop a `rodando` Terminal; its process is killed and its state becomes `parado`
- [ ] A `parado` Terminal's configuration (name, cwd, startup command, env vars, shell) is retained, not deleted
- [ ] User can restart a `parado` Terminal; a new process spawns using the stored configuration and state returns to `rodando`
- [ ] Daemon integration tests cover: stop transition (process killed, state `parado`), config retained after stop, restart from `parado` (new process, same config)
- [ ] UI tests cover: stop action available on a `rodando` Terminal, restart action available on a `parado` Terminal, distinct visual indicator for `parado` state
