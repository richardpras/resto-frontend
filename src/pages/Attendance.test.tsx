// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Attendance from "./Attendance";
import { listAttendances, manualCorrectAttendance, syncAttendance } from "@/lib/api";

vi.mock("@/lib/api", () => ({
  listAttendances: vi.fn(),
  syncAttendance: vi.fn(),
  manualCorrectAttendance: vi.fn(),
}));

describe("Attendance page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists attendances, handles sync, and submits manual correction", async () => {
    vi.mocked(listAttendances).mockResolvedValue([
      {
        id: "att-1",
        employee_id: "EMP-01",
        employee_name: "John",
        attendance_date: "2026-04-30",
        source: "fingerprint",
        status: "present",
      },
    ] as never);

    vi.mocked(syncAttendance).mockRejectedValueOnce(new Error("Duplicate payload")).mockResolvedValueOnce({
      id: "att-2",
      employee_id: "EMP-02",
      employee_name: "Jane",
      attendance_date: "2026-05-01",
      source: "fingerprint",
      status: "late",
    } as never);

    vi.mocked(manualCorrectAttendance).mockResolvedValue({
      id: "att-1",
      employee_id: "EMP-01",
      employee_name: "John",
      attendance_date: "2026-04-30",
      source: "manual",
      status: "late",
    } as never);

    render(<Attendance />);

    expect(await screen.findByTestId("attendance-row-att-1")).toBeTruthy();

    fireEvent.change(screen.getByPlaceholderText("Employee ID"), { target: { value: "EMP-02" } });
    fireEvent.change(screen.getByLabelText("Attendance Date"), { target: { value: "2026-05-01" } });
    fireEvent.click(screen.getByRole("button", { name: "Sync Attendance" }));
    await waitFor(() => expect(syncAttendance).toHaveBeenCalledTimes(1));

    fireEvent.change(screen.getByPlaceholderText("Employee ID"), { target: { value: "EMP-02" } });
    fireEvent.change(screen.getByLabelText("Attendance Date"), { target: { value: "2026-05-01" } });
    fireEvent.click(screen.getByRole("button", { name: "Sync Attendance" }));
    expect(await screen.findByTestId("attendance-row-att-2")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Attendance To Correct"), { target: { value: "att-1" } });
    fireEvent.change(screen.getByPlaceholderText("Correction reason"), { target: { value: "Approved by HR" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit Correction" }));

    await waitFor(() => {
      expect(manualCorrectAttendance).toHaveBeenCalledWith("att-1", {
        reason: "Approved by HR",
      });
    });
  });
});
