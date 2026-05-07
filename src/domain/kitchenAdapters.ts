import type { KitchenTicketApi } from "@/lib/api-integration/kitchenEndpoints";

export type KitchenTicketItem = {
  id: string;
  orderItemId: string;
  name: string;
  qty: number;
  notes: string;
  status: string;
};

export type KitchenTicket = {
  id: string;
  outletId: number;
  orderId: string;
  ticketNo: string;
  status: "queued" | "in_progress" | "ready" | "served" | "cancelled";
  queuedAt?: Date;
  startedAt?: Date;
  readyAt?: Date;
  servedAt?: Date;
  items: KitchenTicketItem[];
  createdAt: Date;
  updatedAt: Date;
};

function toDate(value: string | null | undefined): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function mapKitchenTicketApiToStore(ticket: KitchenTicketApi): KitchenTicket {
  return {
    id: String(ticket.id),
    outletId: Number(ticket.outletId),
    orderId: String(ticket.orderId),
    ticketNo: ticket.ticketNo,
    status: ticket.status,
    queuedAt: toDate(ticket.queuedAt),
    startedAt: toDate(ticket.startedAt),
    readyAt: toDate(ticket.readyAt),
    servedAt: toDate(ticket.servedAt),
    items: ticket.items.map((item) => ({
      id: String(item.id),
      orderItemId: String(item.orderItemId),
      name: item.name,
      qty: item.qty,
      notes: item.notes ?? "",
      status: item.status,
    })),
    createdAt: toDate(ticket.createdAt) ?? new Date(),
    updatedAt: toDate(ticket.updatedAt) ?? new Date(),
  };
}
