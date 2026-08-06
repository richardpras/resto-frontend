import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AppOverlay } from "@/components/ui/AppOverlay";
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
  const resolvedOutletId =
    historyOutletId
    ?? (typeof activeRender?.outletId === "number" && activeRender.outletId >= 1
      ? activeRender.outletId
      : null);
  const previewWidthCh = resolvedOutletId
    ? resolveReceiptPreviewWidthCh(resolvedOutletId, printers)
    : 32;
  const previewOutlet = resolvedOutletId ? outlets.find((o) => o.id === resolvedOutletId) : undefined;
  const previewReceiptRow = resolvedOutletId
    ? outletReceiptRows.find((row) => row.outletId === resolvedOutletId)
    : undefined;
  const showPreviewLogo = Boolean(previewReceiptRow?.showLogo && previewOutlet?.logoUrl);

  return (
    <AppOverlay
      open={previewOpen}
      onClose={closePreview}
      layer="paymentGateway"
      dismissible={!isMutating && !isLoadingDetail}
      data-testid="receipt-preview-overlay"
      panelClassName="max-w-xl max-h-[92vh] overflow-y-auto p-4 sm:p-5"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-lg font-bold text-foreground">{t("settings.printers.receiptPreview.title")}</h3>
          {activeRender ? (
            <p className="text-xs text-muted-foreground">
              #{activeRender.id} · {activeRender.kind} · {activeRender.sourceType}/{activeRender.sourceId}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={closePreview}
          disabled={isMutating}
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40"
          aria-label={t("settings.printers.receiptPreview.close")}
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <SkeletonBusyRegion busy={isLoadingDetail} label={t("settings.printers.receiptPreview.loading")} className="min-h-[120px]">
        {isLoadingDetail ? (
          <ReceiptPreviewBodySkeleton />
        ) : activeRender ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
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
              <Badge variant="outline" data-testid="receipt-preview-width-badge">
                {previewWidthCh}ch
              </Badge>
            </div>
            <div
              className="mx-auto w-full overflow-x-auto rounded-2xl border-2 border-dashed border-border bg-muted/30 p-4 sm:p-6"
              style={{ maxWidth: `${previewWidthCh + 16}ch` }}
              data-testid="receipt-preview-thermal-card"
            >
              {showPreviewLogo ? (
                <img
                  src={previewOutlet?.logoUrl}
                  alt={t("settings.printers.receiptPreview.outletLogoAlt", { name: previewOutlet?.name ?? "Outlet" })}
                  className="mx-auto mb-3 max-h-16 max-w-[70%] object-contain"
                />
              ) : null}
              {/*
                Keep whitespace-pre (not pre-wrap) so thermal column padding stays aligned.
                Width mirrors paper chars (32/42); parent scrolls horizontally on narrow screens.
              */}
              <pre
                className="mx-auto max-h-[min(60vh,32rem)] overflow-auto whitespace-pre font-mono text-[11px] leading-relaxed text-foreground sm:text-xs"
                style={{ width: `${previewWidthCh}ch` }}
                data-testid="receipt-preview-thermal-text"
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

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
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
      </div>
    </AppOverlay>
  );
}
