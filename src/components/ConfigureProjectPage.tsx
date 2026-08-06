import { useState, type FormEvent } from "react";
import type { ProjectInfo, UpdateProjectOptions } from "../lib/daemon";
import { IconCheck, IconFolder, IconPlus, IconX } from "./icons";
import {
  isCustomColor,
  PROJECT_COLORS,
  PROJECT_ICONS,
  projectColor,
  projectIcon,
} from "./projectStyle";

type ConfigureProjectPageProps = {
  project: ProjectInfo;
  onCancel: () => void;
  onSubmit: (options: UpdateProjectOptions) => void;
};

const fieldLabel = "flex flex-col gap-1 font-mono text-sm uppercase";

export function ConfigureProjectPage({ project, onCancel, onSubmit }: ConfigureProjectPageProps) {
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? "");
  const [defaultCwd, setDefaultCwd] = useState(project.default_cwd);
  const [color, setColor] = useState(projectColor(project.color).key);
  const [icon, setIcon] = useState(projectIcon(project.icon).key);
  // The colour input needs a hex value even when a preset is selected;
  // seeded from the Project's own colour so reopening the page starts from
  // what it already uses.
  const [customDraft, setCustomDraft] = useState(projectColor(project.color).hex);

  // A custom colour is stored as the hex itself, so it has no preset entry —
  // it's appended here to stay visible (and selectable) alongside them.
  const swatches = isCustomColor(color)
    ? [...PROJECT_COLORS, { key: color, label: `Custom ${color}`, hex: color }]
    : PROJECT_COLORS;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    // Empty optional text is stored as `null`, not `""`, so "never set" and
    // "cleared" look the same to everything downstream.
    onSubmit({
      name: name.trim(),
      description: description.trim() || null,
      color,
      icon,
      defaultCwd: defaultCwd.trim(),
    });
  }

  return (
    <div className="max-w-[640px] flex-1 overflow-y-auto">
      <div className="mb-4 border-b-[4px] border-ink pb-3">
        <h1 className="m-0 mb-1 font-display text-[2rem] font-bold tracking-tight uppercase">
          Edit Project
        </h1>
        <p className="m-0 font-mono text-sm text-on-surface-variant">
          Rename this project and set how it looks. The default directory only prefills new
          terminals — existing ones keep their own.
        </p>
      </div>
      <form
        onSubmit={handleSubmit}
        aria-label="Edit project"
        className="card relative flex flex-col gap-5 p-5 pt-0"
      >
        <div className="-mx-5 mb-1 flex h-8 shrink-0 items-center gap-1.5 border-b-[4px] border-ink bg-ink px-4">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-error" />
          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-secondary" />
          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-tertiary" />
        </div>
        <section className="flex flex-col gap-3">
          <h2 className="m-0 inline-block w-fit border-b-2 border-ink pb-1.5 font-display text-xl font-bold uppercase">
            01. Identity
          </h2>
          <label className={fieldLabel}>
            Name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-label="Project name"
              className="field w-full"
            />
          </label>
          <label className={fieldLabel}>
            Description (optional)
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What this project is for"
              rows={2}
              className="field w-full resize-y"
            />
          </label>
          <label className={fieldLabel}>
            <span className="inline-flex items-center gap-1.5">
              <IconFolder />
              Default directory (optional)
            </span>
            <input
              value={defaultCwd}
              onChange={(e) => setDefaultCwd(e.target.value)}
              placeholder="/path/to/project"
              className="field w-full"
            />
          </label>
        </section>
        <section className="flex flex-col gap-3">
          <h2 className="m-0 inline-block w-fit border-b-2 border-ink pb-1.5 font-display text-xl font-bold uppercase">
            02. Appearance
          </h2>
          <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
            <legend className="font-mono text-sm uppercase">Color</legend>
            <div className="flex flex-wrap gap-2">
              {swatches.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  aria-label={option.label}
                  aria-pressed={option.key === color}
                  onClick={() => setColor(option.key)}
                  style={{ backgroundColor: option.hex }}
                  className={`h-9 w-9 cursor-pointer rounded-none border-ink ${
                    option.key === color
                      ? "border-[4px] shadow-[4px_4px_0_var(--color-ink)]"
                      : "border-[3px] shadow-none"
                  }`}
                />
              ))}
              {/* Picking a colour here appends it to the row above and
                  selects it — the value itself is what gets stored, so a
                  custom colour needs no registry of its own. */}
              <label
                className="flex h-9 cursor-pointer items-center gap-2 border-[3px] border-ink bg-surface-container-lowest px-2 font-mono text-xs font-bold uppercase"
                title="Add a custom colour"
              >
                <IconPlus />
                Custom
                <input
                  type="color"
                  aria-label="Custom color"
                  value={customDraft}
                  onChange={(e) => {
                    setCustomDraft(e.target.value);
                    setColor(e.target.value);
                  }}
                  className="h-5 w-6 cursor-pointer border-2 border-ink bg-transparent p-0"
                />
              </label>
            </div>
          </fieldset>
          <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
            <legend className="font-mono text-sm uppercase">Icon</legend>
            <div className="flex gap-2">
              {PROJECT_ICONS.map(({ key, label, Icon }) => (
                <button
                  key={key}
                  type="button"
                  aria-label={label}
                  aria-pressed={key === icon}
                  onClick={() => setIcon(key)}
                  className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-none border-ink ${
                    key === icon
                      ? "border-[4px] bg-secondary text-on-secondary shadow-[4px_4px_0_var(--color-ink)]"
                      : "border-[3px] bg-surface-container-lowest text-ink shadow-none"
                  }`}
                >
                  <Icon />
                </button>
              ))}
            </div>
          </fieldset>
        </section>
        <div className="flex justify-end gap-3 border-t-[4px] border-ink pt-4">
          <button type="button" className="btn bg-surface-container-lowest text-ink" onClick={onCancel}>
            <IconX />
            Cancel
          </button>
          <button type="submit" className="btn" disabled={!name.trim()}>
            <IconCheck />
            Save changes
          </button>
        </div>
      </form>
    </div>
  );
}
