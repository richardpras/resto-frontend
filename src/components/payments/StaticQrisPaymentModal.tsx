import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, X } from "lucide-react";

type StaticQrisPaymentModalProps = {
  open: boolean;
  imageUrl: string;
  amount: number;
  instructions?: string;
  orderLabel?: string;
  isSubmitting?: boolean;
  onRequestClose: () => void;
  onConfirmPaid: () => void;
  onChangePaymentMethod?: () => void;
};

function formatRp(amount: number): string {
  return "Rp " + amount.toLocaleString("id-ID");
}

export function StaticQrisPaymentModal({
  open,
  imageUrl,
  amount,
  instructions,
  orderLabel,
  isSubmitting = false,
  onRequestClose,
  onConfirmPaid,
  onChangePaymentMethod,
}: StaticQrisPaymentModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-paymentGateway bg-foreground/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4"
          onClick={onRequestClose}
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
                <h3 className="text-lg font-bold text-foreground">Scan QRIS (Outlet)</h3>
                <p className="text-xs text-muted-foreground">
                  {orderLabel ? `Order ${orderLabel}` : "Manual verification required"}
                </p>
              </div>
              <button type="button" onClick={onRequestClose} className="p-1 rounded-lg hover:bg-muted" aria-label="Close">
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            <div className="mt-4 mb-3 text-center">
              <p className="text-xs text-muted-foreground">Amount to collect</p>
              <p className="text-2xl font-bold text-foreground">{formatRp(amount)}</p>
            </div>

            <div className="rounded-xl border border-border p-3 bg-background min-h-[200px] flex items-center justify-center">
              {imageUrl ? (
                <img src={imageUrl} alt="Static QRIS" className="max-h-64 w-auto rounded-md object-contain" />
              ) : (
                <p className="text-xs text-muted-foreground text-center px-4">
                  No QR image uploaded for this outlet. Upload one in Settings → Outlet payment methods.
                </p>
              )}
            </div>

            {instructions ? (
              <p className="mt-3 text-xs rounded-lg bg-muted px-2 py-2 text-muted-foreground">{instructions}</p>
            ) : null}

            <p className="mt-3 text-xs rounded-lg bg-amber-500/10 border border-amber-500/25 px-2 py-1 text-amber-800 dark:text-amber-200">
              Customer cancelled or paid offline? Use Change payment method, or confirm only after you verify the transfer.
            </p>

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
                onClick={onConfirmPaid}
                disabled={isSubmitting}
                className="rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-xs inline-flex items-center gap-1"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                {isSubmitting ? "Confirming…" : "Confirm payment received"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
