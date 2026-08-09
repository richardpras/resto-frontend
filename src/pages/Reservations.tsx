import { Link, useNavigate } from "react-router-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Link2, Minus, Plus, Search, Trash2, Upload, UserPlus, UtensilsCrossed, X } from "lucide-react";
import { toast } from "sonner";
import { openReservationInPosFlow } from "@/components/reservations/openReservationInPosFlow";
import { ApiHttpError, getApiAccessToken } from "@/lib/api-integration/client";
import {
  allocateReservationTable,
  approveReservationDeposit,
  cancelReservation,
  checkInReservation,
  completeReservation,
  confirmReservation,
  createReservationInvite,
  getReservation,
  listAllocatedTables,
  listPendingDeposits,
  listReservationMenu,
  markNoShowReservation,
  rejectReservationDeposit,
  unallocateReservationTable,
  type ReservationApi,
  type ReservationMenuItemApi,
  type ReservationTableAllocationApi,
} from "@/lib/api-integration/reservationEndpoints";
import { getOutletReservationSettings } from "@/lib/api-integration/settingsDomainEndpoints";
import { listFloorTables, type FloorTableApi } from "@/lib/api-integration/tableEndpoints";
import { ReservationDepositProofPreviewDialog } from "@/components/reservations/ReservationDepositProofPreviewDialog";
import { useReservationDetailRealtimeSync } from "@/hooks/useReservationTableProjectionSync";
import { useOfflineReservation } from "@/hooks/useOfflineReservation";
import { useOutletStore } from "@/stores/outletStore";
import { useReservationStore } from "@/stores/reservationStore";
import { useMemberStore, type Member } from "@/stores/memberStore";
import { useReservationPosBridgeStore } from "@/stores/reservationPosBridgeStore";
import { useOfflineSyncStore } from "@/stores/offlineSyncStore";
import { isLocalReservationNumericId, loadLocalReservationMappingByNumericId } from "@/mobile/offline/offlineReservationMapping";
import { saveReservationMenuCache, loadReservationMenuCache } from "@/mobile/offline/offlineReservationMenuDb";
import { queueReservationProofFile, flushPendingReservationProofs } from "@/mobile/offline/flushReservationProofs";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { dialogScroll, dialogSize } from "@/lib/ui/dialogSizes";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useOpsTranslation } from "@/i18n/useOpsTranslation";
import { cn } from "@/lib/utils";

const statusBadgeClass: Record<ReservationApi["status"], string> = {
  draft: "bg-muted text-muted-foreground",
  pending_deposit: "bg-orange-500/10 text-orange-700 dark:text-orange-300",
  deposit_submitted: "bg-purple-500/10 text-purple-700 dark:text-purple-300",
  confirmed: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  checked_in: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  seated: "bg-info/10 text-info",
  completed: "bg-success/10 text-success",
  cancelled: "bg-destructive/10 text-destructive",
  no_show: "bg-muted text-muted-foreground line-through",
};

type CartLine = { menuItemId: number; name: string; price: number; qty: number };

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function toDateKey(value: Date | string): string {
  const d = typeof value === "string" ? new Date(value) : value;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfLocalDay(value = new Date()): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function isPastDate(value: Date): boolean {
  return startOfLocalDay(value).getTime() < startOfLocalDay().getTime();
}

function canManageAllocation(status: ReservationApi["status"]): boolean {
  return status === "draft" || status === "confirmed" || status === "checked_in";
}

export default function Reservations() {
  const { t } = useOpsTranslation();
  const navigate = useNavigate();
  const activeOutletId = useOutletStore((s) => s.activeOutletId);
  const queryClient = useQueryClient();
  const outletReady = typeof activeOutletId === "number" && activeOutletId >= 1;
  const authed = Boolean(getApiAccessToken());
  const isOnline = useOfflineSyncStore((s) => s.isOnline);
  const { isOfflineMode, createReservationWithOffline } = useOfflineReservation(
    outletReady ? activeOutletId! : null,
  );

  const requireOnline = useCallback(
    (actionLabel?: string): boolean => {
      if (isOnline) return true;
      toast.error(
        t("reservations.actionRequiresInternet", {
          action: actionLabel ?? t("reservations.thisAction"),
        }),
      );
      return false;
    },
    [isOnline, t],
  );

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [month, setMonth] = useState<Date>(() => new Date());
  const [assignTableId, setAssignTableId] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [generatingInvite, setGeneratingInvite] = useState(false);
  const [proofPreview, setProofPreview] = useState<{
    reservationId: number;
    proofId: number;
    filename: string;
  } | null>(null);

  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formParty, setFormParty] = useState("2");
  const [formDate, setFormDate] = useState("");
  const [formTime, setFormTime] = useState("18:00");
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [memberSearch, setMemberSearch] = useState("");
  const [showMemberPicker, setShowMemberPicker] = useState(false);
  const [menuSearch, setMenuSearch] = useState("");
  const [menuCategory, setMenuCategory] = useState<string>("all");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [openingPos, setOpeningPos] = useState(false);

  const searchMembersForOutlet = useMemberStore((s) => s.searchMembersForOutlet);
  const memberSearchResults = useMemberStore((s) => s.searchResults);
  const memberSearchLoading = useMemberStore((s) => s.searchLoading);

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
    enabled: selectedId !== null && authed && !isLocalReservationNumericId(selectedId!),
  });

  const { data: allocations = [], refetch: refetchAllocations } = useQuery({
    queryKey: ["reservation-allocations", selectedId],
    queryFn: () => listAllocatedTables(selectedId!),
    enabled: selectedId !== null && authed && !isLocalReservationNumericId(selectedId!),
  });

  const { data: floorTables = [] } = useQuery({
    queryKey: ["floor-tables-reservations", activeOutletId ?? 0],
    queryFn: () => listFloorTables(activeOutletId!),
    enabled: outletReady && authed && selectedId !== null,
  });

  const { data: pendingDeposits = [], refetch: refetchPendingDeposits } = useQuery({
    queryKey: ["reservation-pending-deposits", activeOutletId ?? 0],
    queryFn: () => listPendingDeposits(activeOutletId!),
    enabled: outletReady && authed && isOnline,
    refetchInterval: isOnline ? 30000 : false,
  });

  const { data: menuItems = [], isLoading: menuLoading } = useQuery({
    queryKey: ["reservation-menu", activeOutletId ?? 0],
    queryFn: async () => {
      try {
        const items = await listReservationMenu(activeOutletId!);
        await saveReservationMenuCache(activeOutletId!, items).catch(() => undefined);
        return items;
      } catch (error) {
        const cached = await loadReservationMenuCache(activeOutletId!).catch(() => null);
        if (cached?.items?.length) return cached.items;
        throw error;
      }
    },
    enabled: outletReady && authed && createOpen,
  });

  const { data: reservationSettings } = useQuery({
    queryKey: ["outlet-reservation-settings", activeOutletId ?? 0],
    queryFn: () => getOutletReservationSettings(activeOutletId!),
    enabled: outletReady && authed && createOpen,
  });

  const allocatedTableIds = useMemo(
    () => new Set(allocations.map((a) => a.tableId)),
    [allocations],
  );

  const assignableTables = useMemo(
    () => floorTables.filter((table) => table.status === "active" && !allocatedTableIds.has(table.id)),
    [floorTables, allocatedTableIds],
  );

  const reservationsByDate = useMemo(() => {
    const map = new Map<string, ReservationApi[]>();
    for (const row of rows) {
      const key = toDateKey(row.reservationAt);
      const list = map.get(key) ?? [];
      list.push(row);
      map.set(key, list);
    }
    return map;
  }, [rows]);

  const monthRows = useMemo(() => {
    const start = new Date(month.getFullYear(), month.getMonth(), 1);
    const end = new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59);
    return rows.filter((row) => {
      const at = new Date(row.reservationAt);
      return at >= start && at <= end;
    });
  }, [month, rows]);

  const depositPercent = Math.max(50, reservationSettings?.depositPercent ?? 50);
  const cartSubtotal = useMemo(
    () => cart.reduce((sum, line) => sum + line.price * line.qty, 0),
    [cart],
  );
  const requiredDepositPreview = Math.round((cartSubtotal * depositPercent) / 100);

  const menuCategories = useMemo(() => {
    const set = new Set<string>();
    for (const item of menuItems) {
      const cat = (item.category ?? "").trim();
      if (cat) set.add(cat);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [menuItems]);

  const filteredMenu = useMemo(() => {
    const q = menuSearch.trim().toLowerCase();
    return menuItems.filter((item) => {
      const cat = (item.category ?? "").trim();
      if (menuCategory !== "all" && cat !== menuCategory) return false;
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        cat.toLowerCase().includes(q)
      );
    });
  }, [menuItems, menuSearch, menuCategory]);

  const cartQtyById = useMemo(() => {
    const map = new Map<number, number>();
    for (const line of cart) map.set(line.menuItemId, line.qty);
    return map;
  }, [cart]);

  const invalidateList = useCallback(() => {
    void revalidateReservations();
    void queryClient.invalidateQueries({ queryKey: ["reservation"] });
    void queryClient.invalidateQueries({ queryKey: ["reservation-allocations"] });
    void queryClient.invalidateQueries({ queryKey: ["reservation-pending-deposits"] });
  }, [queryClient, revalidateReservations]);

  const openCreateForDate = useCallback((date: Date) => {
    if (isPastDate(date)) {
      toast.error(t("reservations.dateNotPast"));
      return;
    }
    setFormDate(toDateKey(date));
    setFormTime("18:00");
    setFormName("");
    setFormPhone("");
    setFormParty("2");
    setSelectedMember(null);
    setMemberSearch("");
    setShowMemberPicker(false);
    setMenuSearch("");
    setMenuCategory("all");
    setCart([]);
    setCreateOpen(true);
  }, [t]);

  useEffect(() => {
    if (!showMemberPicker || typeof activeOutletId !== "number") return;
    void searchMembersForOutlet(activeOutletId, memberSearch).catch(() => undefined);
  }, [activeOutletId, memberSearch, searchMembersForOutlet, showMemberPicker]);

  const statusLabel = (status: ReservationApi["status"]) => t(`reservations.status.${status}`);

  const addMenuItem = (item: ReservationMenuItemApi) => {
    const menuItemId = Number(item.id);
    setCart((prev) => {
      const existing = prev.find((line) => line.menuItemId === menuItemId);
      if (existing) {
        return prev.map((line) =>
          line.menuItemId === menuItemId ? { ...line, qty: line.qty + 1 } : line,
        );
      }
      return [...prev, { menuItemId, name: item.name, price: item.price, qty: 1 }];
    });
  };

  const updateCartQty = (menuItemId: number, qty: number) => {
    setCart((prev) => {
      if (qty <= 0) return prev.filter((line) => line.menuItemId !== menuItemId);
      return prev.map((line) => (line.menuItemId === menuItemId ? { ...line, qty } : line));
    });
  };

  const onCreate = async () => {
    if (!outletReady || !formName.trim() || !formDate || !formTime) {
      toast.error(t("reservations.fillRequired"));
      return;
    }
    if (isPastDate(new Date(`${formDate}T12:00:00`))) {
      toast.error(t("reservations.dateNotPast"));
      return;
    }
    if (cart.length === 0) {
      toast.error(t("reservations.preorderRequired"));
      return;
    }
    const partySize = Number(formParty);
    if (!Number.isFinite(partySize) || partySize < 1) {
      toast.error(t("reservations.invalidPartySize"));
      return;
    }
    const reservationAt = new Date(`${formDate}T${formTime}`).toISOString();
    setSaving(true);
    try {
      const created = await createReservationWithOffline({
        outletId: activeOutletId!,
        customerName: formName.trim(),
        customerPhone: formPhone.trim() || null,
        memberId: selectedMember ? Number(selectedMember.id) : null,
        partySize,
        reservationAt,
        items: cart.map((line) => ({ menuItemId: line.menuItemId, qty: line.qty })),
      });
      invalidateList();
      setCreateOpen(false);
      setSelectedId(created.id);
      toast.success(
        isOfflineMode ? t("reservations.createdOffline") : t("reservations.created"),
      );
    } catch (e) {
      toast.error(e instanceof ApiHttpError || e instanceof Error ? e.message : t("reservations.createFailed"));
    } finally {
      setSaving(false);
    }
  };

  const runLifecycleAction = async (successKey: string, action: () => Promise<ReservationApi>) => {
    if (!requireOnline()) return;
    try {
      await action();
      invalidateList();
      toast.success(t(successKey));
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : t("shared.somethingWrong"));
    }
  };

  const onConfirm = async (id: number) => {
    await runLifecycleAction("reservations.confirmedToast", () => confirmReservation(id));
  };

  const onCancel = async (id: number) => {
    await runLifecycleAction("reservations.cancelledToast", () => cancelReservation(id));
  };

  const onCheckIn = async (id: number) => {
    await runLifecycleAction("reservations.checkedIn", () => checkInReservation(id));
  };

  const onComplete = async (id: number) => {
    await runLifecycleAction("reservations.completedToast", () => completeReservation(id));
  };

  const onNoShow = async (id: number) => {
    await runLifecycleAction("reservations.noShowToast", () => markNoShowReservation(id));
  };

  const onApproveDeposit = async (id: number) => {
    await runLifecycleAction("reservations.depositApproved", () => approveReservationDeposit(id));
    void refetchPendingDeposits();
  };

  const onRejectDeposit = async (id: number) => {
    if (!requireOnline(t("reservations.rejectDeposit"))) return;
    const reason = window.prompt(t("reservations.depositRejectReason"));
    try {
      await rejectReservationDeposit(id, reason ?? undefined);
      invalidateList();
      void refetchPendingDeposits();
      toast.success(t("reservations.depositRejected"));
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : t("shared.somethingWrong"));
    }
  };

  const onUploadProof = async (id: number, file: File | null) => {
    if (!file || !outletReady) return;
    setUploadingProof(true);
    try {
      let localRef = `server:rsv-${id}`;
      let serverId: number | null = isLocalReservationNumericId(id) ? null : id;

      if (isLocalReservationNumericId(id)) {
        const mapping = await loadLocalReservationMappingByNumericId(id);
        if (!mapping) {
          throw new Error(t("reservations.proofMappingMissing"));
        }
        localRef = mapping.localRef;
        serverId = mapping.serverReservationId ?? null;
      }

      await queueReservationProofFile({
        outletId: activeOutletId!,
        localRef,
        serverReservationId: serverId,
        file,
      });

      if (isOnline && serverId && serverId > 0) {
        await flushPendingReservationProofs(activeOutletId!);
        invalidateList();
        void refetchPendingDeposits();
        toast.success(t("reservations.proofUploaded"));
      } else {
        toast.success(t("reservations.proofQueuedOffline"));
      }
    } catch (e) {
      toast.error(e instanceof ApiHttpError || e instanceof Error ? e.message : t("reservations.proofUploadFailed"));
    } finally {
      setUploadingProof(false);
    }
  };

  const onOpenInPos = async (id: number) => {
    if (!requireOnline(t("reservations.openPos"))) return;
    if (isLocalReservationNumericId(id)) {
      toast.error(t("reservations.syncBeforePos"));
      return;
    }
    setOpeningPos(true);
    try {
      await openReservationInPosFlow(id, {
        setFromOpenInPos: useReservationPosBridgeStore.getState().setFromOpenInPos,
        navigate,
      });
      invalidateList();
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : t("reservations.openPosFailed"));
    } finally {
      setOpeningPos(false);
    }
  };

  const onStartService = async (id: number) => {
    await onOpenInPos(id);
  };

  const onGenerateInviteLink = async () => {
    if (!requireOnline(t("reservations.generateInviteLink"))) return;
    setGeneratingInvite(true);
    try {
      const invite = await createReservationInvite(activeOutletId!);
      const shareUrl =
        invite.absoluteUrl ??
        `${window.location.origin}${invite.urlPath.startsWith("/") ? invite.urlPath : `/${invite.urlPath}`}`;
      try {
        await navigator.clipboard.writeText(shareUrl);
        toast.success(
          t("reservations.inviteCopied", {
            at: new Date(invite.expiresAt).toLocaleString(),
          }),
        );
      } catch {
        toast.success(
          t("reservations.inviteCreated", {
            url: shareUrl,
            at: new Date(invite.expiresAt).toLocaleString(),
          }),
        );
      }
    } catch (e) {
      toast.error(e instanceof ApiHttpError || e instanceof Error ? e.message : t("reservations.inviteFailed"));
    } finally {
      setGeneratingInvite(false);
    }
  };

  const onAssign = async () => {
    if (!requireOnline(t("reservations.assignTable"))) return;
    if (selectedId === null || !assignTableId) return;
    if (isLocalReservationNumericId(selectedId)) {
      toast.error(t("reservations.syncBeforeLifecycle"));
      return;
    }
    try {
      await allocateReservationTable(selectedId, { tableId: Number(assignTableId) });
      setAssignTableId("");
      await refetchAllocations();
      toast.success(t("reservations.tableAssigned"));
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : t("reservations.assignFailed"));
    }
  };

  const onRemove = async (row: ReservationTableAllocationApi) => {
    if (!requireOnline(t("reservations.assignTable"))) return;
    if (selectedId === null) return;
    try {
      await unallocateReservationTable(selectedId, row.tableId);
      await refetchAllocations();
      toast.success(t("reservations.tableRemoved"));
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : t("reservations.removeFailed"));
    }
  };

  if (!authed) {
    return <div className="p-6 text-sm text-muted-foreground">{t("reservations.signIn")}</div>;
  }
  if (!outletReady) {
    return <div className="p-6 text-sm text-muted-foreground">{t("reservations.selectOutlet")}</div>;
  }

  const activeDetail = detail ?? rows.find((r) => r.id === selectedId) ?? null;
  const allocationAllowed = activeDetail ? canManageAllocation(activeDetail.status) : false;

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarDays className="h-6 w-6" /> {t("reservations.title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t("reservations.calendarSubtitle")}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={generatingInvite}
            onClick={() => void onGenerateInviteLink()}
          >
            <Link2 className="h-4 w-4 mr-1" />
            {generatingInvite ? t("reservations.generatingInvite") : t("reservations.generateInviteLink")}
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => openCreateForDate(new Date())}>
            <Plus className="h-4 w-4 mr-1" /> {t("reservations.newReservation")}
          </Button>
        </div>
      </div>

      {pendingDeposits.length > 0 ? (
        <div className="mb-6 rounded-xl border border-purple-500/30 bg-purple-500/5 p-4">
          <h2 className="font-semibold mb-2">{t("reservations.pendingDepositsTitle", { n: pendingDeposits.length })}</h2>
          <div className="flex flex-wrap gap-2">
            {pendingDeposits.map((row) => (
              <Button key={row.id} type="button" size="sm" variant="outline" onClick={() => setSelectedId(row.id)}>
                {row.customerName} · {statusLabel(row.status)}
              </Button>
            ))}
          </div>
        </div>
      ) : null}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">{t("reservations.loading")}</p>
      ) : (
        <div className="rounded-xl border border-border/60 bg-card p-2 md:p-4 overflow-x-auto">
          <Calendar
            mode="single"
            month={month}
            onMonthChange={setMonth}
            disabled={{ before: startOfLocalDay() }}
            onDayClick={(day, modifiers) => {
              if (modifiers.disabled) return;
              openCreateForDate(day);
            }}
            className="w-full"
            classNames={{
              months: "flex flex-col w-full",
              month: "space-y-3 w-full",
              table: "w-full border-collapse",
              head_row: "flex w-full",
              head_cell: "text-muted-foreground rounded-md font-normal text-[0.8rem] flex-1 min-w-[2.5rem]",
              row: "flex w-full mt-1",
              cell: "relative p-0.5 text-center text-sm flex-1 min-w-[2.5rem] min-h-[5.5rem] md:min-h-[7rem]",
              day: cn(
                "h-full w-full rounded-md border border-transparent p-1 font-normal hover:bg-muted/60 hover:border-border aria-selected:opacity-100",
              ),
              day_today: "bg-accent/40 text-accent-foreground",
              day_outside: "text-muted-foreground opacity-40",
              day_disabled: "text-muted-foreground opacity-45 hover:bg-transparent hover:border-transparent cursor-default",
              day_selected: "bg-transparent text-foreground",
            }}
            components={{
              DayContent: ({ date }) => {
                const key = toDateKey(date);
                const dayRows = reservationsByDate.get(key) ?? [];
                const past = isPastDate(date);
                return (
                  <div className="flex h-full w-full flex-col items-stretch gap-0.5 text-left">
                    <span className="text-xs font-medium px-0.5">{date.getDate()}</span>
                    {dayRows.length === 0 ? (
                      <span className="text-[10px] text-muted-foreground px-0.5 hidden md:block">
                        {past ? "—" : t("reservations.calendarEmptyDay")}
                      </span>
                    ) : (
                      <div className="flex flex-col gap-0.5 min-w-0">
                        {dayRows.slice(0, 3).map((row) => (
                          <span
                            key={row.id}
                            role="button"
                            tabIndex={0}
                            className={cn(
                              "truncate rounded px-1 py-0.5 text-[10px] md:text-xs leading-tight text-left cursor-pointer",
                              statusBadgeClass[row.status],
                            )}
                            title={`${row.customerName} · ${statusLabel(row.status)}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedId(row.id);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.stopPropagation();
                                e.preventDefault();
                                setSelectedId(row.id);
                              }
                            }}
                          >
                            {row.customerName}
                            {isLocalReservationNumericId(row.id) ? " · …" : ""}
                          </span>
                        ))}
                        {dayRows.length > 3 ? (
                          <span className="text-[10px] text-muted-foreground px-0.5">
                            {t("reservations.calendarMore", { n: dayRows.length - 3 })}
                          </span>
                        ) : null}
                      </div>
                    )}
                  </div>
                );
              },
            }}
          />
          {monthRows.length === 0 ? (
            <p className="text-sm text-muted-foreground mt-3 px-2">{t("reservations.calendarEmptyMonth")}</p>
          ) : null}
        </div>
      )}

      <Dialog open={selectedId !== null} onOpenChange={(open) => !open && setSelectedId(null)}>
        <DialogContent className={`${dialogSize.lg} ${dialogScroll}`}>
          <DialogHeader>
            <DialogTitle>{t("reservations.detailTitle")}</DialogTitle>
          </DialogHeader>
          {activeDetail && (
            <div className="space-y-4 text-sm">
              <div>
                <div className="font-medium text-base">{activeDetail.customerName}</div>
                <div className="text-muted-foreground">{activeDetail.customerPhone ?? "—"}</div>
                {activeDetail.memberId ? (
                  <div className="text-xs text-primary mt-1">
                    <Link to={`/members/${activeDetail.memberId}`} className="hover:underline">
                      {activeDetail.memberNo ?? t("reservations.memberLinked")} {activeDetail.memberName ? `· ${activeDetail.memberName}` : ""}
                    </Link>
                  </div>
                ) : null}
                <div className="mt-1">
                  {formatDateTime(activeDetail.reservationAt)} · {t("reservations.partySize", { n: activeDetail.partySize })}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusBadgeClass[activeDetail.status]}`}>
                    {statusLabel(activeDetail.status)}
                  </span>
                  {isLocalReservationNumericId(activeDetail.id) ? (
                    <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-amber-500/15 text-amber-800 dark:text-amber-200">
                      {t("reservations.pendingSync")}
                    </span>
                  ) : null}
                  {!isOnline ? (
                    <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-muted text-muted-foreground">
                      {t("reservations.offlineMode")}
                    </span>
                  ) : null}
                </div>
              </div>

              {(activeDetail.requiredDepositAmount ?? 0) > 0 || activeDetail.linkedOrder ? (
                <div className="rounded-lg border p-3 space-y-2">
                  <div className="font-medium">{t("reservations.depositSection")}</div>
                  {(activeDetail.requiredDepositAmount ?? 0) > 0 ? (
                    <div>{t("reservations.requiredDeposit", { amount: activeDetail.requiredDepositAmount })}</div>
                  ) : null}
                  {activeDetail.approvedDepositAmount != null ? (
                    <div>{t("reservations.approvedDeposit", { amount: activeDetail.approvedDepositAmount })}</div>
                  ) : null}
                  {activeDetail.linkedOrder?.items?.length ? (
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      <div className="font-medium text-foreground">{t("reservations.preorderItems")}</div>
                      {activeDetail.linkedOrder.items.map((item) => (
                        <div key={item.id}>
                          {item.qty}× {item.name}
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {activeDetail.depositProofs?.map((proof) => (
                    <button
                      key={proof.id}
                      type="button"
                      className="text-sm text-primary hover:underline block text-left"
                      onClick={() => {
                        setProofPreview({
                          reservationId: activeDetail.id,
                          proofId: proof.id,
                          filename: proof.originalFilename,
                        });
                      }}
                    >
                      {proof.originalFilename}
                    </button>
                  ))}
                  {activeDetail.status === "pending_deposit" ? (
                    <Label className="flex items-center gap-2 cursor-pointer text-sm">
                      <Upload className="h-4 w-4" />
                      <span>{uploadingProof ? t("shared.loading") : t("reservations.uploadProof")}</span>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        className="sr-only"
                        disabled={uploadingProof}
                        onChange={(e) => {
                          const file = e.target.files?.[0] ?? null;
                          e.target.value = "";
                          void onUploadProof(activeDetail.id, file);
                        }}
                      />
                    </Label>
                  ) : null}
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                {activeDetail.status === "deposit_submitted" && (
                  <>
                    <Button type="button" size="sm" variant="secondary" onClick={() => onApproveDeposit(activeDetail.id)}>
                      {t("reservations.approveDeposit")}
                    </Button>
                    <Button type="button" size="sm" variant="destructive" onClick={() => onRejectDeposit(activeDetail.id)}>
                      {t("reservations.rejectDeposit")}
                    </Button>
                  </>
                )}
                {activeDetail.status === "draft" && (
                  <>
                    <Button type="button" size="sm" variant="secondary" onClick={() => onConfirm(activeDetail.id)}>
                      {t("reservations.confirm")}
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => onCancel(activeDetail.id)}>
                      {t("shared.cancel")}
                    </Button>
                  </>
                )}
                {activeDetail.status === "pending_deposit" && (
                  <Button type="button" size="sm" variant="outline" onClick={() => onCancel(activeDetail.id)}>
                    {t("shared.cancel")}
                  </Button>
                )}
                {activeDetail.status === "confirmed" && (
                  <>
                    <Button type="button" size="sm" variant="secondary" onClick={() => onCheckIn(activeDetail.id)}>
                      {t("reservations.checkIn")}
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => onCancel(activeDetail.id)}>
                      {t("shared.cancel")}
                    </Button>
                    <Button type="button" size="sm" variant="destructive" onClick={() => onNoShow(activeDetail.id)}>
                      {t("reservations.noShow")}
                    </Button>
                  </>
                )}
                {activeDetail.status === "checked_in" && (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={allocations.length === 0 || openingPos}
                      onClick={() => onStartService(activeDetail.id)}
                    >
                      {t("reservations.startAndOpenPos")}
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => onCancel(activeDetail.id)}>
                      {t("shared.cancel")}
                    </Button>
                  </>
                )}
                {activeDetail.status === "seated" && (
                  <>
                    {!activeDetail.linkedOrderId ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={openingPos}
                        onClick={() => onStartService(activeDetail.id)}
                      >
                        {t("reservations.startAndOpenPos")}
                      </Button>
                    ) : (
                      <div className="w-full space-y-2">
                        <p className="text-xs text-muted-foreground">
                          {t("reservations.linkedOrder", { id: activeDetail.linkedOrderId })}
                          {activeDetail.serviceStartedAt
                            ? ` · ${t("reservations.startedAt", { at: formatDateTime(activeDetail.serviceStartedAt) })}`
                            : ""}
                        </p>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={openingPos}
                          onClick={() => onOpenInPos(activeDetail.id)}
                        >
                          {t("reservations.continueInPos")}
                        </Button>
                      </div>
                    )}
                    <Button type="button" size="sm" variant="secondary" onClick={() => onComplete(activeDetail.id)}>
                      {t("reservations.complete")}
                    </Button>
                  </>
                )}
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-2">{t("reservations.allocatedTables")}</h3>
                {allocations.length === 0 ? (
                  <p className="text-muted-foreground text-xs mb-3">{t("reservations.noTablesAssigned")}</p>
                ) : (
                  <ul className="space-y-2 mb-3">
                    {allocations.map((a) => (
                      <li
                        key={a.id}
                        className="flex items-center justify-between rounded-lg border px-3 py-2"
                      >
                        <span>
                          {a.tableName ?? t("reservations.tableFallback", { id: a.tableId })}
                          {a.tableCode ? ` (${a.tableCode})` : ""}
                        </span>
                        {allocationAllowed && (
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            aria-label={t("reservations.removeTableAria")}
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
                      <Label className="text-xs">{t("reservations.assignTable")}</Label>
                      <Select value={assignTableId} onValueChange={setAssignTableId}>
                        <SelectTrigger>
                          <SelectValue placeholder={t("reservations.selectTable")} />
                        </SelectTrigger>
                        <SelectContent>
                          {assignableTables.map((table: FloorTableApi) => (
                            <SelectItem key={table.id} value={String(table.id)}>
                              {table.name}
                              {table.capacity != null ? ` (${t("reservations.seats", { n: table.capacity })})` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button type="button" size="sm" disabled={!assignTableId} onClick={onAssign}>
                      <UserPlus className="h-4 w-4 mr-1" /> {t("reservations.assignTable")}
                    </Button>
                  </div>
                )}
                {!allocationAllowed && (
                  <p className="text-xs text-muted-foreground">{t("reservations.tableLocked")}</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className={`${dialogSize.lg} ${dialogScroll}`}>
          <DialogHeader>
            <DialogTitle>{t("reservations.createTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>{t("reservations.memberOptional")}</Label>
              {selectedMember ? (
                <div className="flex items-center justify-between rounded-lg border px-3 py-2 mt-1">
                  <div className="text-sm">
                    <p className="font-medium">{selectedMember.name}</p>
                    <p className="text-xs text-muted-foreground">{selectedMember.memberNo ?? selectedMember.phone}</p>
                  </div>
                  <Button type="button" size="icon" variant="ghost" onClick={() => setSelectedMember(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Button type="button" variant="outline" size="sm" className="mt-1" onClick={() => setShowMemberPicker(true)}>
                  {t("reservations.selectMember")}
                </Button>
              )}
            </div>
            <div>
              <Label>{t("reservations.customerName")}</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} />
            </div>
            <div>
              <Label>{t("reservations.phone")}</Label>
              <Input value={formPhone} onChange={(e) => setFormPhone(e.target.value)} />
            </div>
            <div>
              <Label>{t("reservations.partySizeLabel")}</Label>
              <Input type="number" min={1} value={formParty} onChange={(e) => setFormParty(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>{t("reservations.date")}</Label>
                <Input type="date" value={formDate} readOnly className="bg-muted/40" />
              </div>
              <div>
                <Label>{t("reservations.time")}</Label>
                <Input type="time" value={formTime} onChange={(e) => setFormTime(e.target.value)} />
              </div>
            </div>

            <div className="border-t pt-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Label className="text-base">{t("reservations.preorderTitle")}</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">{t("reservations.preorderHint")}</p>
                </div>
                {cart.length > 0 ? (
                  <span className="shrink-0 rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                    {t("reservations.preorderSelectedCount", { n: cart.reduce((s, l) => s + l.qty, 0) })}
                  </span>
                ) : null}
              </div>

              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-8"
                  placeholder={t("reservations.preorderSearch")}
                  value={menuSearch}
                  onChange={(e) => setMenuSearch(e.target.value)}
                />
              </div>

              {menuCategories.length > 1 ? (
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setMenuCategory("all")}
                    className={cn(
                      "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                      menuCategory === "all"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80",
                    )}
                  >
                    {t("reservations.preorderCategoryAll")}
                  </button>
                  {menuCategories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setMenuCategory(cat)}
                      className={cn(
                        "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                        menuCategory === cat
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80",
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              ) : null}

              <div className="max-h-56 overflow-y-auto rounded-lg border divide-y bg-background">
                {menuLoading ? (
                  <p className="p-4 text-sm text-muted-foreground">{t("shared.loading")}</p>
                ) : filteredMenu.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
                    <UtensilsCrossed className="h-8 w-8 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">{t("reservations.preorderEmptyMenu")}</p>
                  </div>
                ) : (
                  filteredMenu.map((item) => {
                    const menuItemId = Number(item.id);
                    const qty = cartQtyById.get(menuItemId) ?? 0;
                    return (
                      <div
                        key={item.id}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5",
                          qty > 0 && "bg-primary/5",
                        )}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{item.name}</p>
                          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                            {item.category ? <span>{item.category}</span> : null}
                            <span className="font-medium text-foreground">{formatMoney(item.price)}</span>
                          </div>
                        </div>
                        {qty > 0 ? (
                          <div className="flex items-center gap-1 shrink-0 rounded-md border bg-background">
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              aria-label={t("reservations.preorderDecrease")}
                              onClick={() => updateCartQty(menuItemId, qty - 1)}
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </Button>
                            <span className="w-6 text-center text-sm font-semibold tabular-nums">{qty}</span>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              aria-label={t("reservations.preorderIncrease")}
                              onClick={() => updateCartQty(menuItemId, qty + 1)}
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="shrink-0"
                            onClick={() => addMenuItem(item)}
                          >
                            <Plus className="h-3.5 w-3.5 mr-1" />
                            {t("reservations.preorderAdd")}
                          </Button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {cart.length > 0 ? (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{t("reservations.preorderSelectedTitle")}</p>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs text-muted-foreground"
                      onClick={() => setCart([])}
                    >
                      {t("reservations.preorderClear")}
                    </Button>
                  </div>
                  <ul className="space-y-2">
                    {cart.map((line) => (
                      <li key={line.menuItemId} className="flex items-center gap-2 text-sm">
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{line.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {line.qty} × {formatMoney(line.price)}
                          </p>
                        </div>
                        <span className="shrink-0 tabular-nums text-sm font-medium">
                          {formatMoney(line.price * line.qty)}
                        </span>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 shrink-0 text-muted-foreground"
                          aria-label={t("reservations.preorderRemove")}
                          onClick={() => updateCartQty(line.menuItemId, 0)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="rounded-lg border bg-muted/30 px-3 py-3 space-y-1.5 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>{t("reservations.preorderSubtotal")}</span>
                  <span className="tabular-nums text-foreground">{formatMoney(cartSubtotal)}</span>
                </div>
                <div className="flex justify-between font-semibold text-base">
                  <span>{t("reservations.requiredDpPreview", { percent: depositPercent })}</span>
                  <span className="tabular-nums text-primary">{formatMoney(requiredDepositPreview)}</span>
                </div>
                <p className="text-xs text-muted-foreground">{t("reservations.dpMinHint")}</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              {t("shared.cancel")}
            </Button>
            <Button type="button" disabled={saving || cart.length === 0} onClick={onCreate}>
              {t("shared.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showMemberPicker} onOpenChange={setShowMemberPicker}>
        <DialogContent className={`${dialogSize.lg} ${dialogScroll}`}>
          <DialogHeader>
            <DialogTitle>{t("reservations.selectMember")}</DialogTitle>
          </DialogHeader>
          <Input
            placeholder={t("pos.searchMember")}
            value={memberSearch}
            onChange={(e) => setMemberSearch(e.target.value)}
          />
          <div className="max-h-60 overflow-y-auto space-y-1 mt-2">
            {memberSearchLoading ? (
              <p className="text-sm text-muted-foreground">{t("shared.loading")}</p>
            ) : memberSearchResults.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("reservations.noMembersFound")}</p>
            ) : (
              memberSearchResults.map((member) => (
                <button
                  key={member.id}
                  type="button"
                  className="w-full text-left rounded-lg border px-3 py-2 hover:bg-muted/50"
                  onClick={() => {
                    setSelectedMember(member);
                    setFormName(member.name);
                    setFormPhone(member.phone);
                    setShowMemberPicker(false);
                    setMemberSearch("");
                  }}
                >
                  <p className="font-medium text-sm">{member.name}</p>
                  <p className="text-xs text-muted-foreground">{member.memberNo ?? member.phone}</p>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ReservationDepositProofPreviewDialog
        open={proofPreview != null}
        reservationId={proofPreview?.reservationId ?? null}
        proofId={proofPreview?.proofId ?? null}
        filename={proofPreview?.filename ?? null}
        onOpenChange={(next) => {
          if (!next) setProofPreview(null);
        }}
      />
    </div>
  );
}
