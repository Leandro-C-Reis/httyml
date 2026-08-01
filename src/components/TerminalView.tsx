import { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import {
  attachTerminal,
  decodeBase64,
  onTerminalOutput,
  resizeTerminal,
  writeTerminal,
  type DaemonMessage,
} from "../lib/daemon";

type TerminalViewProps = {
  terminalId: string;
};

export function TerminalView({ terminalId }: TerminalViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

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

  return <div className="terminal-view" data-testid="terminal-view" ref={containerRef} />;
}
