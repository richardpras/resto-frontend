import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const customersPage = readFileSync(path.resolve(__dirname, "Customers.tsx"), "utf-8");
const customerProfilePage = readFileSync(path.resolve(__dirname, "CustomerProfile.tsx"), "utf-8");
const memberProfilePage = readFileSync(path.resolve(__dirname, "MemberProfilePage.tsx"), "utf-8");
const loyaltyDashboardPage = readFileSync(path.resolve(__dirname, "LoyaltyDashboard.tsx"), "utf-8");

describe("CRM pages boundary regression", () => {
  it("redirects legacy customer routes to members", () => {
    expect(customersPage).toMatch(/Navigate to="\/members"/);
    expect(customerProfilePage).toMatch(/CustomerLegacyRedirect/);
  });

  it("member profile page uses member store and CRM panels", () => {
    expect(memberProfilePage).toMatch(/useMemberStore/);
    expect(memberProfilePage).toMatch(/useLoyaltyStore/);
    expect(memberProfilePage).toMatch(/GiftCardStoreCreditPanel/);
    expect(memberProfilePage).not.toMatch(/@\/lib\/api-integration\/crmEndpoints/);
  });

  it("member profile page uses unified points balance", () => {
    expect(memberProfilePage).toMatch(/pointsBalance|currentPoints/);
    expect(memberProfilePage).not.toMatch(/Program points \(loyalty engine\)/);
  });

  it("loyalty dashboard still uses zustand stores only", () => {
    expect(loyaltyDashboardPage).toMatch(/useLoyaltyStore/);
    expect(loyaltyDashboardPage).toMatch(/useCrmDashboardStore/);
    expect(loyaltyDashboardPage).not.toMatch(/@\/lib\/api-integration\/crmEndpoints/);
  });
});
