import type { TerminalInfo } from "../lib/daemon";

type TerminalTabBarProps = {
  terminals: TerminalInfo[];
  activeTerminalId: string | null;
  onSelect: (terminalId: string) => void;
  onDelete: (terminalId: string) => void;
};

export function TerminalTabBar({
  terminals,
  activeTerminalId,
  onSelect,
  onDelete,
}: TerminalTabBarProps) {
  return (
    <div className="terminal-tab-bar" role="tablist" aria-label="Terminals">
      {terminals.map((terminal) => {
        const label = terminal.name ?? terminal.id.slice(0, 8);
        return (
          <span
            key={terminal.id}
            className={
              terminal.id === activeTerminalId
                ? "terminal-tab-wrapper terminal-tab-wrapper--active"
                : "terminal-tab-wrapper"
            }
          >
            <button
              type="button"
              role="tab"
              aria-selected={terminal.id === activeTerminalId}
              className={
                terminal.id === activeTerminalId
                  ? "terminal-tab terminal-tab--active"
                  : "terminal-tab"
              }
              onClick={() => onSelect(terminal.id)}
            >
              {label}
            </button>
            <button
              type="button"
              className="button--danger delete-button"
              aria-label={`Delete terminal ${label}`}
              onClick={() => onDelete(terminal.id)}
            >
              &times;
            </button>
          </span>
        );
      })}
    </div>
  );
}
