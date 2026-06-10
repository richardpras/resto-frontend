// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/stores/outletStore", () => ({
  useOutletStore: vi.fn((selector) => selector({ activeOutletId: 1 })),
}));

const mockGetAccountingHealth = vi.fn();
const mockGetAccountingHealthTrends = vi.fn();
const mockGetAccountingSettings = vi.fn();
const mockListFailures = vi.fn();

vi.mock("@/lib/api-integration/accountingEndpoints", () => ({
  getAccountingHealth: (...args: unknown[]) => mockGetAccountingHealth(...args),
  getAccountingHealthTrends: (...args: unknown[]) => mockGetAccountingHealthTrends(...args),
  getAccountingSettings: (...args: unknown[]) => mockGetAccountingSettings(...args),
  listAccountingPostingFailures: (...args: unknown[]) => mockListFailures(...args),
  updateAccountingSettings: vi.fn(),
  retryAccountingPostingFailure: vi.fn(),
}));

import AccountingHealth from "@/pages/accounting/AccountingHealth";

describe("AccountingHealth UI", () => {
  beforeEach(() => {
    mockGetAccountingHealth.mockResolvedValue({
      healthScore: 72,
      failedPostings: 3,
      pendingPostings: 3,
      duplicatePostingAttempts: 0,
      unbalancedJournalAttempts: 0,
      missingMappings: 0,
      openPeriods: 1,
      lockedPeriods: 0,
      healthSeverity: "warning",
      postingFailuresSeverity: "warning",
      failureAgingBuckets: { "0-1h": 2, "1-4h": 1, "4-24h": 0, "1-3d": 0, "3d+": 0 },
      topFailureSources: [{ sourceType: "order_payment", count: 3 }],
      priorityQueue: [
        {
          priority: "warning",
          title: "Posting Failures",
          message: "3 pending posting failure(s) require attention.",
          actionUrl: "/accounting?tab=health",
        },
      ],
    });
    mockGetAccountingHealthTrends.mockResolvedValue({
      postingFailures: [{ date: "2026-06-01", count: 1 }],
      giftCardVariance: [],
      inventoryVariance: [],
      severityTrend: [{ date: "2026-06-01", severity: "warning" }],
    });
    mockGetAccountingSettings.mockResolvedValue({ revenuePostingMode: "realtime" });
    mockListFailures.mockResolvedValue([]);
  });

  it("renders severity badge and priority queue", async () => {
    render(
      <MemoryRouter>
        <AccountingHealth />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Priority Action Queue")).toBeTruthy();
    });

    expect(screen.getAllByText("Warning").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Posting Failures").length).toBeGreaterThan(0);
    expect(screen.getByText("Failure Aging Distribution")).toBeTruthy();
    expect(screen.getByText("Top Failure Sources")).toBeTruthy();
  });
});
