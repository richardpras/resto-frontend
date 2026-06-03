import type { KitchenBoardColumn } from "@/domain/kitchenWorkflow";
import { KITCHEN_BOARD_COLUMNS, groupTicketsByBoardColumn, readyColumnBadgeClass } from "@/domain/kitchenWorkflow";
import type { KitchenTicket } from "@/domain/kitchenAdapters";
import { KitchenTicketCard } from "@/components/kitchen/KitchenTicketCard";

type Props = {
  tickets: KitchenTicket[];
  nowMs: number;
  isSubmitting: boolean;
  recoverySubmitting: boolean;
  canReportItemRecovery: boolean;
  onAdvance: (ticketId: string, column: KitchenBoardColumn) => void;
  onCancel: (ticketId: string) => void;
  onItemIssue: (orderId: string, orderItemId: string, itemName: string) => void;
};

export function KitchenWorkflowBoard({
  tickets,
  nowMs,
  isSubmitting,
  recoverySubmitting,
  canReportItemRecovery,
  onAdvance,
  onCancel,
  onItemIssue,
}: Props) {
  const grouped = groupTicketsByBoardColumn(tickets);

  return (
    <div
      className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start"
      data-testid="kitchen-workflow-board"
    >
      {KITCHEN_BOARD_COLUMNS.map((column) => (
        <section
          key={column.id}
          className="flex flex-col min-h-[200px] max-h-[calc(100vh-16rem)] rounded-2xl border border-border/50 bg-muted/10 overflow-hidden"
          data-testid={`kitchen-column-${column.id}`}
        >
          <header
            className="sticky top-0 z-10 px-4 py-3 border-b border-border/50 flex items-center justify-between gap-2 bg-muted/95 backdrop-blur-sm"
            data-testid={`kitchen-column-header-${column.id}`}
          >
            <h2 className="text-sm font-semibold tracking-wide text-foreground">{column.title}</h2>
            <span
              className={`px-2.5 py-1 rounded-xl text-xs font-medium border ${readyColumnBadgeClass(column.id === "ready", column.badgeClass)}`}
            >
              {grouped[column.id].length}
            </span>
          </header>

          <div className="p-3 flex flex-col gap-3 overflow-y-auto flex-1 min-h-0">
            {grouped[column.id].length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No tickets</p>
            ) : (
              grouped[column.id].map((ticket) => (
                <KitchenTicketCard
                  key={ticket.id}
                  ticket={ticket}
                  column={column}
                  nowMs={nowMs}
                  isSubmitting={isSubmitting}
                  recoverySubmitting={recoverySubmitting}
                  canReportItemRecovery={canReportItemRecovery}
                  onAdvance={(id) => onAdvance(id, column)}
                  onCancel={onCancel}
                  onItemIssue={onItemIssue}
                />
              ))
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
