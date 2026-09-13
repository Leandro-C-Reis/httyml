import { getCurrentWindow } from "@tauri-apps/api/window";
import { IconX } from "./icons";

const controlBase =
  "flex h-8 min-w-9 cursor-pointer items-center justify-center border-[3px] border-ink px-2 font-mono text-xs font-bold uppercase shadow-[3px_3px_0_var(--color-ink)] transition-[transform,box-shadow] duration-100 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_var(--color-ink)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none";

function invokeWindowAction(action: () => Promise<void>) {
  void action().catch((error) => {
    // The browser preview has no native window. Tauri failures are kept out
    // of the app UI because these controls have no recoverable app state.
    console.error(error);
  });
}

export function WindowTitleBar() {
  return (
    <header
      className="flex h-12 shrink-0 items-center gap-3 border-b-[4px] border-ink bg-primary px-3 text-on-primary"
      data-tauri-drag-region
      onMouseDown={(event) => {
        if (event.button === 0) invokeWindowAction(() => getCurrentWindow().startDragging());
      }}
      onDoubleClick={() => invokeWindowAction(() => getCurrentWindow().toggleMaximize())}
    >
      <div className="flex items-center gap-1.5" aria-hidden="true">
        <span className="h-3 w-3 border-2 border-ink bg-tertiary" />
        <span className="h-3 w-3 border-2 border-ink bg-secondary" />
        <span className="h-3 w-3 border-2 border-ink bg-surface-container-lowest" />
      </div>
      <span className="select-none font-display text-sm font-bold tracking-wide uppercase">
        HTTYML // TERMINAL CORE
      </span>
      <div className="ml-auto flex items-center gap-2" onMouseDown={(event) => event.stopPropagation()}>
        <button
          type="button"
          aria-label="Minimize window"
          title="Minimize window"
          className={`${controlBase} bg-surface-container-lowest text-ink`}
          onClick={() => invokeWindowAction(() => getCurrentWindow().minimize())}
        >
          <span aria-hidden="true" className="text-base leading-none">_</span>
        </button>
        <button
          type="button"
          aria-label="Maximize window"
          title="Maximize window"
          className={`${controlBase} bg-secondary text-on-secondary`}
          onClick={() => invokeWindowAction(() => getCurrentWindow().toggleMaximize())}
        >
          <span aria-hidden="true" className="text-sm leading-none">□</span>
        </button>
        <button
          type="button"
          aria-label="Close window"
          title="Close window"
          className={`${controlBase} bg-tertiary text-on-tertiary`}
          onClick={() => invokeWindowAction(() => getCurrentWindow().close())}
        >
          <IconX />
        </button>
      </div>
    </header>
  );
}
