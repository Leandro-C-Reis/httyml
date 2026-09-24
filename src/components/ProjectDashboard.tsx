import { useState } from "react";
import type { ProjectInfo } from "../lib/daemon";
import { IconArrowRight, IconEdit, IconGrip, IconSettings } from "./icons";
import { projectColor, projectIcon } from "./projectStyle";

type ProjectDashboardProps = {
  projects: ProjectInfo[];
  onOpen: (projectId: string) => void;
  onEdit: (projectId: string) => void;
  /// Persists a full reordering (see `reorderProjects` in `lib/daemon`) —
  /// called with every Project's id in its new display order.
  onReorder: (projectIds: string[]) => void;
  /// Opens the global Settings page (appearance, ...).
  onOpenSettings: () => void;
};

export function ProjectDashboard({
  projects,
  onOpen,
  onEdit,
  onReorder,
  onOpenSettings,
}: ProjectDashboardProps) {
  // Local-only toggle: reordering itself is persisted immediately on drop
  // (so it reflects right away, same as terminal tab drag), this just
  // decides whether cards are draggable at all — a card isn't accidentally
  // draggable while browsing normally.
  const [reordering, setReordering] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  // The id currently under the pointer while dragging — drives the drop
  // indicator so the card list doesn't visibly reshuffle until the drop
  // actually happens.
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  function handleDrop(sourceId: string, targetId: string) {
    if (!sourceId || sourceId === targetId) return;
    const ids = projects.map((p) => p.id);
    const from = ids.indexOf(sourceId);
    const to = ids.indexOf(targetId);
    if (from === -1 || to === -1) return;
    ids.splice(from, 1);
    ids.splice(to, 0, sourceId);
    onReorder(ids);
  }

  return (
    <section aria-label="Project dashboard" className="flex-1 overflow-y-auto pr-2 pb-2">
      <p className="mb-1 flex items-center gap-2 font-mono text-xs font-bold tracking-wide text-primary uppercase">
        <span className="h-2 w-2 rounded-full border border-ink bg-secondary" />
        System online
      </p>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="m-0 font-display text-5xl leading-none font-bold tracking-tight uppercase">
          Active Projects
        </h1>
        <div className="ml-auto flex items-center gap-3">
          {projects.length > 1 && (
            <button
              type="button"
              className="btn bg-surface-container-lowest text-text"
              aria-pressed={reordering}
              onClick={() => setReordering((prev) => !prev)}
            >
              {reordering ? "Done" : "Edit order"}
            </button>
          )}
          <button
            type="button"
            aria-label="Settings"
            title="Settings"
            className="btn bg-surface-container-lowest text-text"
            onClick={onOpenSettings}
          >
            <IconSettings />
            Settings
          </button>
        </div>
      </div>
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
              <article
                key={project.id}
                className={`card flex flex-col transition-[opacity,outline] duration-100 ${
                  draggedId === project.id ? "opacity-40" : ""
                } ${
                  reordering && dragOverId === project.id && draggedId !== project.id
                    ? "outline-3 outline-dashed outline-offset-2 outline-ink"
                    : ""
                }`}
                style={{backgroundColor: color.hex}}
                draggable={reordering}
                onDragStart={(e) => {
                  setDraggedId(project.id);
                  e.dataTransfer.effectAllowed = "move";
                  // Required by at least WebKitGTK (the webview Tauri uses on
                  // Linux) for the drag to register as a real HTML5 DnD
                  // operation at all — without a payload, dragover/drop never
                  // fire on the other cards even though dragstart itself did.
                  // Also doubles as the source of truth for the drop handler,
                  // since the drop target's own event doesn't otherwise carry
                  // it and React state can lag a native drag sequence.
                  e.dataTransfer.setData("text/plain", project.id);
                }}
                onDragEnd={() => {
                  setDraggedId(null);
                  setDragOverId(null);
                }}
                onDragEnter={(e) => {
                  if (!reordering) return;
                  // Some webviews only allow a drop on an element whose
                  // `dragenter` (not just `dragover`) had its default
                  // prevented.
                  e.preventDefault();
                }}
                onDragOver={(e) => {
                  if (!reordering) return;
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  if (project.id !== draggedId) setDragOverId(project.id);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const sourceId = e.dataTransfer.getData("text/plain") || draggedId;
                  if (sourceId) handleDrop(sourceId, project.id);
                  setDraggedId(null);
                  setDragOverId(null);
                }}
              >
                <div
                  className="flex items-center gap-1.5 border-b-[4px] border-card-border bg-card-header px-3 py-2.5"
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
                    <span style={{ color: color.readableOn }}>{project.name}</span>
                    <div className="ml-auto border-2 border-ink bg-surface-container-lowest p-2 shadow-[3px_3px_0_var(--color-hard-shadow)]" >
                      <Icon />
                    </div>
                  </h2>
                  {project.description && (
                    <p className="m-0 font-mono text-sm text-on-surface-variant" style={{ color: color.readableOn }}>
                      {project.description}
                    </p>
                  )}
                  {reordering ? (
                    <div
                      className="mt-auto flex cursor-grab items-center justify-center gap-2 border-2 border-dashed border-ink py-2 font-mono text-xs font-bold tracking-wide text-on-surface-variant uppercase active:cursor-grabbing"
                      aria-label={`Drag to reorder ${project.name}`}
                    >
                      <IconGrip />
                      Drag to reorder
                    </div>
                  ) : (
                    <div className="mt-auto flex gap-2 flex-col">
                      <button
                        type="button"
                        className="btn bg-surface-container-lowest text-text"
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
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
