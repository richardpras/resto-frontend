import { useTranslation } from "react-i18next";

/** ERP modules (accounting, payroll, purchases) with common + ops fallback. */
export function useErpTranslation() {
  return useTranslation(["erp", "common", "ops"]);
}
