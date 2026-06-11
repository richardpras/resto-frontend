import { useEffect, useRef, useState } from "react";
import type { KitchenTicket } from "@/domain/kitchenAdapters";

const HIGHLIGHT_MS = 2500;

export function useKdsNewTicketHighlights(
  tickets: KitchenTicket[],
  updateSource: "fetch" | "realtime" | "mutation" | null,
): ReadonlySet<string> {
  const knownIdsRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);
  const [highlightIds, setHighlightIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const activeIds = new Set(
      tickets
        .filter((t) => t.status === "queued" || t.status === "in_progress" || t.status === "ready")
        .map((t) => t.id),
    );

    if (!initializedRef.current) {
      knownIdsRef.current = activeIds;
      initializedRef.current = true;
      return;
    }

    if (updateSource !== "realtime" && updateSource !== "fetch") {
      knownIdsRef.current = activeIds;
      return;
    }

    const fresh = [...activeIds].filter((id) => !knownIdsRef.current.has(id));
    knownIdsRef.current = activeIds;

    if (fresh.length === 0) return;

    setHighlightIds(new Set(fresh));
    const timer = window.setTimeout(() => setHighlightIds(new Set()), HIGHLIGHT_MS);
    return () => window.clearTimeout(timer);
  }, [tickets, updateSource]);

  return highlightIds;
}
