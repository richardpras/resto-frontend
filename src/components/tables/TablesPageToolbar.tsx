import { Plus, Printer, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import type { TableOperationalStatus, TableStatusFilter } from "./tablesPageUtils";

export type TablesPageMode = "floor" | "manage";

export type StatusFilterChip = {
  key: TableStatusFilter;
  label: string;
  count?: number;
  colorClass?: string;
};

type TablesPageToolbarProps = {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  searchPlaceholder: string;
  mode: TablesPageMode;
  onModeChange: (mode: TablesPageMode) => void;
  modeFloorLabel: string;
  modeManageLabel: string;
  statusChips: StatusFilterChip[];
  statusFilter: TableStatusFilter;
  onStatusFilterChange: (filter: TableStatusFilter) => void;
  canManage: boolean;
  addTableLabel: string;
  onAddTable: () => void;
  selectMode: boolean;
  onSelectModeToggle: () => void;
  selectTablesLabel: string;
  cancelSelectLabel: string;
  selectedCount: number;
  printSelectedLabel: string;
  onPrintSelected: () => void;
};

export function TablesPageToolbar({
  searchQuery,
  onSearchQueryChange,
  searchPlaceholder,
  mode,
  onModeChange,
  modeFloorLabel,
  modeManageLabel,
  statusChips,
  statusFilter,
  onStatusFilterChange,
  canManage,
  addTableLabel,
  onAddTable,
  selectMode,
  onSelectModeToggle,
  selectTablesLabel,
  cancelSelectLabel,
  selectedCount,
  printSelectedLabel,
  onPrintSelected,
}: TablesPageToolbarProps) {
  return (
    <div
      className="sticky top-14 z-20 -mx-4 md:-mx-6 px-4 md:px-6 py-3 mb-4 bg-background/95 backdrop-blur border-b space-y-3"
      data-testid="tables-page-toolbar"
    >
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="pl-9"
            data-testid="tables-search-input"
            aria-label={searchPlaceholder}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ToggleGroup
            type="single"
            value={mode}
            onValueChange={(v) => {
              if (v === "floor" || v === "manage") onModeChange(v);
            }}
            className="justify-start"
          >
            <ToggleGroupItem value="floor" aria-label={modeFloorLabel} className="text-xs sm:text-sm">
              {modeFloorLabel}
            </ToggleGroupItem>
            <ToggleGroupItem value="manage" aria-label={modeManageLabel} className="text-xs sm:text-sm">
              {modeManageLabel}
            </ToggleGroupItem>
          </ToggleGroup>

          {canManage ? (
            <>
              <Button type="button" size="sm" className="hidden md:inline-flex" onClick={onAddTable}>
                <Plus className="h-4 w-4 mr-1" />
                {addTableLabel}
              </Button>
              {mode === "manage" ? (
                <>
                  <Button type="button" size="sm" variant={selectMode ? "secondary" : "outline"} onClick={onSelectModeToggle}>
                    {selectMode ? cancelSelectLabel : selectTablesLabel}
                  </Button>
                  {selectMode ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={selectedCount === 0}
                      onClick={onPrintSelected}
                    >
                      <Printer className="h-4 w-4 mr-1" />
                      {printSelectedLabel}
                    </Button>
                  ) : null}
                </>
              ) : null}
            </>
          ) : null}
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none" data-testid="tables-status-filters">
        {statusChips.map((chip) => (
          <button
            key={chip.key}
            type="button"
            data-testid={`tables-filter-${chip.key}`}
            onClick={() => onStatusFilterChange(chip.key)}
            className={cn(
              "shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors",
              statusFilter === chip.key
                ? chip.colorClass ?? "bg-primary/10 text-primary border-primary/30"
                : "bg-muted/40 text-muted-foreground border-border/50 hover:bg-muted/60",
            )}
          >
            {chip.label}
            {chip.count !== undefined ? `: ${chip.count}` : ""}
          </button>
        ))}
      </div>
    </div>
  );
}
