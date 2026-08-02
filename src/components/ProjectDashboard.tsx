import type { ProjectInfo } from "../lib/daemon";
import { IconArrowRight } from "./icons";

type ProjectDashboardProps = {
  projects: ProjectInfo[];
  onOpen: (projectId: string) => void;
};

const CARD_VARIANTS = ["project-card--a", "project-card--b", "project-card--c"];

export function ProjectDashboard({ projects, onOpen }: ProjectDashboardProps) {
  return (
    <section className="dashboard" aria-label="Project dashboard">
      <p className="content-header__eyebrow">
        <span className="content-header__dot" />
        System online
      </p>
      <h1 className="dashboard__title">Active Projects</h1>
      {projects.length === 0 ? (
        <p className="dashboard__empty">No projects yet. Create one from the sidebar to get started.</p>
      ) : (
        <div className="dashboard__grid">
          {projects.map((project, index) => (
            <article
              key={project.id}
              className={`project-card ${CARD_VARIANTS[index % CARD_VARIANTS.length]}`}
            >
              <div className="project-card__bar">
                <span className="project-card__dot" />
                <span className="project-card__dot" />
                <span className="project-card__dot" />
              </div>
              <div className="project-card__body">
                <h2 className="project-card__title">{project.name}</h2>
                <button type="button" onClick={() => onOpen(project.id)}>
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
