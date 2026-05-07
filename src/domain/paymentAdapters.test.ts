import { describe, expect, it } from "vitest";
import {
  getPaymentTransactionIdFromSearchParams,
  mapPaymentTransactionApiToModel,
} from "./paymentAdapters";

describe("payment adapters", () => {
  it("maps provider-aware hosted checkout fields and legacy fallbacks", () => {
    const tx = mapPaymentTransactionApiToModel({
      id: "tx-20",
      orderId: "order-20",
      outletId: 4,
      method: "qris",
      amount: 85000,
      status: "pending",
      checkoutUrl: "https://checkout.example/tx-20",
      qrString: "000201010212",
      deeplinkUrl: "shopeepay://tx-20",
      expiresAt: "2026-05-07T12:00:00.000Z",
      providerMetadataSnapshot: { provider: "midtrans" },
      payloadSnapshot: { channel: "QRIS" },
    });

    expect(tx).toMatchObject({
      id: "tx-20",
      orderId: "order-20",
      outletId: 4,
      checkoutUrl: "https://checkout.example/tx-20",
      qrString: "000201010212",
      deeplinkUrl: "shopeepay://tx-20",
      providerMetadataSnapshot: { provider: "midtrans" },
      payloadSnapshot: { channel: "QRIS" },
    });
    expect(tx.expiresAt?.toISOString()).toBe("2026-05-07T12:00:00.000Z");
    expect(tx.expiryTime?.toISOString()).toBe("2026-05-07T12:00:00.000Z");
  });

  it("parses redirect and deeplink transaction identifiers", () => {
    expect(getPaymentTransactionIdFromSearchParams(new URLSearchParams("transaction=tx-1"))).toBe("tx-1");
    expect(getPaymentTransactionIdFromSearchParams(new URLSearchParams("transaction_id=tx-2"))).toBe("tx-2");
    expect(getPaymentTransactionIdFromSearchParams(new URLSearchParams("tx=tx-3"))).toBe("tx-3");
  });
});
