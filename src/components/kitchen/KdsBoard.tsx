import { memo, useMemo } from "react";
import type { KitchenBoardColumn } from "@/domain/kitchenWorkflow";
import { KITCHEN_BOARD_COLUMNS, groupTicketsByBoardColumn, readyColumnBadgeClass } from "@/domain/kitchenWorkflow";
import type { KitchenTicket } from "@/domain/kitchenAdapters";
import type { KdsFocusMode } from "@/hooks/useKdsFocusMode";
import { KdsTicketCard } from "@/components/kitchen/KdsTicketCard";
import { cn } from "@/lib/utils";

type Props = {
  tickets: KitchenTicket[];
  nowMs: number;
  focusMode?: KdsFocusMode;
  isFullscreen?: boolean;
  isSubmitting: boolean;
  recoverySubmitting: boolean;
  canReportItemRecovery: boolean;
  newTicketIds?: ReadonlySet<string>;
  showStationBadges?: boolean;
  onAdvance: (ticketId: string, column: KitchenBoardColumn) => void;
  onCancel: (ticketId: string) => void;
  onItemIssue: (orderId: string, orderItemId: string, itemName: string) => void;
};

const COLUMN_ACCENT: Record<string, string> = {
  new: "border-amber-400/40",
  cooking: "border-sky-400/40",
  ready: "border-emerald-400/50",
};

type ColumnProps = {
  column: KitchenBoardColumn;
  columnTickets: KitchenTicket[];
  nowMs: number;
  focusMode?: KdsFocusMode;
  isSubmitting: boolean;
  recoverySubmitting: boolean;
  canReportItemRecovery: boolean;
  newTicketIds: ReadonlySet<string>;
  showStationBadges?: boolean;
  onAdvance: (ticketId: string, column: KitchenBoardColumn) => void;
  onCancel: (ticketId: string) => void;
  onItemIssue: (orderId: string, orderItemId: string, itemName: string) => void;
};

const KdsBoardColumn = memo(function KdsBoardColumn({
  column,
  columnTickets,
  nowMs,
  focusMode = "comfortable",
  isSubmitting,
  recoverySubmitting,
  canReportItemRecovery,
  newTicketIds,
  showStationBadges = false,
  onAdvance,
  onCancel,
  onItemIssue,
}: ColumnProps) {
  return (
    <section
      className={cn(
        "flex h-full min-h-0 flex-col rounded-2xl border bg-kds-column/60 overflow-hidden",
        COLUMN_ACCENT[column.id] ?? "border-kds-card-border",
      )}
      data-testid={`kitchen-column-${column.id}`}
    >
      <header
        className="shrink-0 px-4 py-3 border-b border-kds-card-border flex items-center justify-between gap-2 bg-kds-column-header"
        data-testid={`kitchen-column-header-${column.id}`}
      >
        <h2 className="text-base sm:text-lg font-extrabold tracking-widest text-kds-fg">{column.title}</h2>
        <span
          className={cn(
            "px-3 py-1 rounded-xl text-sm font-bold border tabular-nums",
            readyColumnBadgeClass(column.id === "ready", column.badgeClass),
            column.id === "ready" && "bg-emerald-500/15 text-emerald-200 border-emerald-400/40",
            column.id === "new" && "bg-amber-500/15 text-amber-100 border-amber-400/40",
            column.id === "cooking" && "bg-sky-500/15 text-sky-100 border-sky-400/40",
          )}
        >
          {columnTickets.length}
        </span>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-y-contain kds-column-scroll">
        <div className="flex flex-col gap-3 p-3">
          {columnTickets.length === 0 ? (
            <p className="text-sm text-kds-muted-fg text-center py-10">No tickets</p>
          ) : (
            columnTickets.map((ticket) => (
              <KdsTicketCard
                key={ticket.id}
                ticket={ticket}
                column={column}
                nowMs={nowMs}
                focusMode={focusMode}
                isSubmitting={isSubmitting}
                recoverySubmitting={recoverySubmitting}
                canReportItemRecovery={canReportItemRecovery}
                isNewHighlight={newTicketIds.has(ticket.id)}
                showStationBadge={showStationBadges}
                onAdvance={(id) => onAdvance(id, column)}
                onCancel={onCancel}
                onItemIssue={onItemIssue}
              />
            ))
          )}
        </div>
      </div>
    </section>
  );
});

export function KdsBoard({
  tickets,
  nowMs,
  focusMode = "comfortable",
  isFullscreen = false,
  isSubmitting,
  recoverySubmitting,
  canReportItemRecovery,
  newTicketIds = new Set(),
  showStationBadges = false,
  onAdvance,
  onCancel,
  onItemIssue,
}: Props) {
  const grouped = useMemo(() => groupTicketsByBoardColumn(tickets), [tickets]);

  return (
    <div
      className={cn(
        "grid gap-3 sm:gap-4 flex-1 min-h-0",
        isFullscreen ? "kds-board-fullscreen grid-cols-3" : "h-full grid-cols-1 lg:grid-cols-3",
      )}
      data-testid="kitchen-workflow-board"
    >
      {KITCHEN_BOARD_COLUMNS.map((column) => (
        <KdsBoardColumn
          key={column.id}
          column={column}
          columnTickets={grouped[column.id]}
          nowMs={nowMs}
          focusMode={focusMode}
          isSubmitting={isSubmitting}
          recoverySubmitting={recoverySubmitting}
          canReportItemRecovery={canReportItemRecovery}
          newTicketIds={newTicketIds}
          showStationBadges={showStationBadges}
          onAdvance={onAdvance}
          onCancel={onCancel}
          onItemIssue={onItemIssue}
        />
      ))}
    </div>
  );
}
