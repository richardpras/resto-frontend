// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PosOpenBillRecoveryBanner } from "@/components/pos/PosOpenBillRecoveryBanner";

describe("PosOpenBillRecoveryPrompt", () => {
  it("shows existing open bill CTA", () => {
    render(<PosOpenBillRecoveryBanner orderCode="POS-OPEN-1" />);
    expect(screen.getByText(/Order POS-OPEN-1/)).toBeTruthy();
  });

  it("invokes open bill handler", () => {
    const onOpenBill = vi.fn();
    render(<PosOpenBillRecoveryBanner orderCode="POS-OPEN-1" onOpenBill={onOpenBill} />);
    fireEvent.click(screen.getByRole("button", { name: /^open bill$/i }));
    expect(onOpenBill).toHaveBeenCalledOnce();
  });
});
