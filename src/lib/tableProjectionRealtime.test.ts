import { describe, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import {
  extractAffectedTableIds,
  patchTableRowsInCache,
  refreshAffectedTableProjection,
} from "@/lib/tableProjectionRealtime";

vi.mock("@/lib/api-integration/tableEndpoints", () => ({
  listFloorTables: vi.fn(async () => [
    {
      id: 7,
      outletId: 2,
      name: "T-7",
      capacity: 4,
      status: "active",
      tableOperationalStatus: "reserved",
      tableOperationalSignals: { hasReservation: true },
    },
    {
      id: 8,
      outletId: 2,
      name: "T-8",
      capacity: 2,
      status: "active",
      tableOperationalStatus: "available",
      tableOperationalSignals: { hasReservation: false },
    },
  ]),
}));

describe("tableProjectionRealtime", () => {
  it("extracts affected table ids from reservation payload", () => {
    expect(
      extractAffectedTableIds({
        table_id: 7,
        allocated_table_ids: [7, 9],
      }),
    ).toEqual([7, 9]);
  });

  it("patches only impacted rows in cached table list", () => {
    const previous = [
      {
        id: 7,
        outletId: 2,
        name: "T-7",
        capacity: 4,
        status: "active" as const,
        tableOperationalStatus: "available" as const,
        tableOperationalSignals: { hasReservation: false },
      },
      {
        id: 8,
        outletId: 2,
        name: "T-8",
        capacity: 2,
        status: "active" as const,
        tableOperationalStatus: "available" as const,
        tableOperationalSignals: { hasReservation: false },
      },
    ];
    const fresh = [
      {
        ...previous[0],
        tableOperationalStatus: "reserved" as const,
        tableOperationalSignals: { hasReservation: true },
      },
      previous[1],
    ];

    const patched = patchTableRowsInCache(previous, fresh, [7]);
    expect(patched?.[0]?.tableOperationalStatus).toBe("reserved");
    expect(patched?.[0]?.tableOperationalSignals?.hasReservation).toBe(true);
    expect(patched?.[1]?.tableOperationalStatus).toBe("available");
  });

  it("refreshes affected table projection in react-query cache", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["floor-tables", 2], [
      {
        id: 7,
        outletId: 2,
        name: "T-7",
        capacity: 4,
        status: "active",
        tableOperationalStatus: "available",
        tableOperationalSignals: { hasReservation: false },
      },
    ]);

    await refreshAffectedTableProjection(queryClient, 2, [7]);

    const cached = queryClient.getQueryData<Array<{ tableOperationalStatus: string }>>(["floor-tables", 2]);
    expect(cached?.[0]?.tableOperationalStatus).toBe("reserved");
  });
});
