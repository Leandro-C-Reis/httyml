import { useState, type FormEvent } from "react";
import type { CreateTerminalOptions } from "../lib/daemon";

type QuickCreateFormProps = {
  defaultCwd: string;
  onCreate: (cwd: string, options: CreateTerminalOptions) => void;
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

export function QuickCreateForm({ defaultCwd, onCreate }: QuickCreateFormProps) {
  const [cwd, setCwd] = useState(defaultCwd);
  const [name, setName] = useState("");
  const [startupCommand, setStartupCommand] = useState("");
  const [envVarsText, setEnvVarsText] = useState("");
  const [shell, setShell] = useState("");
  const [scrollbackLines, setScrollbackLines] = useState("");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!cwd.trim()) return;
    onCreate(cwd.trim(), {
      name: name.trim(),
      startupCommand: startupCommand.trim(),
      envVars: parseEnvVars(envVarsText),
      shell: shell || undefined,
      scrollbackLines: scrollbackLines ? Number(scrollbackLines) : undefined,
    });
    setName("");
    setStartupCommand("");
    setEnvVarsText("");
    setShell("");
    setScrollbackLines("");
  }

  return (
    <form onSubmit={handleSubmit} aria-label="Create terminal">
      <label>
        Directory
        <input
          value={cwd}
          onChange={(e) => setCwd(e.target.value)}
          placeholder="/path/to/project"
          required
        />
      </label>
      <label>
        Name (optional)
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="dev server" />
      </label>
      <label>
        Startup command (optional)
        <input
          value={startupCommand}
          onChange={(e) => setStartupCommand(e.target.value)}
          placeholder="npm run dev"
        />
      </label>
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
      <button type="submit" disabled={!cwd.trim()}>
        New Terminal
      </button>
    </form>
  );
}
