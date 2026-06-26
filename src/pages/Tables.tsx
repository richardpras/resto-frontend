import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Users, Plus } from "lucide-react";
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
import { TableFloorTile } from "@/components/tables/TableFloorTile";
import { TableManageTile } from "@/components/tables/TableManageTile";
import { TablesPageToolbar, type TablesPageMode } from "@/components/tables/TablesPageToolbar";
import { TableDetailSheet } from "@/components/tables/TableDetailSheet";
import {
  TABLES_GRID_CLASS,
  countTablesByStatus,
  filterTables,
  linkedOrderForTable,
  statusColorConfig,
  type TableStatusFilter,
} from "@/components/tables/tablesPageUtils";
import { useSettingsStore } from "@/stores/settingsStore";
import { useReservationTableProjectionSync } from "@/hooks/useReservationTableProjectionSync";
import { useAuthStore } from "@/stores/authStore";
import { useOutletStore } from "@/stores/outletStore";
import { useOrderStore } from "@/stores/orderStore";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TablesBoardSkeleton } from "@/components/skeletons/dashboard/TablesBoardSkeleton";
import { SkeletonBusyRegion } from "@/components/skeletons/SkeletonBusyRegion";
import { useOpsTranslation } from "@/i18n/useOpsTranslation";
import { printQrLabel } from "@/lib/qrLabelCapture";

export default function Tables() {
  const { t } = useOpsTranslation();
  const activeOutletId = useOutletStore((s) => s.activeOutletId);
  const orders = useOrderStore((s) => s.orders);
  const hasPermissionCode = useAuthStore((s) => s.hasPermissionCode);
  const canManage = hasPermissionCode("tables.manage");

  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<FloorTableApi | null>(null);
  const [formName, setFormName] = useState("");
  const [formCapacity, setFormCapacity] = useState("");
  const [formStatus, setFormStatus] = useState<"active" | "inactive">("active");
  const [saving, setSaving] = useState(false);
  const [pageMode, setPageMode] = useState<TablesPageMode>("floor");
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<TableStatusFilter>("all");
  const [detailTable, setDetailTable] = useState<FloorTableApi | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
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

  const counts = useMemo(() => countTablesByStatus(masterRows), [masterRows]);

  const filteredRows = useMemo(
    () => filterTables(masterRows, { searchQuery, statusFilter }),
    [masterRows, searchQuery, statusFilter],
  );

  const hasActiveFilters = searchQuery.trim() !== "" || statusFilter !== "all";

  const statusChips = useMemo(
    () => [
      { key: "all" as const, label: t("tables.filterAll"), count: masterRows.length },
      { key: "available" as const, label: statusConfig.available.label, count: counts.available, colorClass: statusConfig.available.color },
      { key: "occupied" as const, label: statusConfig.occupied.label, count: counts.occupied, colorClass: statusConfig.occupied.color },
      { key: "reserved" as const, label: statusConfig.reserved.label, count: counts.reserved, colorClass: statusConfig.reserved.color },
      { key: "cleaning" as const, label: statusConfig.cleaning.label, count: counts.cleaning, colorClass: statusConfig.cleaning.color },
      { key: "disabled" as const, label: statusConfig.disabled.label, count: counts.disabled, colorClass: statusConfig.disabled.color },
    ],
    [t, masterRows.length, counts, statusConfig],
  );

  const handleModeChange = (mode: TablesPageMode) => {
    setPageMode(mode);
    setSelectMode(false);
    setSelectedIds([]);
  };

  const openDetail = (row: FloorTableApi) => {
    setDetailTable(row);
    setDetailOpen(true);
  };

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
    setDetailOpen(false);
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
      try {
        await printQrLabel(
          {
            restaurantName: t("tables.printRestaurant"),
            outletName: activeOutletName ?? t("shared.noOutletSelected"),
            tableName: row.name,
            qrImageSrc: imageUrl,
            scanHint: t("tables.printScanHint"),
          },
          `Print QR ${row.name}`,
        );
      } finally {
        setTimeout(() => URL.revokeObjectURL(imageUrl), 60_000);
      }
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

  const detailLinkedOrder = detailTable ? linkedOrderForTable(String(detailTable.id), orders) : null;
  const detailStatusConfig = detailTable ? statusConfig[detailTable.tableOperationalStatus] : null;

  const sheetLabels = useMemo(
    () => ({
      detailTitle: t("tables.detailTitle"),
      sectionOperational: t("tables.sectionOperational"),
      sectionMaster: t("tables.sectionMaster"),
      sectionQr: t("tables.sectionQr"),
      seats: detailTable?.capacity != null ? t("tables.seats", { n: detailTable.capacity }) : "—",
      masterLabel: t("tables.masterLabel", {
        status:
          detailTable?.tableOperationalStatus === "disabled"
            ? t("tables.masterInactive")
            : t("tables.masterActive"),
      }),
      masterActive: t("tables.masterActive"),
      masterInactive: t("tables.masterInactive"),
      reservation: t("tables.reservation"),
      projectionHint: t("tables.projectionHint"),
      qr: t("tables.qr"),
      qrEnabledStatus: t("tables.qrEnabledStatus"),
      qrDisabledStatus: t("tables.qrDisabledStatus"),
      qrStatus: t("tables.qrStatus"),
      qrStatusLabel: qrStatusLabel(detailTable?.qrStatus),
      noQrUrl: t("tables.noQrUrl"),
      paid: t("tables.paid"),
      partial: t("tables.partial"),
      unpaid: t("tables.unpaid"),
      generateQr: t("tables.generateQr"),
      regenerateQr: t("tables.regenerateQr"),
      enableQr: t("tables.enableQr"),
      disableQr: t("tables.disableQr"),
      copyUrl: t("tables.copyUrl"),
      previewQr: t("tables.previewQr"),
      printQr: t("tables.printQr"),
      edit: t("tables.editTable"),
      delete: t("shared.delete"),
      deleteConfirmTitle: t("tables.deleteConfirmTitle"),
      deleteConfirmDescription: detailTable
        ? t("tables.deleteConfirm", { name: detailTable.name })
        : "",
      cancel: t("shared.cancel"),
    }),
    [t, detailTable],
  );

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
    <div className="p-4 md:p-6 pb-24 lg:pb-6">
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Users className="h-6 w-6" /> {t("tables.title")}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {hasActiveFilters
            ? t("tables.filteredSubtitle", {
                shown: filteredRows.length,
                total: masterRows.length,
                available: counts.available,
              })
            : t("tables.subtitle", { available: counts.available, total: masterRows.length })}
        </p>
      </div>

      <TablesPageToolbar
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        searchPlaceholder={t("tables.searchPlaceholder")}
        mode={pageMode}
        onModeChange={handleModeChange}
        modeFloorLabel={t("tables.modeFloor")}
        modeManageLabel={t("tables.modeManage")}
        statusChips={statusChips}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        canManage={canManage}
        addTableLabel={t("tables.addTable")}
        onAddTable={openCreate}
        selectMode={selectMode}
        onSelectModeToggle={() => {
          setSelectMode((v) => !v);
          setSelectedIds([]);
        }}
        selectTablesLabel={t("tables.selectTables")}
        cancelSelectLabel={t("tables.cancelSelect")}
        selectedCount={selectedIds.length}
        printSelectedLabel={t("tables.printSelected", { n: selectedIds.length })}
        onPrintSelected={() => setBulkPrintOpen(true)}
      />

      <SkeletonBusyRegion busy={isLoading} label={t("tables.loading")}>
        {isLoading ? (
          <TablesBoardSkeleton tiles={8} />
        ) : (
          <div className={TABLES_GRID_CLASS}>
            {filteredRows.map((table) => {
              const runtimeKey = table.tableOperationalStatus;
              const linkedOrder = linkedOrderForTable(String(table.id), orders);
              const cfg = statusConfig[runtimeKey];
              const tileProps = {
                table,
                statusConfig: cfg,
                linkedOrder,
                seatsLabel: table.capacity != null ? t("tables.seats", { n: table.capacity }) : "—",
                reservationLabel: t("tables.reservation"),
                qrEnabledLabel: t("tables.qrEnabledStatus"),
                qrDisabledLabel: t("tables.qrDisabledStatus"),
                openDetailAria: t("tables.openDetailAria", { name: table.name }),
                onOpen: () => openDetail(table),
              };

              if (pageMode === "manage") {
                return (
                  <TableManageTile
                    key={table.id}
                    {...tileProps}
                    selectMode={selectMode}
                    selected={selectedIds.includes(table.id)}
                    onToggleSelect={(checked) => toggleSelected(table.id, checked)}
                    selectTableAria={t("tables.selectTableAria", { name: table.name })}
                  />
                );
              }

              return <TableFloorTile key={table.id} {...tileProps} />;
            })}
          </div>
        )}
      </SkeletonBusyRegion>

      {!isLoading && masterRows.length === 0 && (
        <p className="text-sm text-muted-foreground text-center mt-12">{t("tables.empty")}</p>
      )}

      {!isLoading && masterRows.length > 0 && filteredRows.length === 0 && (
        <p className="text-sm text-muted-foreground text-center mt-12">{t("tables.noSearchResults")}</p>
      )}

      {canManage ? (
        <Button
          type="button"
          size="icon"
          className="fixed bottom-6 right-4 h-14 w-14 rounded-full shadow-lg lg:hidden z-chrome"
          onClick={openCreate}
          aria-label={t("tables.addTable")}
        >
          <Plus className="h-6 w-6" />
        </Button>
      ) : null}

      <TableDetailSheet
        table={detailTable}
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open);
          if (!open) setDetailTable(null);
        }}
        linkedOrder={detailLinkedOrder}
        statusConfig={detailStatusConfig}
        canManage={canManage}
        labels={sheetLabels}
        onGenerateQr={(row) => void onGenerateQr(row)}
        onRotateQr={(row) => void onRotateQr(row)}
        onToggleQr={(row, enabled) => void onToggleQr(row, enabled)}
        onCopyQrUrl={(row) => void copyQrUrl(row)}
        onPreviewQr={(row) => setPreviewTable(row)}
        onPrintQr={(row) => void printTableQr(row)}
        onEdit={openEdit}
        onDelete={(row) => void destroy(row)}
      />

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
          tables={masterRows.filter((row) => selectedIds.includes(row.id))}
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
