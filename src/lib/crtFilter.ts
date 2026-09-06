const CRT_FILTER_KEY = "httyml.crt-filter";

// Like the theme preference, this only affects the local display and should
// never prevent the app from starting when storage is unavailable.
export function readCrtFilter(): boolean {
  try {
    return globalThis.localStorage?.getItem(CRT_FILTER_KEY) !== "false";
  } catch {
    return true;
  }
}

export function writeCrtFilter(enabled: boolean) {
  try {
    globalThis.localStorage?.setItem(CRT_FILTER_KEY, String(enabled));
  } catch {
    // Preference just won't stick; nothing else depends on it.
  }
}