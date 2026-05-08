/** Server `ReceiptRenderHistoryResource` payload (Phase 14). */
export type ReceiptRenderHistoryRow = {
  id: number;
  outletId: number;
  receiptTemplateId: number | null;
  kind: string;
  sourceType: string;
  sourceId: number;
  orderSplitId: number | null;
  thermalText: string;
  htmlSnapshot: string | null;
  pdfAvailable: boolean;
  invoiceNumber: string | null;
  fiscalInvoiceId: number | null;
  reprintCount: number;
  deferredReplayPending: boolean;
  recoveryMeta: Record<string, unknown> | null;
  createdAt: string | null;
  updatedAt: string | null;
};
