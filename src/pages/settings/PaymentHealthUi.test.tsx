// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/stores/outletStore", () => ({
  useOutletStore: vi.fn((selector) => selector({ activeOutletId: 1 })),
}));

const mockGetPaymentHealth = vi.fn();
const mockGetPaymentHealthTrends = vi.fn();
const mockGetPaymentReliabilityReport = vi.fn();
const mockListPaymentIncidents = vi.fn();

vi.mock("@/lib/api-integration/paymentEndpoints", () => ({
  getPaymentHealth: (...args: unknown[]) => mockGetPaymentHealth(...args),
  getPaymentHealthTrends: (...args: unknown[]) => mockGetPaymentHealthTrends(...args),
  getPaymentReliabilityReport: (...args: unknown[]) => mockGetPaymentReliabilityReport(...args),
  listPaymentIncidents: (...args: unknown[]) => mockListPaymentIncidents(...args),
}));

import PaymentHealth from "@/pages/settings/PaymentHealth";

describe("PaymentHealth UI", () => {
  beforeEach(() => {
    mockGetPaymentHealth.mockResolvedValue({
      provider: "xendit",
      healthy: true,
      status: "healthy",
      mode: "development",
      stubAllowed: true,
      wouldUseStub: false,
      missing: [],
      warnings: [],
      healthSeverity: "warning",
      paymentSuccessRate: 98.5,
      webhookSuccessRate: 99.1,
      stalePayments: 2,
      failedWebhooks: 0,
      openIncidents: 1,
      reliabilityScore: 97.2,
      providerRanking: [{ provider: "xendit", healthSeverity: "warning", paymentSuccessRate: 98.5, webhookSuccessRate: 99.1, openIncidents: 1, reliabilityScore: 97.2 }],
    });
    mockGetPaymentHealthTrends.mockResolvedValue({
      providerTrend: [{ date: "2026-06-01", provider: "xendit", severity: "warning" }],
      paymentSuccessTrend: [{ date: "2026-06-01", rate: 98.5 }],
      webhookTrend: [{ date: "2026-06-01", rate: 99.1 }],
      incidentTrend: [{ date: "2026-06-01", count: 1 }],
    });
    mockGetPaymentReliabilityReport.mockResolvedValue([
      { provider: "xendit", uptimePercent: 99.7, incidents: 2, avgResolutionMinutes: 14, paymentSuccessRate: 99.3 },
    ]);
    mockListPaymentIncidents.mockResolvedValue([
      {
        id: 1,
        outletId: 1,
        provider: "xendit",
        incidentType: "webhook_failure_spike",
        severity: "high",
        title: "Webhook failure spike detected",
        description: "3 webhook failures",
        openedAt: "2026-06-10T08:00:00.000Z",
        resolvedAt: null,
        durationMinutes: null,
        status: "open",
      },
    ]);
  });

  it("renders severity badge and incident sections", async () => {
    render(
      <MemoryRouter>
        <PaymentHealth />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Payment Health")).toBeTruthy();
    });

    expect(screen.getAllByText("Warning").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Open Incidents").length).toBeGreaterThan(0);
    expect(screen.getByText("Provider Reliability")).toBeTruthy();
    expect(screen.getByText("Incident Timeline")).toBeTruthy();
  });
});
