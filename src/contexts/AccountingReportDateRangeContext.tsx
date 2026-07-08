import { createContext, useContext, type ReactNode } from "react";
import { useReportDateRange, type UseReportDateRangeResult } from "@/hooks/useReportDateRange";

const AccountingReportDateRangeContext = createContext<UseReportDateRangeResult | null>(null);

export function AccountingReportDateRangeProvider({ children }: { children: ReactNode }) {
  const range = useReportDateRange({ defaultPreset: "30d", syncUrl: true });
  return (
    <AccountingReportDateRangeContext.Provider value={range}>{children}</AccountingReportDateRangeContext.Provider>
  );
}

export function useAccountingReportDateRange(): UseReportDateRangeResult {
  const ctx = useContext(AccountingReportDateRangeContext);
  if (!ctx) {
    throw new Error("useAccountingReportDateRange must be used within AccountingReportDateRangeProvider");
  }
  return ctx;
}

export function useOptionalAccountingReportDateRange(): UseReportDateRangeResult | null {
  return useContext(AccountingReportDateRangeContext);
}
