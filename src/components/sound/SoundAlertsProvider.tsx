import { useEffect } from "react";
import { PERMISSIONS, useAuthStore } from "@/stores/authStore";
import { useOutletStore } from "@/stores/outletStore";
import { useQrOrderStore } from "@/stores/qrOrderStore";
import { useQrOrderSoundAlerts } from "@/hooks/useQrOrderSoundAlerts";
import { useCriticalNotificationSoundAlerts } from "@/hooks/useCriticalNotificationSoundAlerts";
import { useSoundAlertPreferences } from "@/hooks/useSoundAlertPreferences";

/**
 * Global sound-alert listeners. Does not change store or API behavior.
 */
export function SoundAlertsProvider() {
  const prefs = useSoundAlertPreferences();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const activeOutletId = useOutletStore((s) => s.activeOutletId);
  const startQrPolling = useQrOrderStore((s) => s.startPolling);
  const stopQrPolling = useQrOrderStore((s) => s.stopPolling);

  const canMonitorOrders = hasPermission(PERMISSIONS.POS) || hasPermission(PERMISSIONS.QR_ORDERS);
  const userAuthenticated = useAuthStore((s) => Boolean(s.user));

  useEffect(() => {
    if (!canMonitorOrders) {
      stopQrPolling();
      return;
    }
    if (typeof activeOutletId !== "number" || activeOutletId < 1) {
      stopQrPolling();
      return;
    }
    startQrPolling(
      { outletId: activeOutletId, status: "pending_cashier_confirmation", perPage: 100 },
      10_000,
    );
    return () => stopQrPolling();
  }, [canMonitorOrders, activeOutletId, startQrPolling, stopQrPolling]);

  useQrOrderSoundAlerts(canMonitorOrders);
  useCriticalNotificationSoundAlerts(userAuthenticated && prefs.enabled);

  return null;
}
