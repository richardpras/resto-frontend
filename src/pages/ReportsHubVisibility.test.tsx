// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import ReportsHub, { HUB_CARD_DEFS } from "@/pages/ReportsHub";
import { expandPermissionCodes, type AuthUser } from "@/stores/authStore";

function makeUser(permissionCodes: string[]): AuthUser {
  return {
    id: "1",
    name: "Test User",
    email: "test@example.com",
    role: "Owner",
    outletIds: [1],
    pinSet: false,
    permissionCodes: [...permissionCodes],
    permissions: expandPermissionCodes(permissionCodes),
  };
}

vi.mock("@/stores/authStore", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/stores/authStore")>();
  return {
    ...actual,
    useAuthStore: vi.fn(),
  };
});

import { useAuthStore } from "@/stores/authStore";

function renderHub(permissions: string[]) {
  const user = makeUser(permissions);
  vi.mocked(useAuthStore).mockImplementation((selector) =>
    selector({
      user,
      hasPermission: (perm: string) => permissions.includes(perm),
    } as ReturnType<typeof useAuthStore.getState>),
  );

  return render(
    <MemoryRouter>
      <ReportsHub />
    </MemoryRouter>,
  );
}

describe("ReportsHub visibility", () => {
  it("shows Financial Statements card enabled when user has both financial permissions", () => {
    renderHub(["reports.view", "accounting.manage"]);

    expect(screen.getByText("Financial Statements")).toBeTruthy();
    expect(screen.queryByText("Additional permission required")).toBeNull();
    expect(screen.getByRole("link", { name: /Financial Statements/i })).toBeTruthy();
  });

  it("shows Financial Statements card disabled when user has only reports.view", () => {
    renderHub(["reports.view"]);

    expect(screen.getByText("Financial Statements")).toBeTruthy();
    expect(screen.getByText("Additional permission required")).toBeTruthy();
    expect(screen.queryByRole("link", { name: /Financial Statements/i })).toBeNull();
  });

  it("hides Accounting Reconciliation without accounting.manage", () => {
    renderHub(["reports.view"]);

    expect(screen.queryByText("Accounting Reconciliation")).toBeNull();
    expect(screen.queryByText("Gift Card Liability")).toBeNull();
  });

  it("shows Accounting Reconciliation with accounting.manage", () => {
    renderHub(["accounting.manage"]);

    expect(screen.getByText("Accounting Reconciliation")).toBeTruthy();
    expect(screen.getByText("Gift Card Liability")).toBeTruthy();
  });

  it("hides Payment Health without settings.manage", () => {
    renderHub(["reports.view", "pos.use", "settings.view", "settings.update"]);

    expect(screen.queryByText("Payment Health")).toBeNull();
  });

  it("shows Payment Health with settings.manage", () => {
    renderHub(["settings.manage"]);

    expect(screen.getByText("Payment Health")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Payment Health/i })).toBeTruthy();
  });

  it("hides Loyalty Analytics without members.manage", () => {
    renderHub(["reports.view", "purchase.manage"]);

    expect(screen.queryByText("Loyalty Analytics")).toBeNull();
  });

  it("shows Loyalty Analytics with members.manage", () => {
    renderHub(["members.manage"]);

    expect(screen.getByText("Loyalty Analytics")).toBeTruthy();
  });

  it("defines hub cards for all required report destinations", () => {
    const ids = HUB_CARD_DEFS.map((c) => c.id);
    expect(ids).toContain("executive-sales-report");
    expect(ids).toContain("financial-statements");
    expect(ids).toContain("accounting-reconciliation");
    expect(ids).toContain("gift-card-liability");
    expect(ids).toContain("procurement-analytics");
    expect(ids).toContain("loyalty-analytics");
    expect(ids).toContain("inventory-analytics");
    expect(ids).toContain("operations-monitoring");
    expect(ids).toContain("payment-health");
    expect(ids).toContain("reservation-analytics");
  });
});
