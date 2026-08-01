# 06 — Delete Terminal and Project

**What to build:** Deleting a Terminal or Project is an explicit action distinct from stopping — it permanently removes configuration and state, unlike `parado`/`encerrado` which retain it.

**Blocked by:** 02 — Stop and restart Terminal, 04 — Projects and tabs

**Status:** ready-for-agent

- [x] User can delete a Terminal as an action distinct from stopping it; deletion removes its configuration and state permanently — it no longer appears and cannot be restarted
- [x] User can delete a Project; deletion removes it and cascades to its Terminals
- [x] Daemon integration tests cover: delete Terminal (config gone, not merely stopped), delete Project (cascades to its Terminals)
- [ ] UI tests cover: delete action visibly separate from stop, deleted items disappear from the sidebar/tab bar — **deliberately skipped**: user asked to skip new frontend tests this ticket and verify manually instead

## Comments

Implemented in commit (see git log). Delete is a genuinely separate code path from Stop end to end: distinct protocol messages (`DeleteTerminal`/`DeleteProject` vs `Stop`), distinct daemon handlers (Stop never touches the registry map; only Delete removes the entry), and distinct danger-styled "×" buttons in the UI (not reusing the Stop button/handler).

Code review found and fixed two real issues before commit:
1. **Duplicated cascade logic + redundant locking** in `connection.rs`: `DeleteProject` was re-locking `registry.terminals` once per Terminal via `lookup()` after already scanning the whole map to collect ids. Extracted a shared `stop_and_forget` helper that both `DeleteTerminal` and the cascade loop use, working directly off the `Arc<TerminalHandle>` clones collected in one pass.
2. **A real resource leak in the Tauri layer** (not the daemon): deleting an attached Terminal never cleaned up its entry in `AttachedTerminals` — the reader/writer background tasks and the open socket connection would idle forever referencing a terminal_id that no longer exists, for as long as the app ran. Fixed by tracking each attached connection's reader-task `AbortHandle` alongside its sender, and having `delete_terminal`/`delete_project` tear both down (`delete_project` first fetches the project's terminal ids via `ListTerminals` so it can forget each one after the cascade completes).

Also strengthened the daemon tests per review: the delete-terminal test now explicitly sends `Restart` on the deleted id and confirms it has no effect (not just that Attach fails once), and the cascade test now includes a Terminal in a separate, untouched Project and confirms it survives.
