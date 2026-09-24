export type ThemeId =
  | "terminal-core" | "sunset" | "forest" | "nightshade" | "paper" | "blueprint"
  | "midnight" | "obsidian" | "neon-noir" | "deep-sea" | "ember" | "monochrome";
export type ThemeMode = "light" | "dark";
export type BackgroundPatternId = "horizontal-stripes" | "diagonal-stripes" | "grid" | "dots" | "crosshatch" | "solid";

export type AnsiColors = {
  black: string; red: string; green: string; yellow: string; blue: string; magenta: string; cyan: string; white: string;
  brightBlack: string; brightRed: string; brightGreen: string; brightYellow: string; brightBlue: string; brightMagenta: string; brightCyan: string; brightWhite: string;
};

// A role is shared by a visual treatment, never a single component. This
// makes the entire app customisable without a per-component colour matrix.
export type ThemeColors = {
  primary: string;
  secondary: string;
  tertiary: string;
  surface: string;
  surfaceContainerLowest: string;
  surfaceVariant: string;
  border: string;
  text: string;
  shadow: string;
  cardHeader: string;
  cardBorder: string;
  onSurfaceVariant: string;
  appBackground: string;
  backgroundPattern: string;
  terminalHeader: string;
  terminalBackground: string;
  terminalForeground: string;
  terminalCursor: string;
  terminalSelection: string;
  terminalIdle: string;
  ansi: AnsiColors;
};

export type TerminalTheme = {
  background: string; foreground: string; cursor: string; selectionBackground: string;
} & AnsiColors;

export type AppearancePreferences = {
  // Manual edits override this preset. Reset restores the colours for this id.
  theme: ThemeId;
  colors: ThemeColors;
  backgroundPattern: BackgroundPatternId;
};

export type BackgroundPattern = { id: BackgroundPatternId; label: string; image: string; size: string };
export type ThemePreset = { id: ThemeId; label: string; mode: ThemeMode; colors: ThemeColors };

const LIGHT_ANSI: AnsiColors = {
  black: "#1b1b1b", red: "#ba1a1a", green: "#15803d", yellow: "#a16207", blue: "#4240e5", magenta: "#c02680", cyan: "#0e7490", white: "#f9f9f9",
  brightBlack: "#555555", brightRed: "#ef4444", brightGreen: "#65a30d", brightYellow: "#eab308", brightBlue: "#6366f1", brightMagenta: "#ec4899", brightCyan: "#06b6d4", brightWhite: "#ffffff",
};
const DARK_ANSI: AnsiColors = {
  black: "#15161b", red: "#ff6b6b", green: "#8bd450", yellow: "#ffd166", blue: "#7aa2f7", magenta: "#d6a4ff", cyan: "#63d7e6", white: "#d7dae0",
  brightBlack: "#5f6675", brightRed: "#ff8a8a", brightGreen: "#a8e878", brightYellow: "#ffe08a", brightBlue: "#9bb8ff", brightMagenta: "#e7c0ff", brightCyan: "#91ebf5", brightWhite: "#ffffff",
};

function light(overrides: Partial<Omit<ThemeColors, "ansi">> = {}): ThemeColors {
  return {
    primary: "#4240e5", secondary: "#b6f300", tertiary: "#df0981",
    surface: "#f9f9f9", surfaceContainerLowest: "#ffffff", surfaceVariant: "#e2e2e2",
    border: "#1b1b1b", text: "#1b1b1b", shadow: "#1b1b1b", cardHeader: "#1b1b1b", cardBorder: "#1b1b1b", onSurfaceVariant: "#464555", appBackground: "#eeeeee", backgroundPattern: "#e2e2e2",
    terminalHeader: "#e2e2e2", terminalBackground: "#050505", terminalForeground: "#f4f4f5",
    terminalCursor: "#b6f300", terminalSelection: "#4240e5", terminalIdle: "#3f3f46", ansi: LIGHT_ANSI, ...overrides,
  };
}
function dark(overrides: Partial<Omit<ThemeColors, "ansi">> = {}): ThemeColors {
  return {
    primary: "#8ea4ff", secondary: "#b6f300", tertiary: "#ff79c6",
    surface: "#181a20", surfaceContainerLowest: "#232631", surfaceVariant: "#343844",
    border: "#232631", text: "#f5f7ff", shadow: "#07080b", cardHeader: "#07080b", cardBorder: "#232631", onSurfaceVariant: "#bdc3d5", appBackground: "#111319", backgroundPattern: "#30344260",
    terminalHeader: "#343844", terminalBackground: "#090b10", terminalForeground: "#e8ebf5",
    terminalCursor: "#b6f300", terminalSelection: "#405487", terminalIdle: "#222634", ansi: DARK_ANSI, ...overrides,
  };
}

export const THEMES: ThemePreset[] = [
  { id: "terminal-core", label: "Terminal Core", mode: "light", colors: light() },
  { id: "obsidian", label: "Obsidian", mode: "dark", colors: dark({ primary: "#4f46e5", secondary: "#b6f300", tertiary: "#ff3358", surface: "#0f111a", surfaceContainerLowest: "#0f111a", surfaceVariant: "#161926", appBackground: "#090a0f", backgroundPattern: "#FFFFFF10", terminalHeader: "#0f111a", terminalCursor: "#facc15", terminalSelection: "#6366f1", terminalIdle: "#161926",terminalBackground: "#090a0f",border: "#2d344b", text: "#dffcff", shadow: "#1d2130", cardHeader: "#2d344b", cardBorder: "#2d344b" }) },
  { id: "paper", label: "Paper", mode: "light", colors: light({ primary: "#202020", secondary: "#f6c445", tertiary: "#d65a31", surface: "#f4efe6", surfaceContainerLowest: "#fffdf8", surfaceVariant: "#e5ddcf", appBackground: "#e9e0d2", backgroundPattern: "#cfc1ae60", terminalHeader: "#e5ddcf" }) },
  { id: "blueprint", label: "Blueprint", mode: "light", colors: light({ primary: "#075985", secondary: "#67e8f9", tertiary: "#f97316", surface: "#eef8ff", surfaceVariant: "#cfe8f7", appBackground: "#dbeffc", backgroundPattern: "#9fc6df45", terminalHeader: "#cfe8f7" }) },
  { id: "midnight", label: "Midnight", mode: "dark", colors: dark() },
  { id: "neon-noir", label: "Neon Noir", mode: "dark", colors: dark({ primary: "#00d4ff", secondary: "#d7ff00", tertiary: "#ff3cac", surface: "#15101c", surfaceContainerLowest: "#241b2e", surfaceVariant: "#382a48", appBackground: "#0c0811", backgroundPattern: "#3c2d5050", terminalHeader: "#382a48", terminalCursor: "#d7ff00", terminalSelection: "#4a3a89", border: "#382a48", cardBorder: "#382a48", cardHeader: "#382a48" }) },
  { id: "deep-sea", label: "Deep Sea", mode: "dark", colors: dark({ primary: "#38bdf8", secondary: "#5eead4", tertiary: "#fb7185", surface: "#09212a", surfaceContainerLowest: "#12313b", surfaceVariant: "#20505c", appBackground: "#06171d", backgroundPattern: "#22505b30", terminalHeader: "#20505c", terminalCursor: "#5eead4", terminalSelection: "#1d5a6d", border: "#1d5a6d", cardBorder: "#1d5a6d", cardHeader: "#20505c" }) },
  { id: "ember", label: "Ember", mode: "dark", colors: dark({ primary: "#fb923c", secondary: "#facc15", tertiary: "#f43f5e", surface: "#25150f", surfaceContainerLowest: "#251710", surfaceVariant: "#593722", appBackground: "#160b07", backgroundPattern: "#5a392630", terminalHeader: "#593722", terminalCursor: "#facc15", terminalSelection: "#7b3f2a", border: "#5a3926", cardBorder: "#5a3926", cardHeader: "#593722" }) },
  { id: "monochrome", label: "Monochrome", mode: "dark", colors: dark({ primary: "#f4f4f5", secondary: "#a1a1aa", tertiary: "#d4d4d8", surface: "#18181b", surfaceContainerLowest: "#27272a", surfaceVariant: "#3f3f46", appBackground: "#09090b", backgroundPattern: "#34343830", terminalHeader: "#3f3f46", terminalCursor: "#f4f4f5", terminalSelection: "#52525b", border: "#3f3f46", cardBorder: "#3f3f46", cardHeader: "#3f3f46" }) },
];

const DEFAULT_THEME: ThemeId = "terminal-core";
const THEME_KEY = "httyml.theme";
const COLORS_KEY = "httyml.appearanceColors.v2";
const TERMINAL_BACKGROUND_KEY = "httyml.terminalBackground";
const APP_BACKGROUND_KEY = "httyml.appBackground";
const BACKGROUND_PATTERN_KEY = "httyml.backgroundPattern";
const HEX_PATTERN = /^#[0-9a-f]{6}$/i;

export const BACKGROUND_PATTERNS: BackgroundPattern[] = [
  { id: "horizontal-stripes", label: "Horizontal stripes", image: "repeating-linear-gradient(0deg, var(--app-background-pattern-color) 0 2px, transparent 2px 10px)", size: "auto" },
  { id: "diagonal-stripes", label: "Diagonal stripes", image: "repeating-linear-gradient(45deg, var(--app-background-pattern-color) 0 2px, transparent 2px 10px)", size: "auto" },
  { id: "grid", label: "Grid", image: "linear-gradient(var(--app-background-pattern-color) 2px, transparent 2px), linear-gradient(90deg, var(--app-background-pattern-color) 2px, transparent 2px)", size: "20px 20px" },
  { id: "dots", label: "Dots", image: "radial-gradient(var(--app-background-pattern-color) 2px, transparent 2px)", size: "16px 16px" },
  { id: "crosshatch", label: "Crosshatch", image: "repeating-linear-gradient(45deg, var(--app-background-pattern-color) 0 1px, transparent 1px 8px), repeating-linear-gradient(-45deg, var(--app-background-pattern-color) 0 1px, transparent 1px 8px)", size: "auto" },
  { id: "solid", label: "Solid", image: "none", size: "auto" },
];

export const DEFAULT_APPEARANCE: AppearancePreferences = {
  theme: DEFAULT_THEME, colors: cloneColors(THEMES[0].colors), backgroundPattern: "horizontal-stripes",
};

export function isHexColor(value: string): boolean { return HEX_PATTERN.test(value); }
function cloneColors(colors: ThemeColors): ThemeColors { return { ...colors, ansi: { ...colors.ansi } }; }
function preset(id: ThemeId): ThemePreset { return THEMES.find((theme) => theme.id === id) ?? THEMES[0]; }

export function appearanceForTheme(theme: ThemeId, backgroundPattern = DEFAULT_APPEARANCE.backgroundPattern): AppearancePreferences {
  return { theme, colors: cloneColors(preset(theme).colors), backgroundPattern };
}
export function resetThemeColors(preferences: AppearancePreferences): AppearancePreferences {
  return { ...preferences, colors: cloneColors(preset(preferences.theme).colors) };
}
export function readTheme(): ThemeId {
  try { const stored = globalThis.localStorage?.getItem(THEME_KEY); if (THEMES.some((theme) => theme.id === stored)) return stored as ThemeId; } catch { /* default */ }
  return DEFAULT_THEME;
}
export function writeTheme(id: ThemeId) {
  try { globalThis.localStorage?.setItem(THEME_KEY, id); } catch { /* preferences are non-critical */ }
}
function readStoredHex(key: string, fallback: string): string {
  try { const stored = globalThis.localStorage?.getItem(key); return typeof stored === "string" && isHexColor(stored) ? stored : fallback; } catch { return fallback; }
}
export function readBackgroundPattern(): BackgroundPatternId {
  try { const stored = globalThis.localStorage?.getItem(BACKGROUND_PATTERN_KEY); if (BACKGROUND_PATTERNS.some((pattern) => pattern.id === stored)) return stored as BackgroundPatternId; } catch { /* default */ }
  return DEFAULT_APPEARANCE.backgroundPattern;
}
function isAnsiColors(value: unknown): value is AnsiColors {
  return !!value && typeof value === "object" && Object.values(value).length === 16 && Object.values(value).every((color) => typeof color === "string" && isHexColor(color));
}
export function isThemeColors(value: unknown): value is ThemeColors {
  if (!value || typeof value !== "object") return false;
  const colors = value as Record<string, unknown>;
  const keys: Array<Exclude<keyof ThemeColors, "ansi">> = ["primary", "secondary", "tertiary", "surface", "surfaceContainerLowest", "surfaceVariant", "border", "text", "shadow", "cardHeader", "cardBorder", "onSurfaceVariant", "appBackground", "backgroundPattern", "terminalHeader", "terminalBackground", "terminalForeground", "terminalCursor", "terminalSelection", "terminalIdle"];
  return keys.every((key) => typeof colors[key] === "string" && isHexColor(colors[key])) && isAnsiColors(colors.ansi);
}

/** Migrates palettes created before card colors were independently configurable. */
export function normalizeThemeColors(value: unknown): ThemeColors | null {
  if (isThemeColors(value)) return cloneColors(value);
  if (!value || typeof value !== "object") return null;

  const legacy = value as Record<string, unknown>;
  const sharedInk = typeof legacy.ink === "string" && isHexColor(legacy.ink) ? legacy.ink : null;
  const border = typeof legacy.border === "string" && isHexColor(legacy.border) ? legacy.border : sharedInk;
  const text = typeof legacy.text === "string" && isHexColor(legacy.text) ? legacy.text : sharedInk;
  const shadow = typeof legacy.shadow === "string" && isHexColor(legacy.shadow) ? legacy.shadow : sharedInk;
  if (!border || !text || !shadow) return null;

  const migrated = {
    ...legacy,
    border,
    text,
    shadow,
    cardHeader: typeof legacy.cardHeader === "string" && isHexColor(legacy.cardHeader) ? legacy.cardHeader : shadow,
    cardBorder: typeof legacy.cardBorder === "string" && isHexColor(legacy.cardBorder) ? legacy.cardBorder : border,
  };
  return isThemeColors(migrated) ? cloneColors(migrated) : null;
}
function readStoredColors(fallback: ThemeColors): ThemeColors {
  try { const stored = globalThis.localStorage?.getItem(COLORS_KEY); const parsed: unknown = stored ? JSON.parse(stored) : null; return normalizeThemeColors(parsed) ?? fallback; } catch { return fallback; }
}
export function readAppearance(): AppearancePreferences {
  const theme = readTheme();
  const legacy = cloneColors(preset(theme).colors);
  legacy.terminalBackground = readStoredHex(TERMINAL_BACKGROUND_KEY, legacy.terminalBackground);
  legacy.appBackground = readStoredHex(APP_BACKGROUND_KEY, legacy.appBackground);
  return { theme, colors: readStoredColors(legacy), backgroundPattern: readBackgroundPattern() };
}
export function writeAppearance(preferences: AppearancePreferences) {
  try {
    globalThis.localStorage?.setItem(THEME_KEY, preferences.theme);
    globalThis.localStorage?.setItem(COLORS_KEY, JSON.stringify(preferences.colors));
    globalThis.localStorage?.setItem(TERMINAL_BACKGROUND_KEY, preferences.colors.terminalBackground);
    globalThis.localStorage?.setItem(APP_BACKGROUND_KEY, preferences.colors.appBackground);
    globalThis.localStorage?.setItem(BACKGROUND_PATTERN_KEY, preferences.backgroundPattern);
  } catch { /* preferences are non-critical */ }
}
function relativeLuminance(hex: string): number {
  const values = [hex.slice(1, 3), hex.slice(3, 5), hex.slice(5, 7)].map((part) => { const value = parseInt(part, 16) / 255; return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * values[0] + 0.7152 * values[1] + 0.0722 * values[2];
}
export function contrastRatio(first: string, second: string): number {
  const [lightness, darkness] = [relativeLuminance(first), relativeLuminance(second)].sort((a, b) => b - a);
  return (lightness + 0.05) / (darkness + 0.05);
}
function readableOn(background: string): string { return contrastRatio(background, "#111111") >= contrastRatio(background, "#ffffff") ? "#111111" : "#ffffff"; }
function applyPalette(colors: ThemeColors) {
  const root = document.documentElement;
  const set = (name: string, value: string) => root.style.setProperty(name, value);
  set("--color-primary", colors.primary); set("--color-on-primary", readableOn(colors.primary));
  set("--color-secondary", colors.secondary); set("--color-on-secondary", readableOn(colors.secondary));
  set("--color-tertiary", colors.tertiary); set("--color-on-tertiary", readableOn(colors.tertiary));
  set("--color-surface", colors.surface); set("--color-surface-container-lowest", colors.surfaceContainerLowest);
  set("--color-surface-variant", colors.surfaceVariant); set("--color-on-surface-variant", colors.onSurfaceVariant);
  set("--color-border", colors.border); set("--color-text", colors.text); set("--color-ink", colors.border);
  set("--color-card-header", colors.cardHeader); set("--color-card-border", colors.cardBorder);
  set("--color-hard-shadow", colors.shadow);
  set("--color-terminal-header", colors.terminalHeader); set("--color-terminal-idle", colors.terminalIdle);
  set("--terminal-background", colors.terminalBackground); set("--terminal-foreground", colors.terminalForeground);
  set("--terminal-cursor", colors.terminalCursor); set("--terminal-selection", colors.terminalSelection);
  set("--app-background", colors.appBackground); set("--app-background-pattern-color", colors.backgroundPattern);
}
export function applyTheme(id: ThemeId) { applyPalette(preset(id).colors); }
export function applyAppearance(preferences: AppearancePreferences) {
  applyPalette(preferences.colors);
  const pattern = BACKGROUND_PATTERNS.find((candidate) => candidate.id === preferences.backgroundPattern) ?? BACKGROUND_PATTERNS[0];
  document.documentElement.style.setProperty("--app-background-pattern", pattern.image);
  document.documentElement.style.setProperty("--app-background-pattern-size", pattern.size);
}
export function terminalTheme(colors: ThemeColors): TerminalTheme {
  return { background: colors.terminalBackground, foreground: colors.terminalForeground, cursor: colors.terminalCursor, selectionBackground: colors.terminalSelection, ...colors.ansi };
}
export function applyStoredTheme(): ThemeId { return applyStoredAppearance().theme; }
export function applyStoredAppearance(): AppearancePreferences { const preferences = readAppearance(); applyAppearance(preferences); return preferences; }
