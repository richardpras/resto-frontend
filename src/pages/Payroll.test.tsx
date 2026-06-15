// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import Payroll from "./Payroll";

vi.mock("@/stores/authStore", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/stores/authStore")>();
  return {
    ...actual,
    useAuthStore: (selector: (state: { user: { id: string; permissions: string[] } | null }) => unknown) =>
      selector({ user: { id: "1", permissions: ["payroll.manage"] } }),
  };
});

const payrollStoreState = {
  employees: [],
  refreshEmployeesFromApi: vi.fn().mockResolvedValue(undefined),
  refreshAttendanceFromApi: vi.fn().mockResolvedValue(undefined),
  refreshPayrollsFromApi: vi.fn().mockResolvedValue(undefined),
  refreshOvertimeFromApi: vi.fn().mockResolvedValue(undefined),
  refreshAdjustmentsFromApi: vi.fn().mockResolvedValue(undefined),
  refreshShiftsFromApi: vi.fn().mockResolvedValue(undefined),
  refreshLoansFromApi: vi.fn().mockResolvedValue(undefined),
  payrolls: [],
};

vi.mock("@/lib/api", () => ({
  listPayrollTable: vi.fn().mockResolvedValue({
    data: [],
    meta: { currentPage: 1, perPage: 10, total: 0, lastPage: 1 },
  }),
  generatePayrollRun: vi.fn(),
  getPayrollDetail: vi.fn(),
  lockPayrollLine: vi.fn(),
  markLegacyPayrollRunPaid: vi.fn(),
  unlockPayrollLine: vi.fn(),
}));

vi.mock("@/stores/payrollStore", () => ({
  usePayrollStore: (selector?: (state: typeof payrollStoreState) => unknown) =>
    selector ? selector(payrollStoreState) : payrollStoreState,
  formatIDR: (value: number) => `Rp ${value}`,
}));

describe("Payroll page", () => {
  it("renders payroll shell and primary actions from local store flow", () => {
    render(
      <MemoryRouter>
        <Payroll />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: /Payroll & HR/i })).toBeTruthy();
    expect(screen.getByRole("tab", { name: /Payroll/i })).toBeTruthy();
    expect(screen.getByRole("heading", { name: /Payroll List/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Generate Payroll/i })).toBeTruthy();
  });
});
