import { formatOpenBillRecoveryMessage } from "@/features/pos/posStockError";

type Props = {
  orderCode: string;
  onOpenBill?: () => void;
};

export function PosOpenBillRecoveryBanner({ orderCode, onOpenBill }: Props) {
  return (
    <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-left">
      <p className="text-sm font-semibold text-foreground">Payment Failed</p>
      <p className="mt-1 text-xs text-muted-foreground">{formatOpenBillRecoveryMessage(orderCode)}</p>
      {onOpenBill ? (
        <button
          type="button"
          onClick={onOpenBill}
          className="mt-2 text-xs font-semibold text-primary underline"
        >
          Open Bill
        </button>
      ) : null}
    </div>
  );
}
