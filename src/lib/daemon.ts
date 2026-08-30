import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

export type TerminalState = "Running" | "Stopped" | { Exited: { exit_code: number } };

/// One optional argument of a saved script. `flag` (when set) is prepended
/// to the value; a blank value drops the argument from the command line
/// entirely — see `buildScriptCommand`.
export type ScriptArg = {
  name: string;
  label: string;
  flag: string | null;
  default_value: string;
};

export type ProjectScript = {
  id: string;
  name: string;
  /// May contain `{arg-name}` placeholders filled in from `args`.
  command: string;
  args: ScriptArg[];
};

export type ProjectInfo = {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  /// Prefills the cwd of a newly created Terminal; empty means no default.
  default_cwd: string;
  scripts: ProjectScript[];
};

export type UpdateProjectOptions = {
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  defaultCwd: string;
};
// Field names below match the daemon's actual JSON wire format (Rust struct
// fields, snake_case — Tauri only camel<->snake-converts `#[tauri::command]`
// arguments, never arbitrary serde struct fields; see `exit_code` above for
// the same reason `TerminalState` isn't camelCased either).
export type TerminalInfo = {
  id: string;
  name: string | null;
  cwd: string;
  startup_command: string | null;
  env_vars: Record<string, string>;
  shell: string | null;
  scrollback_lines: number;
  state: TerminalState;
};

export type DaemonMessage =
  | { type: "Created"; terminal_id: string }
  | { type: "Scrollback"; terminal_id: string; data: string }
  | { type: "Output"; terminal_id: string; data: string }
  | { type: "StateChanged"; terminal_id: string; state: TerminalState }
  | { type: "Error"; message: string };

export async function ensureDaemon(): Promise<void> {
  await invoke("ensure_daemon");
}

export async function createProject(name: string): Promise<string> {
  return invoke<string>("create_project", { name });
}

export async function updateProject(
  projectId: string,
  options: UpdateProjectOptions,
): Promise<ProjectInfo> {
  return invoke<ProjectInfo>("update_project", {
    projectId,
    name: options.name,
    description: options.description,
    color: options.color,
    icon: options.icon,
    defaultCwd: options.defaultCwd,
  });
}

export async function setProjectScripts(
  projectId: string,
  scripts: ProjectScript[],
): Promise<ProjectInfo> {
  return invoke<ProjectInfo>("set_project_scripts", { projectId, scripts });
}

/// `[name, command]` pairs from `<cwd>/package.json`. Empty when there's no
/// package.json there, or it has no scripts — never an error.
export async function readPackageScripts(cwd: string): Promise<[string, string][]> {
  return invoke<[string, string][]>("read_package_scripts", { cwd });
}

export async function listProjects(): Promise<ProjectInfo[]> {
  return invoke<ProjectInfo[]>("list_projects");
}

/// Replaces the sidebar's Project order wholesale. Ids the Daemon doesn't
/// know are ignored; any known Project missing from `projectIds` keeps its
/// relative place at the end.
export async function reorderProjects(projectIds: string[]): Promise<ProjectInfo[]> {
  return invoke<ProjectInfo[]>("reorder_projects", { projectIds });
}

/// A Terminal's config plus id, for export/import — everything `TerminalInfo`
/// has except `state`, which the daemon never persists either.
export type TerminalConfigInfo = {
  id: string;
  project_id: string;
  cwd: string;
  name: string | null;
  startup_command: string | null;
  env_vars: Record<string, string>;
  shell: string | null;
  scrollback_lines: number;
};

/// Writes every Project and Terminal, plus `extra` (app-level settings the
/// daemon itself doesn't know about, e.g. the color theme), to `path` as
/// JSON.
export async function exportConfig(
  path: string,
  extra: Record<string, unknown> = {},
): Promise<void> {
  await invoke("export_config", { path, extra });
}

export type ImportConfigResult = {
  projects: ProjectInfo[];
  terminal_count: number;
  extra: Record<string, unknown>;
};

/// Reads `path` and wholesale-replaces every Project and Terminal with what
/// it contains — every Terminal currently running is stopped first, same as
/// deleting a Project cascades to its Terminals. Returns whatever `extra`
/// settings the file carried (see `exportConfig`) for the caller to apply.
export async function importConfig(path: string): Promise<ImportConfigResult> {
  return invoke<ImportConfigResult>("import_config", { path });
}

export async function listTerminals(projectId: string): Promise<TerminalInfo[]> {
  return invoke<TerminalInfo[]>("list_terminals", { projectId });
}

export type CreateTerminalOptions = {
  name?: string;
  startupCommand?: string;
  envVars?: Record<string, string>;
  shell?: string;
  scrollbackLines?: number;
};

export async function createTerminal(
  projectId: string,
  cwd: string,
  options: CreateTerminalOptions = {},
): Promise<string> {
  return invoke<string>("create_terminal", {
    projectId,
    cwd,
    name: options.name || null,
    startupCommand: options.startupCommand || null,
    envVars: options.envVars ?? {},
    shell: options.shell || null,
    scrollbackLines: options.scrollbackLines ?? null,
  });
}

export async function updateTerminal(
  terminalId: string,
  cwd: string,
  options: CreateTerminalOptions = {},
): Promise<void> {
  await invoke("update_terminal", {
    terminalId,
    cwd,
    name: options.name || null,
    startupCommand: options.startupCommand || null,
    envVars: options.envVars ?? {},
    shell: options.shell || null,
    scrollbackLines: options.scrollbackLines ?? null,
  });
}

export async function attachTerminal(terminalId: string): Promise<void> {
  await invoke("attach_terminal", { terminalId });
}

// Tears down the attach connection — call this on unmount, or a later
// attachTerminal() for the same Terminal is a no-op that skips the
// daemon's replayed scrollback (attach is idempotent by terminal_id).
export async function detachTerminal(terminalId: string): Promise<void> {
  await invoke("detach_terminal", { terminalId });
}

export async function writeTerminal(terminalId: string, data: string): Promise<void> {
  await invoke("write_terminal", { terminalId, data });
}

// The Terminal's *live* current directory — reflects `cd`, unlike the
// static `cwd` from TerminalInfo/CreateTerminal. Meant to be polled (see
// TerminalView) rather than cached, since there's no push for this.
export async function getTerminalCwd(terminalId: string): Promise<string> {
  return invoke<string>("get_terminal_cwd", { terminalId });
}

export async function resizeTerminal(
  terminalId: string,
  rows: number,
  cols: number,
): Promise<void> {
  await invoke("resize_terminal", { terminalId, rows, cols });
}

export async function stopTerminal(terminalId: string): Promise<void> {
  await invoke("stop_terminal", { terminalId });
}

export async function restartTerminal(terminalId: string): Promise<void> {
  await invoke("restart_terminal", { terminalId });
}

export async function deleteTerminal(terminalId: string): Promise<void> {
  await invoke("delete_terminal", { terminalId });
}

export async function deleteProject(projectId: string): Promise<void> {
  await invoke("delete_project", { projectId });
}

export function onTerminalOutput(
  terminalId: string,
  callback: (msg: DaemonMessage) => void,
): Promise<UnlistenFn> {
  return listen<DaemonMessage>(`terminal-output-${terminalId}`, (event) => {
    callback(event.payload);
  });
}

export function decodeBase64(data: string): Uint8Array {
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
