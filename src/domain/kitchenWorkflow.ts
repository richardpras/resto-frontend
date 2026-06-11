import type { KitchenTicket, KitchenTicketStatus } from "@/domain/kitchenAdapters";
import { kdsUrgencyFromMinutes, sanitizeElapsedMinutes, type KdsUrgency } from "@/domain/kdsUrgency";

export type KitchenBoardColumnId = "new" | "cooking" | "ready";

export type KitchenBoardColumn = {
  id: KitchenBoardColumnId;
  title: string;
  status: Extract<KitchenTicketStatus, "queued" | "in_progress" | "ready">;
  actionLabel: string;
  nextStatus: "in_progress" | "ready" | "served";
  badgeClass: string;
};

export const KITCHEN_BOARD_COLUMNS: KitchenBoardColumn[] = [
  {
    id: "new",
    title: "NEW",
    status: "queued",
    actionLabel: "Start Cooking",
    nextStatus: "in_progress",
    badgeClass: "bg-warning/10 text-warning border-warning/20",
  },
  {
    id: "cooking",
    title: "COOKING",
    status: "in_progress",
    actionLabel: "Ready",
    nextStatus: "ready",
    badgeClass: "bg-info/10 text-info border-info/20",
  },
  {
    id: "ready",
    title: "READY",
    status: "ready",
    actionLabel: "Completed",
    nextStatus: "served",
    badgeClass: "bg-success/10 text-success border-success/20",
  },
];

export type ElapsedUrgency = KdsUrgency;

export function groupTicketsByBoardColumn(tickets: KitchenTicket[]): Record<KitchenBoardColumnId, KitchenTicket[]> {
  const grouped: Record<KitchenBoardColumnId, KitchenTicket[]> = {
    new: [],
    cooking: [],
    ready: [],
  };

  for (const ticket of tickets) {
    if (ticket.status === "queued") grouped.new.push(ticket);
    else if (ticket.status === "in_progress") grouped.cooking.push(ticket);
    else if (ticket.status === "ready") grouped.ready.push(ticket);
  }

  const byQueuedAt = (a: KitchenTicket, b: KitchenTicket) => {
    const aTime = (a.queuedAt ?? a.createdAt).getTime();
    const bTime = (b.queuedAt ?? b.createdAt).getTime();
    return aTime - bTime;
  };

  grouped.new.sort(byQueuedAt);
  grouped.cooking.sort(byQueuedAt);
  grouped.ready.sort(byQueuedAt);

  return grouped;
}

export function ticketElapsedReferenceDate(ticket: KitchenTicket): Date {
  return ticket.queuedAt ?? ticket.createdAt;
}

export function elapsedMinutesSince(date: Date, nowMs: number = Date.now()): number {
  const time = date.getTime();
  if (Number.isNaN(time)) return 0;
  const diff = nowMs - time;
  if (diff < 0) return 0;
  const minutes = Math.floor(diff / 60000);
  const safe = sanitizeElapsedMinutes(minutes);
  return safe ?? 0;
}

export function elapsedUrgency(minutes: number): ElapsedUrgency {
  return kdsUrgencyFromMinutes(minutes);
}

export function formatElapsedClock(date: Date, nowMs: number = Date.now()): string {
  const diff = Math.max(0, Math.floor((nowMs - date.getTime()) / 1000));
  const m = Math.floor(diff / 60);
  const s = diff % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function formatServiceModeLabel(mode: string | null | undefined): string {
  if (!mode) return "—";
  return mode
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function boardActiveTicketCount(tickets: KitchenTicket[]): number {
  return tickets.filter((t) => t.status === "queued" || t.status === "in_progress" || t.status === "ready").length;
}

export function elapsedBorderClass(urgency: ElapsedUrgency): string {
  if (urgency === "critical") return "border-destructive/40";
  if (urgency === "warning") return "border-amber-500/40";
  return "border-border/50";
}

export function elapsedHeaderClass(urgency: ElapsedUrgency): string {
  if (urgency === "critical") return "bg-destructive/5";
  if (urgency === "warning") return "bg-amber-500/5";
  return "bg-muted/30";
}

export function elapsedTimeClass(urgency: ElapsedUrgency): string {
  if (urgency === "critical") return "text-destructive";
  if (urgency === "warning") return "text-amber-700 dark:text-amber-200";
  return "text-muted-foreground";
}

export function readyTicketCardClass(isReady: boolean): string {
  if (!isReady) return "border pos-shadow-md";
  return "border-2 border-success/50 pos-shadow-md shadow-md shadow-success/10 ring-1 ring-success/20";
}

export function readyColumnBadgeClass(isReady: boolean, baseClass: string): string {
  if (!isReady) return baseClass;
  return `${baseClass} font-bold ring-1 ring-success/30`;
}

export function hasItemNotes(notes: string | null | undefined): boolean {
  return typeof notes === "string" && notes.trim() !== "";
}
