import { useCallback, useEffect, useMemo, useState } from "react";
import type { KitchenTicket, KitchenTicketStation } from "@/domain/kitchenAdapters";

export type KdsStationId = "all" | string;

export type KdsStationOption = {
  id: KdsStationId;
  code: string;
  label: string;
};

export const KDS_SELECTED_STATION_STORAGE_KEY = "kds.selectedStationCode";
export const KDS_STATION_OPTIONS_STORAGE_KEY = "kds.stationOptions";

export const ALL_KDS_STATION_OPTION: KdsStationOption = {
  id: "all",
  code: "all",
  label: "All",
};

function stationKey(station: KitchenTicketStation): string {
  return station.code.trim().toLowerCase();
}

function isStationOption(value: unknown): value is KdsStationOption {
  if (!value || typeof value !== "object") return false;
  const row = value as KdsStationOption;
  return typeof row.id === "string" && typeof row.code === "string" && typeof row.label === "string";
}

function readPersistedStation(): KdsStationId {
  try {
    const raw = localStorage.getItem(KDS_SELECTED_STATION_STORAGE_KEY);
    if (!raw || raw.trim() === "" || raw === "all") return "all";
    return raw.trim().toLowerCase();
  } catch {
    return "all";
  }
}

function readPersistedStationOptions(): KdsStationOption[] {
  try {
    const raw = localStorage.getItem(KDS_STATION_OPTIONS_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isStationOption);
  } catch {
    return [];
  }
}

function persistStation(station: KdsStationId): void {
  try {
    localStorage.setItem(KDS_SELECTED_STATION_STORAGE_KEY, station);
  } catch {
    // Ignore storage failures (private mode, quota).
  }
}

function persistStationOptions(options: KdsStationOption[]): void {
  if (options.length === 0) return;
  try {
    localStorage.setItem(KDS_STATION_OPTIONS_STORAGE_KEY, JSON.stringify(options));
  } catch {
    // Ignore storage failures.
  }
}

function optionsEqual(a: KdsStationOption[], b: KdsStationOption[]): boolean {
  return a.length === b.length
    && a.every((option, index) => {
      const next = b[index];
      return next !== undefined
        && option.id === next.id
        && option.code === next.code
        && option.label === next.label;
    });
}

export function deriveKdsStationOptions(tickets: KitchenTicket[]): KdsStationOption[] {
  const byCode = new Map<string, KdsStationOption>();

  for (const ticket of tickets) {
    const station = ticket.station;
    if (!station || station.code.trim() === "") continue;
    const code = stationKey(station);
    if (!byCode.has(code)) {
      byCode.set(code, {
        id: code,
        code,
        label: station.name?.trim() || station.code,
      });
    }
  }

  const stations = Array.from(byCode.values()).sort((a, b) => a.label.localeCompare(b.label));
  if (stations.length === 0) return [];

  return [ALL_KDS_STATION_OPTION, ...stations];
}

export function countDistinctKdsStations(options: KdsStationOption[]): number {
  return options.filter((option) => option.id !== "all").length;
}

export function useKdsStationFilter(tickets: KitchenTicket[]) {
  const [station, setStationState] = useState<KdsStationId>(() => readPersistedStation());
  const [knownStations, setKnownStations] = useState<KdsStationOption[]>(() => readPersistedStationOptions());

  useEffect(() => {
    if (station !== "all") return;
    const derived = deriveKdsStationOptions(tickets);
    if (derived.length === 0) return;

    setKnownStations((current) => {
      if (optionsEqual(current, derived)) return current;
      persistStationOptions(derived);
      return derived;
    });
  }, [tickets, station]);

  const availableStations = useMemo(() => knownStations, [knownStations]);

  useEffect(() => {
    if (station === "all") return;
    const validIds = new Set(availableStations.map((option) => option.id));
    if (validIds.has(station)) return;

    setStationState("all");
    persistStation("all");
  }, [station, availableStations]);

  const setStation = useCallback((next: KdsStationId) => {
    const normalized = next === "all" ? "all" : next.trim().toLowerCase();
    setStationState(normalized);
    persistStation(normalized);
  }, []);

  const activeStation = availableStations.length === 0 ? "all" : station;
  const stationCodeForApi = activeStation === "all" ? undefined : activeStation;
  const showStationBadges = activeStation === "all";
  const distinctStationCount = countDistinctKdsStations(availableStations);

  return {
    availableStations,
    station: activeStation,
    setStation,
    stationCodeForApi,
    showStationBadges,
    stationSelectorVisible: distinctStationCount >= 2,
    filteredTickets: tickets,
  };
}
