import { useEffect, useState } from "react";
import {
  openInVsCode,
  readPackageScripts,
  type ProjectScript,
  type ScriptArg,
} from "../lib/daemon";
import { buildScriptCommand } from "../lib/scriptCommand";
import { IconCheck, IconEdit, IconPackageJson, IconPlay, IconPlus,  IconTerminal, IconTrash, IconVisualStudioCode, IconX } from "./icons";
import { projectColor } from "./projectStyle";

type PanelKey = "project" | "package";

type TerminalSideMenuProps = {
  /// Where the Terminal is running — the directory whose package.json the
  /// "package" panel reads.
  cwd: string;
  scripts: ProjectScript[];
  /// Persists the whole list (the daemon stores it wholesale).
  onScriptsChange: (scripts: ProjectScript[]) => void;
  /// Types a command into the Terminal and runs it.
  onRun: (command: string) => void;
  onError: (message: string) => void;
};

const fieldLabel = "flex flex-col gap-1 font-mono text-xs uppercase";
const panelButton =
  "flex w-9 cursor-pointer items-center justify-center  py-3 font-mono text-[0.625rem] font-bold tracking-wide uppercase [writing-mode:vertical-rl]";

function newScript(): ProjectScript {
  return { id: crypto.randomUUID(), name: "", command: "", args: [] };
}

function newArg(): ScriptArg {
  return { name: "", label: "", flag: null, default_value: "" };
}

/// Placeholder names a command references, in order, without repeats.
function placeholdersIn(command: string): string[] {
  const names: string[] = [];
  for (const match of command.matchAll(/\{([A-Za-z0-9_-]+)\}/g)) {
    if (!names.includes(match[1])) names.push(match[1]);
  }
  return names;
}

/// The run form for one script: an input per optional argument, prefilled
/// with its default. Scripts with no args skip straight to running.
function RunScriptForm({
  script,
  onRun,
  onCancel,
}: {
  script: ProjectScript;
  onRun: (command: string) => void;
  onCancel: () => void;
}) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(script.args.map((arg) => [arg.name, arg.default_value])),
  );
  const command = buildScriptCommand(script, values);

  return (
    <form
      aria-label={`Run ${script.name}`}
      className="flex flex-col gap-3 border-2 border-ink bg-surface-container-lowest p-3"
      onSubmit={(event) => {
        event.preventDefault();
        onRun(command);
      }}
    >
      {script.args.map((arg) => (
        <label key={arg.name} className={fieldLabel}>
          {arg.label || arg.name}
          <input
            value={values[arg.name] ?? ""}
            onChange={(e) => setValues((prev) => ({ ...prev, [arg.name]: e.target.value }))}
            placeholder={arg.flag ?? ""}
            aria-label={arg.label || arg.name}
            className="field w-full"
          />
        </label>
      ))}
      {/* The exact line that will be typed into the shell — including what
          the blank arguments dropped. */}
      <code className="border-2 border-ink bg-surface-variant px-2 py-1 font-mono text-[0.6875rem] break-all">
        {command}
      </code>
      <div className="flex gap-2">
        <button type="submit" className="btn px-3 py-1.5 text-xs bg-secondary text-on-secondary">
          <IconPlay />
          Run
        </button>
        <button
          type="button"
          className="btn bg-surface-container-lowest px-3 py-1.5 text-xs text-text"
          onClick={onCancel}
        >
          <IconX />
          Cancel
        </button>
      </div>
    </form>
  );
}

/// Create/edit form for a saved script, including its optional arguments.
function EditScriptForm({
  script,
  onSave,
  onCancel,
}: {
  script: ProjectScript;
  onSave: (script: ProjectScript) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(script);

  // The command is the single source of truth for which arguments exist:
  // every `{placeholder}` in it becomes one, in the order it appears. The
  // fields below only *describe* those slots (what to call them, what flag
  // to prepend, what to prefill) — there's no separate name to keep in sync
  // with the command, which is what made this confusing before.
  const placeholders = placeholdersIn(draft.command);

  function argFor(name: string): ScriptArg {
    return draft.args.find((arg) => arg.name === name) ?? { ...newArg(), name };
  }

  function updateArg(name: string, patch: Partial<ScriptArg>) {
    setDraft((prev) => {
      const exists = prev.args.some((arg) => arg.name === name);
      return {
        ...prev,
        args: exists
          ? prev.args.map((arg) => (arg.name === name ? { ...arg, ...patch } : arg))
          : [...prev.args, { ...newArg(), name, ...patch }],
      };
    });
  }

  // Adds the placeholder to the command itself — the argument exists
  // because the command mentions it, so that's where it has to land.
  function addArg() {
    setDraft((prev) => {
      const used = placeholdersIn(prev.command);
      let index = used.length + 1;
      while (used.includes(`arg${index}`)) index += 1;
      const name = `arg${index}`;
      return {
        ...prev,
        command: `${prev.command.trimEnd()} {${name}}`.trim(),
        args: [...prev.args, { ...newArg(), name }],
      };
    });
  }

  function removeArg(name: string) {
    setDraft((prev) => ({
      ...prev,
      command: prev.command.split(`{${name}}`).join("").replace(/\s+/g, " ").trim(),
      args: prev.args.filter((arg) => arg.name !== name),
    }));
  }

  return (
    <form
      aria-label="Edit script"
      className="flex flex-col gap-3 border-2 border-ink bg-surface-container-lowest p-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (!draft.name.trim() || !draft.command.trim()) return;
        // Saved in command order, and only for placeholders the command
        // still mentions — editing one out of the command removes it.
        onSave({
          ...draft,
          name: draft.name.trim(),
          command: draft.command.trim(),
          args: placeholders.map((name) => {
            const arg = argFor(name);
            return { ...arg, label: arg.label.trim(), flag: arg.flag?.trim() || null };
          }),
        });
      }}
    >
      <label className={fieldLabel}>
        Name
        <input
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          aria-label="Script name"
          className="field w-full"
        />
      </label>
      <label className={fieldLabel}>
        Command
        <textarea
          value={draft.command}
          onChange={(e) => setDraft({ ...draft, command: e.target.value })}
          aria-label="Script command"
          placeholder="rsync -a {source} {dest}"
          rows={2}
          className="field w-full resize-y"
        />
      </label>
      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="font-mono text-xs uppercase">Optional arguments</legend>
        <p className="m-0 font-mono text-[0.6875rem] text-on-surface-variant">
          Every <code>{"{placeholder}"}</code> in the command becomes an argument you fill in when
          running. Leave one blank then and it drops out of the command, flag included.
        </p>
        {placeholders.length === 0 && (
          <p className="m-0 font-mono text-xs text-on-surface-variant">
            No placeholders in the command yet.
          </p>
        )}
        {placeholders.map((name) => {
          const arg = argFor(name);
          return (
            <div key={name} className="flex flex-col gap-2 border-2 border-ink p-2">
              <div className="flex items-center justify-between gap-2">
                <code className="font-mono text-sm font-bold">{`{${name}}`}</code>
                <button
                  type="button"
                  className="btn bg-error px-2 py-1 text-xs text-on-error"
                  aria-label={`Remove {${name}}`}
                  onClick={() => removeArg(name)}
                >
                  <IconTrash />
                  Remove
                </button>
              </div>
              <input
                value={arg.label}
                onChange={(e) => updateArg(name, { label: e.target.value })}
                placeholder={`label shown when running (default: ${name})`}
                aria-label={`Label for {${name}}`}
                className="field w-full"
              />
              <input
                value={arg.flag ?? ""}
                onChange={(e) => updateArg(name, { flag: e.target.value || null })}
                placeholder="flag prepended to the value, e.g. --exclude"
                aria-label={`Flag for {${name}}`}
                className="field w-full"
              />
              <input
                value={arg.default_value}
                onChange={(e) => updateArg(name, { default_value: e.target.value })}
                placeholder="default value"
                aria-label={`Default for {${name}}`}
                className="field w-full"
              />
            </div>
          );
        })}
        <button
          type="button"
          className="btn bg-surface-container-lowest px-3 py-1.5 text-xs text-text"
          onClick={addArg}
        >
          <IconPlus />
          Add argument
        </button>
      </fieldset>
      <div className="flex gap-2">
        <button
          type="submit"
          className="btn px-3 py-1.5 text-xs"
          disabled={!draft.name.trim() || !draft.command.trim()}
        >
          <IconCheck />
          Save script
        </button>
        <button
          type="button"
          className="btn bg-surface-container-lowest px-3 py-1.5 text-xs text-text"
          onClick={onCancel}
        >
          <IconX />
          Cancel
        </button>
      </div>
    </form>
  );
}

/// Right-hand menu over the Terminal: two collapsed buttons that expand
/// into a panel of runnable scripts — the Project's own saved ones, or
/// whatever `<cwd>/package.json` declares. The panel overlays the Terminal
/// rather than resizing it, so the shell's own layout never reflows just
/// because the menu opened.
export function TerminalSideMenu({
  cwd,
  scripts,
  onScriptsChange,
  onRun,
  onError,
}: TerminalSideMenuProps) {
  const [openPanel, setOpenPanel] = useState<PanelKey | null>(null);
  const [packageScripts, setPackageScripts] = useState<[string, string][]>([]);
  const [runningScript, setRunningScript] = useState<ProjectScript | null>(null);
  const [editingScript, setEditingScript] = useState<ProjectScript | null>(null);
  const [openingVsCode, setOpeningVsCode] = useState(false);

  // Re-read on every open (and whenever the directory changes): the file is
  // edited outside this app all the time, so a cached list goes stale.
  useEffect(() => {
    if (openPanel !== "package") return;
    let cancelled = false;
    readPackageScripts(cwd)
      .then((found) => {
        if (!cancelled) setPackageScripts(found);
      })
      .catch((err) => onError(err instanceof Error ? err.message : String(err)));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openPanel, cwd]);

  function togglePanel(panel: PanelKey) {
    setRunningScript(null);
    setEditingScript(null);
    setOpenPanel((prev) => (prev === panel ? null : panel));
  }

  function runScript(script: ProjectScript) {
    // Nothing to fill in — no reason to make the user confirm a form.
    if (script.args.length === 0) {
      onRun(buildScriptCommand(script, {}));
      return;
    }
    setRunningScript(script);
  }

  function saveScript(script: ProjectScript) {
    const exists = scripts.some((s) => s.id === script.id);
    onScriptsChange(exists ? scripts.map((s) => (s.id === script.id ? script : s)) : [...scripts, script]);
    setEditingScript(null);
  }

  async function openVsCode() {
    setOpeningVsCode(true);
    try {
      await openInVsCode(cwd);
    } catch (error) {
      onError(error instanceof Error ? error.message : String(error));
    } finally {
      setOpeningVsCode(false);
    }
  }

  const buttonsContainerClass = openPanel
    ? "pointer-events-auto flex flex-col gap-2 border-l-[4px] border-ink p-2"
    : "pointer-events-auto absolute right-2 top-2 flex flex-col gap-2";

  return (
    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-stretch">
      {openPanel && (
        <div
          role="region"
          aria-label={openPanel === "project" ? "Project scripts" : "package.json scripts"}
          className="pointer-events-auto flex w-80 max-w-[80vw] flex-col gap-4 overflow-y-auto border-l-[4px] border-ink bg-surface p-3"
        >
          <h3 className="m-0 font-display text-lg font-bold tracking-tight uppercase">
            {openPanel === "project" ? "Project scripts" : "package.json"}
          </h3>

          {openPanel === "project" ? (
            editingScript ? (
              <EditScriptForm
                script={editingScript}
                onSave={saveScript}
                onCancel={() => setEditingScript(null)}
              />
            ) : runningScript ? (
              <RunScriptForm
                script={runningScript}
                onRun={(command) => {
                  onRun(command);
                  setRunningScript(null);
                }}
                onCancel={() => setRunningScript(null)}
              />
            ) : (
              <>
                {scripts.length === 0 && (
                  <p className="m-0 font-mono text-xs text-on-surface-variant">
                    No scripts saved for this project yet.
                  </p>
                )}
                <ul className="m-0 flex list-none flex-col gap-4 p-0">
                  {scripts.map((script) => (
                    <li key={script.id} className="flex flex-col gap-1 border-2 border-ink p-2 shadow-[6px_6px_0_var(--color-hard-shadow)] bg-surface-variant" >
                      <span className="font-mono text-sm font-bold">{script.name}</span>
                      <code className="font-mono text-[0.6875rem] break-all text-on-surface-variant">
                        {script.command}
                      </code>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          className="btn px-2 py-1 text-xs bg-secondary text-on-secondary"
                          aria-label={`Run ${script.name}`}
                          onClick={() => runScript(script)}
                        >
                          <IconPlay />
                          Run
                        </button>
                        <button
                          type="button"
                          className="btn bg-surface-container-lowest px-2 py-1 text-xs text-text"
                          aria-label={`Edit ${script.name}`}
                          onClick={() => setEditingScript(script)}
                        >
                          <IconEdit />
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn bg-error px-2 py-1 text-xs text-on-error"
                          aria-label={`Delete ${script.name}`}
                          onClick={() => onScriptsChange(scripts.filter((s) => s.id !== script.id))}
                        >
                          <IconTrash />
                          Delete
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  className="btn px-3 py-1.5 text-xs"
                  onClick={() => setEditingScript(newScript())}
                >
                  <IconPlus />
                  New script
                </button>
              </>
            )
          ) : (
            <>
              <p className="m-0 font-mono text-[0.6875rem] break-all text-on-surface-variant">
                {cwd || "~"}
              </p>
              {packageScripts.length === 0 ? (
                <p className="m-0 font-mono text-xs text-on-surface-variant">
                  No package.json scripts in this directory.
                </p>
              ) : (
                <ul className="m-0 flex list-none flex-col gap-4 p-0">
                  {packageScripts.map(([name, command]) => (
                    <li key={name} className="flex flex-row gap-1 border-2 border-ink p-2 shadow-[6px_6px_0_var(--color-hard-shadow)]" style={projectColor('blue').tint}>
                      <div className="flex flex-1 flex-col gap-1">
                        <span className="font-mono text-sm font-bold">{name}</span>
                        <code className="font-mono text-[0.6875rem] break-all text-on-surface-variant">
                          {command}
                        </code>
                      </div>
                      <div className="flex flex-col items-center justify-center">
                        <button
                          type="button"
                          className="btn w-full px-2 py-1 text-xs bg-secondary text-on-secondary"
                          aria-label={`Run ${name}`}
                          onClick={() => onRun(`npm run ${name}`)}
                        >
                          <IconPlay />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      )}

      <div className={buttonsContainerClass}>
        <button
          type="button"
          aria-expanded={openPanel === "project"}
          aria-label="Project scripts"
          title="Project scripts"
          className={`${panelButton} ${
            openPanel === "project" ? "bg-secondary text-on-secondary" : "text-on-primary"
          }`}
          onClick={() => togglePanel("project")}
        >
          <IconTerminal />
        </button>
        <button
          type="button"
          aria-expanded={openPanel === "package"}
          aria-label="package.json scripts"
          title="package.json scripts"
          className={`${panelButton} ${
            openPanel === "package" ? "bg-secondary text-on-secondary" : "text-secondary"
          }`}
          onClick={() => togglePanel("package")}
        >
          <IconPackageJson className="" />
        </button>
        <button
          type="button"
          aria-label="Open in VS Code"
          title="Open in VS Code"
          className={`${panelButton} text-blue-500`}
          disabled={!cwd.trim() || openingVsCode}
          aria-busy={openingVsCode}
          onClick={() => void openVsCode()}
        >
          <IconVisualStudioCode />
        </button>
      </div>
    </div>
  );
}
