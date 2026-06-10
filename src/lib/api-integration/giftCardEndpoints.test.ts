import { afterEach, describe, expect, it, vi } from "vitest";
import { API_BASE_URL } from "./client";
import { redeemGiftCard } from "./giftCardEndpoints";

describe("gift card endpoints", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("redeems gift cards through finalized endpoint with full contract fields", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({
        success: true,
        message: "Gift card/store credit redeemed successfully.",
        data: {
          idempotent: false,
          issuance: {
            id: 12,
            code: "GC-TEST-001",
            balanceAmount: 39000,
            status: "active",
          },
          settlement: {
            id: 88,
            status: "pending",
            redeemedAmount: 11000,
          },
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await redeemGiftCard({
      outletId: 3,
      code: "GC-TEST-001",
      amount: 11000,
      idempotencyKey: "redeem-pos-order-9-GC-TEST-001",
      referenceType: "order",
      referenceId: "9",
      meta: { source: "pos" },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      `${API_BASE_URL}/gift-cards/redeem`,
      expect.objectContaining({ method: "POST" }),
    );
    const [, init] = fetchMock.mock.calls[0] as [string, { body: string }];
    const body = JSON.parse(init.body);
    expect(body).toEqual({
      outletId: 3,
      code: "GC-TEST-001",
      amount: 11000,
      idempotencyKey: "redeem-pos-order-9-GC-TEST-001",
      referenceType: "order",
      referenceId: "9",
      meta: { source: "pos" },
    });
    expect(result.idempotent).toBe(false);
    expect(result.settlement.id).toBe(88);
    expect(result.issuance.balanceAmount).toBe(39000);
  });
});
