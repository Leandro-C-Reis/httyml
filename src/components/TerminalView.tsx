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

  return (
    <div className="terminal-panel">
      <div className="terminal-context">
        <h2 className="terminal-context__title">{name}</h2>
        <span
          className={`terminal-status terminal-status--${stateVariant(state)}`}
          data-testid="terminal-status"
        >
          {stateLabel(state)}
        </span>
      </div>
      <div className="terminal-workspace">
        <TerminalTabBar
          terminals={tabs}
          activeTerminalId={activeTerminalId}
          onSelect={onSelectTab}
          onAdd={onAddTab}
        />
        <div className="terminal-shell">
          <div className="terminal-shell__bar">
            <span className="terminal-shell__path">
              <IconFolder />
              {cwd || "~"}
            </span>
            <div className="terminal-shell__actions">
              <button type="button" className="button--neutral" onClick={onEdit}>
                <IconEdit />
                Edit
              </button>
              {isRunning ? (
                <button
                  type="button"
                  className="button--danger"
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
                  className="button--neutral"
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
              <button type="button" className="button--danger" onClick={onDelete}>
                <IconTrash />
                Remove
              </button>
            </div>
          </div>
          <div className="terminal-shell__output-wrap">
            <div className="terminal-shell__output" data-testid="terminal-view" ref={containerRef} />
            <div className="terminal-shell__scanlines" aria-hidden="true" />
          </div>
        </div>
      </div>
    </div>
  );
}
