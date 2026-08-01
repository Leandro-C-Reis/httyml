import type { TerminalInfo } from "../lib/daemon";

type TerminalTabBarProps = {
  terminals: TerminalInfo[];
  activeTerminalId: string | null;
  onSelect: (terminalId: string) => void;
};

export function TerminalTabBar({ terminals, activeTerminalId, onSelect }: TerminalTabBarProps) {
  return (
    <div className="terminal-tab-bar" role="tablist" aria-label="Terminals">
      {terminals.map((terminal) => (
        <button
          key={terminal.id}
          type="button"
          role="tab"
          aria-selected={terminal.id === activeTerminalId}
          className={
            terminal.id === activeTerminalId ? "terminal-tab terminal-tab--active" : "terminal-tab"
          }
          onClick={() => onSelect(terminal.id)}
        >
          {terminal.name ?? terminal.id.slice(0, 8)}
        </button>
      ))}
    </div>
  );
}
