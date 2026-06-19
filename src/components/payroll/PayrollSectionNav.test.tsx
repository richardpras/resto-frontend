// @vitest-environment jsdom
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { Tabs } from "@/components/ui/tabs";
import { PayrollSectionNav } from "./PayrollSectionNav";
import { PAYROLL_GROUP_LABEL_KEYS } from "@/domain/payrollTabGroups";
import type { PayrollTabKey } from "@/domain/permissionGates";
import { ensureEnglishLocale } from "@/test/i18nTestSetup";

const sampleGroups = [
  {
    labelKey: PAYROLL_GROUP_LABEL_KEYS.setup,
    tabs: ["employees", "shifts"] as PayrollTabKey[],
  },
  {
    labelKey: PAYROLL_GROUP_LABEL_KEYS.daily,
    tabs: ["attendance", "overtime"] as PayrollTabKey[],
  },
];

function renderNav(activeTab: PayrollTabKey, onTabChange = vi.fn()) {
  const view = render(
    <MemoryRouter>
      <Tabs value={activeTab} onValueChange={() => undefined}>
        <PayrollSectionNav
          activeTab={activeTab}
          visibleTabGroups={sampleGroups}
          onTabChange={onTabChange}
        />
      </Tabs>
    </MemoryRouter>,
  );
  return { ...view, onTabChange };
}

describe("PayrollSectionNav", () => {
  it("renders translated group labels instead of raw i18n keys", async () => {
    await ensureEnglishLocale();
    renderNav("employees");

    expect(screen.getByRole("group", { name: "Payroll module categories" })).toBeTruthy();
    expect(screen.getByRole("radio", { name: "Setup" })).toBeTruthy();
    expect(screen.getByRole("radio", { name: "Daily" })).toBeTruthy();
    expect(screen.queryByText("NAV.PAYROLLGROUPSETUP")).toBeNull();
  });

  it("shows only tabs from the active group", async () => {
    await ensureEnglishLocale();
    renderNav("employees");

    const tabList = screen.getByRole("tablist", { name: "Payroll sub-pages" });
    expect(within(tabList).getByRole("tab", { name: /Employees/i })).toBeTruthy();
    expect(within(tabList).getByRole("tab", { name: /Shifts/i })).toBeTruthy();
    expect(within(tabList).queryByRole("tab", { name: /Attendance/i })).toBeNull();
  });

  it("switches to the first tab when selecting another group", async () => {
    await ensureEnglishLocale();
    const onTabChange = vi.fn();
    renderNav("employees", onTabChange);

    fireEvent.click(screen.getByRole("radio", { name: "Daily" }));

    expect(onTabChange).toHaveBeenCalledWith("attendance");
  });
});
