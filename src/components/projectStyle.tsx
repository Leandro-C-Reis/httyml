import type { ComponentType, CSSProperties } from "react";
import { IconBitcoin, IconBolt, IconBox, IconDatabase, IconDice, IconFolder, IconGamepad, IconGanesha, IconSmartphone, IconStar, IconTerminal } from "./icons";

// The daemon stores a Project's colour and icon as opaque strings and never
// interprets them (see `Project` in the daemon) — this module is the only
// place that maps those strings to actual UI.
//
// A colour is either one of the preset keys below or a raw `#rrggbb` the
// user picked themselves, which is why every colour is derived from a hex
// value here rather than from Tailwind classes: a custom colour has no
// class to name. Anything unrecognised (older state, a hand-edited config
// file) falls back to the first preset.

export type ProjectColorPreset = { key: string; label: string; hex: string };

export const PROJECT_COLORS: ProjectColorPreset[] = [
  { key: "blue", label: "Blue", hex: "#4240e5" },
  { key: "green", label: "Green", hex: "#b6f300" },
  { key: "pink", label: "Pink", hex: "#df0981" },
  { key: "orange", label: "Orange", hex: "#d97706" },
  { key: "purple", label: "Purple", hex: "#8b2bd9" },
  { key: "cyan", label: "Cyan", hex: "#0aa5b8" },
  { key: "red", label: "Red", hex: "#ba1a1a" },
  { key: "yellow", label: "Yellow", hex: "#ffd400" },
];

const HEX_PATTERN = /^#[0-9a-f]{6}$/i;

export function isCustomColor(color: string | null): color is string {
  return typeof color === "string" && HEX_PATTERN.test(color);
}

function toRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

/// Blends `hex` toward white by `amount` (0 = unchanged, 1 = white). Done in
/// JS rather than with CSS `color-mix` so it works on whatever WebKit
/// version the host happens to ship.
function lighten(hex: string, amount: number): string {
  const mixed = toRgb(hex).map((channel) =>
    Math.round(channel + (255 - channel) * amount),
  );
  return `rgb(${mixed[0]}, ${mixed[1]}, ${mixed[2]})`;
}

const INK = "#1b1b1b";
const ON_DARK = "#ffffff";

/// WCAG relative luminance (sRGB), used only to decide ink-vs-white on top
/// of a colour — presets run from near-black blues to bright yellow, and a
/// custom colour can be anything at all, so this can't be a fixed choice.
function relativeLuminance(hex: string): number {
  const [r, g, b] = toRgb(hex).map((channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(a: string, b: string): number {
  const [lighter, darker] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
}

/// Whichever of ink/white contrasts better against `hex`.
function readableOn(hex: string): string {
  return contrastRatio(hex, INK) >= contrastRatio(hex, ON_DARK) ? INK : ON_DARK;
}

export type ProjectColor = {
  key: string;
  label: string;
  hex: string;
  /// Solid accent fill (sidebar dot, swatch buttons). Carries a `color` too,
  /// so anything drawn *inside* the fill (the sidebar's project icon) stays
  /// legible on both a near-black and a bright-yellow project.
  swatch: CSSProperties;
  /// Card body tint — pale enough that ink text stays readable on it.
  tint: CSSProperties;
  /// Text colour for the accent *on an ink background* (the card header):
  /// lightened, since saturated fills don't carry as text against ink.
  onInk: CSSProperties;
};

function fromHex(key: string, label: string, hex: string): ProjectColor {
  return {
    key,
    label,
    hex,
    swatch: { backgroundColor: hex, color: readableOn(hex) },
    tint: { backgroundColor: lighten(hex, 0.86) },
    onInk: { color: lighten(hex, 0.6) },
  };
}

export function projectColor(color: string | null): ProjectColor {
  if (isCustomColor(color)) return fromHex(color, `Custom ${color}`, color);
  const preset = PROJECT_COLORS.find((c) => c.key === color) ?? PROJECT_COLORS[0];
  return fromHex(preset.key, preset.label, preset.hex);
}


export const PROJECT_ICONS: {
  key: string;
  label: string;
  Icon: ComponentType<{ className?: string }>;
}[] = [
  { key: "terminal", label: "Terminal", Icon: IconTerminal },
  { key: "folder", label: "Folder", Icon: IconFolder },
  { key: "box", label: "Box", Icon: IconBox },
  { key: "bolt", label: "Bolt", Icon: IconBolt },
  { key: "star", label: "Star", Icon: IconStar },
  { key: "database", label: "Database", Icon: IconDatabase },
  { key: "games", label: "Games", Icon: IconGamepad },
  { key: "dice", label: "Dice", Icon: IconDice },
  { key: "smartphone", label: "Smartphone", Icon: IconSmartphone },
  { key: "bitcoin", label: "Bitcoin", Icon: IconBitcoin },
  { key: "ganesha", label: "Ganesha", Icon: IconGanesha },
];

export function projectIcon(icon: string | null) {
  return PROJECT_ICONS.find((i) => i.key === icon) ?? PROJECT_ICONS[0];
}
