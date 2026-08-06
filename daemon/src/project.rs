/// A Project: a name grouping Terminals together, plus presentation-only
/// metadata (colour, icon, description) and an optional `default_cwd`.
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
        }
    }
}
