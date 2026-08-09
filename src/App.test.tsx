import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
import * as daemon from "./lib/daemon";

vi.mock("./lib/daemon", () => ({
  ensureDaemon: vi.fn().mockResolvedValue(undefined),
  listProjects: vi.fn().mockResolvedValue([]),
  createProject: vi.fn(),
  listTerminals: vi.fn().mockResolvedValue([]),
  createTerminal: vi.fn(),
  deleteTerminal: vi.fn().mockResolvedValue(undefined),
  stopTerminal: vi.fn().mockResolvedValue(undefined),
  setProjectScripts: vi.fn(),
  updateProject: vi.fn(),
}));

// Projects carry presentation metadata (colour, icon, ...) that none of
// these tests care about — this keeps them to the fields they assert on.
function project(id: string, name: string): daemon.ProjectInfo {
  return {
    id,
    name,
    description: null,
    color: null,
    icon: null,
    default_cwd: "",
    scripts: [],
  };
}

vi.mock("./components/TerminalView", () => ({
  TerminalView: ({
    terminalId,
    activeTerminalId,
    tabs,
    onAddTab,
  }: {
    terminalId: string;
    activeTerminalId: string | null;
    tabs: { id: string; name: string | null }[];
    onAddTab: () => void;
  }) => (
    // Every opened Terminal stays mounted (App only hides the inactive
    // ones), so the active one carries a testid of its own.
    <div
      data-testid={terminalId === activeTerminalId ? "active-terminal-view" : "terminal-view-stub"}
    >
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
    expect(screen.queryByTestId("active-terminal-view")).not.toBeInTheDocument();
  });

  it("shows a New Terminal prompt — no inline create form — for an empty project", async () => {
    vi.mocked(daemon.listProjects).mockResolvedValue([project("p1", "Web Dev")]);
    render(<App />);

    await userEvent.click(await screen.findByRole("button", { name: /open project/i }));

    expect(await screen.findByRole("button", { name: /new terminal/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/directory/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/configure terminal/i)).not.toBeInTheDocument();
  });

  it("collapses and expands the Projects sidebar, remembering the choice", async () => {
    // This jsdom setup has no localStorage of its own, and the sidebar
    // treats a missing store as "always start expanded" — stub one so the
    // remembering half of this is actually exercised.
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
    });
    vi.mocked(daemon.listProjects).mockResolvedValue([project("p1", "Web Dev")]);
    const { unmount } = render(<App />);

    const nav = await screen.findByRole("navigation", { name: "Projects" });
    // Expanded: the create form and the project's name are both there.
    expect(within(nav).getByLabelText("Create project")).toBeInTheDocument();
    expect(within(nav).getByText("Web Dev")).toBeInTheDocument();

    await userEvent.click(within(nav).getByRole("button", { name: /collapse sidebar/i }));

    expect(within(nav).queryByLabelText("Create project")).not.toBeInTheDocument();
    // The project is still reachable, by its accessible name only.
    expect(within(nav).queryByText("Web Dev")).not.toBeInTheDocument();
    expect(within(nav).getByRole("button", { name: "Web Dev" })).toBeInTheDocument();

    // Remounting keeps it collapsed.
    unmount();
    render(<App />);
    const remounted = await screen.findByRole("navigation", { name: "Projects" });
    const expand = within(remounted).getByRole("button", { name: /expand sidebar/i });

    await userEvent.click(expand);
    expect(within(remounted).getByLabelText("Create project")).toBeInTheDocument();
    vi.unstubAllGlobals();
  });

  it("goes back to the Active Projects dashboard from an open project", async () => {
    vi.mocked(daemon.listProjects).mockResolvedValue([project("p1", "Web Dev")]);
    render(<App />);

    await userEvent.click(await screen.findByRole("button", { name: /open project/i }));
    // Both the sidebar and the open Project's header offer the way back.
    const backButtons = await screen.findAllByRole("button", { name: /^active projects$/i });
    await userEvent.click(backButtons[backButtons.length - 1]);

    expect(await screen.findByRole("button", { name: /open project/i })).toBeInTheDocument();
    expect(screen.queryByTestId("active-terminal-view")).not.toBeInTheDocument();
  });

  it("edits a Project's name and metadata from the dashboard", async () => {
    const p1 = project("p1", "Web Dev");
    vi.mocked(daemon.listProjects).mockResolvedValue([p1]);
    vi.mocked(daemon.updateProject).mockResolvedValue({ ...p1, name: "Web" });
    render(<App />);

    await userEvent.click(await screen.findByRole("button", { name: /edit web dev/i }));
    const form = await screen.findByRole("form", { name: /edit project/i });
    const name = within(form).getByLabelText(/project name/i);
    await userEvent.clear(name);
    await userEvent.type(name, "Web");
    await userEvent.click(within(form).getByRole("button", { name: /^pink$/i }));
    await userEvent.click(within(form).getByRole("button", { name: /^bolt$/i }));
    await userEvent.click(within(form).getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(daemon.updateProject).toHaveBeenCalledWith("p1", {
        name: "Web",
        description: null,
        color: "pink",
        icon: "bolt",
        defaultCwd: "",
      });
    });
  });

  it("stores a custom Project colour as the hex the user picked", async () => {
    const p1 = project("p1", "Web Dev");
    vi.mocked(daemon.listProjects).mockResolvedValue([p1]);
    vi.mocked(daemon.updateProject).mockResolvedValue({ ...p1, color: "#123456" });
    render(<App />);

    await userEvent.click(await screen.findByRole("button", { name: /edit web dev/i }));
    const form = await screen.findByRole("form", { name: /edit project/i });
    // A native colour input can't be "typed" into — set its value directly.
    fireEvent.change(within(form).getByLabelText(/custom color/i), {
      target: { value: "#123456" },
    });
    // The picked colour joins the presets as a selected swatch of its own.
    expect(within(form).getByRole("button", { name: /custom #123456/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await userEvent.click(within(form).getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(daemon.updateProject).toHaveBeenCalledWith(
        "p1",
        expect.objectContaining({ color: "#123456" }),
      );
    });
  });

  it("auto-selects the first tab when opening a project that already has Terminals", async () => {
    vi.mocked(daemon.listProjects).mockResolvedValue([project("p1", "Web Dev")]);
    vi.mocked(daemon.listTerminals).mockResolvedValue([
      {
        id: "t1",
        name: "Terminal 1",
        cwd: "/home/dev",
        startup_command: null,
        env_vars: {},
        shell: null,
        scrollback_lines: 10000,
        state: "Running",
      },
      {
        id: "t2",
        name: "Terminal 2",
        cwd: "/home/dev",
        startup_command: null,
        env_vars: {},
        shell: null,
        scrollback_lines: 10000,
        state: "Running",
      },
    ]);
    render(<App />);

    await userEvent.click(await screen.findByRole("button", { name: /open project/i }));

    expect(await screen.findByTestId("active-terminal-view")).toHaveTextContent("t1");
  });

  it("switches Terminals with Alt shortcuts", async () => {
    vi.mocked(daemon.listProjects).mockResolvedValue([project("p1", "Web Dev")]);
    const t1 = {
      id: "t1",
      name: "Terminal 1",
      cwd: "/home/dev",
      startup_command: null,
      env_vars: {},
      shell: null,
      scrollback_lines: 10000,
      state: "Running" as const,
    };
    vi.mocked(daemon.listTerminals).mockResolvedValue([t1, { ...t1, id: "t2", name: "Terminal 2" }]);
    render(<App />);

    await userEvent.click(await screen.findByRole("button", { name: /open project/i }));
    await waitFor(() => expect(screen.getByTestId("active-terminal-view")).toHaveTextContent("t1"));

    fireEvent.keyDown(window, { code: "ArrowRight", altKey: true });
    await waitFor(() => expect(screen.getByTestId("active-terminal-view")).toHaveTextContent("t2"));

    // Wraps around past the last tab.
    fireEvent.keyDown(window, { code: "ArrowRight", altKey: true });
    await waitFor(() => expect(screen.getByTestId("active-terminal-view")).toHaveTextContent("t1"));

    fireEvent.keyDown(window, { code: "ArrowLeft", altKey: true });
    await waitFor(() => expect(screen.getByTestId("active-terminal-view")).toHaveTextContent("t2"));

    // Alt+T creates straight away, with the defaults the Configure page
    // would have shown — no form in between.
    vi.mocked(daemon.createTerminal).mockResolvedValue("t3");
    fireEvent.keyDown(window, { code: "KeyT", altKey: true });
    await waitFor(() =>
      expect(daemon.createTerminal).toHaveBeenCalledWith("p1", "/home/dev", {
        name: "Terminal 3",
      }),
    );
    expect(screen.queryByRole("form", { name: /create terminal/i })).not.toBeInTheDocument();
  });

  it("stops, edits and reorders the active Terminal from the keyboard", async () => {
    vi.mocked(daemon.listProjects).mockResolvedValue([project("p1", "Web Dev")]);
    const t1 = {
      id: "t1",
      name: "Terminal 1",
      cwd: "/home/dev",
      startup_command: null,
      env_vars: {},
      shell: null,
      scrollback_lines: 10000,
      state: "Running" as const,
    };
    vi.mocked(daemon.listTerminals).mockResolvedValue([t1, { ...t1, id: "t2", name: "Terminal 2" }]);
    render(<App />);

    await userEvent.click(await screen.findByRole("button", { name: /open project/i }));
    await waitFor(() => expect(screen.getByTestId("active-terminal-view")).toHaveTextContent("t1"));

    fireEvent.keyDown(window, { code: "KeyQ", altKey: true });
    await waitFor(() => expect(daemon.stopTerminal).toHaveBeenCalledWith("t1"));

    // Alt+M turns the bare arrows into "move this tab", so the active
    // Terminal changes position without the selection following the arrow.
    fireEvent.keyDown(window, { code: "KeyM", altKey: true });
    fireEvent.keyDown(window, { code: "ArrowRight" });
    await waitFor(() => {
      const order = within(screen.getByLabelText("tab order"))
        .getAllByRole("listitem")
        .map((el) => el.textContent);
      expect(order).toEqual(["Terminal 2", "Terminal 1"]);
    });
    expect(screen.getByTestId("active-terminal-view")).toHaveTextContent("t1");

    fireEvent.keyDown(window, { code: "Escape" });

    fireEvent.keyDown(window, { code: "KeyE", altKey: true });
    expect(await screen.findByRole("form", { name: /edit terminal/i })).toBeInTheDocument();
  });

  it("deletes the active Terminal with Alt+Del", async () => {
    vi.mocked(daemon.listProjects).mockResolvedValue([project("p1", "Web Dev")]);
    const t1 = {
      id: "t1",
      name: "Terminal 1",
      cwd: "/home/dev",
      startup_command: null,
      env_vars: {},
      shell: null,
      scrollback_lines: 10000,
      state: "Running" as const,
    };
    vi.mocked(daemon.listTerminals).mockResolvedValue([t1, { ...t1, id: "t2", name: "Terminal 2" }]);
    render(<App />);

    await userEvent.click(await screen.findByRole("button", { name: /open project/i }));
    await waitFor(() => expect(screen.getByTestId("active-terminal-view")).toHaveTextContent("t1"));

    // The remaining Terminal takes over, same as clicking Remove.
    vi.mocked(daemon.listTerminals).mockResolvedValue([{ ...t1, id: "t2", name: "Terminal 2" }]);
    fireEvent.keyDown(window, { code: "Delete", altKey: true });

    await waitFor(() => expect(daemon.deleteTerminal).toHaveBeenCalledWith("t1"));
    await waitFor(() => expect(screen.getByTestId("active-terminal-view")).toHaveTextContent("t2"));
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
      state: "Running" as const,
    };
    const t2 = { ...t1, id: "t2", name: "Terminal 2" };
    const t3 = { ...t1, id: "t3", name: "Terminal 3" };

    vi.mocked(daemon.listProjects).mockResolvedValue([
      project("p1", "Project A"),
      project("p2", "Project B"),
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
    await waitFor(() => expect(screen.getByTestId("active-terminal-view")).toHaveTextContent("t3"));

    await userEvent.click(screen.getByRole("button", { name: "Project A" }));
    await waitFor(() => expect(screen.getByTestId("active-terminal-view")).toHaveTextContent("t1"));
    order = within(screen.getByLabelText("tab order"))
      .getAllByRole("listitem")
      .map((el) => el.textContent);
    expect(order).toEqual(["Terminal 1", "Terminal 2"]);
  });

  it("defaults a new Terminal's directory to the last selected Terminal's, not the last created one's", async () => {
    vi.mocked(daemon.listProjects).mockResolvedValue([project("p1", "Web Dev")]);
    vi.mocked(daemon.listTerminals).mockResolvedValue([
      {
        id: "t1",
        name: "Terminal 1",
        cwd: "/home/dev/selected-project",
        startup_command: null,
        env_vars: {},
        shell: null,
        scrollback_lines: 10000,
        state: "Running",
      },
    ]);
    render(<App />);

    // Opening the Project auto-selects its (only) Terminal.
    await userEvent.click(await screen.findByRole("button", { name: /open project/i }));
    await screen.findByTestId("active-terminal-view");

    await userEvent.click(screen.getByRole("button", { name: /new terminal/i }));
    await userEvent.click(screen.getByText(/advanced/i));

    expect(screen.getByLabelText(/directory/i)).toHaveValue("/home/dev/selected-project");
  });

  it("opens the Configure Terminal page when adding a terminal, and defaults its name", async () => {
    vi.mocked(daemon.listProjects).mockResolvedValue([project("p1", "Web Dev")]);
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
