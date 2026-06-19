import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { applyAppLocale } from "@/i18n";
import { resolveGuestLocale, writeGuestLocaleToStorage } from "@/i18n/localeResolver";

export function useGuestLocaleBootstrap(): void {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const locale = resolveGuestLocale(searchParams);
    applyAppLocale(locale);
    if (searchParams.get("lang")?.trim()) {
      writeGuestLocaleToStorage(locale);
    }
  }, [searchParams]);
}

export function GuestLocaleBootstrap() {
  useGuestLocaleBootstrap();
  return null;
}
