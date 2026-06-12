// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { useAuthStore } from "@/stores/authStore";

vi.mock("@/stores/authStore", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/stores/authStore")>();
  return {
    ...actual,
    useAuthStore: vi.fn(),
  };
});

vi.mock("@/stores/outletStore", () => ({
  useOutletStore: vi.fn((selector) =>
    selector({
      activeOutletId: 1,
      hydrateFromApiOutlets: vi.fn(),
      setActiveOutletContext: vi.fn(),
    }),
  ),
}));

vi.mock("@/components/sound/SoundAlertsProvider", () => ({
  SoundAlertsProvider: () => null,
}));

vi.mock("@/components/sound/SoundAlertPrompt", () => ({
  SoundAlertPrompt: () => null,
}));

vi.mock("@/components/notifications/NotificationBell", () => ({
  NotificationBell: () => null,
}));

vi.mock("@/components/bug-report/BugReportButton", () => ({
  BugReportButton: () => null,
}));

vi.mock("@/components/auth/ProtectedRoute", () => ({
  IdleTracker: () => null,
}));

vi.mock("@/lib/api-integration/client", () => ({
  getApiAccessToken: () => "token",
}));

describe("AppLayout sidebar width", () => {
  it("reserves logo-only rail width when collapsed and full width when expanded", () => {
    vi.mocked(useAuthStore).mockImplementation((selector?: (state: unknown) => unknown) => {
      const state = {
        user: {
          id: "1",
          name: "Cashier",
          email: "cashier@test.local",
          role: "Cashier",
          outletIds: [1],
          assignedOutlets: [{ id: 1, name: "Main", code: "MAIN" }],
          pinSet: false,
          permissions: ["pos.use"],
        },
        locked: false,
        lock: vi.fn(),
        hasPermission: () => true,
      };
      return typeof selector === "function" ? selector(state) : state;
    });

    Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: 1280 });

    render(
      <MemoryRouter initialEntries={["/pos"]}>
        <Routes>
          <Route path="/*" element={<AppLayout><div>Content</div></AppLayout>} />
        </Routes>
      </MemoryRouter>,
    );

    const expandedSidebar = document.querySelector('[data-app-chrome][data-state="expanded"]');
    const expandedSpacer = expandedSidebar?.firstElementChild;
    expect(expandedSpacer?.className).toContain("w-[--sidebar-width]");

    fireEvent.click(screen.getByRole("button", { name: "Toggle sidebar" }));

    const collapsedSidebar = document.querySelector('[data-app-chrome][data-state="collapsed"]');
    expect(collapsedSidebar?.getAttribute("data-collapsible")).toBe("logo-only");
    const collapsedSpacer = collapsedSidebar?.firstElementChild;
    expect(collapsedSpacer?.className).toContain("w-[--sidebar-width-logo]");
  });
});
