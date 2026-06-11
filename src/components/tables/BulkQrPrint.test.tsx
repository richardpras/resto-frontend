// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { BulkQrPrintDialog } from "@/components/tables/BulkQrPrintDialog";

const exportTableQrPdf = vi.fn();

vi.mock("@/lib/api-integration/tableEndpoints", () => ({
  exportTableQrPdf: (...args: unknown[]) => exportTableQrPdf(...args),
}));

const tables = [
  {
    id: 1,
    outletId: 2,
    name: "A01",
    capacity: 4,
    status: "active" as const,
    active: true,
    qrEnabled: true,
    qrStatus: "ready" as const,
    tableOperationalStatus: "available" as const,
  },
  {
    id: 2,
    outletId: 2,
    name: "A02",
    capacity: 4,
    status: "active" as const,
    active: true,
    qrEnabled: true,
    qrStatus: "missing_url" as const,
    tableOperationalStatus: "available" as const,
  },
];

describe("BulkQrPrint", () => {
  beforeEach(() => {
    exportTableQrPdf.mockReset();
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:pdf"),
      revokeObjectURL: vi.fn(),
    });
  });

  it("exports PDF for ready tables only", async () => {
    exportTableQrPdf.mockResolvedValue(new Blob(["pdf"], { type: "application/pdf" }));

    render(<BulkQrPrintDialog open outletId={2} tables={tables} onOpenChange={() => {}} />);

    expect(screen.getByText("• A01")).toBeInTheDocument();
    expect(screen.queryByText("• A02")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Download PDF" }));

    await waitFor(() => {
      expect(exportTableQrPdf).toHaveBeenCalledWith(2, [1]);
    });
  });
});
