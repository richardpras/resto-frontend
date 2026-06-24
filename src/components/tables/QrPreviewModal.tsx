import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { QrPrintTemplate } from "@/components/tables/QrPrintTemplate";
import { useOpsTranslation } from "@/i18n/useOpsTranslation";
import {
  fetchTableQrImageBlob,
  type FloorTableApi,
  getTableQrDetail,
  type TableQrDetailApi,
} from "@/lib/api-integration/tableEndpoints";
import { captureElementAsPngBlob, printCapturedLabel } from "@/lib/qrLabelCapture";

type Props = {
  open: boolean;
  table: FloorTableApi | null;
  outletName?: string | null;
  onOpenChange: (open: boolean) => void;
  onRegenerate?: (table: FloorTableApi) => void;
};

function qrStatusLabel(status?: string): string {
  if (status === "ready") return "Ready";
  if (status === "invalid_url") return "Invalid URL";
  return "Missing URL";
}

export function QrPreviewModal({ open, table, outletName, onOpenChange, onRegenerate }: Props) {
  const { t } = useOpsTranslation();
  const labelRef = useRef<HTMLDivElement>(null);
  const [detail, setDetail] = useState<TableQrDetailApi | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !table) {
      setDetail(null);
      if (imageUrl) URL.revokeObjectURL(imageUrl);
      setImageUrl(null);
      return;
    }

    let active = true;
    setLoading(true);
    void getTableQrDetail(table.id)
      .then(async (payload) => {
        if (!active) return;
        setDetail(payload);
        if (payload.qrStatus !== "ready") return;
        const blob = await fetchTableQrImageBlob(table.id);
        if (!active) return;
        const url = URL.createObjectURL(blob);
        setImageUrl(url);
      })
      .catch(() => {
        if (active) toast.error("Failed to load QR preview.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [open, table]);

  useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [imageUrl]);

  const handleCopy = async () => {
    const url = detail?.qrUrl ?? table?.qrUrl;
    if (!url) {
      toast.error("No QR URL available.");
      return;
    }
    await navigator.clipboard.writeText(url);
    toast.success("QR URL copied.");
  };

  const handleDownload = async () => {
    if (!table || !labelRef.current) return;
    try {
      const blob = await captureElementAsPngBlob(labelRef.current);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `table-${table.name.replace(/\s+/g, "-")}-qr.png`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Failed to download QR PNG.");
    }
  };

  const handlePrint = async () => {
    if (!table || !imageUrl || !labelRef.current) return;
    try {
      await printCapturedLabel(labelRef.current, `Print QR ${table.name}`);
    } catch {
      toast.error(t("tables.printFailed"));
    }
  };

  const displayTable = table;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" data-testid="qr-preview-modal">
        <DialogHeader>
          <DialogTitle>{table ? `Table ${table.name}` : "QR Preview"}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading QR preview…</p>
        ) : table && detail ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">QR Status</span>
              <span className="font-medium">{qrStatusLabel(detail.qrStatus)}</span>
            </div>
            {detail.qrStatusReason ? (
              <p className="text-xs text-amber-700 dark:text-amber-300">{detail.qrStatusReason}</p>
            ) : null}
            {imageUrl && displayTable ? (
              <QrPrintTemplate
                ref={labelRef}
                table={displayTable}
                qrImageSrc={imageUrl}
                restaurantName={t("tables.printRestaurant")}
                outletName={outletName ?? "Outlet"}
                scanHint={t("tables.printScanHint")}
              />
            ) : (
              <p className="text-sm text-muted-foreground">QR image unavailable. Configure Customer App URL and generate QR.</p>
            )}
          </div>
        ) : null}

        <DialogFooter className="flex flex-wrap gap-2 sm:justify-start">
          <Button type="button" variant="outline" size="sm" onClick={() => void handleCopy()}>
            Copy URL
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => void handleDownload()} disabled={!imageUrl}>
            Download PNG
          </Button>
          <Button type="button" size="sm" onClick={handlePrint} disabled={!imageUrl}>
            Print
          </Button>
          {table && onRegenerate ? (
            <Button type="button" variant="secondary" size="sm" onClick={() => onRegenerate(table)}>
              Regenerate QR
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
