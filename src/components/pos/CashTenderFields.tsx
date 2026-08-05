import { useState } from "react";
import { useOpsTranslation } from "@/i18n/useOpsTranslation";
import {
  cashTenderQuickAmounts,
  computeCashChange,
  formatCashTenderDisplay,
  normalizeCashTenderedDigits,
  parseCashTenderedInput,
} from "@/features/pos/cashTender";

function formatRp(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export type CashTenderFieldsProps = {
  settledAmount: number;
  tenderedInput: string;
  onTenderedInputChange: (value: string) => void;
  disabled?: boolean;
};

export function CashTenderFields({
  settledAmount,
  tenderedInput,
  onTenderedInputChange,
  disabled = false,
}: CashTenderFieldsProps) {
  const { t } = useOpsTranslation();
  const [focused, setFocused] = useState(false);
  const tendered = parseCashTenderedInput(tenderedInput);
  const change = computeCashChange(tendered, settledAmount);
  const short = tendered > 0 && tendered < settledAmount;
  const quickAmounts = cashTenderQuickAmounts(settledAmount);
  // Raw digits while typing — formatted separators break caret / manual entry.
  const displayValue = focused
    ? tenderedInput
    : formatCashTenderDisplay(tenderedInput);

  return (
    <div className="space-y-2 rounded-xl border border-primary/25 bg-primary/5 p-2.5">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] text-muted-foreground">{t("shared.cashDue")}</p>
          <p className="text-sm font-semibold tabular-nums text-foreground">{formatRp(settledAmount)}</p>
        </div>
        <div className="min-w-0 text-right">
          <p className="text-[11px] text-muted-foreground">{t("shared.cashChange")}</p>
          <p
            className={`text-lg font-bold tabular-nums leading-tight ${
              short ? "text-destructive" : change > 0 ? "text-primary" : "text-foreground"
            }`}
            data-testid="pos-cash-change"
          >
            {formatRp(change)}
          </p>
        </div>
      </div>

      <label className="block space-y-1">
        <span className="text-[11px] font-medium text-foreground">{t("shared.cashTendered")}</span>
        <input
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={displayValue}
          onChange={(e) => onTenderedInputChange(normalizeCashTenderedDigits(e.target.value))}
          onFocus={(e) => {
            setFocused(true);
            e.currentTarget.select();
          }}
          onBlur={() => setFocused(false)}
          disabled={disabled}
          placeholder={t("shared.cashTenderedPlaceholder")}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-base font-semibold tabular-nums"
          aria-label={t("shared.cashTendered")}
          data-testid="pos-cash-tendered-input"
        />
      </label>

      <div className="flex flex-wrap gap-1">
        {quickAmounts.map((amount) => {
          const isExact = amount === Math.floor(settledAmount);
          return (
            <button
              key={amount}
              type="button"
              disabled={disabled}
              onClick={() => onTenderedInputChange(String(amount))}
              className={`rounded-md border px-2 py-1 text-[11px] font-medium touch-manipulation disabled:opacity-40 ${
                tendered === amount
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground hover:border-primary/40"
              }`}
            >
              {isExact ? t("shared.cashTenderExact") : formatRp(amount)}
            </button>
          );
        })}
      </div>

      {short ? (
        <p className="text-[11px] text-destructive">{t("shared.cashTenderShort")}</p>
      ) : null}
    </div>
  );
}
