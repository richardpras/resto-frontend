import { useCallback, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Users, CheckCircle2, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ApiHttpError, getApiAccessToken } from "@/lib/api-integration/client";
import {
  createFloorTable,
  deleteFloorTable,
  listFloorTables,
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
  "waiting-payment": { label: "Waiting Payment", color: "bg-warning/10 text-warning border-warning/20", dot: "bg-warning" },
};

function overlayStatusForOrders(tableIdStr: string, orders: Order[]) {
  const open = orders.find(
    (o) =>
      o.tableId === tableIdStr &&
      o.status !== "completed" &&
      o.status !== "cancelled",
  );
  if (!open) return { key: "available" as keyof typeof statusConfig, order: null as Order | null };
  const payment = open.paymentStatus;
  const key =
    payment === "paid" || payment === "partial"
      ? ("waiting-payment" as const)
      : ("occupied" as const);
  return { key, order: open };
}

export default function Tables() {
  const activeOutletId = useOutletStore((s) => s.activeOutletId);
  const orders = useOrderStore((s) => s.orders);
  const updateTableStatus = useOrderStore((s) => s.updateTableStatus);
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
    let waiting = 0;
    for (const row of masterRows) {
      if (row.status !== "active") continue;
      const { key } = overlayStatusForOrders(String(row.id), orders);
      if (key === "available") available++;
      else if (key === "occupied") occupied++;
      else waiting++;
    }
    return { available, occupied, waiting };
  }, [masterRows, orders]);

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
            {counts.available} of {masterRows.filter((r) => r.status === "active").length} active tables available
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
              {key === "available" ? counts.available : key === "occupied" ? counts.occupied : counts.waiting}
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
          const { key: runtimeKey, order: linkedOrder } = overlayStatusForOrders(String(table.id), orders);
          const cfg = statusConfig[runtimeKey];
          const inactive = table.status === "inactive";

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
                  : "border-warning/20"
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
                    : "bg-warning/5"
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

                {!inactive && runtimeKey !== "available" && (
                  <button
                    type="button"
                    onClick={() => updateTableStatus(String(table.id), "available", undefined)}
                    className="mt-3 w-full py-2 rounded-xl text-xs font-medium border border-border hover:bg-muted transition-colors flex items-center justify-center gap-1"
                  >
                    <CheckCircle2 className="h-3 w-3" /> Clear Table
                  </button>
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
