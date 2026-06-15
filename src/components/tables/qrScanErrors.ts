import type { TFunction } from "i18next";

export type QrScanErrorCode = "qr_not_found" | "qr_expired" | "table_unavailable" | "outlet_unavailable";

export function qrScanErrorTitle(code: QrScanErrorCode, t: TFunction): string {
  const key = `qrCustomer.scanErrors.${code}.title`;
  const translated = t(key);
  if (translated !== key) return translated;
  return t("qrCustomer.scanErrors.default.title");
}

export function qrScanErrorMessage(code: QrScanErrorCode, t: TFunction): string {
  const key = `qrCustomer.scanErrors.${code}.message`;
  const translated = t(key);
  if (translated !== key) return translated;
  return t("qrCustomer.scanErrors.default.message");
}
