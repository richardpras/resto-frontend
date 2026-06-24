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

    expect(screen.getByTestId("qr-print-label")).toBeInTheDocument();
    expect(screen.getByText("Demo Resto")).toBeInTheDocument();
    expect(screen.getByText("Main Hall")).toBeInTheDocument();
    expect(screen.getByText("A01")).toBeInTheDocument();
    expect(screen.getByText("Scan to order from your table")).toBeInTheDocument();
    expect(screen.queryByText("https://order.example.com/qr/tok")).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: "QR for A01" })).toHaveAttribute("src", "data:image/png;base64,abc");
  });

  it("renders custom scan hint when provided", () => {
    render(
      <QrPrintTemplate
        table={{
          id: 1,
          outletId: 1,
          name: "B02",
          capacity: 2,
          status: "active",
          active: true,
          qrEnabled: true,
          qrPublicId: "tok2",
          qrUrl: "https://order.example.com/qr/tok2",
          qrStatus: "ready",
        }}
        qrImageSrc="data:image/png;base64,xyz"
        scanHint="Scan untuk pesan dari meja Anda"
      />,
    );

    expect(screen.getByText("Scan untuk pesan dari meja Anda")).toBeInTheDocument();
  });
});
