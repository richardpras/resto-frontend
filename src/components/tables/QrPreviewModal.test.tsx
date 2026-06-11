// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { QrPreviewModal } from "@/components/tables/QrPreviewModal";

const getTableQrDetail = vi.fn();
const fetchTableQrImageBlob = vi.fn();

vi.mock("@/lib/api-integration/tableEndpoints", () => ({
  getTableQrDetail: (...args: unknown[]) => getTableQrDetail(...args),
  fetchTableQrImageBlob: (...args: unknown[]) => fetchTableQrImageBlob(...args),
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
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:qr"),
      revokeObjectURL: vi.fn(),
    });
  });

  it("shows QR preview with URL and actions when ready", async () => {
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

    await waitFor(() => {
      expect(screen.getByText("Table A01")).toBeInTheDocument();
    });
    expect(screen.getAllByText("https://order.example.com/qr/abc123").length).toBeGreaterThan(0);
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
});
