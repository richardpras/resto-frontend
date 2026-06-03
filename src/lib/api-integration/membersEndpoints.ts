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

export type MemberProfileApi = {
  member: MemberApiRow;
  stats: MemberProfileStats;
  currentPoints: number;
  loyaltyHistory: LoyaltyHistoryRow[];
  availableRewards: AvailableRewardRow[];
  rewardRedemptions: RewardRedemptionRow[];
  expiryPolicy?: ExpiryPolicy;
  expiredPointsTotal?: number;
  expiryHistory?: LoyaltyHistoryRow[];
  transactions: MemberTransactionRow[];
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
