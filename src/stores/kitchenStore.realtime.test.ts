import { beforeEach, describe, expect, it, vi } from "vitest";
import { useKitchenStore } from "./kitchenStore";

const mockListKitchenTickets = vi.fn();
const mockAdapterConnect = vi.fn();
const mockAdapterSubscribe = vi.fn();
const mockAdapterOnConnectionStateChange = vi.fn();
let realtimeHandler: ((event: Record<string, unknown>) => void) | null = null;

vi.mock("@/lib/api-integration/kitchenEndpoints", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api-integration/kitchenEndpoints")>(
    "@/lib/api-integration/kitchenEndpoints",
  );
  return {
    ...actual,
    listKitchenTickets: (...args: unknown[]) => mockListKitchenTickets(...args),
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

function buildSnapshotPayload(overrides: Record<string, unknown> = {}) {
  return {
    ticket_id: 5,
    ticketId: 5,
    id: 5,
    outlet_id: 2,
    outletId: 2,
    order_id: 99,
    orderId: 99,
    order_code: "ORD-99",
    orderCode: "ORD-99",
    order_number: "ORD-99",
    orderNumber: "ORD-99",
    table_number: "T-12",
    tableNumber: "T-12",
    service_mode: "dine_in",
    serviceMode: "dine_in",
    ticket_no: "KDS-2-99",
    ticketNo: "KDS-2-99",
    status: "in_progress",
    queued_at: "2026-06-03T10:00:00.000Z",
    queuedAt: "2026-06-03T10:00:00.000Z",
    started_at: "2026-06-03T10:05:00.000Z",
    startedAt: "2026-06-03T10:05:00.000Z",
    ready_at: null,
    readyAt: null,
    served_at: null,
    servedAt: null,
    created_at: "2026-06-03T10:00:00.000Z",
    createdAt: "2026-06-03T10:00:00.000Z",
    updated_at: "2026-06-03T10:05:00.000Z",
    updatedAt: "2026-06-03T10:05:00.000Z",
    items: [
      {
        id: 50,
        order_item_id: 500,
        orderItemId: 500,
        name: "Steak",
        qty: 2,
        notes: "Medium",
        status: "in_progress",
      },
    ],
    meta: {
      sequence: 1748949900,
      replay_key: "kitchen_ticket:5:in_progress",
    },
    ...overrides,
  };
}

describe("kitchenStore realtime", () => {
  beforeEach(() => {
    mockListKitchenTickets.mockReset();
    mockAdapterConnect.mockReset();
    mockAdapterSubscribe.mockReset();
    mockAdapterOnConnectionStateChange.mockReset();
    realtimeHandler = null;
    useKitchenStore.getState().resetAsync();
  });

  it("applies full ticket snapshot from realtime without list refresh", () => {
    useKitchenStore.setState({
      tickets: [
        {
          id: "5",
          outletId: 2,
          orderId: "99",
          ticketNo: "KDS-2-99",
          status: "queued",
          items: [{ id: "50", orderItemId: "500", name: "Steak", qty: 1, notes: "", status: "queued" }],
          createdAt: new Date("2026-06-03T10:00:00.000Z"),
          updatedAt: new Date("2026-06-03T10:00:00.000Z"),
        },
      ],
      lastListParams: { outletId: 2, perPage: 200 },
    });

    useKitchenStore.getState().startRealtime();
    expect(realtimeHandler).toBeTypeOf("function");
    expect(mockListKitchenTickets).not.toHaveBeenCalled();

    realtimeHandler?.({
      channel: "kitchen",
      sequence: 1748949900,
      payload: buildSnapshotPayload(),
    });

    const ticket = useKitchenStore.getState().tickets.find((row) => row.id === "5");
    expect(ticket?.status).toBe("in_progress");
    expect(ticket?.items[0]?.qty).toBe(2);
    expect(ticket?.items[0]?.notes).toBe("Medium");
    expect(useKitchenStore.getState().lastRealtimeSeq).toBe(1748949900);
    expect(mockListKitchenTickets).not.toHaveBeenCalled();
  });

  it("ignores stale realtime sequence", () => {
    useKitchenStore.setState({
      tickets: [
        {
          id: "5",
          outletId: 2,
          orderId: "99",
          ticketNo: "KDS-2-99",
          status: "ready",
          items: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      lastRealtimeSeq: 5000,
    });

    useKitchenStore.getState().startRealtime();
    realtimeHandler?.({
      channel: "kitchen",
      sequence: 100,
      payload: buildSnapshotPayload({ status: "queued" }),
    });

    expect(useKitchenStore.getState().tickets[0]?.status).toBe("ready");
  });

  it("moves ticket between workflow columns on realtime status change", () => {
    useKitchenStore.setState({
      tickets: [
        {
          id: "5",
          outletId: 2,
          orderId: "99",
          ticketNo: "KDS-2-99",
          status: "queued",
          items: [{ id: "50", orderItemId: "500", name: "Steak", qty: 1, notes: "", status: "queued" }],
          createdAt: new Date("2026-06-03T10:00:00.000Z"),
          updatedAt: new Date("2026-06-03T10:00:00.000Z"),
        },
      ],
      lastListParams: { outletId: 2, perPage: 200 },
    });

    useKitchenStore.getState().startRealtime();
    realtimeHandler?.({
      channel: "kitchen",
      sequence: 1748949900,
      payload: buildSnapshotPayload({ status: "in_progress", started_at: "2026-06-03T10:05:00.000Z", startedAt: "2026-06-03T10:05:00.000Z" }),
    });

    expect(useKitchenStore.getState().tickets[0]?.status).toBe("in_progress");
    expect(useKitchenStore.getState().lastTicketsUpdateSource).toBe("realtime");
  });
});
