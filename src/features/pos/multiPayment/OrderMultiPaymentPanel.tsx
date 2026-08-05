import { useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { PaymentMethodTileGrid, type PaymentMethodTile } from "@/components/pos/PaymentMethodTileGrid";
import { isCashCheckoutMethod } from "@/features/pos/paymentMethodCapabilities";
import { apiMethodFromCheckoutMethod } from "@/features/pos/paymentMethodUtils";
import { useOpsTranslation } from "@/i18n/useOpsTranslation";
import type { PaymentDraftLine } from "./multiPaymentTypes";
import {
  draftTotal,
  findCheckoutMethodByCode,
  remainingToAllocate,
  validateFullSettlement,
} from "./multiPaymentUtils";

function formatRp(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export type OrderMultiPaymentPanelProps = {
  balanceDue: number;
  alreadyPaid?: number;
  orderTotal?: number;
  draftLines: PaymentDraftLine[];
  checkoutTiles: PaymentMethodTile[];
  enableMultiPayment: boolean;
  disabled?: boolean;
  onAddLine: (method: string, methodLabel: string, amount: number) => boolean;
  onRemoveLine: (id: string) => void;
  onClearDraft: () => void;
};

export function OrderMultiPaymentPanel({
  balanceDue,
  alreadyPaid = 0,
  orderTotal,
  draftLines,
  checkoutTiles,
  enableMultiPayment,
  disabled = false,
  onAddLine,
  onRemoveLine,
}: OrderMultiPaymentPanelProps) {
  const { t } = useOpsTranslation();
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [amountInput, setAmountInput] = useState("");

  const totalBill = orderTotal ?? balanceDue + alreadyPaid;
  const remaining = remainingToAllocate(balanceDue, draftLines);
  const collected = draftTotal(draftLines);
  const settlement = validateFullSettlement(draftLines, balanceDue);
  const fullyAllocated = remaining <= 0 && draftLines.length > 0;

  const selectedMethod = useMemo(() => {
    if (!selectedCode) return null;
    return (
      findCheckoutMethodByCode(
        checkoutTiles.map((tile) => tile.method),
        selectedCode,
      ) ?? null
    );
  }, [checkoutTiles, selectedCode]);

  const selectedIsCash = selectedMethod ? isCashCheckoutMethod(selectedMethod) : false;
  const defaultAmount = useMemo(() => String(remaining || ""), [remaining]);

  const handleSelectMethod = (code: string) => {
    setSelectedCode(code);
    const methodConfig = findCheckoutMethodByCode(
      checkoutTiles.map((tile) => tile.method),
      code,
    );
    if (!methodConfig || disabled || remaining <= 0) return;

    if (isCashCheckoutMethod(methodConfig)) {
      const added = onAddLine(
        apiMethodFromCheckoutMethod(methodConfig),
        methodConfig.label,
        remaining,
      );
      if (added) {
        setSelectedCode(null);
        setAmountInput("");
      } else {
        setAmountInput(String(remaining));
      }
      return;
    }

    setAmountInput(String(remaining));
  };

  const handleAddLine = () => {
    if (!selectedCode || disabled || !selectedMethod) return;
    if (selectedIsCash) {
      const added = onAddLine(
        apiMethodFromCheckoutMethod(selectedMethod),
        selectedMethod.label,
        remaining,
      );
      if (added) {
        setSelectedCode(null);
        setAmountInput("");
      }
      return;
    }
    const parsed = Number(amountInput.replace(/\D/g, ""));
    const amount = parsed > 0 ? parsed : remaining;
    const added = onAddLine(
      apiMethodFromCheckoutMethod(selectedMethod),
      selectedMethod.label,
      amount,
    );
    if (added) {
      setSelectedCode(null);
      setAmountInput("");
    }
  };

  if (!enableMultiPayment) {
    return null;
  }

  return (
    <div className="space-y-2">
      {/* Compact one-liner when already allocated; full stats only while allocating */}
      {!fullyAllocated ? (
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 rounded-lg border border-border/60 bg-muted/20 px-2.5 py-2 text-[11px]">
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">{t("shared.total")}</span>
            <span className="font-semibold tabular-nums">{formatRp(totalBill)}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">{t("shared.paidSoFar")}</span>
            <span className="font-semibold tabular-nums">{formatRp(alreadyPaid)}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">{t("shared.balanceDue")}</span>
            <span className="font-semibold tabular-nums text-primary">{formatRp(balanceDue)}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">{t("shared.draftCollected")}</span>
            <span className="font-semibold tabular-nums">{formatRp(collected)}</span>
          </div>
        </div>
      ) : null}

      {draftLines.length > 0 ? (
        <ul className="space-y-1">
          {draftLines.map((line) => (
            <li
              key={line.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-border/50 px-2.5 py-1.5"
            >
              <div className="min-w-0 flex items-center gap-2">
                <p className="text-sm font-medium text-foreground truncate">{line.methodLabel}</p>
                <p className="text-xs text-muted-foreground tabular-nums">{formatRp(line.amount)}</p>
              </div>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onRemoveLine(line.id)}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground hover:text-destructive hover:border-destructive/40 disabled:opacity-40"
                aria-label={t("shared.remove")}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {remaining > 0 ? (
        <div className="space-y-2 rounded-lg border border-accent/50 bg-accent/15 p-2">
          <p className="text-[11px] font-medium text-muted-foreground">
            {t("shared.remainingToAllocate", { amount: formatRp(remaining) })}
          </p>
          <PaymentMethodTileGrid
            variant="compact"
            tiles={checkoutTiles}
            selectedCode={selectedCode}
            onSelect={handleSelectMethod}
            disabled={disabled}
          />
          {selectedCode && !selectedIsCash ? (
            <div className="flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                placeholder={defaultAmount}
                disabled={disabled || !selectedCode}
                className="min-w-0 flex-1 rounded-lg border border-border bg-background px-2.5 py-2 text-sm"
                aria-label={t("shared.paymentAllocation")}
              />
              <button
                type="button"
                disabled={disabled || !selectedCode || remaining <= 0}
                onClick={handleAddLine}
                className="inline-flex shrink-0 items-center justify-center rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-40"
              >
                {draftLines.length > 0 ? t("shared.addMore") : t("shared.addPayment")}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {!settlement.ok && draftLines.length > 0 ? (
        <p className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-2 py-1.5 text-[11px] text-amber-900 dark:text-amber-100">
          {t("shared.draftMustMatchBalance")}
        </p>
      ) : null}
    </div>
  );
}

export function isMultiPaymentDraftReady(
  enableMultiPayment: boolean,
  draftLines: PaymentDraftLine[],
  balanceDue: number,
): boolean {
  if (!enableMultiPayment) return true;
  return validateFullSettlement(draftLines, balanceDue).ok;
}

export function buildLegacyDraftLine(
  method: string,
  methodLabel: string,
  amount: number,
): PaymentDraftLine {
  return {
    id: "legacy-single",
    method,
    methodLabel,
    amount,
  };
}
