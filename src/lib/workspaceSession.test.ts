import { afterEach, describe, expect, it, vi } from "vitest";
import { readWorkspaceSession, writeWorkspaceSession } from "./workspaceSession";

function installStore(initial = new Map<string, string>()) {
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => initial.get(key) ?? null,
    setItem: (key: string, value: string) => void initial.set(key, value),
    removeItem: (key: string) => void initial.delete(key),
  });
  return initial;
}

afterEach(() => vi.unstubAllGlobals());

describe("workspaceSession", () => {
  it("round-trips only UI navigation state", () => {
    const store = installStore();
    writeWorkspaceSession({
      projectId: "project-a",
      openTerminalIds: ["one", "two", "one"],
      activeTerminalId: "two",
      tabOrder: ["two", "one"],
    });

    expect(readWorkspaceSession()).toEqual({
      projectId: "project-a",
      openTerminalIds: ["one", "two"],
      activeTerminalId: "two",
      tabOrder: ["two", "one"],
    });
    expect([...store.keys()]).toEqual(["httyml.workspace-session.v1"]);
  });

  it("ignores malformed persisted data", () => {
    const store = installStore(new Map([["httyml.workspace-session.v1", "not-json"]]));
    expect(readWorkspaceSession()).toBeNull();
    expect(store.get("httyml.workspace-session.v1")).toBe("not-json");
  });
});
