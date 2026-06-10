import { describe, expect, it } from "vitest";
import { PERMISSIONS, type AuthUser } from "@/stores/authStore";
import { canViewFinancialStatements } from "@/domain/permissionGates";

function userWith(...permissions: string[]): AuthUser {
  return {
    id: "1",
    name: "Test User",
    email: "test@example.com",
    role: "Manager",
    outletIds: [1],
    pinSet: false,
    permissions,
  };
}

describe("canViewFinancialStatements", () => {
  it("returns false for accounting.manage only", () => {
    expect(canViewFinancialStatements(userWith(PERMISSIONS.ACCOUNTING))).toBe(false);
  });

  it("returns false for reports.view only", () => {
    expect(canViewFinancialStatements(userWith(PERMISSIONS.REPORTS))).toBe(false);
  });

  it("returns true when user has accounting.manage and reports.view", () => {
    expect(
      canViewFinancialStatements(userWith(PERMISSIONS.ACCOUNTING, PERMISSIONS.REPORTS)),
    ).toBe(true);
  });

  it("returns false for null user", () => {
    expect(canViewFinancialStatements(null)).toBe(false);
  });
});
