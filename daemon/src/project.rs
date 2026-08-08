use serde::{Deserialize, Serialize};

/// One optional command-line argument of a `ProjectScript`. The Daemon
/// never builds the command line itself — the app substitutes these into
/// `ProjectScript::command` and writes the result to a Terminal — so these
/// are plain data here.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScriptArg {
    /// Placeholder name as it appears in the command (`{name}`).
    pub name: String,
    /// What the app shows next to the input.
    pub label: String,
    /// Prepended to the value when it's filled in (e.g. `--exclude`).
    /// `None`/empty substitutes the bare value.
    #[serde(default)]
    pub flag: Option<String>,
    /// Prefills the input; empty means the argument starts blank and, left
    /// blank, drops out of the command entirely.
    #[serde(default)]
    pub default_value: String,
}

/// A saved bash script belonging to a Project, runnable in any of its
/// Terminals. `command` may contain `{arg-name}` placeholders filled in
/// from `args` at run time.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectScript {
    pub id: String,
    pub name: String,
    pub command: String,
    #[serde(default)]
    pub args: Vec<ScriptArg>,
}

/// A Project: a name grouping Terminals together, plus presentation-only
/// metadata (colour, icon, description), an optional `default_cwd`, and the
/// scripts saved for it.
///
/// `default_cwd` is *not* a project root: it only prefills the cwd field
/// when creating a Terminal, and each Terminal still owns its own cwd
/// independently afterwards (see ADR-0004).
#[derive(Debug, Clone)]
pub struct Project {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    /// Free-form colour token chosen by the app (e.g. `"primary"`); the
    /// Daemon never interprets it.
    pub color: Option<String>,
    /// Free-form icon key chosen by the app; likewise uninterpreted here.
    pub icon: Option<String>,
    /// Empty means "no default" — the app falls back to its own behaviour.
    pub default_cwd: String,
    /// Saved scripts, in the order the app shows them.
    pub scripts: Vec<ProjectScript>,
}

impl Project {
    /// A Project with only a name — every other field is metadata the user
    /// fills in later via the edit page.
    pub fn new(id: String, name: String) -> Self {
        Project {
            id,
            name,
            description: None,
            color: None,
            icon: None,
            default_cwd: String::new(),
            scripts: Vec::new(),
        }
    }
}
