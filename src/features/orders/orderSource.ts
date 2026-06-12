export type OrderSourceLink = {
  type: "direct_pos" | "qr_order" | "reservation" | string;
  label: string;
  code: string | null;
  id: number | null;
};

export type LinkedPosOrder = {
  id: number;
  orderNo: string;
  status: string;
  paymentStatus: string;
  total: number;
};

export function formatOrderSourceLabel(source: OrderSourceLink | null | undefined): string {
  if (!source) return "Direct POS";
  if (source.type === "qr_order" && source.code) {
    return `QR Order ${source.code}`;
  }
  return source.label;
}

export function orderSourceBadgeClass(type: string | undefined): string {
  if (type === "qr_order") return "bg-primary/10 text-primary border-primary/20";
  if (type === "reservation") return "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/20";
  return "bg-muted text-muted-foreground border-border";
}
