import { useState } from "react";
import { Pencil, Printer, QrCode, Trash2 } from "lucide-react";
import type { FloorTableApi } from "@/lib/api-integration/tableEndpoints";
import type { Order } from "@/stores/orderStore";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { formatTableRp, qrStatusClass, type TableStatusStyle } from "./tablesPageUtils";

export type TableDetailSheetProps = {
  table: FloorTableApi | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  linkedOrder: Order | null;
  statusConfig: TableStatusStyle | null;
  canManage: boolean;
  labels: {
    detailTitle: string;
    sectionOperational: string;
    sectionMaster: string;
    sectionQr: string;
    seats: string;
    masterLabel: string;
    masterActive: string;
    masterInactive: string;
    reservation: string;
    projectionHint: string;
    qr: string;
    qrEnabledStatus: string;
    qrDisabledStatus: string;
    qrStatus: string;
    qrStatusLabel: string;
    noQrUrl: string;
    paid: string;
    partial: string;
    unpaid: string;
    generateQr: string;
    regenerateQr: string;
    enableQr: string;
    disableQr: string;
    copyUrl: string;
    previewQr: string;
    printQr: string;
    edit: string;
    delete: string;
    deleteConfirmTitle: string;
    deleteConfirmDescription: string;
    cancel: string;
  };
  onGenerateQr: (table: FloorTableApi) => void;
  onRotateQr: (table: FloorTableApi) => void;
  onToggleQr: (table: FloorTableApi, enabled: boolean) => void;
  onCopyQrUrl: (table: FloorTableApi) => void;
  onPreviewQr: (table: FloorTableApi) => void;
  onPrintQr: (table: FloorTableApi) => void;
  onEdit: (table: FloorTableApi) => void;
  onDelete: (table: FloorTableApi) => void;
};

export function TableDetailSheet({
  table,
  open,
  onOpenChange,
  linkedOrder,
  statusConfig,
  canManage,
  labels,
  onGenerateQr,
  onRotateQr,
  onToggleQr,
  onCopyQrUrl,
  onPreviewQr,
  onPrintQr,
  onEdit,
  onDelete,
}: TableDetailSheetProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (!table || !statusConfig) return null;

  const runtimeKey = table.tableOperationalStatus;
  const inactive = runtimeKey === "disabled";

  const paymentBadge =
    linkedOrder?.paymentStatus === "paid"
      ? labels.paid
      : linkedOrder?.paymentStatus === "partial"
        ? labels.partial
        : labels.unpaid;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto sm:max-w-lg sm:ml-auto sm:mr-0 sm:rounded-l-xl">
          <SheetHeader className="text-left pb-2">
            <SheetTitle>{table.name}</SheetTitle>
            <p className="text-sm text-muted-foreground">{labels.detailTitle}</p>
          </SheetHeader>

          <div className="space-y-5 pt-2 pb-6">
            <section className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {labels.sectionOperational}
              </h3>
              <div className="flex flex-wrap gap-2">
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${statusConfig.color}`}>
                  {statusConfig.label}
                </span>
                <span className="text-sm text-muted-foreground">{labels.seats}</span>
              </div>
              {table.tableOperationalSignals?.hasReservation && runtimeKey !== "reserved" ? (
                <p className="text-xs text-violet-700 dark:text-violet-300">{labels.reservation}</p>
              ) : null}
              {linkedOrder ? (
                <div className="rounded-xl border border-border/50 p-3 space-y-1">
                  <p className="font-semibold text-sm">{linkedOrder.code}</p>
                  {linkedOrder.customerName ? (
                    <p className="text-xs text-muted-foreground">{linkedOrder.customerName}</p>
                  ) : null}
                  <p className="text-sm font-bold text-primary">{formatTableRp(linkedOrder.total)}</p>
                  <span className="inline-block text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted">{paymentBadge}</span>
                </div>
              ) : null}
              {!inactive && runtimeKey === "occupied" ? (
                <p className="text-xs text-muted-foreground">{labels.projectionHint}</p>
              ) : null}
            </section>

            <section className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {labels.sectionMaster}
              </h3>
              <p className="text-sm">{labels.masterLabel}</p>
            </section>

            <section className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{labels.sectionQr}</h3>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{labels.qr}</span>
                <span className={table.qrEnabled ? "text-success font-medium" : "text-muted-foreground"}>
                  {table.qrEnabled ? labels.qrEnabledStatus : labels.qrDisabledStatus}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{labels.qrStatus}</span>
                <span className={qrStatusClass(table.qrStatus)}>{labels.qrStatusLabel}</span>
              </div>
              <p className="text-xs text-muted-foreground break-all">{table.qrUrl ?? labels.noQrUrl}</p>

              {canManage ? (
                <div className="grid gap-2 pt-1">
                  <Button type="button" variant="outline" className="h-11 justify-start" onClick={() => onGenerateQr(table)}>
                    {labels.generateQr}
                  </Button>
                  <Button type="button" variant="outline" className="h-11 justify-start" onClick={() => onRotateQr(table)}>
                    {labels.regenerateQr}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 justify-start"
                    onClick={() => onToggleQr(table, !table.qrEnabled)}
                  >
                    {table.qrEnabled ? labels.disableQr : labels.enableQr}
                  </Button>
                  <Button type="button" variant="outline" className="h-11 justify-start" onClick={() => onCopyQrUrl(table)}>
                    {labels.copyUrl}
                  </Button>
                  <Button type="button" variant="outline" className="h-11 justify-start" onClick={() => onPreviewQr(table)}>
                    <QrCode className="h-4 w-4 mr-2" />
                    {labels.previewQr}
                  </Button>
                  <Button type="button" variant="outline" className="h-11 justify-start" onClick={() => onPrintQr(table)}>
                    <Printer className="h-4 w-4 mr-2" />
                    {labels.printQr}
                  </Button>
                </div>
              ) : null}
            </section>

            {canManage ? (
              <section className="grid gap-2 pt-2 border-t">
                <Button type="button" variant="secondary" className="h-11 justify-start" onClick={() => onEdit(table)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  {labels.edit}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  className="h-11 justify-start"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {labels.delete}
                </Button>
              </section>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{labels.deleteConfirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>{labels.deleteConfirmDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{labels.cancel}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                onDelete(table);
                setDeleteOpen(false);
                onOpenChange(false);
              }}
            >
              {labels.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
