import { useEffect, useMemo } from "react";
import { toast } from "sonner";
import { useErpTranslation } from "@/i18n/useErpTranslation";
import { formatApiErrorMessage } from "@/i18n/apiErrorMessage";
import { usePayrollStore } from "@/stores/payrollStore";

export type HrBootstrapKey =
  | "employees"
  | "attendance"
  | "payrolls"
  | "overtime"
  | "adjustments"
  | "shifts"
  | "loans";

const DEFAULT_KEYS: HrBootstrapKey[] = [];

/**
 * Loads payroll store slices needed by HR/payroll pages (extracted from legacy Payroll shell).
 */
export function useHrPayrollBootstrap(keys: HrBootstrapKey[] = DEFAULT_KEYS): void {
  const { t } = useErpTranslation();
  const refreshEmployeesFromApi = usePayrollStore((s) => s.refreshEmployeesFromApi);
  const refreshAttendanceFromApi = usePayrollStore((s) => s.refreshAttendanceFromApi);
  const refreshPayrollsFromApi = usePayrollStore((s) => s.refreshPayrollsFromApi);
  const refreshOvertimeFromApi = usePayrollStore((s) => s.refreshOvertimeFromApi);
  const refreshAdjustmentsFromApi = usePayrollStore((s) => s.refreshAdjustmentsFromApi);
  const refreshShiftsFromApi = usePayrollStore((s) => s.refreshShiftsFromApi);
  const refreshLoansFromApi = usePayrollStore((s) => s.refreshLoansFromApi);

  const refreshByKey = useMemo(
    () => ({
      employees: refreshEmployeesFromApi,
      attendance: refreshAttendanceFromApi,
      payrolls: refreshPayrollsFromApi,
      overtime: refreshOvertimeFromApi,
      adjustments: refreshAdjustmentsFromApi,
      shifts: refreshShiftsFromApi,
      loans: refreshLoansFromApi,
    }),
    [
      refreshEmployeesFromApi,
      refreshAttendanceFromApi,
      refreshPayrollsFromApi,
      refreshOvertimeFromApi,
      refreshAdjustmentsFromApi,
      refreshShiftsFromApi,
      refreshLoansFromApi,
    ],
  );

  const keySignature = keys.join(",");

  useEffect(() => {
    if (keys.length === 0) return;
    const seen = new Set<HrBootstrapKey>();
    const tasks: Promise<void>[] = [];
    for (const key of keys) {
      if (seen.has(key)) continue;
      seen.add(key);
      tasks.push(refreshByKey[key]());
    }
    void Promise.all(tasks).catch((e) => {
      toast.error(formatApiErrorMessage(e, t) || t("payroll.loadFailed"));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refresh fns stable; keys serialized
  }, [keySignature, refreshByKey, t]);
}
