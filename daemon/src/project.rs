/// A Project: just a name grouping Terminals together. No fixed directory —
/// each Terminal owns its own cwd independently (see ADR-0004).
pub struct Project {
    pub id: String,
    pub name: String,
}
