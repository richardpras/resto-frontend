import { beforeEach, describe, expect, it, vi } from "vitest";
import { usePosSessionStore } from "./posSessionStore";

const mockOpenPosSession = vi.fn();
const mockClosePosSession = vi.fn();
const mockGetCurrentPosSession = vi.fn();

vi.mock("@/lib/api-integration/posSessionEndpoints", () => ({
  openPosSession: (...args: unknown[]) => mockOpenPosSession(...args),
  closePosSession: (...args: unknown[]) => mockClosePosSession(...args),
  getCurrentPosSession: (...args: unknown[]) => mockGetCurrentPosSession(...args),
}));

describe("posSessionStore async lifecycle", () => {
  beforeEach(() => {
    usePosSessionStore.getState().reset();
    mockOpenPosSession.mockReset();
    mockClosePosSession.mockReset();
    mockGetCurrentPosSession.mockReset();
  });

  it("tracks loading/submitting and sync timestamp", async () => {
    mockGetCurrentPosSession.mockResolvedValueOnce(null);
    await usePosSessionStore.getState().fetchCurrent(11);

    const state = usePosSessionStore.getState();
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
    expect(state.currentSession).toBeNull();
    expect(state.lastSyncAt).not.toBeNull();
  });

  it("opens session and rejects duplicate open by surfacing error", async () => {
    mockOpenPosSession.mockResolvedValueOnce({
      id: 101,
      outletId: 12,
      status: "open",
      openingCash: 200000,
      closingCash: null,
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

  it("closes current session and updates last sync", async () => {
    usePosSessionStore.setState({
      currentSession: {
        id: 201,
        outletId: 15,
        status: "open",
        openingCash: 100000,
        closingCash: null,
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
      cashVariance: -2000,
      openedAt: new Date().toISOString(),
      closedAt: new Date().toISOString(),
      notes: "End shift",
    });

    await usePosSessionStore.getState().close(201, 98000, "End shift");
    const state = usePosSessionStore.getState();
    expect(state.currentSession?.status).toBe("closed");
    expect(state.isSubmitting).toBe(false);
    expect(state.lastSyncAt).not.toBeNull();
  });
});
