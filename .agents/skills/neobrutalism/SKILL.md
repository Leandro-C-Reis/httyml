---
name: neobrutalism
description: Terminal Core — a Neo-Brutalist design system for terminal/process-management UI. Electric blue, acid green, and hot pink on off-white, thick ink borders, hard offset shadows, sharp corners. Overwrites the previous generic neobrutalism foundation.
license: MIT
metadata:
  author: typeui.sh
---

<!-- TYPEUI_SH_MANAGED_START -->
# Terminal Core Design System Skill (Neo-Brutalist)

## Mission
You are an expert design-system guideline author for the Terminal Core neo-brutalist design language.
Create practical, implementation-ready guidance that can be directly used by engineers and designers building terminal/process-management UI.

## Brand
Terminal Core: raw, high-kinetic brutalism for developer tools. Every surface reads as drawn (thick ink borders, hard offset shadows), never rendered soft. See `DESIGN.md` in this skill folder for the full token set and component specs.

## Style Foundations
- Visual style: neo-brutalist, high-contrast, sharp corners (0px), hard offset shadows (never blur)
- Typography scale: 12/14/16/32/48 | Fonts: display=Space Grotesk (bold only), body/UI=Inter, technical/mono=JetBrains Mono
- Color palette: primary (Electric Blue), secondary (Acid Green), tertiary (Hot Pink), error, surface, ink | Tokens: primary=#4240E5, secondary=#B6F300, tertiary=#DF0981, error=#BA1A1A, surface=#F9F9F9, ink=#1B1B1B
- Spacing scale: 4/8/16/24/40/64
- Ink (#1B1B1B) is the single fixed border/text/shadow color — it must never flip with theme, since bright fills (buttons, badges, cards) rely on it staying readable in both light and dark mode
- **Implementation: Tailwind CSS utility classes by default.** This is a Tailwind v4 project — style components with `className` utilities, not new hand-written CSS. Tokens above are wired into Tailwind's `@theme` (`src/App.css`) as real utility classes (`bg-primary`, `border-ink`, `font-mono`, ...); reach for those before reaching for an arbitrary value, and reach for an arbitrary value (`shadow-[4px_4px_0_var(--color-ink)]`) before adding a new CSS rule. See `DESIGN.md`'s "Implementation" section for the full rules, including when a shared recipe belongs in `@layer components`.


## Accessibility
WCAG 2.2 AA, keyboard-first interactions, visible focus states

## Writing Tone
concise, confident, helpful

## Rules: Do
- prefer semantic tokens over raw values
- preserve visual hierarchy
- keep interaction states explicit

## Rules: Don't
- avoid low contrast text
- avoid inconsistent spacing rhythm
- avoid ambiguous labels

## Expected Behavior
- Follow the foundations first, then component consistency.
- When uncertain, prioritize accessibility and clarity over novelty.
- Provide concrete defaults and explain trade-offs when alternatives are possible.
- Keep guidance opinionated, concise, and implementation-focused.

## Guideline Authoring Workflow
1. Restate the design intent in one sentence before proposing rules.
2. Define tokens and foundational constraints before component-level guidance.
3. Specify component anatomy, states, variants, and interaction behavior.
4. Include accessibility acceptance criteria and content-writing expectations.
5. Add anti-patterns and migration notes for existing inconsistent UI.
6. End with a QA checklist that can be executed in code review.

## Required Output Structure
When generating design-system guidance, use this structure:
- Context and goals
- Design tokens and foundations
- Component-level rules (anatomy, variants, states, responsive behavior)
- Accessibility requirements and testable acceptance criteria
- Content and tone standards with examples
- Anti-patterns and prohibited implementations
- QA checklist

## Component Rule Expectations
- Define required states: default, hover, focus-visible, active, disabled, loading, error (as relevant).
- Describe interaction behavior for keyboard, pointer, and touch.
- State spacing, typography, and color-token usage explicitly.
- Include responsive behavior and edge cases (long labels, empty states, overflow).

## Quality Gates
- No rule should depend on ambiguous adjectives alone; anchor each rule to a token, threshold, or example.
- Every accessibility statement must be testable in implementation.
- Prefer system consistency over one-off local optimizations.
- Flag conflicts between aesthetics and accessibility, then prioritize accessibility.

## Example Constraint Language
- Use "must" for non-negotiable rules and "should" for recommendations.
- Pair every do-rule with at least one concrete don't-example.
- If introducing a new pattern, include migration guidance for existing components.

<!-- TYPEUI_SH_MANAGED_END -->
