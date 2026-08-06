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

function stateVariant(state: TerminalState): "running" | "stopped" | "exited" {
  if (state === "Running") return "running";
  if (state === "Stopped") return "stopped";
  return "exited";
}

function stateLabel(state: TerminalState): string {
  if (state === "Running") return "running";
  if (state === "Stopped") return "stopped";
  return `exited (${state.Exited.exit_code})`;
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
  const [state, setState] = useState<TerminalState>("Running");

  useEffect(() => {
    const term = new Terminal();
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    if (containerRef.current) {
      term.open(containerRef.current);
      fitAddon.fit();
    }

    // Only true once the very first StateChanged (whatever attach's actual
    // current state is) has been received — later transitions are real
    // lifecycle events, that first one is just attach reporting where
    // things already stood.
    let hasReceivedInitialState = false;
    const handleMessage = (msg: DaemonMessage) => {
      if (msg.type === "Scrollback" || msg.type === "Output") {
        term.write(decodeBase64(msg.data));
      } else if (msg.type === "StateChanged") {
        // A process that was killed mid-TUI (a dev server's fancy status
        // view, htop, vim, ...) rarely gets to restore the normal screen
        // buffer first — it just dies with the alternate buffer still
        // active. Since this component (and its xterm instance) doesn't
        // remount across Stop/Start, that stuck alternate-buffer state
        // would otherwise persist into the next process's output, making
        // a freshly started Terminal look blank/frozen.
        //
        // `term.reset()` would fix that too, but it wipes the *normal*
        // buffer's own content along with it — losing everything the
        // Terminal showed before Stop, unlike switching Projects away and
        // back (which remounts and replays the daemon's own scrollback).
        // Only step out of the alternate buffer if it's actually the one
        // active; the normal buffer's history is never touched.
        if (hasReceivedInitialState && msg.state === "Running" && term.buffer.active.type === "alternate") {
          term.write("\x1b[?1049l");
        }
        hasReceivedInitialState = true;
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
    // subscribed — leaving the Terminal stuck on the `useState("Running")`
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
      .then(() => {
        if (cancelled) return;
        // The ResizeObserver below only fires on later layout changes, so
        // without this the daemon would keep its 80x24 default for a
        // Terminal whose pane never changes size — and any TUI started in
        // it would draw itself at the wrong size.
        fitAddon.fit();
        void resizeTerminal(terminalId, term.rows, term.cols);
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

  const isRunning = state === "Running";
  const statusColor =
    stateVariant(state) === "running"
      ? "bg-secondary text-on-secondary"
      : stateVariant(state) === "stopped"
        ? "bg-error text-on-error"
        : "bg-warning text-white";
  const actionBtn = "btn px-3 py-1.5 text-xs";

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="flex items-center gap-3">
        <h2 className="m-0 font-display text-2xl font-bold tracking-tight uppercase">{name}</h2>
      </div>
      <div className="flex items-center gap-3">
        <div className="border-2 p-1 bg-surface-variant text-xs font-bold tracking-wide flex items-center gap-1.5 border-on-surface-variant text-on-surface-variant">
          <span className={`${statusColor} w-2 h-2 rounded-full border border-ink`}></span>
          <span
            data-testid="terminal-status"
            data-state={stateVariant(state)}
          >
            {stateLabel(state).toUpperCase()}
          </span>
        </div>
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
            <div className="flex items-center gap-2">
              <IconFolder />
              <span className="inline-flex items-center gap-1.5 border-2 border-ink bg-surface-container-lowest px-2 py-1 font-mono text-xs font-bold tracking-wide break-all">
                {cwd || "~"}
              </span>
            </div>
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
                  className={`${actionBtn} bg-secondary text-ink`}
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
            <div className={`scanlines pointer-events-none absolute inset-0 ${!isRunning ? "bg-gray-700" : ""}`} aria-hidden="true" />
          </div>
        </div>
      </div>
    </div>
  );
}
