# 03 — Terminal exits on its own ("encerrado")

**What to build:** When a Terminal's underlying process exits by itself (not via user-initiated stop), it transitions to a distinct `encerrado` state that records the exit code, keeps scrollback visible, and can be restarted the same way as a `parado` Terminal.

**Blocked by:** 02 — Stop and restart Terminal

**Status:** ready-for-agent

- [x] A Terminal whose process exits on its own transitions to `encerrado`, distinct from `parado`
- [x] The `encerrado` state records the process's exit code
- [x] Scrollback up to the point of exit remains attachable/visible after the process has exited
- [x] User can restart an `encerrado` Terminal using its stored configuration, same as restarting a `parado` one
- [x] Daemon integration tests cover: a real short-lived command exiting with a specific code, transitioning the Terminal to `encerrado` with the correct exit code, scrollback still attachable after exit, restart from `encerrado`
- [x] UI tests cover: distinct visual indicator for `encerrado` vs `parado`, including exit code display

## Comments

Implemented in commit (see git log). `encerrado` is a real enum variant (`Encerrado { exit_code: i32 }`), not cosmetic — carries data `parado` doesn't. CONTEXT.md's "Estado do Terminal" entry was trimmed from "guarda exit code e motivo" to "guarda o exit code" — only the exit code is actually captured (a signal-killed process's "motivo" isn't distinguished from a normal exit; out of scope here).

Distinguishing "died on its own" from "someone called stop()" needed a `LiveProcess` generation tag: the reader thread that notices a process died only acts if the currently-installed process is still *its own* generation. Without it, a restart racing in during the async gap between `stop()` returning and its old reader thread noticing EOF could let that stale thread seize the *new* process and hang all future stop/restart on that terminal.

Code review caught two real bugs, both fixed and covered by regression tests before commit:
1. The generation-mismatch race above (`rapid_stop_restart_cycles_never_corrupt_a_later_process`).
2. A more serious one found while writing that regression test: the Attach forwarding loop in `connection.rs` treated a lagged `broadcast::Receiver` (falling behind the channel's ring-buffer capacity — easy to trigger with rapid state changes) identically to a permanently closed one, silently killing *all* future output and state forwarding for that attach. Fixed to only stop on `Closed`, continue past `Lagged`.
