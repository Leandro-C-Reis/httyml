import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SettingsPage } from "./SettingsPage";
import { THEMES } from "../lib/theme";

describe("SettingsPage", () => {
  it("lists every theme and marks the current one as pressed", () => {
    render(<SettingsPage currentTheme="sunset" onSelectTheme={vi.fn()} onBack={vi.fn()} />);

    for (const theme of THEMES) {
      const button = screen.getByRole("button", { name: theme.label });
      expect(button).toHaveAttribute("aria-pressed", theme.id === "sunset" ? "true" : "false");
    }
  });

  it("selects a theme when its card is clicked", async () => {
    const onSelectTheme = vi.fn();
    render(<SettingsPage currentTheme="terminal-core" onSelectTheme={onSelectTheme} onBack={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: "Forest" }));

    expect(onSelectTheme).toHaveBeenCalledWith("forest");
  });

  it("calls onBack when Back is clicked", async () => {
    const onBack = vi.fn();
    render(<SettingsPage currentTheme="terminal-core" onSelectTheme={vi.fn()} onBack={onBack} />);

    await userEvent.click(screen.getByRole("button", { name: /back/i }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
