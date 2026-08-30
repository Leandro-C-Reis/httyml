import { open, save } from "@tauri-apps/plugin-dialog";

const JSON_FILTERS = [{ name: "JSON", extensions: ["json"] }];

/// Native "Save As" dialog for picking where to export the config to.
/// `null` means the user canceled — callers should just do nothing then.
export async function pickExportPath(defaultFileName: string): Promise<string | null> {
  const path = await save({ defaultPath: defaultFileName, filters: JSON_FILTERS });
  return path ?? null;
}

/// Native "Open" dialog for picking a config file to import. `null` means
/// the user canceled.
export async function pickImportPath(): Promise<string | null> {
  const path = await open({ multiple: false, directory: false, filters: JSON_FILTERS });
  return typeof path === "string" ? path : null;
}
