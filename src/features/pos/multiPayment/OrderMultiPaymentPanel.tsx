import { useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { PaymentMethodTileGrid, type PaymentMethodTile } from "@/components/pos/PaymentMethodTileGrid";
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

  const defaultAmount = useMemo(() => String(remaining || ""), [remaining]);

  const handleAddLine = () => {
    if (!selectedCode || disabled) return;
    const methodConfig = findCheckoutMethodByCode(
      checkoutTiles.map((tile) => tile.method),
      selectedCode,
    );
    if (!methodConfig) return;
    const parsed = Number(amountInput.replace(/\D/g, ""));
    const amount = parsed > 0 ? parsed : remaining;
    const added = onAddLine(
      apiMethodFromCheckoutMethod(methodConfig),
      methodConfig.label,
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
    <div className="mb-4 space-y-3 rounded-xl border border-border/70 bg-background/60 p-3">
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <p className="text-muted-foreground">{t("shared.total")}</p>
          <p className="font-semibold text-foreground">{formatRp(totalBill)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">{t("shared.paidSoFar")}</p>
          <p className="font-semibold text-foreground">{formatRp(alreadyPaid)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">{t("shared.balanceDue")}</p>
          <p className="font-semibold text-primary">{formatRp(balanceDue)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">{t("shared.draftCollected")}</p>
          <p className="font-semibold text-foreground">{formatRp(collected)}</p>
        </div>
      </div>

      {draftLines.length > 0 ? (
        <ul className="space-y-2">
          {draftLines.map((line) => (
            <li
              key={line.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-border/50 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{line.methodLabel}</p>
                <p className="text-xs text-muted-foreground">{formatRp(line.amount)}</p>
              </div>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onRemoveLine(line.id)}
                className="inline-flex items-center justify-center rounded-lg border border-border p-1.5 text-muted-foreground hover:text-destructive hover:border-destructive/40 disabled:opacity-40"
                aria-label={t("shared.remove")}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {remaining > 0 ? (
        <div className="rounded-xl border border-accent/50 bg-accent/20 p-3 space-y-3">
          <p className="text-xs font-medium text-muted-foreground">
            {t("shared.remainingToAllocate", { amount: formatRp(remaining) })}
          </p>
          <PaymentMethodTileGrid
            variant="compact"
            tiles={checkoutTiles}
            selectedCode={selectedCode}
            onSelect={setSelectedCode}
            disabled={disabled}
          />
          <div className="flex gap-2">
            <input
              type="text"
              inputMode="numeric"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              placeholder={defaultAmount}
              disabled={disabled || !selectedCode}
              className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm"
              aria-label={t("shared.paymentAmount")}
            />
            <button
              type="button"
              disabled={disabled || !selectedCode || remaining <= 0}
              onClick={handleAddLine}
              className="shrink-0 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-40"
            >
              {draftLines.length > 0 ? t("shared.addMore") : t("shared.addPayment")}
            </button>
          </div>
        </div>
      ) : null}

      {!settlement.ok && draftLines.length > 0 ? (
        <p className="text-xs text-amber-900 dark:text-amber-100 bg-amber-500/10 border border-amber-500/25 rounded-lg px-3 py-2">
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
