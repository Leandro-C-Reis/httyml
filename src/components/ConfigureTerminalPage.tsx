import { useState, type FormEvent } from "react";
import type { CreateTerminalOptions } from "../lib/daemon";
import { IconCheck, IconFolder, IconX } from "./icons";

export type ConfigureTerminalInitial = {
  name: string;
  cwd: string;
  startupCommand: string;
  envVars: Record<string, string>;
  shell: string;
  scrollbackLines: string;
};

type ConfigureTerminalPageProps = {
  mode: "create" | "edit";
  defaultCwd: string;
  defaultName: string;
  initial?: ConfigureTerminalInitial;
  onCancel: () => void;
  onSubmit: (cwd: string, options: CreateTerminalOptions) => void;
};

function parseEnvVars(text: string): Record<string, string> {
  const envVars: Record<string, string> = {};
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;
    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    if (key) envVars[key] = value;
  }
  return envVars;
}

function formatEnvVars(envVars: Record<string, string>): string {
  return Object.entries(envVars)
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
}

export function ConfigureTerminalPage({
  mode,
  defaultCwd,
  defaultName,
  initial,
  onCancel,
  onSubmit,
}: ConfigureTerminalPageProps) {
  const [cwd, setCwd] = useState(initial?.cwd ?? defaultCwd);
  const [name, setName] = useState(initial?.name ?? "");
  const [startupCommand, setStartupCommand] = useState(initial?.startupCommand ?? "");
  const [envVarsText, setEnvVarsText] = useState(
    initial?.envVars ? formatEnvVars(initial.envVars) : "",
  );
  const [shell, setShell] = useState(initial?.shell ?? "");
  const [scrollbackLines, setScrollbackLines] = useState(initial?.scrollbackLines ?? "");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onSubmit(cwd.trim(), {
      name: name.trim(),
      startupCommand: startupCommand.trim(),
      envVars: parseEnvVars(envVarsText),
      shell: shell || undefined,
      scrollbackLines: scrollbackLines ? Number(scrollbackLines) : undefined,
    });
  }

  const isEdit = mode === "edit";

  return (
    <div className="configure-page">
      <div className="configure-page__header">
        <h1 className="configure-page__title">{isEdit ? "Edit Terminal" : "Configure Terminal"}</h1>
        <p className="configure-page__subtitle">
          {isEdit
            ? "Update this terminal's info. Directory, command, shell and env changes apply on next restart."
            : "Set up execution parameters for a new terminal."}
        </p>
      </div>
      <form onSubmit={handleSubmit} aria-label={isEdit ? "Edit terminal" : "Create terminal"} className="configure-form">
        <div className="terminal-window-bar">
          <span className="terminal-window-bar__dot" />
          <span className="terminal-window-bar__dot" />
          <span className="terminal-window-bar__dot" />
          <span className="terminal-window-bar__label">TTY1</span>
        </div>
        <section className="configure-section">
          <h2 className="configure-section__title">01. Identity</h2>
          <label>
            Name (optional)
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={defaultName} />
          </label>
        </section>
        <section className="configure-section">
          <h2 className="configure-section__title">02. Execution</h2>
          <label>
            Startup command (optional)
            <input
              value={startupCommand}
              onChange={(e) => setStartupCommand(e.target.value)}
              placeholder="npm run dev"
            />
          </label>
          <label>
            <span className="configure-form__label-with-icon">
              <IconFolder />
              Directory (optional — defaults to home)
            </span>
            <input
              value={cwd}
              onChange={(e) => setCwd(e.target.value)}
              placeholder="/path/to/project"
            />
          </label>
        </section>
        <details className="advanced-options">
          <summary>Advanced</summary>
          <label>
            Shell (optional)
            <select value={shell} onChange={(e) => setShell(e.target.value)}>
              <option value="">Default</option>
              <option value="bash">bash</option>
              <option value="zsh">zsh</option>
              <option value="fish">fish</option>
            </select>
          </label>
          <label>
            Environment variables (optional)
            <textarea
              value={envVarsText}
              onChange={(e) => setEnvVarsText(e.target.value)}
              placeholder={"NODE_ENV=development\nDEBUG=true"}
              rows={3}
            />
          </label>
          <label>
            Scrollback line limit (optional)
            <input
              type="number"
              min={1}
              value={scrollbackLines}
              onChange={(e) => setScrollbackLines(e.target.value)}
              placeholder="10000"
            />
          </label>
        </details>
        <div className="configure-page__actions">
          <button type="button" className="button--neutral" onClick={onCancel}>
            <IconX />
            Cancel
          </button>
          <button type="submit">
            <IconCheck />
            {isEdit ? "Save changes" : "Create terminal"}
          </button>
        </div>
      </form>
    </div>
  );
}
