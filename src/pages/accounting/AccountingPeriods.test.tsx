import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const pageSource = readFileSync(path.resolve(__dirname, "AccountingPeriods.tsx"), "utf-8");

describe("AccountingPeriods page integration boundary", () => {
  it("uses accounting store actions only and avoids direct API orchestration", () => {
    expect(pageSource).toMatch(/useAccountingStore\(\(s\)\s*=>\s*s\.fetchAccountingPeriods\)/);
    expect(pageSource).toMatch(/useAccountingStore\(\(s\)\s*=>\s*s\.createAccountingPeriod\)/);
    expect(pageSource).toMatch(/useAccountingStore\(\(s\)\s*=>\s*s\.closeAccountingPeriod\)/);
    expect(pageSource).toMatch(/useAccountingStore\(\(s\)\s*=>\s*s\.openAccountingPeriod\)/);
    expect(pageSource).not.toMatch(/from\s+["']@\/lib\/api["']/);
    expect(pageSource).not.toMatch(/from\s+["']@\/lib\/api-integration\/accountingEndpoints["']/);
  });

  it("renders locked and open status labels", () => {
    expect(pageSource).toMatch(/Locked/);
    expect(pageSource).toMatch(/Open/);
  });
});
