import { beforeEach, describe, expect, it, vi } from "vitest";
import { usePosSessionStore } from "./posSessionStore";

const mockOpenPosSession = vi.fn();
const mockClosePosSession = vi.fn();
const mockGetCurrentPosSession = vi.fn();
const mockGetPosSessionClosePreview = vi.fn();

vi.mock("@/lib/api-integration/posSessionEndpoints", () => ({
  openPosSession: (...args: unknown[]) => mockOpenPosSession(...args),
  closePosSession: (...args: unknown[]) => mockClosePosSession(...args),
  getCurrentPosSession: (...args: unknown[]) => mockGetCurrentPosSession(...args),
  getPosSessionClosePreview: (...args: unknown[]) => mockGetPosSessionClosePreview(...args),
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
});
