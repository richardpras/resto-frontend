import { useEffect, useRef } from "react";
import { collectNewIds, initializeKnownIds, markIdsKnown } from "@/lib/sound/soundEventDetectors";
import { soundAlertService } from "@/lib/sound/soundAlertService";
import { useQrOrderStore } from "@/stores/qrOrderStore";

export function useQrOrderSoundAlerts(canMonitor: boolean): void {
  const requests = useQrOrderStore((s) => s.requests);
  const hasLoadedOnce = useQrOrderStore((s) => s.hasLoadedOnce);
  const knownIdsRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!canMonitor) return;

    const pendingIds = requests
      .filter((r) => r.status === "pending_cashier_confirmation")
      .map((r) => r.id);

    if (!initializedRef.current && hasLoadedOnce) {
      initializeKnownIds(pendingIds, knownIdsRef.current);
      initializedRef.current = true;
      return;
    }

    if (!initializedRef.current) return;

    const newIds = collectNewIds({
      currentIds: pendingIds,
      knownIds: knownIdsRef.current,
      hasInitialized: initializedRef.current,
    });

    if (newIds.length === 0) return;

    markIdsKnown(newIds, knownIdsRef.current);
    const label =
      newIds.length === 1
        ? requests.find((r) => r.id === newIds[0])?.requestCode
        : `${newIds.length} new orders`;
    void soundAlertService.play("new_order", {
      detail: label ? `New order received · ${label}` : undefined,
      visualFallback: true,
    });
  }, [requests, hasLoadedOnce, canMonitor]);
}
