import { useEffect, useRef, useState } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import {
  attachTerminal,
  decodeBase64,
  detachTerminal,
  getTerminalCwd,
  onTerminalOutput,
  resizeTerminal,
  restartTerminal,
  stopTerminal,
  writeTerminal,
  type DaemonMessage,
  type ProjectScript,
  type TerminalInfo,
  type TerminalState,
} from "../lib/daemon";
import { IconEdit, IconFolder, IconPlay, IconStop, IconTrash } from "./icons";
import { TerminalTabBar } from "./TerminalTabBar";
import { ShortcutGuide } from "./ShortcutGuide";
import { TerminalSideMenu } from "./TerminalSideMenu";

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
  /// Alt+M's move mode (owned by App) — passed straight through to the
  /// shortcut guide below the Terminal.
  isMovingTab?: boolean;
  /// The Project's saved scripts, for the side menu.
  scripts: ProjectScript[];
  onScriptsChange: (scripts: ProjectScript[]) => void;
  /// Whether to paint the visual CRT filter over terminal output.
  crtFilterEnabled: boolean;
  terminalBackgroundColor: string;
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
  isMovingTab,
  scripts,
  onScriptsChange,
  crtFilterEnabled,
  terminalBackgroundColor,
  onError,
}: TerminalViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  // Lets the focus effect below reach this Terminal's xterm instance —
  // it's created inside the mount effect (keyed only on terminalId, so it
  // survives tab switches and Stop/Start), while focus needs to react to
  // isActive/isRunning changing on their own.
  const termRef = useRef<Terminal | null>(null);
  const [state, setState] = useState<TerminalState>("Running");

  useEffect(() => {
    const term = new Terminal({ theme: { background: terminalBackgroundColor } });
    termRef.current = term;
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
      termRef.current = null;
    };
  }, [terminalId]);

  useEffect(() => {
    const term = termRef.current;
    if (term?.options) {
      term.options.theme = { ...term.options.theme, background: terminalBackgroundColor };
    }
  }, [terminalBackgroundColor]);

  const isRunning = state === "Running";

  function startTerminal() {
    void restartTerminal(terminalId).catch((err) =>
      onError(err instanceof Error ? err.message : String(err)),
    );
  }

  // Enter starts a stopped Terminal — the same thing the overlay's button
  // does, for the far more common case of just tapping Enter at a dead
  // shell. Only the *active* tab listens (every opened Terminal stays
  // mounted), and only while it isn't running, so a live shell never loses
  // its own Enter. Capture phase for the same reason as App's shortcuts:
  // xterm.js would otherwise consume the key first.
  const isActive = terminalId === activeTerminalId;
  useEffect(() => {
    if (isRunning || !isActive) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Enter") return;
      if (event.altKey || event.ctrlKey || event.shiftKey || event.metaKey) return;
      event.preventDefault();
      event.stopPropagation();
      startTerminal();
    }

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning, isActive, terminalId]);

  // Switching to this tab, or starting it while it's already the active
  // one, should both hand it the keyboard immediately — not require an
  // extra click into the black area first. Covers both cases in one
  // effect: `isActive` flips on a tab switch, `isRunning` flips on Start,
  // and either one firing while the other already holds re-focuses.
  useEffect(() => {
    if (isActive) {
      termRef.current?.focus();
    }
  }, [isActive, isRunning]);

  // The folder badge and side menu show where the Terminal *actually* is
  // right now, not just its configured default — `cd` changes the live
  // shell's cwd with no push notification of its own, so this polls for it.
  // Only while active and running: a hidden tab's directory isn't worth the
  // Daemon round trip, and a stopped one has no live process to read from
  // anyway (getTerminalCwd already falls back to the configured cwd there).
  const [liveCwd, setLiveCwd] = useState(cwd);
  useEffect(() => {
    setLiveCwd(cwd);
  }, [cwd]);
  useEffect(() => {
    if (!isActive || !isRunning) return;
    let cancelled = false;
    const poll = () => {
      getTerminalCwd(terminalId)
        .then((value) => {
          if (!cancelled) setLiveCwd(value);
        })
        .catch(() => {
          // Best-effort background poll — a transient failure just keeps
          // showing the last known value instead of spamming `onError`.
        });
    };
    poll();
    const interval = setInterval(poll, 1500);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [terminalId, isActive, isRunning]);

  const statusColor =
    stateVariant(state) === "running"
      ? "bg-secondary text-on-secondary"
      : stateVariant(state) === "stopped"
        ? "bg-error text-on-error"
        : "bg-warning text-white";
  const actionBtn = "btn px-3 py-1.5 text-xs";

  return (
    <div role="group" aria-label={name} className="flex min-h-0 flex-1 flex-col gap-3">
      {/* <div className="flex items-center gap-3">
        <div className="border-2 p-1 bg-surface-variant text-xs font-bold tracking-wide flex items-center gap-1.5 border-on-surface-variant text-on-surface-variant">
          <span className={`${statusColor} w-2 h-2 rounded-full border border-ink`}></span>
          <span
            data-testid="terminal-status"
            data-state={stateVariant(state)}
          >
            {stateLabel(state).toUpperCase()}
          </span>
        </div>
      </div> */}
      <TerminalTabBar
        terminals={tabs}
        activeTerminalId={activeTerminalId}
        onSelect={onSelectTab}
        onAdd={onAddTab}
      />
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="card flex min-h-0 flex-1 flex-col">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b-[4px] border-ink bg-surface-variant px-3 py-2">
            <div className="flex items-center gap-2">
              <IconFolder />
              <span className="inline-flex items-center gap-1.5 border-2 border-ink bg-surface-container-lowest px-2 py-1 font-mono text-xs font-bold tracking-wide break-all">
                {liveCwd || "~"}
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
                  onClick={startTerminal}
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
            <div
              className="absolute inset-0 p-2"
              style={{ backgroundColor: terminalBackgroundColor }}
              data-testid="terminal-view"
              ref={containerRef}
            />
            <div
              className={`pointer-events-none absolute inset-0 ${crtFilterEnabled ? "scanlines" : ""} ${!isRunning ? "bg-gray-700" : ""}`}
              aria-hidden="true"
            />
            {!isRunning && (
              <div
                data-testid="terminal-idle-overlay"
                className="absolute inset-0 flex flex-col items-center justify-center gap-3"
              >
                <span
                  data-testid="terminal-status"
                  data-state={stateVariant(state)}
                  className={`border-2 border-ink px-2 py-1 font-mono text-xs font-bold tracking-wide uppercase ${statusColor}`}
                >
                  {stateLabel(state)}
                </span>
                <button
                  type="button"
                  aria-label="Start terminal"
                  className="btn bg-secondary text-ink"
                  onClick={startTerminal}
                >
                  <IconPlay />
                  Start
                </button>
              </div>
            )}
            <TerminalSideMenu
              cwd={liveCwd}
              scripts={scripts}
              onScriptsChange={onScriptsChange}
              onRun={(command) => {
                void (async () => {
                  // A script picked from a stopped Terminal starts it first —
                  // the daemon spawns the process synchronously as part of
                  // `restart`, so the PTY is already there to receive input
                  // by the time this resolves, same as typing into a
                  // freshly-started Terminal by hand.
                  if (!isRunning) await restartTerminal(terminalId);
                  // Typed into the shell exactly as a user would, newline and
                  // all — a script is just a command line, not a side channel.
                  await writeTerminal(terminalId, `${command}\n`);
                })().catch((err) => onError(err instanceof Error ? err.message : String(err)));
              }}
              onError={onError}
            />
          </div>
        </div>
      </div>
      <ShortcutGuide isMovingTab={isMovingTab} />
    </div>
  );
}
