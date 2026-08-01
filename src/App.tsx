import { useEffect, useState } from "react";
import { createTerminal, ensureDaemon } from "./lib/daemon";
import { QuickCreateForm } from "./components/QuickCreateForm";
import { TerminalView } from "./components/TerminalView";
import "./App.css";

function App() {
  const [lastCwd, setLastCwd] = useState("");
  const [activeTerminalId, setActiveTerminalId] = useState<string | null>(null);

  useEffect(() => {
    void ensureDaemon();
  }, []);

  async function handleCreate(cwd: string, name: string, startupCommand: string) {
    const terminalId = await createTerminal(cwd, name, startupCommand);
    setLastCwd(cwd);
    setActiveTerminalId(terminalId);
  }

  return (
    <main className="container">
      <QuickCreateForm defaultCwd={lastCwd} onCreate={handleCreate} />
      {activeTerminalId && <TerminalView terminalId={activeTerminalId} />}
    </main>
  );
}

export default App;
