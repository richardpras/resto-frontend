export type KdsUrgency = "normal" | "warning" | "critical";

/** Maximum elapsed minutes treated as valid for display and metrics. */
export const KDS_MAX_ELAPSED_MINUTES = 24 * 60;

export function sanitizeElapsedMinutes(minutes: number): number | null {
  if (!Number.isFinite(minutes) || minutes < 0 || minutes > KDS_MAX_ELAPSED_MINUTES) {
    return null;
  }
  return Math.floor(minutes);
}

export function kdsUrgencyFromMinutes(minutes: number): KdsUrgency {
  const safe = sanitizeElapsedMinutes(minutes);
  if (safe === null) return "normal";
  if (safe >= 10) return "critical";
  if (safe >= 5) return "warning";
  return "normal";
}

/** Human-readable age for kitchen screens (e.g. "2 min", "15 min"). */
export function formatKdsOrderAge(minutes: number): string {
  const safe = sanitizeElapsedMinutes(minutes);
  if (safe === null) return "--";
  if (safe < 1) return "<1 min";
  if (safe === 1) return "1 min";
  return `${safe} min`;
}

export function kdsUrgencyBorderClass(urgency: KdsUrgency): string {
  if (urgency === "critical") return "border-red-500/70 ring-1 ring-red-500/30";
  if (urgency === "warning") return "border-amber-400/70 ring-1 ring-amber-400/25";
  return "border-kds-card-border";
}

export function kdsUrgencyBadgeClass(urgency: KdsUrgency): string {
  if (urgency === "critical") return "bg-red-500/20 text-red-200 border-red-500/40";
  if (urgency === "warning") return "bg-amber-500/20 text-amber-100 border-amber-500/40";
  return "bg-kds-muted text-kds-muted-fg border-kds-card-border";
}

export function kdsUrgencyTimerClass(urgency: KdsUrgency): string {
  if (urgency === "critical") return "text-red-300";
  if (urgency === "warning") return "text-amber-300";
  return "text-kds-muted-fg";
}

export function kdsUrgencyHeaderClass(urgency: KdsUrgency): string {
  if (urgency === "critical") return "bg-red-950/40";
  if (urgency === "warning") return "bg-amber-950/30";
  return "bg-kds-card/80";
}
