import { useEffect, useState, type FormEvent } from "react";
import type { ProjectInfo } from "../lib/daemon";
import { IconArrowLeft, IconArrowRight, IconHome, IconPlus } from "./icons";
import { projectColor, projectIcon } from "./projectStyle";

type ProjectSidebarProps = {
  projects: ProjectInfo[];
  selectedProjectId: string | null;
  onSelect: (projectId: string) => void;
  onCreate: (name: string) => void;
  /// Clears the selection and shows the Active Projects dashboard.
  onGoHome: () => void;
};

// Same lift-on-hover, press-on-click motion as `.btn` in App.css: the
// shadow grows to 6px as the item nudges up-left, then collapses as it
// presses down-right.
const projectItemBase =
  "w-full cursor-pointer rounded-none border-[3px] px-2 py-1.5 text-left font-mono transition-[transform,box-shadow] duration-100 border-ink shadow-[4px_4px_0_var(--color-ink)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_var(--color-ink)] active:translate-x-1 active:translate-y-1 active:shadow-none";
const projectItemInactive = "bg-transparent text-ink hover:bg-surface-variant";
const projectItemSelected = "bg-secondary text-on-secondary";

const COLLAPSED_KEY = "httyml.sidebarCollapsed";

// Guarded because storage isn't guaranteed to be there (a webview with it
// disabled, a test environment without it) — a missing store just means the
// sidebar always starts expanded, never a crash on mount.
function readCollapsed(): boolean {
  try {
    return globalThis.localStorage?.getItem(COLLAPSED_KEY) === "true";
  } catch {
    return false;
  }
}

function writeCollapsed(collapsed: boolean) {
  try {
    globalThis.localStorage?.setItem(COLLAPSED_KEY, String(collapsed));
  } catch {
    // Preference just won't stick; nothing else depends on it.
  }
}

export function ProjectSidebar({
  projects,
  selectedProjectId,
  onSelect,
  onCreate,
  onGoHome,
}: ProjectSidebarProps) {
  const [name, setName] = useState("");
  // Remembered across sessions: whether the Projects list is out of the way
  // is a workspace preference, not per-visit state.
  const [collapsed, setCollapsed] = useState(readCollapsed);

  useEffect(() => {
    writeCollapsed(collapsed);
  }, [collapsed]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    onCreate(name.trim());
    setName("");
  }

  return (
    <nav
      aria-label="Projects"
      className={`box-border flex shrink-0 flex-col gap-4 border-r-[4px] border-ink bg-surface p-4 ${
        collapsed ? "w-20 items-center" : "w-60"
      }`}
    >
      <div className={`w-full border-b-[3px] border-ink pb-3 ${collapsed ? "flex justify-center" : ""}`}>
        {collapsed ? (
          <img src="logo.svg" width="24" height="24" alt="HTTYML Logo" />
        ) : (
          <>
            <div className="flex items-center gap-2">
              <img src="logo.svg" width="24" height="24" alt="HTTYML Logo" />
              <span className="block font-display text-xl leading-tight font-bold tracking-tight uppercase">
                HTTYML
              </span>
            </div>
            <span className="mt-1.5 flex items-center gap-1.5 font-mono text-[0.6875rem] font-bold tracking-wide text-on-surface-variant uppercase">
              <span className="h-2 w-2 rounded-full border border-ink bg-secondary" />
              System online
            </span>
          </>
        )}
      </div>

      <button
        type="button"
        aria-expanded={!collapsed}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className={`${projectItemBase} ${projectItemInactive} flex items-center justify-center gap-2 text-sm`}
        onClick={() => setCollapsed((prev) => !prev)}
      >
        {collapsed ? <IconArrowRight /> : <IconArrowLeft />}
        {!collapsed && "Collapse"}
      </button>

      <button
        type="button"
        aria-label="Active Projects"
        title="Active Projects"
        className={`${projectItemBase} flex items-center gap-2 text-sm h-12 ${
          collapsed ? "justify-center" : ""
        } ${selectedProjectId === null ? projectItemSelected : projectItemInactive}`}
        onClick={onGoHome}
      >
        <IconHome />
        {!collapsed && "Active Projects"}
      </button>

      {/* Collapsed, the create form shrinks to the button that expands the
          sidebar again — a name field has nowhere to fit at this width. */}
      {collapsed ? (
        <button
          type="button"
          aria-label="New Project"
          title="New Project"
          className="btn w-full justify-center px-2"
          onClick={() => setCollapsed(false)}
        >
          <IconPlus />
        </button>
      ) : (
        <form onSubmit={handleSubmit} aria-label="Create project" className="flex flex-col gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Project name"
            aria-label="Project name"
            className="field"
          />
          <button type="submit" disabled={!name.trim()} className="btn">
            <IconPlus />
            New Project
          </button>
        </form>
      )}

      {projects.map((project) => {
        const { Icon } = projectIcon(project.icon);
        return (
          <button
            key={project.id}
            type="button"
            // Collapsed, the swatch is all there is to go on, so the
            // name has to live in the accessible name and the tooltip.
            aria-label={project.name}
            title={project.name}
            className={`${projectItemBase} flex items-center gap-2 ${
              collapsed ? "justify-center px-5.5" : ""
            } ${project.id === selectedProjectId ? projectItemSelected : projectItemInactive}`}
            onClick={() => onSelect(project.id)}
            style={projectColor(project.color).swatch}
          >
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center"
            >
              <Icon />
            </span>
            {!collapsed && <span className="truncate text-sm">{project.name}</span>}
          </button>
        );
      })}
    </nav>
  );
}
