import { Link } from "react-router-dom";
import { useMemo } from "react";
import { ArrowRight, DollarSign, Percent, TrendingDown, TrendingUp, UtensilsCrossed } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useOutletStore } from "@/stores/outletStore";
import { useMenuCostCatalog } from "@/hooks/menu/useMenuCostCatalog";
import { formatMoney, formatPercent } from "@/lib/format/currency";

function WidgetCard({
  title,
  value,
  hint,
  icon: Icon,
  loading,
}: {
  title: string;
  value: string;
  hint?: string;
  icon: typeof DollarSign;
  loading: boolean;
}) {
  return (
    <Card className="rounded-2xl">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? <Skeleton className="h-8 w-28" /> : <p className="text-2xl font-bold">{value}</p>}
        {hint && !loading && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
      </CardContent>
    </Card>
  );
}

export default function MenuCostDashboard() {
  const activeOutletId = useOutletStore((s) => s.activeOutletId);
  const { data: rows = [], isLoading } = useMenuCostCatalog(activeOutletId);

  const stats = useMemo(() => {
    if (rows.length === 0) {
      return {
        totalItems: 0,
        avgFoodCostPercent: 0,
        highestCost: null as (typeof rows)[0] | null,
        lowestMargin: null as (typeof rows)[0] | null,
      };
    }

    const withFoodCostPct = rows.map((row) => ({
      ...row,
      foodCostPercent: row.sellingPrice > 0 ? (row.foodCost / row.sellingPrice) * 100 : 0,
    }));

    const avgFoodCostPercent =
      withFoodCostPct.reduce((sum, row) => sum + row.foodCostPercent, 0) / withFoodCostPct.length;

    const highestCost = [...rows].sort((a, b) => b.foodCost - a.foodCost)[0] ?? null;
    const lowestMargin = [...rows].sort((a, b) => a.marginPercent - b.marginPercent)[0] ?? null;

    return {
      totalItems: rows.length,
      avgFoodCostPercent,
      highestCost,
      lowestMargin,
    };
  }, [rows]);

  const noOutlet = typeof activeOutletId !== "number" || activeOutletId < 1;

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Menu Cost Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            Theoretical food cost and contribution margin for the active outlet.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link to="/menu/costing/items">Browse items</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/menu/costing/comparison">Recipe comparison</Link>
          </Button>
        </div>
      </div>

      {noOutlet && (
        <Card className="rounded-2xl border-dashed p-6 text-sm text-muted-foreground">
          Select an outlet in the header to load costing data.
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <WidgetCard
          title="Total Menu Items"
          value={String(stats.totalItems)}
          icon={UtensilsCrossed}
          loading={isLoading}
        />
        <WidgetCard
          title="Average Food Cost %"
          value={formatPercent(stats.avgFoodCostPercent)}
          icon={Percent}
          loading={isLoading}
        />
        <WidgetCard
          title="Highest Cost Menu"
          value={stats.highestCost ? stats.highestCost.menuItemName : "—"}
          hint={stats.highestCost ? formatMoney(stats.highestCost.foodCost) : undefined}
          icon={TrendingUp}
          loading={isLoading}
        />
        <WidgetCard
          title="Lowest Margin Menu"
          value={stats.lowestMargin ? stats.lowestMargin.menuItemName : "—"}
          hint={stats.lowestMargin ? formatPercent(stats.lowestMargin.marginPercent) : undefined}
          icon={TrendingDown}
          loading={isLoading}
        />
      </div>

      <Card className="rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Quick actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button asChild>
            <Link to="/menu/costing/items">
              View cost list <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button variant="secondary" asChild>
            <Link to="/menu/costing/comparison">
              Compare recipe versions <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
