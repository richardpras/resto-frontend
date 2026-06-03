// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { KitchenConnectionStatus } from "@/components/kitchen/KitchenConnectionStatus";

describe("KitchenConnectionStatusTest", () => {
  it("shows Live when websocket is connected", () => {
    render(
      <KitchenConnectionStatus
        realtimeConnected
        pollingActive
        consecutiveFetchFailures={0}
        hasBlockingError={false}
      />,
    );
    const status = screen.getByTestId("kitchen-connection-status");
    expect(status).toHaveAttribute("data-connection-status", "live");
    expect(status).toHaveTextContent("Live");
  });

  it("shows Polling when websocket is off but polling runs", () => {
    render(
      <KitchenConnectionStatus
        realtimeConnected={false}
        pollingActive
        consecutiveFetchFailures={0}
        hasBlockingError={false}
      />,
    );
    expect(screen.getByTestId("kitchen-connection-status")).toHaveAttribute("data-connection-status", "polling");
    expect(screen.getByTestId("kitchen-connection-status")).toHaveTextContent("Polling");
  });

  it("shows Disconnected after repeated fetch failures", () => {
    render(
      <KitchenConnectionStatus
        realtimeConnected={false}
        pollingActive
        consecutiveFetchFailures={2}
        hasBlockingError
      />,
    );
    expect(screen.getByTestId("kitchen-connection-status")).toHaveAttribute("data-connection-status", "disconnected");
    expect(screen.getByTestId("kitchen-connection-status")).toHaveTextContent("Disconnected");
  });
});
