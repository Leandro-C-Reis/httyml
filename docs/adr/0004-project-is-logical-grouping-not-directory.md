# Project is a logical grouping, not a filesystem directory

Unlike most dev-tooling conventions (where "project" implies a repo root), a Project here is just a named group of Terminals — it has no fixed root directory. Each Terminal independently sets its own cwd. This was a deliberate choice against the obvious path, so a future reader shouldn't assume Projects can answer "what directory is this?" without looking at individual Terminals.
