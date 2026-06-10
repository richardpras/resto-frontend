// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { SystemIncidentTimeline } from "./SystemIncidentTimeline";
import type { SystemIncidentItem } from "@/lib/system-health/systemHealthIncidents";

const incidents: SystemIncidentItem[] = [
  {
    id: "1",
    title: "Payment outage",
    message: "Success rate dropped",
    severity: "critical",
    module: "payments",
    timestamp: "2026-06-10T12:00:00.000Z",
    actionUrl: "/settings/payments/health",
  },
  {
    id: "2",
    title: "Failed jobs spike",
    message: "3 critical failures",
    severity: "high",
    module: "system",
    timestamp: "2026-06-10T11:00:00.000Z",
    actionUrl: "/system/failed-jobs",
  },
];

describe("SystemIncidentTimeline", () => {
  it("renders incidents newest first", () => {
    render(
      <MemoryRouter>
        <SystemIncidentTimeline incidents={incidents} />
      </MemoryRouter>,
    );
    expect(screen.getByText("Payment outage")).toBeInTheDocument();
    expect(screen.getByText("Failed jobs spike")).toBeInTheDocument();
  });

  it("shows empty state", () => {
    render(<SystemIncidentTimeline incidents={[]} />);
    expect(screen.getByText(/no active incidents/i)).toBeInTheDocument();
  });
});
