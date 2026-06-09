import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShadcnTableSkeletonBody } from "@/components/skeletons/table/ShadcnTableSkeletonBody";
import { useOutletStore } from "@/stores/outletStore";
import { useAuthStore, PERMISSIONS } from "@/stores/authStore";
import {
  getMenuCostBreakdown,
  getMenuProfitability,
  recalculateMenuCost,
} from "@/lib/api-integration/menuCostingEndpoints";
import { formatMoney, formatPercent } from "@/lib/format/currency";
import { ApiHttpError } from "@/lib/api-integration/client";

export default function MenuCostDetail() {
  const { id } = useParams<{ id: string }>();
  const activeOutletId = useOutletStore((s) => s.activeOutletId);
  const hasManage = useAuthStore((s) => s.hasPermission(PERMISSIONS.COST_MANAGE));
  const queryClient = useQueryClient();

  const enabled = Boolean(id) && typeof activeOutletId === "number" && activeOutletId >= 1;

  const breakdownQuery = useQuery({
    queryKey: ["menu-cost-breakdown", id, activeOutletId],
    queryFn: () => getMenuCostBreakdown(id!, activeOutletId!),
    enabled,
  });

  const profitabilityQuery = useQuery({
    queryKey: ["menu-profitability", id, activeOutletId],
    queryFn: () => getMenuProfitability(id!, activeOutletId!),
    enabled,
  });

  const recalcMutation = useMutation({
    mutationFn: () => recalculateMenuCost(id!, activeOutletId!),
    onSuccess: () => {
      toast.success("Menu cost recalculated.");
      void queryClient.invalidateQueries({ queryKey: ["menu-cost-breakdown", id, activeOutletId] });
      void queryClient.invalidateQueries({ queryKey: ["menu-profitability", id, activeOutletId] });
      void queryClient.invalidateQueries({ queryKey: ["menu-cost-catalog"] });
    },
    onError: (e) => {
      toast.error(e instanceof ApiHttpError ? e.message : "Recalculation failed");
    },
  });

  const breakdown = breakdownQuery.data;
  const profitability = profitabilityQuery.data;
  const loading = breakdownQuery.isLoading || profitabilityQuery.isLoading;
  const noOutlet = !enabled;

  const yieldLoss = breakdown
    ? Math.max(0, breakdown.yieldAdjustedCost - breakdown.rawCost)
    : 0;
  const wasteLoss = breakdown
    ? Math.max(0, breakdown.wasteAdjustedCost - breakdown.yieldAdjustedCost)
    : 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Button variant="ghost" size="sm" asChild className="-ml-2">
            <Link to="/menu/costing/items">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back to list
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">{breakdown?.menuItemName ?? "Menu Cost Detail"}</h1>
          <p className="text-muted-foreground text-sm">Recipe breakdown and profitability summary.</p>
        </div>
        {hasManage && enabled && (
          <Button
            variant="outline"
            disabled={recalcMutation.isPending}
            onClick={() => recalcMutation.mutate()}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${recalcMutation.isPending ? "animate-spin" : ""}`} />
            Recalculate cost
          </Button>
        )}
      </div>

      {noOutlet && (
        <Card className="rounded-2xl border-dashed p-6 text-sm text-muted-foreground">
          Select an outlet in the header to view this menu item&apos;s cost.
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-2xl lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Recipe Cost Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ingredient</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="text-right">Unit Cost</TableHead>
                  <TableHead className="text-right">Line Cost</TableHead>
                </TableRow>
              </TableHeader>
              {loading ? (
                <ShadcnTableSkeletonBody columns={5} rows={5} />
              ) : (
                <TableBody>
                  {(breakdown?.ingredients ?? []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No recipe ingredients
                      </TableCell>
                    </TableRow>
                  )}
                  {(breakdown?.ingredients ?? []).map((line) => (
                    <TableRow key={line.inventoryItemId}>
                      <TableCell className="font-medium">{line.ingredientName ?? "—"}</TableCell>
                      <TableCell className="text-right">{line.quantity}</TableCell>
                      <TableCell>{line.unit ?? "—"}</TableCell>
                      <TableCell className="text-right">{formatMoney(line.averageCost)}</TableCell>
                      <TableCell className="text-right">{formatMoney(line.lineCost)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              )}
            </Table>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">Cost Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {loading ? (
              <p className="text-muted-foreground">Loading…</p>
            ) : (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Raw Cost</span>
                  <span className="font-medium">{formatMoney(breakdown?.rawCost ?? 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Yield Loss</span>
                  <span className="font-medium">{formatMoney(yieldLoss)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Waste Loss</span>
                  <span className="font-medium">{formatMoney(wasteLoss)}</span>
                </div>
                <div className="flex justify-between border-t pt-3">
                  <span className="font-medium">Final Cost</span>
                  <span className="font-bold">{formatMoney(breakdown?.finalTheoreticalCost ?? 0)}</span>
                </div>
                {breakdown && (
                  <p className="text-xs text-muted-foreground pt-1">
                    Yield {formatPercent(breakdown.yieldPercent, 0)} · Waste {formatPercent(breakdown.wastePercent, 0)}
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">Profitability Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {loading ? (
              <p className="text-muted-foreground">Loading…</p>
            ) : (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Selling Price</span>
                  <span className="font-medium">{formatMoney(profitability?.sellingPrice ?? 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Contribution Margin</span>
                  <span className="font-medium">{formatMoney(profitability?.contributionMargin ?? 0)}</span>
                </div>
                <div className="flex justify-between border-t pt-3">
                  <span className="font-medium">Margin %</span>
                  <Badge>{formatPercent(profitability?.marginPercent ?? 0)}</Badge>
                </div>
                {profitability?.classification && (
                  <p className="text-xs text-muted-foreground">
                    Classification: {profitability.classification}
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
