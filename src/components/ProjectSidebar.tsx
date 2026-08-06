import { useState, type FormEvent } from "react";
import type { ProjectInfo } from "../lib/daemon";
import { IconHome, IconPlus } from "./icons";
import { projectColor, projectIcon } from "./projectStyle";

type ProjectSidebarProps = {
  projects: ProjectInfo[];
  selectedProjectId: string | null;
  onSelect: (projectId: string) => void;
  onCreate: (name: string) => void;
  /// Clears the selection and shows the Active Projects dashboard.
  onGoHome: () => void;
};

const projectItemBase =
  "w-full cursor-pointer rounded-none border-[3px] px-2 py-1.5 text-left font-mono transition-[transform,box-shadow] duration-100 border-ink shadow-[4px_4px_0_var(--color-ink)]";
const projectItemInactive =
  "bg-transparent text-ink hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-surface-variant";
const projectItemSelected = "bg-secondary text-on-secondary";

export function ProjectSidebar({
  projects,
  selectedProjectId,
  onSelect,
  onCreate,
  onGoHome,
}: ProjectSidebarProps) {
  const [name, setName] = useState("");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    onCreate(name.trim());
    setName("");
  }

  return (
    <nav aria-label="Projects" className="box-border flex w-60 shrink-0 flex-col gap-4 border-r-[4px] border-ink bg-surface p-4">
      <div className="border-b-[3px] border-ink pb-3">
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
      </div>
      <button
        type="button"
        className={`${projectItemBase} flex items-center gap-2 text-sm ${
          selectedProjectId === null ? projectItemSelected : projectItemInactive
        }`}
        onClick={onGoHome}
      >
        <IconHome />
        Active Projects
      </button>
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
      <ul className="m-0 flex flex-1 list-none flex-col gap-2 overflow-y-auto p-0">
        {projects.map((project) => {
          const { Icon } = projectIcon(project.icon);
          return (
            <li key={project.id}>
              <button
                type="button"
                className={`${projectItemBase} flex items-center gap-2 ${
                  project.id === selectedProjectId ? projectItemSelected : projectItemInactive
                }`}
                onClick={() => onSelect(project.id)}
              >
                <span
                  className="h-8 w-8 shrink-0 border-2 border-ink flex items-center justify-center"
                  style={projectColor(project.color).swatch}
                >
                  <Icon />
                </span>
                <span className="truncate text-sm" title={project.name}>
                  {project.name}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
