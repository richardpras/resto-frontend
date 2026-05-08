import { create } from "zustand";
import type { ReceiptRenderHistoryRow } from "@/domain/receiptDocumentTypes";
import {
  fetchReceiptPdfBlob,
  getReceiptRenderHistory,
  listReceiptRenderHistory,
  postReceiptDeferReplay,
  postReceiptReprint,
} from "@/lib/api-integration/receiptDocumentEndpoints";

type ReceiptDocumentStore = {
  historyOutletId: number | null;
  historyRows: ReceiptRenderHistoryRow[];
  isLoadingHistory: boolean;
  isLoadingDetail: boolean;
  isMutating: boolean;
  error: string | null;
  previewOpen: boolean;
  activeRender: ReceiptRenderHistoryRow | null;
  pdfObjectUrl: string | null;
  setHistoryOutletId: (id: number | null) => void;
  loadHistory: (outletId: number) => Promise<void>;
  openPreview: (historyId: number) => Promise<void>;
  closePreview: () => void;
  requestReprint: (reason?: string) => Promise<void>;
  markDeferred: () => Promise<void>;
  openPdfInNewTab: () => Promise<void>;
  reset: () => void;
};

function revokePdfUrl(url: string | null): void {
  if (url) URL.revokeObjectURL(url);
}

export const useReceiptDocumentStore = create<ReceiptDocumentStore>((set, get) => ({
  historyOutletId: null,
  historyRows: [],
  isLoadingHistory: false,
  isLoadingDetail: false,
  isMutating: false,
  error: null,
  previewOpen: false,
  activeRender: null,
  pdfObjectUrl: null,

  setHistoryOutletId: (id) => set({ historyOutletId: id }),

  loadHistory: async (outletId) => {
    set({ isLoadingHistory: true, error: null, historyOutletId: outletId });
    try {
      const historyRows = await listReceiptRenderHistory(outletId);
      set({ historyRows });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : "Failed to load receipt history" });
    } finally {
      set({ isLoadingHistory: false });
    }
  },

  openPreview: async (historyId) => {
    set({ isLoadingDetail: true, error: null, previewOpen: true });
    revokePdfUrl(get().pdfObjectUrl);
    try {
      const activeRender = await getReceiptRenderHistory(historyId);
      set({ activeRender, pdfObjectUrl: null });
    } catch (e) {
      set({
        error: e instanceof Error ? e.message : "Failed to load receipt",
        activeRender: null,
        previewOpen: false,
      });
    } finally {
      set({ isLoadingDetail: false });
    }
  },

  closePreview: () => {
    revokePdfUrl(get().pdfObjectUrl);
    set({ previewOpen: false, activeRender: null, pdfObjectUrl: null });
  },

  requestReprint: async (reason) => {
    const row = get().activeRender;
    if (!row) return;
    set({ isMutating: true, error: null });
    try {
      await postReceiptReprint(row.id, reason);
      const activeRender = await getReceiptRenderHistory(row.id);
      set({ activeRender });
      const outletId = get().historyOutletId;
      if (outletId) await get().loadHistory(outletId);
    } catch (e) {
      set({ error: e instanceof Error ? e.message : "Reprint request failed" });
    } finally {
      set({ isMutating: false });
    }
  },

  markDeferred: async () => {
    const row = get().activeRender;
    if (!row) return;
    set({ isMutating: true, error: null });
    try {
      const activeRender = await postReceiptDeferReplay(row.id);
      set({ activeRender });
      const outletId = get().historyOutletId;
      if (outletId) await get().loadHistory(outletId);
    } catch (e) {
      set({ error: e instanceof Error ? e.message : "Deferred marking failed" });
    } finally {
      set({ isMutating: false });
    }
  },

  openPdfInNewTab: async () => {
    const row = get().activeRender;
    if (!row?.pdfAvailable) return;
    set({ isMutating: true, error: null });
    revokePdfUrl(get().pdfObjectUrl);
    try {
      const blob = await fetchReceiptPdfBlob(row.id);
      const pdfObjectUrl = URL.createObjectURL(blob);
      set({ pdfObjectUrl });
      window.open(pdfObjectUrl, "_blank", "noopener,noreferrer");
    } catch (e) {
      set({ error: e instanceof Error ? e.message : "PDF download failed" });
    } finally {
      set({ isMutating: false });
    }
  },

  reset: () => {
    revokePdfUrl(get().pdfObjectUrl);
    set({
      historyOutletId: null,
      historyRows: [],
      isLoadingHistory: false,
      isLoadingDetail: false,
      isMutating: false,
      error: null,
      previewOpen: false,
      activeRender: null,
      pdfObjectUrl: null,
    });
  },
}));
