// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { QrPrintTemplate } from "@/components/tables/QrPrintTemplate";

describe("TableQrPrint", () => {
  it("renders printable QR label template", () => {
    render(
      <QrPrintTemplate
        table={{
          id: 1,
          outletId: 1,
          name: "A01",
          capacity: 4,
          status: "active",
          active: true,
          qrEnabled: true,
          qrPublicId: "tok",
          qrUrl: "https://order.example.com/qr/tok",
          qrStatus: "ready",
          tableOperationalStatus: "available",
        }}
        qrImageSrc="data:image/png;base64,abc"
        restaurantName="Demo Resto"
        outletName="Main Hall"
      />,
    );

    expect(screen.getByText("Demo Resto")).toBeInTheDocument();
    expect(screen.getByText("Main Hall")).toBeInTheDocument();
    expect(screen.getByText("A01")).toBeInTheDocument();
    expect(screen.getByText("Scan to order from your table")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "QR for A01" })).toHaveAttribute("src", "data:image/png;base64,abc");
  });
});
