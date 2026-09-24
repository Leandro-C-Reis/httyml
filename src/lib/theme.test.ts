import { beforeEach, describe, expect, it } from "vitest";
import {
  appearanceForTheme,
  applyTheme,
  contrastRatio,
  readAppearance,
  readTheme,
  resetThemeColors,
  terminalTheme,
  THEMES,
  writeAppearance,
  writeTheme,
} from "./theme";

describe("theme", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("style");
  });

  it("defaults to Terminal Core when nothing is stored", () => {
    expect(readTheme()).toBe("terminal-core");
  });

  it("falls back to the default for an unrecognized stored value", () => {
    localStorage.setItem("httyml.theme", "not-a-real-theme");
    expect(readTheme()).toBe("terminal-core");
  });

  it("round-trips a written theme", () => {
    writeTheme("sunset");
    expect(readTheme()).toBe("sunset");
  });

  it("paints every theme's palette onto the document root", () => {
    for (const theme of THEMES) {
      applyTheme(theme.id);
      const root = document.documentElement.style;
      expect(root.getPropertyValue("--color-primary")).toBe(theme.colors.primary);
      expect(root.getPropertyValue("--color-secondary")).toBe(theme.colors.secondary);
      expect(root.getPropertyValue("--color-tertiary")).toBe(theme.colors.tertiary);
      expect(root.getPropertyValue("--color-surface")).toBe(theme.colors.surface);
      expect(root.getPropertyValue("--color-border")).toBe(theme.colors.border);
      expect(root.getPropertyValue("--color-text")).toBe(theme.colors.text);
      expect(root.getPropertyValue("--color-card-header")).toBe(theme.colors.cardHeader);
      expect(root.getPropertyValue("--color-card-border")).toBe(theme.colors.cardBorder);
      expect(root.getPropertyValue("--color-hard-shadow")).toBe(theme.colors.shadow);
      expect(root.getPropertyValue("--terminal-background")).toBe(theme.colors.terminalBackground);
    }
  });

  it("falls back to the first theme for an unknown id", () => {
    // @ts-expect-error deliberately passing an id outside the ThemeId union
    applyTheme("not-a-real-theme");
    expect(document.documentElement.style.getPropertyValue("--color-primary")).toBe(
      THEMES[0].colors.primary,
    );
  });

  it("persists every custom UI and terminal colour", () => {
    const appearance = appearanceForTheme("midnight");
    appearance.colors.border = "#abcdef";
    appearance.colors.text = "#fedcba";
    appearance.colors.shadow = "#123456";
    appearance.colors.cardHeader = "#234567";
    appearance.colors.cardBorder = "#345678";
    appearance.colors.ansi.brightCyan = "#123456";
    writeAppearance(appearance);

    expect(readAppearance()).toEqual(appearance);
  });

  it("migrates the legacy app and terminal backgrounds into the selected preset", () => {
    localStorage.setItem("httyml.theme", "sunset");
    localStorage.setItem("httyml.appBackground", "#123456");
    localStorage.setItem("httyml.terminalBackground", "#654321");

    const appearance = readAppearance();
    expect(appearance.theme).toBe("sunset");
    expect(appearance.colors.appBackground).toBe("#123456");
    expect(appearance.colors.terminalBackground).toBe("#654321");
  });

  it("migrates a v2 shared ink color into the independent appearance roles", () => {
    const appearance = appearanceForTheme("midnight");
    const {
      border: _border,
      text: _text,
      shadow: _shadow,
      cardHeader: _cardHeader,
      cardBorder: _cardBorder,
      ...v2Colors
    } = appearance.colors;
    localStorage.setItem("httyml.appearanceColors.v2", JSON.stringify({ ...v2Colors, ink: "#123456" }));

    const migrated = readAppearance();
    expect(migrated.colors.border).toBe("#123456");
    expect(migrated.colors.text).toBe("#123456");
    expect(migrated.colors.shadow).toBe("#123456");
    expect(migrated.colors.cardHeader).toBe("#123456");
    expect(migrated.colors.cardBorder).toBe("#123456");
  });

  it("migrates v3 card treatments from their former border and shadow roles", () => {
    const appearance = appearanceForTheme("midnight");
    const { cardHeader: _cardHeader, cardBorder: _cardBorder, ...v3Colors } = appearance.colors;
    localStorage.setItem("httyml.appearanceColors.v2", JSON.stringify(v3Colors));

    const migrated = readAppearance();
    expect(migrated.colors.cardHeader).toBe(appearance.colors.shadow);
    expect(migrated.colors.cardBorder).toBe(appearance.colors.border);
  });

  it("resets edits to the selected preset and exposes the full xterm palette", () => {
    const appearance = appearanceForTheme("deep-sea");
    appearance.colors.primary = "#ffffff";
    expect(resetThemeColors(appearance).colors.primary).toBe(
      THEMES.find((theme) => theme.id === "deep-sea")?.colors.primary,
    );
    expect(terminalTheme(appearance.colors).brightMagenta).toMatch(/^#/);
  });

  it("keeps every curated surface readable against its border and text roles", () => {
    for (const theme of THEMES) {
      for (const surface of [
        theme.colors.surface,
        theme.colors.surfaceContainerLowest,
        theme.colors.surfaceVariant,
      ]) {
        expect(contrastRatio(theme.colors.text, surface), `${theme.label} text`).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(theme.colors.border, surface), `${theme.label} border`).toBeGreaterThanOrEqual(3);
      }
      expect(contrastRatio(theme.colors.cardBorder, theme.colors.surfaceContainerLowest), `${theme.label} card border`).toBeGreaterThanOrEqual(3);
    }
  });
});
