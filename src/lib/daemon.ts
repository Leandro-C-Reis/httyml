import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

export type DaemonMessage =
  | { type: "Created"; terminal_id: string }
  | { type: "Scrollback"; terminal_id: string; data: string }
  | { type: "Output"; terminal_id: string; data: string }
  | { type: "Error"; message: string };

export async function ensureDaemon(): Promise<void> {
  await invoke("ensure_daemon");
}

export async function createTerminal(
  cwd: string,
  name?: string,
  startupCommand?: string,
): Promise<string> {
  return invoke<string>("create_terminal", {
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
