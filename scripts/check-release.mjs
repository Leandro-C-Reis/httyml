import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const tag = process.argv[2];
const match = /^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.exec(tag ?? "");
if (!match) throw new Error("Release tag must be stable SemVer: vMAJOR.MINOR.PATCH");
const version = tag.slice(1);

const npm = JSON.parse(readFileSync("package.json", "utf8"));
const lock = JSON.parse(readFileSync("package-lock.json", "utf8"));
const tauri = JSON.parse(readFileSync("src-tauri/tauri.conf.json", "utf8"));

function cargoVersion(path, source = readFileSync(path, "utf8")) {
  const packageSection = source.split(/^\[package\]\s*$/m)[1]?.split(/^\[/m)[0];
  const found = /^version\s*=\s*"([^"]+)"/m.exec(packageSection ?? "")?.[1];
  if (!found) throw new Error(`Missing package version in ${path}`);
  return found;
}

for (const [name, actual] of [
  ["package.json", npm.version],
  ["package-lock.json", lock.version],
  ["package-lock.json root", lock.packages[""].version],
  ["tauri.conf.json", tauri.version],
  ["src-tauri/Cargo.toml", cargoVersion("src-tauri/Cargo.toml")],
]) {
  if (actual !== version) throw new Error(`${name} version ${actual} does not match ${tag}`);
}

const daemonVersion = cargoVersion("daemon/Cargo.toml");
const previousTag = (() => {
  try {
    return execFileSync("git", ["describe", "--tags", "--match", "v[0-9]*", "--abbrev=0", `${tag}^`], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return null;
  }
})();

if (previousTag) {
  const oldDaemonManifest = execFileSync("git", ["show", `${previousTag}:daemon/Cargo.toml`], { encoding: "utf8" });
  const oldDaemonVersion = cargoVersion("daemon/Cargo.toml", oldDaemonManifest);
  const changed = execFileSync("git", ["diff", "--name-only", previousTag, tag, "--", "daemon/src", "daemon/build.rs", "daemon/Cargo.toml"], { encoding: "utf8" }).trim();
  const parts = (value) => value.split(".").map(Number);
  const increased = parts(daemonVersion).some((number, index) =>
    number > parts(oldDaemonVersion)[index] && parts(daemonVersion).slice(0, index).every((part, i) => part === parts(oldDaemonVersion)[i]),
  );
  if (changed && !increased) {
    throw new Error(`Daemon code changed since ${previousTag}; bump daemon/Cargo.toml above ${oldDaemonVersion}`);
  }
}

console.log(`Release ${tag}: app ${version}, daemon ${daemonVersion}`);
