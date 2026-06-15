import { useEffect } from "react";
import i18n, { applyAppLocale, normalizeAppLocale } from "@/i18n";
import { useAuthStore } from "@/stores/authStore";
import { useSettingsStore } from "@/stores/settingsStore";

export function useLocaleSync(): void {
  const user = useAuthStore((s) => s.user);
  const merchantLanguage = useSettingsStore((s) => s.merchant.language);
  const ensureSectionsLoaded = useSettingsStore((s) => s.ensureSectionsLoaded);

  useEffect(() => {
    if (!user) return;

    void ensureSectionsLoaded(["merchant"]).then(() => {
      const language = useSettingsStore.getState().merchant.language;
      applyAppLocale(normalizeAppLocale(language));
    });
  }, [user, ensureSectionsLoaded]);

  useEffect(() => {
    if (!user) return;
    applyAppLocale(normalizeAppLocale(merchantLanguage));
  }, [user, merchantLanguage]);
}

export function LocaleSync() {
  useLocaleSync();
  return null;
}
