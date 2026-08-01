use std::collections::HashMap;
use std::path::Path;

use serde::{Deserialize, Serialize};

use crate::project::Project;
use crate::terminal::TerminalConfig;

/// The on-disk shape of a Project — deliberately separate from `Project`
/// itself so the wire/disk format doesn't couple to internal structure.
#[derive(Debug, Serialize, Deserialize)]
struct PersistedProject {
    id: String,
    name: String,
}

/// The on-disk shape of a Terminal's config (not its live process state,
/// which is never persisted — see ADR-0001 and CONTEXT.md).
#[derive(Debug, Serialize, Deserialize)]
struct PersistedTerminal {
    id: String,
    project_id: String,
    cwd: String,
    name: Option<String>,
    startup_command: Option<String>,
    #[serde(default)]
    env_vars: HashMap<String, String>,
    #[serde(default)]
    shell: Option<String>,
    scrollback_lines: usize,
}

#[derive(Debug, Default, Serialize, Deserialize)]
struct PersistedState {
    #[serde(default)]
    projects: Vec<PersistedProject>,
    #[serde(default)]
    terminals: Vec<PersistedTerminal>,
}

/// Loads Projects and Terminal configs from `path`. Missing file or
/// unparsable content both fall back to an empty state (logged, not fatal)
/// rather than refusing to start the Daemon.
pub fn load(path: &Path) -> (Vec<Project>, Vec<(String, TerminalConfig)>) {
    let bytes = match std::fs::read(path) {
        Ok(bytes) => bytes,
        Err(_) => return (Vec::new(), Vec::new()),
    };
    let state: PersistedState = match serde_json::from_slice(&bytes) {
        Ok(state) => state,
        Err(err) => {
            eprintln!("httyml-daemon: failed to parse {path:?}, starting empty: {err:#}");
            return (Vec::new(), Vec::new());
        }
    };

    let projects = state
        .projects
        .into_iter()
        .map(|p| Project {
            id: p.id,
            name: p.name,
        })
        .collect();
    let terminals = state
        .terminals
        .into_iter()
        .map(|t| {
            (
                t.id,
                TerminalConfig {
                    project_id: t.project_id,
                    cwd: t.cwd,
                    name: t.name,
                    startup_command: t.startup_command,
                    env_vars: t.env_vars,
                    shell: t.shell,
                    scrollback_lines: t.scrollback_lines,
                },
            )
        })
        .collect();
    (projects, terminals)
}

/// Writes Projects and Terminal configs to `path`, atomically (write to a
/// sibling temp file, then rename) so a crash mid-write can't leave a
/// half-written, unparsable file behind.
pub fn save(
    path: &Path,
    projects: &[Project],
    terminals: &[(String, TerminalConfig)],
) -> anyhow::Result<()> {
    let state = PersistedState {
        projects: projects
            .iter()
            .map(|p| PersistedProject {
                id: p.id.clone(),
                name: p.name.clone(),
            })
            .collect(),
        terminals: terminals
            .iter()
            .map(|(id, cfg)| PersistedTerminal {
                id: id.clone(),
                project_id: cfg.project_id.clone(),
                cwd: cfg.cwd.clone(),
                name: cfg.name.clone(),
                startup_command: cfg.startup_command.clone(),
                env_vars: cfg.env_vars.clone(),
                shell: cfg.shell.clone(),
                scrollback_lines: cfg.scrollback_lines,
            })
            .collect(),
    };

    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    let tmp_path = path.with_extension("json.tmp");
    std::fs::write(&tmp_path, serde_json::to_vec_pretty(&state)?)?;
    std::fs::rename(&tmp_path, path)?;
    Ok(())
}
