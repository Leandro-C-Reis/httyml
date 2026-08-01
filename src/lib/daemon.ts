import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

export type TerminalState = "Rodando" | "Parado" | { Encerrado: { exit_code: number } };

export type ProjectInfo = { id: string; name: string };
export type TerminalInfo = { id: string; name: string | null; state: TerminalState };

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

export async function listProjects(): Promise<ProjectInfo[]> {
  return invoke<ProjectInfo[]>("list_projects");
}

export async function listTerminals(projectId: string): Promise<TerminalInfo[]> {
  return invoke<TerminalInfo[]>("list_terminals", { projectId });
}

export async function createTerminal(
  projectId: string,
  cwd: string,
  name?: string,
  startupCommand?: string,
): Promise<string> {
  return invoke<string>("create_terminal", {
    projectId,
    cwd,
    name: name || null,
    startupCommand: startupCommand || null,
  });
}

export async function attachTerminal(terminalId: string): Promise<void> {
  await invoke("attach_terminal", { terminalId });
}

export async function writeTerminal(terminalId: string, data: string): Promise<void> {
  await invoke("write_terminal", { terminalId, data });
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
