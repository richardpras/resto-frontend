import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { openReservationInPosFlow } from "@/components/reservations/openReservationInPosFlow";
import type { ApplyReservationPosPayloadDeps } from "@/components/reservations/applyReservationPosPayload";
import { ApiHttpError } from "@/lib/api-integration/client";
import { getReservationPosQueue, type ReservationApi } from "@/lib/api-integration/reservationEndpoints";
import { useOpsTranslation } from "@/i18n/useOpsTranslation";

function formatWhen(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}

function matchesSearch(row: ReservationApi, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    row.customerName,
    row.customerPhone,
    row.memberNo,
    row.memberName,
    row.reservationCode,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

function ReservationRow({
  row,
  badgeLabel,
  disabled,
  onSelect,
}: {
  row: ReservationApi;
  badgeLabel: string;
  disabled?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted text-left disabled:opacity-50"
      data-testid={`reservation-picker-row-${row.id}`}
    >
      <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
        <User className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{row.customerName}</p>
        <p className="text-xs text-muted-foreground truncate">
          {row.memberNo ? `${row.memberNo} · ` : ""}
          {formatWhen(row.reservationAt)} · {row.partySize} pax
        </p>
      </div>
      <span className="text-[10px] font-medium text-muted-foreground shrink-0">{badgeLabel}</span>
    </button>
  );
}

function filterRows(
  rows: ReservationApi[],
  search: string,
  currentOrderId: string | null,
): ReservationApi[] {
  return rows.filter((row) => {
    if (currentOrderId && row.linkedOrderId != null && String(row.linkedOrderId) === currentOrderId) {
      return false;
    }
    return matchesSearch(row, search);
  });
}

export function PosReservationPickerDialog({
  open,
  outletId,
  currentOrderId,
  disabled,
  applyDeps,
  onClose,
  onLoaded,
}: {
  open: boolean;
  outletId: number;
  currentOrderId: string | null;
  disabled?: boolean;
  applyDeps: ApplyReservationPosPayloadDeps;
  onClose: () => void;
  onLoaded?: (reservation: ReservationApi) => void;
}) {
  const { t } = useOpsTranslation();
  const [search, setSearch] = useState("");
  const [loadingId, setLoadingId] = useState<number | null>(null);

  const { data, isFetching, refetch } = useQuery({
    queryKey: ["reservation-pos-queue", outletId],
    queryFn: () => getReservationPosQueue(outletId),
    enabled: open && outletId >= 1,
  });

  const ready = useMemo(
    () => filterRows(data?.readyToStart ?? [], search, currentOrderId),
    [data?.readyToStart, search, currentOrderId],
  );
  const inService = useMemo(
    () => filterRows(data?.inService ?? [], search, currentOrderId),
    [data?.inService, search, currentOrderId],
  );
  const isEmpty = ready.length === 0 && inService.length === 0;

  const selectReservation = async (row: ReservationApi) => {
    if (disabled || loadingId !== null) return;
    setLoadingId(row.id);
    try {
      await openReservationInPosFlow(row.id, { mode: "inPlace", apply: applyDeps });
      await refetch();
      onLoaded?.(row);
      onClose();
      setSearch("");
      toast.success(t("pos.reservationLoaded"));
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : t("reservations.openPosFailed"));
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={onClose}
          data-testid="pos-reservation-picker-dialog"
        >
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            className="bg-card rounded-2xl w-full max-w-md p-5 pos-shadow-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 mb-3">
              <CalendarDays className="h-4 w-4 text-primary" />
              <h3 className="font-semibold">{t("pos.reservationPickerTitle")}</h3>
              {isFetching ? <span className="text-xs text-muted-foreground">…</span> : null}
            </div>
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("pos.reservationSearchPlaceholder")}
              className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm mb-3"
              data-testid="reservation-picker-search"
            />
            <div className="max-h-72 overflow-y-auto space-y-3">
              {isEmpty ? (
                <p className="text-sm text-muted-foreground px-1 py-4 text-center">
                  {t("pos.noActiveReservations")}
                </p>
              ) : null}
              {ready.length > 0 ? (
                <div className="space-y-1">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide px-1">
                    {t("reservations.readyToStart")}
                  </p>
                  {ready.map((row) => (
                    <ReservationRow
                      key={row.id}
                      row={row}
                      badgeLabel={t("reservations.readyToStart")}
                      disabled={disabled || loadingId !== null}
                      onSelect={() => void selectReservation(row)}
                    />
                  ))}
                </div>
              ) : null}
              {inService.length > 0 ? (
                <div className="space-y-1">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide px-1">
                    {t("reservations.inService")}
                  </p>
                  {inService.map((row) => (
                    <ReservationRow
                      key={row.id}
                      row={row}
                      badgeLabel={t("reservations.inService")}
                      disabled={disabled || loadingId !== null}
                      onSelect={() => void selectReservation(row)}
                    />
                  ))}
                </div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => {
                onClose();
                setSearch("");
              }}
              className="mt-3 w-full py-2 rounded-xl bg-muted text-sm font-medium hover:bg-accent"
            >
              {t("shared.cancel")}
            </button>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
