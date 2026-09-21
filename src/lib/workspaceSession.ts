const WORKSPACE_SESSION_KEY = "httyml.workspace-session.v1";

export type WorkspaceSession = {
  projectId: string;
  openTerminalIds: string[];
  activeTerminalId: string | null;
  tabOrder: string[];
};

function strings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is string => typeof item === "string" && item.length > 0))];
}

/// UI-only recovery data. It never changes the daemon's Project/Terminal
/// configuration, and a bad or old value simply behaves like no saved session.
export function readWorkspaceSession(): WorkspaceSession | null {
  try {
    const raw = globalThis.localStorage?.getItem(WORKSPACE_SESSION_KEY);
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object") return null;
    const session = value as Record<string, unknown>;
    if (typeof session.projectId !== "string" || session.projectId.length === 0) return null;
    const openTerminalIds = strings(session.openTerminalIds);
    const tabOrder = strings(session.tabOrder);
    const activeTerminalId =
      typeof session.activeTerminalId === "string" && session.activeTerminalId.length > 0
        ? session.activeTerminalId
        : null;
    return { projectId: session.projectId, openTerminalIds, activeTerminalId, tabOrder };
  } catch {
    return null;
  }
}

export function writeWorkspaceSession(session: WorkspaceSession | null) {
  try {
    if (session) {
      globalThis.localStorage?.setItem(WORKSPACE_SESSION_KEY, JSON.stringify(session));
    } else {
      globalThis.localStorage?.removeItem(WORKSPACE_SESSION_KEY);
    }
  } catch {
    // Workspace recovery is a convenience. Losing browser storage must never
    // block a Project or Terminal action.
  }
}
