import { useEffect, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useOpsTranslation } from "@/i18n/useOpsTranslation";
import {
  fetchReservationDepositProofFile,
  type ReservationDepositProofFile,
} from "@/lib/api-integration/reservationEndpoints";

type Props = {
  open: boolean;
  reservationId: number | null;
  proofId: number | null;
  filename?: string | null;
  onOpenChange: (open: boolean) => void;
};

function isImageContentType(contentType: string, filename: string): boolean {
  if (contentType.startsWith("image/")) return true;
  return /\.(png|jpe?g|gif|webp|bmp|heic)$/i.test(filename);
}

function isPdfContentType(contentType: string, filename: string): boolean {
  if (contentType.includes("pdf")) return true;
  return /\.pdf$/i.test(filename);
}

export function ReservationDepositProofPreviewDialog({
  open,
  reservationId,
  proofId,
  filename,
  onOpenChange,
}: Props) {
  const { t } = useOpsTranslation();
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<ReservationDepositProofFile | null>(null);

  useEffect(() => {
    if (!open || reservationId == null || proofId == null) {
      setFile((prev) => {
        if (prev) URL.revokeObjectURL(prev.objectUrl);
        return null;
      });
      return;
    }

    let active = true;
    setLoading(true);
    setFile((prev) => {
      if (prev) URL.revokeObjectURL(prev.objectUrl);
      return null;
    });

    void fetchReservationDepositProofFile(reservationId, proofId, filename ?? undefined)
      .then((loaded) => {
        if (!active) {
          URL.revokeObjectURL(loaded.objectUrl);
          return;
        }
        setFile(loaded);
      })
      .catch((error: unknown) => {
        if (!active) return;
        toast.error(error instanceof Error ? error.message : t("reservations.proofOpenFailed"));
        onOpenChange(false);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [open, reservationId, proofId, filename, onOpenChange, t]);

  useEffect(() => {
    return () => {
      if (file) URL.revokeObjectURL(file.objectUrl);
    };
  }, [file]);

  const downloadFile = () => {
    if (!file) return;
    const anchor = document.createElement("a");
    anchor.href = file.objectUrl;
    anchor.download = file.filename;
    anchor.rel = "noopener";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  };

  const showImage = file ? isImageContentType(file.contentType, file.filename) : false;
  const showPdf = file ? isPdfContentType(file.contentType, file.filename) : false;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("reservations.proofPreviewTitle")}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("shared.loading")}
          </div>
        ) : null}

        {!loading && file && showImage ? (
          <div className="rounded-lg border overflow-hidden bg-muted/30">
            <img
              src={file.objectUrl}
              alt={file.filename}
              className="w-full max-h-[60dvh] object-contain"
            />
          </div>
        ) : null}

        {!loading && file && showPdf ? (
          <div className="space-y-3">
            <iframe
              title={file.filename}
              src={file.objectUrl}
              className="w-full h-[50dvh] rounded-lg border bg-background"
            />
            <p className="text-xs text-muted-foreground">{t("reservations.proofPdfHint")}</p>
          </div>
        ) : null}

        {!loading && file && !showImage && !showPdf ? (
          <p className="text-sm text-muted-foreground">{t("reservations.proofUnsupportedPreview")}</p>
        ) : null}

        {file ? <p className="text-xs text-muted-foreground break-all">{file.filename}</p> : null}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t("shared.cancel")}
          </Button>
          <Button type="button" disabled={!file} onClick={downloadFile}>
            <Download className="h-4 w-4 mr-1" />
            {t("reservations.proofDownload")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
