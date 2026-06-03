import { Link } from "react-router-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Plus, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { ApiHttpError, getApiAccessToken } from "@/lib/api-integration/client";
import {
  allocateReservationTable,
  cancelReservation,
  checkInReservation,
  completeReservation,
  confirmReservation,
  createReservation,
  getReservation,
  listAllocatedTables,
  markNoShowReservation,
  seatReservation,
  startReservationService,
  unallocateReservationTable,
  type ReservationApi,
  type ReservationTableAllocationApi,
} from "@/lib/api-integration/reservationEndpoints";
import { listFloorTables, type FloorTableApi } from "@/lib/api-integration/tableEndpoints";
import { useReservationDetailRealtimeSync } from "@/hooks/useReservationTableProjectionSync";
import { useOutletStore } from "@/stores/outletStore";
import { useReservationStore } from "@/stores/reservationStore";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const statusBadgeClass: Record<ReservationApi["status"], string> = {
  draft: "bg-muted text-muted-foreground",
  confirmed: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  checked_in: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  seated: "bg-info/10 text-info",
  completed: "bg-success/10 text-success",
  cancelled: "bg-destructive/10 text-destructive",
  no_show: "bg-muted text-muted-foreground line-through",
};

const statusLabel: Record<ReservationApi["status"], string> = {
  draft: "Draft",
  confirmed: "Confirmed",
  checked_in: "Checked in",
  seated: "Seated",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No show",
};

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

function canManageAllocation(status: ReservationApi["status"]): boolean {
  return status === "draft" || status === "confirmed" || status === "checked_in";
}

export default function Reservations() {
  const activeOutletId = useOutletStore((s) => s.activeOutletId);
  const queryClient = useQueryClient();
  const outletReady = typeof activeOutletId === "number" && activeOutletId >= 1;
  const authed = Boolean(getApiAccessToken());

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [assignTableId, setAssignTableId] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formParty, setFormParty] = useState("2");
  const [formDate, setFormDate] = useState("");
  const [formTime, setFormTime] = useState("");

  const rows = useReservationStore((s) => s.reservations);
  const isLoading = useReservationStore((s) => s.isLoading);
  const startPolling = useReservationStore((s) => s.startPolling);
  const stopPolling = useReservationStore((s) => s.stopPolling);
  const revalidateReservations = useReservationStore((s) => s.revalidateReservations);

  useEffect(() => {
    if (!outletReady || !authed) {
      stopPolling();
      return;
    }
    startPolling({ outletId: activeOutletId! }, 15000);
    return () => stopPolling();
  }, [activeOutletId, authed, outletReady, startPolling, stopPolling]);

  useReservationDetailRealtimeSync(selectedId);

  const { data: detail } = useQuery({
    queryKey: ["reservation", selectedId],
    queryFn: () => getReservation(selectedId!),
    enabled: selectedId !== null && authed,
  });

  const { data: allocations = [], refetch: refetchAllocations } = useQuery({
    queryKey: ["reservation-allocations", selectedId],
    queryFn: () => listAllocatedTables(selectedId!),
    enabled: selectedId !== null && authed,
  });

  const { data: floorTables = [] } = useQuery({
    queryKey: ["floor-tables-reservations", activeOutletId ?? 0],
    queryFn: () => listFloorTables(activeOutletId!),
    enabled: outletReady && authed && selectedId !== null,
  });

  const allocatedTableIds = useMemo(
    () => new Set(allocations.map((a) => a.tableId)),
    [allocations],
  );

  const assignableTables = useMemo(
    () => floorTables.filter((t) => t.status === "active" && !allocatedTableIds.has(t.id)),
    [floorTables, allocatedTableIds],
  );

  const invalidateList = useCallback(() => {
    void revalidateReservations();
    void queryClient.invalidateQueries({ queryKey: ["reservation"] });
    void queryClient.invalidateQueries({ queryKey: ["reservation-allocations"] });
  }, [queryClient, revalidateReservations]);

  useEffect(() => {
    if (!createOpen) return;
    const d = new Date();
    d.setDate(d.getDate() + 1);
    setFormDate(d.toISOString().slice(0, 10));
    setFormTime("18:00");
  }, [createOpen]);

  const onCreate = async () => {
    if (!outletReady || !formName.trim() || !formDate || !formTime) {
      toast.error("Fill required fields");
      return;
    }
    const partySize = Number(formParty);
    if (!Number.isFinite(partySize) || partySize < 1) {
      toast.error("Invalid party size");
      return;
    }
    const reservationAt = new Date(`${formDate}T${formTime}`).toISOString();
    setSaving(true);
    try {
      const created = await createReservation({
        outletId: activeOutletId!,
        customerName: formName.trim(),
        customerPhone: formPhone.trim() || null,
        partySize,
        reservationAt,
      });
      invalidateList();
      setCreateOpen(false);
      setSelectedId(created.id);
      toast.success("Reservation created");
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : "Create failed");
    } finally {
      setSaving(false);
    }
  };

  const runLifecycleAction = async (label: string, action: () => Promise<ReservationApi>) => {
    try {
      await action();
      invalidateList();
      toast.success(label);
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : `${label} failed`);
    }
  };

  const onConfirm = async (id: number) => {
    await runLifecycleAction("Reservation confirmed", () => confirmReservation(id));
  };

  const onCancel = async (id: number) => {
    await runLifecycleAction("Reservation cancelled", () => cancelReservation(id));
  };

  const onCheckIn = async (id: number) => {
    await runLifecycleAction("Guest checked in", () => checkInReservation(id));
  };

  const onSeat = async (id: number) => {
    await runLifecycleAction("Guest seated", () => seatReservation(id));
  };

  const onComplete = async (id: number) => {
    await runLifecycleAction("Reservation completed", () => completeReservation(id));
  };

  const onNoShow = async (id: number) => {
    await runLifecycleAction("Marked as no show", () => markNoShowReservation(id));
  };

  const onStartService = async (id: number) => {
    try {
      const result = await startReservationService(id);
      invalidateList();
      toast.success(`Service started · Order #${result.linkedOrderId}`);
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : "Start service failed");
    }
  };

  const onAssign = async () => {
    if (selectedId === null || !assignTableId) return;
    try {
      await allocateReservationTable(selectedId, { tableId: Number(assignTableId) });
      setAssignTableId("");
      await refetchAllocations();
      toast.success("Table assigned");
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : "Assign failed");
    }
  };

  const onRemove = async (row: ReservationTableAllocationApi) => {
    if (selectedId === null) return;
    try {
      await unallocateReservationTable(selectedId, row.tableId);
      await refetchAllocations();
      toast.success("Table removed");
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : "Remove failed");
    }
  };

  if (!authed) {
    return <div className="p-6 text-sm text-muted-foreground">Sign in to manage reservations.</div>;
  }
  if (!outletReady) {
    return <div className="p-6 text-sm text-muted-foreground">Select an outlet to manage reservations.</div>;
  }

  const activeDetail = detail ?? rows.find((r) => r.id === selectedId) ?? null;
  const allocationAllowed = activeDetail ? canManageAllocation(activeDetail.status) : false;

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarDays className="h-6 w-6" /> Reservations
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Create bookings without table assignment; assign tables when ready.
          </p>
        </div>
        <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> New reservation
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading reservations…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No reservations for this outlet.</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {rows.map((row) => (
            <button
              key={row.id}
              type="button"
              onClick={() => setSelectedId(row.id)}
              className="text-left rounded-xl border border-border/60 bg-card p-4 hover:border-primary/40 transition-colors"
            >
              <div className="font-semibold">{row.customerName}</div>
              <div className="text-xs text-muted-foreground mt-1">{row.reservationCode}</div>
              <div className="text-sm mt-2">{formatDateTime(row.reservationAt)}</div>
              <div className="text-sm text-muted-foreground">{row.partySize} guests</div>
              <span className={`inline-block mt-2 text-xs px-2 py-0.5 rounded-md font-medium ${statusBadgeClass[row.status]}`}>
                {statusLabel[row.status]}
              </span>
            </button>
          ))}
        </div>
      )}

      <Dialog open={selectedId !== null} onOpenChange={(open) => !open && setSelectedId(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Reservation detail</DialogTitle>
          </DialogHeader>
          {activeDetail && (
            <div className="space-y-4 text-sm">
              <div>
                <div className="font-medium text-base">{activeDetail.customerName}</div>
                <div className="text-muted-foreground">{activeDetail.customerPhone ?? "—"}</div>
                <div className="mt-1">{formatDateTime(activeDetail.reservationAt)} · {activeDetail.partySize} pax</div>
                <div className="mt-2">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusBadgeClass[activeDetail.status]}`}>
                    {statusLabel[activeDetail.status]}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {activeDetail.status === "draft" && (
                  <>
                    <Button type="button" size="sm" variant="secondary" onClick={() => onConfirm(activeDetail.id)}>
                      Confirm
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => onCancel(activeDetail.id)}>
                      Cancel
                    </Button>
                  </>
                )}
                {activeDetail.status === "confirmed" && (
                  <>
                    <Button type="button" size="sm" variant="secondary" onClick={() => onCheckIn(activeDetail.id)}>
                      Check in
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => onCancel(activeDetail.id)}>
                      Cancel
                    </Button>
                    <Button type="button" size="sm" variant="destructive" onClick={() => onNoShow(activeDetail.id)}>
                      No show
                    </Button>
                  </>
                )}
                {activeDetail.status === "checked_in" && (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={allocations.length === 0}
                    onClick={() => onSeat(activeDetail.id)}
                  >
                    Seat guest
                  </Button>
                )}
                {activeDetail.status === "seated" && (
                  <>
                    {!activeDetail.linkedOrderId ? (
                      <Button type="button" size="sm" variant="secondary" onClick={() => onStartService(activeDetail.id)}>
                        Start service
                      </Button>
                    ) : (
                      <div className="w-full space-y-2">
                        <p className="text-xs text-muted-foreground">
                          Linked order #{activeDetail.linkedOrderId}
                          {activeDetail.serviceStartedAt
                            ? ` · started ${formatDateTime(activeDetail.serviceStartedAt)}`
                            : ""}
                        </p>
                        <Button type="button" size="sm" variant="outline" asChild>
                          <Link to="/pos">Open POS</Link>
                        </Button>
                      </div>
                    )}
                    <Button type="button" size="sm" variant="secondary" onClick={() => onComplete(activeDetail.id)}>
                      Complete
                    </Button>
                  </>
                )}
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-2">Allocated tables</h3>
                {allocations.length === 0 ? (
                  <p className="text-muted-foreground text-xs mb-3">No tables assigned yet.</p>
                ) : (
                  <ul className="space-y-2 mb-3">
                    {allocations.map((a) => (
                      <li
                        key={a.id}
                        className="flex items-center justify-between rounded-lg border px-3 py-2"
                      >
                        <span>
                          {a.tableName ?? `Table ${a.tableId}`}
                          {a.tableCode ? ` (${a.tableCode})` : ""}
                        </span>
                        {allocationAllowed && (
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            aria-label="Remove table"
                            onClick={() => onRemove(a)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}

                {allocationAllowed && (
                  <div className="flex flex-wrap gap-2 items-end">
                    <div className="flex-1 min-w-[140px]">
                      <Label className="text-xs">Assign table</Label>
                      <Select value={assignTableId} onValueChange={setAssignTableId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select table" />
                        </SelectTrigger>
                        <SelectContent>
                          {assignableTables.map((t: FloorTableApi) => (
                            <SelectItem key={t.id} value={String(t.id)}>
                              {t.name}
                              {t.capacity != null ? ` (${t.capacity} seats)` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button type="button" size="sm" disabled={!assignTableId} onClick={onAssign}>
                      <UserPlus className="h-4 w-4 mr-1" /> Assign table
                    </Button>
                  </div>
                )}
                {!allocationAllowed && (
                  <p className="text-xs text-muted-foreground">
                    Table assignment is locked for this reservation status.
                  </p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New reservation</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Customer name</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={formPhone} onChange={(e) => setFormPhone(e.target.value)} />
            </div>
            <div>
              <Label>Party size</Label>
              <Input type="number" min={1} value={formParty} onChange={(e) => setFormParty(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Date</Label>
                <Input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
              </div>
              <div>
                <Label>Time</Label>
                <Input type="time" value={formTime} onChange={(e) => setFormTime(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={saving} onClick={onCreate}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
