import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, Clock, CheckCircle2, Loader2, Package, XCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import type { TFunction } from "i18next";
import { useOutletStore } from "@/stores/outletStore";
import { PERMISSIONS, useAuthStore } from "@/stores/authStore";
import type { QrOrderRequest } from "@/stores/qrOrderStore";
import { qrOrderApiToStore, useQrOrderStore } from "@/stores/qrOrderStore";
import { QrOrderCardStackSkeleton } from "@/components/skeletons/list/QrOrderCardStackSkeleton";
import { SkeletonBusyRegion } from "@/components/skeletons/SkeletonBusyRegion";
import { QrOrderSearchBar } from "@/components/qr-order/QrOrderSearchBar";
import { QrOrderScannerModal } from "@/components/qr-order/QrOrderScannerModal";
import { QrOrderPreviewDrawer } from "@/components/qr-order/QrOrderPreviewDrawer";
import { openQrOrderInPosFlow } from "@/components/qr-order/openQrOrderInPosFlow";
import { searchQrOrder } from "@/lib/api-integration/qrOrderReviewEndpoints";
import { listQrOrdersWithMeta, type ListQrOrdersMeta } from "@/lib/api-integration/qrOrderEndpoints";
import { ApiHttpError } from "@/lib/api-integration/client";
import { parseQrOrderCode } from "@/lib/qrOrderCodeParser";
import { useQrOrderPosBridgeStore } from "@/stores/qrOrderPosBridgeStore";
import { useOpsTranslation } from "@/i18n/useOpsTranslation";

const QUEUE_PAGE_SIZE = 25;
type QueueTab = "pending" | "inPos";

function getStatusConfig(t: TFunction): Record<string, { label: string; color: string; icon: typeof Clock }> {
  return {
    pending_cashier_confirmation: { label: t("qrStaff.status.submitted"), color: "bg-warning/10 text-warning", icon: Clock },
    under_review: { label: t("qrStaff.status.in_pos"), color: "bg-primary/10 text-primary", icon: Clock },
    confirmed: { label: t("qrStaff.status.confirmed"), color: "bg-success/10 text-success", icon: CheckCircle2 },
    paid: { label: t("qrStaff.status.paid"), color: "bg-success/10 text-success", icon: CheckCircle2 },
    rejected: { label: t("qrStaff.status.cancelled"), color: "bg-destructive/10 text-destructive", icon: XCircle },
    expired: { label: t("qrStaff.status.expired"), color: "bg-muted text-muted-foreground", icon: XCircle },
  };
}

function formatAgo(date: Date | null, t: TFunction): string {
  if (!date) return t("qrStaff.timeNever");
  const diffMs = Date.now() - date.getTime();
  const sec = Math.max(0, Math.floor(diffMs / 1000));
  if (sec < 60) return t("qrStaff.timeSec", { n: sec });
  const min = Math.floor(sec / 60);
  if (min < 60) return t("qrStaff.timeMin", { n: min });
  const hrs = Math.floor(min / 60);
  return t("qrStaff.timeHr", { n: hrs });
}

function urgencyFor(order: QrOrderRequest, t: TFunction): { label: string; className: string } {
  const count = order.cashierCallCount ?? 0;
  if (count >= 3) return { label: t("qrStaff.urgency.urgent"), className: "bg-destructive/10 text-destructive" };
  if (count >= 1) return { label: t("qrStaff.urgency.called"), className: "bg-warning/10 text-warning" };
  return { label: t("qrStaff.urgency.normal"), className: "bg-muted text-muted-foreground" };
}

type OrderCardProps = {
  order: QrOrderRequest;
  canManage: boolean;
  openingRequestId: string | null;
  onPreview: (id: string) => void;
  onOpenInPos: (id: string) => void;
  t: TFunction;
};

function QrOrderInPosRow({
  order,
  canManage,
  openingRequestId,
  onPreview,
  onOpenInPos,
  t,
}: OrderCardProps) {
  const isOpening = openingRequestId === order.id;

  return (
    <div className="flex items-center gap-2 sm:gap-3 px-3 py-2.5 rounded-xl border border-border bg-card">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{order.requestCode}</p>
        <p className="text-xs text-muted-foreground truncate">
          {order.tableName ? t("qrStaff.table", { name: order.tableName }) : t("qrStaff.noTable")}
          {order.customerName ? ` · ${order.customerName}` : ""}
          {` · ${t("qrStaff.items", { n: order.items.length })} · ${new Date(order.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}`}
        </p>
        {order.linkedOrder ? (
          <p className="text-xs text-primary mt-1" data-testid="qr-order-linked-pos">
            {t("qrStaff.linkedPos", { code: order.linkedOrder.orderNo })}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground mt-1">{t("qrStaff.source")}</p>
        )}
      </div>
      <button
        type="button"
        disabled={!canManage}
        onClick={() => onPreview(order.id)}
        className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium border border-border"
      >
        {t("qrStaff.preview")}
      </button>
      <button
        type="button"
        disabled={!canManage || isOpening}
        onClick={() => void onOpenInPos(order.id)}
        className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground disabled:opacity-60 flex items-center gap-1.5"
        data-testid="qr-order-resume-pos-button"
      >
        {isOpening ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
        {order.linkedOrder ? t("qrStaff.openPosBill") : t("qrStaff.resume")}
      </button>
    </div>
  );
}

function QrOrderQueueCard({
  order,
  canManage,
  openingRequestId,
  onPreview,
  onOpenInPos,
  t,
}: OrderCardProps) {
  const statusConfig = getStatusConfig(t);
  const sc = statusConfig[order.status] ?? statusConfig.pending_cashier_confirmation;
  const Icon = sc.icon;
  const urgency = urgencyFor(order, t);
  const isOpening = openingRequestId === order.id;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="bg-card rounded-2xl p-4 border border-border"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-foreground">{order.requestCode}</span>
            <span className={`text-xs px-2 py-0.5 rounded-lg font-medium flex items-center gap-1 ${sc.color}`}>
              <Icon className="h-3 w-3" /> {sc.label}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {order.tableName && t("qrStaff.table", { name: order.tableName })}
            {order.customerName && ` • ${order.customerName}`}
            {" • "}{new Date(order.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
          </p>
          {order.linkedOrder ? (
            <p className="text-xs text-primary mt-1" data-testid="qr-order-linked-pos">
              {t("qrStaff.linkedPos", { code: order.linkedOrder.orderNo })}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground mt-1">{t("qrStaff.source")}</p>
          )}
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-[11px] px-2 py-0.5 rounded-lg font-medium ${urgency.className}`}>
              {urgency.label}
            </span>
            <p className="text-xs text-warning">{t("qrStaff.calledCount", { n: order.cashierCallCount ?? 0 })}</p>
            <p className="text-xs text-muted-foreground">
              {t("qrStaff.lastCalled", { ago: formatAgo(order.cashierCalledAt, t) })}
            </p>
          </div>
        </div>
        <span className="text-xs font-medium text-muted-foreground">{t("qrStaff.items", { n: order.items.length })}</span>
      </div>

      <div className="flex items-center gap-1 mb-3 flex-wrap">
        {order.items.map((item) => (
          <span key={item.id} className="text-xs bg-muted px-2 py-1 rounded-lg text-muted-foreground">
            {t("qrStaff.menuItemTag", { id: item.menuItemId, qty: item.qty })}
          </span>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          disabled={!canManage}
          onClick={() => onPreview(order.id)}
          className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-border"
          data-testid="qr-order-preview-button"
        >
          {t("qrStaff.preview")}
        </button>
        <button
          type="button"
          disabled={!canManage || isOpening}
          onClick={() => void onOpenInPos(order.id)}
          className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-primary text-primary-foreground disabled:opacity-60 flex items-center justify-center gap-2"
          data-testid="qr-order-open-pos-list-button"
        >
          {isOpening ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {order.linkedOrder ? t("qrStaff.openPosBill") : t("qrStaff.openInPos")}
        </button>
      </div>
    </motion.div>
  );
}

export default function QROrders() {
  const { t } = useOpsTranslation();
  const navigate = useNavigate();
  const setFromOpenInPos = useQrOrderPosBridgeStore((s) => s.setFromOpenInPos);
  const activeOutletId = useOutletStore((s) => s.activeOutletId);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const requests = useQrOrderStore((s) => s.requests);
  const pagination = useQrOrderStore((s) => s.pagination);
  const initialLoading = useQrOrderStore((s) => s.initialLoading);
  const backgroundRefreshing = useQrOrderStore((s) => s.backgroundRefreshing);
  const error = useQrOrderStore((s) => s.error);
  const lastSyncAt = useQrOrderStore((s) => s.lastSyncAt);
  const startPolling = useQrOrderStore((s) => s.startPolling);
  const stopPolling = useQrOrderStore((s) => s.stopPolling);
  const fetchRequests = useQrOrderStore((s) => s.fetchRequests);

  const [searchValue, setSearchValue] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [previewRequestId, setPreviewRequestId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [openingRequestId, setOpeningRequestId] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [queueTab, setQueueTab] = useState<QueueTab>("pending");
  const [inPosRequests, setInPosRequests] = useState<QrOrderRequest[]>([]);
  const [inPosPagination, setInPosPagination] = useState<ListQrOrdersMeta | null>(null);
  const [inPosLoading, setInPosLoading] = useState(false);
  const [inPosLoadedOnce, setInPosLoadedOnce] = useState(false);
  const [loadingMoreInPos, setLoadingMoreInPos] = useState(false);
  const canManage = hasPermission(PERMISSIONS.QR_ORDERS);

  const pendingTotal = pagination?.total ?? requests.length;
  const inPosTotal = inPosPagination?.total ?? inPosRequests.length;
  const hasMorePending = pagination ? pagination.currentPage < pagination.lastPage : false;
  const hasMoreInPos = inPosPagination ? inPosPagination.currentPage < inPosPagination.lastPage : false;

  const openPreview = (requestId: string) => {
    setPreviewRequestId(requestId);
    setPreviewOpen(true);
  };

  const handleOpenInPos = async (requestId: string) => {
    setOpeningRequestId(requestId);
    try {
      await openQrOrderInPosFlow(requestId, { setFromOpenInPos, navigate });
    } catch {
      toast.error(t("qrStaff.openFailed"));
    } finally {
      setOpeningRequestId(null);
    }
  };

  const handleSearch = async (rawInput: string) => {
    const parsed = parseQrOrderCode(rawInput);
    if (!parsed) {
      toast.error(t("qrStaff.invalidCode"));
      return;
    }

    setSearching(true);
    try {
      const found = await searchQrOrder(parsed);
      setSearchValue(parsed);
      await openQrOrderInPosFlow(found.id, { setFromOpenInPos, navigate });
    } catch (error) {
      const message = error instanceof ApiHttpError ? error.message : t("qrStaff.notFound");
      toast.error(message);
    } finally {
      setSearching(false);
    }
  };

  const fetchInPosPage = useCallback(
    async (page: number, append: boolean) => {
      if (typeof activeOutletId !== "number" || activeOutletId < 1) {
        setInPosRequests([]);
        setInPosPagination(null);
        setInPosLoadedOnce(false);
        return;
      }
      if (!append && !inPosLoadedOnce) setInPosLoading(true);
      try {
        const result = await listQrOrdersWithMeta({
          outletId: activeOutletId,
          status: "under_review",
          perPage: QUEUE_PAGE_SIZE,
          page,
        });
        const mapped = result.requests.map(qrOrderApiToStore);
        setInPosRequests((current) => (append ? [...current, ...mapped] : mapped));
        setInPosPagination(result.meta);
        setInPosLoadedOnce(true);
      } catch {
        // background refresh — avoid noisy toasts
      } finally {
        setInPosLoading(false);
      }
    },
    [activeOutletId, inPosLoadedOnce],
  );

  const refreshInPosQueue = useCallback(() => fetchInPosPage(1, false), [fetchInPosPage]);

  const refreshQueues = useCallback(() => {
    if (typeof activeOutletId !== "number" || activeOutletId < 1) return;
    void fetchRequests({
      outletId: activeOutletId,
      status: "pending_cashier_confirmation",
      perPage: QUEUE_PAGE_SIZE,
      page: 1,
    });
    void refreshInPosQueue();
  }, [activeOutletId, fetchRequests, refreshInPosQueue]);

  const loadMorePending = async () => {
    if (!hasMorePending || typeof activeOutletId !== "number" || activeOutletId < 1) return;
    setLoadingMore(true);
    try {
      await fetchRequests(
        {
          outletId: activeOutletId,
          status: "pending_cashier_confirmation",
          perPage: QUEUE_PAGE_SIZE,
          page: (pagination?.currentPage ?? 1) + 1,
        },
        { mode: "background", append: true },
      );
    } finally {
      setLoadingMore(false);
    }
  };

  const loadMoreInPos = async () => {
    if (!hasMoreInPos) return;
    setLoadingMoreInPos(true);
    try {
      await fetchInPosPage((inPosPagination?.currentPage ?? 1) + 1, true);
    } finally {
      setLoadingMoreInPos(false);
    }
  };

  useEffect(() => {
    if (!canManage) {
      stopPolling();
      return;
    }
    if (typeof activeOutletId !== "number" || activeOutletId < 1) {
      stopPolling();
      setInPosRequests([]);
      return;
    }
    startPolling(
      { outletId: activeOutletId, status: "pending_cashier_confirmation", perPage: QUEUE_PAGE_SIZE, page: 1 },
      10000,
    );
    return () => stopPolling();
  }, [activeOutletId, canManage, startPolling, stopPolling]);

  useEffect(() => {
    if (!canManage || typeof activeOutletId !== "number" || activeOutletId < 1) return;
    void refreshInPosQueue();
    const timer = setInterval(() => void refreshInPosQueue(), 15000);
    return () => clearInterval(timer);
  }, [activeOutletId, canManage, refreshInPosQueue]);

  useEffect(() => {
    if (!error) return;
    toast.error(error);
  }, [error]);

  return (
    <div className="p-4 md:p-6 space-y-4">
      {(!activeOutletId || activeOutletId < 1) && (
        <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-sm text-amber-900 dark:text-amber-100">
          {t("qrStaff.selectOutlet")}
        </div>
      )}

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-foreground">{t("qrStaff.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("qrStaff.subtitle")}</p>
        </div>
      </div>

      <div className="flex gap-2 items-start">
        <div className="flex-1">
          <QrOrderSearchBar
            value={searchValue}
            onChange={setSearchValue}
            onSubmit={handleSearch}
            disabled={searching || !canManage}
          />
        </div>
        <button
          type="button"
          disabled={!canManage}
          onClick={() => setScannerOpen(true)}
          className="px-4 py-2.5 rounded-xl border border-border text-sm font-medium flex items-center gap-2 disabled:opacity-60"
          data-testid="qr-order-scan-button"
        >
          <Camera className="h-4 w-4" /> {t("qrStaff.scanQr")}
        </button>
      </div>

      <div
        className="flex gap-1 p-1 rounded-xl bg-muted w-full sm:w-auto"
        role="tablist"
        aria-label={t("qrStaff.tabsAria")}
      >
        <button
          type="button"
          role="tab"
          aria-selected={queueTab === "pending"}
          onClick={() => setQueueTab("pending")}
          className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            queueTab === "pending" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
          }`}
          data-testid="qr-queue-tab-pending"
        >
          {t("qrStaff.tabs.pending", { n: pendingTotal })}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={queueTab === "inPos"}
          onClick={() => setQueueTab("inPos")}
          className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            queueTab === "inPos" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
          }`}
          data-testid="qr-queue-tab-in-pos"
        >
          {t("qrStaff.tabs.inPos", { n: inPosTotal })}
        </button>
      </div>

      {lastSyncAt ? (
        <p className="text-xs text-muted-foreground">
          {t("qrStaff.lastRefresh", {
            at: new Date(lastSyncAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
          })}
          {queueTab === "pending" && pendingTotal > requests.length ? (
            <> · {t("qrStaff.showingPending", { shown: requests.length, total: pendingTotal })}</>
          ) : null}
          {queueTab === "inPos" && inPosTotal > inPosRequests.length ? (
            <> · {t("qrStaff.showingInPos", { shown: inPosRequests.length, total: inPosTotal })}</>
          ) : null}
        </p>
      ) : null}

      {queueTab === "pending" ? (
        <>
          <p className="text-xs text-muted-foreground -mt-1">{t("qrStaff.pendingDesc")}</p>
          <SkeletonBusyRegion busy={initialLoading && requests.length === 0} label={t("qrStaff.loadingPending")}>
            {initialLoading && requests.length === 0 ? (
              <QrOrderCardStackSkeleton cards={3} />
            ) : requests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Package className="h-12 w-12 mb-3 opacity-30" />
                <p className="text-sm font-medium">{t("qrStaff.emptyPending")}</p>
                <p className="text-xs">{t("qrStaff.emptySearch")}</p>
              </div>
            ) : (
              <div className="grid gap-3">
                <AnimatePresence>
                  {requests.map((order) => (
                    <QrOrderQueueCard
                      key={order.id}
                      order={order}
                      canManage={canManage}
                      openingRequestId={openingRequestId}
                      onPreview={openPreview}
                      onOpenInPos={handleOpenInPos}
                      t={t}
                    />
                  ))}
                </AnimatePresence>
                {hasMorePending ? (
                  <button
                    type="button"
                    disabled={loadingMore}
                    onClick={() => void loadMorePending()}
                    className="w-full py-2.5 rounded-xl border border-border text-sm font-medium disabled:opacity-60 flex items-center justify-center gap-2"
                    data-testid="qr-order-load-more"
                  >
                    {loadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {t("qrStaff.loadMore", { shown: requests.length, total: pendingTotal })}
                  </button>
                ) : null}
              </div>
            )}
            {backgroundRefreshing && requests.length > 0 ? (
              <p className="text-xs text-muted-foreground">{t("qrStaff.refreshing")}</p>
            ) : null}
          </SkeletonBusyRegion>
        </>
      ) : (
        <>
          <p className="text-xs text-muted-foreground -mt-1">{t("qrStaff.inPosDesc")}</p>
          <SkeletonBusyRegion busy={inPosLoading && !inPosLoadedOnce} label={t("qrStaff.loadingInPos")}>
            {inPosLoading && !inPosLoadedOnce ? (
              <QrOrderCardStackSkeleton cards={2} />
            ) : inPosRequests.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
                {t("qrStaff.emptyInPos")}
              </div>
            ) : (
              <div className="flex flex-col gap-1.5 max-h-[min(70vh,640px)] overflow-y-auto pr-1">
                {inPosRequests.map((order) => (
                  <QrOrderInPosRow
                    key={order.id}
                    order={order}
                    canManage={canManage}
                    openingRequestId={openingRequestId}
                    onPreview={openPreview}
                    onOpenInPos={handleOpenInPos}
                    t={t}
                  />
                ))}
                {hasMoreInPos ? (
                  <button
                    type="button"
                    disabled={loadingMoreInPos}
                    onClick={() => void loadMoreInPos()}
                    className="w-full py-2 rounded-xl border border-border text-sm font-medium disabled:opacity-60 flex items-center justify-center gap-2 sticky bottom-0 bg-background/95 backdrop-blur-sm"
                    data-testid="qr-order-load-more-in-pos"
                  >
                    {loadingMoreInPos ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {t("qrStaff.loadMore", { shown: inPosRequests.length, total: inPosTotal })}
                  </button>
                ) : null}
              </div>
            )}
          </SkeletonBusyRegion>
        </>
      )}

      <QrOrderScannerModal
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={(code) => {
          setSearchValue(code);
          void handleSearch(code);
        }}
      />

      <QrOrderPreviewDrawer
        requestId={previewRequestId}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        onCancelled={refreshQueues}
      />
    </div>
  );
}
