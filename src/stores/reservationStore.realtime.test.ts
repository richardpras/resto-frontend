import { beforeEach, describe, expect, it, vi } from "vitest";
import { useReservationStore } from "./reservationStore";

const mockListReservations = vi.fn();
const mockAdapterConnect = vi.fn();
const mockAdapterSubscribe = vi.fn();
const mockAdapterOnConnectionStateChange = vi.fn();
let realtimeHandler: ((event: Record<string, unknown>) => void) | null = null;

vi.mock("@/lib/api-integration/reservationEndpoints", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api-integration/reservationEndpoints")>(
    "@/lib/api-integration/reservationEndpoints",
  );
  return {
    ...actual,
    listReservations: (...args: unknown[]) => mockListReservations(...args),
  };
});

vi.mock("@/domain/realtimeAdapter", async () => {
  const actual = await vi.importActual<typeof import("@/domain/realtimeAdapter")>("@/domain/realtimeAdapter");
  return {
    ...actual,
    getRealtimeAdapter: () => ({
      connect: () => mockAdapterConnect(),
      subscribe: (args: { onEvent: (event: Record<string, unknown>) => void }) => {
        realtimeHandler = args.onEvent;
        mockAdapterSubscribe(args);
        return () => {
          realtimeHandler = null;
        };
      },
      onConnectionStateChange: (listener: (state: "connected" | "disconnected") => void) => {
        listener("disconnected");
        mockAdapterOnConnectionStateChange(listener);
        return () => undefined;
      },
    }),
  };
});

describe("reservationStore realtime", () => {
  beforeEach(() => {
    mockListReservations.mockReset();
    mockAdapterConnect.mockReset();
    mockAdapterSubscribe.mockReset();
    mockAdapterOnConnectionStateChange.mockReset();
    realtimeHandler = null;
    useReservationStore.getState().resetAsync();
  });

  it("updates reservation list from realtime patch", () => {
    useReservationStore.setState({
      reservations: [
        {
          id: 10,
          outletId: 2,
          tableId: null,
          reservationCode: "RSV-10",
          customerName: "Ani",
          customerPhone: null,
          partySize: 2,
          reservationAt: "2026-06-03T18:00:00.000Z",
          checkedInAt: null,
          seatedAt: null,
          completedAt: null,
          cancelledAt: null,
          noShowAt: null,
          linkedOrderId: null,
          serviceStartedAt: null,
          status: "confirmed",
          createdAt: null,
          updatedAt: null,
        },
      ],
    });

    useReservationStore.getState().startPolling({ outletId: 2 }, 15000);
    expect(realtimeHandler).toBeTypeOf("function");

    realtimeHandler?.({
      channel: "reservation",
      sequence: 20,
      payload: {
        reservation_id: 10,
        outlet_id: 2,
        status: "checked_in",
        party_size: 2,
        reservation_at: "2026-06-03T18:00:00.000Z",
        allocated_table_ids: [7],
      },
    });

    expect(useReservationStore.getState().reservations[0]?.status).toBe("checked_in");
    expect(useReservationStore.getState().lastRealtimeSeq).toBe(20);
  });

  it("notifies table projection listeners", () => {
    const listener = vi.fn();
    useReservationStore.getState().acquireRealtime(3);
    const unsubscribe = useReservationStore.getState().subscribeTableProjection(listener);

    useReservationStore.getState().applyRealtimePatch({
      reservationId: 4,
      outletId: 3,
      allocatedTableIds: [8],
      status: "confirmed",
    });

    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    useReservationStore.getState().releaseRealtime();
  });
});
