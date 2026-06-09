import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useOutletStore } from "@/stores/outletStore";
import {
  getMenuCostBreakdown,
  getMenuProfitabilityHistory,
  listRecipeVersions,
  type RecipeVersion,
} from "@/lib/api-integration/menuCostingEndpoints";
import { useMenuCostCatalog } from "@/hooks/menu/useMenuCostCatalog";
import { formatMoney } from "@/lib/format/currency";

function diffIngredientChanges(current: RecipeVersion, previous: RecipeVersion) {
  const mapA = new Map(previous.items.map((i) => [i.ingredientId, i]));
  const mapB = new Map(current.items.map((i) => [i.ingredientId, i]));
  const ids = new Set([...mapA.keys(), ...mapB.keys()]);
  const changes: Array<{
    ingredientName: string;
    previousQty: number | null;
    currentQty: number | null;
  }> = [];

  for (const id of ids) {
    const a = mapA.get(id);
    const b = mapB.get(id);
    const qtyA = a?.quantity ?? null;
    const qtyB = b?.quantity ?? null;
    if (qtyA === qtyB) continue;
    changes.push({
      ingredientName: b?.ingredientName ?? a?.ingredientName ?? id,
      previousQty: qtyA,
      currentQty: qtyB,
    });
  }
  return changes;
}

export default function RecipeCostComparison() {
  const activeOutletId = useOutletStore((s) => s.activeOutletId);
  const { data: catalog = [] } = useMenuCostCatalog(activeOutletId);
  const [menuItemId, setMenuItemId] = useState<string>("");

  const enabled = menuItemId !== "" && typeof activeOutletId === "number" && activeOutletId >= 1;

  const versionsQuery = useQuery({
    queryKey: ["recipe-versions", menuItemId, activeOutletId],
    queryFn: () => listRecipeVersions(menuItemId, activeOutletId!),
    enabled,
  });

  const breakdownQuery = useQuery({
    queryKey: ["menu-cost-breakdown", menuItemId, activeOutletId],
    queryFn: () => getMenuCostBreakdown(menuItemId, activeOutletId!),
    enabled,
  });

  const marginHistoryQuery = useQuery({
    queryKey: ["menu-profitability-history", menuItemId, activeOutletId],
    queryFn: () => getMenuProfitabilityHistory(menuItemId, activeOutletId!),
    enabled,
  });

  const versions = versionsQuery.data ?? [];
  const sortedVersions = useMemo(
    () => [...versions].sort((a, b) => b.versionNumber - a.versionNumber),
    [versions],
  );

  const currentVersion = sortedVersions.find((v) => v.status === "active") ?? sortedVersions[0] ?? null;
  const previousVersion =
    sortedVersions.find((v) => v.id !== currentVersion?.id && v.versionNumber < (currentVersion?.versionNumber ?? 0)) ??
    sortedVersions[1] ??
    null;

  const ingredientChanges =
    currentVersion && previousVersion ? diffIngredientChanges(currentVersion, previousVersion) : [];

  const currentCost = breakdownQuery.data?.finalTheoreticalCost ?? marginHistoryQuery.data?.currentCost ?? 0;
  const previousCost =
    marginHistoryQuery.data?.historicalCost ??
    marginHistoryQuery.data?.comparisons?.[0]?.historicalCost ??
    null;
  const costDelta = previousCost !== null ? currentCost - previousCost : null;

  const currentMargin = marginHistoryQuery.data?.currentMargin ?? null;
  const previousMargin = marginHistoryQuery.data?.historicalMargin ?? null;
  const marginDelta =
    currentMargin !== null && previousMargin !== null ? currentMargin - previousMargin : null;

  const selectedName = catalog.find((r) => r.menuItemId === menuItemId)?.menuItemName;

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link to="/menu/costing">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to dashboard
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Recipe Cost Comparison</h1>
        <p className="text-muted-foreground text-sm">
          Compare the active recipe against the previous version and historical cost snapshots.
        </p>
      </div>

      <Card className="p-4 rounded-2xl">
        <div className="flex flex-wrap gap-3 items-center">
          <Select value={menuItemId} onValueChange={setMenuItemId}>
            <SelectTrigger className="w-full max-w-md">
              <SelectValue placeholder="Select menu item" />
            </SelectTrigger>
            <SelectContent>
              {catalog.map((row) => (
                <SelectItem key={row.menuItemId} value={row.menuItemId}>
                  {row.menuItemName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {!enabled && (
        <Card className="rounded-2xl border-dashed p-6 text-sm text-muted-foreground">
          Select a menu item and outlet to compare recipe versions.
        </Card>
      )}

      {enabled && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">Current Recipe</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {currentVersion ? (
                <>
                  <p className="font-medium">{selectedName}</p>
                  <p className="text-muted-foreground">
                    v{currentVersion.versionNumber} · {currentVersion.name ?? "Active"}
                  </p>
                  <p className="text-lg font-bold">{formatMoney(currentCost)}</p>
                  {currentMargin !== null && (
                    <p className="text-muted-foreground">Margin {formatMoney(currentMargin)}</p>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground">No recipe version found.</p>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">Previous Version</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {previousVersion ? (
                <>
                  <p className="font-medium">{selectedName}</p>
                  <p className="text-muted-foreground">
                    v{previousVersion.versionNumber} · {previousVersion.name ?? previousVersion.status}
                  </p>
                  <p className="text-lg font-bold">
                    {previousCost !== null ? formatMoney(previousCost) : "—"}
                  </p>
                  {previousMargin !== null && (
                    <p className="text-muted-foreground">Margin {formatMoney(previousMargin)}</p>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground">No previous version to compare.</p>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Cost &amp; Margin Delta</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 text-sm">
              <div className="rounded-xl border p-4">
                <p className="text-muted-foreground">Cost Delta</p>
                <p className={`text-xl font-bold ${costDelta !== null && costDelta > 0 ? "text-destructive" : ""}`}>
                  {costDelta !== null ? formatMoney(costDelta) : "—"}
                </p>
              </div>
              <div className="rounded-xl border p-4">
                <p className="text-muted-foreground">Margin Delta</p>
                <p className={`text-xl font-bold ${marginDelta !== null && marginDelta < 0 ? "text-destructive" : ""}`}>
                  {marginDelta !== null ? formatMoney(marginDelta) : "—"}
                </p>
              </div>
            </CardContent>
          </Card>

          {ingredientChanges.length > 0 && (
            <Card className="rounded-2xl lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Ingredient Changes</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ingredient</TableHead>
                      <TableHead className="text-right">Previous Qty</TableHead>
                      <TableHead className="text-right">Current Qty</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ingredientChanges.map((row) => (
                      <TableRow key={row.ingredientName}>
                        <TableCell>{row.ingredientName}</TableCell>
                        <TableCell className="text-right">{row.previousQty ?? "—"}</TableCell>
                        <TableCell className="text-right">{row.currentQty ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
