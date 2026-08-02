---
name: Terminal Core
colors:
  primary: "#4240E5"
  on-primary: "#FFFFFF"
  secondary: "#B6F300"
  on-secondary: "#1B1B1B"
  tertiary: "#DF0981"
  on-tertiary: "#FFFFFF"
  error: "#BA1A1A"
  on-error: "#FFFFFF"
  warning: "#D97706"
  surface: "#F9F9F9"
  surface-container-lowest: "#FFFFFF"
  surface-variant: "#E2E2E2"
  on-surface-variant: "#464555"
  primary-fixed: "#E1DFFF"
  tertiary-fixed: "#FFD9E3"
  ink: "#1B1B1B"
typography:
  display-lg:
    fontFamily: "Space Grotesk"
    fontSize: 3rem
    fontWeight: "700"
    lineHeight: "1.1"
    letterSpacing: "-0.02em"
  headline-lg:
    fontFamily: "Space Grotesk"
    fontSize: 2rem
    fontWeight: "700"
    lineHeight: "1.2"
  body-md:
    fontFamily: "Inter"
    fontSize: 1rem
    fontWeight: "400"
    lineHeight: "1.5"
  terminal-code:
    fontFamily: "JetBrains Mono"
    fontSize: 0.875rem
    fontWeight: "500"
    lineHeight: "1.6"
  label-caps:
    fontFamily: "JetBrains Mono"
    fontSize: 0.75rem
    fontWeight: "700"
    lineHeight: "1.0"
    letterSpacing: "0.05em"
rounded:
  default: 0px
  badge: 2px
spacing:
  base: 4px
  xs: 8px
  sm: 16px
  md: 24px
  lg: 40px
  xl: 64px
  border-width: 3px
  border-width-thick: 4px
  shadow-offset: 4px
  shadow-offset-lg: 8px
---

## Overview

**Terminal Core** — a Neo-Brutalist design system for high-performance terminal and process management tools. Built for developers and sysadmins: raw honesty, structural clarity, high-impact contrast. Replaces the previous generic `neobrutalism` foundation.

## Style Foundations

- **Visual style:** brutalist, high-kinetic, high-contrast. Thick unrelenting black borders define the grid; no soft shadows, no gradients.
- **Typography scale:** 12 / 14 / 16 / 32 / 48 (label-caps / terminal-code / body-md / headline-lg / display-lg)
- **Typography fonts:** display=Space Grotesk (bold only), body/UI=Inter, technical/mono=JetBrains Mono
- **Color palette:** primary (electric blue), secondary (acid green), tertiary (hot pink), error, surface, ink
- **Spacing scale:** 4 / 8 / 16 / 24 / 40 / 64
- **Corners:** sharp, 0px, everywhere except tiny badges (2px max)
- **Depth:** hard offset shadows only, never blur

## Colors

- **Primary — Electric Blue `#4240E5`, on-primary `#FFFFFF`:** core actions — primary CTAs (New Project, New Terminal, Save).
- **Secondary — Acid Green `#B6F300`, on-secondary `#1B1B1B`:** success states, active/running processes, the active nav item.
- **Tertiary — Hot Pink `#DF0981`, on-tertiary `#FFFFFF`:** alerts and critical system notifications (the global error banner lives here — never confuse this with `error`).
- **Error `#BA1A1A`, on-error `#FFFFFF`:** stopped/failed terminal state, destructive action confirmation.
- **Surface `#F9F9F9`:** page background. **Surface containers** (`#EEEEEE` / `#E8E8E8` / `#E2E2E2`) stack for nested chrome (stat bars, toolbars) without ever softening the border-drawn hierarchy.
- **Ink `#1B1B1B`:** the one and only border/text/shadow color. Never theme-dependent — a bright surface (button, badge, card) always carries ink text, in light or dark mode. This is the rule the old system broke (yellow buttons went invisible in dark mode); it must not regress.
- **On-surface-variant `#464555`:** muted/secondary text (descriptions, timestamps, captions) — never for anything interactive.

## Typography

- **Display/Headlines — Space Grotesk, bold only:** page titles, project names, section headers. Always uppercase with tight tracking (`-0.02em` display, tight on headline) to read as stenciled/stamped rather than typed.
- **Interface text — Inter:** descriptions, form labels' prose, body copy. Regular weight; 600 for emphasis only.
- **Technical content — JetBrains Mono:** terminal output, file paths, cwd, PIDs, timestamps, status chips, section eyebrows (`label-caps`: 12px, 700 weight, uppercase, 0.05em tracking). Anything that is data or system state, not authored prose, goes in mono.

## Layout & Spacing

- **Grid:** content area uses generous whitespace; sidebar rail is fixed-width, main content fluid.
- **Margins:** 40px outer margin on desktop (`lg` token), collapsing to 16px on mobile.
- **Rhythm:** 4px baseline; `md` (24px) is the default internal container padding.
- **Breakpoints:** mobile < 600px, tablet 600–1024px, desktop > 1024px.

## Elevation & Depth

- **Hard shadows only:** solid `--tc-ink` at 100% opacity, offset 4px (default) to 8px (cards), never blurred.
- **Hover:** element moves -2px/-2px, shadow grows to 6px.
- **Active/press:** element moves to fully overlap the shadow (+4px/+4px for buttons, matching the original offset), shadow disappears — a physical "click into the page."
- **Stacking:** deeper elevation = larger offset, never a blur radius.

## Shapes

- **0px corners** everywhere: buttons, inputs, cards, containers.
- **Exception:** status dots and tiny badges may use up to 2px radius if legibility demands it — never the default.
- **Borders:** minimum 2px ink border on every container; primary containers (cards, the terminal window chrome) use 3–4px.

## Components

### Buttons
- Solid fill, 3px ink border, sharp corners, 4px hard shadow. Fill communicates weight, not just brand:
  - **Primary (Electric Blue):** the one main call-to-action per view (New Project, New Terminal, Save).
  - **Neutral (white/surface, ink text):** routine/utility actions that aren't the main CTA and aren't destructive (Restart, Clear, Cancel) — bordered and shadowed like every other button, just uncolored.
  - **Error (red):** destructive or state-stopping actions (Stop, Delete).
  - Acid green is reserved for status (running/live), not as a generic "success" button fill — don't reach for it just because an action feels positive.
- Hover: -2px/-2px translate, shadow → 6px.
- Active: +4px/+4px translate (snaps to the shadow), shadow → 0.
- Disabled: 50% opacity, no shadow, no hover/active transform.
- Text is always ink-safe for the fill it sits on (white on blue/pink/error, ink on acid green or neutral white).

### Cards / Windows
- White or tinted surface, 4px ink border, 8px hard shadow.
- Header bar: solid accent-color band with a bottom border, holding a path/id in `terminal-code` or `label-caps`. Where the header represents an actual window (not just a card), lead with 3 solid ink squares (not colored traffic-light dots — that's a macOS idiom, not this system's) before the label.

### Inputs
- White background, 2px ink border, sharp corners.
- Focus: border → 3px, plus a hard-offset (not blurred) primary-color halo — never a soft glow.
- Value text in `terminal-code` when the value is a technical value (paths, commands); `body-md`/Inter for names and prose.

### Status Chips
- Small rectangles, 2px border, `label-caps` text, solid bright fill: acid green = running/live, error red = stopped/failed, hot pink or amber = exited/attention.

### Tabs / Nav
- Active: acid green fill (nav item or content tab alike — one active color across the system, not one per context), ink border, ink text. No hard shadow: tabs are markers, not buttons — they read as physically attached to the shell/content below, not floating above the page.
- Inactive: transparent fill, transparent border; on hover the border/shadow-free background just shifts to a light tint (surface-variant) — no lift, no shadow, so hover never reads as the button affordance.

## Implementation

- **Default to Tailwind CSS utility classes** in JSX (`className="..."`) — this is a Tailwind v4 project (`@tailwindcss/vite`), not hand-written component CSS. Do not add new rules to `App.css` for a single component; express layout, spacing, color, and typography as utilities on the element itself.
- **Theme tokens live in `src/App.css`'s `@theme` block** and are consumed as ordinary Tailwind utilities — `bg-primary`, `text-on-primary`, `border-ink`, `bg-surface-variant`, `font-display`, `font-mono`, etc. Never hardcode a hex value in a component; if a token you need doesn't exist yet, add it to `@theme` first.
- **Hard shadows and thick borders are arbitrary values**, e.g. `shadow-[4px_4px_0_var(--color-ink)]`, `border-[3px]` — Tailwind's default border/shadow scales don't cover this system's offsets, and that's expected; arbitrary values are the correct tool here, not a workaround.
- **`rounded-none`** everywhere sharp corners are required (which is everywhere except the 2px badge exception above).
- **Extract to `@layer components` only for genuinely repeated multi-property recipes** — buttons (`.btn`), tabs (`.tab`/`.tab--active`), form fields (`.field`), cards/windows (`.card`), status chips (`.status-chip`) already exist there; reuse them rather than re-deriving the recipe inline. Everything else (one-off layout, spacing, a single component's unique structure) stays as inline utilities in JSX — don't grow `@layer components` for something used once.
- **Utilities always win over `@layer components`** regardless of class order (Tailwind's layer order is base → components → utilities), so a variant like `bg-error text-on-error` can safely follow `.btn` in the same `className` string to override its default fill.
