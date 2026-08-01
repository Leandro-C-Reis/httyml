# 02 — Stop and restart Terminal

**What to build:** User can manually stop a running Terminal, which kills its process and preserves its configuration in a distinct `parado` state. User can restart a `parado` Terminal, spawning a fresh process with the same stored configuration.

**Blocked by:** 01 — Daemon, protocol, basic Terminal

**Status:** ready-for-agent

- [x] User can stop a `rodando` Terminal; its process is killed and its state becomes `parado`
- [x] A `parado` Terminal's configuration (name, cwd, startup command, env vars, shell) is retained, not deleted
- [x] User can restart a `parado` Terminal; a new process spawns using the stored configuration and state returns to `rodando`
- [x] Daemon integration tests cover: stop transition (process killed, state `parado`), config retained after stop, restart from `parado` (new process, same config)
- [x] UI tests cover: stop action available on a `rodando` Terminal, restart action available on a `parado` Terminal, distinct visual indicator for `parado` state

## Comments

Implemented in commit (see git log). Notes:

- `env vars`/`shell` aren't retained because they don't exist as a concept yet — ticket 01 never captured them (only `name`/`cwd`/`startup_command` are real fields today). Ticket 05 introduces them; retention will fall out for free since config lives on `TerminalHandle` for its whole lifetime regardless of field count.
- Config retention is tested two ways: the restart test proves `startup_command` reuse, and a dedicated `config_survives_stop_independently_of_restart_reuse` test proves `cwd` reuse independently (via `pwd` matching a distinct temp directory across a stop→restart cycle).
- Code-reviewed before commit; fixed a real TOCTOU race in `restart()` (two concurrent restarts could both pass the "not already running" check and orphan a process) by serializing stop/restart under a dedicated lock, added error logging for the now-recoverable "terminal not running" write/resize case (previously these errors would have silently killed the whole client connection), and gave Stop/Restart buttons distinct danger/success coloring instead of both using the default accent.
