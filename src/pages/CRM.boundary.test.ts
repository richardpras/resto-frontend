import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const customersPage = readFileSync(path.resolve(__dirname, "Customers.tsx"), "utf-8");
const customerProfilePage = readFileSync(path.resolve(__dirname, "CustomerProfile.tsx"), "utf-8");
const loyaltyDashboardPage = readFileSync(path.resolve(__dirname, "LoyaltyDashboard.tsx"), "utf-8");

describe("CRM pages boundary regression", () => {
  it("does not import crm endpoints directly from pages", () => {
    const sources = [customersPage, customerProfilePage, loyaltyDashboardPage];
    sources.forEach((source) => {
      expect(source).not.toMatch(/@\/lib\/api-integration\/crmEndpoints/);
    });
  });

  it("wires customer and loyalty data via zustand stores only", () => {
    expect(customersPage).toMatch(/useCustomerStore/);
    expect(customersPage).toMatch(/useLoyaltyStore/);
    expect(customerProfilePage).toMatch(/useCustomerStore/);
    expect(customerProfilePage).toMatch(/useLoyaltyStore/);
    expect(loyaltyDashboardPage).toMatch(/useLoyaltyStore/);
    expect(loyaltyDashboardPage).toMatch(/useCrmDashboardStore/);
  });
});
