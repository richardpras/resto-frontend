import { useMemo } from "react";
import { mapAssignedOutletsToSettingsOutlets } from "@/domain/outletAdapters";
import type { Outlet } from "@/domain/settingsDomainTypes";
import { useAuthStore } from "@/stores/authStore";
import { useSettingsStore } from "@/stores/settingsStore";

/** Outlets for printer settings: prefer cached settings list, else `/me` assigned outlets (no extra fetch). */
export function usePrinterSettingsOutlets(): Outlet[] {
  const settingsOutlets = useSettingsStore((s) => s.outlets);
  const assignedOutlets = useAuthStore((s) => s.user?.assignedOutlets);

  return useMemo(() => {
    if (settingsOutlets.length > 0) return settingsOutlets;
    return mapAssignedOutletsToSettingsOutlets(assignedOutlets);
  }, [settingsOutlets, assignedOutlets]);
}
