// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockListFailedJobs = vi.fn();
const mockGetFailedJobsSummary = vi.fn();
const mockGetFailedJobsTrends = vi.fn();

vi.mock("@/lib/api-integration/failedJobsEndpoints", () => ({
  listFailedJobs: (...args: unknown[]) => mockListFailedJobs(...args),
  getFailedJobsSummary: (...args: unknown[]) => mockGetFailedJobsSummary(...args),
  getFailedJobsTrends: (...args: unknown[]) => mockGetFailedJobsTrends(...args),
}));

import FailedJobsDashboard from "@/pages/system/FailedJobsDashboard";

describe("FailedJobsDashboard", () => {
  beforeEach(() => {
    mockGetFailedJobsSummary.mockResolvedValue({
      failedJobs: 3,
      criticalFailures: 1,
      repeatFailures: 2,
      oldestFailureMinutes: 45,
      healthStatus: "warning",
      healthScore: 72,
    });
    mockListFailedJobs.mockResolvedValue({
      data: [
        {
          id: 1,
          uuid: "uuid-1",
          connection: "database",
          queue: "payments-recovery",
          jobClass: "RecoverStalePaymentsJob",
          module: "payments",
          jobSeverity: "critical",
          exceptionPreview: "Connection timeout",
          failedAt: "2026-06-10T10:00:00.000Z",
          ageMinutes: 45,
          outletId: 1,
        },
      ],
      meta: { currentPage: 1, lastPage: 1, perPage: 50, total: 1 },
      grouped: {
        byModule: [{ module: "payments", count: 1, criticalCount: 1 }],
        byQueue: [{ queue: "payments-recovery", count: 1 }],
      },
    });
    mockGetFailedJobsTrends.mockResolvedValue([
      {
        snapshotDate: "2026-06-09",
        totalFailures: 2,
        criticalFailures: 1,
        resolvedFailures: 0,
        healthStatus: "warning",
      },
    ]);
  });

  it("renders summary metrics and failed job rows", async () => {
    render(
      <MemoryRouter>
        <FailedJobsDashboard />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Failed Jobs")).toBeTruthy();
    });

    expect(screen.getByText("RecoverStalePaymentsJob")).toBeTruthy();
    expect(screen.getByText("Connection timeout")).toBeTruthy();
    expect(screen.getAllByText("payments").length).toBeGreaterThan(0);
    expect(screen.getByText("45m")).toBeTruthy();
    expect(screen.getByText("2026-06-09")).toBeTruthy();
  });
});
