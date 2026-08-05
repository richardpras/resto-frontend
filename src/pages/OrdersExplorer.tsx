import { useEffect, useMemo, useState } from "react";
import { Eye, Filter, Search, X } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useOpsTranslation } from "@/i18n/useOpsTranslation";
import { OrderExplorerDetailModal } from "@/components/orders/OrderExplorerDetailModal";
import { OrderSourceBadge } from "@/components/orders/OrderSourceBadge";
import { ReceiptPreviewModal } from "@/components/receipts/ReceiptPreviewModal";
import { SkeletonBusyRegion } from "@/components/skeletons/SkeletonBusyRegion";
import { CustomerTableRowsSkeleton } from "@/components/skeletons/list/CustomerTableRowsSkeleton";
import { AppOverlay } from "@/components/ui/AppOverlay";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { useOutletStore } from "@/stores/outletStore";
import { useOrdersExplorerStore } from "@/stores/ordersExplorerStore";
import type { OrderApi } from "@/lib/api-integration/endpoints";

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
  const { t } = useOpsTranslation();
  const isMobile = useIsMobile();
  const [filterOpen, setFilterOpen] = useState(false);

  const statusOptions = useMemo(
    (): Array<{ value: "" | OrderApi["status"]; label: string }> => [
      { value: "", label: t("ordersExplorer.filters.allStatuses") },
      { value: "pending", label: t("ordersExplorer.filters.statusPending") },
      { value: "confirmed", label: t("ordersExplorer.filters.statusConfirmed") },
      { value: "cooking", label: t("ordersExplorer.filters.statusCooking") },
      { value: "ready", label: t("ordersExplorer.filters.statusReady") },
      { value: "completed", label: t("ordersExplorer.filters.statusCompleted") },
      { value: "cancelled", label: t("ordersExplorer.filters.statusCancelled") },
    ],
    [t],
  );

  const paymentOptions = useMemo(
    () =>
      [
        { value: "", label: t("ordersExplorer.filters.allPayments") },
        { value: "unpaid", label: t("ordersExplorer.filters.paymentUnpaid") },
        { value: "partial", label: t("ordersExplorer.filters.paymentPartial") },
        { value: "paid", label: t("ordersExplorer.filters.paymentPaid") },
      ] as const,
    [t],
  );

  const sourceOptions = useMemo(
    () =>
      [
        { value: "", label: t("ordersExplorer.filters.allSources") },
        { value: "pos", label: t("ordersExplorer.filters.sourcePos") },
        { value: "qr", label: t("ordersExplorer.filters.sourceQr") },
      ] as const,
    [t],
  );

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

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.status) count += 1;
    if (filters.paymentStatus && !filters.hasRecoveryPending) count += 1;
    if (filters.source) count += 1;
    if (filters.hasVoidedPayment) count += 1;
    if (filters.dateFrom) count += 1;
    if (filters.dateTo) count += 1;
    if (filters.search?.trim()) count += 1;
    return count;
  }, [filters]);

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

  const filterFields = (
    <div className="space-y-3">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <label className="text-xs text-muted-foreground space-y-1">
          <span>{t("ordersExplorer.filters.status")}</span>
          <select
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm min-h-11"
            value={filters.status ?? ""}
            onChange={(e) =>
              setFilters({
                status: (e.target.value || undefined) as typeof filters.status,
              })
            }
          >
            {statusOptions.map((o) => (
              <option key={o.label} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-muted-foreground space-y-1">
          <span>{t("ordersExplorer.filters.payment")}</span>
          <select
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm min-h-11"
            value={filters.paymentStatus ?? ""}
            onChange={(e) =>
              setFilters({
                paymentStatus: (e.target.value || undefined) as typeof filters.paymentStatus,
              })
            }
          >
            {paymentOptions.map((o) => (
              <option key={o.label} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-muted-foreground space-y-1">
          <span>{t("ordersExplorer.filters.source")}</span>
          <select
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm min-h-11"
            value={filters.source ?? ""}
            onChange={(e) =>
              setFilters({
                source: (e.target.value || undefined) as typeof filters.source,
              })
            }
          >
            {sourceOptions.map((o) => (
              <option key={o.label} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-muted-foreground space-y-1 flex flex-col">
          <span>{t("ordersExplorer.filters.voidedPayment")}</span>
          <span className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm min-h-11">
            <input
              type="checkbox"
              checked={filters.hasVoidedPayment === true}
              onChange={(e) => setFilters({ hasVoidedPayment: e.target.checked ? true : undefined })}
            />
            <span>{t("ordersExplorer.filters.hasVoid")}</span>
          </span>
        </label>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <label className="text-xs text-muted-foreground space-y-1">
          <span>{t("ordersExplorer.filters.from")}</span>
          <input
            type="date"
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm min-h-11"
            value={filters.dateFrom ?? ""}
            onChange={(e) => setFilters({ dateFrom: e.target.value || undefined })}
          />
        </label>
        <label className="text-xs text-muted-foreground space-y-1">
          <span>{t("ordersExplorer.filters.to")}</span>
          <input
            type="date"
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm min-h-11"
            value={filters.dateTo ?? ""}
            onChange={(e) => setFilters({ dateTo: e.target.value || undefined })}
          />
        </label>
        <div className="text-xs text-muted-foreground space-y-1">
          <span>{t("ordersExplorer.filters.invoiceCode")}</span>
          <div className="flex gap-2">
            <input
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  applySearch();
                  if (isMobile) setFilterOpen(false);
                }
              }}
              placeholder={t("ordersExplorer.filters.searchPlaceholder")}
              className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm min-h-11"
            />
            <Button
              type="button"
              variant="secondary"
              className="shrink-0 min-h-11"
              onClick={() => {
                applySearch();
                if (isMobile) setFilterOpen(false);
              }}
            >
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-7xl" data-testid="orders-explorer-page">
      {(!activeOutletId || activeOutletId < 1) && (
        <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-sm text-amber-900 dark:text-amber-100">
          {t("ordersExplorer.selectOutlet")}
        </div>
      )}
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("ordersExplorer.title")}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{t("ordersExplorer.subtitle")}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2" data-testid="orders-explorer-list-tabs">
        <Button type="button" size="sm" variant={listTab === "all" ? "default" : "outline"} onClick={() => setListTab("all")}>
          {t("ordersExplorer.recoveryQueue.tabAll")}
        </Button>
        <Button type="button" size="sm" variant={listTab === "pendingRefund" ? "default" : "outline"} onClick={() => setListTab("pendingRefund")}>
          {t("ordersExplorer.recoveryQueue.tabPending")}
          {recoveryPendingCount > 0 ? (
            <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500/20 px-1 text-[10px] font-semibold text-amber-950 dark:text-amber-100">
              {recoveryPendingCount > 99 ? "99+" : recoveryPendingCount}
            </span>
          ) : null}
        </Button>
        {isMobile ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="ml-auto"
            onClick={() => setFilterOpen(true)}
            data-testid="orders-explorer-open-filters"
          >
            <Filter className="h-4 w-4 mr-1.5" />
            {t("ordersExplorer.filters.open")}
            {activeFilterCount > 0 ? (
              <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/15 px-1 text-[10px] font-semibold text-primary">
                {activeFilterCount}
              </span>
            ) : null}
          </Button>
        ) : null}
      </div>

      {isMobile ? (
        <AppOverlay
          open={filterOpen}
          onClose={() => setFilterOpen(false)}
          layer="modal"
          align="bottom"
          data-testid="orders-explorer-filters-overlay"
          panelClassName="p-4 max-h-[85dvh] overflow-y-auto"
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-base font-semibold text-foreground">{t("ordersExplorer.filters.title")}</h3>
            <button
              type="button"
              onClick={() => setFilterOpen(false)}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label={t("ordersExplorer.filters.close")}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          {filterFields}
          <Button
            type="button"
            className="mt-4 w-full min-h-11"
            onClick={() => {
              applySearch();
              setFilterOpen(false);
            }}
            data-testid="orders-explorer-apply-filters"
          >
            {t("ordersExplorer.filters.apply")}
          </Button>
        </AppOverlay>
      ) : (
        <div className="rounded-2xl border border-border/50 bg-card p-4">{filterFields}</div>
      )}

      {listError ? <p className="text-sm text-destructive">{listError}</p> : null}

      <div className="rounded-2xl border border-border/50 bg-card p-4">
        {!isMobile ? (
        <div className="grid grid-cols-7 text-xs text-muted-foreground border-b pb-2 mb-2 gap-2">
          <span className="col-span-2">{t("ordersExplorer.table.code")}</span>
          <span>{t("ordersExplorer.table.source")}</span>
          <span>{t("ordersExplorer.table.status")}</span>
          <span>{t("ordersExplorer.table.pay")}</span>
          <span>{t("ordersExplorer.table.total")}</span>
          <span className="text-right">{t("ordersExplorer.table.detail")}</span>
        </div>
        ) : null}
        <SkeletonBusyRegion busy={showListSkeleton} label={t("ordersExplorer.table.loading")} className="min-h-[200px]">
          {showListSkeleton ? (
            <CustomerTableRowsSkeleton />
          ) : (
            <div className={isMobile ? "space-y-2" : "space-y-1"}>
              {orders.map((o) => (
                isMobile ? (
                <div key={o.id} className="rounded-xl border border-border/60 bg-background px-3 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{o.code}</p>
                      {(o.pendingRecoveryCount ?? 0) > 0 ? (
                        <span
                          className="mt-1 inline-flex rounded-md border border-amber-500/30 bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-semibold text-amber-950 dark:text-amber-100"
                          data-testid="order-row-recovery-badge"
                        >
                          {o.pendingRecoveryCount} {t("ordersExplorer.recoveryQueue.pendingShort")}
                        </span>
                      ) : null}
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 shrink-0 text-[11px]"
                      onClick={() => openOrderDetail(String(o.id))}
                    >
                      <Eye className="h-3.5 w-3.5 mr-1" /> {t("ordersExplorer.table.view")}
                    </Button>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                    <div>
                      <p className="text-[10px] text-muted-foreground">{t("ordersExplorer.table.source")}</p>
                      <div className="mt-0.5" data-testid="order-history-source">
                        <OrderSourceBadge source={o.orderSource ?? null} />
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">{t("ordersExplorer.table.status")}</p>
                      <span className={`mt-0.5 inline-flex rounded-lg px-2 py-0.5 text-[10px] font-medium ${statusBadgeClass(o.status)}`}>{o.status}</span>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">{t("ordersExplorer.table.pay")}</p>
                      <p className="mt-0.5 text-xs text-foreground">{o.paymentStatus}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">{t("ordersExplorer.table.total")}</p>
                      <p className="mt-0.5 text-sm font-semibold text-foreground">Rp {o.total.toLocaleString("id-ID")}</p>
                    </div>
                  </div>
                </div>
                ) : (
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
                        {o.pendingRecoveryCount} {t("ordersExplorer.recoveryQueue.pendingShort")}
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
                      <Eye className="h-3.5 w-3.5 mr-1" /> {t("ordersExplorer.table.view")}
                    </Button>
                  </div>
                </div>
                )
              ))}
              {orders.length === 0 && !showListSkeleton ? (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  {listTab === "pendingRefund"
                    ? t("ordersExplorer.recoveryQueue.empty")
                    : t("ordersExplorer.table.emptyFiltered")}
                </p>
              ) : null}
            </div>
          )}
        </SkeletonBusyRegion>
        {meta && meta.lastPage > meta.currentPage ? (
          <div className="mt-4 flex justify-center">
            <Button type="button" variant="secondary" onClick={() => void loadMore()} data-testid="orders-explorer-load-more">
              {t("ordersExplorer.table.loadMore")}
            </Button>
          </div>
        ) : null}
        {meta ? (
          <p className="mt-3 text-xs text-muted-foreground text-center">
            {t("ordersExplorer.table.pageInfo", {
              current: meta.currentPage,
              last: meta.lastPage,
              total: meta.total,
            })}
          </p>
        ) : null}
      </div>

      <OrderExplorerDetailModal />
      <ReceiptPreviewModal />
    </div>
  );
}
