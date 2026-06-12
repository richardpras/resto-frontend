// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { openQrOrderInPos } from "@/lib/api-integration/qrOrderReviewEndpoints";
import { useQrOrderPosBridgeStore } from "@/stores/qrOrderPosBridgeStore";

vi.mock("@/lib/api-integration/client", () => ({
  apiRequest: vi.fn().mockResolvedValue({
    data: {
      posSession: { sessionType: "qr_order", sourceOrderCode: "QRO-TEST01" },
      loadPayload: {
        requestId: "5",
        requestCode: "QRO-TEST01",
        outletId: 1,
        tableId: 3,
        items: [],
        subtotal: 0,
        tax: 0,
        total: 0,
      },
    },
  }),
  ApiHttpError: class ApiHttpError extends Error {},
  getApiAccessToken: () => "token",
  createObservabilityHeaders: () => ({}),
}));

describe("QrOrderOpenInPos bridge", () => {
  beforeEach(() => {
    useQrOrderPosBridgeStore.getState().clear();
  });

  it("stores draft session from open-in-pos response", async () => {
    const result = await openQrOrderInPos(5);
    useQrOrderPosBridgeStore.getState().setFromOpenInPos(result.posSession, result.loadPayload);

    const state = useQrOrderPosBridgeStore.getState();
    expect(state.draftSession?.sessionType).toBe("qr_order");
    expect(state.draftSession?.sourceOrderCode).toBe("QRO-TEST01");
    expect(state.loadPayload?.requestCode).toBe("QRO-TEST01");
  });
});
