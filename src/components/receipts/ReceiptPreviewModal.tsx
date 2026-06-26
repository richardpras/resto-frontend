import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ReceiptPreviewBodySkeleton } from "@/components/skeletons/modal/ReceiptPreviewBodySkeleton";
import { SkeletonBusyRegion } from "@/components/skeletons/SkeletonBusyRegion";
import { useReceiptDocumentStore } from "@/stores/receiptDocumentStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { resolveReceiptPreviewWidthCh } from "@/domain/receiptPreviewUtils";
import { useTranslation } from "react-i18next";

export function ReceiptPreviewModal() {
  const { t } = useTranslation("common");
  const previewOpen = useReceiptDocumentStore((s) => s.previewOpen);
  const closePreview = useReceiptDocumentStore((s) => s.closePreview);
  const activeRender = useReceiptDocumentStore((s) => s.activeRender);
  const historyOutletId = useReceiptDocumentStore((s) => s.historyOutletId);
  const isLoadingDetail = useReceiptDocumentStore((s) => s.isLoadingDetail);
  const isMutating = useReceiptDocumentStore((s) => s.isMutating);
  const error = useReceiptDocumentStore((s) => s.error);
  const requestReprint = useReceiptDocumentStore((s) => s.requestReprint);
  const markDeferred = useReceiptDocumentStore((s) => s.markDeferred);
  const openPdfInNewTab = useReceiptDocumentStore((s) => s.openPdfInNewTab);
  const printers = useSettingsStore((s) => s.printers);
  const outlets = useSettingsStore((s) => s.outlets);
  const outletReceiptRows = useSettingsStore((s) => s.outletReceiptRows);
  const previewWidthCh = historyOutletId
    ? resolveReceiptPreviewWidthCh(historyOutletId, printers)
    : 32;
  const previewOutlet = historyOutletId ? outlets.find((o) => o.id === historyOutletId) : undefined;
  const previewReceiptRow = historyOutletId
    ? outletReceiptRows.find((row) => row.outletId === historyOutletId)
    : undefined;
  const showPreviewLogo = Boolean(previewReceiptRow?.showLogo && previewOutlet?.logoUrl);

  return (
    <Dialog
      open={previewOpen}
      onOpenChange={(open) => {
        if (!open) closePreview();
      }}
    >
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("settings.printers.receiptPreview.title")}</DialogTitle>
          {activeRender ? (
            <p className="text-xs text-muted-foreground font-normal">
              #{activeRender.id} · {activeRender.kind} · {activeRender.sourceType}/{activeRender.sourceId}
            </p>
          ) : null}
        </DialogHeader>
        <SkeletonBusyRegion busy={isLoadingDetail} label={t("settings.printers.receiptPreview.loading")} className="min-h-[120px]">
          {isLoadingDetail ? (
            <ReceiptPreviewBodySkeleton />
          ) : activeRender ? (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2 items-center">
                {activeRender.invoiceNumber ? (
                  <Badge variant="secondary">
                    {t("settings.printers.receiptPreview.invoiceBadge", { number: activeRender.invoiceNumber })}
                  </Badge>
                ) : null}
                {activeRender.pdfAvailable ? (
                  <Badge variant="outline">{t("settings.printers.receiptPreview.pdfReady")}</Badge>
                ) : (
                  <Badge variant="outline">{t("settings.printers.receiptPreview.pdfUnavailable")}</Badge>
                )}
                {activeRender.deferredReplayPending ? (
                  <Badge variant="destructive">{t("settings.printers.receiptPreview.deferredOffline")}</Badge>
                ) : (
                  <Badge variant="outline">{t("settings.printers.receiptPreview.printPathLive")}</Badge>
                )}
                <Badge variant="outline">
                  {t("settings.printers.receiptPreview.reprints", { count: activeRender.reprintCount })}
                </Badge>
              </div>
              <div className="space-y-2">
                {showPreviewLogo ? (
                  <img
                    src={previewOutlet?.logoUrl}
                    alt={t("settings.printers.receiptPreview.outletLogoAlt", { name: previewOutlet?.name ?? "Outlet" })}
                    className="mx-auto max-h-16 max-w-[70%] object-contain"
                  />
                ) : null}
                <pre
                className="text-xs whitespace-pre-wrap font-mono bg-muted rounded-md p-3 border max-h-64 overflow-auto mx-auto"
                style={{ maxWidth: `${previewWidthCh}ch` }}
              >
                {activeRender.thermalText}
              </pre>
              </div>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t("settings.printers.receiptPreview.noSelection")}</p>
          )}
        </SkeletonBusyRegion>
        <DialogFooter className="gap-2 sm:gap-2 flex-col sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => void openPdfInNewTab()} disabled={!activeRender?.pdfAvailable || isMutating}>
            {t("settings.printers.receiptPreview.openPdf")}
          </Button>
          <Button type="button" variant="outline" onClick={() => void requestReprint("settings-ui")} disabled={!activeRender || isMutating}>
            {t("settings.printers.receiptPreview.queueReprint")}
          </Button>
          <Button type="button" variant="secondary" onClick={() => void markDeferred()} disabled={!activeRender || isMutating}>
            {t("settings.printers.receiptPreview.markDeferred")}
          </Button>
          <Button type="button" variant="ghost" onClick={closePreview}>
            {t("settings.printers.receiptPreview.close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
