// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, beforeEach, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { ALL_PERMISSIONS, testNavConfig } from "./AppSidebar.testUtils";
import { AppSidebar } from "@/components/AppSidebar";
import { ensureEnglishLocale } from "@/test/i18nTestSetup";

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => false,
  useIsSidebarDrawer: () => false,
}));

describe("AppSidebar submenu navigation", () => {
  beforeEach(async () => {
    await ensureEnglishLocale();
    testNavConfig.permissions = [...ALL_PERMISSIONS];
    testNavConfig.pinSet = true;
    Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: 1280 });
  });

  it("renders HR payroll groups with children", () => {
    render(
      <MemoryRouter>
        <AppSidebar />
      </MemoryRouter>,
    );
    expect(screen.getByText("Payroll")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Preparation" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Posting" })).toBeTruthy();
  });

  it("links payroll posting to /hr/payroll/posting", () => {
    render(
      <MemoryRouter>
        <AppSidebar />
      </MemoryRouter>,
    );
    const preparationLink = screen.getByRole("link", { name: "Preparation" }).closest("a");
    expect(preparationLink?.getAttribute("href")).toBe("/hr/payroll/preparation");
    const postingLink = Array.from(document.querySelectorAll("a")).find(
      (a) => a.getAttribute("href") === "/hr/payroll/posting",
    );
    expect(postingLink).toBeTruthy();
  });

  it("renders Purchases children with correct tab ids", () => {
    render(
      <MemoryRouter>
        <AppSidebar />
      </MemoryRouter>,
    );
    expect(screen.getByText("Purchases")).toBeTruthy();
    const prLink = screen.getByText("Purchase Requests").closest("a");
    expect(prLink?.getAttribute("href")).toBe("/purchases?tab=pr");
  });

  it("renders Reports children including system routes", () => {
    render(
      <MemoryRouter>
        <AppSidebar />
      </MemoryRouter>,
    );
    expect(screen.getByText("Reports")).toBeTruthy();
    expect(screen.getByText("System Health").closest("a")?.getAttribute("href")).toBe("/system/health");
    expect(screen.getByText("Reports Hub").closest("a")?.getAttribute("href")).toBe("/reports");
  });

  it("renders grouped Reservations and Loyalty parents", () => {
    render(
      <MemoryRouter>
        <AppSidebar />
      </MemoryRouter>,
    );
    expect(screen.getAllByText("Reservations").length).toBeGreaterThan(0);
    expect(screen.getByText("Reservation List").closest("a")?.getAttribute("href")).toBe("/reservations");
    expect(screen.getByText("Reservation Monitor").closest("a")?.getAttribute("href")).toBe(
      "/reservations/operations",
    );
    expect(screen.getByText("Loyalty & Rewards")).toBeTruthy();
    expect(screen.getByText("Gift Cards").closest("a")?.getAttribute("href")).toBe("/gift-cards");
  });

  it("renders HR payroll section labels for grouped submenu", () => {
    render(
      <MemoryRouter>
        <AppSidebar />
      </MemoryRouter>,
    );
    expect(screen.getByText("Setup")).toBeTruthy();
    expect(screen.getByText("Operations")).toBeTruthy();
    expect(screen.getByText("Period close")).toBeTruthy();
  });

  it("renders overview and sales sections", () => {
    render(
      <MemoryRouter>
        <AppSidebar />
      </MemoryRouter>,
    );
    expect(screen.getByText("Dashboard")).toBeTruthy();
    expect(screen.getByText("Sales & Cashier")).toBeTruthy();
    expect(screen.getByText("POS Cashier")).toBeTruthy();
  });

  it("keeps Logout and Lock in footer", () => {
    render(
      <MemoryRouter>
        <AppSidebar />
      </MemoryRouter>,
    );
    expect(screen.getByText("Logout")).toBeTruthy();
    expect(screen.getByText("Lock")).toBeTruthy();
  });
});
