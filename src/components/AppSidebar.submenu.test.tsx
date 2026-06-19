// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { ALL_PERMISSIONS, testNavConfig } from "./AppSidebar.testUtils";
import { AppSidebar } from "@/components/AppSidebar";

describe("AppSidebar submenu navigation", () => {
  beforeEach(() => {
    testNavConfig.permissions = [...ALL_PERMISSIONS];
    testNavConfig.pinSet = true;
  });

  it("renders Payroll parent with children", () => {
    render(
      <MemoryRouter>
        <AppSidebar />
      </MemoryRouter>,
    );
    expect(screen.getByText("Payroll")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Overview" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Preparation" })).toBeTruthy();
  });

  it("links Payroll Posting to /payroll?tab=posting", () => {
    render(
      <MemoryRouter>
        <AppSidebar />
      </MemoryRouter>,
    );
    const link = screen.getByRole("link", { name: "Overview" }).closest("a");
    expect(link?.getAttribute("href")).toBe("/payroll?tab=payroll");
    const postingLink = Array.from(document.querySelectorAll("a")).find(
      (a) => a.getAttribute("href") === "/payroll?tab=posting",
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

  it("renders payroll section labels for grouped submenu", () => {
    render(
      <MemoryRouter>
        <AppSidebar />
      </MemoryRouter>,
    );
    expect(screen.getByText("Setup")).toBeTruthy();
    expect(screen.getByText("Processing")).toBeTruthy();
    expect(screen.getByText("Close")).toBeTruthy();
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
