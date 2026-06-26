import { type ReactNode, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, CalendarClock, Users } from "lucide-react";
import {
  getReservationDashboard,
  type ReservationApi,
  type ReservationDashboardApi,
} from "@/lib/api-integration/reservationEndpoints";
import { getApiAccessToken } from "@/lib/api-integration/client";
import { useOutletStore } from "@/stores/outletStore";
import { useOpsTranslation } from "@/i18n/useOpsTranslation";

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

function ReservationMiniList({
  title,
  rows,
  statusLabel,
  emptyList,
  guestPax,
}: {
  title: ReactNode;
  rows: ReservationApi[];
  statusLabel: (status: ReservationApi["status"]) => string;
  emptyList: string;
  guestPax: (n: number) => string;
}) {
  return (
    <div className="rounded-2xl border border-border/50 bg-card p-4">
      <h3 className="text-sm font-semibold mb-2">{title}</h3>
      <div className="space-y-1 max-h-72 overflow-y-auto">
        {rows.map((row) => (
          <Link
            key={row.id}
            to="/reservations"
            className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2 text-sm hover:bg-muted/50"
          >
            <span>
              {row.customerName} · {guestPax(row.partySize)}
            </span>
            <span className="text-muted-foreground">
              {formatDateTime(row.reservationAt)} · {statusLabel(row.status)}
            </span>
          </Link>
        ))}
        {rows.length === 0 && <p className="text-sm text-muted-foreground">{emptyList}</p>}
      </div>
    </div>
  );
}

function MetricCard({ label, value, suffix }: { label: string; value: string | number; suffix?: string }) {
  return (
    <div className="rounded-2xl border border-border/50 bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold">
        {value}
        {suffix ? <span className="text-sm font-normal text-muted-foreground ml-1">{suffix}</span> : null}
      </p>
    </div>
  );
}

export default function ReservationDashboard() {
  const { t } = useOpsTranslation();
  const activeOutletId = useOutletStore((s) => s.activeOutletId);
  const outletReady = typeof activeOutletId === "number" && activeOutletId >= 1;
  const authed = Boolean(getApiAccessToken());
  const today = new Date().toISOString().slice(0, 10);
  const [rangeFrom] = useState(today);
  const [rangeTo] = useState(today);

  const statusLabel = (status: ReservationApi["status"]) => t(`reservations.status.${status}`);

  const { data, isLoading, refetch } = useQuery<ReservationDashboardApi>({
    queryKey: ["reservation-dashboard", activeOutletId, rangeFrom, rangeTo],
    queryFn: () => getReservationDashboard(activeOutletId!, rangeFrom, rangeTo),
    enabled: outletReady && authed,
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (!outletReady || !authed) return;
    void refetch();
  }, [activeOutletId, authed, outletReady, refetch]);

  const metrics = data?.metrics;
  const todayTotal = metrics?.totalReservations ?? 0;

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-7xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="h-6 w-6" /> {t("reservations.dashboard.pageTitle")}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t("reservations.dashboard.pageSubtitleBefore")}
            <Link to="/reservations" className="text-primary underline-offset-2 hover:underline">
              {t("reservations.dashboard.manageLink")}
            </Link>
            {t("reservations.dashboard.pageSubtitleAfter")}
          </p>
        </div>
      </div>

      {!outletReady && (
        <p className="text-sm text-muted-foreground">{t("reservations.dashboard.selectOutlet")}</p>
      )}

      {outletReady && (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <MetricCard label={t("reservations.dashboard.metrics.todayReservations")} value={isLoading ? "…" : todayTotal} />
            <MetricCard label={t("reservations.dashboard.metrics.noShowToday")} value={isLoading ? "…" : (data?.noShowToday ?? 0)} />
            <MetricCard
              label={t("reservations.dashboard.metrics.noShowRate")}
              value={isLoading ? "…" : (metrics?.noShowRate ?? 0)}
              suffix={t("reservations.dashboard.suffixPercent")}
            />
            <MetricCard
              label={t("reservations.dashboard.metrics.avgCheckinDelay")}
              value={isLoading ? "…" : (metrics?.averageCheckinDelayMinutes ?? 0)}
              suffix={t("reservations.dashboard.suffixMin")}
            />
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <MetricCard label={t("reservations.dashboard.metrics.confirmed")} value={isLoading ? "…" : (metrics?.confirmed ?? 0)} />
            <MetricCard label={t("reservations.dashboard.metrics.checkedIn")} value={isLoading ? "…" : (metrics?.checkedIn ?? 0)} />
            <MetricCard label={t("reservations.dashboard.metrics.seated")} value={isLoading ? "…" : (metrics?.seated ?? 0)} />
            <MetricCard
              label={t("reservations.dashboard.metrics.avgSeatingDelay")}
              value={isLoading ? "…" : (metrics?.averageSeatingDelayMinutes ?? 0)}
              suffix={t("reservations.dashboard.suffixMin")}
            />
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <ReservationMiniList
              title={
                <span className="inline-flex items-center gap-1">
                  <CalendarClock className="h-4 w-4" /> {t("reservations.dashboard.upcomingArrivals")}
                </span>
              }
              rows={data?.upcomingReservations ?? []}
              statusLabel={statusLabel}
              emptyList={t("reservations.dashboard.emptyList")}
              guestPax={(n) => t("reservations.dashboard.guestPax", { n })}
            />
            <ReservationMiniList
              title={
                <span className="inline-flex items-center gap-1">
                  <Users className="h-4 w-4" /> {t("reservations.dashboard.activeGuests")}
                </span>
              }
              rows={data?.activeReservations ?? []}
              statusLabel={statusLabel}
              emptyList={t("reservations.dashboard.emptyList")}
              guestPax={(n) => t("reservations.dashboard.guestPax", { n })}
            />
          </div>
        </>
      )}
    </div>
  );
}
