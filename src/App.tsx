import { useEffect, useRef, useState } from "react";
import {
  createProject,
  createTerminal,
  deleteProject,
  deleteTerminal,
  ensureDaemon,
  listProjects,
  listTerminals,
  type CreateTerminalOptions,
  type ProjectInfo,
  type TerminalInfo,
} from "./lib/daemon";
import { ProjectSidebar } from "./components/ProjectSidebar";
import { QuickCreateForm } from "./components/QuickCreateForm";
import { TerminalTabBar } from "./components/TerminalTabBar";
import { TerminalView } from "./components/TerminalView";
import "./App.css";

function App() {
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [terminals, setTerminals] = useState<TerminalInfo[]>([]);
  // Terminals the user has actually opened a tab for at least once — only
  // these get a mounted TerminalView (and so only these ever attach).
  // Listing a Project's Terminals must never imply opening any of them.
  const [openedTerminalIds, setOpenedTerminalIds] = useState<string[]>([]);
  const [activeTerminalId, setActiveTerminalId] = useState<string | null>(null);
  const [lastCwd, setLastCwd] = useState("");
  const [ready, setReady] = useState(false);
  // Tracks which Project's terminal list is the most recently requested one,
  // so a slow response for a Project the user has since switched away from
  // can't overwrite what's currently selected (see refreshTerminals).
  const latestProjectRequest = useRef<string | null>(null);

  useEffect(() => {
    void ensureDaemon().then(async () => {
      setProjects(await listProjects());
      setReady(true);
    });
  }, []);

  async function refreshTerminals(projectId: string) {
    latestProjectRequest.current = projectId;
    const list = await listTerminals(projectId);
    if (latestProjectRequest.current !== projectId) return;
    setTerminals(list);
    // Prune ids for Terminals that no longer exist (e.g. deleted) — this
    // never adds new ones: opening a tab is always an explicit action.
    setOpenedTerminalIds((prev) => prev.filter((id) => list.some((t) => t.id === id)));
    setActiveTerminalId((prevActive) =>
      prevActive && list.some((t) => t.id === prevActive) ? prevActive : null,
    );
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
    setOpenedTerminalIds([]);
    setActiveTerminalId(null);
    await refreshTerminals(projectId);
  }

  async function handleCreateProject(name: string) {
    const projectId = await createProject(name);
    setProjects(await listProjects());
    setSelectedProjectId(projectId);
    setTerminals([]);
    setOpenedTerminalIds([]);
    setActiveTerminalId(null);
    await refreshTerminals(projectId);
  }

  async function handleCreateTerminal(cwd: string, options: CreateTerminalOptions) {
    if (!selectedProjectId) return;
    const terminalId = await createTerminal(selectedProjectId, cwd, options);
    setLastCwd(cwd);
    await refreshTerminals(selectedProjectId);
    // A freshly created Terminal shows immediately — this is the one
    // exception to "opening is always explicit": the user just asked for it.
    openTerminal(terminalId);
  }

  async function handleDeleteTerminal(terminalId: string) {
    if (!selectedProjectId) return;
    await deleteTerminal(terminalId);
    await refreshTerminals(selectedProjectId);
  }

  async function handleDeleteProject(projectId: string) {
    await deleteProject(projectId);
    setProjects(await listProjects());
    if (projectId === selectedProjectId) {
      setSelectedProjectId(null);
      setTerminals([]);
      setOpenedTerminalIds([]);
      setActiveTerminalId(null);
    }
  }

  return (
    <div className="app-shell">
      <ProjectSidebar
        projects={projects}
        selectedProjectId={selectedProjectId}
        onSelect={handleSelectProject}
        onCreate={handleCreateProject}
        onDelete={handleDeleteProject}
      />
      <main className="container">
        {!ready ? null : selectedProjectId ? (
          <>
            <QuickCreateForm defaultCwd={lastCwd} onCreate={handleCreateTerminal} />
            <TerminalTabBar
              terminals={terminals}
              activeTerminalId={activeTerminalId}
              onSelect={openTerminal}
              onDelete={handleDeleteTerminal}
            />
            {openedTerminalIds.length === 0 ? (
              <p>Select a tab to open it.</p>
            ) : (
              <div className="terminal-stack">
                {openedTerminalIds.map((terminalId) => (
                  <div
                    key={terminalId}
                    className="terminal-stack-item"
                    style={{ display: terminalId === activeTerminalId ? undefined : "none" }}
                  >
                    <TerminalView terminalId={terminalId} />
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <p>Select or create a project to get started.</p>
        )}
      </main>
    </div>
  );
}

export default App;
