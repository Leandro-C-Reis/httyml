import type { ProjectInfo } from "../lib/daemon";
import { IconArrowRight, IconEdit } from "./icons";
import { projectColor, projectIcon } from "./projectStyle";

type ProjectDashboardProps = {
  projects: ProjectInfo[];
  onOpen: (projectId: string) => void;
  onEdit: (projectId: string) => void;
};

export function ProjectDashboard({ projects, onOpen, onEdit }: ProjectDashboardProps) {
  return (
    <section aria-label="Project dashboard" className="flex-1 overflow-y-auto">
      <p className="mb-1 flex items-center gap-2 font-mono text-xs font-bold tracking-wide text-primary uppercase">
        <span className="h-2 w-2 rounded-full border border-ink bg-secondary" />
        System online
      </p>
      <h1 className="m-0 mb-6 font-display text-5xl leading-none font-bold tracking-tight uppercase">
        Active Projects
      </h1>
      {projects.length === 0 ? (
        <p className="font-mono text-sm text-on-surface-variant">
          No projects yet. Create one from the sidebar to get started.
        </p>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-6">
          {projects.map((project) => {
            const color = projectColor(project.color);
            const { Icon } = projectIcon(project.icon);
            return (
              <article key={project.id} className="card flex flex-col" style={color.tint}>
                <div
                  className={`flex items-center gap-1.5 border-b-[4px] border-ink px-3 py-2.5 bg-ink`}
                >
                  <span className="h-2.5 w-2.5 rounded-full bg-error" />
                  <span className="h-2.5 w-2.5 rounded-full bg-secondary" />
                  <span className="h-2.5 w-2.5 rounded-full bg-tertiary" />
                  <span className="ml-auto truncate font-mono text-sm" style={color.onInk}>
                    {project.default_cwd}
                  </span>
                </div>
                <div className="flex flex-1 flex-col gap-4 p-4">
                  <h2 className="m-0 flex items-center gap-2 font-display text-2xl font-bold tracking-tight uppercase">
                    {project.name}
                    <div className="ml-auto bg-white p-2 border-2 border-ink shadow-[3px_3px_0_var(--color-ink)]" >

                      <Icon />
                    </div>
                  </h2>
                  {project.description && (
                    <p className="m-0 font-mono text-sm text-on-surface-variant">
                      {project.description}
                    </p>
                  )}
                  <div className="mt-auto flex gap-2 flex-col">
                    <button
                      type="button"
                      className="btn bg-surface-container-lowest text-ink"
                      aria-label={`Edit ${project.name}`}
                      onClick={() => onEdit(project.id)}
                    >
                      <IconEdit />
                      Edit
                    </button>
                    <button type="button" className="btn" onClick={() => onOpen(project.id)}>
                      Open project
                      <IconArrowRight />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
