import { useState, type FormEvent } from "react";
import type { ProjectInfo } from "../lib/daemon";
import { IconPlus } from "./icons";

type ProjectSidebarProps = {
  projects: ProjectInfo[];
  selectedProjectId: string | null;
  onSelect: (projectId: string) => void;
  onCreate: (name: string) => void;
};

export function ProjectSidebar({ projects, selectedProjectId, onSelect, onCreate }: ProjectSidebarProps) {
  const [name, setName] = useState("");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    onCreate(name.trim());
    setName("");
  }

  return (
    <nav className="project-sidebar" aria-label="Projects">
      <div className="sidebar-brand">
        <span className="sidebar-brand__mark">Terminal_Core</span>
        <span className="sidebar-brand__status">
          <span className="sidebar-brand__dot" />
          System online
        </span>
      </div>
      <form onSubmit={handleSubmit} aria-label="Create project">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Project name"
          aria-label="Project name"
        />
        <button type="submit" disabled={!name.trim()}>
          <IconPlus />
          New Project
        </button>
      </form>
      <ul>
        {projects.map((project) => (
          <li key={project.id}>
            <button
              type="button"
              className={
                project.id === selectedProjectId
                  ? "project-item project-item--selected"
                  : "project-item"
              }
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
