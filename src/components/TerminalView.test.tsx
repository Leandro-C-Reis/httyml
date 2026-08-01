import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { TerminalView } from "./TerminalView";
import * as daemon from "../lib/daemon";

const mockWrite = vi.fn();
const mockOpen = vi.fn();
const mockLoadAddon = vi.fn();
const mockDispose = vi.fn();
const mockFit = vi.fn();
const mockOnData = vi.fn();

vi.mock("@xterm/xterm", () => ({
  Terminal: vi.fn().mockImplementation(function TerminalMock() {
    return {
      open: mockOpen,
      loadAddon: mockLoadAddon,
      write: mockWrite,
      onData: (cb: (data: string) => void) => {
        mockOnData(cb);
        return { dispose: vi.fn() };
      },
      dispose: mockDispose,
      rows: 24,
      cols: 80,
    };
  }),
}));

vi.mock("@xterm/addon-fit", () => ({
  FitAddon: vi.fn().mockImplementation(function FitAddonMock() {
    return {
      fit: mockFit,
    };
  }),
}));

vi.mock("../lib/daemon", async () => {
  const actual = await vi.importActual<typeof import("../lib/daemon")>("../lib/daemon");
  return {
    ...actual,
    attachTerminal: vi.fn().mockResolvedValue(undefined),
    onTerminalOutput: vi.fn().mockResolvedValue(vi.fn()),
    writeTerminal: vi.fn().mockResolvedValue(undefined),
    resizeTerminal: vi.fn().mockResolvedValue(undefined),
  };
});

describe("TerminalView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("attaches to the terminal and subscribes to its output on mount", async () => {
    render(<TerminalView terminalId="abc123" />);

    await waitFor(() => {
      expect(daemon.attachTerminal).toHaveBeenCalledWith("abc123");
      expect(daemon.onTerminalOutput).toHaveBeenCalledWith("abc123", expect.any(Function));
    });
  });

  it("writes decoded scrollback and live output bytes into the terminal", async () => {
    render(<TerminalView terminalId="abc123" />);
    await waitFor(() => expect(daemon.onTerminalOutput).toHaveBeenCalled());

    const handleMessage = vi.mocked(daemon.onTerminalOutput).mock.calls[0][1];
    const encoded = btoa("hello from shell");

    handleMessage({ type: "Scrollback", terminal_id: "abc123", data: encoded });
    expect(mockWrite).toHaveBeenCalledWith(daemon.decodeBase64(encoded));

    const moreEncoded = btoa("more output\n");
    handleMessage({ type: "Output", terminal_id: "abc123", data: moreEncoded });
    expect(mockWrite).toHaveBeenCalledWith(daemon.decodeBase64(moreEncoded));
  });

  it("forwards typed input to the daemon", async () => {
    render(<TerminalView terminalId="abc123" />);
    await waitFor(() => expect(mockOnData).toHaveBeenCalled());

    const onDataCallback = mockOnData.mock.calls[0][0];
    onDataCallback("ls -la\n");

    expect(daemon.writeTerminal).toHaveBeenCalledWith("abc123", "ls -la\n");
  });
});
