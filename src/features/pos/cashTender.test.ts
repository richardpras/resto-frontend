import { describe, expect, it } from "vitest";
import {
  cashSettlementFromDraft,
  cashTenderQuickAmounts,
  computeCashChange,
  formatCashTenderDisplay,
  isCashTenderSufficient,
  normalizeCashTenderedDigits,
  parseCashTenderedInput,
} from "./cashTender";

describe("cashTender", () => {
  it("parses digit-only tender input", () => {
    expect(parseCashTenderedInput("Rp 50.000")).toBe(50000);
    expect(parseCashTenderedInput("")).toBe(0);
    expect(normalizeCashTenderedDigits("Rp 100.000")).toBe("100000");
    expect(formatCashTenderDisplay("100000")).toBe("100.000");
  });

  it("computes change for over-tender (100k on 36k)", () => {
    expect(computeCashChange(100_000, 36_000)).toBe(64_000);
    expect(isCashTenderSufficient(100_000, 36_000)).toBe(true);
    expect(isCashTenderSufficient(35_999, 36_000)).toBe(false);
  });

  it("sums cash settlement lines only", () => {
    expect(
      cashSettlementFromDraft([
        { method: "cash", amount: 10000 },
        { method: "qris", amount: 5000 },
      ]),
    ).toBe(10000);
  });

  it("builds quick amounts at or above due", () => {
    expect(cashTenderQuickAmounts(36_000)).toEqual([36_000, 40_000, 50_000, 100_000, 200_000]);
    expect(cashTenderQuickAmounts(68_000)).toEqual([68_000, 70_000, 100_000, 200_000]);
    expect(cashTenderQuickAmounts(100_000)).toEqual([100_000, 200_000]);
  });
});
