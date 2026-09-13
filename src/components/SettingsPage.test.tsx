import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SettingsPage } from "./SettingsPage";
import { THEMES } from "../lib/theme";
import * as dialog from "../lib/dialog";

vi.mock("../lib/dialog", () => ({
  pickExportPath: vi.fn(),
  pickImportPath: vi.fn(),
}));

function renderPage(overrides: Partial<Parameters<typeof SettingsPage>[0]> = {}) {
  const onSelectTheme = vi.fn();
  const onBack = vi.fn();
  const onExport = vi.fn();
  const onImport = vi.fn();
  render(
    <SettingsPage
      currentTheme="terminal-core"
      onSelectTheme={onSelectTheme}
      crtFilterEnabled
      terminalBackground="#050505"
      appBackground="#eeeeee"
      backgroundPattern="horizontal-stripes"
      onCrtFilterChange={vi.fn()}
      onTerminalBackgroundChange={vi.fn()}
      onAppBackgroundChange={vi.fn()}
      onBackgroundPatternChange={vi.fn()}
      onBack={onBack}
      onExport={onExport}
      onImport={onImport}
      statusMessage={null}
      {...overrides}
    />,
  );
  return { onSelectTheme, onBack, onExport, onImport };
}

describe("SettingsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists every theme and marks the current one as pressed", () => {
    renderPage({ currentTheme: "sunset" });

    for (const theme of THEMES) {
      const button = screen.getByRole("button", { name: theme.label });
      expect(button).toHaveAttribute("aria-pressed", theme.id === "sunset" ? "true" : "false");
    }
  });

  it("selects a theme when its card is clicked", async () => {
    const { onSelectTheme } = renderPage();

    await userEvent.click(screen.getByRole("button", { name: "Forest" }));

    expect(onSelectTheme).toHaveBeenCalledWith("forest");
  });

  it("toggles the CRT filter from its visual preview", async () => {
    const onCrtFilterChange = vi.fn();
    renderPage({ crtFilterEnabled: false, onCrtFilterChange });

    expect(screen.getByText("$ ready_")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("switch", { name: "CRT filter" }));

    expect(onCrtFilterChange).toHaveBeenCalledWith(true);
  });

  it("calls onBack when Back is clicked", async () => {
    const { onBack } = renderPage();

    await userEvent.click(screen.getByRole("button", { name: /back/i }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("shows the most recent status message", () => {
    renderPage({ statusMessage: "Imported 2 projects and 3 terminals." });

    expect(screen.getByText("Imported 2 projects and 3 terminals.")).toBeInTheDocument();
  });

  it("opens the native save dialog and exports to the chosen path", async () => {
    vi.mocked(dialog.pickExportPath).mockResolvedValue("/tmp/backup.json");
    const { onExport } = renderPage();

    await userEvent.click(screen.getByRole("button", { name: /export configuration/i }));

    expect(dialog.pickExportPath).toHaveBeenCalledWith("httyml-backup.json");
    expect(onExport).toHaveBeenCalledWith("/tmp/backup.json");
  });

  it("does nothing if the save dialog is canceled", async () => {
    vi.mocked(dialog.pickExportPath).mockResolvedValue(null);
    const { onExport } = renderPage();

    await userEvent.click(screen.getByRole("button", { name: /export configuration/i }));

    expect(onExport).not.toHaveBeenCalled();
  });

  it("opens the native open dialog, then asks for confirmation before importing", async () => {
    vi.mocked(dialog.pickImportPath).mockResolvedValue("/tmp/backup.json");
    const { onImport } = renderPage();

    await userEvent.click(screen.getByRole("button", { name: /import configuration/i }));

    expect(dialog.pickImportPath).toHaveBeenCalledTimes(1);
    expect(onImport).not.toHaveBeenCalled();
    expect(await screen.findByText(/replace every project/i)).toBeInTheDocument();
    expect(screen.getByText(/tmp\/backup\.json/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /replace everything/i }));

    expect(onImport).toHaveBeenCalledWith("/tmp/backup.json");
  });

  it("does nothing if the open dialog is canceled", async () => {
    vi.mocked(dialog.pickImportPath).mockResolvedValue(null);
    const { onImport } = renderPage();

    await userEvent.click(screen.getByRole("button", { name: /import configuration/i }));

    expect(onImport).not.toHaveBeenCalled();
    expect(screen.queryByText(/replace every project/i)).not.toBeInTheDocument();
  });

  it("cancels the import confirmation without calling onImport", async () => {
    vi.mocked(dialog.pickImportPath).mockResolvedValue("/tmp/backup.json");
    const { onImport } = renderPage();

    await userEvent.click(screen.getByRole("button", { name: /import configuration/i }));
    await userEvent.click(await screen.findByRole("button", { name: /^cancel$/i }));

    expect(screen.queryByText(/replace every project/i)).not.toBeInTheDocument();
    expect(onImport).not.toHaveBeenCalled();
  });
});
