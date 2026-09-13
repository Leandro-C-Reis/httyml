// The app's brand palette (primary/secondary/tertiary) as Tailwind v4
// `--color-*` custom properties (see `@theme` in `App.css`) — every
// `bg-primary`/`text-secondary`/etc. utility compiles to `var(--color-*)`,
// so overriding these on the document root recolors the whole layout with
// no per-component changes. `--color-ink` and the surface/error/warning
// tokens deliberately stay out of this: per `App.css`'s own note, ink is
// the one thing every fixed-color fill assumes never changes, and
// surface/error/warning are semantic, not brand.

export type ThemeId = "terminal-core" | "sunset" | "forest" | "nightshade";

export type BackgroundPatternId =
  | "horizontal-stripes"
  | "diagonal-stripes"
  | "grid"
  | "dots"
  | "crosshatch"
  | "solid";

export type AppearancePreferences = {
  theme: ThemeId;
  terminalBackground: string;
  appBackground: string;
  backgroundPattern: BackgroundPatternId;
};

export type BackgroundPattern = {
  id: BackgroundPatternId;
  label: string;
  image: string;
  size: string;
};

export type ThemePreset = {
  id: ThemeId;
  label: string;
  colors: {
    primary: string;
    onPrimary: string;
    secondary: string;
    onSecondary: string;
    tertiary: string;
    onTertiary: string;
  };
};

export const THEMES: ThemePreset[] = [
  {
    id: "terminal-core",
    label: "Terminal Core",
    colors: {
      primary: "#4240e5",
      onPrimary: "#ffffff",
      secondary: "#b6f300",
      onSecondary: "#1b1b1b",
      tertiary: "#df0981",
      onTertiary: "#ffffff",
    },
  },
  {
    id: "sunset",
    label: "Sunset",
    colors: {
      primary: "#ea580c",
      onPrimary: "#ffffff",
      secondary: "#ffd400",
      onSecondary: "#1b1b1b",
      tertiary: "#e11d48",
      onTertiary: "#ffffff",
    },
  },
  {
    id: "forest",
    label: "Forest",
    colors: {
      primary: "#15803d",
      onPrimary: "#ffffff",
      secondary: "#a3e635",
      onSecondary: "#1b1b1b",
      tertiary: "#0aa5b8",
      onTertiary: "#ffffff",
    },
  },
  {
    id: "nightshade",
    label: "Nightshade",
    colors: {
      primary: "#8b2bd9",
      onPrimary: "#ffffff",
      secondary: "#22d3ee",
      onSecondary: "#1b1b1b",
      tertiary: "#df0981",
      onTertiary: "#ffffff",
    },
  },
];

const DEFAULT_THEME: ThemeId = "terminal-core";
const THEME_KEY = "httyml.theme";
const TERMINAL_BACKGROUND_KEY = "httyml.terminalBackground";
const APP_BACKGROUND_KEY = "httyml.appBackground";
const BACKGROUND_PATTERN_KEY = "httyml.backgroundPattern";

export const DEFAULT_APPEARANCE: AppearancePreferences = {
  theme: DEFAULT_THEME,
  terminalBackground: "#050505",
  appBackground: "#eeeeee",
  backgroundPattern: "horizontal-stripes",
};

export const BACKGROUND_PATTERNS: BackgroundPattern[] = [
  {
    id: "horizontal-stripes",
    label: "Horizontal stripes",
    image: "repeating-linear-gradient(0deg, #e2e2e2 0 2px, transparent 2px 10px)",
    size: "auto",
  },
  {
    id: "diagonal-stripes",
    label: "Diagonal stripes",
    image: "repeating-linear-gradient(45deg, #e2e2e2 0 2px, transparent 2px 10px)",
    size: "auto",
  },
  {
    id: "grid",
    label: "Grid",
    image:
      "linear-gradient(#e2e2e2 2px, transparent 2px), linear-gradient(90deg, #e2e2e2 2px, transparent 2px)",
    size: "20px 20px",
  },
  {
    id: "dots",
    label: "Dots",
    image: "radial-gradient(#e2e2e2 2px, transparent 2px)",
    size: "16px 16px",
  },
  {
    id: "crosshatch",
    label: "Crosshatch",
    image:
      "repeating-linear-gradient(45deg, #e2e2e2 0 1px, transparent 1px 8px), repeating-linear-gradient(-45deg, #e2e2e2 0 1px, transparent 1px 8px)",
    size: "auto",
  },
  { id: "solid", label: "Solid", image: "none", size: "auto" },
];

// Guarded the same way as `ProjectSidebar`'s collapsed-state read/write:
// storage isn't guaranteed to be there, and a missing store just means the
// default theme, never a crash.
export function readTheme(): ThemeId {
  try {
    const stored = globalThis.localStorage?.getItem(THEME_KEY);
    if (THEMES.some((t) => t.id === stored)) return stored as ThemeId;
  } catch {
    // fall through to the default
  }
  return DEFAULT_THEME;
}

export function writeTheme(id: ThemeId) {
  try {
    globalThis.localStorage?.setItem(THEME_KEY, id);
  } catch {
    // Preference just won't stick; nothing else depends on it.
  }
}

function readStoredHex(key: string, fallback: string): string {
  try {
    const stored = globalThis.localStorage?.getItem(key);
    return typeof stored === "string" && /^#[0-9a-f]{6}$/i.test(stored) ? stored : fallback;
  } catch {
    return fallback;
  }
}

export function readBackgroundPattern(): BackgroundPatternId {
  try {
    const stored = globalThis.localStorage?.getItem(BACKGROUND_PATTERN_KEY);
    if (BACKGROUND_PATTERNS.some((pattern) => pattern.id === stored)) {
      return stored as BackgroundPatternId;
    }
  } catch {
    // fall through to the default
  }
  return DEFAULT_APPEARANCE.backgroundPattern;
}

export function readAppearance(): AppearancePreferences {
  return {
    theme: readTheme(),
    terminalBackground: readStoredHex(
      TERMINAL_BACKGROUND_KEY,
      DEFAULT_APPEARANCE.terminalBackground,
    ),
    appBackground: readStoredHex(APP_BACKGROUND_KEY, DEFAULT_APPEARANCE.appBackground),
    backgroundPattern: readBackgroundPattern(),
  };
}

export function writeAppearance(preferences: AppearancePreferences) {
  writeTheme(preferences.theme);
  try {
    globalThis.localStorage?.setItem(TERMINAL_BACKGROUND_KEY, preferences.terminalBackground);
    globalThis.localStorage?.setItem(APP_BACKGROUND_KEY, preferences.appBackground);
    globalThis.localStorage?.setItem(BACKGROUND_PATTERN_KEY, preferences.backgroundPattern);
  } catch {
    // Preference just won't stick; nothing else depends on it.
  }
}

/// Paints `id`'s palette onto the document root. An inline style on the
/// root element beats the stylesheet rule `@theme` generated for the same
/// property, regardless of specificity — so this alone is enough to
/// override it, no `data-theme` selector or extra CSS required.
export function applyTheme(id: ThemeId) {
  const theme = THEMES.find((t) => t.id === id) ?? THEMES[0];
  const root = document.documentElement;
  root.style.setProperty("--color-primary", theme.colors.primary);
  root.style.setProperty("--color-on-primary", theme.colors.onPrimary);
  root.style.setProperty("--color-secondary", theme.colors.secondary);
  root.style.setProperty("--color-on-secondary", theme.colors.onSecondary);
  root.style.setProperty("--color-tertiary", theme.colors.tertiary);
  root.style.setProperty("--color-on-tertiary", theme.colors.onTertiary);
}

/// Reads and applies the saved appearance. Called once at bootstrap (see
/// `main.tsx`) — before React ever renders — so the first paint already has
/// the saved palette and surfaces instead of flashing the defaults.
export function applyAppearance(preferences: AppearancePreferences) {
  applyTheme(preferences.theme);
  const root = document.documentElement;
  const pattern =
    BACKGROUND_PATTERNS.find((candidate) => candidate.id === preferences.backgroundPattern) ??
    BACKGROUND_PATTERNS[0];
  root.style.setProperty("--terminal-background", preferences.terminalBackground);
  root.style.setProperty("--app-background", preferences.appBackground);
  root.style.setProperty("--app-background-pattern", pattern.image);
  root.style.setProperty("--app-background-pattern-size", pattern.size);
}

export function applyStoredTheme(): ThemeId {
  return applyStoredAppearance().theme;
}

export function applyStoredAppearance(): AppearancePreferences {
  const preferences = readAppearance();
  applyAppearance(preferences);
  return preferences;
}
