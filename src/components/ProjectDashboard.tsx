import type { ProjectInfo } from "../lib/daemon";
import { IconArrowRight } from "./icons";

type ProjectDashboardProps = {
  projects: ProjectInfo[];
  onOpen: (projectId: string) => void;
};

// Purely decorative rhythm across cards — cycles through the three
// ink-safe tint fills, no meaning attached to which project gets which.
const CARD_TINTS = ["", "bg-primary-fixed", "bg-tertiary-fixed"];

export function ProjectDashboard({ projects, onOpen }: ProjectDashboardProps) {
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
          {projects.map((project, index) => (
            <article
              key={project.id}
              className={`card flex flex-col ${CARD_TINTS[index % CARD_TINTS.length]}`}
            >
              <div className="flex gap-1.5 border-b-[4px] border-ink px-3 py-2.5">
                <span className="h-2.5 w-2.5 bg-ink" />
                <span className="h-2.5 w-2.5 bg-ink" />
                <span className="h-2.5 w-2.5 bg-ink" />
              </div>
              <div className="flex flex-col gap-4 p-4">
                <h2 className="m-0 font-display text-2xl font-bold tracking-tight uppercase">
                  {project.name}
                </h2>
                <button type="button" className="btn" onClick={() => onOpen(project.id)}>
                  Open project
                  <IconArrowRight />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
