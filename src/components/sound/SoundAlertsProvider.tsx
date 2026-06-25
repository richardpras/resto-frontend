import { useEffect } from "react";
import { PERMISSIONS, useAuthStore } from "@/stores/authStore";
import { useOutletStore } from "@/stores/outletStore";
import { useQrOrderStore } from "@/stores/qrOrderStore";
import { GLOBAL_QR_PENDING_POLL_MS } from "@/domain/qrOrderPolling";
import { useQrOrderSoundAlerts } from "@/hooks/useQrOrderSoundAlerts";
import { useCriticalNotificationSoundAlerts } from "@/hooks/useCriticalNotificationSoundAlerts";
import { useSoundAlertPreferences } from "@/hooks/useSoundAlertPreferences";
import { usePosRouteBackgroundDefer } from "@/hooks/usePosRouteBackgroundDefer";

/**
 * Global sound-alert listeners. Polls lightweight pending-summary, not full QR order lists.
 */
export function SoundAlertsProvider() {
  const prefs = useSoundAlertPreferences();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const activeOutletId = useOutletStore((s) => s.activeOutletId);
  const startSummaryPolling = useQrOrderStore((s) => s.startSummaryPolling);
  const stopSummaryPolling = useQrOrderStore((s) => s.stopSummaryPolling);

  const canMonitorOrders = hasPermission(PERMISSIONS.POS) || hasPermission(PERMISSIONS.QR_ORDERS);
  const userAuthenticated = useAuthStore((s) => Boolean(s.user));
  const locked = useAuthStore((s) => s.locked);
  const sessionRestoreStatus = useAuthStore((s) => s.sessionRestoreStatus);
  const backgroundDeferReady = usePosRouteBackgroundDefer();

  useEffect(() => {
    if (locked || sessionRestoreStatus === "pending") {
      stopSummaryPolling();
      return;
    }
    if (!backgroundDeferReady) return;
    if (!canMonitorOrders) {
      stopSummaryPolling();
      return;
    }
    if (typeof activeOutletId !== "number" || activeOutletId < 1) {
      stopSummaryPolling();
      return;
    }
    startSummaryPolling(activeOutletId, GLOBAL_QR_PENDING_POLL_MS);
    return () => stopSummaryPolling();
  }, [
    backgroundDeferReady,
    canMonitorOrders,
    activeOutletId,
    locked,
    sessionRestoreStatus,
    startSummaryPolling,
    stopSummaryPolling,
  ]);

  useQrOrderSoundAlerts(canMonitorOrders);
  useCriticalNotificationSoundAlerts(userAuthenticated && prefs.enabled);

  return null;
}
