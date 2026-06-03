import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { extractReservationId } from "@/domain/realtimeAdapter";
import { extractAffectedTableIds, refreshAffectedTableProjection } from "@/lib/tableProjectionRealtime";
import { useOutletStore } from "@/stores/outletStore";
import { useReservationStore } from "@/stores/reservationStore";

export function useReservationTableProjectionSync(): void {
  const queryClient = useQueryClient();
  const activeOutletId = useOutletStore((s) => s.activeOutletId);
  const acquireRealtime = useReservationStore((s) => s.acquireRealtime);
  const releaseRealtime = useReservationStore((s) => s.releaseRealtime);
  const subscribeTableProjection = useReservationStore((s) => s.subscribeTableProjection);

  useEffect(() => {
    if (typeof activeOutletId !== "number" || activeOutletId < 1) {
      return;
    }

    acquireRealtime(activeOutletId);
    const unsubscribe = subscribeTableProjection((payload) => {
      const outletRaw = payload.outletId ?? payload.outlet_id;
      const outletId = typeof outletRaw === "number" ? outletRaw : activeOutletId;
      if (outletId !== activeOutletId) return;
      void refreshAffectedTableProjection(queryClient, outletId, extractAffectedTableIds(payload));
    });

    return () => {
      unsubscribe();
      releaseRealtime();
    };
  }, [activeOutletId, acquireRealtime, releaseRealtime, subscribeTableProjection, queryClient]);
}

export function useReservationDetailRealtimeSync(selectedId: number | null): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (selectedId === null) return;

    const unsubscribe = useReservationStore.getState().subscribeTableProjection((payload) => {
      const reservationId = extractReservationId(payload);
      if (reservationId !== selectedId) return;
      void queryClient.invalidateQueries({ queryKey: ["reservation", selectedId] });
      void queryClient.invalidateQueries({ queryKey: ["reservation-allocations", selectedId] });
    });

    return unsubscribe;
  }, [queryClient, selectedId]);
}
