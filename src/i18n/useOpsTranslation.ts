import { useTranslation } from "react-i18next";

/** Operational modules (POS, KDS, QR, etc.) with common fallback. */
export function useOpsTranslation() {
  return useTranslation(["ops", "common"]);
}
