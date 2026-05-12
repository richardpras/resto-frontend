import { useState } from "react";
import { AlertTriangle, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { ORDER_RECOVERY_PRESETS } from "@/domain/orderRecoveryPresets";
import type { Order, OrderItem } from "@/stores/orderStore";
import { useOrderStore } from "@/stores/orderStore";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

function lineTotal(it: OrderItem): number {
  return (Number(it.price) || 0) * (Number(it.qty) || 0);
}

function recomputeOrderTotals(items: OrderItem[], priorTax: number): { subtotal: number; tax: number; total: number } {
  const subtotal = Math.round(items.reduce((s, it) => s + lineTotal(it), 0) * 100) / 100;
  const tax = Math.round((priorTax || 0) * 100) / 100;
  const total = Math.round((subtotal + tax) * 100) / 100;
  return { subtotal, tax, total };
}

export function PosOrderRecoveryPanel({ order }: { order: Order | null }) {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canReport = hasPermission("orders.recovery.request");
  const recoverySubmitting = useOrderStore((s) => s.recoverySubmitting);
  const reportRecovery = useOrderStore((s) => s.reportOrderItemRecoveryRemote);
  const updateOrderRemote = useOrderStore((s) => s.updateOrderRemote);

  const [dialog, setDialog] = useState<{
    mode: "preset" | "custom" | "escalation";
    escalation?: "partial_refund" | "store_credit";
    orderItemId?: string;
    itemName?: string;
  } | null>(null);
  const [customReason, setCustomReason] = useState("");
  const [approvalNotes, setApprovalNotes] = useState("");

  if (!order || !canReport) return null;

  const editable = order.paymentStatus === "unpaid" || order.paymentStatus === "partial";
  const paidLocked = order.paymentStatus === "paid";

  const openPreset = (orderItemId: string, itemName: string) => {
    setDialog({ mode: "preset", orderItemId, itemName });
    setCustomReason("");
    setApprovalNotes("");
  };

  const removeUnpaidLine = async (orderItemId: string) => {
    const remaining = order.items.filter((it) => String(it.orderItemId ?? it.id) !== String(orderItemId));
    if (remaining.length === order.items.length) {
      toast.error("Could not resolve line to remove");
      return;
    }
    const mapped = remaining.map((it) => ({
      id: it.id,
      name: it.name,
      price: it.price,
      qty: it.qty,
      emoji: it.emoji,
      notes: it.notes || undefined,
    }));
    const { subtotal, tax, total } = recomputeOrderTotals(remaining, order.tax);
    try {
      await updateOrderRemote(order.id, {
        items: mapped,
        subtotal,
        tax,
        total,
      });
      toast.success("Order updated");
    } catch {
      // orderStore surfaces error
    }
  };

  const submitPreset = async (targetStatus: string, hint?: string) => {
    if (!dialog?.orderItemId) return;
    try {
      await reportRecovery(order.id, dialog.orderItemId, targetStatus, hint ?? null);
      toast.success("Recovery recorded");
      setDialog(null);
    } catch {
      /* toast via store */
    }
  };

  const submitCustom = async () => {
    if (!dialog?.orderItemId) return;
    const t = customReason.trim();
    if (!t) {
      toast.error("Enter a reason");
      return;
    }
    try {
      await reportRecovery(order.id, dialog.orderItemId, "custom_reason", t);
      toast.success("Recovery recorded");
      setDialog(null);
    } catch {
      /* store error */
    }
  };

  const submitEscalation = async () => {
    if (!dialog?.orderItemId || !dialog.escalation) return;
    const tag =
      dialog.escalation === "partial_refund"
        ? "[escalation:partial_refund]"
        : "[escalation:store_credit]";
    const body = [tag, approvalNotes.trim()].filter(Boolean).join(" ");
    try {
      await reportRecovery(order.id, dialog.orderItemId, "recovery_pending", body);
      toast.success("Manager escalation sent");
      setDialog(null);
    } catch {
      /* store */
    }
  };

  return (
    <div className="rounded-xl border border-border/60 bg-muted/15 px-3 py-2 space-y-2" data-testid="pos-order-recovery-panel">
      <p className="text-[11px] font-semibold text-foreground flex items-center gap-1">
        <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
        Item recovery
      </p>
      <ul className="space-y-1.5 max-h-40 overflow-y-auto">
        {order.items.map((it) => {
          const oid = String(it.orderItemId ?? it.id);
          return (
            <li key={oid} className="flex items-start justify-between gap-2 text-[11px]">
              <div className="min-w-0">
                <p className="font-medium text-foreground truncate">{it.name}</p>
                {it.recoveryStatus ? (
                  <p className="text-[10px] text-amber-800 dark:text-amber-100" data-testid="pos-item-recovery-badge">
                    {String(it.recoveryStatus).replace(/_/g, " ")}
                    {it.recoveryReason ? ` · ${it.recoveryReason}` : ""}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <button
                  type="button"
                  className="p-1 rounded-md border border-border/60 text-muted-foreground hover:bg-muted"
                  disabled={recoverySubmitting}
                  aria-label="Recovery actions"
                  onClick={() => openPreset(oid, it.name)}
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </button>
                {editable && it.orderItemId ? (
                  <button
                    type="button"
                    className="text-[10px] text-destructive underline disabled:opacity-50"
                    disabled={recoverySubmitting}
                    onClick={() => void removeUnpaidLine(oid)}
                  >
                    Remove
                  </button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
      {paidLocked ? (
        <p className="text-[10px] text-muted-foreground">Paid orders: use recovery report / manager escalation only.</p>
      ) : null}

      <Dialog open={dialog !== null} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent className="max-w-md" data-testid="pos-recovery-dialog">
          <DialogHeader>
            <DialogTitle>
              {dialog?.mode === "escalation"
                ? dialog.escalation === "partial_refund"
                  ? "Request partial refund"
                  : "Request store credit"
                : "Report item issue"}
            </DialogTitle>
            {dialog?.itemName ? (
              <p className="text-xs text-muted-foreground pt-1">{dialog.itemName}</p>
            ) : null}
          </DialogHeader>
          {dialog?.mode === "preset" ? (
            <div className="grid gap-2">
              {ORDER_RECOVERY_PRESETS.map((p) => (
                <Button
                  key={p.label}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="justify-start h-auto py-2 text-left"
                  disabled={recoverySubmitting}
                  onClick={() => void submitPreset(p.targetStatus, p.hint)}
                >
                  {p.label}
                </Button>
              ))}
              <Button type="button" variant="secondary" size="sm" disabled={recoverySubmitting} onClick={() => setDialog((d) => (d ? { ...d, mode: "custom" } : d))}>
                Custom reason…
              </Button>
              {paidLocked ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={recoverySubmitting}
                    onClick={() => setDialog((d) => (d ? { ...d, mode: "escalation", escalation: "partial_refund" } : d))}
                  >
                    Request partial refund (manager)
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={recoverySubmitting}
                    onClick={() => setDialog((d) => (d ? { ...d, mode: "escalation", escalation: "store_credit" } : d))}
                  >
                    Request store credit fallback
                  </Button>
                </>
              ) : null}
            </div>
          ) : null}
          {dialog?.mode === "custom" ? (
            <div className="space-y-2">
              <Textarea rows={3} value={customReason} onChange={(e) => setCustomReason(e.target.value)} placeholder="Describe the issue" className="text-sm" />
              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setDialog((d) => (d ? { ...d, mode: "preset" } : d))}>
                  Back
                </Button>
                <Button type="button" size="sm" disabled={recoverySubmitting} onClick={() => void submitCustom()}>
                  Submit
                </Button>
              </DialogFooter>
            </div>
          ) : null}
          {dialog?.mode === "escalation" ? (
            <div className="space-y-2">
              <Textarea
                rows={2}
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                placeholder="Notes for manager (optional)"
                className="text-sm"
              />
              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setDialog((d) => (d ? { ...d, mode: "preset" } : d))}>
                  Back
                </Button>
                <Button type="button" size="sm" disabled={recoverySubmitting} onClick={() => void submitEscalation()}>
                  Submit escalation
                </Button>
              </DialogFooter>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
