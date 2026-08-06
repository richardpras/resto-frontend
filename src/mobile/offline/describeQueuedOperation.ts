import type { QueuedOfflineOperation } from "@/lib/offline/offlineOperationQueue";

export type QueuedOperationSummary = {
  titleKey: string;
  titleDefault: string;
  detail: string;
  occurredAt: string | null;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function moneyHint(amount: unknown): string {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return "";
  return `Rp ${Math.round(n).toLocaleString("id-ID")}`;
}

/** Human-readable summary for a queued offline sync operation. */
export function describeQueuedOperation(op: QueuedOfflineOperation): QueuedOperationSummary {
  const payload = asRecord(op.payload);
  const occurredAt = op.clientOccurredAt ?? op.createdAt ?? null;

  if (op.operationType === "order.create") {
    const code = String(payload.code ?? payload.clientLocalRef ?? "").trim();
    const total = moneyHint(payload.total);
    const parts = [code || "Offline order", total].filter(Boolean);
    return {
      titleKey: "mobile.pendingOp.createOrder",
      titleDefault: "Create order",
      detail: parts.join(" · "),
      occurredAt,
    };
  }

  if (op.operationType === "order.add_payments") {
    const code = String(payload.localOrderCode ?? payload.orderId ?? "").trim();
    const payments = Array.isArray(payload.payments) ? payload.payments : [];
    const totalPaid = payments.reduce((sum, row) => sum + Number(asRecord(row).amount ?? 0), 0);
    const amount = moneyHint(totalPaid);
    const parts = [code ? `Order ${code}` : "Payment", amount].filter(Boolean);
    return {
      titleKey: "mobile.pendingOp.addPayments",
      titleDefault: "Record payment",
      detail: parts.join(" · "),
      occurredAt,
    };
  }

  if (op.operationType === "order.splits.sync") {
    const code = String(payload.localOrderCode ?? payload.orderId ?? "").trim();
    return {
      titleKey: "mobile.pendingOp.syncSplits",
      titleDefault: "Sync split bill",
      detail: code ? `Order ${code}` : "Split bill",
      occurredAt,
    };
  }

  if (op.operationType === "pos_session.cash_movement") {
    const direction = String(payload.direction ?? "");
    const amount = moneyHint(payload.amount);
    const category = String(payload.category ?? "").replace(/_/g, " ");
    const label = direction === "in" ? "Cash in" : direction === "out" ? "Cash out" : "Cash movement";
    return {
      titleKey: "mobile.pendingOp.cashMovement",
      titleDefault: label,
      detail: [amount, category].filter(Boolean).join(" · "),
      occurredAt,
    };
  }

  return {
    titleKey: "mobile.pendingOp.generic",
    titleDefault: op.operationType,
    detail: String(payload.code ?? payload.localOrderCode ?? op.fingerprint.slice(0, 8)),
    occurredAt,
  };
}
