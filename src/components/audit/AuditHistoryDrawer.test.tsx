// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AuditHistoryDrawer } from "./AuditHistoryDrawer";

const record = {
  id: "pos:2",
  module: "purchase",
  entityType: "purchase_order",
  entityId: 123,
  action: "purchase_order_created",
  userId: 1,
  userName: "Admin",
  outletId: 1,
  timestamp: "2026-06-10T09:00:00.000Z",
  before: { status: "draft" },
  after: { status: "submitted" },
  metadata: { riskLevel: "info" as const },
};

describe("AuditHistoryDrawer", () => {
  it("renders before and after snapshots", () => {
    render(
      <AuditHistoryDrawer
        open
        onOpenChange={() => {}}
        record={record}
        history={[record]}
      />,
    );

    expect(screen.getByText("Audit Details")).toBeInTheDocument();
    expect(screen.getByText("Before")).toBeInTheDocument();
    expect(screen.getByText("After")).toBeInTheDocument();
    expect(screen.getByText(/draft/)).toBeInTheDocument();
  });
});
