import { useState } from "react";
import { pickExportPath, pickImportPath } from "../lib/dialog";
import { BACKGROUND_PATTERNS, THEMES, type BackgroundPatternId, type ThemeId } from "../lib/theme";
import { IconArrowLeft, IconCheck, IconDownload, IconUpload, IconX } from "./icons";

type SettingsPageProps = {
  currentTheme: ThemeId;
  onSelectTheme: (id: ThemeId) => void;
  crtFilterEnabled: boolean;
  terminalBackground: string;
  appBackground: string;
  backgroundPattern: BackgroundPatternId;
  onCrtFilterChange: (enabled: boolean) => void;
  onTerminalBackgroundChange: (color: string) => void;
  onAppBackgroundChange: (color: string) => void;
  onBackgroundPatternChange: (pattern: BackgroundPatternId) => void;
  onBack: () => void;
  /// Writes every Project, Terminal, script, and appearance preference to a
  /// JSON file at this path.
  onExport: (path: string) => void;
  /// Wholesale-replaces every Project and Terminal with what the file at
  /// this path contains. Destructive — the caller is expected to have
  /// confirmed with the user already (see the inline confirm step below).
  onImport: (path: string) => void;
  /// Result of the most recent export/import, for a one-line confirmation —
  /// `null` clears it. Owned by the parent since it outlives this page's own
  /// state (surviving, e.g., a navigate-away-and-back).
  statusMessage: string | null;
};

export function SettingsPage({
  currentTheme,
  onSelectTheme,
  crtFilterEnabled,
  terminalBackground,
  appBackground,
  backgroundPattern,
  onCrtFilterChange,
  onTerminalBackgroundChange,
  onAppBackgroundChange,
  onBackgroundPatternChange,
  onBack,
  onExport,
  onImport,
  statusMessage,
}: SettingsPageProps) {
  // Set once the native "Open" dialog hands back a file — import replaces
  // everything currently saved, too destructive to act on right away, so
  // picking the file and confirming the replacement are two separate steps
  // (a native `confirm()` isn't used anywhere else in this app, and nothing
  // here uses a modal either; every other destructive-ish action is a
  // same-page swap, e.g. `ConfigureProjectPage`).
  const [pendingImportPath, setPendingImportPath] = useState<string | null>(null);

  async function handleChooseExport() {
    const path = await pickExportPath("httyml-backup.json");
    if (path) onExport(path);
  }

  async function handleChooseImport() {
    const path = await pickImportPath();
    if (path) setPendingImportPath(path);
  }

  return (
    <div className="max-w-[648px] flex-1 overflow-y-auto pr-2 pb-2">
      <div className="mb-4 flex items-center gap-3 border-b-[4px] border-ink pb-3">
        <button type="button" className="btn bg-surface-container-lowest text-ink" onClick={onBack}>
          <IconArrowLeft />
          Back
        </button>
        <h1 className="m-0 font-display text-[2rem] font-bold tracking-tight uppercase">
          Settings
        </h1>
      </div>
      <div className="card flex flex-col gap-5 p-5">
        <div className="-mx-5 -mt-5 mb-1 flex h-8 shrink-0 items-center gap-1.5 border-b-[4px] border-ink bg-ink px-4">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-error" />
          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-secondary" />
          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-tertiary" />
        </div>
        <section className="flex flex-col gap-3">
          <h2 className="m-0 inline-block w-fit border-b-2 border-ink pb-1.5 font-display text-xl font-bold uppercase">
            Appearance
          </h2>
          <p className="m-0 font-mono text-sm text-on-surface-variant">
            Recolors every Project and Terminal in the app — a display preference, kept on this
            device only.
          </p>
          <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
            <legend className="font-mono text-sm uppercase">Color theme</legend>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3">
              {THEMES.map((theme) => {
                const selected = theme.id === currentTheme;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    aria-pressed={selected}
                    aria-label={theme.label}
                    onClick={() => onSelectTheme(theme.id)}
                    className={`flex cursor-pointer flex-col gap-3 border-ink bg-surface-container-lowest p-3 text-left ${
                      selected
                        ? "border-[4px] shadow-[4px_4px_0_var(--color-ink)]"
                        : "border-[3px] shadow-none"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex gap-1.5">
                        <span
                          className="h-6 w-6 border-2 border-ink"
                          style={{ backgroundColor: theme.colors.primary }}
                        />
                        <span
                          className="h-6 w-6 border-2 border-ink"
                          style={{ backgroundColor: theme.colors.secondary }}
                        />
                        <span
                          className="h-6 w-6 border-2 border-ink"
                          style={{ backgroundColor: theme.colors.tertiary }}
                        />
                      </div>
                      {selected && <IconCheck />}
                    </div>
                    <span className="font-mono text-xs font-bold tracking-wide uppercase">
                      {theme.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>
          <div className="flex flex-col gap-3 border-t-2 border-ink pt-4">
            <h3 className="m-0 font-mono text-sm font-bold uppercase">Surface colors</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex items-center justify-between gap-3 border-2 border-ink bg-surface-container-lowest p-3 font-mono text-xs font-bold uppercase">
                Terminal background
                <input
                  type="color"
                  aria-label="Terminal background color"
                  value={terminalBackground}
                  onChange={(event) => onTerminalBackgroundChange(event.target.value)}
                  className="h-8 w-12 cursor-pointer border-2 border-ink bg-transparent p-0"
                />
              </label>
              <label className="flex items-center justify-between gap-3 border-2 border-ink bg-surface-container-lowest p-3 font-mono text-xs font-bold uppercase">
                Application background
                <input
                  type="color"
                  aria-label="Application background color"
                  value={appBackground}
                  onChange={(event) => onAppBackgroundChange(event.target.value)}
                  className="h-8 w-12 cursor-pointer border-2 border-ink bg-transparent p-0"
                />
              </label>
            </div>
          </div>
          <fieldset className="m-0 flex flex-col gap-2 border-t-2 border-ink pt-4">
            <legend className="font-mono text-sm font-bold uppercase">Background pattern</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {BACKGROUND_PATTERNS.map((pattern) => (
                <button
                  key={pattern.id}
                  type="button"
                  aria-pressed={pattern.id === backgroundPattern}
                  aria-label={pattern.label}
                  onClick={() => onBackgroundPatternChange(pattern.id)}
                  className={`flex h-16 items-end border-ink p-2 font-mono text-[0.6875rem] font-bold uppercase ${pattern.id === backgroundPattern ? "border-[4px] shadow-[4px_4px_0_var(--color-ink)]" : "border-[3px] shadow-none"}`}
                  style={{ backgroundColor: appBackground, backgroundImage: pattern.image, backgroundSize: pattern.size }}
                >
                  <span className="border-2 border-ink bg-surface-container-lowest px-1.5 py-1">{pattern.label}</span>
                </button>
              ))}
            </div>
          </fieldset>
          <div className="flex flex-col gap-3 border-t-2 border-ink pt-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="m-0 font-mono text-sm font-bold uppercase">CRT filter</h3>
                <p className="m-0 font-mono text-xs text-on-surface-variant">
                  Scanlines and color phosphor overlay for terminal output.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={crtFilterEnabled}
                aria-label="CRT filter"
                className={`btn px-3 py-1.5 text-xs ${crtFilterEnabled ? "bg-secondary text-on-secondary" : "bg-surface-container-lowest text-ink"}`}
                onClick={() => onCrtFilterChange(!crtFilterEnabled)}
              >
                {crtFilterEnabled ? "On" : "Off"}
              </button>
            </div>
            <div className="relative overflow-hidden border-2 border-ink bg-black p-3 font-mono text-xs text-secondary">
              <span>$ ready_</span>
              {crtFilterEnabled && <div className="scanlines pointer-events-none absolute inset-0" aria-hidden="true" />}
            </div>
          </div>
        </section>
        <section className="flex flex-col gap-3 border-t-[4px] border-ink pt-5">
          <h2 className="m-0 inline-block w-fit border-b-2 border-ink pb-1.5 font-display text-xl font-bold uppercase">
            Backup
          </h2>
          <p className="m-0 font-mono text-sm text-on-surface-variant">
            Export every Project, Terminal, script, and appearance preference to a JSON file — or
            import one to restore them, replacing whatever is currently saved.
          </p>
          {statusMessage && (
            <p className="m-0 border-2 border-ink bg-secondary px-3 py-2 font-mono text-xs font-bold text-on-secondary">
              {statusMessage}
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              className="btn px-3 py-1.5 text-xs"
              onClick={() => void handleChooseExport()}
            >
              <IconDownload />
              Export configuration…
            </button>
            <button
              type="button"
              className="btn bg-surface-container-lowest px-3 py-1.5 text-xs text-ink"
              onClick={() => void handleChooseImport()}
            >
              <IconUpload />
              Import configuration…
            </button>
          </div>
          {pendingImportPath && (
            <div className="flex flex-col gap-2 border-2 border-ink bg-error p-3 text-on-error">
              <p className="m-0 font-mono text-xs font-bold break-all uppercase">
                Replace every Project, Terminal, and script currently saved with{" "}
                {pendingImportPath}? This can't be undone.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn bg-surface-container-lowest px-3 py-1.5 text-xs text-ink"
                  onClick={() => {
                    onImport(pendingImportPath);
                    setPendingImportPath(null);
                  }}
                >
                  <IconCheck />
                  Replace everything
                </button>
                <button
                  type="button"
                  className="btn bg-surface-container-lowest px-3 py-1.5 text-xs text-ink"
                  onClick={() => setPendingImportPath(null)}
                >
                  <IconX />
                  Cancel
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
