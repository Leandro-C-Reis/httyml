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

const fieldLabel = "flex flex-col gap-1 font-mono text-sm uppercase";

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
    <div className="max-w-[640px] flex-1 overflow-y-auto">
      <div className="mb-4 border-b-[4px] border-ink pb-3">
        <h1 className="m-0 mb-1 font-display text-[2rem] font-bold tracking-tight uppercase">
          {isEdit ? "Edit Terminal" : "Configure Terminal"}
        </h1>
        <p className="m-0 font-mono text-sm text-on-surface-variant">
          {isEdit
            ? "Update this terminal's info. Directory, command, shell and env changes apply on next restart."
            : "Set up execution parameters for a new terminal."}
        </p>
      </div>
      <form
        onSubmit={handleSubmit}
        aria-label={isEdit ? "Edit terminal" : "Create terminal"}
        className="card relative flex flex-col gap-5 p-5 pt-0"
      >
        <div className="-mx-5 mb-1 flex h-8 shrink-0 items-center gap-1.5 border-b-[4px] border-ink bg-ink px-4">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-error" />
          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-secondary" />
          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-tertiary" />
          <span className="ml-auto font-mono text-xs font-bold tracking-wide text-secondary">TTY1</span>
        </div>
        <section className="flex flex-col gap-3">
          <h2 className="m-0 inline-block w-fit border-b-2 border-ink pb-1.5 font-display text-xl font-bold uppercase">
            01. Identity
          </h2>
          <label className={fieldLabel}>
            Name (optional)
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={defaultName}
              className="field w-full"
            />
          </label>
        </section>
        <section className="flex flex-col gap-3">
          <h2 className="m-0 inline-block w-fit border-b-2 border-ink pb-1.5 font-display text-xl font-bold uppercase">
            02. Execution
          </h2>
          <label className={fieldLabel}>
            Startup command (optional)
            <input
              value={startupCommand}
              onChange={(e) => setStartupCommand(e.target.value)}
              placeholder="npm run dev"
              className="field w-full"
            />
          </label>
          <label className={fieldLabel}>
            <span className="inline-flex items-center gap-1.5">
              <IconFolder />
              Directory (optional — defaults to home)
            </span>
            <input
              value={cwd}
              onChange={(e) => setCwd(e.target.value)}
              placeholder="/path/to/project"
              className="field w-full"
            />
          </label>
        </section>
        <details className="border-2 border-ink p-3">
          <summary className="cursor-pointer font-mono text-sm font-bold tracking-wide uppercase">
            Advanced
          </summary>
          <label className={`${fieldLabel} mt-2`}>
            Shell (optional)
            <select value={shell} onChange={(e) => setShell(e.target.value)} className="field w-full">
              <option value="">Default</option>
              <option value="bash">bash</option>
              <option value="zsh">zsh</option>
              <option value="fish">fish</option>
            </select>
          </label>
          <label className={`${fieldLabel} mt-2`}>
            Environment variables (optional)
            <textarea
              value={envVarsText}
              onChange={(e) => setEnvVarsText(e.target.value)}
              placeholder={"NODE_ENV=development\nDEBUG=true"}
              rows={3}
              className="field w-full resize-y"
            />
          </label>
          <label className={`${fieldLabel} mt-2`}>
            Scrollback line limit (optional)
            <input
              type="number"
              min={1}
              value={scrollbackLines}
              onChange={(e) => setScrollbackLines(e.target.value)}
              placeholder="10000"
              className="field w-full"
            />
          </label>
        </details>
        <div className="flex justify-end gap-3 border-t-[4px] border-ink pt-4">
          <button type="button" className="btn bg-surface-container-lowest text-ink" onClick={onCancel}>
            <IconX />
            Cancel
          </button>
          <button type="submit" className="btn">
            <IconCheck />
            {isEdit ? "Save changes" : "Create terminal"}
          </button>
        </div>
      </form>
    </div>
  );
}
