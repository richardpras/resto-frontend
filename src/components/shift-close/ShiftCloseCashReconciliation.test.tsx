// @vitest-environment jsdom
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ShiftCloseCashDrawerPanel } from "./ShiftCloseCashDrawerPanel";

describe("ShiftCloseCashReconciliation", () => {
  it("shows drawer formula fields", () => {
    render(
      <ShiftCloseCashDrawerPanel
        drawer={{
          openingCash: 500000,
          cashSales: 1000000,
          cashRefunds: 50000,
          cashExpenses: 0,
          cashIn: 0,
          cashOut: 0,
          expected: 1450000,
          actual: null,
          variance: null,
          status: "unknown",
        }}
        actualCash=""
        onActualCashChange={vi.fn()}
      />,
    );
    expect(screen.getByText("Opening Cash")).toBeInTheDocument();
    expect(screen.getByText("Cash Expenses")).toBeInTheDocument();
    expect(screen.getByText("Expected Cash")).toBeInTheDocument();
    expect(screen.getByLabelText("Actual Cash")).toBeInTheDocument();
  });

  it("updates actual cash input", () => {
    const onChange = vi.fn();
    render(
      <ShiftCloseCashDrawerPanel
        drawer={{
          openingCash: 0,
          cashSales: 100,
          cashRefunds: 0,
          cashExpenses: 0,
          cashIn: 0,
          cashOut: 0,
          expected: 100,
          actual: null,
          variance: null,
          status: "unknown",
        }}
        actualCash=""
        onActualCashChange={onChange}
      />,
    );
    fireEvent.change(screen.getByLabelText("Actual Cash"), { target: { value: "95" } });
    expect(onChange).toHaveBeenCalledWith("95");
  });
});
