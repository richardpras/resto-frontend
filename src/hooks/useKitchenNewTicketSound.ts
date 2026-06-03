import { useEffect, useRef } from "react";
import type { KitchenTicket } from "@/domain/kitchenAdapters";
import {
  collectNewQueuedTicketIdsForSound,
  playKitchenNewTicketChime,
  type TicketsUpdateSource,
} from "@/lib/kitchenNewTicketSound";

export function useKitchenNewTicketSound(
  tickets: KitchenTicket[],
  source: TicketsUpdateSource | null,
  enabled: boolean,
): void {
  const notifiedIdsRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    if (!initializedRef.current && tickets.length > 0) {
      for (const ticket of tickets) {
        if (ticket.status === "queued") {
          notifiedIdsRef.current.add(ticket.id);
        }
      }
      initializedRef.current = true;
      return;
    }

    if (source === null) return;

    const newIds = collectNewQueuedTicketIdsForSound({
      tickets,
      source,
      alreadyNotifiedIds: notifiedIdsRef.current,
      hasInitialized: initializedRef.current,
    });

    if (newIds.length === 0) return;

    playKitchenNewTicketChime();
    for (const id of newIds) {
      notifiedIdsRef.current.add(id);
    }
  }, [tickets, source, enabled]);
}
