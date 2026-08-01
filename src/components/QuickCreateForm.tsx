import { useState, type FormEvent } from "react";

type QuickCreateFormProps = {
  defaultCwd: string;
  onCreate: (cwd: string, name: string, startupCommand: string) => void;
};

export function QuickCreateForm({ defaultCwd, onCreate }: QuickCreateFormProps) {
  const [cwd, setCwd] = useState(defaultCwd);
  const [name, setName] = useState("");
  const [startupCommand, setStartupCommand] = useState("");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!cwd.trim()) return;
    onCreate(cwd.trim(), name.trim(), startupCommand.trim());
    setName("");
    setStartupCommand("");
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
      <button type="submit" disabled={!cwd.trim()}>
        New Terminal
      </button>
    </form>
  );
}
