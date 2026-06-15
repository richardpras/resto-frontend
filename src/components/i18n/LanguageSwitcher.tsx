import { useTranslation } from "react-i18next";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { applyAppLocale, normalizeAppLocale, type AppLocale } from "@/i18n";
import { ApiHttpError, getApiAccessToken } from "@/lib/api-integration/client";
import { patchMerchantSettings } from "@/lib/api-integration/settingsDomainEndpoints";
import { useSettingsStore } from "@/stores/settingsStore";
import { toast } from "sonner";

type LanguageSwitcherProps = {
  variant?: "header" | "login";
};

export function LanguageSwitcher({ variant = "header" }: LanguageSwitcherProps) {
  const { t, i18n } = useTranslation("common");
  const merchant = useSettingsStore((s) => s.merchant);
  const updateMerchant = useSettingsStore((s) => s.updateMerchant);

  const currentLocale = normalizeAppLocale(i18n.language);

  const handleChange = (value: string) => {
    const locale = normalizeAppLocale(value) as AppLocale;
    applyAppLocale(locale);

    const nextMerchant = { ...merchant, language: locale };
    updateMerchant(nextMerchant);

    if (!getApiAccessToken()) return;

    void patchMerchantSettings(nextMerchant)
      .then((saved) => {
        updateMerchant(saved);
      })
      .catch((e) => {
        toast.error(e instanceof ApiHttpError ? e.message : t("settings.merchant.saveFailed"));
      });
  };

  return (
    <Select value={currentLocale} onValueChange={handleChange}>
      <SelectTrigger
        className={variant === "header" ? "h-9 w-[140px] text-xs" : "h-9 w-full max-w-[180px] text-xs"}
        aria-label={t("language.label")}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="en">{t("language.en")}</SelectItem>
        <SelectItem value="id">{t("language.id")}</SelectItem>
      </SelectContent>
    </Select>
  );
}
