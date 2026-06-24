import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

const DISMISS_KEY = "restohub-pwa-install-dismissed";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function StaffInstallPrompt() {
  const { t } = useTranslation("common");
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [hidden, setHidden] = useState(() => localStorage.getItem(DISMISS_KEY) === "1");
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  if (hidden || !deferredPrompt) {
    return null;
  }

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setHidden(true);
  };

  const onInstall = async () => {
    setInstalling(true);
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setHidden(true);
      }
    } finally {
      setInstalling(false);
      setDeferredPrompt(null);
    }
  };

  return (
    <div
      className="shrink-0 flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 border-b border-primary/20 bg-primary/5 text-sm"
      data-testid="staff-install-prompt"
      role="region"
      aria-label={t("pwa.installAria")}
    >
      <div className="flex items-center gap-2 min-w-0 text-foreground">
        <Download className="h-4 w-4 shrink-0 text-primary" aria-hidden />
        <p className="text-sm">{t("pwa.installMessage")}</p>
      </div>
      <div className="flex items-center gap-2">
        <Button type="button" size="sm" data-testid="staff-install-btn" disabled={installing} onClick={() => void onInstall()}>
          {installing ? t("pwa.installing") : t("pwa.install")}
        </Button>
        <Button type="button" size="sm" variant="ghost" data-testid="staff-install-dismiss" onClick={dismiss}>
          {t("pwa.notNow")}
        </Button>
        <button
          type="button"
          className="p-1 rounded-md hover:bg-muted text-muted-foreground"
          aria-label={t("pwa.dismissAria")}
          onClick={dismiss}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
