// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { QrPreviewModal } from "@/components/tables/QrPreviewModal";

const getTableQrDetail = vi.fn();
const fetchTableQrImageBlob = vi.fn();
const captureElementAsPngBlob = vi.fn();
const printCapturedLabel = vi.fn();

vi.mock("@/i18n/useOpsTranslation", () => ({
  useOpsTranslation: () => ({
    t: (key: string) =>
      (
        ({
          "tables.printRestaurant": "Restaurant",
          "tables.printScanHint": "Scan to order from your table",
          "tables.printFailed": "Failed to print QR.",
        }) as Record<string, string>
      )[key] ?? key,
  }),
}));

vi.mock("@/lib/api-integration/tableEndpoints", () => ({
  getTableQrDetail: (...args: unknown[]) => getTableQrDetail(...args),
  fetchTableQrImageBlob: (...args: unknown[]) => fetchTableQrImageBlob(...args),
}));

vi.mock("@/lib/qrLabelCapture", () => ({
  captureElementAsPngBlob: (...args: unknown[]) => captureElementAsPngBlob(...args),
  printCapturedLabel: (...args: unknown[]) => printCapturedLabel(...args),
}));

const table = {
  id: 1,
  outletId: 2,
  name: "A01",
  capacity: 4,
  status: "active" as const,
  active: true,
  qrEnabled: true,
  qrPublicId: "abc123",
  qrUrl: "https://order.example.com/qr/abc123",
  qrStatus: "ready" as const,
};

describe("QrPreviewModal", () => {
  beforeEach(() => {
    getTableQrDetail.mockReset();
    fetchTableQrImageBlob.mockReset();
    captureElementAsPngBlob.mockReset();
    printCapturedLabel.mockReset();
    printCapturedLabel.mockResolvedValue(undefined);
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:qr"),
      revokeObjectURL: vi.fn(),
    });
    vi.spyOn(window, "open").mockImplementation(() => null);
  });

  it("shows full QR label preview without URL link on label", async () => {
    getTableQrDetail.mockResolvedValue({
      tableId: 1,
      tableName: "A01",
      qrPublicId: "abc123",
      qrUrl: "https://order.example.com/qr/abc123",
      qrImageUrl: "/api/v1/tables/1/qr/image",
      qrStatus: "ready",
      qrStatusReason: null,
    });
    fetchTableQrImageBlob.mockResolvedValue(new Blob(["png"], { type: "image/png" }));

    render(<QrPreviewModal open table={table} outletName="Main Hall" onOpenChange={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText("Table A01")).toBeInTheDocument();
    });
    expect(screen.getByTestId("qr-print-label")).toBeInTheDocument();
    expect(screen.getByText("Restaurant")).toBeInTheDocument();
    expect(screen.getByText("Main Hall")).toBeInTheDocument();
    expect(screen.getByText("Scan to order from your table")).toBeInTheDocument();
    expect(screen.queryByText("https://order.example.com/qr/abc123")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy URL" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download PNG" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Print" })).toBeInTheDocument();
  });

  it("copies QR URL to clipboard", async () => {
    getTableQrDetail.mockResolvedValue({
      tableId: 1,
      tableName: "A01",
      qrPublicId: "abc123",
      qrUrl: "https://order.example.com/qr/abc123",
      qrImageUrl: null,
      qrStatus: "ready",
      qrStatusReason: null,
    });
    fetchTableQrImageBlob.mockResolvedValue(new Blob(["png"], { type: "image/png" }));
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(<QrPreviewModal open table={table} onOpenChange={() => {}} />);
    await waitFor(() => screen.getByRole("button", { name: "Copy URL" }));
    fireEvent.click(screen.getByRole("button", { name: "Copy URL" }));
    expect(writeText).toHaveBeenCalledWith("https://order.example.com/qr/abc123");
  });

  it("downloads captured label PNG instead of bare API blob", async () => {
    getTableQrDetail.mockResolvedValue({
      tableId: 1,
      tableName: "A01",
      qrPublicId: "abc123",
      qrUrl: "https://order.example.com/qr/abc123",
      qrImageUrl: "/api/v1/tables/1/qr/image",
      qrStatus: "ready",
      qrStatusReason: null,
    });
    fetchTableQrImageBlob.mockResolvedValue(new Blob(["png"], { type: "image/png" }));
    captureElementAsPngBlob.mockResolvedValue(new Blob(["label-png"], { type: "image/png" }));
    const click = vi.fn();
    const createElement = vi.spyOn(document, "createElement").mockImplementation((tagName: string) => {
      const el = document.createElementNS("http://www.w3.org/1999/xhtml", tagName) as HTMLAnchorElement;
      if (tagName === "a") {
        el.click = click;
      }
      return el;
    });

    render(<QrPreviewModal open table={table} onOpenChange={() => {}} />);
    await waitFor(() => screen.getByRole("button", { name: "Download PNG" }));
    fireEvent.click(screen.getByRole("button", { name: "Download PNG" }));

    await waitFor(() => {
      expect(captureElementAsPngBlob).toHaveBeenCalled();
      expect(click).toHaveBeenCalled();
    });
    expect(fetchTableQrImageBlob).toHaveBeenCalledTimes(1);

    createElement.mockRestore();
  });

  it("prints captured label without window.open", async () => {
    getTableQrDetail.mockResolvedValue({
      tableId: 1,
      tableName: "A01",
      qrPublicId: "abc123",
      qrUrl: "https://order.example.com/qr/abc123",
      qrImageUrl: "/api/v1/tables/1/qr/image",
      qrStatus: "ready",
      qrStatusReason: null,
    });
    fetchTableQrImageBlob.mockResolvedValue(new Blob(["png"], { type: "image/png" }));

    render(<QrPreviewModal open table={table} onOpenChange={() => {}} />);
    await waitFor(() => screen.getByRole("button", { name: "Print" }));
    fireEvent.click(screen.getByRole("button", { name: "Print" }));

    await waitFor(() => {
      expect(printCapturedLabel).toHaveBeenCalled();
    });
    expect(window.open).not.toHaveBeenCalled();
  });
});
