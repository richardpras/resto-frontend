import { KITCHEN_BOARD_COLUMNS } from "@/domain/kitchenWorkflow";
import type { KitchenTicket } from "@/domain/kitchenAdapters";

type Props = {
  tickets: KitchenTicket[];
};

export function KitchenWorkflowSummary({ tickets }: Props) {
  return (
    <div
      className="flex flex-wrap gap-2 mb-4"
      data-testid="kitchen-workflow-summary"
    >
      {KITCHEN_BOARD_COLUMNS.map((column) => {
        const count = tickets.filter((ticket) => ticket.status === column.status).length;
        return (
          <span
            key={column.id}
            className={`px-3 py-1.5 rounded-xl text-sm font-semibold border ${column.badgeClass}`}
            data-testid={`kitchen-summary-${column.id}`}
          >
            {column.title} ({count})
          </span>
        );
      })}
    </div>
  );
}
