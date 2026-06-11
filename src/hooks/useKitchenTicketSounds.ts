import { useEffect, useRef } from "react";
import type { KitchenTicket } from "@/domain/kitchenAdapters";
import { collectNewIds, initializeKnownIds, markIdsKnown } from "@/lib/sound/soundEventDetectors";
import { soundAlertService } from "@/lib/sound/soundAlertService";
import type { TicketsUpdateSource } from "@/lib/kitchenNewTicketSound";

export function useKitchenTicketSounds(
  tickets: KitchenTicket[],
  source: TicketsUpdateSource | null,
  enabled: boolean,
): void {
  const knownQueuedRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    const queuedIds = tickets.filter((ticket) => ticket.status === "queued").map((ticket) => ticket.id);

    if (!initializedRef.current && tickets.length > 0) {
      initializeKnownIds(queuedIds, knownQueuedRef.current);
      initializedRef.current = true;
      return;
    }

    if (!initializedRef.current || source === null || source === "mutation") return;

    const newIds = collectNewIds({
      currentIds: queuedIds,
      knownIds: knownQueuedRef.current,
      hasInitialized: initializedRef.current,
    });

    if (newIds.length === 0) return;

    markIdsKnown(newIds, knownQueuedRef.current);
    void soundAlertService.play("kitchen_ticket", { visualFallback: true });
  }, [tickets, source, enabled]);
}
