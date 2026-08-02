import { useEffect, useRef, useState } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import {
  attachTerminal,
  decodeBase64,
  detachTerminal,
  onTerminalOutput,
  resizeTerminal,
  restartTerminal,
  stopTerminal,
  writeTerminal,
  type DaemonMessage,
  type TerminalInfo,
  type TerminalState,
} from "../lib/daemon";
import { IconEdit, IconFolder, IconPlay, IconStop, IconTrash } from "./icons";
import { TerminalTabBar } from "./TerminalTabBar";

type TerminalViewProps = {
  terminalId: string;
  name: string;
  cwd: string;
  onEdit: () => void;
  onDelete: () => void;
  tabs: TerminalInfo[];
  activeTerminalId: string | null;
  onSelectTab: (terminalId: string) => void;
  onAddTab: () => void;
  // Surfaces a failure that isn't tied to a discrete click the App-level
  // `runAction` wrapper could catch: attach happens inside this
  // component's own mount effect, and a failed Stop/Start shouldn't just
  // silently do nothing — see the "stale connection" bug this fixed.
  onError: (message: string) => void;
};

function stateVariant(state: TerminalState): "rodando" | "parado" | "encerrado" {
  if (state === "Rodando") return "rodando";
  if (state === "Parado") return "parado";
  return "encerrado";
}

function stateLabel(state: TerminalState): string {
  if (state === "Rodando") return "rodando";
  if (state === "Parado") return "parado";
  return `encerrado (${state.Encerrado.exit_code})`;
}

export function TerminalView({
  terminalId,
  name,
  cwd,
  onEdit,
  onDelete,
  tabs,
  activeTerminalId,
  onSelectTab,
  onAddTab,
  onError,
}: TerminalViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [state, setState] = useState<TerminalState>("Rodando");

  useEffect(() => {
    const term = new Terminal();
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    if (containerRef.current) {
      term.open(containerRef.current);
      fitAddon.fit();
    }

    const handleMessage = (msg: DaemonMessage) => {
      if (msg.type === "Scrollback" || msg.type === "Output") {
        term.write(decodeBase64(msg.data));
      } else if (msg.type === "StateChanged") {
        setState(msg.state);
      }
    };

    let unlisten: (() => void) | undefined;
    let cancelled = false;
    // Listener goes up BEFORE attaching, not after: attach makes the daemon
    // start forwarding output almost immediately, and a Tauri event emitted
    // before any JS-side listener exists is dropped, not queued. Attaching
    // first left a real (if narrow) window where the initial Scrollback +
    // StateChanged could arrive and vanish before `onTerminalOutput` ever
    // subscribed — leaving the Terminal stuck on the `useState("Rodando")`
    // default with no scrollback and no error, since nothing ever rejected.
    onTerminalOutput(terminalId, handleMessage)
      .then((fn) => {
        if (cancelled) {
          fn();
          return undefined;
        }
        unlisten = fn;
        return attachTerminal(terminalId);
      })
      .catch((err) => {
        onError(err instanceof Error ? err.message : String(err));
      });

    const dataDisposable = term.onData((data) => {
      void writeTerminal(terminalId, data);
    });

    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit();
      void resizeTerminal(terminalId, term.rows, term.cols);
    });
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      cancelled = true;
      resizeObserver.disconnect();
      dataDisposable.dispose();
      unlisten?.();
      // Without this, re-mounting this Terminal later (e.g. switching
      // Projects away and back) hits attach's idempotent no-op and never
      // gets its scrollback replayed — only new output after that point.
      void detachTerminal(terminalId);
      term.dispose();
    };
  }, [terminalId]);

  const isRunning = state === "Rodando";
  const statusColor =
    stateVariant(state) === "rodando"
      ? "bg-secondary text-on-secondary"
      : stateVariant(state) === "parado"
        ? "bg-error text-on-error"
        : "bg-warning text-white";
  const actionBtn = "btn px-3 py-1.5 text-xs";

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="flex items-center gap-3">
        <h2 className="m-0 font-display text-2xl font-bold tracking-tight uppercase">{name}</h2>
        <span
          data-testid="terminal-status"
          data-state={stateVariant(state)}
          className={`status-chip ${statusColor}`}
        >
          {stateLabel(state)}
        </span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col">
        <TerminalTabBar
          terminals={tabs}
          activeTerminalId={activeTerminalId}
          onSelect={onSelectTab}
          onAdd={onAddTab}
        />
        <div className="card flex min-h-0 flex-1 flex-col">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b-[4px] border-ink bg-surface-variant px-3 py-2">
            <span className="inline-flex items-center gap-1.5 border-2 border-ink bg-surface-container-lowest px-2 py-1 font-mono text-xs font-bold tracking-wide break-all">
              <IconFolder />
              {cwd || "~"}
            </span>
            <div className="flex gap-2">
              <button type="button" className={`${actionBtn} bg-surface-container-lowest text-ink`} onClick={onEdit}>
                <IconEdit />
                Edit
              </button>
              {isRunning ? (
                <button
                  type="button"
                  className={`${actionBtn} bg-error text-on-error`}
                  onClick={() =>
                    void stopTerminal(terminalId).catch((err) =>
                      onError(err instanceof Error ? err.message : String(err)),
                    )
                  }
                >
                  <IconStop />
                  Stop
                </button>
              ) : (
                <button
                  type="button"
                  className={`${actionBtn} bg-surface-container-lowest text-ink`}
                  onClick={() =>
                    void restartTerminal(terminalId).catch((err) =>
                      onError(err instanceof Error ? err.message : String(err)),
                    )
                  }
                >
                  <IconPlay />
                  Start
                </button>
              )}
              <button type="button" className={`${actionBtn} bg-error text-on-error`} onClick={onDelete}>
                <IconTrash />
                Remove
              </button>
            </div>
          </div>
          <div className="relative min-h-0 flex-1">
            <div className="absolute inset-0 bg-black p-2" data-testid="terminal-view" ref={containerRef} />
            <div className="scanlines pointer-events-none absolute inset-0" aria-hidden="true" />
          </div>
        </div>
      </div>
    </div>
  );
}
