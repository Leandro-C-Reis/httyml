type ShortcutGuideProps = {
  /// Alt+M's move mode is on — its row is highlighted so the arrows'
  /// changed meaning is visible while it lasts.
  isMovingTab?: boolean;
};

// Most of these are handled in `App` (it owns the tab order and the active
// Terminal); Enter belongs to `TerminalView`, the only place that knows
// whether the Terminal is stopped. This list is only their visual guide, so
// a change on either side has to be mirrored here.
const SHORTCUTS: { id: string; keys: string[]; label: string }[] = [
  { id: "switch", keys: ["Alt", "←", "→"], label: "Switch terminal" },
  { id: "move", keys: ["Alt", "M"], label: "Move tab (← →, Esc)" },
  { id: "new", keys: ["Alt", "T"], label: "New terminal" },
  { id: "edit", keys: ["Alt", "E"], label: "Edit terminal" },
  { id: "stop", keys: ["Alt", "Q"], label: "Stop terminal" },
  { id: "delete", keys: ["Alt", "Del"], label: "Delete terminal" },
  { id: "start", keys: ["Enter"], label: "Start when stopped" },
];

export function ShortcutGuide({ isMovingTab = false }: ShortcutGuideProps) {
  return (
    <ul
      aria-label="Keyboard shortcuts"
      className="m-0 flex flex-wrap items-center gap-x-4 gap-y-2 border-2 border-ink bg-surface-variant px-3 py-2 list-none"
    >
      {SHORTCUTS.map(({ id, keys, label }) => {
        const active = isMovingTab && id === "move";
        return (
          <li
            key={id}
            aria-current={active ? "true" : undefined}
            className={`flex items-center gap-1.5 ${
              active ? "border-2 border-ink bg-secondary px-1.5 py-0.5" : ""
            }`}
          >
            {keys.map((key) => (
              <kbd
                key={key}
                className="border-2 border-ink bg-surface-container-lowest px-1.5 py-0.5 font-mono text-[0.6875rem] font-bold text-ink"
              >
                {key}
              </kbd>
            ))}
            <span
              className={`font-mono text-[0.6875rem] font-bold tracking-wide uppercase ${
                active ? "text-on-secondary" : "text-on-surface-variant"
              }`}
            >
              {label}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
