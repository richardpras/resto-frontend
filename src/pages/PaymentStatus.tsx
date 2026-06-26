import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { getPaymentTransactionIdFromSearchParams } from "@/domain/paymentAdapters";
import { usePaymentStore } from "@/stores/paymentStore";
import { canReconcilePayments } from "@/domain/permissionGates";
import { useAuthStore } from "@/stores/authStore";
import { PaymentStatusCardSkeleton } from "@/components/skeletons/payment/PaymentStatusCardSkeleton";
import { SkeletonBusyRegion } from "@/components/skeletons/SkeletonBusyRegion";
import { useOpsTranslation } from "@/i18n/useOpsTranslation";

export default function PaymentStatus() {
  const { t } = useOpsTranslation();
  const [searchParams] = useSearchParams();
  const transactionId = getPaymentTransactionIdFromSearchParams(searchParams);
  const tx = usePaymentStore((s) => s.currentTransaction);
  const isLoading = usePaymentStore((s) => s.isLoading);
  const isSubmitting = usePaymentStore((s) => s.isSubmitting);
  const error = usePaymentStore((s) => s.error);
  const paymentStatus = usePaymentStore((s) => s.paymentStatus);
  const checkoutUrl = usePaymentStore((s) => s.checkoutUrl);
  const qrString = usePaymentStore((s) => s.qrString);
  const deeplinkUrl = usePaymentStore((s) => s.deeplinkUrl);
  const lastSyncAt = usePaymentStore((s) => s.lastSyncAt);
  const expiryCountdown = usePaymentStore((s) => s.expiryCountdown);
  const pollTransactionStatus = usePaymentStore((s) => s.pollTransactionStatus);
  const retryPayment = usePaymentStore((s) => s.retryPayment);
  const reconcileTransaction = usePaymentStore((s) => s.reconcileTransaction);
  const expireTransaction = usePaymentStore((s) => s.expireTransaction);
  const stopPolling = usePaymentStore((s) => s.stopPolling);
  const user = useAuthStore((s) => s.user);
  const showReconcile = canReconcilePayments(user);

  useEffect(() => {
    if (!transactionId) return;
    pollTransactionStatus(transactionId);
    return () => stopPolling();
  }, [transactionId, pollTransactionStatus, stopPolling]);

  const status = paymentStatus ?? tx?.status ?? null;
  const statusTone =
    status === "paid"
      ? "bg-success/10 text-success"
      : status === "failed" || status === "expired"
        ? "bg-destructive/10 text-destructive"
        : "bg-muted text-muted-foreground";

  const statusMessage =
    status === "paid"
      ? t("paymentStatus.statusPaid")
      : status === "expired"
        ? t("paymentStatus.statusExpired")
        : status === "failed"
          ? t("paymentStatus.statusFailed")
          : status === "pending"
            ? t("paymentStatus.statusPending")
            : status === "cancelled"
              ? t("paymentStatus.statusCancelled")
              : null;

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-lg rounded-2xl border border-border bg-card p-5 space-y-3">
        <h1 className="text-lg font-bold text-foreground">{t("paymentStatus.pageTitle")}</h1>
        <p className="text-xs text-muted-foreground">{t("paymentStatus.transaction", { id: transactionId || "-" })}</p>
        <SkeletonBusyRegion busy={!!isLoading && !error} label={t("paymentStatus.loading")}>
          {isLoading && !error ? (
            <PaymentStatusCardSkeleton />
          ) : (
            <>
              {error && <p className="text-sm text-destructive">{error}</p>}
              {status && statusMessage && (
                <div className={`rounded-xl px-3 py-2 text-sm font-semibold ${statusTone}`}>
                  {statusMessage}
                </div>
              )}
              <div className="space-y-2 text-sm">
                <p>
                  {t("paymentStatus.statusLabel")} <span className="font-semibold">{status ?? "-"}</span>
                </p>
                <p>{t("paymentStatus.method")} {tx?.method ?? "-"}</p>
                <p>{t("paymentStatus.amount")} {tx?.amount ?? 0}</p>
                <p>{t("paymentStatus.expiresIn")} {expiryCountdown}s</p>
                {tx?.vaNumber && <p>{t("paymentStatus.vaNumber")} {tx.vaNumber}</p>}
                {checkoutUrl && (
                  <a className="text-primary underline block" href={checkoutUrl} target="_blank" rel="noreferrer">
                    {t("paymentStatus.openCheckout")}
                  </a>
                )}
                {deeplinkUrl && (
                  <a className="text-primary underline block" href={deeplinkUrl} target="_blank" rel="noreferrer">
                    {t("paymentStatus.openApp")}
                  </a>
                )}
                {qrString && (
                  <pre className="whitespace-pre-wrap break-all rounded bg-muted p-2 text-xs">{qrString}</pre>
                )}
                {status === "paid" && <p className="text-xs text-muted-foreground">{t("paymentStatus.refreshingOrder")}</p>}
                {lastSyncAt && <p className="text-xs text-muted-foreground">{t("paymentStatus.lastSynced", { at: lastSyncAt })}</p>}
              </div>
              <div className="flex gap-2 text-xs">
                <button
                  type="button"
                  className="rounded-lg border border-border px-2 py-1 disabled:opacity-50"
                  onClick={() => void retryPayment(transactionId)}
                  disabled={isSubmitting || !transactionId}
                >
                  {t("paymentStatus.retryPayment")}
                </button>
                {showReconcile ? (
                  <button
                    type="button"
                    className="rounded-lg border border-border px-2 py-1 disabled:opacity-50"
                    onClick={() => void reconcileTransaction(transactionId)}
                    disabled={isSubmitting || !transactionId}
                  >
                    {t("shared.reconcile")}
                  </button>
                ) : null}
                <button
                  type="button"
                  className="rounded-lg border border-border px-2 py-1 disabled:opacity-50"
                  onClick={() => void expireTransaction(transactionId)}
                  disabled={isSubmitting || !transactionId || status === "paid"}
                >
                  {t("shared.expire")}
                </button>
              </div>
            </>
          )}
        </SkeletonBusyRegion>
      </div>
    </div>
  );
}
