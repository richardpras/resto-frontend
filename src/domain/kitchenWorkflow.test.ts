import { describe, expect, it } from "vitest";
import {
  boardActiveTicketCount,
  elapsedUrgency,
  groupTicketsByBoardColumn,
  hasItemNotes,
  readyTicketCardClass,
} from "./kitchenWorkflow";
import type { KitchenTicket } from "./kitchenAdapters";

function ticket(partial: Partial<KitchenTicket> & Pick<KitchenTicket, "id" | "status">): KitchenTicket {
  return {
    id: partial.id,
    outletId: 2,
    orderId: "10",
    ticketNo: `KDS-${partial.id}`,
    status: partial.status,
    items: partial.items ?? [],
    createdAt: partial.createdAt ?? new Date("2026-06-03T10:00:00.000Z"),
    updatedAt: partial.updatedAt ?? new Date("2026-06-03T10:00:00.000Z"),
    queuedAt: partial.queuedAt,
    ...partial,
  };
}

describe("kitchenWorkflow", () => {
  it("groups tickets into NEW, COOKING, and READY columns", () => {
    const grouped = groupTicketsByBoardColumn([
      ticket({ id: "1", status: "ready" }),
      ticket({ id: "2", status: "queued" }),
      ticket({ id: "3", status: "in_progress" }),
      ticket({ id: "4", status: "served" }),
    ]);

    expect(grouped.new.map((t) => t.id)).toEqual(["2"]);
    expect(grouped.cooking.map((t) => t.id)).toEqual(["3"]);
    expect(grouped.ready.map((t) => t.id)).toEqual(["1"]);
  });

  it("classifies elapsed urgency thresholds", () => {
    expect(elapsedUrgency(5)).toBe("normal");
    expect(elapsedUrgency(10)).toBe("warning");
    expect(elapsedUrgency(20)).toBe("critical");
  });

  it("counts only board-active tickets", () => {
    expect(
      boardActiveTicketCount([
        ticket({ id: "1", status: "queued" }),
        ticket({ id: "2", status: "served" }),
        ticket({ id: "3", status: "ready" }),
      ]),
    ).toBe(2);
  });

  it("applies ready emphasis classes only for ready tickets", () => {
    expect(readyTicketCardClass(false)).toMatch(/border/);
    expect(readyTicketCardClass(true)).toMatch(/border-2/);
  });

  it("detects item notes for highlight", () => {
    expect(hasItemNotes("NO SPICY")).toBe(true);
    expect(hasItemNotes("  ")).toBe(false);
    expect(hasItemNotes(null)).toBe(false);
  });
});
