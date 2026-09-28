import { readFileSync } from "node:fs";

const [tag, latestPath, releasePath] = process.argv.slice(2);
const latest = JSON.parse(readFileSync(latestPath, "utf8"));
const release = JSON.parse(readFileSync(releasePath, "utf8"));
if (latest.version !== tag.slice(1)) throw new Error("Updater manifest version does not match release tag");
if (release.tag_name !== tag || !release.draft) throw new Error("Expected the matching draft release");

const seenAssets = new Set();
for (const arch of ["x86_64", "aarch64"]) {
  for (const [installer, extension] of [["appimage", ".AppImage"], ["deb", ".deb"], ["rpm", ".rpm"]]) {
    const platform = latest.platforms?.[`linux-${arch}-${installer}`];
    if (!platform?.signature || !platform?.url) throw new Error(`Missing signed updater entry: linux-${arch}-${installer}`);
    const url = new URL(platform.url);
    const id = Number(url.pathname.match(/\/releases\/assets\/(\d+)$/)?.[1]);
    const downloadName = url.pathname.match(/\/releases\/download\/[^/]+\/([^/]+)$/)?.[1];
    if (!["api.github.com", "github.com"].includes(url.hostname)) throw new Error(`Unexpected update host: ${url.hostname}`);
    const asset = release.assets.find((candidate) => candidate.id === id || candidate.name === decodeURIComponent(downloadName ?? ""));
    if (!asset?.name.endsWith(extension)) throw new Error(`Updater URL has no matching ${installer} asset for ${arch}`);
    const archPattern = arch === "x86_64" ? /(?:x86_64|amd64)/i : /(?:aarch64|arm64)/i;
    if (!archPattern.test(asset.name)) throw new Error(`Updater asset has the wrong architecture for ${arch}: ${asset.name}`);
    if (seenAssets.has(asset.id)) throw new Error(`Updater asset is used by more than one platform: ${asset.name}`);
    seenAssets.add(asset.id);
    if (!release.assets.some((candidate) => candidate.name === `${asset.name}.sig`)) {
      throw new Error(`Missing signature asset for ${asset.name}`);
    }
  }
}

console.log(`Verified six signed Linux packages in ${tag}`);
