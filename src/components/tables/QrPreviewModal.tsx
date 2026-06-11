import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  fetchTableQrImageBlob,
  type FloorTableApi,
  getTableQrDetail,
  type TableQrDetailApi,
} from "@/lib/api-integration/tableEndpoints";
import { QrPrintTemplate } from "@/components/tables/QrPrintTemplate";

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
    if (!table) return;
    try {
      const blob = await fetchTableQrImageBlob(table.id);
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

  const handlePrint = () => {
    if (!table || !imageUrl) return;
    const printWindow = window.open("", "_blank", "noopener,noreferrer,width=480,height=720");
    if (!printWindow) {
      toast.error("Pop-up blocked. Allow pop-ups to print QR.");
      return;
    }
    printWindow.document.write(`
      <html><head><title>Print QR ${table.name}</title>
      <style>body{font-family:sans-serif;padding:16px;} @media print { body { margin: 0; } }</style>
      </head><body>
      <div style="text-align:center;border:1px solid #ccc;border-radius:8px;padding:16px;max-width:320px;margin:0 auto;">
        <div style="font-weight:700;font-size:14px;">Restaurant</div>
        <div style="font-size:12px;color:#555;margin-bottom:8px;">${outletName ?? "Outlet"}</div>
        <div style="font-size:22px;font-weight:800;margin-bottom:12px;">${table.name}</div>
        <img src="${imageUrl}" alt="QR" style="width:180px;height:180px;object-fit:contain;" />
        <div style="font-size:12px;margin-top:12px;">Scan to order from your table</div>
        <div style="font-size:10px;color:#666;margin-top:8px;word-break:break-all;">${detail?.qrUrl ?? table.qrUrl ?? ""}</div>
      </div>
      <script>window.onload = () => { window.print(); window.onafterprint = () => window.close(); };</script>
      </body></html>
    `);
    printWindow.document.close();
  };

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
            {imageUrl ? (
              <div className="flex justify-center">
                <QrPrintTemplate table={table} qrImageSrc={imageUrl} outletName={outletName ?? undefined} />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">QR image unavailable. Configure Customer App URL and generate QR.</p>
            )}
            <p className="text-xs break-all text-muted-foreground">{detail.qrUrl ?? "No URL"}</p>
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
