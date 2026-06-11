// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { testNavConfig } from "./AppSidebar.testUtils";
import { AppSidebar } from "@/components/AppSidebar";

describe("AppSidebar permission gates", () => {
  beforeEach(() => {
    testNavConfig.pinSet = true;
  });

  it("hides Accounting financial statement children without reports.view", () => {
    testNavConfig.permissions = ["accounting.manage", "purchase.manage", "payroll.manage"];

    render(
      <MemoryRouter>
        <AppSidebar />
      </MemoryRouter>,
    );

    expect(screen.getByText("Accounting")).toBeTruthy();
    expect(screen.getByText("Chart of Accounts")).toBeTruthy();
    expect(screen.queryByText("Profit & Loss")).toBeNull();
    expect(screen.queryByText("General Ledger")).toBeNull();
  });

  it("shows Accounting financial statement children with accounting.manage and reports.view", () => {
    testNavConfig.permissions = ["accounting.manage", "reports.view", "payroll.manage"];

    render(
      <MemoryRouter>
        <AppSidebar />
      </MemoryRouter>,
    );

    expect(screen.getByText("Profit & Loss")).toBeTruthy();
    expect(screen.getByText("General Ledger")).toBeTruthy();
  });

  it("hides system Reports children without settings.manage", () => {
    testNavConfig.permissions = ["reports.view", "payroll.manage"];

    render(
      <MemoryRouter>
        <AppSidebar />
      </MemoryRouter>,
    );

    expect(screen.getByText("Reports Hub")).toBeTruthy();
    expect(screen.queryByText("System Health")).toBeNull();
    expect(screen.queryByText("Audit Center")).toBeNull();
    expect(screen.queryByText("Failed Jobs")).toBeNull();
    expect(screen.queryByText("Bug Reports")).toBeNull();
  });

  it("shows system Reports children with settings.manage", () => {
    testNavConfig.permissions = ["reports.view", "settings.manage", "payroll.manage"];

    render(
      <MemoryRouter>
        <AppSidebar />
      </MemoryRouter>,
    );

    expect(screen.getByText("System Health")).toBeTruthy();
    expect(screen.getByText("Audit Center")).toBeTruthy();
    expect(screen.getByText("Failed Jobs")).toBeTruthy();
    expect(screen.getByText("Bug Reports")).toBeTruthy();
  });
});
