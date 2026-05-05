// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Attendance from "./payroll/Attendance";

describe("Attendance (payroll tab)", () => {
  it("renders heading, log action, and empty state from store", () => {
    render(<Attendance />);

    expect(screen.getByRole("heading", { name: /Attendance/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Log Attendance/i })).toBeTruthy();
    expect(screen.getByText(/No attendance records/i)).toBeTruthy();
  });
});
