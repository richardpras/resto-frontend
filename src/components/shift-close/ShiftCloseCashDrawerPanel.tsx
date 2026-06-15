import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ShiftCloseDrawerReconciliation } from "@/lib/api-integration/shiftCloseEndpoints";
import { formatMoney } from "@/lib/format/currency";
import { useOpsTranslation } from "@/i18n/useOpsTranslation";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}

type Props = {
  drawer: ShiftCloseDrawerReconciliation;
  actualCash: string;
  onActualCashChange: (value: string) => void;
};

export function ShiftCloseCashDrawerPanel({ drawer, actualCash, onActualCashChange }: Props) {
  const { t } = useOpsTranslation();
  const parsed = actualCash.trim() ? Number(actualCash) : null;
  const variance = parsed !== null && !Number.isNaN(parsed) ? parsed - drawer.expected : null;

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">{t("shiftClose.cashDrawerTitle")}</h2>
      <Row label={t("shiftClose.openingCash")} value={formatMoney(drawer.openingCash)} />
      <Row label={t("shiftClose.cashSales")} value={formatMoney(drawer.cashSales)} />
      <Row label={t("shiftClose.cashRefunds")} value={formatMoney(drawer.cashRefunds)} />
      <Row label={t("shiftClose.cashExpenses")} value={formatMoney(drawer.cashExpenses)} />
      <Row label={t("shiftClose.cashIn")} value={formatMoney(drawer.cashIn)} />
      <Row label={t("shiftClose.cashOut")} value={formatMoney(drawer.cashOut)} />
      <Row label={t("shiftClose.expectedCash")} value={formatMoney(drawer.expected)} />
      <div>
        <Label htmlFor="actualCash">{t("shiftClose.actualCash")}</Label>
        <Input
          id="actualCash"
          type="number"
          min={0}
          value={actualCash}
          onChange={(e) => onActualCashChange(e.target.value)}
          placeholder={t("shiftClose.physicalCountPlaceholder")}
        />
      </div>
      {variance !== null && (
        <Row label={t("shiftClose.variancePreview")} value={formatMoney(variance)} />
      )}
      {(drawer.limitations?.length ?? 0) > 0 && (
        <p className="text-xs text-muted-foreground">{t("shiftClose.cashLimitationsNote")}</p>
      )}
    </div>
  );
}
