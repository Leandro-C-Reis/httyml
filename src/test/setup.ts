import "@testing-library/jest-dom/vitest";

let storageWorks = false;
try {
  globalThis.localStorage?.setItem("__httyml_test_probe", "ok");
  storageWorks = globalThis.localStorage?.getItem("__httyml_test_probe") === "ok";
  globalThis.localStorage?.removeItem("__httyml_test_probe");
} catch {
  // Node can expose localStorage without a backing --localstorage-file.
}

if (!storageWorks) {
  const values = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      clear: () => values.clear(),
      getItem: (key: string) => values.get(key) ?? null,
      removeItem: (key: string) => values.delete(key),
      setItem: (key: string, value: string) => values.set(key, String(value)),
    },
  });
}

if (typeof globalThis.ResizeObserver === "undefined") {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  globalThis.ResizeObserver = ResizeObserverStub;
}
