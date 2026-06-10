// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GiftCardCard, StatusBadge } from "@/pages/accounting/AccountingReconciliation";
import type { GiftCardReconciliationReport } from "@/lib/api-integration/accountingEndpoints";

function makeGiftCardReport(overrides: Partial<GiftCardReconciliationReport> = {}): GiftCardReconciliationReport {
  return {
    subledgerOutstanding: 90000,
    glLiabilityBalance: 90000,
    giftCardLiabilityOutstanding: 60000,
    giftCardLiabilityGLBalance: 60000,
    giftCardLiabilityVariance: 0,
    storeCreditLiabilityOutstanding: 30000,
    storeCreditLiabilityGLBalance: 30000,
    storeCreditLiabilityVariance: 0,
    difference: 0,
    status: "balanced",
    issuedAmount: 120000,
    redeemedAmount: 30000,
    expiredAmount: 0,
    pendingSettlements: 0,
    settledSettlements: 2,
    pendingGlIssuances: 0,
    ...overrides,
  };
}

describe("GiftCard reconciliation UI", () => {
  it("renders Gift Card Liability (2130) section", () => {
    render(<GiftCardCard data={makeGiftCardReport()} />);

    expect(screen.getByText("Gift Card Liability (2130)")).toBeTruthy();
    expect(screen.getAllByText("Outstanding").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("GL Balance").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Variance").length).toBeGreaterThanOrEqual(1);
  });

  it("renders Store Credit Liability (2135) section", () => {
    render(<GiftCardCard data={makeGiftCardReport()} />);

    expect(screen.getByText("Store Credit Liability (2135)")).toBeTruthy();
  });

  it("renders Aggregate section with subledger and GL totals", () => {
    render(<GiftCardCard data={makeGiftCardReport()} />);

    expect(screen.getByText("Aggregate")).toBeTruthy();
    expect(screen.getByText("Gift Cards")).toBeTruthy();
  });

  it("shows balanced status badge from API", () => {
    render(<GiftCardCard data={makeGiftCardReport({ status: "balanced" })} />);
    expect(screen.getByText("balanced")).toBeTruthy();
  });

  it("shows review status badge from API", () => {
    render(<GiftCardCard data={makeGiftCardReport({ status: "review", pendingGlIssuances: 2 })} />);
    expect(screen.getByText("review")).toBeTruthy();
    expect(screen.getByText("Pending GL issuances")).toBeTruthy();
  });

  it("shows variance status badge from API", () => {
    render(
      <GiftCardCard
        data={makeGiftCardReport({
          status: "variance",
          giftCardLiabilityVariance: 15000,
          difference: 15000,
          giftCardLiabilityGLBalance: 45000,
          giftCardLiabilityOutstanding: 60000,
        })}
      />,
    );
    expect(screen.getByText("variance")).toBeTruthy();
  });

  it("StatusBadge applies distinct tone for variance", () => {
    const { container } = render(<StatusBadge status="variance" />);
    expect(container.textContent).toContain("variance");
    expect(container.querySelector(".text-destructive")).toBeTruthy();
  });
});
