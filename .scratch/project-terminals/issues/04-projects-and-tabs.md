# 04 — Projects and tabs

**What to build:** User can create a Project (name only) and see all Projects in a fixed sidebar. Selecting a Project shows only its Terminals as tabs in the main area. Multiple Terminals can exist within one Project, each with an independent working directory.

**Blocked by:** 01 — Daemon, protocol, basic Terminal

**Status:** ready-for-agent

- [ ] User can create a Project by providing only a name
- [ ] All Projects are listed in a fixed sidebar
- [ ] Selecting a Project in the sidebar shows only that Project's Terminals as tabs in the main area
- [ ] Multiple Terminals can exist within a single Project, each independently configured (different cwd)
- [ ] Creating a Terminal happens in the context of the currently selected Project
- [ ] Daemon integration tests cover: create Project, list Projects, list Terminals scoped to a Project
- [ ] UI tests cover: sidebar rendering and Project switching, tab bar showing only the selected Project's Terminals
