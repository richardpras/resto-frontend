import { useTranslation } from "react-i18next";

function isStandaloneDisplayMode(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  const nav = navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true;
}

export function PublicGuestStandaloneGuard({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation("common");

  if (isStandaloneDisplayMode()) {
    return (
      <div
        className="min-h-screen bg-background flex items-center justify-center p-6"
        data-testid="guest-standalone-block"
      >
        <div className="max-w-md text-center space-y-3">
          <h1 className="text-lg font-semibold text-foreground">{t("pwa.guestStandaloneTitle")}</h1>
          <p className="text-sm text-muted-foreground">{t("pwa.guestStandaloneBody")}</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
