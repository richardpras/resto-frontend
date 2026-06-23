import { useEffect, useMemo } from "react";
import { toast } from "sonner";
import { useErpTranslation } from "@/i18n/useErpTranslation";
import { formatApiErrorMessage } from "@/i18n/apiErrorMessage";
import { usePayrollStore } from "@/stores/payrollStore";

export type HrBootstrapKey = "employees" | "shifts";

const DEFAULT_KEYS: HrBootstrapKey[] = [];

/**
 * Loads payroll store slices needed by HR pages (employees + shift templates).
 */
export function useHrPayrollBootstrap(keys: HrBootstrapKey[] = DEFAULT_KEYS): void {
  const { t } = useErpTranslation();
  const refreshEmployeesFromApi = usePayrollStore((s) => s.refreshEmployeesFromApi);
  const refreshShiftsFromApi = usePayrollStore((s) => s.refreshShiftsFromApi);

  const refreshByKey = useMemo(
    () => ({
      employees: refreshEmployeesFromApi,
      shifts: refreshShiftsFromApi,
    }),
    [refreshEmployeesFromApi, refreshShiftsFromApi],
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
