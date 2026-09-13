import type { TerminalInfo } from "../lib/daemon";
import { IconPlus, IconTerminal } from "./icons";

type TerminalTabBarProps = {
  terminals: TerminalInfo[];
  activeTerminalId: string | null;
  onSelect: (terminalId: string) => void;
  onAdd: () => void;
};

export function TerminalTabBar({ terminals, activeTerminalId, onSelect, onAdd }: TerminalTabBarProps) {
  return (
    <div role="tablist" aria-label="Terminals" className="flex flex-wrap items-end gap-1.5">
      {terminals.map((terminal) => {
        const label = terminal.name ?? terminal.id.slice(0, 8);
        const isActive = terminal.id === activeTerminalId;
        return (
          <button
            key={terminal.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-label={label}
            className={isActive ? "tab tab--active" : "tab"}
            onClick={() => onSelect(terminal.id)}
          >
            <IconTerminal/>
            {label}
          </button>
        );
      })}
      <button type="button" className="btn self-end px-3.5 py-2 text-xs" onClick={onAdd}>
        <IconPlus />
        New Terminal
      </button>
    </div>
  );
}
