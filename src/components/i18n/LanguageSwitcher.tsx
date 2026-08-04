import { useTranslation } from "react-i18next";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { applyAppLocale, normalizeAppLocale, writeGuestLocaleToStorage, type AppLocale } from "@/i18n";
import { ApiHttpError, getApiAccessToken } from "@/lib/api-integration/client";
import { patchMerchantSettings } from "@/lib/api-integration/settingsDomainEndpoints";
import { useSettingsStore } from "@/stores/settingsStore";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type LanguageSwitcherProps = {
  variant?: "header" | "login" | "guest" | "sidebar";
  mode?: "staff" | "guest";
};

const LOCALE_META: Record<AppLocale, { flag: string; code: string }> = {
  en: { flag: "🇬🇧", code: "EN" },
  id: { flag: "🇮🇩", code: "ID" },
};

export function LanguageSwitcher({ variant = "header", mode = "staff" }: LanguageSwitcherProps) {
  const { t, i18n } = useTranslation("common");
  const merchant = useSettingsStore((s) => s.merchant);
  const updateMerchant = useSettingsStore((s) => s.updateMerchant);

  const currentLocale = normalizeAppLocale(i18n.language) as AppLocale;
  const meta = LOCALE_META[currentLocale] ?? LOCALE_META.en;

  const handleChange = (value: string) => {
    const locale = normalizeAppLocale(value) as AppLocale;
    applyAppLocale(locale);

    if (mode === "guest") {
      writeGuestLocaleToStorage(locale);
      return;
    }

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

  const isCompact = variant === "header" || variant === "sidebar";

  const triggerClassName = cn(
    variant === "guest" && "h-8 w-[120px] text-xs",
    variant === "login" && "h-9 w-full max-w-[180px] text-xs",
    variant === "header" && "h-9 w-auto min-w-0 px-2 text-xs shrink-0 gap-1.5",
    variant === "sidebar" &&
      "h-8 w-auto min-w-0 px-2 text-xs shrink-0 gap-1 border-sidebar-border bg-sidebar-accent/40 text-sidebar-foreground hover:bg-sidebar-accent",
  );

  return (
    <Select value={currentLocale} onValueChange={handleChange}>
      <SelectTrigger className={triggerClassName} aria-label={t("language.label")}>
        {isCompact ? (
          <span className="inline-flex items-center gap-1.5">
            <span className="text-base leading-none" aria-hidden>
              {meta.flag}
            </span>
            <span className="font-medium tabular-nums tracking-wide">{meta.code}</span>
          </span>
        ) : (
          <SelectValue />
        )}
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="en">
          <span className="inline-flex items-center gap-2">
            <span aria-hidden>{LOCALE_META.en.flag}</span>
            {t("language.en")}
          </span>
        </SelectItem>
        <SelectItem value="id">
          <span className="inline-flex items-center gap-2">
            <span aria-hidden>{LOCALE_META.id.flag}</span>
            {t("language.id")}
          </span>
        </SelectItem>
      </SelectContent>
    </Select>
  );
}
