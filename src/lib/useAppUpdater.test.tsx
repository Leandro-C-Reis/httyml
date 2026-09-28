import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { useAppUpdater } from "./useAppUpdater";

vi.mock("@tauri-apps/api/core", () => ({ isTauri: () => true }));
vi.mock("@tauri-apps/plugin-updater", () => ({ check: vi.fn() }));
vi.mock("@tauri-apps/plugin-process", () => ({ relaunch: vi.fn() }));

describe("useAppUpdater", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("checks at launch, installs only on request, and relaunches only when chosen", async () => {
    const downloadAndInstall = vi.fn(async (onEvent: (event: { event: "Started" | "Progress"; data: { contentLength?: number; chunkLength?: number } }) => void) => {
      onEvent({ event: "Started", data: { contentLength: 10 } });
      onEvent({ event: "Progress", data: { chunkLength: 10 } });
    });
    vi.mocked(check).mockResolvedValue({
      version: "0.2.0",
      body: "Release notes",
      downloadAndInstall,
      close: vi.fn(),
    } as never);
    const { result } = renderHook(() => useAppUpdater());

    await waitFor(() => expect(result.current.status.kind).toBe("available"));
    expect(downloadAndInstall).not.toHaveBeenCalled();
    await act(async () => result.current.installUpdate());
    expect(result.current.status).toEqual({ kind: "installed", version: "0.2.0" });
    expect(relaunch).not.toHaveBeenCalled();
    await act(async () => result.current.restartApp());
    expect(relaunch).toHaveBeenCalledTimes(1);
  });

  it("reports a failed launch check and permits a manual retry", async () => {
    vi.mocked(check).mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(null);
    const { result } = renderHook(() => useAppUpdater());
    await waitFor(() => expect(result.current.status).toEqual({ kind: "error", message: "Error: offline", duringInstall: false }));
    await act(async () => result.current.checkForUpdates());
    expect(result.current.status).toEqual({ kind: "up-to-date" });
  });

  it("reports installation failure without restarting", async () => {
    vi.mocked(check).mockResolvedValue({
      version: "0.2.0",
      downloadAndInstall: vi.fn().mockRejectedValue(new Error("signature rejected")),
      close: vi.fn(),
    } as never);
    const { result } = renderHook(() => useAppUpdater());
    await waitFor(() => expect(result.current.status.kind).toBe("available"));
    await act(async () => result.current.installUpdate());
    expect(result.current.status).toEqual({ kind: "error", message: "Error: signature rejected", duringInstall: true });
    expect(relaunch).not.toHaveBeenCalled();
  });
});
