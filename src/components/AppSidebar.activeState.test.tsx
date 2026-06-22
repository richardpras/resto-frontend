// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { ALL_PERMISSIONS, testNavConfig } from "./AppSidebar.testUtils";
import { AppSidebar } from "@/components/AppSidebar";

describe("AppSidebar active state", () => {
  beforeEach(() => {
    testNavConfig.permissions = [...ALL_PERMISSIONS];
    testNavConfig.pinSet = true;
  });

  it("highlights active payroll child from /hr route", () => {
    render(
      <MemoryRouter initialEntries={["/hr/payroll/posting"]}>
        <AppSidebar />
      </MemoryRouter>,
    );

    const postingLink = Array.from(document.querySelectorAll("a")).find(
      (a) => a.getAttribute("href") === "/hr/payroll/posting",
    );
    expect(postingLink?.parentElement?.getAttribute("data-active")).toBe("true");
  });

  it("highlights active accounting child from ?tab= query", () => {
    render(
      <MemoryRouter initialEntries={["/accounting?tab=pl"]}>
        <AppSidebar />
      </MemoryRouter>,
    );

    const plWrapper = screen.getByText("Profit & Loss").parentElement;
    expect(plWrapper?.getAttribute("data-active")).toBe("true");
  });

  it("auto-expands parent when child route is active", () => {
    render(
      <MemoryRouter initialEntries={["/hr/payroll/posting"]}>
        <AppSidebar />
      </MemoryRouter>,
    );

    const collapsible = screen.getAllByTestId("collapsible").find((el) =>
      el.textContent?.includes("Period close"),
    );
    expect(collapsible?.getAttribute("data-open")).toBe("true");
  });

  it("highlights system health under Reports", () => {
    render(
      <MemoryRouter initialEntries={["/system/health"]}>
        <AppSidebar />
      </MemoryRouter>,
    );

    const healthWrapper = screen.getByText("System Health").parentElement;
    expect(healthWrapper?.getAttribute("data-active")).toBe("true");
  });
});
