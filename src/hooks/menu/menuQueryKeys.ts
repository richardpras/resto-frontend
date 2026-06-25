import { executiveQueryKeys } from "@/hooks/executive/executiveQueryKeys";

export const menuQueryKeys = {
  intelligenceBundle: (outletId: number, fromDate: string, toDate: string) =>
    ["menu-intelligence-bundle", outletId, fromDate, toDate] as const,
  summary: (outletId: number) => executiveQueryKeys.menuDashboardSummary(outletId),
  engineeringMatrix: (outletId: number, fromDate: string, toDate: string) =>
    ["menu-engineering-matrix", outletId, fromDate, toDate] as const,
  snapshots: (outletId: number) => ["menu-dashboard-snapshots", outletId] as const,
};
