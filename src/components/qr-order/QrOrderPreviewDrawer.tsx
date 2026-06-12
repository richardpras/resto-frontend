import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { fetchQrOrderPreview, type QrOrderPreview } from "@/lib/api-integration/qrOrderReviewEndpoints";
import { openQrOrderInPosFlow } from "@/components/qr-order/openQrOrderInPosFlow";
import { rejectQrOrder } from "@/lib/api-integration/qrOrderEndpoints";
import { useQrOrderPosBridgeStore } from "@/stores/qrOrderPosBridgeStore";
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
        if (!cancelled) toast.error("Could not load QR order preview");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, requestId]);

  const handleOpenInPos = async () => {
    if (!requestId) return;
    setOpening(true);
    try {
      await openQrOrderInPosFlow(requestId, { setFromOpenInPos, navigate });
      onOpenChange(false);
    } catch {
      toast.error("Could not open order in POS");
    } finally {
      setOpening(false);
    }
  };

  const handleCancel = async () => {
    if (!requestId) return;
    setCancelling(true);
    try {
      await rejectQrOrder(requestId, { reason: "Cancelled by cashier" });
      toast.success("QR order cancelled");
      onOpenChange(false);
      onCancelled?.();
    } catch {
      toast.error("Could not cancel QR order");
    } finally {
      setCancelling(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto" data-testid="qr-order-preview-drawer">
        <SheetHeader>
          <SheetTitle>Preview QR Order</SheetTitle>
          <SheetDescription>Read-only queue preview. Edit, promo, and payment happen in POS.</SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading...
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
                {preview.tableName ? `Table ${preview.tableName}` : "No table"}
                {preview.customerName ? ` • ${preview.customerName}` : ""}
              </p>
              {preview.createdAt && (
                <p className="text-xs text-muted-foreground">
                  Submitted {new Date(preview.createdAt).toLocaleString("id-ID")}
                </p>
              )}
              {(preview.customerNotes ?? []).length > 0 && (
                <div className="text-xs bg-muted/50 rounded-lg p-2">
                  <p className="font-medium text-foreground mb-1">Customer notes</p>
                  <ul className="list-disc pl-4 text-muted-foreground space-y-0.5">
                    {preview.customerNotes!.map((note) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">Items</p>
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
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatRp(preview.subtotal)}</span>
              </div>
              <div className="flex justify-between font-semibold text-foreground">
                <span>Total</span>
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
                Open In POS
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={opening || cancelling}
              >
                Close
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => void handleCancel()}
                disabled={opening || cancelling}
                data-testid="qr-order-cancel-button"
              >
                {cancelling ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <X className="h-4 w-4 mr-2" />}
                Cancel Order
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-8 text-center">No preview available.</p>
        )}
      </SheetContent>
    </Sheet>
  );
}
