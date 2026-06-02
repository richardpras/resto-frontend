import { describe, expect, it, vi } from "vitest";
import { RealtimeAdapter } from "./realtimeAdapter";

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
});
