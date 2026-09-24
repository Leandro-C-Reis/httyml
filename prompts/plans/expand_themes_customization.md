# Expanded color profiles for the full application

  ## Summary

  Replace the current accent-only theme system with 12 complete light/dark profiles plus a live editor for every meaningful UI and terminal color role. Themes remain local
  display preferences, apply immediately, and retain backward-compatible settings/backup support.

  ## Theme model and persistence

  - Expand AppearancePreferences with a complete ThemeColors palette: brand accents; surfaces; muted text; app background/pattern; border/text/hard-shadow ink; Terminal
    View header, background, foreground, cursor, selection and idle overlay; and the 16 ANSI terminal colors.

  - Keep the current four profiles unchanged, then add Paper, Blueprint, Midnight, Obsidian, Neon Noir, Deep Sea, Ember, and Monochrome. Every profile includes light/dark
    metadata, full UI tokens, and a complete terminal palette.

  - Selecting a preset replaces all palette values. Editing a color creates overrides on top of the selected preset; a “Reset palette” action restores that preset.
  - Persist the expanded palette in a versioned local preference while reading the existing theme, terminal-background, and app-background keys as a migration fallback.
  - Export the full versioned appearance object while retaining existing flat backup fields. Import prefers the new object and gracefully reconstructs a palette from legacy
    backups.

  ## Rendering and interface

  - Apply palette values to document-level CSS variables, including the border/shadow token, so title bar, sidebar, cards, fields, tabs, buttons, terminal header,
    backgrounds, and hard shadows recolor consistently.

  - Replace remaining application-owned fixed colors (white/gray/black/lime/blue) with semantic tokens. Preserve project-specific colors and the official VS Code icon
    colors because they represent content/brand identity rather than the app palette.

  - Pass the terminal palette directly to xterm, so foreground, cursor, selection, and ANSI output match the active theme.
  - Make background pattern strokes inherit a configurable pattern-color token rather than a fixed gray.
  - Expand Settings → Appearance with:
      - All/Light/Dark preset filtering and richer palette previews.
      - Grouped color editors for Brand, Surfaces & Borders, Application Background, Terminal Frame, and collapsible ANSI Terminal Palette.
      - A color picker plus editable hexadecimal value for every role, immediate preview, reset action, and accessible labels.

  - Keep semantic error/warning colors fixed. Derive foreground colors for accent fills automatically for readable contrast; show a non-blocking contrast warning if a
    custom surface/border combination falls below AA contrast.

  ## Test plan

  - Verify all 12 profiles are selectable, persist through reload, and apply their UI/terminal CSS variables.
  - Verify an edited role applies immediately, survives reload/export/import, and resets to the selected preset.
  - Verify legacy local preferences and legacy backups still restore their theme, app background, terminal background, and pattern.
  - Verify Terminal View receives the complete xterm palette and terminal header/idle states use the new tokens.
  - Verify every curated preset meets contrast requirements for text, interactive fills, and borders.

  ## Assumptions

  - There are no named custom profiles; users customize the currently selected preset.
  - Theme preferences stay local to the device and are carried in backups, without changing daemon or project data.
  - The neo-brutalist shape, typography, and hard-shadow treatment remain unchanged; only their semantic colors become configurable.