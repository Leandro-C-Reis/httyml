import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { IconMaximize, IconMinimize, IconX } from "./icons";

const controlBase =
  "flex h-8 min-w-9 cursor-pointer items-center justify-center border-[3px] border-ink px-2 font-mono text-xs font-bold uppercase shadow-[3px_3px_0_var(--color-hard-shadow)] transition-[transform,box-shadow] duration-100 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_var(--color-hard-shadow)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none";

function invokeWindowAction(action: () => Promise<void>) {
  void action().catch((error) => {
    // The browser preview has no native window. Tauri failures are kept out
    // of the app UI because these controls have no recoverable app state.
    console.error(error);
  });
}

export function WindowTitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    let disposed = false;

    void getCurrentWindow()
      .isMaximized()
      .then((maximized) => {
        if (!disposed) setIsMaximized(maximized);
      })
      .catch((error) => console.error(error));

    return () => {
      disposed = true;
    };
  }, []);

  async function toggleMaximize() {
    const currentWindow = getCurrentWindow();
    await currentWindow.toggleMaximize();
    setIsMaximized(await currentWindow.isMaximized());
  }

  return (
    <header
      className="flex h-12 shrink-0 items-center gap-3 border-b-[4px] border-ink bg-primary px-3 text-on-primary"
      data-tauri-drag-region
      onMouseDown={(event) => {
        if (event.button === 0) invokeWindowAction(() => getCurrentWindow().startDragging());
      }}
      onDoubleClick={() => invokeWindowAction(toggleMaximize)}
    >
      <div className="flex items-center gap-1.5" aria-hidden="true">
        <span className="h-3 w-3 border-2 border-ink bg-tertiary" />
        <span className="h-3 w-3 border-2 border-ink bg-secondary" />
        <span className="h-3 w-3 border-2 border-ink bg-surface-container-lowest" />
      </div>
      <span className="select-none font-display text-sm font-bold tracking-wide uppercase">
        HTTYML
      </span>
      <div className="ml-auto flex items-center gap-2" onMouseDown={(event) => event.stopPropagation()}>
        <button
          type="button"
          className={`${controlBase} bg-surface-container-lowest text-text`}
          onClick={() => invokeWindowAction(() => getCurrentWindow().minimize())}
        >
          <span aria-hidden="true" className="text-base leading-none">_</span>
        </button>
        <button
          type="button"
          className={`${controlBase} bg-secondary text-on-secondary`}
          onClick={() => invokeWindowAction(toggleMaximize)}
        >
          {isMaximized ?  <IconMaximize /> : <IconMinimize />}
        </button>
        <button
          type="button"
          className={`${controlBase} bg-tertiary text-on-tertiary`}
          onClick={() => invokeWindowAction(() => getCurrentWindow().close())}
        >
          <IconX />
        </button>
      </div>
    </header>
  );
}
