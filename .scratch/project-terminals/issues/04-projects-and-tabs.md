# 04 — Projects and tabs

**What to build:** User can create a Project (name only) and see all Projects in a fixed sidebar. Selecting a Project shows only its Terminals as tabs in the main area. Multiple Terminals can exist within one Project, each with an independent working directory.

**Blocked by:** 01 — Daemon, protocol, basic Terminal

**Status:** ready-for-agent

- [x] User can create a Project by providing only a name
- [x] All Projects are listed in a fixed sidebar
- [x] Selecting a Project in the sidebar shows only that Project's Terminals as tabs in the main area
- [x] Multiple Terminals can exist within a single Project, each independently configured (different cwd)
- [x] Creating a Terminal happens in the context of the currently selected Project
- [x] Daemon integration tests cover: create Project, list Projects, list Terminals scoped to a Project
- [ ] UI tests cover: sidebar rendering and Project switching, tab bar showing only the selected Project's Terminals — **deliberately skipped**: user asked to skip new frontend tests this ticket and verify manually instead

## Comments

Implemented in commit (see git log). `Registry` now holds both `projects` and `terminals` maps; `TerminalHandle` gained a `project_id` field. `TerminalHandle::spawn`'s growing parameter list was consolidated into a `TerminalConfig` struct (ticket 05 will extend it with env vars/shell/scrollback-override rather than adding more positional args).

Code review caught a real race: switching Projects set `selectedProjectId` synchronously but awaited `listTerminals` before updating the tab list, so a slow response for a Project the user had already switched away from could overwrite the newer selection with stale tabs — worse under fast switching, where responses could arrive out of order. Fixed with a request-sequencing ref (`latestProjectRequest`) that discards a `listTerminals` response if a newer Project selection has superseded it, plus clearing the tab list immediately on selection so no mismatched Project/tab state is ever rendered.
