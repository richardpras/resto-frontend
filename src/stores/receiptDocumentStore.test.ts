import { beforeEach, describe, expect, it, vi } from "vitest";
import { useReceiptDocumentStore } from "./receiptDocumentStore";
import type { ReceiptRenderHistoryRow } from "@/domain/receiptDocumentTypes";

const mockList = vi.fn();
const mockGet = vi.fn();
const mockReprint = vi.fn();
const mockDefer = vi.fn();
const mockFetchPdf = vi.fn();

vi.mock("@/lib/api-integration/receiptDocumentEndpoints", () => ({
  listReceiptRenderHistory: (...args: unknown[]) => mockList(...args),
  getReceiptRenderHistory: (...args: unknown[]) => mockGet(...args),
  postReceiptReprint: (...args: unknown[]) => mockReprint(...args),
  postReceiptDeferReplay: (...args: unknown[]) => mockDefer(...args),
  fetchReceiptPdfBlob: (...args: unknown[]) => mockFetchPdf(...args),
}));

const sampleRow = (over: Partial<ReceiptRenderHistoryRow> = {}): ReceiptRenderHistoryRow => ({
  id: 9,
  outletId: 1,
  receiptTemplateId: 1,
  kind: "customer_receipt",
  sourceType: "order",
  sourceId: 50,
  orderSplitId: null,
  thermalText: "RECEIPT",
  htmlSnapshot: null,
  pdfAvailable: true,
  invoiceNumber: "INV-1-000001",
  fiscalInvoiceId: 3,
  reprintCount: 0,
  deferredReplayPending: false,
  recoveryMeta: null,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  ...over,
});

describe("receiptDocumentStore", () => {
  beforeEach(() => {
    mockList.mockReset();
    mockGet.mockReset();
    mockReprint.mockReset();
    mockDefer.mockReset();
    mockFetchPdf.mockReset();
    useReceiptDocumentStore.getState().reset();
  });

  it("loads render history rows for an outlet via listReceiptRenderHistory only", async () => {
    mockList.mockResolvedValue([sampleRow({ id: 1 })]);
    await useReceiptDocumentStore.getState().loadHistory(1);
    expect(mockList).toHaveBeenCalledWith(1);
    expect(useReceiptDocumentStore.getState().historyRows).toHaveLength(1);
    expect(useReceiptDocumentStore.getState().historyOutletId).toBe(1);
  });

  it("opens preview through getReceiptRenderHistory (no printer SDK calls)", async () => {
    mockGet.mockResolvedValue(sampleRow({ id: 42 }));
    await useReceiptDocumentStore.getState().openPreview(42);
    expect(mockGet).toHaveBeenCalledWith(42);
    expect(useReceiptDocumentStore.getState().previewOpen).toBe(true);
    expect(useReceiptDocumentStore.getState().activeRender?.id).toBe(42);
  });

  it("reprint action delegates to API then refreshes the active render", async () => {
    useReceiptDocumentStore.setState({
      previewOpen: true,
      activeRender: sampleRow({ id: 7, reprintCount: 0 }),
      historyOutletId: 1,
    });
    mockList.mockResolvedValue([sampleRow({ id: 7, reprintCount: 1 })]);
    mockReprint.mockResolvedValue({ printJobId: 99, render: sampleRow({ id: 7, reprintCount: 1 }) });
    mockGet.mockResolvedValue(sampleRow({ id: 7, reprintCount: 1 }));

    await useReceiptDocumentStore.getState().requestReprint("test");

    expect(mockReprint).toHaveBeenCalledWith(7, "test");
    expect(mockGet).toHaveBeenCalledWith(7);
    expect(useReceiptDocumentStore.getState().activeRender?.reprintCount).toBe(1);
    expect(mockList).toHaveBeenCalled();
  });
});
