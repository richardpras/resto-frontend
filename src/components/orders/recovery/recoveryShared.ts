import type { OrderApi, OrderItemRecoveryEventApi } from "@/lib/api-integration/endpoints";

export function formatRp(n: number): string {
  return "Rp " + n.toLocaleString("id-ID");
}

export function formatWhen(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" });
}

export function recoveryStatusChipClass(status: string | null | undefined): string {
  const s = (status ?? "").toLowerCase();
  if (!s) return "bg-muted/40 text-muted-foreground border-border/60";
  if (s === "refunded" || s === "rejected") return "bg-destructive/10 text-destructive border-destructive/25";
  if (s === "recovery_pending" || s === "unavailable") return "bg-amber-500/15 text-amber-950 dark:text-amber-100 border-amber-500/30";
  if (s === "replaced" || s === "recovery_approved") return "bg-primary/10 text-primary border-primary/25";
  return "bg-muted/30 text-foreground border-border/60";
}

export function recoveryEventSummary(ev: OrderItemRecoveryEventApi): string {
  if (ev.eventCode === "recovery_settlement_recorded") {
    const p = ev.payload as Record<string, unknown> | null | undefined;
    const refund = typeof p?.partialRefundCapped === "number" ? p.partialRefundCapped : Number(p?.partialRefundCapped ?? 0);
    const credit = typeof p?.storeCreditAmount === "number" ? p.storeCreditAmount : Number(p?.storeCreditAmount ?? 0);
    const parts = [`Item #${ev.orderItemId}`, "settlement audit", `refund cap ${formatRp(refund)}`];
    if (credit > 0) parts.push(`store credit ${formatRp(credit)}`);
    return parts.join(" · ");
  }
  if (ev.eventCode === "refund_executed") {
    const p = ev.payload as Record<string, unknown> | null | undefined;
    const amount = typeof p?.amount === "number" ? p.amount : Number(p?.amount ?? 0);
    return `Item #${ev.orderItemId} · cash refund ${formatRp(amount)} executed`;
  }
  const parts: string[] = [`Item #${ev.orderItemId}`];
  if (ev.recoveryStatus) parts.push(String(ev.recoveryStatus).replace(/_/g, " "));
  if (ev.reason) parts.push(ev.reason);
  return parts.join(" · ");
}

export type PendingRecoveryLine = OrderApi["items"][number];

export const RECOVERY_RESOLUTION_OPTIONS: { value: string; labelKey: string; fallback: string }[] = [
  { value: "recovery_approved", labelKey: "managerRecovery.wizard.decide.approve", fallback: "Approve (recovery OK)" },
  { value: "refunded", labelKey: "managerRecovery.wizard.decide.refunded", fallback: "Mark refunded" },
  { value: "replaced", labelKey: "managerRecovery.wizard.decide.replaced", fallback: "Mark replaced" },
  { value: "clear", labelKey: "managerRecovery.wizard.decide.clear", fallback: "Clear / dismiss flag" },
];

export type WizardStep = "review" | "decide" | "settle" | "execute" | "done";

export function lineHasSettlementRecorded(events: OrderItemRecoveryEventApi[], orderItemId: string | number): boolean {
  const id = String(orderItemId);
  return events.some(
    (ev) => ev.eventCode === "recovery_settlement_recorded" && String(ev.orderItemId) === id,
  );
}

export function lineHasRefundExecuted(events: OrderItemRecoveryEventApi[], orderItemId: string | number): boolean {
  const id = String(orderItemId);
  return events.some((ev) => ev.eventCode === "refund_executed" && String(ev.orderItemId) === id);
}
