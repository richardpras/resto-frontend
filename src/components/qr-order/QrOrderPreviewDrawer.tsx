import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { fetchQrOrderPreview, type QrOrderPreview } from "@/lib/api-integration/qrOrderReviewEndpoints";
import { openQrOrderInPosFlow } from "@/components/qr-order/openQrOrderInPosFlow";
import { rejectQrOrder } from "@/lib/api-integration/qrOrderEndpoints";
import { useQrOrderPosBridgeStore } from "@/stores/qrOrderPosBridgeStore";
import { useOpsTranslation } from "@/i18n/useOpsTranslation";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

type Props = {
  requestId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCancelled?: () => void;
};

function formatRp(value: number): string {
  return `Rp ${value.toLocaleString("id-ID")}`;
}

export function QrOrderPreviewDrawer({ requestId, open, onOpenChange, onCancelled }: Props) {
  const { t } = useOpsTranslation();
  const navigate = useNavigate();
  const setFromOpenInPos = useQrOrderPosBridgeStore((s) => s.setFromOpenInPos);
  const [preview, setPreview] = useState<QrOrderPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [opening, setOpening] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!open || !requestId) {
      setPreview(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void fetchQrOrderPreview(requestId)
      .then((data) => {
        if (!cancelled) setPreview(data);
      })
      .catch(() => {
        if (!cancelled) toast.error(t("qrStaff.previewModal.loadFailed"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, requestId, t]);

  const handleOpenInPos = async () => {
    if (!requestId) return;
    setOpening(true);
    try {
      await openQrOrderInPosFlow(requestId, { setFromOpenInPos, navigate });
      onOpenChange(false);
    } catch {
      toast.error(t("qrStaff.previewModal.openFailed"));
    } finally {
      setOpening(false);
    }
  };

  const handleCancel = async () => {
    if (!requestId) return;
    setCancelling(true);
    try {
      await rejectQrOrder(requestId, { reason: t("qrStaff.previewModal.cancelReason") });
      toast.success(t("qrStaff.previewModal.cancelSuccess"));
      onOpenChange(false);
      onCancelled?.();
    } catch {
      toast.error(t("qrStaff.previewModal.cancelFailed"));
    } finally {
      setCancelling(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto" data-testid="qr-order-preview-drawer">
        <SheetHeader>
          <SheetTitle>{t("qrStaff.previewModal.title")}</SheetTitle>
          <SheetDescription>{t("qrStaff.previewModal.description")}</SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> {t("qrStaff.previewModal.loading")}
          </div>
        ) : preview ? (
          <div className="space-y-4 mt-4">
            <div className="rounded-xl border border-border p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground">{preview.requestCode}</span>
                <span className="text-xs px-2 py-1 rounded-lg bg-muted text-muted-foreground capitalize">
                  {preview.status.replaceAll("_", " ")}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {preview.tableName ? t("qrStaff.table", { name: preview.tableName }) : t("qrStaff.noTable")}
                {preview.customerName ? ` • ${preview.customerName}` : ""}
              </p>
              {preview.createdAt && (
                <p className="text-xs text-muted-foreground">
                  {t("qrStaff.previewModal.submitted", {
                    at: new Date(preview.createdAt).toLocaleString(),
                  })}
                </p>
              )}
              {(preview.customerNotes ?? []).length > 0 && (
                <div className="text-xs bg-muted/50 rounded-lg p-2">
                  <p className="font-medium text-foreground mb-1">{t("qrStaff.previewModal.customerNotes")}</p>
                  <ul className="list-disc pl-4 text-muted-foreground space-y-0.5">
                    {preview.customerNotes!.map((note) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">{t("qrStaff.previewModal.items")}</p>
              {preview.items.map((item) => (
                <div key={`${item.menuItemId}-${item.id ?? item.name}`} className="flex justify-between text-sm">
                  <span className="text-foreground">
                    {item.name} ×{item.qty}
                    {item.notes ? <span className="text-muted-foreground"> ({item.notes})</span> : null}
                  </span>
                  <span className="text-muted-foreground">{formatRp(item.lineTotal)}</span>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-border p-4 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("qrStaff.previewModal.subtotal")}</span>
                <span>{formatRp(preview.subtotal)}</span>
              </div>
              <div className="flex justify-between font-semibold text-foreground">
                <span>{t("qrStaff.previewModal.total")}</span>
                <span>{formatRp(preview.total)}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <Button
                type="button"
                onClick={() => void handleOpenInPos()}
                disabled={opening || cancelling}
                data-testid="qr-order-open-in-pos-button"
              >
                {opening ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {t("qrStaff.openInPos")}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={opening || cancelling}
              >
                {t("qrStaff.previewModal.close")}
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => void handleCancel()}
                disabled={opening || cancelling}
                data-testid="qr-order-cancel-button"
              >
                {cancelling ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <X className="h-4 w-4 mr-2" />}
                {t("qrStaff.previewModal.cancelOrder")}
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-8 text-center">{t("qrStaff.previewModal.noPreview")}</p>
        )}
      </SheetContent>
    </Sheet>
  );
}
