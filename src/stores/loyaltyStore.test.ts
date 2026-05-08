import { beforeEach, describe, expect, it, vi } from "vitest";

const mockListLoyaltyTiers = vi.fn();
const mockListPointsLedger = vi.fn();
const mockListLoyaltyRedemptions = vi.fn();
const mockRedeemLoyaltyPoints = vi.fn();

vi.mock("@/lib/api-integration/crmEndpoints", () => ({
  listLoyaltyTiers: (...args: unknown[]) => mockListLoyaltyTiers(...args),
  listPointsLedger: (...args: unknown[]) => mockListPointsLedger(...args),
  listLoyaltyRedemptions: (...args: unknown[]) => mockListLoyaltyRedemptions(...args),
  redeemLoyaltyPoints: (...args: unknown[]) => mockRedeemLoyaltyPoints(...args),
}));

import { useLoyaltyStore } from "./loyaltyStore";

describe("loyaltyStore offline queue orchestration", () => {
  beforeEach(() => {
    mockListLoyaltyTiers.mockReset();
    mockListPointsLedger.mockReset();
    mockListLoyaltyRedemptions.mockReset();
    mockRedeemLoyaltyPoints.mockReset();
    useLoyaltyStore.getState().reset();
  });

  it("replays queued redemption and dedupes by fingerprint", async () => {
    mockListLoyaltyTiers.mockResolvedValue([{ id: "t1", code: "SILVER", name: "Silver", min_points: 100 }]);
    mockListPointsLedger.mockResolvedValue({
      rows: [{ id: "pl-1", customer_id: "c-1", outlet_id: 7, delta_points: 120, reason: "purchase" }],
      meta: { current_page: 1, per_page: 20, total: 1, last_page: 1 },
    });
    mockListLoyaltyRedemptions.mockResolvedValue({
      rows: [],
      meta: { current_page: 1, per_page: 20, total: 0, last_page: 1 },
    });
    mockRedeemLoyaltyPoints.mockResolvedValue({
      id: "rd-1",
      customer_id: "c-1",
      outlet_id: 7,
      points_used: 40,
      amount_value: 4000,
      replay_fingerprint: "fp-1",
      status: "applied",
    });

    await useLoyaltyStore.getState().refreshForOutlet(7);
    await useLoyaltyStore.getState().enqueueRedemption({
      customerId: "c-1",
      pointsUsed: 40,
      amountValue: 4000,
      replayFingerprint: "fp-1",
    });
    await useLoyaltyStore.getState().enqueueRedemption({
      customerId: "c-1",
      pointsUsed: 40,
      amountValue: 4000,
      replayFingerprint: "fp-1",
    });

    const state = useLoyaltyStore.getState();
    expect(state.redemptionQueue).toHaveLength(0);
    expect(state.redemptions[0]?.id).toBe("rd-1");
    expect(mockRedeemLoyaltyPoints).toHaveBeenCalledTimes(2);
  });

  it("marks queue item failed and restores optimistic points on error", async () => {
    mockListLoyaltyTiers.mockResolvedValue([]);
    mockListPointsLedger.mockResolvedValue({
      rows: [{ id: "pl-1", customer_id: "c-2", outlet_id: 7, delta_points: 90, reason: "purchase" }],
      meta: { current_page: 1, per_page: 20, total: 1, last_page: 1 },
    });
    mockListLoyaltyRedemptions.mockResolvedValue({
      rows: [],
      meta: { current_page: 1, per_page: 20, total: 0, last_page: 1 },
    });
    mockRedeemLoyaltyPoints.mockRejectedValue(new Error("network down"));

    await useLoyaltyStore.getState().refreshForOutlet(7);
    await useLoyaltyStore.getState().enqueueRedemption({
      customerId: "c-2",
      pointsUsed: 30,
      amountValue: 3000,
      replayFingerprint: "fp-fail",
    });

    const state = useLoyaltyStore.getState();
    expect(state.redemptionQueue).toHaveLength(1);
    expect(state.redemptionQueue[0].status).toBe("failed");
    expect(state.pointsBalanceByCustomer["c-2"]).toBe(90);
  });
});
