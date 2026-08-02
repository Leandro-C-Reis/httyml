import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfigureTerminalPage } from "./ConfigureTerminalPage";

describe("ConfigureTerminalPage", () => {
  it("creates a terminal with no directory, name, or command specified", async () => {
    const onSubmit = vi.fn();
    render(
      <ConfigureTerminalPage
        mode="create"
        defaultCwd=""
        defaultName="Terminal 1"
        onCancel={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: /create terminal/i }));

    expect(onSubmit).toHaveBeenCalledWith(
      "",
      expect.objectContaining({ name: "", startupCommand: "" }),
    );
  });

  it("calls onCancel when Cancel is clicked", async () => {
    const onCancel = vi.fn();
    render(
      <ConfigureTerminalPage
        mode="create"
        defaultCwd=""
        defaultName="Terminal 1"
        onCancel={onCancel}
        onSubmit={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("parses environment variables from the advanced KEY=VALUE textarea", async () => {
    const onSubmit = vi.fn();
    render(
      <ConfigureTerminalPage
        mode="create"
        defaultCwd=""
        defaultName="Terminal 1"
        onCancel={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    await userEvent.click(screen.getByText(/advanced/i));
    await userEvent.type(
      screen.getByLabelText(/environment variables/i),
      "NODE_ENV=test\nDEBUG=true",
    );
    await userEvent.click(screen.getByRole("button", { name: /create terminal/i }));

    expect(onSubmit).toHaveBeenCalledWith(
      "",
      expect.objectContaining({ envVars: { NODE_ENV: "test", DEBUG: "true" } }),
    );
  });

  it("in edit mode, prefills every field from initial and submits the edited values", async () => {
    const onSubmit = vi.fn();
    render(
      <ConfigureTerminalPage
        mode="edit"
        defaultCwd=""
        defaultName="Terminal 1"
        initial={{
          name: "dev server",
          cwd: "/home/dev/project",
          startupCommand: "npm run dev",
          envVars: { NODE_ENV: "production" },
          shell: "zsh",
          scrollbackLines: "5000",
        }}
        onCancel={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    expect(screen.getByText(/edit terminal/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/name/i)).toHaveValue("dev server");
    expect(screen.getByLabelText(/startup command/i)).toHaveValue("npm run dev");
    expect(screen.getByLabelText(/directory/i)).toHaveValue("/home/dev/project");

    await userEvent.click(screen.getByText(/advanced/i));
    expect(screen.getByLabelText(/shell/i)).toHaveValue("zsh");
    expect(screen.getByLabelText(/environment variables/i)).toHaveValue("NODE_ENV=production");
    expect(screen.getByLabelText(/scrollback/i)).toHaveValue(5000);

    const nameInput = screen.getByLabelText(/name/i);
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "renamed server");
    await userEvent.click(screen.getByRole("button", { name: /save changes/i }));

    expect(onSubmit).toHaveBeenCalledWith(
      "/home/dev/project",
      expect.objectContaining({ name: "renamed server", startupCommand: "npm run dev" }),
    );
  });
});
