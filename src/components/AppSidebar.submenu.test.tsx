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
    expect(screen.getByText("Overview")).toBeTruthy();
    expect(screen.getByText("Preparation")).toBeTruthy();
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

  it("keeps top-level Operations items", () => {
    render(
      <MemoryRouter>
        <AppSidebar />
      </MemoryRouter>,
    );
    expect(screen.getByText("Dashboard")).toBeTruthy();
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
