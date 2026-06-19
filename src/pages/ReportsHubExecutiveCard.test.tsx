// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import ReportsHub, { HUB_CARD_DEFS } from "@/pages/ReportsHub";
import type { AuthUser } from "@/stores/authStore";

function makeUser(permissions: string[]): AuthUser {
  return {
    id: "1",
    name: "Owner",
    email: "owner@test.local",
    role: "Owner",
    outletIds: [1],
    pinSet: false,
    permissions,
  };
}

vi.mock("@/stores/authStore", () => ({
  PERMISSIONS: {
    ACCOUNTING: "accounting.manage",
    REPORTS: "reports.view",
    PURCHASE: "purchase.manage",
    MEMBERS: "members.manage",
    POS: "pos.use",
    SETTINGS: "settings.manage",
  },
  useAuthStore: vi.fn(),
}));

vi.mock("@/components/payments/PaymentHealthHubSummary", () => ({
  PaymentHealthHubSummary: () => null,
}));

import { useAuthStore } from "@/stores/authStore";

describe("ReportsHub executive dashboard card", () => {
  it("includes owner control tower card definition", () => {
    const card = HUB_CARD_DEFS.find((c) => c.id === "executive-dashboard");
    expect(card).toBeTruthy();
    expect(card?.to).toBe("/executive-dashboard");
  });

  it("renders link when user has reports.view", () => {
    const user = makeUser(["reports.view"]);
    vi.mocked(useAuthStore).mockImplementation((selector) =>
      selector({
        user,
        hasPermission: (perm: string) => user.permissions.includes(perm),
      } as ReturnType<typeof useAuthStore.getState>),
    );

    render(
      <MemoryRouter>
        <ReportsHub />
      </MemoryRouter>,
    );

    expect(screen.getByText("Owner Control Tower")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Owner Control Tower/i })).toBeTruthy();
  });
});
