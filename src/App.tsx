import { useEffect, useRef, useState } from "react";
import {
  createProject,
  createTerminal,
  ensureDaemon,
  listProjects,
  listTerminals,
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

  async function refreshTerminals(projectId: string, keepActive: string | null) {
    latestProjectRequest.current = projectId;
    const list = await listTerminals(projectId);
    if (latestProjectRequest.current !== projectId) return;
    setTerminals(list);
    setActiveTerminalId(list.some((t) => t.id === keepActive) ? keepActive : (list[0]?.id ?? null));
  }

  async function handleSelectProject(projectId: string) {
    setSelectedProjectId(projectId);
    setTerminals([]);
    setActiveTerminalId(null);
    await refreshTerminals(projectId, null);
  }

  async function handleCreateProject(name: string) {
    const projectId = await createProject(name);
    setProjects(await listProjects());
    setSelectedProjectId(projectId);
    setTerminals([]);
    setActiveTerminalId(null);
    await refreshTerminals(projectId, null);
  }

  async function handleCreateTerminal(cwd: string, name: string, startupCommand: string) {
    if (!selectedProjectId) return;
    const terminalId = await createTerminal(selectedProjectId, cwd, name, startupCommand);
    setLastCwd(cwd);
    await refreshTerminals(selectedProjectId, terminalId);
  }

  return (
    <div className="app-shell">
      <ProjectSidebar
        projects={projects}
        selectedProjectId={selectedProjectId}
        onSelect={handleSelectProject}
        onCreate={handleCreateProject}
      />
      <main className="container">
        {!ready ? null : selectedProjectId ? (
          <>
            <QuickCreateForm defaultCwd={lastCwd} onCreate={handleCreateTerminal} />
            <TerminalTabBar
              terminals={terminals}
              activeTerminalId={activeTerminalId}
              onSelect={setActiveTerminalId}
            />
            <div className="terminal-stack">
              {terminals.map((terminal) => (
                <div
                  key={terminal.id}
                  className="terminal-stack-item"
                  style={{ display: terminal.id === activeTerminalId ? undefined : "none" }}
                >
                  <TerminalView terminalId={terminal.id} />
                </div>
              ))}
            </div>
          </>
        ) : (
          <p>Select or create a project to get started.</p>
        )}
      </main>
    </div>
  );
}

export default App;
