import { describe, expect, it } from "vitest";
import {
  buildLegacyDraftLine,
  isMultiPaymentDraftReady,
} from "./OrderMultiPaymentPanel";
import type { PaymentDraftLine } from "./multiPaymentTypes";

describe("multi payment draft readiness", () => {
  it("allows legacy single-method mode without draft lines", () => {
    expect(isMultiPaymentDraftReady(false, [], 100000)).toBe(true);
  });

  it("requires draft total to match balance when multi payment is enabled", () => {
    const lines: PaymentDraftLine[] = [
      buildLegacyDraftLine("cash", "Cash", 30000),
      { id: "2", method: "qris", methodLabel: "QRIS Online", amount: 70000 },
    ];
    expect(isMultiPaymentDraftReady(true, lines, 100000)).toBe(true);
    expect(isMultiPaymentDraftReady(true, [lines[0]], 100000)).toBe(false);
  });
});
