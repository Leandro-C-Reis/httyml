import type { TerminalInfo } from "../lib/daemon";
import { IconPlus } from "./icons";

type TerminalTabBarProps = {
  terminals: TerminalInfo[];
  activeTerminalId: string | null;
  onSelect: (terminalId: string) => void;
  onAdd: () => void;
};

export function TerminalTabBar({ terminals, activeTerminalId, onSelect, onAdd }: TerminalTabBarProps) {
  return (
    <div className="terminal-tab-bar" role="tablist" aria-label="Terminals">
      {terminals.map((terminal) => {
        const label = terminal.name ?? terminal.id.slice(0, 8);
        return (
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
            {label}
          </button>
        );
      })}
      <button type="button" className="tab-add-button" onClick={onAdd}>
        <IconPlus />
        New Terminal
      </button>
    </div>
  );
}
