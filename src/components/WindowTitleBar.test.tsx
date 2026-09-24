import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const windowApi = vi.hoisted(() => ({
  close: vi.fn(),
  isMaximized: vi.fn(),
  minimize: vi.fn(),
  startDragging: vi.fn(),
  toggleMaximize: vi.fn(),
}));

vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: vi.fn(() => windowApi),
}));

import { WindowTitleBar } from "./WindowTitleBar";

describe("WindowTitleBar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    windowApi.isMaximized.mockResolvedValue(false);
    windowApi.toggleMaximize.mockResolvedValue(undefined);
  });

  it("awaits the maximized state before rendering and after toggling", async () => {
    render(<WindowTitleBar />);

    await waitFor(() => expect(windowApi.isMaximized).toHaveBeenCalledTimes(1));
    await userEvent.click(screen.getByRole("button", { name: "Maximize window" }));

    await waitFor(() => expect(windowApi.toggleMaximize).toHaveBeenCalledTimes(1));
    expect(windowApi.isMaximized).toHaveBeenCalledTimes(2);
  });
});
