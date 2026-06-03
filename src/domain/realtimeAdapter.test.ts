import { describe, expect, it, vi } from "vitest";
import {
  RealtimeAdapter,
  extractReservationId,
  normalizeReservationRealtimePayload,
} from "./realtimeAdapter";

class FakeWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = FakeWebSocket.CONNECTING;
  onopen: (() => void) | null = null;
  onmessage: ((evt: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: (() => void) | null = null;

  close() {
    this.readyState = FakeWebSocket.CLOSED;
    this.onclose?.();
  }

  emitOpen() {
    this.readyState = FakeWebSocket.OPEN;
    this.onopen?.();
  }

  emitMessage(data: unknown) {
    this.onmessage?.({ data: JSON.stringify(data) });
  }

  emitClose() {
    this.readyState = FakeWebSocket.CLOSED;
    this.onclose?.();
  }
}

describe("RealtimeAdapter", () => {
  it("subscribes and dispatches normalized events", () => {
    const ws = new FakeWebSocket();
    const adapter = new RealtimeAdapter({
      name: "payment",
      websocketUrl: "ws://example/ws",
      wsFactory: () => ws as unknown as WebSocket,
    });
    const handler = vi.fn();
    adapter.subscribe({ channel: "payment", onEvent: handler });
    adapter.connect();
    ws.emitOpen();
    ws.emitMessage({ channel: "payment", type: "updated", payload: { id: "tx-1" }, seq: 7 });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0]).toMatchObject({
      channel: "payment",
      event: "updated",
      seq: 7,
    });
  });

  it("normalizes outlet channel aliases and sequence from meta", () => {
    const ws = new FakeWebSocket();
    const adapter = new RealtimeAdapter({
      name: "qr",
      websocketUrl: "ws://example/ws",
      wsFactory: () => ws as unknown as WebSocket,
    });
    const handler = vi.fn();
    adapter.subscribe({ channel: "qr", onEvent: handler });
    adapter.connect();
    ws.emitOpen();
    ws.emitMessage({
      channel: "outlet.7.qr-orders",
      type: "qr.order.cashier.called",
      payload: { request_id: 10 },
      meta: { sequence: 33 },
    });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0]).toMatchObject({
      channel: "qr",
      sequence: 33,
      event: "qr.order.cashier.called",
    });
  });

  it("tracks connection state transitions and disconnect", () => {
    const ws = new FakeWebSocket();
    const adapter = new RealtimeAdapter({
      name: "order",
      websocketUrl: "ws://example/ws",
      wsFactory: () => ws as unknown as WebSocket,
    });
    const states: string[] = [];
    adapter.onConnectionStateChange((state) => states.push(state));
    adapter.connect();
    ws.emitOpen();
    adapter.disconnect();

    expect(states).toContain("connecting");
    expect(states).toContain("connected");
    expect(states[states.length - 1]).toBe("disconnected");
  });

  it("normalizes reservation channel alias and id fields", () => {
    const ws = new FakeWebSocket();
    const adapter = new RealtimeAdapter({
      name: "reservation",
      websocketUrl: "ws://example/ws",
      wsFactory: () => ws as unknown as WebSocket,
    });
    const handler = vi.fn();
    adapter.subscribe({ channel: "reservation", onEvent: handler });
    adapter.connect();
    ws.emitOpen();
    ws.emitMessage({
      channel: "outlet.3.reservations",
      type: "reservation.table.allocated",
      payload: { reservation_id: 42, outlet_id: 3, allocated_table_ids: [7] },
      meta: { sequence: 88 },
    });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0]).toMatchObject({
      channel: "reservation",
      sequence: 88,
      event: "reservation.table.allocated",
    });
  });
});

describe("reservation realtime normalization helpers", () => {
  it("extracts reservation id from snake_case and camelCase", () => {
    expect(extractReservationId({ reservation_id: 9 })).toBe(9);
    expect(extractReservationId({ reservationId: 11 })).toBe(11);
    expect(extractReservationId({ id: 15 })).toBe(15);
  });

  it("normalizes reservation payload fields", () => {
    expect(
      normalizeReservationRealtimePayload({
        reservation_id: 5,
        outlet_id: 2,
        status: "seated",
        party_size: 4,
        reservation_at: "2026-06-03T10:00:00.000Z",
        allocated_table_ids: [1, 2],
        linked_order_id: 99,
      }),
    ).toMatchObject({
      id: 5,
      outletId: 2,
      status: "seated",
      partySize: 4,
      allocatedTableIds: [1, 2],
      linkedOrderId: 99,
    });
  });
});
