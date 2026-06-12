import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import {
  getInventoryConsumptionQueue,
  postInventoryConsumption,
  type InventoryConsumptionQueueRow,
} from "@/lib/api-integration/inventoryPostingEndpoints";

function statusBadge(status: string) {
  if (status === "processed") return <Badge variant="outline">Posted</Badge>;
  if (status === "review_required") return <Badge className="bg-warning/15 text-warning border-warning/30">Review</Badge>;
  if (status === "failed") return <Badge variant="destructive">Failed</Badge>;
  return <Badge variant="secondary">Pending</Badge>;
}

type Props = {
  outletId: number;
};

export function PendingInventoryConsumptionPanel({ outletId }: Props) {
  const queryClient = useQueryClient();
  const queueQ = useQuery({
    queryKey: ["inventory-consumption-queue", outletId],
    queryFn: () => getInventoryConsumptionQueue(outletId),
    enabled: outletId >= 1,
    staleTime: 30_000,
  });

  const rows = queueQ.data ?? [];

  async function handleRetryPosting() {
    try {
      const result = await postInventoryConsumption(outletId);
      toast({
        title: "Inventory posting completed",
        description: `Processed ${result.processed}, review required ${result.reviewRequired}, failed ${result.failed}.`,
      });
      await queryClient.invalidateQueries({ queryKey: ["inventory-consumption-queue", outletId] });
      await queryClient.invalidateQueries({ queryKey: ["system-health", "inventory-posting", outletId] });
    } catch (error) {
      toast({
        title: "Posting failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Pending Inventory Consumption</h2>
          <p className="text-sm text-muted-foreground">
            Deferred sales waiting for shift close or manual inventory posting.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void queueQ.refetch()} disabled={queueQ.isFetching}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm" onClick={() => void handleRetryPosting()}>
            Retry Posting
          </Button>
        </div>
      </div>

      {queueQ.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading queue…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No pending consumption rows for this outlet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-3 py-2 font-medium">Date</th>
                <th className="px-3 py-2 font-medium">Order</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium text-right">Total</th>
                <th className="px-3 py-2 font-medium">Notes</th>
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
                    {row.failureReason ?? (row.status === "review_required" ? "Variance — review required" : "—")}
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
