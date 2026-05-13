import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Clock3, RefreshCw, X } from "lucide-react";

type QrisPaymentModalProps = {
  open: boolean;
  qrString: string;
  amount: number;
  expirySeconds: number;
  status: "pending" | "paid" | "failed" | "expired" | "cancelled";
  orderLabel?: string;
  outletLabel?: string;
  isSubmitting?: boolean;
  error?: string | null;
  onRequestClose: () => void;
  onRetry: () => void;
  retryLabel?: string;
  onReconcile: () => void;
  onExpire: () => void;
  onChangePaymentMethod?: () => void;
  checkoutHint?: string | null;
  onSimulateSandboxPaid?: () => void;
  showSandboxSimulate?: boolean;
  onSimulateViaXendit?: () => void;
  showProviderSimulate?: boolean;
  providerSimulating?: boolean;
};

function formatRp(amount: number): string {
  return "Rp " + amount.toLocaleString("id-ID");
}

function qrPreviewUrl(qrString: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=360x360&data=${encodeURIComponent(qrString)}`;
}

export function QrisPaymentModal({
  open,
  qrString,
  amount,
  expirySeconds,
  status,
  orderLabel,
  outletLabel,
  isSubmitting = false,
  error,
  onRequestClose,
  onRetry,
  retryLabel = "Retry QRIS Payment",
  onReconcile,
  onExpire,
  onChangePaymentMethod,
  checkoutHint,
  onSimulateSandboxPaid,
  showSandboxSimulate = false,
  onSimulateViaXendit,
  showProviderSimulate = false,
  providerSimulating = false,
}: QrisPaymentModalProps) {
  const pending = status === "pending";
  const canCloseWithoutConfirm = status === "paid" || status === "failed" || status === "expired" || status === "cancelled";

  const handleClose = () => {
    if (!canCloseWithoutConfirm && !window.confirm("QR payment is still pending. Close this QR modal?")) return;
    onRequestClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] bg-foreground/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-card w-full max-w-md rounded-2xl p-4 sm:p-6 border border-border shadow-xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-foreground">Scan QRIS</h3>
                <p className="text-xs text-muted-foreground">
                  {orderLabel ? `Order ${orderLabel}` : "Order payment"}
                  {outletLabel ? ` · ${outletLabel}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="p-1 rounded-lg hover:bg-muted"
                aria-label="Close QR modal"
              >
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            <div className="mt-4 mb-3 text-center">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-2xl font-bold text-foreground">{formatRp(amount)}</p>
            </div>

            <div className="rounded-xl border border-border p-3 bg-background">
              {qrString ? (
                <img src={qrPreviewUrl(qrString)} alt="QRIS code" className="mx-auto h-64 w-64 rounded-md bg-white p-2" />
              ) : (
                <div className="h-64 w-64 mx-auto rounded-md bg-muted flex items-center justify-center text-xs text-muted-foreground">
                  QR string unavailable
                </div>
              )}
            </div>

            <div className="mt-3 text-xs space-y-1">
              <p className="text-muted-foreground">
                Status: <span className="font-semibold text-foreground">{status}</span>
              </p>
              <p className="text-muted-foreground flex items-center gap-1">
                <Clock3 className="h-3.5 w-3.5" />
                Expires in <span className="font-semibold text-foreground">{Math.max(0, expirySeconds)}s</span>
              </p>
            </div>

            {checkoutHint ? (
              <p className="mt-3 text-xs rounded-lg bg-muted px-2 py-1 text-muted-foreground">{checkoutHint}</p>
            ) : null}
            {pending && (
              <p className="mt-3 text-xs rounded-lg bg-amber-500/10 border border-amber-500/25 px-2 py-1 text-amber-700 dark:text-amber-200 flex items-center gap-1">
                <Clock3 className="h-3.5 w-3.5" /> Waiting for payment confirmation...
              </p>
            )}
            {status === "paid" && (
              <p className="mt-3 text-xs rounded-lg bg-success/10 border border-success/25 px-2 py-1 text-success flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> Payment confirmed. You can close this modal.
              </p>
            )}
            {(status === "failed" || status === "expired" || status === "cancelled") && (
              <p className="mt-3 text-xs rounded-lg bg-destructive/10 border border-destructive/25 px-2 py-1 text-destructive flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5" /> QR payment is no longer payable.
              </p>
            )}
            {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}

            <div className="mt-4 flex flex-wrap gap-2">
              {onChangePaymentMethod ? (
                <button
                  type="button"
                  onClick={onChangePaymentMethod}
                  disabled={isSubmitting}
                  className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs text-primary"
                >
                  Change payment method
                </button>
              ) : null}
              <button
                type="button"
                onClick={onRetry}
                disabled={isSubmitting}
                className="rounded-lg border border-border px-3 py-1.5 text-xs"
              >
                {retryLabel}
              </button>
              <button
                type="button"
                onClick={onReconcile}
                disabled={isSubmitting}
                className="rounded-lg border border-border px-3 py-1.5 text-xs inline-flex items-center gap-1"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Reconcile
              </button>
              <button
                type="button"
                onClick={onExpire}
                disabled={isSubmitting}
                className="rounded-lg border border-border px-3 py-1.5 text-xs"
              >
                Expire
              </button>
              {showSandboxSimulate && onSimulateSandboxPaid && (
                <button
                  type="button"
                  onClick={onSimulateSandboxPaid}
                  disabled={isSubmitting}
                  className="rounded-lg border border-amber-500/30 px-3 py-1.5 text-xs text-amber-700 dark:text-amber-300"
                >
                  Simulate Sandbox Payment
                </button>
              )}
              {showProviderSimulate && onSimulateViaXendit && (
                <button
                  type="button"
                  onClick={onSimulateViaXendit}
                  disabled={isSubmitting || providerSimulating}
                  className="rounded-lg border border-blue-500/30 px-3 py-1.5 text-xs text-blue-700 dark:text-blue-300"
                >
                  {providerSimulating ? "Simulating…" : "Simulate via Xendit"}
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

