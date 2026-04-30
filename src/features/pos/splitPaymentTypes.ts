export type SplitOrderItem = {
  orderItemId: string;
  name: string;
  qty: number;
  unitPrice: number;
};

export type SplitItemAllocation = {
  orderItemId: string | number;
  qty: number;
  amount: number;
};

export type SplitPerson = {
  label: string;
  allocations: SplitItemAllocation[];
  totalDue: number;
  paidTotal: number;
};

export type SplitPaymentLine = {
  method: string;
  amount: number;
  allocations: SplitItemAllocation[];
  paidAt: string;
};

export type SplitPaymentMethod = "cash" | "qris" | "ewallet" | "card" | string;
