import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TerminalView } from "./TerminalView";
import * as daemon from "../lib/daemon";

const mockWrite = vi.fn();
const mockOpen = vi.fn();
const mockLoadAddon = vi.fn();
const mockDispose = vi.fn();
const mockFit = vi.fn();
const mockOnData = vi.fn();
const mockFocus = vi.fn();
// Mutable so individual tests can simulate "a TUI program left the
// alternate screen buffer active" by flipping `.type` before dispatching
// the StateChanged that should (or shouldn't) react to it.
const mockBuffer = { active: { type: "normal" as "normal" | "alternate" } };

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
      focus: mockFocus,
      buffer: mockBuffer,
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
      scripts={[]}
      onScriptsChange={vi.fn()}
      crtFilterEnabled
      onEdit={onEdit}
      onDelete={onDelete}
      tabs={[
        { id: "abc123", name: "Terminal 1", cwd: "/home/dev/project", startup_command: null, env_vars: {}, shell: null, scrollback_lines: 10000, state: "Running" },
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
    mockBuffer.active.type = "normal";
  });

  it("attaches to the terminal and subscribes to its output on mount", async () => {
    renderTerminalView();

    await waitFor(() => {
      expect(daemon.attachTerminal).toHaveBeenCalledWith("abc123");
      expect(daemon.onTerminalOutput).toHaveBeenCalledWith("abc123", expect.any(Function));
    });
  });

  it("does not touch the display for the initial attach state, or a fresh start that isn't stuck in the alternate buffer", async () => {
    renderTerminalView();
    await waitFor(() => expect(daemon.onTerminalOutput).toHaveBeenCalled());
    const handleMessage = vi.mocked(daemon.onTerminalOutput).mock.calls[0][1];

    // The first StateChanged just reports wherever the Terminal already
    // was (Running, since attach found it live) — this must never touch
    // the display, whatever the buffer happens to be.
    act(() => {
      handleMessage({ type: "StateChanged", terminal_id: "abc123", state: "Running" });
    });
    expect(mockWrite).not.toHaveBeenCalledWith("\x1b[?1049l");

    // Stop, then a real Start — a fresh process began, but it never left
    // the normal buffer, so there's nothing to clean up.
    act(() => {
      handleMessage({ type: "StateChanged", terminal_id: "abc123", state: "Stopped" });
    });
    act(() => {
      handleMessage({ type: "StateChanged", terminal_id: "abc123", state: "Running" });
    });
    expect(mockWrite).not.toHaveBeenCalledWith("\x1b[?1049l");
  });

  it("steps out of a stuck alternate screen buffer on a fresh start, without wiping the normal buffer's history", async () => {
    renderTerminalView();
    await waitFor(() => expect(daemon.onTerminalOutput).toHaveBeenCalled());
    const handleMessage = vi.mocked(daemon.onTerminalOutput).mock.calls[0][1];

    act(() => {
      handleMessage({ type: "StateChanged", terminal_id: "abc123", state: "Running" });
    });
    act(() => {
      handleMessage({ type: "StateChanged", terminal_id: "abc123", state: "Stopped" });
    });

    // The killed process (a TUI dev server, htop, ...) left the alternate
    // screen buffer active.
    mockBuffer.active.type = "alternate";

    act(() => {
      handleMessage({ type: "StateChanged", terminal_id: "abc123", state: "Running" });
    });

    // Only the "leave alternate screen" sequence is written — never a full
    // reset, which would also wipe the normal buffer's own content.
    expect(mockWrite).toHaveBeenCalledWith("\x1b[?1049l");
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

  it("removes the CRT visual filter when globally disabled", async () => {
    renderTerminalView({ crtFilterEnabled: false });

    expect(document.querySelector(".scanlines")).not.toBeInTheDocument();
  });

  it("shows the name, directory, and a running indicator with a stop action for a running Terminal", async () => {
    renderTerminalView();
    await waitFor(() => expect(daemon.onTerminalOutput).toHaveBeenCalled());

    // The Terminal's name lives in the tab bar now; the view itself is
    // labelled with it (see the group role) rather than repeating it.
    expect(screen.getByRole("group", { name: "Terminal 1" })).toBeInTheDocument();
    expect(screen.getByText("/home/dev/project")).toBeInTheDocument();
    // A running Terminal shows its screen, not the idle overlay.
    expect(screen.queryByTestId("terminal-idle-overlay")).not.toBeInTheDocument();
    const stopButton = screen.getByRole("button", { name: /stop/i });

    await userEvent.click(stopButton);
    expect(daemon.stopTerminal).toHaveBeenCalledWith("abc123");
  });

  it("switches to a stopped indicator and a start action once the terminal is stopped", async () => {
    renderTerminalView();
    await waitFor(() => expect(daemon.onTerminalOutput).toHaveBeenCalled());
    const handleMessage = vi.mocked(daemon.onTerminalOutput).mock.calls[0][1];

    act(() => {
      handleMessage({ type: "StateChanged", terminal_id: "abc123", state: "Stopped" });
    });

    expect(screen.getByTestId("terminal-status")).toHaveTextContent(/stopped/i);
    const startButton = screen.getByRole("button", { name: "Start terminal" });

    await userEvent.click(startButton);
    expect(daemon.restartTerminal).toHaveBeenCalledWith("abc123");
  });

  it("still lets Start work after typing into a stopped terminal", async () => {
    renderTerminalView();
    await waitFor(() => expect(daemon.onTerminalOutput).toHaveBeenCalled());
    const handleMessage = vi.mocked(daemon.onTerminalOutput).mock.calls[0][1];
    await waitFor(() => expect(mockOnData).toHaveBeenCalled());
    const onDataCallback = mockOnData.mock.calls[0][0];

    act(() => {
                    handleMessage({ type: "StateChanged", terminal_id: "abc123", state: "Stopped" });
    });

    // The user types before noticing the Terminal isn't running.
    onDataCallback("echo should-not-run\n");
    expect(daemon.writeTerminal).toHaveBeenCalledWith("abc123", "echo should-not-run\n");

    const startButton = screen.getByRole("button", { name: "Start terminal" });
    await userEvent.click(startButton);
    expect(daemon.restartTerminal).toHaveBeenCalledWith("abc123");
  });

  it("starts a stopped Terminal when Enter is pressed", async () => {
    renderTerminalView();
    await waitFor(() => expect(daemon.onTerminalOutput).toHaveBeenCalled());
    const handleMessage = vi.mocked(daemon.onTerminalOutput).mock.calls[0][1];

    // Running: Enter belongs to the shell, not to us.
    fireEvent.keyDown(window, { key: "Enter" });
    expect(daemon.restartTerminal).not.toHaveBeenCalled();

    act(() => {
      handleMessage({ type: "StateChanged", terminal_id: "abc123", state: "Stopped" });
    });

    fireEvent.keyDown(window, { key: "Enter" });
    expect(daemon.restartTerminal).toHaveBeenCalledWith("abc123");
  });

  it("starts a stopped Terminal before running a script from the side menu", async () => {
    const script = { id: "s1", name: "Build", command: "npm run build", args: [] };
    renderTerminalView({ scripts: [script] });
    await waitFor(() => expect(daemon.onTerminalOutput).toHaveBeenCalled());
    const handleMessage = vi.mocked(daemon.onTerminalOutput).mock.calls[0][1];

    act(() => {
      handleMessage({ type: "StateChanged", terminal_id: "abc123", state: "Stopped" });
    });

    await userEvent.click(screen.getByRole("button", { name: "Project scripts" }));
    await userEvent.click(screen.getByRole("button", { name: "Run Build" }));

    await waitFor(() => expect(daemon.restartTerminal).toHaveBeenCalledWith("abc123"));
    expect(daemon.writeTerminal).toHaveBeenCalledWith("abc123", "npm run build\n");
    // Restart has to actually finish before the command is typed in — a
    // freshly restarted process needs the PTY that call sets up.
    const restartOrder = vi.mocked(daemon.restartTerminal).mock.invocationCallOrder[0];
    const writeOrder = vi.mocked(daemon.writeTerminal).mock.invocationCallOrder[0];
    expect(restartOrder).toBeLessThan(writeOrder);
  });

  it("doesn't restart an already-running Terminal when running a script", async () => {
    const script = { id: "s1", name: "Build", command: "npm run build", args: [] };
    renderTerminalView({ scripts: [script] });
    await waitFor(() => expect(daemon.onTerminalOutput).toHaveBeenCalled());

    await userEvent.click(screen.getByRole("button", { name: "Project scripts" }));
    await userEvent.click(screen.getByRole("button", { name: "Run Build" }));

    expect(daemon.writeTerminal).toHaveBeenCalledWith("abc123", "npm run build\n");
    expect(daemon.restartTerminal).not.toHaveBeenCalled();
  });

  it("shows a distinct exited indicator with the exit code and a start action", async () => {
    renderTerminalView();
    await waitFor(() => expect(daemon.onTerminalOutput).toHaveBeenCalled());
    const handleMessage = vi.mocked(daemon.onTerminalOutput).mock.calls[0][1];

    act(() => {
      handleMessage({
        type: "StateChanged",
        terminal_id: "abc123",
        state: { Exited: { exit_code: 7 } },
      });
    });

    const status = screen.getByTestId("terminal-status");
    expect(status).toHaveTextContent(/exited/i);
    expect(status).toHaveTextContent("7");
    expect(status).toHaveAttribute("data-state", "exited");

    const startButton = screen.getByRole("button", { name: "Start terminal" });
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
        { id: "abc123", name: "Terminal 1", cwd: "/home/dev/project", startup_command: null, env_vars: {}, shell: null, scrollback_lines: 10000, state: "Running" },
        { id: "def456", name: "Terminal 2", cwd: "/home/dev/project", startup_command: null, env_vars: {}, shell: null, scrollback_lines: 10000, state: "Running" },
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
