import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
import * as daemon from "./lib/daemon";

vi.mock("./lib/daemon", () => ({
  ensureDaemon: vi.fn().mockResolvedValue(undefined),
  createTerminal: vi.fn(),
}));

vi.mock("./components/TerminalView", () => ({
  TerminalView: ({ terminalId }: { terminalId: string }) => (
    <div data-testid="terminal-view-stub">{terminalId}</div>
  ),
}));

describe("App", () => {
  it("starts the daemon (if not already running) on load", async () => {
    render(<App />);
    await waitFor(() => expect(daemon.ensureDaemon).toHaveBeenCalled());
  });

  it("shows no terminal before one has been created", () => {
    render(<App />);
    expect(screen.queryByTestId("terminal-view-stub")).not.toBeInTheDocument();
  });

  it("shows the created terminal immediately after quick-create", async () => {
    vi.mocked(daemon.createTerminal).mockResolvedValue("term-42");
    render(<App />);

    await userEvent.type(screen.getByLabelText(/directory/i), "/home/dev/project");
    await userEvent.click(screen.getByRole("button", { name: /new terminal/i }));

    expect(daemon.createTerminal).toHaveBeenCalledWith("/home/dev/project", "", "");
    await waitFor(() => {
      expect(screen.getByTestId("terminal-view-stub")).toHaveTextContent("term-42");
    });
  });
});
