import { useEffect, useRef, useState } from "react";
import {
  createProject,
  createTerminal,
  deleteTerminal,
  ensureDaemon,
  listProjects,
  listTerminals,
  reorderProjects,
  setProjectScripts,
  stopTerminal,
  updateProject,
  updateTerminal,
  type CreateTerminalOptions,
  type ProjectScript,
  type UpdateProjectOptions,
  type ProjectInfo,
  type TerminalInfo,
} from "./lib/daemon";
import { ProjectSidebar } from "./components/ProjectSidebar";
import { ProjectDashboard } from "./components/ProjectDashboard";
import { ConfigureTerminalPage, type ConfigureTerminalInitial } from "./components/ConfigureTerminalPage";
import { ConfigureProjectPage } from "./components/ConfigureProjectPage";
import { TerminalView } from "./components/TerminalView";
import { IconArrowLeft, IconEdit, IconPlus } from "./components/icons";
import "./App.css";

type TerminalFormState = { mode: "create" } | { mode: "edit"; terminalId: string } | null;

function App() {
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [terminals, setTerminals] = useState<TerminalInfo[]>([]);
  // Display order for tabs, per Project, independent of whatever order the
  // daemon returns them in — ids already seen keep their slot, new ids are
  // always appended at the end so a newly created Terminal lands on the
  // right. Keyed by project so switching away and back doesn't touch
  // another Project's order, and reconciling one Project's list on refresh
  // never drops another Project's entries.
  const [terminalOrderByProject, setTerminalOrderByProject] = useState<Record<string, string[]>>(
    {},
  );
  // Mirrors terminalOrderByProject so refreshTerminals can read/write it
  // synchronously — setState's functional updater form isn't invoked
  // synchronously, so a caller reading the return value on the very next
  // line can't rely on it to have run yet.
  const terminalOrderByProjectRef = useRef<Record<string, string[]>>({});
  // Terminals the user has actually opened a tab for at least once — only
  // these get a mounted TerminalView (and so only these ever attach).
  // Listing a Project's Terminals must never imply opening any of them.
  const [openedTerminalIds, setOpenedTerminalIds] = useState<string[]>([]);
  const [activeTerminalId, setActiveTerminalId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Whether the Configure/Edit Terminal page is showing in place of the tab
  // bar — its own screen, not an always-visible inline form.
  const [terminalForm, setTerminalForm] = useState<TerminalFormState>(null);
  // Which Project's edit page is showing, if any. Reachable both from the
  // dashboard card and from the open Project's header, so it's kept
  // independent of `selectedProjectId` (editing never opens a Project).
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  // Whether Alt+M's "move this tab" mode is on: while it is, bare arrows
  // reorder the active tab instead of reaching the shell.
  const [isMovingTab, setIsMovingTab] = useState(false);
  // Tracks which Project's terminal list is the most recently requested one,
  // so a slow response for a Project the user has since switched away from
  // can't overwrite what's currently selected (see refreshTerminals).
  const latestProjectRequest = useRef<string | null>(null);

  useEffect(() => {
    void runAction(async () => {
      await ensureDaemon();
      setProjects(await listProjects());
      setReady(true);
    });
  }, []);

  // Every daemon/Tauri call goes through here so a failure (daemon not
  // reachable, sidecar not found, ...) surfaces as a visible message instead
  // of silently doing nothing — see the error banner below.
  async function runAction(action: () => Promise<void>) {
    try {
      setError(null);
      await action();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  // Returns the fetched list plus the reconciled display order (ids only),
  // or undefined if a newer request for a different Project has since
  // superseded this one (see `latestProjectRequest`) — callers that want to
  // act on the result (e.g. auto-opening the first tab, in *display* order
  // rather than whatever order the daemon happened to return) must check
  // for that.
  async function refreshTerminals(
    projectId: string,
  ): Promise<{ list: TerminalInfo[]; order: string[] } | undefined> {
    latestProjectRequest.current = projectId;
    const list = await listTerminals(projectId);
    if (latestProjectRequest.current !== projectId) return undefined;
    setTerminals(list);
    const prevOrder = terminalOrderByProjectRef.current[projectId] ?? [];
    const stillPresent = prevOrder.filter((id) => list.some((t) => t.id === id));
    const newIds = list.map((t) => t.id).filter((id) => !stillPresent.includes(id));
    const order = [...stillPresent, ...newIds];
    terminalOrderByProjectRef.current = { ...terminalOrderByProjectRef.current, [projectId]: order };
    setTerminalOrderByProject(terminalOrderByProjectRef.current);
    // Prune ids for Terminals that no longer exist (e.g. deleted) — this
    // never adds new ones: opening a tab is always an explicit action.
    setOpenedTerminalIds((prev) => prev.filter((id) => list.some((t) => t.id === id)));
    setActiveTerminalId((prevActive) =>
      prevActive && list.some((t) => t.id === prevActive) ? prevActive : null,
    );
    return { list, order };
  }

  // Opens (attaching, via TerminalView's own mount effect) and activates a
  // Terminal's tab. The only path that ever causes an attach.
  function openTerminal(terminalId: string) {
    setOpenedTerminalIds((prev) => (prev.includes(terminalId) ? prev : [...prev, terminalId]));
    setActiveTerminalId(terminalId);
  }

  async function handleSelectProject(projectId: string) {
    setSelectedProjectId(projectId);
    setTerminals([]);
    // terminalOrderByProject is deliberately NOT touched here — each
    // Project keeps its own remembered order (see its declaration above).
    // Resetting it on every switch was the bug: re-deriving order from
    // scratch fell back to the daemon's own (unordered) listing order, so
    // a Project's tabs visibly reshuffled every time you came back to it.
    setOpenedTerminalIds([]);
    setActiveTerminalId(null);
    setTerminalForm(null);
    const result = await refreshTerminals(projectId);
    // Opening a Project with existing Terminals shows the first one (in
    // display order) right away, rather than an empty "select a tab" panel.
    if (result && result.order.length > 0) {
      openTerminal(result.order[0]);
    }
  }

  async function handleCreateProject(name: string) {
    const projectId = await createProject(name);
    setProjects(await listProjects());
    setSelectedProjectId(projectId);
    setTerminals([]);
    setOpenedTerminalIds([]);
    setActiveTerminalId(null);
    setTerminalForm(null);
    await refreshTerminals(projectId);
  }

  // Back to the Active Projects dashboard: the selection is what decides
  // which screen `main` renders, so clearing it is the whole navigation.
  // Opened tabs are dropped along with it, same as switching Projects.
  function handleGoHome() {
    setSelectedProjectId(null);
    setTerminals([]);
    setOpenedTerminalIds([]);
    setActiveTerminalId(null);
    setTerminalForm(null);
    setEditingProjectId(null);
    latestProjectRequest.current = null;
  }

  async function handleSetProjectScripts(scripts: ProjectScript[]) {
    if (!selectedProjectId) return;
    const updated = await setProjectScripts(selectedProjectId, scripts);
    setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  }

  async function handleUpdateProject(projectId: string, options: UpdateProjectOptions) {
    await updateProject(projectId, options);
    setProjects(await listProjects());
    setEditingProjectId(null);
  }

  // Applied optimistically (before the daemon round trip resolves) so a
  // click reflects immediately — same reasoning as `moveActiveTerminal` for
  // Terminal tabs, just persisted server-side instead of only in memory.
  async function handleReorderProjects(projectIds: string[]) {
    setProjects((prev) =>
      projectIds
        .map((id) => prev.find((p) => p.id === id))
        .filter((p): p is ProjectInfo => p !== undefined),
    );
    const updated = await reorderProjects(projectIds);
    setProjects(updated);
  }

  async function handleCreateTerminal(cwd: string, options: CreateTerminalOptions) {
    if (!selectedProjectId) return;
    // Unnamed Terminals get a predictable "Terminal N" default instead of
    // showing up as a bare id in the tab bar.
    const name = options.name?.trim() || `Terminal ${terminals.length + 1}`;
    const terminalId = await createTerminal(selectedProjectId, cwd, { ...options, name });
    await refreshTerminals(selectedProjectId);
    setTerminalForm(null);
    // A freshly created Terminal shows immediately — this is the one
    // exception to "opening is always explicit": the user just asked for it.
    openTerminal(terminalId);
  }

  async function handleUpdateTerminal(
    terminalId: string,
    cwd: string,
    options: CreateTerminalOptions,
  ) {
    if (!selectedProjectId) return;
    await updateTerminal(terminalId, cwd, options);
    await refreshTerminals(selectedProjectId);
    setTerminalForm(null);
  }

  async function handleDeleteTerminal(terminalId: string) {
    if (!selectedProjectId) return;
    const wasActive = terminalId === activeTerminalId;
    await deleteTerminal(terminalId);
    const result = await refreshTerminals(selectedProjectId);
    // Removing the active tab shouldn't leave the workspace on an empty
    // "select a tab" panel when another Terminal is still around.
    if (wasActive && result && result.order.length > 0) {
      openTerminal(result.order[0]);
    }
  }

  const orderedTerminals = (selectedProjectId ? terminalOrderByProject[selectedProjectId] : undefined)
    ?.map((id) => terminals.find((t) => t.id === id))
    .filter((t): t is TerminalInfo => t !== undefined) ?? [];

  // A new Terminal defaults to the last *selected* one's directory (not the
  // last *created* one's) — picking up wherever you were just looking.
  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  const defaultCwdForNewTerminal =
    terminals.find((t) => t.id === activeTerminalId)?.cwd ?? selectedProject?.default_cwd ?? "";

  // Reorders the active Terminal's tab within its Project's display order,
  // wrapping around at either end. Only the order moves — nothing about the
  // Terminal itself changes.
  function moveActiveTerminal(step: number) {
    if (!selectedProjectId || !activeTerminalId) return;
    const order = terminalOrderByProjectRef.current[selectedProjectId] ?? [];
    const from = order.indexOf(activeTerminalId);
    if (from === -1 || order.length < 2) return;
    const to = (((from + step) % order.length) + order.length) % order.length;
    const next = order.filter((id) => id !== activeTerminalId);
    next.splice(to, 0, activeTerminalId);
    terminalOrderByProjectRef.current = {
      ...terminalOrderByProjectRef.current,
      [selectedProjectId]: next,
    };
    setTerminalOrderByProject(terminalOrderByProjectRef.current);
  }

  // Creates a Terminal with no configuration at all: the defaults the
  // Configure page would have shown anyway (name "Terminal N", the current
  // directory, everything else the daemon's default).
  async function handleQuickCreateTerminal() {
    if (!selectedProjectId) return;
    await handleCreateTerminal(defaultCwdForNewTerminal, {});
  }

  // Global shortcuts — ShortcutGuide renders this same set below the
  // Terminal, so the two must stay in step.
  //
  // Plain `Alt+<key>`: `Ctrl+Alt+<key>` combinations are widely claimed by
  // desktop environments (workspace switching and friends), so they never
  // reached the app.
  //
  // Registered in the *capture* phase on `window`: while a Terminal has
  // focus, xterm.js consumes keydown on its own textarea and forwards the
  // keystroke to the PTY, so a bubbling listener would never see these —
  // and the shell would receive a stray escape sequence instead. Matching
  // on `event.code` rather than `event.key` because Alt+<key> produces a
  // different `key` depending on the keyboard layout, while the physical
  // code stays put.
  //
  // Inactive while a Configure page is up: there are no tabs to act on
  // there, and a form field should keep its own key handling.
  const formIsOpen = terminalForm !== null || editingProjectId !== null;
  useEffect(() => {
    if (!selectedProjectId || formIsOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      const plainAlt = event.altKey && !event.ctrlKey && !event.shiftKey && !event.metaKey;
      const bare = !event.altKey && !event.ctrlKey && !event.shiftKey && !event.metaKey;
      const ids = orderedTerminals.map((t) => t.id);

      // Move mode swallows the bare arrows too — that's the whole point of
      // it being a mode: you nudge the tab left/right without holding Alt,
      // and Escape (or Alt+M again) hands the keys back to the shell.
      // Enter deliberately isn't an exit key: a stopped Terminal uses it to
      // start (see TerminalView).
      if (isMovingTab) {
        if (bare && (event.code === "ArrowLeft" || event.code === "ArrowRight")) {
          event.preventDefault();
          event.stopPropagation();
          moveActiveTerminal(event.code === "ArrowRight" ? 1 : -1);
          return;
        }
        if ((bare && event.code === "Escape") || (plainAlt && event.code === "KeyM")) {
          event.preventDefault();
          event.stopPropagation();
          setIsMovingTab(false);
          return;
        }
      }

      if (!plainAlt) return;

      if (event.code === "KeyT") {
        event.preventDefault();
        event.stopPropagation();
        void runAction(handleQuickCreateTerminal);
        return;
      }

      if (ids.length === 0 || !activeTerminalId) return;

      if (event.code === "KeyE") {
        event.preventDefault();
        event.stopPropagation();
        setTerminalForm({ mode: "edit", terminalId: activeTerminalId });
        return;
      }

      if (event.code === "KeyQ") {
        event.preventDefault();
        event.stopPropagation();
        void stopTerminal(activeTerminalId).catch((err) =>
          setError(err instanceof Error ? err.message : String(err)),
        );
        return;
      }

      if (event.code === "KeyM") {
        event.preventDefault();
        event.stopPropagation();
        if (ids.length > 1) setIsMovingTab(true);
        return;
      }

      // Deletes outright, matching the header's Remove button — the
      // Terminal, its config and its scrollback are gone for good.
      if (event.code === "Delete") {
        event.preventDefault();
        event.stopPropagation();
        void runAction(() => handleDeleteTerminal(activeTerminalId));
        return;
      }

      if (event.code === "ArrowLeft" || event.code === "ArrowRight") {
        event.preventDefault();
        event.stopPropagation();
        const step = event.code === "ArrowRight" ? 1 : -1;
        const current = ids.indexOf(activeTerminalId);
        // Wraps around, and an unknown active tab starts from the first one
        // going right, the last one going left.
        const next = (((current === -1 ? -step : current) + step) % ids.length + ids.length) % ids.length;
        openTerminal(ids[next]);
      }
    }

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedProjectId,
    formIsOpen,
    activeTerminalId,
    isMovingTab,
    defaultCwdForNewTerminal,
    orderedTerminals.map((t) => t.id).join(),
  ]);

  // Leaving the Project (or the tab set shrinking to one) ends move mode —
  // nothing left to move, and a lingering mode would keep eating arrows.
  useEffect(() => {
    if (orderedTerminals.length < 2 || formIsOpen) setIsMovingTab(false);
  }, [orderedTerminals.length, formIsOpen]);

  const editingProject = projects.find((p) => p.id === editingProjectId);

  const editingTerminal =
    terminalForm?.mode === "edit"
      ? terminals.find((t) => t.id === terminalForm.terminalId)
      : undefined;

  const editingInitial: ConfigureTerminalInitial | undefined = editingTerminal
    ? {
        name: editingTerminal.name ?? "",
        cwd: editingTerminal.cwd,
        startupCommand: editingTerminal.startup_command ?? "",
        envVars: editingTerminal.env_vars,
        shell: editingTerminal.shell ?? "",
        scrollbackLines: String(editingTerminal.scrollback_lines),
      }
    : undefined;

  return (
    <div className="flex h-screen flex-col">
      {error && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 border-b-[4px] border-ink bg-tertiary px-4 py-2.5 font-mono text-sm font-bold text-on-tertiary"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            aria-label="Dismiss error"
            className="cursor-pointer border-0 bg-transparent px-1 text-lg text-on-tertiary shadow-none"
          >
            &times;
          </button>
        </div>
      )}
      <div className="flex min-h-0 flex-1">
        <ProjectSidebar
          projects={projects}
          selectedProjectId={selectedProjectId}
          onSelect={(id) => void runAction(() => handleSelectProject(id))}
          onCreate={(name) => void runAction(() => handleCreateProject(name))}
          onGoHome={handleGoHome}
        />
        <main className="box-border flex min-h-0 flex-1 flex-col bg-[rgb(238,238,238)] bg-[repeating-linear-gradient(45deg,rgb(226,226,226)_0px,rgb(226,226,226)_1px,transparent_0px,transparent_50%)] bg-[length:10px_10px] p-6">
        {!ready ? null : editingProject ? (
          <ConfigureProjectPage
            project={editingProject}
            onCancel={() => setEditingProjectId(null)}
            onSubmit={(options) =>
              void runAction(() => handleUpdateProject(editingProject.id, options))
            }
          />
        ) : !selectedProjectId ? (
          <ProjectDashboard
            projects={projects}
            onOpen={(id) => void runAction(() => handleSelectProject(id))}
            onEdit={(id) => setEditingProjectId(id)}
            onReorder={(ids) => void runAction(() => handleReorderProjects(ids))}
          />
        ) : terminalForm?.mode === "create" ? (
          <ConfigureTerminalPage
            mode="create"
            defaultCwd={defaultCwdForNewTerminal}
            defaultName={`Terminal ${terminals.length + 1}`}
            onCancel={() => setTerminalForm(null)}
            onSubmit={(cwd, options) => void runAction(() => handleCreateTerminal(cwd, options))}
          />
        ) : terminalForm?.mode === "edit" && editingTerminal ? (
          <ConfigureTerminalPage
            mode="edit"
            defaultCwd={defaultCwdForNewTerminal}
            defaultName={editingTerminal.name ?? ""}
            initial={editingInitial}
            onCancel={() => setTerminalForm(null)}
            onSubmit={(cwd, options) =>
              void runAction(() => handleUpdateTerminal(editingTerminal.id, cwd, options))
            }
          />
        ) : (
          <>
            <div className="mb-2 flex flex-wrap items-center gap-3">
              <button
                type="button"
                className="btn bg-surface-container-lowest text-ink"
                onClick={handleGoHome}
              >
                <IconArrowLeft />
                Active Projects
              </button>
              <h2 className="m-0 font-display text-[2rem] leading-tight font-bold tracking-tight uppercase">
                {selectedProject?.name}
              </h2>
              <button
                type="button"
                className="btn ml-auto bg-surface-container-lowest text-ink"
                onClick={() => setEditingProjectId(selectedProjectId)}
              >
                <IconEdit />
                Edit project
              </button>
            </div>
            {openedTerminalIds.length === 0 ? (
              terminals.length === 0 ? (
                <div className="flex flex-col items-start gap-3">
                  <p>No terminals yet.</p>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => setTerminalForm({ mode: "create" })}
                  >
                    <IconPlus />
                    New Terminal
                  </button>
                </div>
              ) : (
                <p>Select a tab to open it.</p>
              )
            ) : (
              <div className="flex min-h-0 flex-1 flex-col">
                {openedTerminalIds.map((terminalId) => {
                  const info = terminals.find((t) => t.id === terminalId);
                  return (
                    <div
                      key={terminalId}
                      className="flex min-h-0 flex-1"
                      style={{ display: terminalId === activeTerminalId ? undefined : "none" }}
                    >
                      <TerminalView
                        terminalId={terminalId}
                        name={info?.name ?? terminalId.slice(0, 8)}
                        cwd={info?.cwd ?? ""}
                        onEdit={() => setTerminalForm({ mode: "edit", terminalId })}
                        onDelete={() => void runAction(() => handleDeleteTerminal(terminalId))}
                        tabs={orderedTerminals}
                        activeTerminalId={activeTerminalId}
                        onSelectTab={openTerminal}
                        onAddTab={() => setTerminalForm({ mode: "create" })}
                        isMovingTab={isMovingTab}
                        scripts={selectedProject?.scripts ?? []}
                        onScriptsChange={(scripts) =>
                          void runAction(() => handleSetProjectScripts(scripts))
                        }
                        onError={setError}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
        </main>
      </div>
    </div>
  );
}

export default App;
