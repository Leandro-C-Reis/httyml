import { beforeEach, describe, expect, it } from "vitest";
import { applyTheme, readTheme, THEMES, writeTheme } from "./theme";

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
      expect(root.getPropertyValue("--color-on-primary")).toBe(theme.colors.onPrimary);
      expect(root.getPropertyValue("--color-secondary")).toBe(theme.colors.secondary);
      expect(root.getPropertyValue("--color-on-secondary")).toBe(theme.colors.onSecondary);
      expect(root.getPropertyValue("--color-tertiary")).toBe(theme.colors.tertiary);
      expect(root.getPropertyValue("--color-on-tertiary")).toBe(theme.colors.onTertiary);
    }
  });

  it("falls back to the first theme for an unknown id", () => {
    // @ts-expect-error deliberately passing an id outside the ThemeId union
    applyTheme("not-a-real-theme");
    expect(document.documentElement.style.getPropertyValue("--color-primary")).toBe(
      THEMES[0].colors.primary,
    );
  });
});
