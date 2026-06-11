import type { KitchenTicketApi, KitchenTicketStationApi } from "@/lib/api-integration/kitchenEndpoints";

export type KitchenTicketStation = {
  id: number | null;
  code: string;
  name: string;
};

export type KitchenTicketItem = {
  id: string;
  orderItemId: string;
  name: string;
  qty: number;
  notes: string;
  status: string;
  recoveryStatus?: string | null;
  recoveryReason?: string | null;
  station?: KitchenTicketStation | null;
};

export type KitchenTicket = {
  id: string;
  outletId: number;
  orderId: string;
  orderNumber?: string | null;
  orderCode?: string | null;
  tableNumber?: string | null;
  serviceMode?: string | null;
  ticketNo: string;
  status: "queued" | "in_progress" | "ready" | "served" | "cancelled";
  station?: KitchenTicketStation | null;
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

function mapStation(station: KitchenTicketStationApi | null | undefined): KitchenTicketStation | null {
  if (!station || typeof station.code !== "string" || station.code.trim() === "") {
    return null;
  }

  return {
    id: typeof station.id === "number" ? station.id : null,
    code: station.code,
    name: station.name ?? station.code,
  };
}

export function mapKitchenTicketApiToStore(ticket: KitchenTicketApi): KitchenTicket {
  return {
    id: String(ticket.id),
    outletId: Number(ticket.outletId),
    orderId: String(ticket.orderId),
    orderNumber: ticket.orderNumber ?? ticket.orderCode ?? null,
    orderCode: ticket.orderCode ?? ticket.orderNumber ?? null,
    tableNumber: ticket.tableNumber ?? null,
    serviceMode: ticket.serviceMode ?? null,
    ticketNo: ticket.ticketNo,
    status: ticket.status,
    station: mapStation(ticket.station),
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
      recoveryStatus: item.recoveryStatus ?? null,
      recoveryReason: item.recoveryReason ?? null,
      station: mapStation(item.station),
    })),
    createdAt: toDate(ticket.createdAt) ?? new Date(),
    updatedAt: toDate(ticket.updatedAt) ?? new Date(),
  };
}
