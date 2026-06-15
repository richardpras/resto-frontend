import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import enCommon from "./locales/en/common.json";
import idCommon from "./locales/id/common.json";
import enOps from "./locales/en/ops.json";
import idOps from "./locales/id/ops.json";
import enErp from "./locales/en/erp.json";
import idErp from "./locales/id/erp.json";
import { normalizeAppLocale, resolveInitialLocale, type AppLocale } from "./localeResolver";

export { normalizeAppLocale, resolveInitialLocale, SUPPORTED_APP_LOCALES, type AppLocale } from "./localeResolver";

export const I18N_NAMESPACE = "common";
export const OPS_NAMESPACE = "ops";
export const ERP_NAMESPACE = "erp";

void i18n.use(initReactI18next).init({
  resources: {
    en: { common: enCommon, ops: enOps, erp: enErp },
    id: { common: idCommon, ops: idOps, erp: idErp },
  },
  lng: resolveInitialLocale(),
  fallbackLng: "en",
  supportedLngs: ["en", "id"],
  defaultNS: I18N_NAMESPACE,
  ns: [I18N_NAMESPACE, OPS_NAMESPACE, ERP_NAMESPACE],
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
});

export function applyAppLocale(locale: AppLocale): void {
  const normalized = normalizeAppLocale(locale);
  if (i18n.language !== normalized) {
    void i18n.changeLanguage(normalized);
  }
}

export default i18n;
