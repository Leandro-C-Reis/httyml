# 03 — Terminal exits on its own ("encerrado")

**What to build:** When a Terminal's underlying process exits by itself (not via user-initiated stop), it transitions to a distinct `encerrado` state that records the exit code, keeps scrollback visible, and can be restarted the same way as a `parado` Terminal.

**Blocked by:** 02 — Stop and restart Terminal

**Status:** ready-for-agent

- [ ] A Terminal whose process exits on its own transitions to `encerrado`, distinct from `parado`
- [ ] The `encerrado` state records the process's exit code
- [ ] Scrollback up to the point of exit remains attachable/visible after the process has exited
- [ ] User can restart an `encerrado` Terminal using its stored configuration, same as restarting a `parado` one
- [ ] Daemon integration tests cover: a real short-lived command exiting with a specific code, transitioning the Terminal to `encerrado` with the correct exit code, scrollback still attachable after exit, restart from `encerrado`
- [ ] UI tests cover: distinct visual indicator for `encerrado` vs `parado`, including exit code display
