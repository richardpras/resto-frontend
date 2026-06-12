// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ShiftClosePreflightCards } from "./ShiftClosePreflightCards";
import type { ShiftClosePreflight } from "@/lib/api-integration/shiftCloseEndpoints";

const base: ShiftClosePreflight = {
  ready: true,
  severity: "warning",
  checks: {
    openBills: 2,
    pendingQrOrders: 3,
    pendingKitchenTickets: 1,
    failedPrintJobs: 0,
    pendingConsumption: 4,
    failedAccountingPostings: 0,
    openPosSession: 1,
  },
  openPosSessions: { count: 1, severity: "warning", items: [] },
  qrOrders: { pending: 1, underReview: 1, linkedUnpaidBills: 1, severity: "warning" },
};

describe("ShiftClosePreflightCards", () => {
  it("renders preflight metric cards", () => {
    render(<ShiftClosePreflightCards preflight={base} />);
    expect(screen.getByText("Open POS Sessions")).toBeInTheDocument();
    expect(screen.getByText("Open Bills")).toBeInTheDocument();
    expect(screen.getByText("QR Orders")).toBeInTheDocument();
    expect(screen.getByText("Accounting Health")).toBeInTheDocument();
  });
});
