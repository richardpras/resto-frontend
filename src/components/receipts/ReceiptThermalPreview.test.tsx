import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ReceiptThermalPreview } from "./ReceiptThermalPreview";

describe("ReceiptThermalPreview", () => {
  it("renders meta block and two-line sample items", () => {
    render(
      <ReceiptThermalPreview
        outletName="Mountain Cafe"
        header="Welcome"
        footer="Thank you"
        showTaxBreakdown
        widthCh={32}
      />,
    );

    expect(screen.getByTestId("receipt-thermal-preview")).toBeInTheDocument();
    expect(screen.getByText("Mountain Cafe")).toBeInTheDocument();
    expect(screen.getByText("Welcome")).toBeInTheDocument();
    expect(screen.getByText("Item A")).toBeInTheDocument();
    expect(screen.getByText("Item B")).toBeInTheDocument();
    expect(screen.getByText(/Customer/)).toBeInTheDocument();
    expect(screen.getByText(/Type/)).toBeInTheDocument();
    expect(screen.getByText("Thank you")).toBeInTheDocument();
  });

  it("shows logo image when showLogo and logoUrl are set", () => {
    render(
      <ReceiptThermalPreview
        outletName="Mountain Cafe"
        header="Welcome"
        footer="Thank you"
        showLogo
        logoUrl="https://example.test/logo.webp"
        showTaxBreakdown
        widthCh={32}
      />,
    );

    const logo = screen.getByTestId("receipt-preview-logo");
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveAttribute("src", "https://example.test/logo.webp");
  });
});
