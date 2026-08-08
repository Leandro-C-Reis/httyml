import { describe, expect, it } from "vitest";
import { buildScriptCommand } from "./scriptCommand";
import type { ProjectScript, ScriptArg } from "./daemon";

function arg(overrides: Partial<ScriptArg> & { name: string }): ScriptArg {
  return { label: "", flag: null, default_value: "", ...overrides };
}

function script(overrides: Partial<ProjectScript> = {}): ProjectScript {
  return { id: "s1", name: "Sync", command: "rsync -a", args: [], ...overrides };
}

describe("buildScriptCommand", () => {
  it("substitutes values into their placeholders", () => {
    const built = buildScriptCommand(
      script({ command: "rsync -a {source} {dest}", args: [arg({ name: "source" }), arg({ name: "dest" })] }),
      { source: "/src", dest: "/backup" },
    );
    expect(built).toBe("rsync -a /src /backup");
  });

  it("drops a blank argument, flag included", () => {
    const built = buildScriptCommand(
      script({
        command: "rsync -a {exclude} /src /dest",
        args: [arg({ name: "exclude", flag: "--exclude" })],
      }),
      { exclude: "  " },
    );
    expect(built).toBe("rsync -a /src /dest");
  });

  it("prepends the flag to a filled-in argument", () => {
    const built = buildScriptCommand(
      script({ command: "rsync -a {exclude} /src", args: [arg({ name: "exclude", flag: "--exclude" })] }),
      { exclude: "node_modules" },
    );
    expect(built).toBe("rsync -a --exclude node_modules /src");
  });

  it("falls back to the argument's default when no value is given", () => {
    const built = buildScriptCommand(
      script({ command: "deploy {env}", args: [arg({ name: "env", default_value: "staging" })] }),
      {},
    );
    expect(built).toBe("deploy staging");
  });

  it("appends arguments the command doesn't mention", () => {
    const built = buildScriptCommand(
      script({ command: "npm run build", args: [arg({ name: "watch", flag: "--watch" })] }),
      { watch: "src" },
    );
    expect(built).toBe("npm run build --watch src");
  });

  it("quotes values that aren't plain words", () => {
    const built = buildScriptCommand(
      script({ command: "cp {source} /dest", args: [arg({ name: "source" })] }),
      { source: "/my files/a'b" },
    );
    // A path with a space must stay one argument, and the embedded quote
    // must not end the quoting.
    expect(built).toBe("cp '/my files/a'\\''b' /dest");
  });
});
