import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { useOpsTranslation } from "@/i18n/useOpsTranslation";
import {
  getInventoryConsumptionQueue,
  postInventoryConsumption,
  type InventoryConsumptionQueueRow,
} from "@/lib/api-integration/inventoryPostingEndpoints";

type Props = {
  outletId: number;
};

export function PendingInventoryConsumptionPanel({ outletId }: Props) {
  const { t } = useOpsTranslation();
  const queryClient = useQueryClient();
  const queueQ = useQuery({
    queryKey: ["inventory-consumption-queue", outletId],
    queryFn: () => getInventoryConsumptionQueue(outletId),
    enabled: outletId >= 1,
    staleTime: 30_000,
  });

  const rows = queueQ.data ?? [];

  function statusBadge(status: string) {
    if (status === "processed") return <Badge variant="outline">{t("inventory.posting.status.posted")}</Badge>;
    if (status === "review_required") return <Badge className="bg-warning/15 text-warning border-warning/30">{t("inventory.posting.status.review")}</Badge>;
    if (status === "failed") return <Badge variant="destructive">{t("inventory.posting.status.failed")}</Badge>;
    return <Badge variant="secondary">{t("inventory.posting.status.pending")}</Badge>;
  }

  async function handleRetryPosting() {
    try {
      const result = await postInventoryConsumption(outletId);
      toast({
        title: t("inventory.posting.completedTitle"),
        description: t("inventory.posting.completedDesc", {
          processed: result.processed,
          reviewRequired: result.reviewRequired,
          failed: result.failed,
        }),
      });
      await queryClient.invalidateQueries({ queryKey: ["inventory-consumption-queue", outletId] });
      await queryClient.invalidateQueries({ queryKey: ["system-health", "inventory-posting", outletId] });
    } catch (error) {
      toast({
        title: t("inventory.posting.failedTitle"),
        description: error instanceof Error ? error.message : t("shared.somethingWrong"),
        variant: "destructive",
      });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{t("inventory.posting.title")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("inventory.posting.subtitle")}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void queueQ.refetch()} disabled={queueQ.isFetching}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {t("inventory.posting.refresh")}
          </Button>
          <Button size="sm" onClick={() => void handleRetryPosting()}>
            {t("inventory.posting.retryPosting")}
          </Button>
        </div>
      </div>

      {queueQ.isLoading ? (
        <p className="text-sm text-muted-foreground">{t("inventory.posting.loadingQueue")}</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("inventory.posting.noRows")}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-3 py-2 font-medium">{t("inventory.posting.columns.date")}</th>
                <th className="px-3 py-2 font-medium">{t("inventory.posting.columns.order")}</th>
                <th className="px-3 py-2 font-medium">{t("inventory.posting.columns.status")}</th>
                <th className="px-3 py-2 font-medium text-right">{t("inventory.posting.columns.total")}</th>
                <th className="px-3 py-2 font-medium">{t("inventory.posting.columns.notes")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row: InventoryConsumptionQueueRow) => (
                <tr key={row.id} className="border-t border-border/60">
                  <td className="px-3 py-2 text-muted-foreground">
                    {row.createdAt ? new Date(row.createdAt).toLocaleString() : "—"}
                  </td>
                  <td className="px-3 py-2 font-medium">{row.orderCode || `#${row.orderId}`}</td>
                  <td className="px-3 py-2">{statusBadge(row.status)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {row.orderTotal != null ? `Rp ${row.orderTotal.toLocaleString("id-ID")}` : "—"}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {row.failureReason ?? (row.status === "review_required" ? t("inventory.posting.varianceReview") : "—")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
