import type { ProjectScript, ScriptArg } from "./daemon";

/// Wraps a value for the shell when it isn't a plain word. Single quotes,
/// with embedded quotes broken out the POSIX way ('\'') — this text is
/// typed into a live shell, so a path with a space (or worse) must not turn
/// into extra arguments.
function shellQuote(value: string): string {
  if (/^[A-Za-z0-9_@%+=:,./-]+$/.test(value)) return value;
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function renderArg(arg: ScriptArg, value: string): string {
  const trimmed = value.trim();
  // A blank optional argument disappears — flag included, so a script with
  // `--exclude {pattern}` runs clean when the user leaves it empty.
  if (!trimmed) return "";
  const quoted = shellQuote(trimmed);
  const flag = arg.flag?.trim();
  return flag ? `${flag} ${quoted}` : quoted;
}

/// Substitutes a script's args into its command. `{arg-name}` placeholders
/// are replaced in place; an argument the command doesn't mention is
/// appended at the end, so a script can be written either way.
export function buildScriptCommand(
  script: ProjectScript,
  values: Record<string, string>,
): string {
  let command = script.command;
  const appended: string[] = [];

  for (const arg of script.args) {
    const rendered = renderArg(arg, values[arg.name] ?? arg.default_value);
    const placeholder = `{${arg.name}}`;
    if (command.includes(placeholder)) {
      command = command.split(placeholder).join(rendered);
    } else if (rendered) {
      appended.push(rendered);
    }
  }

  return [command, ...appended].join(" ").replace(/\s+/g, " ").trim();
}
