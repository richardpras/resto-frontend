import { useEffect, useRef } from "react";
import type { KitchenTicket } from "@/domain/kitchenAdapters";
import {
  collectNewQueuedTicketIdsForSound,
  collectNewReadyTicketIdsForSound,
  markInitializedSoundBaseline,
  playKitchenNewTicketChime,
  playKitchenReadyChime,
  type TicketsUpdateSource,
} from "@/lib/kitchenNewTicketSound";

export function useKitchenTicketSounds(
  tickets: KitchenTicket[],
  source: TicketsUpdateSource | null,
  enabled: boolean,
): void {
  const queuedNotifiedRef = useRef<Set<string>>(new Set());
  const readyNotifiedRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    if (!initializedRef.current && tickets.length > 0) {
      markInitializedSoundBaseline(tickets, queuedNotifiedRef.current, readyNotifiedRef.current);
      initializedRef.current = true;
      return;
    }

    if (source === null) return;

    const newQueued = collectNewQueuedTicketIdsForSound({
      tickets,
      source,
      alreadyNotifiedIds: queuedNotifiedRef.current,
      hasInitialized: initializedRef.current,
    });
    if (newQueued.length > 0) {
      playKitchenNewTicketChime();
      for (const id of newQueued) {
        queuedNotifiedRef.current.add(id);
      }
    }

    const newReady = collectNewReadyTicketIdsForSound({
      tickets,
      source,
      alreadyReadyNotifiedIds: readyNotifiedRef.current,
      hasInitialized: initializedRef.current,
    });
    if (newReady.length > 0) {
      playKitchenReadyChime();
      for (const id of newReady) {
        readyNotifiedRef.current.add(id);
      }
    }
  }, [tickets, source, enabled]);
}
