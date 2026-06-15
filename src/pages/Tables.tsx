import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Users, Plus, Pencil, Trash2, QrCode, Printer } from "lucide-react";
import { toast } from "sonner";
import { ApiHttpError, getApiAccessToken } from "@/lib/api-integration/client";
import {
  createFloorTable,
  deleteFloorTable,
  disableTableQr,
  enableTableQr,
  generateTableQr,
  listFloorTables,
  fetchTableQrImageBlob,
  rotateTableQr,
  updateFloorTable,
  type FloorTableApi,
} from "@/lib/api-integration/tableEndpoints";
import { QrPreviewModal } from "@/components/tables/QrPreviewModal";
import { BulkQrPrintDialog } from "@/components/tables/BulkQrPrintDialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useSettingsStore } from "@/stores/settingsStore";
import { useReservationTableProjectionSync } from "@/hooks/useReservationTableProjectionSync";
import { useAuthStore, PERMISSIONS } from "@/stores/authStore";
import { useOutletStore } from "@/stores/outletStore";
import { useOrderStore, type Order } from "@/stores/orderStore";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TablesBoardSkeleton } from "@/components/skeletons/dashboard/TablesBoardSkeleton";
import { SkeletonBusyRegion } from "@/components/skeletons/SkeletonBusyRegion";
import { useOpsTranslation } from "@/i18n/useOpsTranslation";

function formatRp(n: number) {
  return "Rp " + n.toLocaleString("id-ID");
}

const statusColorConfig = {
  available: { color: "bg-success/10 text-success border-success/20", dot: "bg-success" },
  occupied: { color: "bg-info/10 text-info border-info/20", dot: "bg-info" },
  reserved: { color: "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/20", dot: "bg-violet-500" },
  cleaning: { color: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20", dot: "bg-amber-500" },
  disabled: { color: "bg-muted text-muted-foreground border-border/40", dot: "bg-muted-foreground/50" },
} as const;

function qrStatusClass(status?: FloorTableApi["qrStatus"]): string {
  if (status === "ready") return "text-success font-medium";
  if (status === "invalid_url") return "text-destructive font-medium";
  return "text-amber-600 dark:text-amber-400 font-medium";
}

function linkedOrderForTable(tableIdStr: string, orders: Order[]) {
  return (
    orders.find(
      (o) =>
        o.tableId === tableIdStr &&
        o.status !== "completed" &&
        o.status !== "cancelled",
    ) ?? null
  );
}

export default function Tables() {
  const { t } = useOpsTranslation();
  const activeOutletId = useOutletStore((s) => s.activeOutletId);
  const orders = useOrderStore((s) => s.orders);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canManage = hasPermission(PERMISSIONS.TABLES_MANAGE);

  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<FloorTableApi | null>(null);
  const [formName, setFormName] = useState("");
  const [formCapacity, setFormCapacity] = useState("");
  const [formStatus, setFormStatus] = useState<"active" | "inactive">("active");
  const [saving, setSaving] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [previewTable, setPreviewTable] = useState<FloorTableApi | null>(null);
  const [bulkPrintOpen, setBulkPrintOpen] = useState(false);
  const outlets = useSettingsStore((s) => s.outlets);
  const activeOutletName = outlets.find((o) => o.id === activeOutletId)?.name ?? null;

  const statusConfig = useMemo(
    () =>
      ({
        available: { label: t("tables.available"), ...statusColorConfig.available },
        occupied: { label: t("tables.occupied"), ...statusColorConfig.occupied },
        reserved: { label: t("tables.reserved"), ...statusColorConfig.reserved },
        cleaning: { label: t("tables.cleaning"), ...statusColorConfig.cleaning },
        disabled: { label: t("tables.disabled"), ...statusColorConfig.disabled },
      }) as Record<keyof typeof statusColorConfig, { label: string; color: string; dot: string }>,
    [t],
  );

  const qrStatusLabel = (status?: FloorTableApi["qrStatus"]) => {
    if (status === "ready") return t("tables.qrReady");
    if (status === "invalid_url") return t("tables.qrInvalid");
    return t("tables.qrMissing");
  };

  const outletReady = typeof activeOutletId === "number" && activeOutletId >= 1;
  const authed = Boolean(getApiAccessToken());

  useReservationTableProjectionSync();

  useEffect(() => {
    void useSettingsStore.getState().ensureSectionsLoaded(["outlets"]);
  }, []);

  const { data: masterRows = [], isLoading } = useQuery({
    queryKey: ["tables-master", activeOutletId ?? 0],
    queryFn: () => listFloorTables(activeOutletId!),
    enabled: outletReady && authed,
  });

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["tables-master"] });
    void queryClient.invalidateQueries({ queryKey: ["floor-tables"] });
  }, [queryClient]);

  const counts = useMemo(() => {
    let available = 0;
    let occupied = 0;
    let reserved = 0;
    let cleaning = 0;
    let disabled = 0;
    for (const row of masterRows) {
      const key = row.tableOperationalStatus;
      if (key === "available") available++;
      else if (key === "occupied") occupied++;
      else if (key === "reserved") reserved++;
      else if (key === "cleaning") cleaning++;
      else disabled++;
    }
    return { available, occupied, reserved, cleaning, disabled };
  }, [masterRows]);

  const openCreate = () => {
    setEditing(null);
    setFormName("");
    setFormCapacity("");
    setFormStatus("active");
    setDialogOpen(true);
  };

  const openEdit = (row: FloorTableApi) => {
    setEditing(row);
    setFormName(row.name);
    setFormCapacity(row.capacity !== null ? String(row.capacity) : "");
    setFormStatus(row.status);
    setDialogOpen(true);
  };

  const save = async () => {
    if (!outletReady || !formName.trim()) {
      toast.error(t("tables.nameRequired"));
      return;
    }
    const capTrim = formCapacity.trim();
    const capacity = capTrim === "" ? null : Number(capTrim);
    if (capacity !== null && (Number.isNaN(capacity) || capacity < 0)) {
      toast.error(t("tables.capacityInvalid"));
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        await updateFloorTable(editing.id, {
          name: formName.trim(),
          capacity,
          status: formStatus,
        });
        toast.success(t("tables.saved"));
      } else {
        await createFloorTable({
          outletId: activeOutletId!,
          name: formName.trim(),
          capacity,
          status: formStatus,
        });
        toast.success(t("tables.created"));
      }
      invalidate();
      setDialogOpen(false);
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : t("shared.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const destroy = async (row: FloorTableApi) => {
    if (!confirm(t("tables.deleteConfirm", { name: row.name }))) return;
    try {
      await deleteFloorTable(row.id);
      invalidate();
      toast.success(t("tables.deleted"));
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : t("shared.deleteFailed"));
    }
  };

  const copyQrUrl = async (row: FloorTableApi) => {
    if (!row.qrUrl) {
      toast.error(t("tables.generateFirst"));
      return;
    }
    await navigator.clipboard.writeText(row.qrUrl);
    toast.success(t("tables.urlCopied"));
  };

  const onGenerateQr = async (row: FloorTableApi) => {
    try {
      await generateTableQr(row.id);
      invalidate();
      toast.success(t("tables.qrGenerated"));
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : t("tables.qrGenerateFailed"));
    }
  };

  const onRotateQr = async (row: FloorTableApi) => {
    try {
      await rotateTableQr(row.id);
      invalidate();
      toast.success(t("tables.qrRegenerated"));
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : t("tables.qrRegenerateFailed"));
    }
  };

  const toggleSelected = (id: number, checked: boolean) => {
    setSelectedIds((prev) => (checked ? [...new Set([...prev, id])] : prev.filter((x) => x !== id)));
  };

  const printTableQr = async (row: FloorTableApi) => {
    if (row.qrStatus !== "ready") {
      toast.error(t("tables.qrNotReady"));
      return;
    }
    try {
      const blob = await fetchTableQrImageBlob(row.id);
      const imageUrl = URL.createObjectURL(blob);
      const printWindow = window.open("", "_blank", "noopener,noreferrer,width=480,height=720");
      if (!printWindow) {
        URL.revokeObjectURL(imageUrl);
        toast.error(t("tables.popupBlocked"));
        return;
      }
      const restaurantLabel = t("tables.printRestaurant");
      const outletLabel = activeOutletName ?? t("shared.noOutletSelected");
      const scanHint = t("tables.printScanHint");
      printWindow.document.write(`
        <html><head><title>Print QR ${row.name}</title>
        <style>body{font-family:sans-serif;padding:16px;} @media print { body { margin: 0; } }</style>
        </head><body>
        <div style="text-align:center;border:1px solid #ccc;border-radius:8px;padding:16px;max-width:320px;margin:0 auto;">
          <div style="font-weight:700;font-size:14px;">${restaurantLabel}</div>
          <div style="font-size:12px;color:#555;margin-bottom:8px;">${outletLabel}</div>
          <div style="font-size:22px;font-weight:800;margin-bottom:12px;">${row.name}</div>
          <img src="${imageUrl}" alt="QR" style="width:180px;height:180px;object-fit:contain;" />
          <div style="font-size:12px;margin-top:12px;">${scanHint}</div>
          <div style="font-size:10px;color:#666;margin-top:8px;word-break:break-all;">${row.qrUrl ?? ""}</div>
        </div>
        <script>window.onload = () => { window.print(); window.onafterprint = () => window.close(); };</script>
        </body></html>
      `);
      printWindow.document.close();
      setTimeout(() => URL.revokeObjectURL(imageUrl), 60_000);
    } catch {
      toast.error(t("tables.printFailed"));
    }
  };

  const onToggleQr = async (row: FloorTableApi, enabled: boolean) => {
    try {
      if (enabled) await enableTableQr(row.id);
      else await disableTableQr(row.id);
      invalidate();
      toast.success(enabled ? t("tables.qrEnabled") : t("tables.qrDisabled"));
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : t("tables.qrStatusFailed"));
    }
  };

  if (!authed) {
    return (
      <div className="p-4 md:p-6 text-sm text-muted-foreground">
        {t("tables.signIn")}
      </div>
    );
  }

  if (!outletReady) {
    return (
      <div className="p-4 md:p-6 text-sm text-muted-foreground">
        {t("tables.selectOutlet")}
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="h-6 w-6" /> {t("tables.title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t("tables.subtitle", { available: counts.available, total: masterRows.length })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          {canManage && (
            <>
              <Button type="button" size="sm" onClick={openCreate}>
                <Plus className="h-4 w-4 mr-1" /> {t("tables.addTable")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant={selectMode ? "secondary" : "outline"}
                onClick={() => {
                  setSelectMode((v) => !v);
                  setSelectedIds([]);
                }}
              >
                {selectMode ? t("tables.cancelSelect") : t("tables.selectTables")}
              </Button>
              {selectMode ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={selectedIds.length === 0}
                  onClick={() => setBulkPrintOpen(true)}
                >
                  <Printer className="h-4 w-4 mr-1" />
                  {t("tables.printSelected", { n: selectedIds.length })}
                </Button>
              ) : null}
            </>
          )}
          {(Object.entries(statusConfig) as [keyof typeof statusConfig, typeof statusConfig[keyof typeof statusConfig]][]).map(([key, cfg]) => (
            <span key={key} className={`px-3 py-1.5 rounded-xl text-xs font-medium border ${cfg.color}`}>
              {cfg.label}:{" "}
              {key === "available"
                ? counts.available
                : key === "occupied"
                  ? counts.occupied
                  : key === "reserved"
                    ? counts.reserved
                    : key === "cleaning"
                      ? counts.cleaning
                      : counts.disabled}
            </span>
          ))}
        </div>
      </div>

      <SkeletonBusyRegion busy={isLoading} label={t("tables.loading")}>
        {isLoading ? (
          <TablesBoardSkeleton tiles={12} />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        {masterRows.map((table) => {
          const runtimeKey = table.tableOperationalStatus;
          const linkedOrder = linkedOrderForTable(String(table.id), orders);
          const cfg = statusConfig[runtimeKey];
          const inactive = runtimeKey === "disabled";

          return (
            <motion.div
              key={table.id}
              layout
              whileHover={{ y: -2 }}
              className={`bg-card rounded-2xl border overflow-hidden pos-shadow-md transition-all ${
                inactive
                  ? "border-border/60 opacity-80"
                  : runtimeKey === "available"
                  ? "border-success/20"
                  : runtimeKey === "occupied"
                    ? "border-info/20"
                    : runtimeKey === "reserved"
                      ? "border-violet-500/20"
                      : runtimeKey === "cleaning"
                        ? "border-amber-500/20"
                        : "border-border/40"
              }`}
            >
              <div
                className={`px-4 py-3 flex items-center justify-between gap-2 ${
                  inactive
                    ? "bg-muted/30"
                    : runtimeKey === "available"
                    ? "bg-success/5"
                    : runtimeKey === "occupied"
                      ? "bg-info/5"
                      : runtimeKey === "reserved"
                        ? "bg-violet-500/5"
                        : runtimeKey === "cleaning"
                          ? "bg-amber-500/5"
                          : "bg-muted/40"
                }`}
              >
                <span className="font-bold text-sm text-foreground truncate">{table.name}</span>
                <div className="flex items-center gap-1 shrink-0">
                  {selectMode && canManage ? (
                    <Checkbox
                      checked={selectedIds.includes(table.id)}
                      onCheckedChange={(v) => toggleSelected(table.id, v === true)}
                      aria-label={t("tables.selectTableAria", { name: table.name })}
                    />
                  ) : null}
                  <span className={`h-2.5 w-2.5 rounded-full ${inactive ? "bg-muted-foreground/40" : cfg.dot}`} />
                  {canManage && (
                    <>
                      <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(table)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => void destroy(table)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              </div>

              <div className="p-4">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
                  <Users className="h-3 w-3" />{" "}
                  {table.capacity != null ? t("tables.seats", { n: table.capacity }) : "—"}
                </div>

                <div className="flex flex-wrap gap-1 mb-2">
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${
                      inactive ? "bg-muted/50 text-muted-foreground border-border" : "bg-primary/10 text-primary border-primary/20"
                    }`}
                  >
                    {t("tables.masterLabel", {
                      status: inactive ? t("tables.masterInactive") : t("tables.masterActive"),
                    })}
                  </span>
                </div>

                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${cfg.color}`}>{cfg.label}</span>
                {table.tableOperationalSignals?.hasReservation && runtimeKey !== "reserved" && (
                  <span className="ml-1 text-[10px] px-2 py-0.5 rounded-full font-medium border border-violet-500/30 text-violet-700 dark:text-violet-300">
                    {t("tables.reservation")}
                  </span>
                )}

                <div className="mt-3 pt-3 border-t border-border/30 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{t("tables.qr")}</span>
                    <span className={table.qrEnabled ? "text-success font-medium" : "text-muted-foreground"}>
                      {table.qrEnabled ? t("tables.qrEnabledStatus") : t("tables.qrDisabledStatus")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{t("tables.qrStatus")}</span>
                    <span className={qrStatusClass(table.qrStatus)}>{qrStatusLabel(table.qrStatus)}</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground break-all">
                    {table.qrUrl ?? t("tables.noQrUrl")}
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <Button type="button" size="sm" variant="outline" className="h-8 text-[11px]" onClick={() => void onGenerateQr(table)}>
                      {t("tables.generateQr")}
                    </Button>
                    <Button type="button" size="sm" variant="outline" className="h-8 text-[11px]" onClick={() => void onRotateQr(table)}>
                      {t("tables.regenerateQr")}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 text-[11px]"
                      onClick={() => void onToggleQr(table, !table.qrEnabled)}
                    >
                      {table.qrEnabled ? t("tables.disableQr") : t("tables.enableQr")}
                    </Button>
                    <Button type="button" size="sm" variant="outline" className="h-8 text-[11px]" onClick={() => void copyQrUrl(table)}>
                      {t("tables.copyUrl")}
                    </Button>
                    <Button type="button" size="sm" variant="outline" className="h-8 text-[11px]" onClick={() => setPreviewTable(table)}>
                      <QrCode className="h-3 w-3 mr-1" />
                      {t("tables.previewQr")}
                    </Button>
                    <Button type="button" size="sm" variant="outline" className="h-8 text-[11px]" onClick={() => void printTableQr(table)}>
                      <Printer className="h-3 w-3 mr-1" />
                      {t("tables.printQr")}
                    </Button>
                  </div>
                </div>

                {linkedOrder && (
                  <div className="mt-3 pt-3 border-t border-border/30 space-y-1.5">
                    <p className="text-xs font-semibold text-foreground">{linkedOrder.code}</p>
                    {linkedOrder.customerName && <p className="text-xs text-muted-foreground">{linkedOrder.customerName}</p>}
                    <p className="text-xs font-bold text-primary">{formatRp(linkedOrder.total)}</p>
                    <span
                      className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                        linkedOrder.paymentStatus === "paid"
                          ? "bg-success/10 text-success"
                          : linkedOrder.paymentStatus === "partial"
                          ? "bg-warning/10 text-warning"
                          : "bg-destructive/10 text-destructive"
                      }`}
                    >
                      {linkedOrder.paymentStatus === "paid"
                        ? t("tables.paid")
                        : linkedOrder.paymentStatus === "partial"
                        ? t("tables.partial")
                        : t("tables.unpaid")}
                    </span>
                  </div>
                )}

                {!inactive && runtimeKey === "occupied" && (
                  <p className="mt-3 text-[11px] text-muted-foreground">
                    {t("tables.projectionHint")}
                  </p>
                )}
              </div>
            </motion.div>
          );
        })}
          </div>
        )}
      </SkeletonBusyRegion>

      {!isLoading && masterRows.length === 0 && (
        <p className="text-sm text-muted-foreground text-center mt-12">{t("tables.empty")}</p>
      )}

      <QrPreviewModal
        open={previewTable !== null}
        table={previewTable}
        outletName={activeOutletName}
        onOpenChange={(open) => {
          if (!open) setPreviewTable(null);
        }}
        onRegenerate={(table) => {
          void onRotateQr(table);
          setPreviewTable(null);
        }}
      />

      {outletReady ? (
        <BulkQrPrintDialog
          open={bulkPrintOpen}
          outletId={activeOutletId!}
          tables={masterRows.filter((t) => selectedIds.includes(t.id))}
          onOpenChange={setBulkPrintOpen}
        />
      ) : null}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? t("tables.editTitle") : t("tables.newTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="space-y-2">
              <Label>{t("common:common.name")}</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder={t("tables.namePlaceholder")} />
            </div>
            <div className="space-y-2">
              <Label>{t("tables.capacity")}</Label>
              <Input
                inputMode="numeric"
                placeholder={t("tables.capacityPlaceholder")}
                value={formCapacity}
                onChange={(e) => setFormCapacity(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("common:common.status")}</Label>
              <Select value={formStatus} onValueChange={(v: "active" | "inactive") => setFormStatus(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{t("common:common.active")}</SelectItem>
                  <SelectItem value="inactive">{t("common:common.inactive")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {t("tables.outletFromHeader", { id: activeOutletId })}
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              {t("shared.cancel")}
            </Button>
            <Button type="button" onClick={() => void save()} disabled={saving}>
              {saving ? t("shared.saving") : t("shared.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
