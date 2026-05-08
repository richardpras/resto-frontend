export type AsyncState = "idle" | "loading" | "success" | "error";

export type PaginationMeta = {
  currentPage: number;
  perPage: number;
  total: number;
  lastPage: number;
};

export type ReplayQueueStatus =
  | "pending"
  | "retrying"
  | "applied"
  | "duplicate"
  | "failed"
  | "discarded";

export type GiftCardSettlementState =
  | "idle"
  | "pending"
  | "partially_settled"
  | "settled"
  | "failed";

export type Customer = {
  id: string;
  outletId: number | null;
  code: string;
  name: string;
  phone: string | null;
  email: string | null;
  tierCode: string | null;
  tierName: string | null;
  pointsBalance: number;
  giftCardBalance: number;
  createdAt: string | null;
  updatedAt: string | null;
};

export type LoyaltyTier = {
  id: string;
  code: string;
  name: string;
  minPoints: number;
  discountRate: number;
  benefits: string[];
};

export type LoyaltyPointsLedgerEntry = {
  id: string;
  customerId: string;
  outletId: number | null;
  deltaPoints: number;
  direction: "credit" | "debit";
  reason: string;
  referenceType: string | null;
  referenceId: string | null;
  createdAt: string | null;
};

export type LoyaltyRedemption = {
  id: string;
  customerId: string;
  outletId: number;
  pointsUsed: number;
  amountValue: number;
  replayFingerprint: string | null;
  status: "queued" | "processing" | "applied" | "duplicate" | "rejected";
  createdAt: string | null;
};

export type GiftCard = {
  id: string;
  outletId: number | null;
  cardNumber: string;
  customerId: string | null;
  holderName: string | null;
  status: "active" | "inactive" | "blocked" | "expired";
  balance: number;
  settlementState: GiftCardSettlementState;
  expiresAt: string | null;
  updatedAt: string | null;
};

export type CrmDashboardMetrics = {
  outletId: number;
  customerCount: number;
  activeLoyaltyMembers: number;
  pointsIssued: number;
  pointsRedeemed: number;
  redemptionCount: number;
  giftCardOutstandingValue: number;
  pendingGiftCardSettlements: number;
  updatedAt: string | null;
};

export type RedemptionQueueItem = {
  id: string;
  customerId: string;
  outletId: number;
  pointsUsed: number;
  amountValue: number;
  replayFingerprint: string;
  status: ReplayQueueStatus;
  retryCount: number;
  lastError: string | null;
  createdAt: string;
  lastAttemptAt: string | null;
};
