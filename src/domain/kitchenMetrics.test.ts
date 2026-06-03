import { describe, expect, it } from "vitest";
import { computeKitchenDayMetrics } from "./kitchenMetrics";
import type { KitchenTicket } from "@/domain/kitchenAdapters";

function ticket(partial: Partial<KitchenTicket> & Pick<KitchenTicket, "id" | "status">): KitchenTicket {
  return {
    outletId: 1,
    orderId: "1",
    ticketNo: "K-1",
    queuedAt: new Date("2026-06-03T08:00:00.000Z"),
    createdAt: new Date("2026-06-03T08:00:00.000Z"),
    updatedAt: new Date("2026-06-03T08:00:00.000Z"),
    items: [],
    ...partial,
  };
}

describe("kitchen day metrics", () => {
  const nowMs = new Date("2026-06-03T12:00:00.000Z").getTime();

  it("counts served today and average cook time", () => {
    const metrics = computeKitchenDayMetrics(
      [
        ticket({
          id: "s1",
          status: "served",
          servedAt: new Date("2026-06-03T11:00:00.000Z"),
          startedAt: new Date("2026-06-03T10:30:00.000Z"),
          readyAt: new Date("2026-06-03T10:50:00.000Z"),
        }),
      ],
      nowMs,
    );
    expect(metrics.completedToday).toBe(1);
    expect(metrics.averageCookTimeMinutes).toBe(20);
  });

  it("reports longest waiting among active tickets", () => {
    const metrics = computeKitchenDayMetrics(
      [
        ticket({
          id: "q1",
          status: "queued",
          queuedAt: new Date("2026-06-03T11:30:00.000Z"),
        }),
        ticket({
          id: "q2",
          status: "in_progress",
          queuedAt: new Date("2026-06-03T11:00:00.000Z"),
        }),
      ],
      nowMs,
    );
    expect(metrics.longestWaitingMinutes).toBe(60);
  });
});
