import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
  TerminalView: ({
    terminalId,
    tabs,
    onAddTab,
  }: {
    terminalId: string;
    tabs: { id: string; name: string | null }[];
    onAddTab: () => void;
  }) => (
    <div data-testid="terminal-view-stub">
      {terminalId}
      <ul aria-label="tab order">
        {tabs.map((t) => (
          <li key={t.id}>{t.name}</li>
        ))}
      </ul>
      <button type="button" onClick={onAddTab}>
        New Terminal
      </button>
    </div>
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

  it("shows the project dashboard before any project is selected", async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText(/active projects/i)).toBeInTheDocument();
    });
    expect(screen.queryByTestId("terminal-view-stub")).not.toBeInTheDocument();
  });

  it("shows a New Terminal prompt — no inline create form — for an empty project", async () => {
    vi.mocked(daemon.listProjects).mockResolvedValue([{ id: "p1", name: "Web Dev" }]);
    render(<App />);

    await userEvent.click(await screen.findByRole("button", { name: /open project/i }));

    expect(await screen.findByRole("button", { name: /new terminal/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/directory/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/configure terminal/i)).not.toBeInTheDocument();
  });

  it("auto-selects the first tab when opening a project that already has Terminals", async () => {
    vi.mocked(daemon.listProjects).mockResolvedValue([{ id: "p1", name: "Web Dev" }]);
    vi.mocked(daemon.listTerminals).mockResolvedValue([
      {
        id: "t1",
        name: "Terminal 1",
        cwd: "/home/dev",
        startup_command: null,
        env_vars: {},
        shell: null,
        scrollback_lines: 10000,
        state: "Rodando",
      },
      {
        id: "t2",
        name: "Terminal 2",
        cwd: "/home/dev",
        startup_command: null,
        env_vars: {},
        shell: null,
        scrollback_lines: 10000,
        state: "Rodando",
      },
    ]);
    render(<App />);

    await userEvent.click(await screen.findByRole("button", { name: /open project/i }));

    expect(await screen.findByTestId("terminal-view-stub")).toHaveTextContent("t1");
  });

  it("keeps a Project's tab order stable across switching away and back, even if the daemon reorders its listing", async () => {
    const t1 = {
      id: "t1",
      name: "Terminal 1",
      cwd: "/home/dev",
      startup_command: null,
      env_vars: {},
      shell: null,
      scrollback_lines: 10000,
      state: "Rodando" as const,
    };
    const t2 = { ...t1, id: "t2", name: "Terminal 2" };
    const t3 = { ...t1, id: "t3", name: "Terminal 3" };

    vi.mocked(daemon.listProjects).mockResolvedValue([
      { id: "p1", name: "Project A" },
      { id: "p2", name: "Project B" },
    ]);
    let projectACalls = 0;
    vi.mocked(daemon.listTerminals).mockImplementation(async (projectId: string) => {
      if (projectId === "p1") {
        projectACalls += 1;
        // The daemon has no stable ordering guarantee — simulate it handing
        // back a different order the second time, as if its internal map
        // had reshuffled between calls.
        return projectACalls === 1 ? [t1, t2] : [t2, t1];
      }
      return [t3];
    });

    render(<App />);

    await userEvent.click(await screen.findByRole("button", { name: "Project A" }));
    await waitFor(() => {
      expect(within(screen.getByLabelText("tab order")).getAllByRole("listitem")).toHaveLength(2);
    });
    let order = within(screen.getByLabelText("tab order"))
      .getAllByRole("listitem")
      .map((el) => el.textContent);
    expect(order).toEqual(["Terminal 1", "Terminal 2"]);

    await userEvent.click(screen.getByRole("button", { name: "Project B" }));
    await waitFor(() => expect(screen.getByTestId("terminal-view-stub")).toHaveTextContent("t3"));

    await userEvent.click(screen.getByRole("button", { name: "Project A" }));
    await waitFor(() => expect(screen.getByTestId("terminal-view-stub")).toHaveTextContent("t1"));
    order = within(screen.getByLabelText("tab order"))
      .getAllByRole("listitem")
      .map((el) => el.textContent);
    expect(order).toEqual(["Terminal 1", "Terminal 2"]);
  });

  it("defaults a new Terminal's directory to the last selected Terminal's, not the last created one's", async () => {
    vi.mocked(daemon.listProjects).mockResolvedValue([{ id: "p1", name: "Web Dev" }]);
    vi.mocked(daemon.listTerminals).mockResolvedValue([
      {
        id: "t1",
        name: "Terminal 1",
        cwd: "/home/dev/selected-project",
        startup_command: null,
        env_vars: {},
        shell: null,
        scrollback_lines: 10000,
        state: "Rodando",
      },
    ]);
    render(<App />);

    // Opening the Project auto-selects its (only) Terminal.
    await userEvent.click(await screen.findByRole("button", { name: /open project/i }));
    await screen.findByTestId("terminal-view-stub");

    await userEvent.click(screen.getByRole("button", { name: /new terminal/i }));
    await userEvent.click(screen.getByText(/advanced/i));

    expect(screen.getByLabelText(/directory/i)).toHaveValue("/home/dev/selected-project");
  });

  it("opens the Configure Terminal page when adding a terminal, and defaults its name", async () => {
    vi.mocked(daemon.listProjects).mockResolvedValue([{ id: "p1", name: "Web Dev" }]);
    vi.mocked(daemon.listTerminals).mockResolvedValue([]);
    vi.mocked(daemon.createTerminal).mockResolvedValue("t1");
    render(<App />);

    await userEvent.click(await screen.findByRole("button", { name: /open project/i }));
    await userEvent.click(await screen.findByRole("button", { name: /new terminal/i }));
    expect(await screen.findByText(/configure terminal/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /create terminal/i }));

    await waitFor(() => {
      expect(daemon.createTerminal).toHaveBeenCalledWith(
        "p1",
        "",
        expect.objectContaining({ name: "Terminal 1" }),
      );
    });
  });
});
