// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import type { KitchenTicket } from "@/domain/kitchenAdapters";
import { deriveKdsStationOptions, useKdsStationFilter } from "@/hooks/useKdsStationFilter";

function ticket(id: string, code: string, name: string): KitchenTicket {
  return {
    id,
    outletId: 1,
    orderId: "10",
    ticketNo: `KDS-1-10-${code}`,
    status: "queued",
    station: { id: 1, code, name },
    items: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe("KdsStationFiltering", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("derives station options from tickets", () => {
    const options = deriveKdsStationOptions([
      ticket("1", "kitchen", "Kitchen"),
      ticket("2", "bar", "Bar"),
    ]);

    expect(options.map((opt) => opt.id)).toEqual(["all", "bar", "kitchen"]);
  });

  it("exposes station code for API filtering", () => {
    const { result } = renderHook(() =>
      useKdsStationFilter([ticket("1", "kitchen", "Kitchen"), ticket("2", "bar", "Bar")]),
    );

    expect(result.current.stationSelectorVisible).toBe(true);
    expect(result.current.stationCodeForApi).toBeUndefined();

    act(() => {
      result.current.setStation("bar");
    });
    expect(result.current.station).toBe("bar");
    expect(result.current.stationCodeForApi).toBe("bar");
    expect(result.current.showStationBadges).toBe(false);
  });

  it("hides selector when only one station exists", () => {
    const { result } = renderHook(() => useKdsStationFilter([ticket("1", "kitchen", "Kitchen")]));

    expect(result.current.stationSelectorVisible).toBe(false);
  });

  it("keeps legacy tickets without station safe", () => {
    const legacy: KitchenTicket = {
      id: "legacy",
      outletId: 1,
      orderId: "11",
      ticketNo: "KDS-1-11",
      status: "queued",
      station: null,
      items: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const { result } = renderHook(() => useKdsStationFilter([legacy]));

    expect(result.current.stationSelectorVisible).toBe(false);
    expect(result.current.filteredTickets).toHaveLength(1);
    expect(result.current.showStationBadges).toBe(true);
  });
});
