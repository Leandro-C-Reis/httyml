import { useEffect, useRef, useState } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import {
  attachTerminal,
  decodeBase64,
  onTerminalOutput,
  resizeTerminal,
  restartTerminal,
  stopTerminal,
  writeTerminal,
  type DaemonMessage,
  type TerminalState,
} from "../lib/daemon";

type TerminalViewProps = {
  terminalId: string;
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

export function TerminalView({ terminalId }: TerminalViewProps) {
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
    attachTerminal(terminalId)
      .then(() => onTerminalOutput(terminalId, handleMessage))
      .then((fn) => {
        unlisten = fn;
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
      resizeObserver.disconnect();
      dataDisposable.dispose();
      unlisten?.();
      term.dispose();
    };
  }, [terminalId]);

  const isRunning = state === "Rodando";

  return (
    <div className="terminal-panel">
      <div className="terminal-toolbar">
        <span
          className={`terminal-status terminal-status--${stateVariant(state)}`}
          data-testid="terminal-status"
        >
          {stateLabel(state)}
        </span>
        {isRunning ? (
          <button
            type="button"
            className="button--danger"
            onClick={() => void stopTerminal(terminalId)}
          >
            Stop
          </button>
        ) : (
          <button
            type="button"
            className="button--success"
            onClick={() => void restartTerminal(terminalId)}
          >
            Restart
          </button>
        )}
      </div>
      <div className="terminal-view" data-testid="terminal-view" ref={containerRef} />
    </div>
  );
}
