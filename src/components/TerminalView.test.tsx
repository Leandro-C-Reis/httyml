import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
    detachTerminal: vi.fn().mockResolvedValue(undefined),
    onTerminalOutput: vi.fn().mockResolvedValue(vi.fn()),
    writeTerminal: vi.fn().mockResolvedValue(undefined),
    resizeTerminal: vi.fn().mockResolvedValue(undefined),
    stopTerminal: vi.fn().mockResolvedValue(undefined),
    restartTerminal: vi.fn().mockResolvedValue(undefined),
  };
});

function renderTerminalView(overrides: Partial<Parameters<typeof TerminalView>[0]> = {}) {
  const onEdit = vi.fn();
  const onDelete = vi.fn();
  const onSelectTab = vi.fn();
  const onAddTab = vi.fn();
  const onError = vi.fn();
  const { unmount } = render(
    <TerminalView
      terminalId="abc123"
      name="Terminal 1"
      cwd="/home/dev/project"
      onEdit={onEdit}
      onDelete={onDelete}
      tabs={[
        { id: "abc123", name: "Terminal 1", cwd: "/home/dev/project", startup_command: null, env_vars: {}, shell: null, scrollback_lines: 10000, state: "Rodando" },
      ]}
      activeTerminalId="abc123"
      onSelectTab={onSelectTab}
      onAddTab={onAddTab}
      onError={onError}
      {...overrides}
    />,
  );
  return { onEdit, onDelete, onSelectTab, onAddTab, onError, unmount };
}

describe("TerminalView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("attaches to the terminal and subscribes to its output on mount", async () => {
    renderTerminalView();

    await waitFor(() => {
      expect(daemon.attachTerminal).toHaveBeenCalledWith("abc123");
      expect(daemon.onTerminalOutput).toHaveBeenCalledWith("abc123", expect.any(Function));
    });
  });

  it("detaches on unmount, so a later re-attach for the same Terminal isn't a stale no-op", async () => {
    const { unmount } = renderTerminalView();
    await waitFor(() => expect(daemon.attachTerminal).toHaveBeenCalledWith("abc123"));

    unmount();

    expect(daemon.detachTerminal).toHaveBeenCalledWith("abc123");
  });

  it("subscribes to output before attaching, so an event emitted right after attach can't be lost", async () => {
    const order: string[] = [];
    vi.mocked(daemon.onTerminalOutput).mockImplementation(async () => {
      order.push("listen");
      return () => {};
    });
    vi.mocked(daemon.attachTerminal).mockImplementation(async () => {
      order.push("attach");
    });

    renderTerminalView();

    await waitFor(() => expect(order).toEqual(["listen", "attach"]));
  });

  it("writes decoded scrollback and live output bytes into the terminal", async () => {
    renderTerminalView();
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
    renderTerminalView();
    await waitFor(() => expect(mockOnData).toHaveBeenCalled());

    const onDataCallback = mockOnData.mock.calls[0][0];
    onDataCallback("ls -la\n");

    expect(daemon.writeTerminal).toHaveBeenCalledWith("abc123", "ls -la\n");
  });

  it("shows the name, directory, and a running indicator with a stop action for a rodando Terminal", async () => {
    renderTerminalView();
    await waitFor(() => expect(daemon.onTerminalOutput).toHaveBeenCalled());

    expect(screen.getByRole("heading", { name: "Terminal 1" })).toBeInTheDocument();
    expect(screen.getByText("/home/dev/project")).toBeInTheDocument();
    expect(screen.getByTestId("terminal-status")).toHaveTextContent(/rodando/i);
    const stopButton = screen.getByRole("button", { name: /stop/i });

    await userEvent.click(stopButton);
    expect(daemon.stopTerminal).toHaveBeenCalledWith("abc123");
  });

  it("switches to a parado indicator and a start action once the terminal is parado", async () => {
    renderTerminalView();
    await waitFor(() => expect(daemon.onTerminalOutput).toHaveBeenCalled());
    const handleMessage = vi.mocked(daemon.onTerminalOutput).mock.calls[0][1];

    act(() => {
      handleMessage({ type: "StateChanged", terminal_id: "abc123", state: "Parado" });
    });

    expect(screen.getByTestId("terminal-status")).toHaveTextContent(/parado/i);
    const startButton = screen.getByRole("button", { name: /start/i });

    await userEvent.click(startButton);
    expect(daemon.restartTerminal).toHaveBeenCalledWith("abc123");
  });

  it("shows a distinct encerrado indicator with the exit code and a start action", async () => {
    renderTerminalView();
    await waitFor(() => expect(daemon.onTerminalOutput).toHaveBeenCalled());
    const handleMessage = vi.mocked(daemon.onTerminalOutput).mock.calls[0][1];

    act(() => {
      handleMessage({
        type: "StateChanged",
        terminal_id: "abc123",
        state: { Encerrado: { exit_code: 7 } },
      });
    });

    const status = screen.getByTestId("terminal-status");
    expect(status).toHaveTextContent(/encerrado/i);
    expect(status).toHaveTextContent("7");
    expect(status.className).toContain("terminal-status--encerrado");

    const startButton = screen.getByRole("button", { name: /start/i });
    await userEvent.click(startButton);
    expect(daemon.restartTerminal).toHaveBeenCalledWith("abc123");
  });

  it("calls onEdit when Edit is clicked, and onDelete when Remove is clicked", async () => {
    const { onEdit, onDelete } = renderTerminalView();
    await waitFor(() => expect(daemon.onTerminalOutput).toHaveBeenCalled());

    await userEvent.click(screen.getByRole("button", { name: /edit/i }));
    expect(onEdit).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByRole("button", { name: /remove/i }));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it("renders the tab bar below the title, wired to onSelectTab and onAddTab", async () => {
    const { onSelectTab, onAddTab } = renderTerminalView({
      tabs: [
        { id: "abc123", name: "Terminal 1", cwd: "/home/dev/project", startup_command: null, env_vars: {}, shell: null, scrollback_lines: 10000, state: "Rodando" },
        { id: "def456", name: "Terminal 2", cwd: "/home/dev/project", startup_command: null, env_vars: {}, shell: null, scrollback_lines: 10000, state: "Rodando" },
      ],
    });
    await waitFor(() => expect(daemon.onTerminalOutput).toHaveBeenCalled());

    expect(screen.getByRole("tablist")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("tab", { name: "Terminal 2" }));
    expect(onSelectTab).toHaveBeenCalledWith("def456");

    await userEvent.click(screen.getByRole("button", { name: /new terminal/i }));
    expect(onAddTab).toHaveBeenCalledTimes(1);
  });

  it("reports an attach failure through onError instead of leaving the Terminal silently blank", async () => {
    vi.mocked(daemon.attachTerminal).mockRejectedValueOnce(new Error("stale connection"));
    const { onError } = renderTerminalView();

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith("stale connection");
    });
  });

  it("reports a failed Stop through onError instead of doing nothing", async () => {
    vi.mocked(daemon.stopTerminal).mockRejectedValueOnce("terminal not attached");
    const { onError } = renderTerminalView();
    await waitFor(() => expect(daemon.onTerminalOutput).toHaveBeenCalled());

    await userEvent.click(screen.getByRole("button", { name: /stop/i }));

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith("terminal not attached");
    });
  });
});
