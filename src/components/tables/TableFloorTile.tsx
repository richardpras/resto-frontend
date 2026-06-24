import { motion } from "framer-motion";
import { Users } from "lucide-react";
import type { FloorTableApi } from "@/lib/api-integration/tableEndpoints";
import type { Order } from "@/stores/orderStore";
import { Checkbox } from "@/components/ui/checkbox";
import {
  formatTableRp,
  getTableTileBorderClass,
  getTableTileHeaderClass,
  type TableStatusStyle,
} from "./tablesPageUtils";

export type TableFloorTileProps = {
  table: FloorTableApi;
  statusConfig: TableStatusStyle;
  linkedOrder: Order | null;
  seatsLabel: string;
  reservationLabel: string;
  qrEnabledLabel: string;
  qrDisabledLabel: string;
  openDetailAria: string;
  onOpen: () => void;
  showCheckbox?: boolean;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  selectTableAria?: string;
};

export function TableFloorTile({
  table,
  statusConfig,
  linkedOrder,
  seatsLabel,
  reservationLabel,
  qrEnabledLabel,
  qrDisabledLabel,
  openDetailAria,
  onOpen,
  showCheckbox,
  checked,
  onCheckedChange,
  selectTableAria,
}: TableFloorTileProps) {
  const runtimeKey = table.tableOperationalStatus;
  const inactive = runtimeKey === "disabled";

  return (
    <motion.div
      role="button"
      tabIndex={0}
      layout
      whileHover={{ y: -2 }}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      aria-label={openDetailAria}
      className={`text-left w-full bg-card rounded-2xl border overflow-hidden pos-shadow-md transition-all cursor-pointer ${getTableTileBorderClass(runtimeKey)}`}
    >
      <div className={`px-4 py-3 flex items-center justify-between gap-2 ${getTableTileHeaderClass(runtimeKey)}`}>
        <span className="font-bold text-base text-foreground truncate">{table.name}</span>
        <div className="flex items-center gap-2 shrink-0">
          {showCheckbox ? (
            <Checkbox
              checked={checked}
              onCheckedChange={(v) => onCheckedChange?.(v === true)}
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              aria-label={selectTableAria}
            />
          ) : null}
          <span className={`h-2.5 w-2.5 rounded-full ${inactive ? "bg-muted-foreground/40" : statusConfig.dot}`} />
        </div>
      </div>

      <div className="p-4 space-y-2">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Users className="h-3.5 w-3.5 shrink-0" />
          {seatsLabel}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${statusConfig.color}`}>
            {statusConfig.label}
          </span>
          {table.tableOperationalSignals?.hasReservation && runtimeKey !== "reserved" ? (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium border border-violet-500/30 text-violet-700 dark:text-violet-300">
              {reservationLabel}
            </span>
          ) : null}
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${
              table.qrEnabled
                ? "bg-success/10 text-success border-success/20"
                : "bg-muted/50 text-muted-foreground border-border"
            }`}
          >
            {table.qrEnabled ? qrEnabledLabel : qrDisabledLabel}
          </span>
        </div>

        {linkedOrder ? (
          <p className="text-sm text-foreground truncate">
            <span className="font-semibold">{linkedOrder.code}</span>
            <span className="text-muted-foreground mx-1">·</span>
            <span className="font-medium text-primary">{formatTableRp(linkedOrder.total)}</span>
          </p>
        ) : null}
      </div>
    </motion.div>
  );
}
