import { apiRequest } from "./client";

type ListEnvelope<T> = { data: T[] };
type MessageItemEnvelope<T> = { message?: string; data: T };
type ItemEnvelope<T> = { data: T };

export type MemberApiRow = {
  id: string;
  outletId?: number | null;
  memberNo?: string | null;
  fullName?: string;
  name: string;
  phone: string;
  email?: string | null;
  birthDate?: string | null;
  birthday?: string | null;
  gender?: string | null;
  notes?: string | null;
  isActive?: boolean;
  status: "active" | "inactive";
  points: number;
  pointsBalance?: number;
  loyaltyAccountId?: string | null;
  crmPointsBalance?: number;
  giftCardBalance?: number;
  createdAt: string;
};

export type MemberProfileStats = {
  totalVisits: number;
  totalSpending: number;
  lastVisit: string | null;
};

export type MemberTransactionRow = {
  id: string;
  orderId: string;
  totalAmount: number;
  transactionAt: string;
};

export type RewardRedemptionRow = {
  id: string;
  rewardName: string | null;
  rewardCode?: string | null;
  pointsSpent: number;
  status: string;
  issuedAt: string | null;
  fulfilledAt?: string | null;
  cancelledAt?: string | null;
  notes?: string | null;
};

export type AvailableRewardRow = {
  id: string;
  code?: string;
  name: string;
  description?: string | null;
  pointsCost: number;
};

export type LoyaltyHistoryRow = {
  id: string;
  program: string | null;
  programCode: string | null;
  type: string;
  points: number;
  referenceType: string | null;
  referenceId: string | null;
  description: string | null;
  createdAt: string;
};

export type ExpiryPolicy = {
  enabled: boolean;
  days: number | null;
};

export type MemberSegmentMembership = {
  id: string;
  code: string;
  name: string;
};

export type MemberVoucherProfileRow = {
  id: string;
  voucherCode: string;
  name: string;
  status: string;
  valueType?: string;
  value?: number;
  issuedAt?: string | null;
  claimedAt?: string | null;
  redeemedAt?: string | null;
  expiredAt?: string | null;
  cancelledAt?: string | null;
};

export type MemberTierMembership = {
  id: string;
  code: string;
  name: string;
};

export type MemberTierBenefit = {
  code: string;
  name: string;
};

export type MemberTierHistoryRow = {
  id: string;
  tierId: string;
  tierCode: string;
  tierName: string;
  assignedAt?: string | null;
  removedAt?: string | null;
  reason: string;
};

export type MemberNotificationRow = {
  id: string;
  eventType: string;
  channel: string;
  title: string;
  content: string;
  status: string;
  sentAt?: string | null;
  readAt?: string | null;
  createdAt?: string | null;
};

export type CrmAccountSummary = {
  id: number;
  pointsBalance: number;
  giftCardBalance: number;
  tierName?: string | null;
  tierCode?: string | null;
  code: string;
};

export type CrmPointsLedgerRow = {
  id: string;
  customerId: string;
  deltaPoints: number;
  reason: string;
  referenceType?: string | null;
  referenceId?: string | null;
  createdAt?: string | null;
};

export type MemberProfileApi = {
  member: MemberApiRow;
  stats: MemberProfileStats;
  currentPoints: number;
  pointsBalance?: number;
  loyaltyHistory: LoyaltyHistoryRow[];
  availableRewards: AvailableRewardRow[];
  rewardRedemptions: RewardRedemptionRow[];
  expiryPolicy?: ExpiryPolicy;
  expiredPointsTotal?: number;
  expiryHistory?: LoyaltyHistoryRow[];
  memberSegments?: MemberSegmentMembership[];
  tier?: MemberTierMembership | null;
  benefits?: MemberTierBenefit[];
  tierHistory?: MemberTierHistoryRow[];
  notifications?: MemberNotificationRow[];
  availableVouchers?: MemberVoucherProfileRow[];
  voucherHistory?: MemberVoucherProfileRow[];
  transactions: MemberTransactionRow[];
  crmAccount?: CrmAccountSummary | null;
  crmPointsLedger?: CrmPointsLedgerRow[];
};

export async function listMembers(outletId?: number): Promise<MemberApiRow[]> {
  const query = outletId ? `?outletId=${outletId}` : "";
  const res = await apiRequest<ListEnvelope<MemberApiRow>>(`/members${query}`);
  return res.data;
}

export async function searchMembers(outletId: number, q: string, limit = 20): Promise<MemberApiRow[]> {
  const params = new URLSearchParams({
    outletId: String(outletId),
    q,
    limit: String(limit),
  });
  const res = await apiRequest<ListEnvelope<MemberApiRow>>(`/members/search?${params.toString()}`);
  return res.data;
}

export async function fetchMemberProfile(memberId: string | number, outletId: number): Promise<MemberProfileApi> {
  const res = await apiRequest<ItemEnvelope<MemberProfileApi>>(`/members/${memberId}/profile?outletId=${outletId}`);
  return res.data;
}

export async function findMemberByLoyaltyAccountId(loyaltyAccountId: string | number): Promise<string | null> {
  try {
    const res = await apiRequest<ItemEnvelope<{ memberId: string }>>(`/members/by-loyalty-account/${loyaltyAccountId}`);
    return res.data.memberId;
  } catch {
    return null;
  }
}

export type MemberVoucherListRow = {
  id: string;
  voucherCode: string;
  status: string;
  voucher?: {
    name?: string;
    valueType?: string;
    value?: number;
  } | null;
};

export async function listMemberVouchers(
  memberId: string | number,
  outletId: number,
): Promise<MemberVoucherListRow[]> {
  const res = await apiRequest<ListEnvelope<MemberVoucherListRow>>(
    `/members/${memberId}/vouchers?outletId=${outletId}`,
  );
  return res.data;
}

export async function createMember(payload: {
  outletId?: number;
  name: string;
  phone: string;
  email?: string;
  birthday?: string;
  notes?: string;
  status: "active" | "inactive";
}): Promise<MemberApiRow> {
  const res = await apiRequest<MessageItemEnvelope<MemberApiRow>>("/members", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function quickCreateMember(payload: {
  outletId: number;
  fullName: string;
  phone: string;
  email?: string;
  birthDate?: string;
  gender?: string;
  notes?: string;
}): Promise<MemberApiRow> {
  const res = await apiRequest<MessageItemEnvelope<MemberApiRow>>("/members/quick", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function updateMember(
  id: string | number,
  payload: Partial<{
    name: string;
    phone: string;
    email: string | null;
    birthday: string | null;
    notes: string | null;
    status: "active" | "inactive";
  }>,
): Promise<MemberApiRow> {
  const res = await apiRequest<MessageItemEnvelope<MemberApiRow>>(`/members/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function toggleMemberStatus(id: string | number): Promise<MemberApiRow> {
  const res = await apiRequest<MessageItemEnvelope<MemberApiRow>>(`/members/${id}/status`, {
    method: "PATCH",
  });
  return res.data;
}

export async function deleteMember(id: string | number): Promise<void> {
  await apiRequest<{ message: string }>(`/members/${id}`, {
    method: "DELETE",
  });
}

export async function setOrderMember(orderId: string | number, memberId: number | null): Promise<void> {
  await apiRequest(`/orders/${orderId}/member`, {
    method: "PATCH",
    body: JSON.stringify({ memberId }),
  });
}

export type RedeemMemberPointsResult = {
  memberId: string;
  redeemedPoints: number;
  currentBalance: number;
};

export type RedeemMemberRewardResult = {
  redemptionId: string;
  rewardName: string;
  pointsSpent: number;
  currentBalance: number;
  status: string;
};

export async function redeemMemberReward(
  memberId: string | number,
  payload: { outletId: number; rewardId: number; notes?: string },
): Promise<RedeemMemberRewardResult> {
  const res = await apiRequest<{ message?: string; data: RedeemMemberRewardResult }>(
    `/members/${memberId}/redeem-reward`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
  return res.data;
}

export async function listMemberRewardRedemptions(
  memberId: string | number,
  outletId: number,
): Promise<RewardRedemptionRow[]> {
  const res = await apiRequest<{ data: RewardRedemptionRow[] }>(
    `/members/${memberId}/redemptions?outletId=${outletId}`,
  );
  return res.data;
}

export async function redeemMemberPoints(
  memberId: string | number,
  payload: { outletId: number; points: number; description?: string },
): Promise<RedeemMemberPointsResult> {
  const res = await apiRequest<{ message?: string; data: RedeemMemberPointsResult }>(
    `/members/${memberId}/redeem`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
  return res.data;
}
