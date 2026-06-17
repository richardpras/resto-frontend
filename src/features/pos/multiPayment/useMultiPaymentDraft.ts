import { useCallback, useState } from "react";
import type { PaymentDraftLine } from "./multiPaymentTypes";
import { clampDraftAmount, remainingToAllocate } from "./multiPaymentUtils";

function newDraftId(): string {
  return `draft-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function useMultiPaymentDraft(balanceDue: number) {
  const [lines, setLines] = useState<PaymentDraftLine[]>([]);

  const clearDraft = useCallback(() => {
    setLines([]);
  }, []);

  const removeLine = useCallback((id: string) => {
    setLines((prev) => prev.filter((line) => line.id !== id));
  }, []);

  const addLine = useCallback(
    (method: string, methodLabel: string, amount: number): boolean => {
      let added = false;
      setLines((prev) => {
        const maxAmount = remainingToAllocate(balanceDue, prev);
        const safeAmount = clampDraftAmount(amount, maxAmount);
        if (safeAmount <= 0) return prev;
        added = true;
        return [
          ...prev,
          { id: newDraftId(), method, methodLabel, amount: safeAmount },
        ];
      });
      return added;
    },
    [balanceDue],
  );

  return {
    lines,
    setLines,
    addLine,
    removeLine,
    clearDraft,
  };
}
