import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { exportTableQrPdf, type FloorTableApi } from "@/lib/api-integration/tableEndpoints";

type Props = {
  open: boolean;
  outletId: number;
  tables: FloorTableApi[];
  onOpenChange: (open: boolean) => void;
};

export function BulkQrPrintDialog({ open, outletId, tables, onOpenChange }: Props) {
  const [exporting, setExporting] = useState(false);

  const printable = tables.filter((t) => t.qrEnabled && t.qrStatus === "ready");

  const downloadPdf = async () => {
    if (printable.length === 0) {
      toast.error("No ready QR tables selected.");
      return;
    }
    setExporting(true);
    try {
      const blob = await exportTableQrPdf(
        outletId,
        printable.map((t) => t.id),
      );
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "table-qr-labels.pdf";
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success("QR PDF downloaded.");
      onOpenChange(false);
    } catch {
      toast.error("Failed to export QR PDF.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="bulk-qr-print-dialog">
        <DialogHeader>
          <DialogTitle>Print Selected QR</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Export {printable.length} ready table QR label{printable.length === 1 ? "" : "s"} as a PDF (2 per row).
        </p>
        <ul className="text-sm max-h-40 overflow-y-auto space-y-1">
          {printable.map((table) => (
            <li key={table.id}>• {table.name}</li>
          ))}
        </ul>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void downloadPdf()} disabled={exporting || printable.length === 0}>
            {exporting ? "Exporting…" : "Download PDF"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
