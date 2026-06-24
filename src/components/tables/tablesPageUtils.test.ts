import { describe, expect, it } from "vitest";
import type { FloorTableApi } from "@/lib/api-integration/tableEndpoints";
import { filterTables } from "./tablesPageUtils";

function row(partial: Partial<FloorTableApi> & Pick<FloorTableApi, "id" | "name">): FloorTableApi {
  return {
    outletId: 1,
    capacity: 4,
    status: "active",
    tableOperationalStatus: "available",
    ...partial,
  };
}

describe("filterTables", () => {
  const rows = [
    row({ id: 1, name: "T01", tableOperationalStatus: "available" }),
    row({ id: 2, name: "T12", tableOperationalStatus: "occupied" }),
    row({ id: 3, name: "VIP-A", tableOperationalStatus: "reserved" }),
  ];

  it("filters by name case-insensitively", () => {
    expect(filterTables(rows, { searchQuery: "t12", statusFilter: "all" }).map((r) => r.id)).toEqual([2]);
    expect(filterTables(rows, { searchQuery: "vip", statusFilter: "all" }).map((r) => r.id)).toEqual([3]);
  });

  it("filters by operational status", () => {
    expect(filterTables(rows, { searchQuery: "", statusFilter: "occupied" }).map((r) => r.id)).toEqual([2]);
  });

  it("combines search and status filter", () => {
    const extended = [...rows, row({ id: 4, name: "T12B", tableOperationalStatus: "available" })];
    expect(
      filterTables(extended, { searchQuery: "t12", statusFilter: "occupied" }).map((r) => r.id),
    ).toEqual([2]);
  });

  it("returns all when filter is all and query empty", () => {
    expect(filterTables(rows, { searchQuery: "", statusFilter: "all" })).toHaveLength(3);
  });
});
