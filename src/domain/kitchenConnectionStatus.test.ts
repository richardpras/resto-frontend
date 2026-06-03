import { describe, expect, it } from "vitest";
import { deriveKitchenConnectionStatus } from "./kitchenConnectionStatus";

describe("KitchenConnectionStatusTest", () => {
  it("returns live when websocket is connected", () => {
    expect(
      deriveKitchenConnectionStatus({
        realtimeConnected: true,
        pollingActive: true,
        consecutiveFetchFailures: 0,
        hasBlockingError: false,
      }),
    ).toBe("live");
  });

  it("returns polling when websocket is off but polling runs", () => {
    expect(
      deriveKitchenConnectionStatus({
        realtimeConnected: false,
        pollingActive: true,
        consecutiveFetchFailures: 0,
        hasBlockingError: false,
      }),
    ).toBe("polling");
  });

  it("returns disconnected after repeated fetch failures", () => {
    expect(
      deriveKitchenConnectionStatus({
        realtimeConnected: false,
        pollingActive: true,
        consecutiveFetchFailures: 2,
        hasBlockingError: true,
      }),
    ).toBe("disconnected");
  });

  it("returns disconnected when polling stopped with blocking error", () => {
    expect(
      deriveKitchenConnectionStatus({
        realtimeConnected: false,
        pollingActive: false,
        consecutiveFetchFailures: 1,
        hasBlockingError: true,
      }),
    ).toBe("disconnected");
  });
});
