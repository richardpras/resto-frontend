// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Payroll from "./Payroll";
import { createPayroll, listPayrolls } from "@/lib/api";

vi.mock("@/lib/api", () => ({
  listPayrolls: vi.fn(),
  createPayroll: vi.fn(),
}));

describe("Payroll page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists payroll records and submits create flow", async () => {
    vi.mocked(listPayrolls).mockResolvedValue([
      {
        id: "pay-1",
        employee_id: "EMP-01",
        employee_name: "John",
        period_start: "2026-04-01",
        period_end: "2026-04-30",
        basic_salary: 5000000,
        allowances: 250000,
        deductions: 100000,
        attendance_summary: { lateCount: 1, absentCount: 0, overtimeMinutes: 30 },
      },
    ] as never);

    vi.mocked(createPayroll).mockResolvedValue({
      id: "pay-2",
      employee_id: "EMP-02",
      employee_name: "Jane",
      period_start: "2026-05-01",
      period_end: "2026-05-31",
      basic_salary: 5500000,
      allowances: 0,
      deductions: 0,
      attendance_summary: { lateCount: 0, absentCount: 1, overtimeMinutes: 15 },
    } as never);

    render(<Payroll />);

    expect(await screen.findByTestId("payroll-row-pay-1")).toBeTruthy();
    expect(screen.getByText(/Late: 1, Absent: 0, OT: 30 mins/i)).toBeTruthy();

    fireEvent.change(screen.getByPlaceholderText("Employee ID"), { target: { value: "EMP-02" } });
    fireEvent.change(screen.getByLabelText("Period Start"), { target: { value: "2026-05-01" } });
    fireEvent.change(screen.getByLabelText("Period End"), { target: { value: "2026-05-31" } });
    fireEvent.change(screen.getByPlaceholderText("Basic Salary"), { target: { value: "5500000" } });
    fireEvent.click(screen.getByRole("button", { name: "Create Payroll" }));

    await waitFor(() => {
      expect(createPayroll).toHaveBeenCalledWith(
        expect.objectContaining({
          employee_id: "EMP-02",
          period_start: "2026-05-01",
          period_end: "2026-05-31",
          basic_salary: 5500000,
        })
      );
    });

    expect(await screen.findByTestId("payroll-row-pay-2")).toBeTruthy();
  });
});
