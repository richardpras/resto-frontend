import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const source = readFileSync(path.resolve(__dirname, "AccountingReconciliation.tsx"), "utf-8");
const endpoints = readFileSync(
  path.resolve(__dirname, "../../lib/api-integration/accountingEndpoints.ts"),
  "utf-8",
);

describe("Accounting gift card reconciliation UI", () => {
  it("loads gift card reconciliation from API client", () => {
    expect(source).toMatch(/getGiftCardReconciliation/);
    expect(endpoints).toMatch(/accounting\/reconciliation\/gift-cards/);
  });

  it("renders gift card reconciliation card with variance status", () => {
    expect(source).toMatch(/GiftCardCard/);
    expect(source).toMatch(/accounting\.recon\.outstanding/);
    expect(source).toMatch(/accounting\.recon\.glBalance/);
    expect(source).toMatch(/accounting\.recon\.variance/);
    expect(source).toMatch(/StatusBadge/);
  });
});
