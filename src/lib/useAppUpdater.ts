import { useCallback, useEffect, useRef, useState } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { relaunch } from "@tauri-apps/plugin-process";
import { check, type Update } from "@tauri-apps/plugin-updater";

export type UpdateStatus =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "up-to-date" }
  | { kind: "available"; version: string; notes?: string }
  | { kind: "installing"; version: string; progress: number | null }
  | { kind: "installed"; version: string }
  | { kind: "error"; message: string; duringInstall: boolean };

export function useAppUpdater() {
  const [status, setStatus] = useState<UpdateStatus>({ kind: "idle" });
  const [noticeDismissed, setNoticeDismissed] = useState(false);
  const updateRef = useRef<Update | null>(null);
  const busyRef = useRef(false);

  const checkForUpdates = useCallback(async () => {
    if (!isTauri() || busyRef.current || status.kind === "installed") return;
    busyRef.current = true;
    setStatus({ kind: "checking" });
    try {
      if (updateRef.current) await updateRef.current.close();
      updateRef.current = null;
      updateRef.current = await check({ timeout: 10000 });
      if (updateRef.current) {
        setStatus({
          kind: "available",
          version: updateRef.current.version,
          notes: updateRef.current.body,
        });
        setNoticeDismissed(false);
      } else {
        setStatus({ kind: "up-to-date" });
      }
    } catch (error) {
      setStatus({ kind: "error", message: String(error), duringInstall: false });
    } finally {
      busyRef.current = false;
    }
  }, [status.kind]);

  const installUpdate = useCallback(async () => {
    const update = updateRef.current;
    if (!update || busyRef.current) return;
    busyRef.current = true;
    setNoticeDismissed(false);
    let downloaded = 0;
    let contentLength: number | undefined;
    setStatus({ kind: "installing", version: update.version, progress: null });
    try {
      await update.downloadAndInstall((event) => {
        if (event.event === "Started") {
          contentLength = event.data.contentLength;
        } else if (event.event === "Progress") {
          downloaded += event.data.chunkLength;
        }
        setStatus({
          kind: "installing",
          version: update.version,
          progress: contentLength ? Math.min(100, Math.round((downloaded / contentLength) * 100)) : null,
        });
      });
      updateRef.current = null;
      setStatus({ kind: "installed", version: update.version });
    } catch (error) {
      setStatus({ kind: "error", message: String(error), duringInstall: true });
    } finally {
      busyRef.current = false;
    }
  }, []);

  const restartApp = useCallback(async () => {
    try {
      await relaunch();
    } catch (error) {
      setStatus({ kind: "error", message: String(error), duringInstall: true });
    }
  }, []);

  useEffect(() => {
    void checkForUpdates();
    // One check per app launch; the Settings button handles later retries.
  }, []);

  return { status, noticeDismissed, setNoticeDismissed, checkForUpdates, installUpdate, restartApp };
}
