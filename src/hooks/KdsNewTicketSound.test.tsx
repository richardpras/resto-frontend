// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useKitchenTicketSounds } from "./useKitchenTicketSounds";
import type { KitchenTicket } from "@/domain/kitchenAdapters";

const playSpy = vi.fn().mockResolvedValue(true);

vi.mock("@/lib/sound/soundAlertService", () => ({
  soundAlertService: {
    play: (...args: unknown[]) => playSpy(...args),
  },
}));

const baseTicket: KitchenTicket = {
  id: "t1",
  outletId: 1,
  orderId: "1",
  ticketNo: "K-1",
  status: "queued",
  items: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("KdsNewTicketSound", () => {
  beforeEach(() => {
    playSpy.mockClear();
  });

  it("does not play on initial ticket load", () => {
    const { rerender } = renderHook(
      ({ tickets, source }) => useKitchenTicketSounds(tickets, source, true),
      {
        initialProps: {
          tickets: [baseTicket] as KitchenTicket[],
          source: "fetch" as const,
        },
      },
    );
    rerender({ tickets: [baseTicket], source: "fetch" });
    expect(playSpy).not.toHaveBeenCalled();
  });

  it("plays when a new queued ticket arrives via realtime", () => {
    const { rerender } = renderHook(
      ({ tickets, source }) => useKitchenTicketSounds(tickets, source, true),
      {
        initialProps: {
          tickets: [baseTicket] as KitchenTicket[],
          source: "fetch" as const,
        },
      },
    );
    playSpy.mockClear();

    rerender({
      tickets: [baseTicket, { ...baseTicket, id: "t2", ticketNo: "K-2" }],
      source: "realtime" as const,
    });
    expect(playSpy).toHaveBeenCalledWith("kitchen_ticket", expect.objectContaining({ visualFallback: true }));
  });

  it("ignores mutation updates", () => {
    const { rerender } = renderHook(
      ({ tickets, source }) => useKitchenTicketSounds(tickets, source, true),
      {
        initialProps: {
          tickets: [baseTicket] as KitchenTicket[],
          source: "fetch" as const,
        },
      },
    );
    playSpy.mockClear();

    rerender({
      tickets: [baseTicket, { ...baseTicket, id: "t2" }],
      source: "mutation" as const,
    });
    expect(playSpy).not.toHaveBeenCalled();
  });
});
