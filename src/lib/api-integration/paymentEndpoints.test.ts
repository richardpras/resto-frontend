import { afterEach, describe, expect, it, vi } from "vitest";
import { API_BASE_URL } from "./client";
import {
  createPaymentTransaction,
  getPaymentTransaction,
  postPaymentWebhook,
  reconcilePaymentTransaction,
} from "./paymentEndpoints";

describe("payment endpoints", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("creates payment transactions through finalized endpoint and preserves hosted fields", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        message: "Created",
        data: {
          id: "tx-10",
          orderId: "order-1",
          outletId: 3,
          method: "qris",
          amount: 125000,
          status: "pending",
          checkoutUrl: "https://checkout.example/tx-10",
          qrString: "000201010212",
          deeplinkUrl: "gojek://pay/tx-10",
          expiresAt: "2026-05-07T10:30:00.000Z",
          providerMetadataSnapshot: { provider: "xendit" },
        },
        meta: { requestId: "req-1" },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await createPaymentTransaction({
      orderId: "order-1",
      outletId: 3,
      method: "qris",
      amount: 125000,
      provider: "xendit",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      `${API_BASE_URL}/payment-transactions`,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          orderId: "order-1",
          outletId: 3,
          method: "qris",
          amount: 125000,
          provider: "xendit",
        }),
      }),
    );
    expect(result.checkoutUrl).toBe("https://checkout.example/tx-10");
    expect(result.qrString).toBe("000201010212");
    expect(result.deeplinkUrl).toBe("gojek://pay/tx-10");
    expect(result.providerMetadataSnapshot).toEqual({ provider: "xendit" });
  });

  it("reads, reconciles, and posts webhooks through finalized endpoints", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        message: "OK",
        data: { id: "tx-10", method: "qris", amount: 125000, status: "paid" },
        meta: {},
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await getPaymentTransaction("tx-10");
    await reconcilePaymentTransaction("tx-10");
    await postPaymentWebhook("xendit", { id: "evt-1" });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      `${API_BASE_URL}/payment-transactions/tx-10`,
      expect.objectContaining({ headers: expect.any(Object) }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      `${API_BASE_URL}/payment-transactions/reconcile`,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ transactionId: "tx-10" }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      `${API_BASE_URL}/payment-webhooks/xendit`,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ id: "evt-1" }),
      }),
    );
  });
});
