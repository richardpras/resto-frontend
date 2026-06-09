import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, ChevronLeft, ChevronRight, ArrowUpDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShadcnTableSkeletonBody } from "@/components/skeletons/table/ShadcnTableSkeletonBody";
import { useOutletStore } from "@/stores/outletStore";
import {
  filterMenuCostRows,
  paginateRows,
  sortMenuCostRows,
  useMenuCostCatalog,
  type MenuCostSortKey,
} from "@/hooks/menu/useMenuCostCatalog";
import { formatMoney, formatPercent } from "@/lib/format/currency";

const SORT_OPTIONS: { value: MenuCostSortKey; label: string }[] = [
  { value: "foodCost", label: "Cost" },
  { value: "contributionMargin", label: "Margin" },
  { value: "marginPercent", label: "Margin %" },
  { value: "sellingPrice", label: "Selling Price" },
];

function classificationVariant(classification: string): "default" | "secondary" | "destructive" | "outline" {
  if (classification === "PREMIUM" || classification === "HIGH") return "default";
  if (classification === "LOSS") return "destructive";
  return "secondary";
}

export default function MenuCostList() {
  const activeOutletId = useOutletStore((s) => s.activeOutletId);
  const { data: catalog = [], isLoading } = useMenuCostCatalog(activeOutletId);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [sortBy, setSortBy] = useState<MenuCostSortKey>("marginPercent");
  const [sortDesc, setSortDesc] = useState(true);
  const [page, setPage] = useState(1);
  const perPage = 20;

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const row of catalog) {
      if (row.category) set.add(row.category);
    }
    return [...set].sort();
  }, [catalog]);

  const { rows, total, lastPage } = useMemo(() => {
    const filtered = filterMenuCostRows(catalog, search, category);
    const sorted = sortMenuCostRows(filtered, sortBy, sortDesc);
    return { ...paginateRows(sorted, page, perPage), filteredCount: filtered.length };
  }, [catalog, search, category, sortBy, sortDesc, page]);

  const noOutlet = typeof activeOutletId !== "number" || activeOutletId < 1;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Menu Cost List</h1>
        <p className="text-muted-foreground text-sm">Theoretical cost and profitability by menu item.</p>
      </div>

      {noOutlet && (
        <Card className="rounded-2xl border-dashed p-6 text-sm text-muted-foreground">
          Select an outlet in the header to load costing data.
        </Card>
      )}

      <Card className="p-4 rounded-2xl">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search menu items"
              className="pl-9"
            />
          </div>
          <Select
            value={category}
            onValueChange={(v) => {
              setCategory(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as MenuCostSortKey)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSortDesc((d) => !d)}
            title={sortDesc ? "Descending" : "Ascending"}
          >
            <ArrowUpDown className="h-4 w-4" />
          </Button>
        </div>
      </Card>

      <Card className="rounded-2xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Menu Item</TableHead>
              <TableHead className="text-right">Selling Price</TableHead>
              <TableHead className="text-right">Food Cost</TableHead>
              <TableHead className="text-right">Contribution Margin</TableHead>
              <TableHead className="text-right">Margin %</TableHead>
              <TableHead>Last Updated</TableHead>
            </TableRow>
          </TableHeader>
          {isLoading ? (
            <ShadcnTableSkeletonBody columns={6} rows={10} />
          ) : (
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                    No menu items found
                  </TableCell>
                </TableRow>
              )}
              {rows.map((row) => (
                <TableRow key={row.menuItemId}>
                  <TableCell>
                    <Link
                      to={`/menu/costing/items/${row.menuItemId}`}
                      className="font-medium hover:underline"
                    >
                      {row.menuItemName}
                    </Link>
                    {row.category && (
                      <p className="text-xs text-muted-foreground">{row.category}</p>
                    )}
                  </TableCell>
                  <TableCell className="text-right">{formatMoney(row.sellingPrice)}</TableCell>
                  <TableCell className="text-right">{formatMoney(row.foodCost)}</TableCell>
                  <TableCell className="text-right">{formatMoney(row.contributionMargin)}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={classificationVariant(row.classification)}>{formatPercent(row.marginPercent)}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {row.lastUpdated ? new Date(row.lastUpdated).toLocaleDateString() : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          )}
        </Table>

        {!isLoading && total > 0 && (
          <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-muted-foreground">
            <span>
              Page {page} of {lastPage} · {total} items
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" disabled={page >= lastPage} onClick={() => setPage((p) => p + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
