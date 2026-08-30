import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TerminalSideMenu } from "./TerminalSideMenu";
import * as daemon from "../lib/daemon";

vi.mock("../lib/daemon", () => ({
  readPackageScripts: vi.fn().mockResolvedValue([]),
}));

function renderMenu(overrides: Partial<Parameters<typeof TerminalSideMenu>[0]> = {}) {
  const onScriptsChange = vi.fn();
  const onRun = vi.fn();
  render(
    <TerminalSideMenu
      cwd="/home/dev/project"
      scripts={[]}
      onScriptsChange={onScriptsChange}
      onRun={onRun}
      onError={vi.fn()}
      {...overrides}
    />,
  );
  return { onScriptsChange, onRun };
}

const syncScript = {
  id: "s1",
  name: "Sync",
  command: "rsync -a {source} /backup",
  args: [{ name: "source", label: "Source folder", flag: null, default_value: "/data" }],
};

describe("TerminalSideMenu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(daemon.readPackageScripts).mockResolvedValue([]);
  });

  it("keeps both panels collapsed until a button is clicked", () => {
    renderMenu();
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Project scripts" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("runs an argument-less script straight away", async () => {
    const { onRun } = renderMenu({
      scripts: [{ id: "s2", name: "Build", command: "npm run build", args: [] }],
    });

    await userEvent.click(screen.getByRole("button", { name: "Project scripts" }));
    await userEvent.click(screen.getByRole("button", { name: "Run Build" }));

    expect(onRun).toHaveBeenCalledWith("npm run build");
  });

  it("asks for the optional arguments before running a script that has them", async () => {
    const { onRun } = renderMenu({ scripts: [syncScript] });

    await userEvent.click(screen.getByRole("button", { name: "Project scripts" }));
    await userEvent.click(screen.getByRole("button", { name: "Run Sync" }));

    const form = screen.getByRole("form", { name: "Run Sync" });
    const source = within(form).getByLabelText("Source folder");
    // The argument starts on its default.
    expect(source).toHaveValue("/data");

    await userEvent.clear(source);
    await userEvent.type(source, "/photos");
    await userEvent.click(within(form).getByRole("button", { name: /^run$/i }));

    expect(onRun).toHaveBeenCalledWith("rsync -a /photos /backup");
  });

  it("saves a new script with an optional argument", async () => {
    const { onScriptsChange } = renderMenu();

    await userEvent.click(screen.getByRole("button", { name: "Project scripts" }));
    await userEvent.click(screen.getByRole("button", { name: /new script/i }));

    await userEvent.type(screen.getByLabelText("Script name"), "Deploy");
    // `{` opens a key descriptor in userEvent — `{{` types a literal one.
    // The placeholder in the command is what creates the argument.
    await userEvent.type(screen.getByLabelText("Script command"), "./deploy.sh {{env}");
    await userEvent.type(screen.getByLabelText("Label for {env}"), "Environment");
    await userEvent.click(screen.getByRole("button", { name: /save script/i }));

    expect(onScriptsChange).toHaveBeenCalledWith([
      expect.objectContaining({
        name: "Deploy",
        command: "./deploy.sh {env}",
        args: [expect.objectContaining({ name: "env", label: "Environment", flag: null })],
      }),
    ]);
  });

  it("adds a placeholder to the command when Add argument is clicked", async () => {
    const { onScriptsChange } = renderMenu();

    await userEvent.click(screen.getByRole("button", { name: "Project scripts" }));
    await userEvent.click(screen.getByRole("button", { name: /new script/i }));

    await userEvent.type(screen.getByLabelText("Script name"), "Copy");
    await userEvent.type(screen.getByLabelText("Script command"), "cp -r");
    await userEvent.click(screen.getByRole("button", { name: /add argument/i }));

    expect(screen.getByLabelText("Script command")).toHaveValue("cp -r {arg1}");

    await userEvent.type(screen.getByLabelText("Flag for {arg1}"), "--target");
    await userEvent.click(screen.getByRole("button", { name: /save script/i }));

    expect(onScriptsChange).toHaveBeenCalledWith([
      expect.objectContaining({
        command: "cp -r {arg1}",
        args: [expect.objectContaining({ name: "arg1", flag: "--target" })],
      }),
    ]);
  });

  it("drops an argument when its placeholder is removed from the command", async () => {
    const { onScriptsChange } = renderMenu({ scripts: [syncScript] });

    await userEvent.click(screen.getByRole("button", { name: "Project scripts" }));
    await userEvent.click(screen.getByRole("button", { name: "Edit Sync" }));
    await userEvent.click(screen.getByRole("button", { name: "Remove {source}" }));

    expect(screen.getByLabelText("Script command")).toHaveValue("rsync -a /backup");
    await userEvent.click(screen.getByRole("button", { name: /save script/i }));

    expect(onScriptsChange).toHaveBeenCalledWith([
      expect.objectContaining({ command: "rsync -a /backup", args: [] }),
    ]);
  });

  it("lists the current directory's package.json scripts and runs them with npm", async () => {
    vi.mocked(daemon.readPackageScripts).mockResolvedValue([["dev", "vite"]]);
    const { onRun } = renderMenu();

    await userEvent.click(screen.getByRole("button", { name: "package.json scripts" }));

    await waitFor(() => expect(daemon.readPackageScripts).toHaveBeenCalledWith("/home/dev/project"));
    await userEvent.click(await screen.findByRole("button", { name: "Run dev" }));

    expect(onRun).toHaveBeenCalledWith("npm run dev");
  });

  it("opens VS Code in the Terminal's directory", async () => {
    const { onRun } = renderMenu();

    await userEvent.click(screen.getByRole("button", { name: "Open in VS Code" }));

    expect(onRun).toHaveBeenCalledWith("code /home/dev/project");
  });

  it("quotes a directory with spaces when opening VS Code", async () => {
    const { onRun } = renderMenu({ cwd: "/home/dev/my project" });

    await userEvent.click(screen.getByRole("button", { name: "Open in VS Code" }));

    expect(onRun).toHaveBeenCalledWith("code '/home/dev/my project'");
  });

  it("closes the open panel when its button is clicked again", async () => {
    renderMenu();
    const button = screen.getByRole("button", { name: "Project scripts" });

    await userEvent.click(button);
    expect(screen.getByRole("region", { name: "Project scripts" })).toBeInTheDocument();

    await userEvent.click(button);
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
  });
});
