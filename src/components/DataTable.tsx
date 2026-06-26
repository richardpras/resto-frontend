import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight, Search, Inbox, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SkeletonBusyRegion } from "@/components/skeletons/SkeletonBusyRegion";
import { SkeletonTableBodyRows } from "@/components/skeletons/table/SkeletonTableBodyRows";

export type Column<T> = {
  key: string;
  header: string;
  sortable?: boolean;
  className?: string;
  width?: string;
  accessor?: (row: T) => any;
  render?: (row: T) => React.ReactNode;
};

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  searchKeys?: (keyof T | string)[];
  pageSizeOptions?: (number | "All")[];
  defaultPageSize?: number;
  emptyMessage?: string;
  emptyAction?: { label: string; onClick: () => void };
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  rightToolbar?: React.ReactNode;
  filterToolbar?: React.ReactNode;
  mobileCardRender?: (row: T) => React.ReactNode;
}

function DefaultMobileCard<T>({ row, columns }: { row: T; columns: Column<T>[] }) {
  const visible = columns.filter((c) => c.key !== "actions").slice(0, 4);

  return (
    <div className="rounded-xl border border-border/60 bg-background p-4 space-y-2">
      {visible.map((col) => {
        const value = col.render
          ? col.render(row)
          : col.accessor
            ? col.accessor(row)
            : (row as Record<string, unknown>)[col.key];
        return (
          <div key={col.key} className="flex items-start justify-between gap-3 text-sm">
            <span className="text-muted-foreground shrink-0">{col.header}</span>
            <span className="text-foreground text-right font-medium min-w-0 break-words">{value as React.ReactNode}</span>
          </div>
        );
      })}
    </div>
  );
}

function useDebounced<T>(value: T, ms = 250): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export function DataTable<T>({
  data, columns, loading, searchable = true, searchPlaceholder,
  searchKeys, pageSizeOptions = [10, 25, 50, 100, "All"], defaultPageSize = 10,
  emptyMessage, emptyAction, rowKey, onRowClick,
  rightToolbar, filterToolbar, mobileCardRender,
}: DataTableProps<T>) {
  const { t } = useTranslation("common");
  const resolvedSearchPlaceholder = searchPlaceholder ?? t("dataTable.searchPlaceholder");
  const resolvedEmptyMessage = emptyMessage ?? t("dataTable.emptyMessage");
  const [search, setSearch] = useState("");
  const debounced = useDebounced(search, 300);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number | "All">(defaultPageSize);

  useEffect(() => { setPage(1); }, [debounced, pageSize, data.length]);

  const filtered = useMemo(() => {
    if (!debounced.trim()) return data;
    const q = debounced.toLowerCase();
    const keys = searchKeys ?? columns.map((c) => c.key);
    return data.filter((row: any) =>
      keys.some((k) => String(row[k] ?? "").toLowerCase().includes(q)),
    );
  }, [data, debounced, searchKeys, columns]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const col = columns.find((c) => c.key === sortKey);
    if (!col) return filtered;
    const acc = col.accessor ?? ((r: any) => r[sortKey]);
    return [...filtered].sort((a, b) => {
      const av = acc(a); const bv = acc(b);
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "number" && typeof bv === "number") return sortDir === "asc" ? av - bv : bv - av;
      return sortDir === "asc"
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
  }, [filtered, sortKey, sortDir, columns]);

  const total = sorted.length;
  const size = pageSize === "All" ? total || 1 : pageSize;
  const totalPages = Math.max(1, Math.ceil(total / size));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * size;
  const paginated = pageSize === "All" ? sorted : sorted.slice(start, start + size);

  const toggleSort = (key: string) => {
    if (sortKey !== key) { setSortKey(key); setSortDir("asc"); }
    else if (sortDir === "asc") setSortDir("desc");
    else { setSortKey(null); setSortDir("asc"); }
  };

  return (
    <SkeletonBusyRegion busy={!!loading} className="bg-card rounded-2xl border border-border/50 pos-shadow-md overflow-hidden" label={t("dataTable.loadingLabel")}>
      {(searchable || filterToolbar || rightToolbar) && (
        <div className="p-4 flex flex-wrap items-center gap-3 border-b border-border/50">
          {searchable && (
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={resolvedSearchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          )}
          {filterToolbar}
          <div className="ml-auto flex items-center gap-2">{rightToolbar}</div>
        </div>
      )}

      <div className={cn("hidden lg:block overflow-auto max-h-[calc(100vh-280px)]", loading && "min-h-[280px]")}>
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-muted/60 backdrop-blur-sm">
            <tr className="border-b">
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={col.width ? { width: col.width } : undefined}
                  className={cn(
                    "h-11 px-4 text-left align-middle font-medium text-xs uppercase tracking-wider text-muted-foreground",
                    col.sortable && "cursor-pointer select-none hover:text-foreground",
                    col.className,
                  )}
                  onClick={() => col.sortable && toggleSort(col.key)}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.header}
                    {col.sortable && (
                      sortKey === col.key
                        ? sortDir === "asc"
                          ? <ChevronUp className="h-3.5 w-3.5" />
                          : <ChevronDown className="h-3.5 w-3.5" />
                        : <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonTableBodyRows columnCount={columns.length} rowCount={6} />
            ) : paginated.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-16">
                  <div className="flex flex-col items-center justify-center gap-3 text-center">
                    <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center">
                      <Inbox className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">{resolvedEmptyMessage}</p>
                    {emptyAction && (
                      <Button onClick={emptyAction.onClick} size="sm" className="rounded-xl">
                        <Plus className="h-4 w-4 mr-1" />{emptyAction.label}
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              paginated.map((row) => (
                <tr
                  key={rowKey(row)}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    "border-b border-border/50 transition-colors hover:bg-muted/40",
                    onRowClick && "cursor-pointer",
                  )}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={cn("p-4 align-middle", col.className)}>
                      {col.render ? col.render(row) : (col.accessor ? col.accessor(row) : (row as any)[col.key])}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className={cn("lg:hidden p-4 space-y-3", loading && "min-h-[200px]")}>
        {loading ? (
          <div className="space-y-3" aria-hidden>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 rounded-xl bg-muted/50 animate-pulse" />
            ))}
          </div>
        ) : paginated.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center">
              <Inbox className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">{resolvedEmptyMessage}</p>
            {emptyAction ? (
              <Button onClick={emptyAction.onClick} size="sm" className="rounded-xl">
                <Plus className="h-4 w-4 mr-1" />
                {emptyAction.label}
              </Button>
            ) : null}
          </div>
        ) : (
          paginated.map((row) => (
            <div
              key={rowKey(row)}
              onClick={() => onRowClick?.(row)}
              className={cn(onRowClick && "cursor-pointer")}
              role={onRowClick ? "button" : undefined}
              tabIndex={onRowClick ? 0 : undefined}
              onKeyDown={
                onRowClick
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onRowClick(row);
                      }
                    }
                  : undefined
              }
            >
              {mobileCardRender ? mobileCardRender(row) : <DefaultMobileCard row={row} columns={columns} />}
            </div>
          ))
        )}
      </div>

      {!loading && total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-border/50 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <span>{t("dataTable.rowsPerPage")}:</span>
            <select
              value={String(pageSize)}
              onChange={(e) => setPageSize(e.target.value === "All" ? "All" : Number(e.target.value))}
              className="bg-background border border-border rounded-lg px-2 py-1 text-foreground"
            >
              {pageSizeOptions.map((opt) => (
                <option key={String(opt)} value={String(opt)}>{opt}</option>
              ))}
            </select>
          </div>
          <div className="text-muted-foreground">
            {t("dataTable.showingRange", {
              from: total === 0 ? 0 : start + 1,
              to: Math.min(start + size, total),
              total,
            })}
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)} className="h-8 w-8">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-3 text-sm">
              {t("dataTable.pageInfo", { current: currentPage, total: totalPages })}
            </span>
            <Button variant="ghost" size="icon" disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)} className="h-8 w-8">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </SkeletonBusyRegion>
  );
}
