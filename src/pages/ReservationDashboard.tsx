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

function ReservationMiniList({ title, rows }: { title: ReactNode; rows: ReservationApi[] }) {
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
              {row.customerName} · {row.partySize} pax
            </span>
            <span className="text-muted-foreground">
              {formatDateTime(row.reservationAt)} · {statusLabel[row.status]}
            </span>
          </Link>
        ))}
        {rows.length === 0 && <p className="text-sm text-muted-foreground">No reservations in this list.</p>}
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
  const activeOutletId = useOutletStore((s) => s.activeOutletId);
  const outletReady = typeof activeOutletId === "number" && activeOutletId >= 1;
  const authed = Boolean(getApiAccessToken());
  const today = new Date().toISOString().slice(0, 10);
  const [rangeFrom] = useState(today);
  const [rangeTo] = useState(today);

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
            <BarChart3 className="h-6 w-6" /> Reservation Operations
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Today&apos;s arrivals, active guests, no-shows, and delay metrics. Manage bookings on the{" "}
            <Link to="/reservations" className="text-primary underline-offset-2 hover:underline">
              Reservations
            </Link>{" "}
            page.
          </p>
        </div>
      </div>

      {!outletReady && (
        <p className="text-sm text-muted-foreground">Select an outlet to load reservation operations.</p>
      )}

      {outletReady && (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <MetricCard label="Today's reservations" value={isLoading ? "…" : todayTotal} />
            <MetricCard label="No-show today" value={isLoading ? "…" : (data?.noShowToday ?? 0)} />
            <MetricCard
              label="No-show rate"
              value={isLoading ? "…" : (metrics?.noShowRate ?? 0)}
              suffix="%"
            />
            <MetricCard
              label="Avg check-in delay"
              value={isLoading ? "…" : (metrics?.averageCheckinDelayMinutes ?? 0)}
              suffix="min"
            />
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <MetricCard label="Confirmed" value={isLoading ? "…" : (metrics?.confirmed ?? 0)} />
            <MetricCard label="Checked in" value={isLoading ? "…" : (metrics?.checkedIn ?? 0)} />
            <MetricCard label="Seated" value={isLoading ? "…" : (metrics?.seated ?? 0)} />
            <MetricCard
              label="Avg seating delay"
              value={isLoading ? "…" : (metrics?.averageSeatingDelayMinutes ?? 0)}
              suffix="min"
            />
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <ReservationMiniList
              title={
                <span className="inline-flex items-center gap-1">
                  <CalendarClock className="h-4 w-4" /> Upcoming arrivals
                </span>
              }
              rows={data?.upcomingReservations ?? []}
            />
            <ReservationMiniList
              title={
                <span className="inline-flex items-center gap-1">
                  <Users className="h-4 w-4" /> Active guests
                </span>
              }
              rows={data?.activeReservations ?? []}
            />
          </div>
        </>
      )}
    </div>
  );
}
