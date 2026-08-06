import { beforeEach, describe, expect, it, vi } from "vitest";
import { usePosSessionStore } from "./posSessionStore";

const mockOpenPosSession = vi.fn();
const mockClosePosSession = vi.fn();
const mockGetCurrentPosSession = vi.fn();
const mockGetPosSessionClosePreview = vi.fn();
const mockListPosSessionCashMovements = vi.fn();
const mockCreatePosSessionCashMovement = vi.fn();

vi.mock("@/lib/api-integration/posSessionEndpoints", () => ({
  openPosSession: (...args: unknown[]) => mockOpenPosSession(...args),
  closePosSession: (...args: unknown[]) => mockClosePosSession(...args),
  getCurrentPosSession: (...args: unknown[]) => mockGetCurrentPosSession(...args),
  getPosSessionClosePreview: (...args: unknown[]) => mockGetPosSessionClosePreview(...args),
  listPosSessionCashMovements: (...args: unknown[]) => mockListPosSessionCashMovements(...args),
  createPosSessionCashMovement: (...args: unknown[]) => mockCreatePosSessionCashMovement(...args),
  POS_CASH_OUT_CATEGORIES: ["iuran", "operasional", "beli_bahan_darurat", "lainnya"],
  POS_CASH_IN_CATEGORIES: ["setor_modal", "dari_brankas", "lainnya"],
}));

vi.mock("@/mobile/platform", () => ({
  isNativePosShell: () => false,
}));

describe("posSessionStore async lifecycle", () => {
  beforeEach(() => {
    usePosSessionStore.getState().reset();
    mockOpenPosSession.mockReset();
    mockClosePosSession.mockReset();
    mockGetCurrentPosSession.mockReset();
    mockGetPosSessionClosePreview.mockReset();
  });

  it("tracks loading/submitting and sync timestamp", async () => {
    mockGetCurrentPosSession.mockResolvedValueOnce({ session: null, defaultCashFloat: 500000 });
    await usePosSessionStore.getState().fetchCurrent(11);

    const state = usePosSessionStore.getState();
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
    expect(state.currentSession).toBeNull();
    expect(state.defaultCashFloat).toBe(500000);
    expect(state.lastSyncAt).not.toBeNull();
  });

  it("opens session and rejects duplicate open by surfacing error", async () => {
    mockOpenPosSession.mockResolvedValueOnce({
      id: 101,
      outletId: 12,
      status: "open",
      openingCash: 200000,
      closingCash: null,
      expectedCash: null,
      actualCash: null,
      cashVariance: null,
      openedAt: new Date().toISOString(),
      closedAt: null,
      notes: "Opening",
    });

    const store = usePosSessionStore.getState();
    await store.open(12, 200000, "Opening");
    expect(usePosSessionStore.getState().currentSession?.id).toBe(101);
    expect(usePosSessionStore.getState().isSubmitting).toBe(false);

    mockOpenPosSession.mockRejectedValueOnce(new Error("Session already open"));
    await expect(usePosSessionStore.getState().open(12, 100000)).rejects.toThrow("Session already open");
    expect(usePosSessionStore.getState().error).toBe("Session already open");
  });

  it("loads close preview", async () => {
    mockGetPosSessionClosePreview.mockResolvedValueOnce({
      sessionId: 201,
      outletId: 15,
      defaultCashFloat: 500000,
      drawerReconciliation: {
        openingCash: 500000,
        cashSales: 100000,
        cashRefunds: 0,
        cashExpenses: 0,
        cashIn: 0,
        cashOut: 0,
        expected: 600000,
      },
    });

    const preview = await usePosSessionStore.getState().previewClose(201);
    expect(preview.drawerReconciliation.expected).toBe(600000);
  });

  it("closes current session and clears active session", async () => {
    usePosSessionStore.setState({
      currentSession: {
        id: 201,
        outletId: 15,
        openedByUserId: 1,
        closedByUserId: null,
        status: "open",
        openingCash: 100000,
        closingCash: null,
        expectedCash: null,
        actualCash: null,
        cashVariance: null,
        openedAt: new Date().toISOString(),
        closedAt: null,
        notes: null,
      },
    });

    mockClosePosSession.mockResolvedValueOnce({
      id: 201,
      outletId: 15,
      status: "closed",
      openingCash: 100000,
      closingCash: 98000,
      expectedCash: 100000,
      actualCash: 98000,
      cashVariance: -2000,
      openedAt: new Date().toISOString(),
      closedAt: new Date().toISOString(),
      notes: "End shift",
    });

    await usePosSessionStore.getState().close(201, 98000, "End shift");
    const state = usePosSessionStore.getState();
    expect(state.currentSession).toBeNull();
    expect(state.isSubmitting).toBe(false);
    expect(state.lastSyncAt).not.toBeNull();
    expect(mockClosePosSession).toHaveBeenCalledWith(201, { actualCash: 98000, notes: "End shift" });
  });

  it("records cash out online and keeps it in store", async () => {
    usePosSessionStore.setState({
      currentSession: {
        id: 301,
        outletId: 9,
        openedByUserId: 1,
        closedByUserId: null,
        status: "open",
        openingCash: 500000,
        closingCash: null,
        expectedCash: null,
        actualCash: null,
        cashVariance: null,
        openedAt: new Date().toISOString(),
        closedAt: null,
        notes: null,
      },
      activeOutletId: 9,
    });

    mockCreatePosSessionCashMovement.mockResolvedValueOnce({
      id: 55,
      outletId: 9,
      posSessionId: 301,
      direction: "out",
      amount: 20000,
      category: "iuran",
      notes: null,
      createdByUserId: 1,
      occurredAt: new Date().toISOString(),
      clientLocalRef: null,
      journalId: 12,
    });

    await usePosSessionStore.getState().addCashMovement({
      sessionId: 301,
      direction: "out",
      amount: 20000,
      category: "iuran",
    });

    expect(mockCreatePosSessionCashMovement).toHaveBeenCalled();
    expect(usePosSessionStore.getState().cashMovements[0]?.amount).toBe(20000);
  });
});
