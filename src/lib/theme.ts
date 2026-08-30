// The app's brand palette (primary/secondary/tertiary) as Tailwind v4
// `--color-*` custom properties (see `@theme` in `App.css`) — every
// `bg-primary`/`text-secondary`/etc. utility compiles to `var(--color-*)`,
// so overriding these on the document root recolors the whole layout with
// no per-component changes. `--color-ink` and the surface/error/warning
// tokens deliberately stay out of this: per `App.css`'s own note, ink is
// the one thing every fixed-color fill assumes never changes, and
// surface/error/warning are semantic, not brand.

export type ThemeId = "terminal-core" | "sunset" | "forest" | "nightshade";

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

/// Reads and applies whatever theme was last picked. Called once at
/// bootstrap (see `main.tsx`) — before React ever renders — so the very
/// first paint already has it instead of flashing the default palette.
export function applyStoredTheme(): ThemeId {
  const id = readTheme();
  applyTheme(id);
  return id;
}
