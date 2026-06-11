import type { LucideIcon } from "lucide-react";
import type { OutletPaymentMethodConfigApi } from "@/lib/api-integration/outletPaymentMethodEndpoints";
import { cn } from "@/lib/utils";

export type PaymentMethodTile = {
  method: OutletPaymentMethodConfigApi;
  icon: LucideIcon;
};

type PaymentMethodTileGridProps = {
  tiles: PaymentMethodTile[];
  selectedCode: string | null;
  onSelect: (paymentMethodCode: string) => void;
  /** Compact layout for split-bill inline pickers. */
  variant?: "default" | "compact";
  disabled?: boolean;
  className?: string;
};

const VARIANT_STYLES = {
  default: {
    grid: "grid grid-cols-[repeat(auto-fit,minmax(6.75rem,1fr))] gap-2 sm:gap-3",
    button:
      "flex flex-col items-center justify-center gap-2 p-3 sm:p-4 min-h-[5.5rem] rounded-xl border transition-all",
    icon: "h-6 w-6 text-primary shrink-0",
    label: "text-sm font-medium text-foreground text-center leading-tight",
  },
  compact: {
    grid: "grid grid-cols-[repeat(auto-fit,minmax(5.25rem,1fr))] gap-2",
    button:
      "flex flex-col items-center justify-center gap-1 p-2 sm:p-2.5 min-h-[4.25rem] rounded-xl border transition-all",
    icon: "h-4 w-4 text-primary shrink-0",
    label: "text-xs font-medium text-foreground text-center leading-tight",
  },
} as const;

export function PaymentMethodTileGrid({
  tiles,
  selectedCode,
  onSelect,
  variant = "default",
  disabled = false,
  className,
}: PaymentMethodTileGridProps) {
  const styles = VARIANT_STYLES[variant];

  return (
    <div className={cn(styles.grid, className)} role="listbox" aria-label="Payment methods">
      {tiles.map(({ method, icon: Icon }) => {
        const selected = selectedCode === method.paymentMethodCode;

        return (
          <button
            key={method.paymentMethodCode}
            type="button"
            role="option"
            aria-selected={selected}
            disabled={disabled}
            onClick={() => onSelect(method.paymentMethodCode)}
            className={cn(
              styles.button,
              selected
                ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                : "border-border hover:border-primary/30 hover:bg-primary/5",
              disabled && "cursor-not-allowed opacity-50",
            )}
          >
            <Icon className={styles.icon} aria-hidden />
            <span className={styles.label}>{method.label}</span>
          </button>
        );
      })}
    </div>
  );
}
