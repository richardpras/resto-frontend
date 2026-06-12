import type { PosStockErrorPayload } from "@/features/pos/posStockError";
import { formatPosStockErrorMessage } from "@/features/pos/posStockError";

type Props = {
  error: PosStockErrorPayload;
  onDismiss?: () => void;
};

export function PosPaymentStockErrorAlert({ error, onDismiss }: Props) {
  return (
    <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-left" role="alert">
      <p className="text-sm font-semibold text-destructive">Cannot complete payment</p>
      <pre className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">{formatPosStockErrorMessage(error)}</pre>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          className="mt-3 w-full rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-muted"
        >
          Update cart and try again
        </button>
      ) : null}
    </div>
  );
}
