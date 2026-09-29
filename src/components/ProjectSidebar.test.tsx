import { beforeEach, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import packageJson from "../../package.json";
import { ProjectSidebar } from "./ProjectSidebar";

beforeEach(() => {
  localStorage.removeItem("httyml.sidebarCollapsed");
});

it("shows the daemon state and bundled app version in expanded and collapsed layouts", async () => {
  const props = {
    projects: [],
    selectedProjectId: null,
    onSelect: () => undefined,
    onCreate: () => undefined,
    activeTerminalCounts: {},
    onGoHome: () => undefined,
  };
  const { rerender } = render(<ProjectSidebar {...props} daemonState="Running" />);
  const nav = screen.getByRole("navigation", { name: "Projects" });

  expect(within(nav).getByRole("status")).toHaveTextContent("Daemon online");
  expect(within(nav).getByRole("status").firstElementChild).toHaveClass("bg-secondary");
  expect(within(nav).getByText(`App v${packageJson.version}`)).toBeInTheDocument();

  rerender(<ProjectSidebar {...props} daemonState="Stopped" />);
  expect(within(nav).getByRole("status")).toHaveTextContent("Daemon offline");
  expect(within(nav).getByRole("status").firstElementChild).toHaveClass("bg-on-surface-variant");

  rerender(<ProjectSidebar {...props} daemonState="Unresponsive" />);
  expect(within(nav).getByRole("status")).toHaveTextContent("Daemon unresponsive");
  expect(within(nav).getByRole("status").firstElementChild).toHaveClass("bg-error");

  await userEvent.click(within(nav).getByRole("button", { name: "Collapse sidebar" }));
  expect(within(nav).getByRole("status")).toHaveAccessibleName("Daemon unresponsive");
  expect(within(nav).getByText(`v${packageJson.version}`)).toBeInTheDocument();
});
