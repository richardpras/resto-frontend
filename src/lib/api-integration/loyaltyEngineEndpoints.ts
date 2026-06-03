import { apiRequest } from "./client";

type ListEnvelope<T> = { data: T[] };
type MessageItemEnvelope<T> = { message?: string; data: T };
type ItemEnvelope<T> = { data: T };

export type LoyaltyProgramType =
  | "spend_based"
  | "visit_based"
  | "period_spending"
  | "percentage_reward"
  | "manual";

export type LoyaltyProgramRow = {
  id: string;
  outletId: number | null;
  code: string;
  name: string;
  description: string | null;
  type: LoyaltyProgramType;
  isActive: boolean;
  expiryEnabled?: boolean;
  expiryDays?: number | null;
  effectiveFrom: string | null;
  effectiveUntil: string | null;
  rulesCount: number;
  createdAt?: string;
  updatedAt?: string;
};

export type LoyaltyProgramRuleRow = {
  id: string;
  loyaltyProgramId: string;
  ruleType: string;
  config: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
};

export type LoyaltySimulationResult = {
  programId: string;
  programCode: string;
  programName: string;
  programType: string;
  simulationDate: string;
  isEffective: boolean;
  isActive: boolean;
  expectedPoints: number;
  triggeredRules: Array<{ ruleId: string; ruleType: string; config: Record<string, unknown> }>;
  breakdown: Array<Record<string, unknown>>;
};

export type LoyaltyEngineAnalytics = {
  activeMembers: number;
  totalPointsIssued: number;
  totalPointsAdjusted: number;
  totalMemberBalances: number;
  visitRewardsIssued?: number;
  periodRewardsIssued?: number;
  visitRewardPoints?: number;
  periodRewardPoints?: number;
  redeemTransactions?: number;
  redeemedPoints?: number;
  activeRewards?: number;
  rewardRedemptions?: number;
  fulfilledRewardRedemptions?: number;
  cancelledRewardRedemptions?: number;
  pointsSpentOnRewards?: number;
  expiredTransactions?: number;
  expiredPoints?: number;
};

export type LoyaltyRewardRow = {
  id: string;
  outletId: number;
  code: string;
  name: string;
  description: string | null;
  pointsCost: number;
  isActive: boolean;
  sortOrder: number | null;
  createdAt?: string;
  updatedAt?: string;
};

export async function listLoyaltyPrograms(params?: {
  outletId?: number;
  type?: string;
  isActive?: boolean;
}): Promise<LoyaltyProgramRow[]> {
  const q = new URLSearchParams();
  if (params?.outletId != null) q.set("outletId", String(params.outletId));
  if (params?.type) q.set("type", params.type);
  if (params?.isActive !== undefined) q.set("isActive", params.isActive ? "1" : "0");
  const suffix = q.toString() ? `?${q.toString()}` : "";
  const res = await apiRequest<ListEnvelope<LoyaltyProgramRow>>(`/loyalty-programs${suffix}`);
  return res.data;
}

export async function createLoyaltyProgram(payload: {
  outletId?: number;
  code: string;
  name: string;
  description?: string;
  type: LoyaltyProgramType;
  isActive?: boolean;
  effectiveFrom?: string;
  effectiveUntil?: string;
  expiryEnabled?: boolean;
  expiryDays?: number;
}): Promise<LoyaltyProgramRow> {
  const res = await apiRequest<MessageItemEnvelope<LoyaltyProgramRow>>("/loyalty-programs", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function updateLoyaltyProgram(
  id: string | number,
  payload: Partial<{
    name: string;
    description: string | null;
    effectiveFrom: string | null;
    effectiveUntil: string | null;
    expiryEnabled?: boolean;
    expiryDays?: number | null;
  }>,
): Promise<LoyaltyProgramRow> {
  const res = await apiRequest<MessageItemEnvelope<LoyaltyProgramRow>>(`/loyalty-programs/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function setLoyaltyProgramActivation(id: string | number, isActive: boolean): Promise<LoyaltyProgramRow> {
  const res = await apiRequest<MessageItemEnvelope<LoyaltyProgramRow>>(`/loyalty-programs/${id}/activation`, {
    method: "PATCH",
    body: JSON.stringify({ isActive }),
  });
  return res.data;
}

export async function listLoyaltyProgramRules(programId: string | number): Promise<LoyaltyProgramRuleRow[]> {
  const res = await apiRequest<ListEnvelope<LoyaltyProgramRuleRow>>(`/loyalty-programs/${programId}/rules`);
  return res.data;
}

export async function createLoyaltyProgramRule(
  programId: string | number,
  payload: { ruleType?: string; config: Record<string, unknown> },
): Promise<LoyaltyProgramRuleRow> {
  const res = await apiRequest<MessageItemEnvelope<LoyaltyProgramRuleRow>>(
    `/loyalty-programs/${programId}/rules`,
    { method: "POST", body: JSON.stringify(payload) },
  );
  return res.data;
}

export async function updateLoyaltyProgramRule(
  ruleId: string | number,
  payload: { config: Record<string, unknown> },
): Promise<LoyaltyProgramRuleRow> {
  const res = await apiRequest<MessageItemEnvelope<LoyaltyProgramRuleRow>>(`/loyalty-program-rules/${ruleId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function deleteLoyaltyProgramRule(ruleId: string | number): Promise<void> {
  await apiRequest(`/loyalty-program-rules/${ruleId}`, { method: "DELETE" });
}

export async function simulateLoyaltyProgram(payload: {
  outletId: number;
  programId: number;
  spendingAmount?: number;
  visitCount?: number;
  simulationDate?: string;
}): Promise<LoyaltySimulationResult> {
  const res = await apiRequest<ItemEnvelope<LoyaltySimulationResult>>("/loyalty-programs/simulate", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function fetchLoyaltyEngineAnalytics(outletId: number): Promise<LoyaltyEngineAnalytics> {
  const res = await apiRequest<ItemEnvelope<LoyaltyEngineAnalytics>>(
    `/loyalty-engine/analytics?outletId=${outletId}`,
  );
  return res.data;
}

export async function listLoyaltyRewards(outletId: number): Promise<LoyaltyRewardRow[]> {
  const res = await apiRequest<ListEnvelope<LoyaltyRewardRow>>(`/loyalty-rewards?outletId=${outletId}`);
  return res.data;
}

export async function createLoyaltyReward(payload: {
  outletId: number;
  code: string;
  name: string;
  description?: string;
  pointsCost: number;
  sortOrder?: number;
}): Promise<LoyaltyRewardRow> {
  const res = await apiRequest<MessageItemEnvelope<LoyaltyRewardRow>>("/loyalty-rewards", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function updateLoyaltyReward(
  id: string | number,
  payload: Partial<{
    code: string;
    name: string;
    description: string | null;
    pointsCost: number;
    sortOrder: number | null;
  }>,
): Promise<LoyaltyRewardRow> {
  const res = await apiRequest<MessageItemEnvelope<LoyaltyRewardRow>>(`/loyalty-rewards/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function setLoyaltyRewardActivation(id: string | number, isActive: boolean): Promise<LoyaltyRewardRow> {
  const res = await apiRequest<MessageItemEnvelope<LoyaltyRewardRow>>(`/loyalty-rewards/${id}/activation`, {
    method: "PATCH",
    body: JSON.stringify({ isActive }),
  });
  return res.data;
}
