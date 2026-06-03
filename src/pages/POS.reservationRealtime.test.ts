import { describe, expect, it } from "vitest";
import { deriveRuntimeFloorTables, type Order } from "@/stores/orderStore";

describe("POS table selector reservation projection", () => {
  it("includes reserved tables and reservation signal labels", () => {
    const tables = deriveRuntimeFloorTables(
      [
        {
          id: 1,
          name: "A1",
          capacity: 4,
          status: "active",
          tableOperationalStatus: "reserved",
          tableOperationalSignals: { hasReservation: true },
        },
        {
          id: 2,
          name: "A2",
          capacity: 2,
          status: "active",
          tableOperationalStatus: "available",
          tableOperationalSignals: { hasReservation: false },
        },
      ],
      [] as Order[],
    );

    const selectable = tables.filter(
      (t) => t.status === "available" || t.status === "occupied" || t.status === "reserved",
    );

    expect(selectable).toHaveLength(2);
    expect(selectable.find((t) => t.id === "1")?.status).toBe("reserved");
    expect(selectable.find((t) => t.id === "1")?.signals?.hasReservation).toBe(true);
  });
});
