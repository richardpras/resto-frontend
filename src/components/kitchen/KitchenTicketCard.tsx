import { AlertTriangle, Clock, MoreVertical, XCircle } from "lucide-react";
import { motion } from "framer-motion";
import type { KitchenBoardColumn } from "@/domain/kitchenWorkflow";
import {
  elapsedMinutesSince,
  elapsedUrgency,
  formatElapsedClock,
  formatServiceModeLabel,
  ticketElapsedReferenceDate,
  elapsedBorderClass,
  elapsedHeaderClass,
  elapsedTimeClass,
  readyTicketCardClass,
  hasItemNotes,
} from "@/domain/kitchenWorkflow";
import type { KitchenTicket } from "@/domain/kitchenAdapters";

type Props = {
  ticket: KitchenTicket;
  column: KitchenBoardColumn;
  nowMs: number;
  isSubmitting: boolean;
  recoverySubmitting: boolean;
  canReportItemRecovery: boolean;
  onAdvance: (ticketId: string) => void;
  onCancel: (ticketId: string) => void;
  onItemIssue: (orderId: string, orderItemId: string, itemName: string) => void;
};

export function KitchenTicketCard({
  ticket,
  column,
  nowMs,
  isSubmitting,
  recoverySubmitting,
  canReportItemRecovery,
  onAdvance,
  onCancel,
  onItemIssue,
}: Props) {
  const refDate = ticketElapsedReferenceDate(ticket);
  const minutes = elapsedMinutesSince(refDate, nowMs);
  const urgency = elapsedUrgency(minutes);
  const orderLabel = ticket.orderNumber ?? ticket.orderCode ?? `Order #${ticket.orderId}`;
  const itemCount = ticket.items.reduce((sum, item) => sum + item.qty, 0);
  const isReady = ticket.status === "ready";

  return (
    <motion.article
      layout
      data-testid="kitchen-ticket-card"
      data-ticket-id={ticket.id}
      data-column={column.id}
      data-status={ticket.status}
      data-ready-emphasis={isReady ? "true" : "false"}
      className={`bg-card rounded-2xl overflow-hidden flex flex-col ${readyTicketCardClass(isReady)} ${isReady ? "" : elapsedBorderClass(urgency)}`}
    >
      <div className={`px-4 py-3 flex items-center justify-between border-b ${elapsedHeaderClass(urgency)}`}>
        <div className="min-w-0">
          <p className="font-bold text-sm text-foreground truncate">Ticket {ticket.ticketNo}</p>
          <p className="text-xs text-muted-foreground truncate">{orderLabel}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {isReady ? (
            <span
              className="px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wide bg-success/15 text-success border border-success/30 ring-1 ring-success/20"
              data-testid="kitchen-ready-badge"
            >
              Ready
            </span>
          ) : null}
          {urgency !== "normal" ? <AlertTriangle className={`h-4 w-4 ${elapsedTimeClass(urgency)}`} /> : null}
        </div>
      </div>

      <div className="p-4 flex-1 flex flex-col gap-3">
        <div className="space-y-0.5 text-xs text-muted-foreground">
          {ticket.tableNumber ? <p>Table {ticket.tableNumber}</p> : null}
          <p>{formatServiceModeLabel(ticket.serviceMode)}</p>
          <p>{ticket.items.length} line(s) · {itemCount} item(s)</p>
        </div>

        <div className="space-y-2">
          {ticket.items.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No items yet</p>
          ) : (
            ticket.items.map((item) => (
              <div key={item.id} className="flex items-start gap-2 group/row">
                <span className="text-xs font-bold text-primary bg-primary/10 rounded-md min-w-5 h-5 px-1 flex items-center justify-center shrink-0">
                  {item.qty}x
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-1">
                    <p className="text-sm font-medium text-foreground">{item.name}</p>
                    {canReportItemRecovery ? (
                      <button
                        type="button"
                        aria-label="Item issue"
                        disabled={recoverySubmitting || isSubmitting}
                        className="shrink-0 p-1 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground opacity-70 group-hover/row:opacity-100"
                        onClick={() => onItemIssue(ticket.orderId, item.orderItemId, item.name)}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>
                  {item.recoveryStatus ? (
                    <p className="text-[10px] text-amber-700 dark:text-amber-200 mt-0.5" data-testid="kitchen-item-recovery-badge">
                      {String(item.recoveryStatus).replace(/_/g, " ")}
                      {item.recoveryReason ? ` · ${item.recoveryReason}` : ""}
                    </p>
                  ) : null}
                  {hasItemNotes(item.notes) ? (
                    <p
                      className="text-xs font-semibold text-warning bg-warning/10 border border-warning/30 rounded-md px-2 py-1 mt-0.5 uppercase tracking-wide"
                      data-testid="kitchen-item-notes"
                    >
                      {item.notes}
                    </p>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>

        <p className={`flex items-center gap-1 text-xs font-mono font-medium mt-auto ${elapsedTimeClass(urgency)}`}>
          <Clock className="h-3 w-3" />
          Elapsed {formatElapsedClock(refDate, nowMs)}
        </p>
      </div>

      <div className="px-4 pb-4 flex gap-2">
        <button
          type="button"
          onClick={() => onAdvance(ticket.id)}
          disabled={isSubmitting || recoverySubmitting}
          className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          {column.actionLabel}
        </button>
        <button
          type="button"
          onClick={() => onCancel(ticket.id)}
          disabled={isSubmitting || recoverySubmitting}
          aria-label="Cancel ticket"
          className="py-2.5 px-3 rounded-xl border border-destructive/20 text-destructive text-sm hover:bg-destructive/5 transition-colors"
        >
          <XCircle className="h-4 w-4" />
        </button>
      </div>
    </motion.article>
  );
}
