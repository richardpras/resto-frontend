import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

function readPageSource(fileName: string): string {
  return readFileSync(path.resolve(__dirname, fileName), "utf-8");
}

describe("Recovery page store boundary regression", () => {
  const strictStorePages = [
    "PaymentStatus.tsx",
    "QROrder.tsx",
    "QROrdersList.tsx",
    "Kitchen.tsx",
  ];

  for (const pageFile of strictStorePages) {
    it(`${pageFile} avoids direct api-integration imports`, () => {
      const source = readPageSource(pageFile);
      expect(source).not.toMatch(/import\s+(?!type\b)[^;]*from\s+["'][^"']*api-integration[^"']*["']/s);
    });
  }

  it("PaymentStatus relies on payment store orchestration", () => {
    const source = readPageSource("PaymentStatus.tsx");
    expect(source).toMatch(/usePaymentStore\(\(s\)\s*=>\s*s\.pollTransactionStatus\)/);
    expect(source).toMatch(/usePaymentStore\(\(s\)\s*=>\s*s\.stopPolling\)/);
    expect(source).toMatch(/usePaymentStore\(\(s\)\s*=>\s*s\.retryPayment\)/);
  });

  it("QROrdersList relies on qrOrderStore orchestration", () => {
    const source = readPageSource("QROrdersList.tsx");
    expect(source).toMatch(/useQrOrderStore\(\(s\)\s*=>\s*s\.startPolling\)/);
    expect(source).toMatch(/useQrOrderStore\(\(s\)\s*=>\s*s\.stopPolling\)/);
    expect(source).toMatch(/useQrOrderStore\(\(s\)\s*=>\s*s\.confirmRequest\)/);
    expect(source).toMatch(/useQrOrderStore\(\(s\)\s*=>\s*s\.rejectRequest\)/);
  });
});
