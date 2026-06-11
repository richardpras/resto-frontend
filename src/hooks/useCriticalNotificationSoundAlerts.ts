import { useEffect, useRef } from "react";
import { collectNewIds, initializeKnownIds, markIdsKnown } from "@/lib/sound/soundEventDetectors";
import { soundAlertService } from "@/lib/sound/soundAlertService";
import { useNotificationStore } from "@/stores/notificationStore";

export function useCriticalNotificationSoundAlerts(active: boolean): void {
  const preview = useNotificationStore((s) => s.preview);
  const loading = useNotificationStore((s) => s.loading);
  const knownIdsRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!active) return;

    const criticalIds = preview
      .filter((n) => n.severity === "critical" && !n.isRead)
      .map((n) => String(n.id));

    if (!initializedRef.current && !loading) {
      initializeKnownIds(criticalIds, knownIdsRef.current);
      initializedRef.current = true;
      return;
    }

    if (!initializedRef.current) return;

    const newIds = collectNewIds({
      currentIds: criticalIds,
      knownIds: knownIdsRef.current,
      hasInitialized: initializedRef.current,
    });

    if (newIds.length === 0) return;

    markIdsKnown(newIds, knownIdsRef.current);
    const first = preview.find((n) => String(n.id) === newIds[0]);
    void soundAlertService.play("critical_alert", {
      detail: first?.title ? `Critical: ${first.title}` : undefined,
      visualFallback: true,
    });
  }, [preview, loading, active]);
}
