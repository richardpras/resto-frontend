// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { SystemPriorityQueue } from "./SystemPriorityQueue";
import type { SystemPriorityAction } from "@/lib/system-health/systemHealthPriorityQueue";

const actions: SystemPriorityAction[] = [
  {
    id: "critical-1",
    level: "critical",
    title: "Payment success rate below 90%",
    message: "Current rate: 82%",
    actionUrl: "/settings/payments/health",
  },
  {
    id: "warning-1",
    level: "warning",
    title: "Menu automation alerts",
    message: "2 open menu alert(s)",
    actionUrl: "/notifications",
  },
];

describe("SystemPriorityQueue", () => {
  it("renders priority actions", () => {
    render(
      <MemoryRouter>
        <SystemPriorityQueue actions={actions} />
      </MemoryRouter>,
    );
    expect(screen.getByText(/payment success rate below 90%/i)).toBeInTheDocument();
    expect(screen.getByText(/menu automation alerts/i)).toBeInTheDocument();
  });

  it("shows empty state", () => {
    render(<SystemPriorityQueue actions={[]} />);
    expect(screen.getByText(/no priority actions/i)).toBeInTheDocument();
  });
});
