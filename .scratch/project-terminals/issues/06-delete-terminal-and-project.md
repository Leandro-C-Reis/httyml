# 06 — Delete Terminal and Project

**What to build:** Deleting a Terminal or Project is an explicit action distinct from stopping — it permanently removes configuration and state, unlike `parado`/`encerrado` which retain it.

**Blocked by:** 02 — Stop and restart Terminal, 04 — Projects and tabs

**Status:** ready-for-agent

- [ ] User can delete a Terminal as an action distinct from stopping it; deletion removes its configuration and state permanently — it no longer appears and cannot be restarted
- [ ] User can delete a Project; deletion removes it and cascades to its Terminals
- [ ] Daemon integration tests cover: delete Terminal (config gone, not merely stopped), delete Project (cascades to its Terminals)
- [ ] UI tests cover: delete action visibly separate from stop, deleted items disappear from the sidebar/tab bar
