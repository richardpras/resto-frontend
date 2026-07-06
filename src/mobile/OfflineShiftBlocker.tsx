import { WifiOff, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

type Props = {
  onBootstrap: () => void;
  loading?: boolean;
};

export function OfflineShiftBlocker({ onBootstrap, loading }: Props) {
  const { t } = useTranslation("ops");

  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8 text-center min-h-[50vh]">
      <WifiOff className="h-12 w-12 text-amber-500" aria-hidden />
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          {t("mobile.offlineBlockerTitle", { defaultValue: "Offline shift not ready" })}
        </h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-md">
          {t("mobile.offlineBlockerBody", {
            defaultValue: "Connect to the internet once to download menu, tables, and payment settings for this outlet.",
          })}
        </p>
      </div>
      <Button type="button" onClick={onBootstrap} disabled={loading}>
        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
        {t("mobile.prepareOffline", { defaultValue: "Prepare offline data" })}
      </Button>
    </div>
  );
}
