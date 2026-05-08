import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

describe("POS production flow guards", () => {
  const posSource = readFileSync(path.resolve(__dirname, "POS.tsx"), "utf-8");

  it("resets outlet-scoped UI state when outlet context changes", () => {
    expect(posSource).toMatch(/didOutletSwitch/);
    expect(posSource).toMatch(/resetCart\(\)/);
    expect(posSource).toMatch(/setShowPayment\(false\)/);
    expect(posSource).toMatch(/setShowSplit\(false\)/);
    expect(posSource).toMatch(/setPendingGatewayPayments\(\[\]\)/);
  });

  it("cleans payment polling state on page unmount", () => {
    expect(posSource).toMatch(/return\s*\(\)\s*=>\s*\{\s*paymentResetAsync\(\)/s);
  });
});
