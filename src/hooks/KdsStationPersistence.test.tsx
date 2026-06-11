// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import type { KitchenTicket } from "@/domain/kitchenAdapters";
import {
  ALL_KDS_STATION_OPTION,
  KDS_SELECTED_STATION_STORAGE_KEY,
  KDS_STATION_OPTIONS_STORAGE_KEY,
  useKdsStationFilter,
} from "@/hooks/useKdsStationFilter";

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

describe("KdsStationPersistence", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("persists selected station in localStorage", () => {
    const tickets = [ticket("1", "kitchen", "Kitchen"), ticket("2", "bar", "Bar")];
    const { result } = renderHook(() => useKdsStationFilter(tickets));

    act(() => {
      result.current.setStation("bar");
    });

    expect(localStorage.getItem(KDS_SELECTED_STATION_STORAGE_KEY)).toBe("bar");
    expect(result.current.station).toBe("bar");
  });

  it("restores persisted station on mount", () => {
    localStorage.setItem(KDS_SELECTED_STATION_STORAGE_KEY, "bar");
    localStorage.setItem(
      KDS_STATION_OPTIONS_STORAGE_KEY,
      JSON.stringify([
        ALL_KDS_STATION_OPTION,
        { id: "kitchen", code: "kitchen", label: "Kitchen" },
        { id: "bar", code: "bar", label: "Bar" },
      ]),
    );

    const { result } = renderHook(() =>
      useKdsStationFilter([ticket("1", "kitchen", "Kitchen"), ticket("2", "bar", "Bar")]),
    );

    expect(result.current.station).toBe("bar");
    expect(result.current.stationCodeForApi).toBe("bar");
  });

  it("falls back to all when persisted station is unavailable", () => {
    localStorage.setItem(KDS_SELECTED_STATION_STORAGE_KEY, "bakery");
    localStorage.setItem(
      KDS_STATION_OPTIONS_STORAGE_KEY,
      JSON.stringify([
        ALL_KDS_STATION_OPTION,
        { id: "kitchen", code: "kitchen", label: "Kitchen" },
        { id: "bar", code: "bar", label: "Bar" },
      ]),
    );

    const { result } = renderHook(() =>
      useKdsStationFilter([ticket("1", "kitchen", "Kitchen"), ticket("2", "bar", "Bar")]),
    );

    expect(result.current.station).toBe("all");
    expect(localStorage.getItem(KDS_SELECTED_STATION_STORAGE_KEY)).toBe("all");
  });
});
