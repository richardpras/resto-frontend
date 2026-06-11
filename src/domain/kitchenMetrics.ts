import type { KitchenTicket } from "@/domain/kitchenAdapters";
import { KDS_MAX_ELAPSED_MINUTES, sanitizeElapsedMinutes } from "@/domain/kdsUrgency";
import { ticketElapsedReferenceDate } from "@/domain/kitchenWorkflow";

export type KitchenDayMetrics = {
  completedToday: number;
  averageCookTimeMinutes: number | null;
  longestWaitingMinutes: number | null;
};

function isToday(iso: string | undefined, dayStart: Date, dayEnd: Date): boolean {
  if (!iso) return false;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return false;
  return parsed >= dayStart && parsed < dayEnd;
}

export function computeKitchenDayMetrics(tickets: KitchenTicket[], nowMs: number = Date.now()): KitchenDayMetrics {
  const dayStart = new Date(nowMs);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const servedToday = tickets.filter(
    (ticket) => ticket.status === "served" && isToday(ticket.servedAt?.toISOString(), dayStart, dayEnd),
  );

  const cookDurations = servedToday
    .map((ticket) => {
      if (!ticket.startedAt || !ticket.readyAt) return null;
      const minutes = Math.round((ticket.readyAt.getTime() - ticket.startedAt.getTime()) / 60000);
      const safe = sanitizeElapsedMinutes(minutes);
      return safe;
    })
    .filter((value): value is number => value !== null);

  const averageCookTimeMinutes =
    cookDurations.length > 0
      ? Math.round(cookDurations.reduce((sum, value) => sum + value, 0) / cookDurations.length)
      : null;

  const waitingTickets = tickets.filter((ticket) => ticket.status === "queued" || ticket.status === "in_progress");
  const waitingMinutes = waitingTickets
    .map((ticket) => {
      const ref = ticketElapsedReferenceDate(ticket);
      const rawMinutes = Math.floor((nowMs - ref.getTime()) / 60000);
      return sanitizeElapsedMinutes(rawMinutes);
    })
    .filter((value): value is number => value !== null);
  const longestWaitingMinutes = waitingMinutes.length > 0 ? Math.max(...waitingMinutes) : null;

  return {
    completedToday: servedToday.length,
    averageCookTimeMinutes,
    longestWaitingMinutes,
  };
}

export function formatKitchenMetricValue(value: number | null, suffix = ""): string {
  if (value === null) return "--";
  const safe = sanitizeElapsedMinutes(value);
  if (safe === null) return "--";
  if (safe > KDS_MAX_ELAPSED_MINUTES) return "--";
  return `${safe}${suffix}`;
}
