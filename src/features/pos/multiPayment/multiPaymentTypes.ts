export type PaymentDraftLine = {
  id: string;
  /** API settlement method: cash | qris | ewallet | card | … */
  method: string;
  /** Display label from outlet payment method config. */
  methodLabel: string;
  amount: number;
};

export type PartitionedDraft = {
  immediate: PaymentDraftLine[];
  gateway: PaymentDraftLine[];
  manualQris: PaymentDraftLine[];
};
