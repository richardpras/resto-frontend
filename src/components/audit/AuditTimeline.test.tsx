// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AuditTimeline } from "./AuditTimeline";

const sampleRecord = {
  id: "pos:1",
  module: "accounting",
  entityType: "journal",
  entityId: 10,
  action: "reversal_created",
  userId: 1,
  userName: "Richard",
  outletId: 1,
  timestamp: new Date().toISOString(),
  before: { status: "posted" },
  after: { status: "reversed" },
  metadata: { riskLevel: "critical" as const },
};

describe("AuditTimeline", () => {
  it("renders records with risk badge", () => {
    render(<AuditTimeline records={[sampleRecord]} />);
    expect(screen.getByText("reversal_created")).toBeInTheDocument();
    expect(screen.getByText("Richard")).toBeInTheDocument();
    expect(screen.getByText("Critical")).toBeInTheDocument();
  });

  it("shows empty state", () => {
    render(<AuditTimeline records={[]} />);
    expect(screen.getByText(/No audit events found/)).toBeInTheDocument();
  });
});
