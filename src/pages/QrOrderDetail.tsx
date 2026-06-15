import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { useQrOrderPolling } from "@/hooks/useQrOrderPolling";
import { QrOrderDetailView } from "@/components/qr-order/QrOrderDetailView";
import {
  getCurrentTableToken,
  getOrderRequestId,
  getOrderTableContext,
  isAdditionalOrder,
} from "@/lib/qrOrderSession";
import { useQrOrderStore } from "@/stores/qrOrderStore";
import { useOpsTranslation } from "@/i18n/useOpsTranslation";

export default function QrOrderDetail() {
  const { t } = useOpsTranslation();
  const { orderCode } = useParams<{ orderCode: string }>();
  const { order, loading, error } = useQrOrderPolling(orderCode);
  const callCashier = useQrOrderStore((s) => s.callCashier);
  const isSubmitting = useQrOrderStore((s) => s.isSubmitting);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4" data-testid="qr-order-loading">
        <p className="text-sm text-muted-foreground">{t("qrCustomer.loadingOrder")}</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4" data-testid="qr-order-not-found">
        <div className="bg-card rounded-3xl p-8 max-w-sm w-full text-center shadow-lg border border-border">
          <p className="text-lg font-bold text-foreground mb-2">{t("qrCustomer.orderNotFound")}</p>
        </div>
      </div>
    );
  }

  const tableToken = order.tableQrPublicId ?? getCurrentTableToken();
  const backToMenuHref = tableToken ? `/qr/${encodeURIComponent(tableToken)}` : null;
  const requestId = getOrderRequestId(order.orderCode);
  const tableContext = getOrderTableContext(order.orderCode);

  const onCallCashier = async () => {
    if (!requestId || !tableContext) {
      toast.error(t("qrCustomer.callCashierDevice"));
      return;
    }
    try {
      await callCashier(requestId, {
        outletId: tableContext.outletId,
        tableId: tableContext.tableId,
      });
      toast.success(t("qrCustomer.callCashierOk"));
    } catch (callError) {
      toast.error(callError instanceof Error ? callError.message : t("qrCustomer.callCashierFailed"));
    }
  };

  return (
    <QrOrderDetailView
      order={order}
      isAdditionalOrder={tableToken ? isAdditionalOrder(tableToken, order.orderCode) : false}
      backToMenuHref={backToMenuHref}
      onCallCashier={requestId && tableContext ? onCallCashier : undefined}
      callCashierDisabled={isSubmitting}
      enableCallCashier={order.qrOrdering?.enableCallCashier !== false}
    />
  );
}
