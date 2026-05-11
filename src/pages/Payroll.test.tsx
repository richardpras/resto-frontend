// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Payroll from "./Payroll";

describe("Payroll page", () => {
  it("renders payroll shell and primary actions from local store flow", () => {
    render(<Payroll />);

    expect(screen.getByRole("heading", { name: /Payroll Management/i })).toBeTruthy();
    expect(screen.getByRole("tab", { name: /Payroll/i })).toBeTruthy();
    expect(screen.getByRole("heading", { name: /Payroll List/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Generate Payroll/i })).toBeTruthy();
  });
});
