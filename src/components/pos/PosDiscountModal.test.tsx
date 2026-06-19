import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { PosDiscountModal } from "./PosDiscountModal";

vi.mock("@/i18n/useOpsTranslation", () => ({
  useOpsTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("@/lib/api-integration/promotionEndpoints", () => ({
  applyOrderPromotion: vi.fn(),
  applyOrderPromotionByCode: vi.fn().mockResolvedValue({ preview: { discount: 25000 } }),
  removeOrderPromotion: vi.fn(),
}));

describe("PosDiscountModal", () => {
  it("renders tabs and promo code input", () => {
    render(
      <PosDiscountModal
        open
        onOpenChange={vi.fn()}
        outletId={1}
        cartLength={2}
        baseTotal={275000}
        currentOrder={null}
        promotionCandidates={[]}
        appliedGiftCard={null}
        paymentLocked={false}
        onEnsureDraftOrder={vi.fn().mockResolvedValue("99")}
        onOrderUpdated={vi.fn().mockResolvedValue(undefined)}
        onGiftCardApplied={vi.fn()}
        onGiftCardCleared={vi.fn()}
      />,
    );

    expect(screen.getByTestId("pos-discount-modal")).toBeInTheDocument();
    expect(screen.getByText("pos.discountModal.tabPromo")).toBeInTheDocument();
    expect(screen.getByText("pos.discountModal.tabVoucher")).toBeInTheDocument();
    expect(screen.getByText("pos.discountModal.tabGiftCard")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("pos.discountModal.promoCodePlaceholder")).toBeInTheDocument();
  });

  it("submits promo code via apply by code API", async () => {
    const onEnsureDraftOrder = vi.fn().mockResolvedValue("42");
    const onOrderUpdated = vi.fn().mockResolvedValue(undefined);
    const { applyOrderPromotionByCode } = await import("@/lib/api-integration/promotionEndpoints");

    render(
      <PosDiscountModal
        open
        onOpenChange={vi.fn()}
        outletId={1}
        cartLength={2}
        baseTotal={275000}
        currentOrder={null}
        promotionCandidates={[]}
        appliedGiftCard={null}
        paymentLocked={false}
        onEnsureDraftOrder={onEnsureDraftOrder}
        onOrderUpdated={onOrderUpdated}
        onGiftCardApplied={vi.fn()}
        onGiftCardCleared={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText("pos.discountModal.promoCodePlaceholder"), {
      target: { value: "SUMMER10" },
    });
    fireEvent.click(screen.getByRole("button", { name: "pos.discountModal.apply" }));

    await waitFor(() => {
      expect(onEnsureDraftOrder).toHaveBeenCalled();
      expect(applyOrderPromotionByCode).toHaveBeenCalledWith("42", "SUMMER10");
      expect(onOrderUpdated).toHaveBeenCalledWith("42");
    });
  });
});
