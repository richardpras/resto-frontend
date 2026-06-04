// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Attendance from "./payroll/Attendance";

vi.mock("@/stores/authStore", () => ({
  useAuthStore: () => ({
    user: { assignedOutlets: [{ id: 1, name: "Main" }] },
  }),
}));

vi.mock("@/lib/api-integration/organizationEndpoints", () => ({
  listOrganizationEmployees: vi.fn().mockResolvedValue([]),
  listDepartments: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/api-integration/hrEndpoints", () => ({
  listAttendanceRecords: vi.fn().mockResolvedValue([]),
  importAttendanceCsv: vi.fn(),
  patchAttendanceRecord: vi.fn(),
}));

describe("Attendance (payroll tab)", () => {
  it("renders heading, import action, and empty state", async () => {
    render(<Attendance />);

    expect(screen.getByRole("heading", { name: /Attendance/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Import CSV/i })).toBeTruthy();
    expect(await screen.findByText(/No attendance records in this range/i)).toBeTruthy();
  });
});
