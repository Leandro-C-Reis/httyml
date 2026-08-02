import { useState, type FormEvent } from "react";
import type { ProjectInfo } from "../lib/daemon";
import { IconPlus } from "./icons";

type ProjectSidebarProps = {
  projects: ProjectInfo[];
  selectedProjectId: string | null;
  onSelect: (projectId: string) => void;
  onCreate: (name: string) => void;
};

const projectItemBase =
  "w-full cursor-pointer rounded-none border-[3px] px-5 py-2.5 text-left font-mono transition-[transform,box-shadow] duration-100";
const projectItemInactive =
  "border-transparent bg-transparent text-ink shadow-none hover:-translate-x-0.5 hover:-translate-y-0.5 hover:border-ink hover:bg-surface-container-lowest hover:shadow-[4px_4px_0_var(--color-ink)]";
const projectItemSelected = "border-ink bg-secondary text-on-secondary shadow-[4px_4px_0_var(--color-ink)]";

export function ProjectSidebar({ projects, selectedProjectId, onSelect, onCreate }: ProjectSidebarProps) {
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
        {projects.map((project) => (
          <li key={project.id}>
            <button
              type="button"
              className={`${projectItemBase} ${
                project.id === selectedProjectId ? projectItemSelected : projectItemInactive
              }`}
              onClick={() => onSelect(project.id)}
            >
              {project.name}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
