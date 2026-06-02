import { useCallback, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Users, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ApiHttpError, getApiAccessToken } from "@/lib/api-integration/client";
import {
  createFloorTable,
  deleteFloorTable,
  disableTableQr,
  enableTableQr,
  generateTableQr,
  listFloorTables,
  rotateTableQr,
  updateFloorTable,
  type FloorTableApi,
} from "@/lib/api-integration/tableEndpoints";
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

function formatRp(n: number) {
  return "Rp " + n.toLocaleString("id-ID");
}

const statusConfig = {
  available: { label: "Available", color: "bg-success/10 text-success border-success/20", dot: "bg-success" },
  occupied: { label: "Occupied", color: "bg-info/10 text-info border-info/20", dot: "bg-info" },
  reserved: { label: "Reserved", color: "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/20", dot: "bg-violet-500" },
  cleaning: { label: "Cleaning", color: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20", dot: "bg-amber-500" },
  disabled: { label: "Disabled", color: "bg-muted text-muted-foreground border-border/40", dot: "bg-muted-foreground/50" },
};

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

  const outletReady = typeof activeOutletId === "number" && activeOutletId >= 1;
  const authed = Boolean(getApiAccessToken());

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
      toast.error("Name required");
      return;
    }
    const capTrim = formCapacity.trim();
    const capacity = capTrim === "" ? null : Number(capTrim);
    if (capacity !== null && (Number.isNaN(capacity) || capacity < 0)) {
      toast.error("Capacity must be a valid non-negative number");
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
        toast.success("Table updated");
      } else {
        await createFloorTable({
          outletId: activeOutletId!,
          name: formName.trim(),
          capacity,
          status: formStatus,
        });
        toast.success("Table created");
      }
      invalidate();
      setDialogOpen(false);
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const destroy = async (row: FloorTableApi) => {
    if (!confirm(`Delete ${row.name}?`)) return;
    try {
      await deleteFloorTable(row.id);
      invalidate();
      toast.success("Table deleted");
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : "Delete failed");
    }
  };

  const copyQrUrl = async (row: FloorTableApi) => {
    if (!row.qrUrl) {
      toast.error("Generate QR first.");
      return;
    }
    await navigator.clipboard.writeText(row.qrUrl);
    toast.success("QR URL copied.");
  };

  const onGenerateQr = async (row: FloorTableApi) => {
    try {
      await generateTableQr(row.id);
      invalidate();
      toast.success("QR identity generated.");
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : "Failed to generate QR identity");
    }
  };

  const onRotateQr = async (row: FloorTableApi) => {
    try {
      await rotateTableQr(row.id);
      invalidate();
      toast.success("QR identity regenerated.");
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : "Failed to regenerate QR identity");
    }
  };

  const onToggleQr = async (row: FloorTableApi, enabled: boolean) => {
    try {
      if (enabled) await enableTableQr(row.id);
      else await disableTableQr(row.id);
      invalidate();
      toast.success(enabled ? "QR enabled." : "QR disabled.");
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : "Failed to update QR status");
    }
  };

  if (!authed) {
    return (
      <div className="p-4 md:p-6 text-sm text-muted-foreground">
        Sign in to manage tables from the API.
      </div>
    );
  }

  if (!outletReady) {
    return (
      <div className="p-4 md:p-6 text-sm text-muted-foreground">
        Select an outlet in the header to view and manage tables.
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="h-6 w-6" /> Table Management
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {counts.available} available tables from {masterRows.length} master tables
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          {canManage && (
            <Button type="button" size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1" /> Add table
            </Button>
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

      <SkeletonBusyRegion busy={isLoading} label="Loading tables">
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
                  <Users className="h-3 w-3" /> {table.capacity ?? "—"} seats
                </div>

                <div className="flex flex-wrap gap-1 mb-2">
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${
                      inactive ? "bg-muted/50 text-muted-foreground border-border" : "bg-primary/10 text-primary border-primary/20"
                    }`}
                  >
                    Master: {inactive ? "inactive" : "active"}
                  </span>
                </div>

                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${cfg.color}`}>{cfg.label}</span>

                <div className="mt-3 pt-3 border-t border-border/30 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">QR Status</span>
                    <span className={table.qrEnabled ? "text-success font-medium" : "text-muted-foreground"}>
                      {table.qrEnabled ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                  <div className="text-[11px] text-muted-foreground break-all">
                    {table.qrUrl ?? "No QR URL generated"}
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <Button type="button" size="sm" variant="outline" className="h-8 text-[11px]" onClick={() => void onGenerateQr(table)}>
                      Generate QR
                    </Button>
                    <Button type="button" size="sm" variant="outline" className="h-8 text-[11px]" onClick={() => void onRotateQr(table)}>
                      Regenerate QR
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 text-[11px]"
                      onClick={() => void onToggleQr(table, !table.qrEnabled)}
                    >
                      {table.qrEnabled ? "Disable QR" : "Enable QR"}
                    </Button>
                    <Button type="button" size="sm" variant="outline" className="h-8 text-[11px]" onClick={() => void copyQrUrl(table)}>
                      Copy URL
                    </Button>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 w-full text-[11px]"
                    onClick={() => toast.message("Print QR will be wired to print module in next phase.")}
                  >
                    Prepare Print QR
                  </Button>
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
                        ? "Paid"
                        : linkedOrder.paymentStatus === "partial"
                        ? "Partial"
                        : "Unpaid"}
                    </span>
                  </div>
                )}

                {!inactive && runtimeKey === "occupied" && (
                  <p className="mt-3 text-[11px] text-muted-foreground">
                    Table status is projection-based. Settle or close open bill from cashier flow.
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
        <p className="text-sm text-muted-foreground text-center mt-12">No tables defined for this outlet. Add one above.</p>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit table" : "New table"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Table / area name" />
            </div>
            <div className="space-y-2">
              <Label>Capacity (optional)</Label>
              <Input
                inputMode="numeric"
                placeholder="Seat count"
                value={formCapacity}
                onChange={(e) => setFormCapacity(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formStatus} onValueChange={(v: "active" | "inactive") => setFormStatus(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Outlet is taken from the header selector (outlet {activeOutletId}).
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void save()} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
