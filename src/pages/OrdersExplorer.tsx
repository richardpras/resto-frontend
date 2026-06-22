import { useEffect, useState } from "react";
import { Eye, Search } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { OrderExplorerDetailModal } from "@/components/orders/OrderExplorerDetailModal";
import { OrderSourceBadge } from "@/components/orders/OrderSourceBadge";
import { ReceiptPreviewModal } from "@/components/receipts/ReceiptPreviewModal";
import { SkeletonBusyRegion } from "@/components/skeletons/SkeletonBusyRegion";
import { CustomerTableRowsSkeleton } from "@/components/skeletons/list/CustomerTableRowsSkeleton";
import { Button } from "@/components/ui/button";
import { useOutletStore } from "@/stores/outletStore";
import { useOrdersExplorerStore } from "@/stores/ordersExplorerStore";
import type { OrderApi } from "@/lib/api-integration/endpoints";

const STATUS_OPTIONS: Array<{ value: "" | OrderApi["status"]; label: string }> = [
  { value: "", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "cooking", label: "Cooking" },
  { value: "ready", label: "Ready" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const PAYMENT_OPTIONS = [
  { value: "", label: "All payments" },
  { value: "unpaid", label: "Unpaid" },
  { value: "partial", label: "Partial" },
  { value: "paid", label: "Paid" },
] as const;

const SOURCE_OPTIONS = [
  { value: "", label: "All sources" },
  { value: "pos", label: "POS" },
  { value: "qr", label: "QR" },
] as const;

type ListTab = "all" | "pendingRefund";

function statusBadgeClass(status: string): string {
  const s = status.toLowerCase();
  if (s === "completed") return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400";
  if (s === "cancelled") return "bg-destructive/15 text-destructive";
  if (s === "pending" || s === "confirmed") return "bg-amber-500/15 text-amber-900 dark:text-amber-200";
  if (s === "cooking" || s === "ready") return "bg-sky-500/15 text-sky-800 dark:text-sky-300";
  return "bg-muted text-foreground";
}

export default function OrdersExplorer() {
  const { t } = useTranslation("ops");
  const [searchParams, setSearchParams] = useSearchParams();
  const activeOutletId = useOutletStore((s) => s.activeOutletId);
  const orders = useOrdersExplorerStore((s) => s.orders);
  const meta = useOrdersExplorerStore((s) => s.meta);
  const filters = useOrdersExplorerStore((s) => s.filters);
  const setFilters = useOrdersExplorerStore((s) => s.setFilters);
  const initialLoading = useOrdersExplorerStore((s) => s.initialLoading);
  const listError = useOrdersExplorerStore((s) => s.listError);
  const fetchList = useOrdersExplorerStore((s) => s.fetchList);
  const loadMore = useOrdersExplorerStore((s) => s.loadMore);
  const resetForOutletSwitch = useOrdersExplorerStore((s) => s.resetForOutletSwitch);
  const startPolling = useOrdersExplorerStore((s) => s.startPolling);
  const stopPolling = useOrdersExplorerStore((s) => s.stopPolling);
  const openOrderDetail = useOrdersExplorerStore((s) => s.openOrderDetail);
  const fetchRecoveryPendingCount = useOrdersExplorerStore((s) => s.fetchRecoveryPendingCount);
  const recoveryPendingCount = useOrdersExplorerStore((s) => s.recoveryPendingCount);

  const [searchDraft, setSearchDraft] = useState("");
  const listTab: ListTab = filters.hasRecoveryPending ? "pendingRefund" : "all";

  useEffect(() => {
    resetForOutletSwitch();
    if (typeof activeOutletId === "number" && activeOutletId >= 1) {
      const recoveryPending = searchParams.get("recoveryPending") === "1";
      if (recoveryPending) {
        setFilters({ hasRecoveryPending: true, paymentStatus: "paid" });
      } else {
        void fetchList({ append: false, background: false });
      }
      void fetchRecoveryPendingCount();
      startPolling();
    }
    return () => {
      stopPolling();
    };
  }, [activeOutletId, resetForOutletSwitch, fetchList, startPolling, stopPolling, fetchRecoveryPendingCount]);

  useEffect(() => {
    const orderId = searchParams.get("orderId");
    if (orderId) {
      openOrderDetail(orderId);
    }
  }, [searchParams, openOrderDetail]);

  useEffect(() => {
    setSearchDraft(filters.search ?? "");
  }, [filters.search]);

  const showListSkeleton = initialLoading && orders.length === 0;

  const applySearch = () => {
    setFilters({ search: searchDraft });
  };

  const setListTab = (tab: ListTab) => {
    const next = new URLSearchParams(searchParams);
    if (tab === "pendingRefund") {
      next.set("recoveryPending", "1");
      setFilters({ hasRecoveryPending: true, paymentStatus: "paid" });
    } else {
      next.delete("recoveryPending");
      setFilters({ hasRecoveryPending: undefined });
    }
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-7xl" data-testid="orders-explorer-page">
      {(!activeOutletId || activeOutletId < 1) && (
        <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-sm text-amber-900 dark:text-amber-100">
          Select an outlet in the header to load historical orders for that location.
        </div>
      )}
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("ordersExplorer.title", "Orders")}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{t("ordersExplorer.subtitle", "Operational order history, payments, receipts, and audit trail.")}</p>
      </div>

      <div className="flex flex-wrap gap-2" data-testid="orders-explorer-list-tabs">
        <Button type="button" size="sm" variant={listTab === "all" ? "default" : "outline"} onClick={() => setListTab("all")}>
          {t("ordersExplorer.recoveryQueue.tabAll", "All orders")}
        </Button>
        <Button type="button" size="sm" variant={listTab === "pendingRefund" ? "default" : "outline"} onClick={() => setListTab("pendingRefund")}>
          {t("ordersExplorer.recoveryQueue.tabPending", "Pending refund")}
          {recoveryPendingCount > 0 ? (
            <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500/20 px-1 text-[10px] font-semibold text-amber-950 dark:text-amber-100">
              {recoveryPendingCount > 99 ? "99+" : recoveryPendingCount}
            </span>
          ) : null}
        </Button>
      </div>

      <div className="rounded-2xl border border-border/50 bg-card p-4 space-y-3">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <label className="text-xs text-muted-foreground space-y-1">
            <span>Status</span>
            <select
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              value={filters.status ?? ""}
              onChange={(e) =>
                setFilters({
                  status: (e.target.value || undefined) as typeof filters.status,
                })
              }
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.label} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-muted-foreground space-y-1">
            <span>Payment</span>
            <select
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              value={filters.paymentStatus ?? ""}
              onChange={(e) =>
                setFilters({
                  paymentStatus: (e.target.value || undefined) as typeof filters.paymentStatus,
                })
              }
            >
              {PAYMENT_OPTIONS.map((o) => (
                <option key={o.label} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-muted-foreground space-y-1">
            <span>Source</span>
            <select
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              value={filters.source ?? ""}
              onChange={(e) =>
                setFilters({
                  source: (e.target.value || undefined) as typeof filters.source,
                })
              }
            >
              {SOURCE_OPTIONS.map((o) => (
                <option key={o.label} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-muted-foreground space-y-1 flex flex-col">
            <span>Voided payment</span>
            <span className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={filters.hasVoidedPayment === true}
                onChange={(e) => setFilters({ hasVoidedPayment: e.target.checked ? true : undefined })}
              />
              <span>Has void</span>
            </span>
          </label>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <label className="text-xs text-muted-foreground space-y-1">
            <span>From</span>
            <input
              type="date"
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              value={filters.dateFrom ?? ""}
              onChange={(e) => setFilters({ dateFrom: e.target.value || undefined })}
            />
          </label>
          <label className="text-xs text-muted-foreground space-y-1">
            <span>To</span>
            <input
              type="date"
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              value={filters.dateTo ?? ""}
              onChange={(e) => setFilters({ dateTo: e.target.value || undefined })}
            />
          </label>
          <div className="text-xs text-muted-foreground space-y-1">
            <span>Invoice / code</span>
            <div className="flex gap-2">
              <input
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") applySearch();
                }}
                placeholder="Search code or QRO source…"
                className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm"
              />
              <Button type="button" variant="secondary" className="shrink-0" onClick={() => applySearch()}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {listError ? <p className="text-sm text-destructive">{listError}</p> : null}

      <div className="rounded-2xl border border-border/50 bg-card p-4">
        <div className="grid grid-cols-7 text-xs text-muted-foreground border-b pb-2 mb-2 gap-2">
          <span className="col-span-2">Code</span>
          <span>Source</span>
          <span>Status</span>
          <span>Pay</span>
          <span>Total</span>
          <span className="text-right">Detail</span>
        </div>
        <SkeletonBusyRegion busy={showListSkeleton} label="Loading orders" className="min-h-[200px]">
          {showListSkeleton ? (
            <CustomerTableRowsSkeleton />
          ) : (
            <div className="space-y-1">
              {orders.map((o) => (
                <div
                  key={o.id}
                  className="w-full grid grid-cols-7 gap-2 rounded-lg px-2 py-2 text-left text-sm items-center hover:bg-muted/40"
                >
                  <span className="col-span-2 truncate font-medium text-foreground flex items-center gap-1.5">
                    {o.code}
                    {(o.pendingRecoveryCount ?? 0) > 0 ? (
                      <span
                        className="inline-flex rounded-md bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 text-[9px] font-semibold text-amber-950 dark:text-amber-100"
                        data-testid="order-row-recovery-badge"
                      >
                        {o.pendingRecoveryCount} {t("ordersExplorer.recoveryQueue.pendingShort", "pending")}
                      </span>
                    ) : null}
                  </span>
                  <span data-testid="order-history-source">
                    <OrderSourceBadge source={o.orderSource ?? null} />
                  </span>
                  <span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-lg font-medium ${statusBadgeClass(o.status)}`}>{o.status}</span>
                  </span>
                  <span className="text-xs text-muted-foreground">{o.paymentStatus}</span>
                  <span className="text-xs font-medium">Rp {o.total.toLocaleString("id-ID")}</span>
                  <div className="text-right">
                    <Button type="button" size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => openOrderDetail(String(o.id))}>
                      <Eye className="h-3.5 w-3.5 mr-1" /> View
                    </Button>
                  </div>
                </div>
              ))}
              {orders.length === 0 && !showListSkeleton ? (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  {listTab === "pendingRefund"
                    ? t("ordersExplorer.recoveryQueue.empty", "No orders awaiting manager refund review.")
                    : "No orders for the current filters."}
                </p>
              ) : null}
            </div>
          )}
        </SkeletonBusyRegion>
        {meta && meta.lastPage > meta.currentPage ? (
          <div className="mt-4 flex justify-center">
            <Button type="button" variant="secondary" onClick={() => void loadMore()} data-testid="orders-explorer-load-more">
              Load more
            </Button>
          </div>
        ) : null}
        {meta ? (
          <p className="mt-3 text-xs text-muted-foreground text-center">
            Page {meta.currentPage} of {meta.lastPage} · {meta.total} orders
          </p>
        ) : null}
      </div>

      <OrderExplorerDetailModal />
      <ReceiptPreviewModal />
    </div>
  );
}
