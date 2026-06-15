import { memo, useMemo } from "react";
import { AlertTriangle, MoreVertical, XCircle } from "lucide-react";
import { motion } from "framer-motion";
import type { KitchenBoardColumn } from "@/domain/kitchenWorkflow";
import {
  elapsedMinutesSince,
  elapsedUrgency,
  hasItemNotes,
  ticketElapsedReferenceDate,
} from "@/domain/kitchenWorkflow";
import {
  formatKdsOrderAge,
  kdsUrgencyBadgeClass,
  kdsUrgencyBorderClass,
  kdsUrgencyHeaderClass,
  kdsUrgencyTimerClass,
} from "@/domain/kdsUrgency";
import type { KitchenTicket } from "@/domain/kitchenAdapters";
import type { KdsFocusMode } from "@/hooks/useKdsFocusMode";
import { translateKitchenServiceMode } from "@/components/kitchen/kitchenBoardI18n";
import { useOpsTranslation } from "@/i18n/useOpsTranslation";
import { cn } from "@/lib/utils";

type Props = {
  ticket: KitchenTicket;
  column: KitchenBoardColumn;
  nowMs: number;
  focusMode?: KdsFocusMode;
  isSubmitting: boolean;
  recoverySubmitting: boolean;
  canReportItemRecovery: boolean;
  isNewHighlight?: boolean;
  showStationBadge?: boolean;
  onAdvance: (ticketId: string) => void;
  onCancel: (ticketId: string) => void;
  onItemIssue: (orderId: string, orderItemId: string, itemName: string) => void;
};

function formatOrderLabel(ticket: KitchenTicket): string {
  const raw = ticket.orderNumber ?? ticket.orderCode ?? ticket.orderId;
  const text = String(raw).trim();
  if (!text) return "#—";
  return text.startsWith("#") ? text : `#${text}`;
}

function formatModifierLine(notes: string): string {
  const trimmed = notes.trim();
  if (trimmed.startsWith("+") || trimmed.startsWith("-")) return trimmed;
  return `+ ${trimmed}`;
}

const FOCUS_STYLES = {
  comfortable: {
    card: "min-w-[280px]",
    order: "text-2xl sm:text-3xl",
    age: "text-xl sm:text-2xl",
    itemQty: "text-lg font-bold min-w-[2.25rem]",
    itemName: "text-lg font-semibold",
    modifier: "text-sm",
    action: "min-h-[3rem] text-base",
  },
  compact: {
    card: "min-w-[240px]",
    order: "text-xl",
    age: "text-lg",
    itemQty: "text-base font-bold min-w-[1.75rem]",
    itemName: "text-base font-semibold",
    modifier: "text-xs",
    action: "min-h-[2.5rem] text-sm",
  },
} as const;

function KdsTicketCardComponent({
  ticket,
  column,
  nowMs,
  focusMode = "comfortable",
  isSubmitting,
  recoverySubmitting,
  canReportItemRecovery,
  isNewHighlight = false,
  showStationBadge = false,
  onAdvance,
  onCancel,
  onItemIssue,
}: Props) {
  const { t } = useOpsTranslation();
  const styles = FOCUS_STYLES[focusMode];
  const refDate = ticketElapsedReferenceDate(ticket);
  const minutes = elapsedMinutesSince(refDate, nowMs);
  const urgency = elapsedUrgency(minutes);
  const orderLabel = useMemo(() => formatOrderLabel(ticket), [ticket]);
  const isReady = ticket.status === "ready";

  return (
    <motion.article
      initial={isNewHighlight ? { boxShadow: "0 0 0 2px rgba(250,204,21,0.8)" } : undefined}
      animate={isNewHighlight ? { boxShadow: "0 0 0 0 rgba(250,204,21,0)" } : undefined}
      transition={{ duration: 1.2 }}
      data-testid="kitchen-ticket-card"
      data-ticket-id={ticket.id}
      data-column={column.id}
      data-status={ticket.status}
      data-ready-emphasis={isReady ? "true" : "false"}
      data-urgency={urgency}
      style={{ contentVisibility: "auto", containIntrinsicSize: "280px 320px" }}
      className={cn(
        "shrink-0 flex-none bg-kds-card rounded-2xl overflow-hidden flex flex-col shadow-lg shadow-black/30",
        styles.card,
        isReady
          ? "border-2 border-emerald-400/60 ring-2 ring-emerald-400/20"
          : kdsUrgencyBorderClass(urgency),
        isNewHighlight && "kds-ticket-flash",
      )}
    >
      <div
        className={cn(
          "px-4 py-3 flex items-start justify-between gap-3 border-b border-kds-card-border",
          kdsUrgencyHeaderClass(urgency),
        )}
      >
        <div className="min-w-0 flex-1">
          <p className={cn("font-extrabold tracking-tight text-kds-fg truncate", styles.order)}>{orderLabel}</p>
          <div className="flex flex-wrap items-center gap-2 mt-0.5">
            <p className="text-xs text-kds-muted-fg truncate">{t("kitchen.ticketNo", { no: ticket.ticketNo })}</p>
            {showStationBadge && ticket.station ? (
              <span
                className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide bg-kds-muted text-kds-fg border border-kds-card-border"
                data-testid="kds-ticket-station-badge"
              >
                {ticket.station.name || ticket.station.code}
              </span>
            ) : null}
          </div>
          {ticket.tableNumber ? (
            <p className="text-sm font-medium text-kds-muted-fg mt-1">{t("kitchen.table", { name: ticket.tableNumber })}</p>
          ) : null}
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <span
            className={cn(
              "px-2.5 py-1 rounded-lg text-sm font-bold border tabular-nums",
              kdsUrgencyBadgeClass(urgency),
              styles.age,
            )}
            data-testid="kds-order-age"
          >
            {formatKdsOrderAge(minutes)}
          </span>
          {isReady ? (
            <span
              className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide bg-emerald-500/20 text-emerald-200 border border-emerald-400/40"
              data-testid="kitchen-ready-badge"
            >
              {t("kitchen.readyBadge")}
            </span>
          ) : urgency !== "normal" ? (
            <AlertTriangle className={cn("h-5 w-5", kdsUrgencyTimerClass(urgency))} aria-hidden />
          ) : null}
        </div>
      </div>

      <div className="p-4 flex-1 flex flex-col gap-3">
        <p className="text-xs uppercase tracking-wide text-kds-muted-fg">
          {translateKitchenServiceMode(t, ticket.serviceMode)}
        </p>

        <div className="space-y-2.5">
          {ticket.items.length === 0 ? (
            <p className="text-sm text-kds-muted-fg italic">{t("kitchen.noItemsYet")}</p>
          ) : (
            ticket.items.map((item) => (
              <div key={item.id} className="flex items-start gap-2 group/row">
                <span
                  className={cn(
                    "text-kds-accent-fg bg-kds-accent/20 rounded-lg px-2 py-0.5 flex items-center justify-center shrink-0",
                    styles.itemQty,
                  )}
                >
                  {item.qty}x
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-1">
                    <p className={cn("text-kds-fg leading-snug", styles.itemName)}>{item.name}</p>
                    {canReportItemRecovery ? (
                      <button
                        type="button"
                        aria-label={t("kitchen.itemIssueAria")}
                        disabled={recoverySubmitting || isSubmitting}
                        className="shrink-0 p-2 rounded-lg text-kds-muted-fg hover:bg-kds-muted hover:text-kds-fg opacity-80 group-hover/row:opacity-100"
                        onClick={() => onItemIssue(ticket.orderId, item.orderItemId, item.name)}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>
                  {item.recoveryStatus ? (
                    <p
                      className="text-xs text-amber-200/90 mt-0.5"
                      data-testid="kitchen-item-recovery-badge"
                    >
                      {String(item.recoveryStatus).replace(/_/g, " ")}
                      {item.recoveryReason ? ` · ${item.recoveryReason}` : ""}
                    </p>
                  ) : null}
                  {hasItemNotes(item.notes) ? (
                    <p
                      className={cn(
                        "font-medium text-amber-200/90 mt-1",
                        styles.modifier,
                      )}
                      data-testid="kitchen-item-notes"
                    >
                      {formatModifierLine(item.notes)}
                    </p>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="px-4 pb-4 flex gap-2">
        <button
          type="button"
          onClick={() => onAdvance(ticket.id)}
          disabled={isSubmitting || recoverySubmitting}
          className={cn(
            "flex-1 rounded-xl bg-kds-accent text-kds-accent-fg font-bold hover:brightness-110 transition disabled:opacity-40",
            styles.action,
          )}
        >
          {column.actionLabel}
        </button>
        <button
          type="button"
          onClick={() => onCancel(ticket.id)}
          disabled={isSubmitting || recoverySubmitting}
          aria-label={t("kitchen.cancelTicketAria")}
          className={cn(
            "px-4 rounded-xl border border-red-500/40 text-red-300 hover:bg-red-500/10 transition-colors disabled:opacity-40",
            styles.action,
          )}
        >
          <XCircle className="h-5 w-5 mx-auto" />
        </button>
      </div>
    </motion.article>
  );
}

export const KdsTicketCard = memo(KdsTicketCardComponent);
