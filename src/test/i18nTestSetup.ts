import i18n from "@/i18n";

export async function ensureEnglishLocale(): Promise<void> {
  await i18n.changeLanguage("en");
}
