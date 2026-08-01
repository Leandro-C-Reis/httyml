import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import App from "./App";
import * as daemon from "./lib/daemon";

vi.mock("./lib/daemon", () => ({
  ensureDaemon: vi.fn().mockResolvedValue(undefined),
  listProjects: vi.fn().mockResolvedValue([]),
  createProject: vi.fn(),
  listTerminals: vi.fn().mockResolvedValue([]),
  createTerminal: vi.fn(),
}));

vi.mock("./components/TerminalView", () => ({
  TerminalView: ({ terminalId }: { terminalId: string }) => (
    <div data-testid="terminal-view-stub">{terminalId}</div>
  ),
}));

describe("App", () => {
  it("starts the daemon and loads the Project list on mount", async () => {
    render(<App />);
    await waitFor(() => {
      expect(daemon.ensureDaemon).toHaveBeenCalled();
      expect(daemon.listProjects).toHaveBeenCalled();
    });
  });

  it("prompts to select or create a project before showing any terminal UI", async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText(/select or create a project/i)).toBeInTheDocument();
    });
    expect(screen.queryByTestId("terminal-view-stub")).not.toBeInTheDocument();
  });
});
