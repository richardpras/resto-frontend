import {
  CashDrawerReconciliationPanel,
  type CashDrawerReconciliation,
} from "@/components/pos/CashDrawerReconciliationPanel";
import type { ShiftCloseDrawerReconciliation } from "@/lib/api-integration/shiftCloseEndpoints";

type Props = {
  drawer: ShiftCloseDrawerReconciliation;
  actualCash: string;
  onActualCashChange: (value: string) => void;
};

export function ShiftCloseCashDrawerPanel({ drawer, actualCash, onActualCashChange }: Props) {
  const normalized: CashDrawerReconciliation = {
    openingCash: drawer.openingCash,
    cashSales: drawer.cashSales,
    cashRefunds: drawer.cashRefunds,
    cashExpenses: drawer.cashExpenses,
    cashIn: drawer.cashIn,
    cashOut: drawer.cashOut,
    expected: drawer.expected,
    limitations: drawer.limitations,
  };

  return (
    <CashDrawerReconciliationPanel
      drawer={normalized}
      actualCash={actualCash}
      onActualCashChange={onActualCashChange}
    />
  );
}
