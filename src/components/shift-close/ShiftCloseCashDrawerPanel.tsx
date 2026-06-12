import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ShiftCloseDrawerReconciliation } from "@/lib/api-integration/shiftCloseEndpoints";
import { formatMoney } from "@/lib/format/currency";

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
  const parsed = actualCash.trim() ? Number(actualCash) : null;
  const variance = parsed !== null && !Number.isNaN(parsed) ? parsed - drawer.expected : null;

  return (
    <div className="space-y-3">
      <Row label="Opening Cash" value={formatMoney(drawer.openingCash)} />
      <Row label="Cash Sales" value={formatMoney(drawer.cashSales)} />
      <Row label="Cash Refunds" value={formatMoney(drawer.cashRefunds)} />
      <Row label="Cash Expenses" value={formatMoney(drawer.cashExpenses)} />
      <Row label="Cash In" value={formatMoney(drawer.cashIn)} />
      <Row label="Cash Out" value={formatMoney(drawer.cashOut)} />
      <Row label="Expected Cash" value={formatMoney(drawer.expected)} />
      <div>
        <Label htmlFor="actualCash">Actual Cash</Label>
        <Input
          id="actualCash"
          type="number"
          min={0}
          value={actualCash}
          onChange={(e) => onActualCashChange(e.target.value)}
          placeholder="Physical count"
        />
      </div>
      {variance !== null && (
        <Row label="Variance (preview)" value={formatMoney(variance)} />
      )}
      {(drawer.limitations?.length ?? 0) > 0 && (
        <p className="text-xs text-muted-foreground">
          Note: cash in/out/expense movement tables not configured — those fields default to 0.
        </p>
      )}
    </div>
  );
}
