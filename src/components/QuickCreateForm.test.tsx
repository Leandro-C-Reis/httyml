import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuickCreateForm } from "./QuickCreateForm";

describe("QuickCreateForm", () => {
  it("disables submit until a directory is entered", async () => {
    const onCreate = vi.fn();
    render(<QuickCreateForm defaultCwd="" onCreate={onCreate} />);

    expect(screen.getByRole("button", { name: /new terminal/i })).toBeDisabled();

    await userEvent.type(screen.getByLabelText(/directory/i), "/home/dev/project");

    expect(screen.getByRole("button", { name: /new terminal/i })).toBeEnabled();
  });

  it("pre-fills the directory field with the last used directory", () => {
    render(<QuickCreateForm defaultCwd="/home/dev/last-project" onCreate={vi.fn()} />);

    expect(screen.getByLabelText(/directory/i)).toHaveValue("/home/dev/last-project");
  });

  it("creates a terminal with only a directory, leaving name and startup command optional", async () => {
    const onCreate = vi.fn();
    render(<QuickCreateForm defaultCwd="" onCreate={onCreate} />);

    await userEvent.type(screen.getByLabelText(/directory/i), "/home/dev/project");
    await userEvent.click(screen.getByRole("button", { name: /new terminal/i }));

    expect(onCreate).toHaveBeenCalledWith(
      "/home/dev/project",
      expect.objectContaining({ name: "", startupCommand: "" }),
    );
  });

  it("passes name and startup command through when provided", async () => {
    const onCreate = vi.fn();
    render(<QuickCreateForm defaultCwd="" onCreate={onCreate} />);

    await userEvent.type(screen.getByLabelText(/directory/i), "/home/dev/project");
    await userEvent.type(screen.getByLabelText(/name/i), "dev server");
    await userEvent.type(screen.getByLabelText(/startup command/i), "npm run dev");
    await userEvent.click(screen.getByRole("button", { name: /new terminal/i }));

    expect(onCreate).toHaveBeenCalledWith(
      "/home/dev/project",
      expect.objectContaining({ name: "dev server", startupCommand: "npm run dev" }),
    );
  });

  it("parses environment variables from the advanced KEY=VALUE textarea", async () => {
    const onCreate = vi.fn();
    render(<QuickCreateForm defaultCwd="" onCreate={onCreate} />);

    await userEvent.type(screen.getByLabelText(/directory/i), "/home/dev/project");
    await userEvent.click(screen.getByText(/advanced/i));
    await userEvent.type(
      screen.getByLabelText(/environment variables/i),
      "NODE_ENV=test\nDEBUG=true",
    );
    await userEvent.click(screen.getByRole("button", { name: /new terminal/i }));

    expect(onCreate).toHaveBeenCalledWith(
      "/home/dev/project",
      expect.objectContaining({ envVars: { NODE_ENV: "test", DEBUG: "true" } }),
    );
  });
});
