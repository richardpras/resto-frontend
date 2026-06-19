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
  ruleConfig?: Record<string, unknown> | null;
  ruleSummary?: string | null;
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
  segmentsCount?: number;
  segmentSummary?: Array<{
    segment: { id: string; code: string; name: string; segmentType: string };
    memberCount: number;
  }>;
  campaignsCount?: number;
  campaignSummary?: Array<{
    campaign: { id: string; code: string; name: string; status: string };
    audienceCount: number;
  }>;
  activeCampaigns?: number;
  completedCampaigns?: number;
  scheduledCampaigns?: number;
  campaignAudienceCaptured?: number;
  campaignExecutionSummary?: Array<{
    campaign: { id: string; code: string; name: string; status: string };
    audienceCount: number;
    capturedCount: number;
    activatedAt: string | null;
  }>;
  vouchersCount?: number;
  issuedVouchers?: number;
  claimedVouchers?: number;
  redeemedVouchers?: number;
  expiredVouchers?: number;
  campaignVoucherIssuanceCount?: number;
  voucherApplications?: number;
  voucherPreviewAmount?: number;
  topVouchersUsed?: Array<{
    voucherId: number;
    voucherCode: string;
    voucherName: string;
    applications: number;
    previewAmount: number;
  }>;
  voucherRedemptionCount?: number;
  voucherRedemptionValue?: number;
  topRedeemedVouchers?: Array<{
    voucherId: number;
    voucherCode: string;
    voucherName: string;
    redemptions: number;
    redemptionValue: number;
  }>;
  tiersCount?: number;
  tierSummary?: Array<{
    tier: { id: string; code: string; name: string; qualificationType?: string };
    memberCount: number;
  }>;
  tierBenefitSummary?: Array<{
    tier: string;
    members: number;
    benefits: number;
  }>;
  notificationsCount?: number;
  sentNotifications?: number;
  failedNotifications?: number;
  notificationSummary?: Array<{
    eventType: string;
    count: number;
  }>;
  automationsCount?: number;
  activeAutomations?: number;
  automationExecutions?: number;
  automationSuccess?: number;
  automationFailed?: number;
  automationSummary?: Array<{
    automation: string;
    executions: number;
  }>;
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
  ruleConfig?: Record<string, unknown>;
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
    ruleConfig?: Record<string, unknown>;
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

export type LoyaltyAnalyticsExecutiveSummary = {
  totalMembers: number;
  activeMembers: number;
  newMembers: number;
  memberRevenue: number;
  nonMemberRevenue: number;
  repeatCustomerRate: number;
  averageMemberSpend: number;
};

export type LoyaltyAnalyticsGrowthPoint = {
  date: string;
  newMembers: number;
};

export type LoyaltyAnalyticsTopMember = {
  memberNo: string;
  name: string;
  spending: number;
  points: number;
};

export type LoyaltyAnalyticsDashboard = {
  fromDate: string;
  toDate: string;
  executiveSummary: LoyaltyAnalyticsExecutiveSummary;
  memberGrowth: {
    daily: LoyaltyAnalyticsGrowthPoint[];
    weekly: LoyaltyAnalyticsGrowthPoint[];
    monthly: LoyaltyAnalyticsGrowthPoint[];
  };
  pointsAnalytics: {
    pointsIssued: number;
    pointsRedeemed: number;
    pointsExpired: number;
    outstandingPoints: number;
    issuanceTrend: Array<{ date: string; points: number }>;
    redemptionTrend: Array<{ date: string; points: number }>;
  };
  rewardsAnalytics: {
    rewardsRedeemed: number;
    topRewards: Array<{ reward: string; count: number }>;
  };
  voucherAnalytics: {
    vouchersIssued: number;
    vouchersClaimed: number;
    vouchersRedeemed: number;
    vouchersExpired: number;
    voucherRedemptionRate: number;
    topVouchers: Array<{ voucher: string; issued: number; redeemed: number }>;
  };
  campaignAnalytics: {
    campaignsCount: number;
    activeCampaigns: number;
    campaignPerformance: Array<{
      campaign: string;
      audience: number;
      voucherIssued: number;
      voucherRedeemed: number;
      conversionRate: number;
    }>;
  };
  segmentAnalytics: {
    segmentDistribution: Array<{ segment: string; members: number }>;
  };
  tierAnalytics: {
    tierDistribution: Array<{ tier: string; members: number }>;
  };
  automationAnalytics: {
    automationExecutions: number;
    automationSuccess: number;
    automationFailed: number;
    topAutomations: Array<{ automation: string; executions: number; success: number }>;
  };
  topMembers: LoyaltyAnalyticsTopMember[];
};

export async function fetchLoyaltyAnalyticsDashboard(params: {
  outletId: number;
  fromDate?: string;
  toDate?: string;
}): Promise<LoyaltyAnalyticsDashboard> {
  const q = new URLSearchParams();
  q.set("outletId", String(params.outletId));
  if (params.fromDate) q.set("fromDate", params.fromDate);
  if (params.toDate) q.set("toDate", params.toDate);
  const res = await apiRequest<ItemEnvelope<LoyaltyAnalyticsDashboard>>(
    `/loyalty-analytics/dashboard?${q.toString()}`,
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

export type MemberSegmentType =
  | "vip_spender"
  | "frequent_visitor"
  | "birthday_month"
  | "inactive_member"
  | "never_redeemed"
  | "expiring_soon";

export type MemberSegmentRow = {
  id: string;
  outletId: number;
  code: string;
  name: string;
  description: string | null;
  segmentType: MemberSegmentType;
  config: Record<string, unknown>;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type MemberSegmentPreviewMember = {
  id: string;
  memberNo: string | null;
  fullName: string;
  phone: string;
  isActive: boolean;
};

export async function listMemberSegments(outletId: number): Promise<MemberSegmentRow[]> {
  const res = await apiRequest<ListEnvelope<MemberSegmentRow>>(`/member-segments?outletId=${outletId}`);
  return res.data;
}

export async function createMemberSegment(payload: {
  outletId: number;
  code: string;
  name: string;
  description?: string;
  segmentType: MemberSegmentType;
  config?: Record<string, unknown>;
  isActive?: boolean;
}): Promise<MemberSegmentRow> {
  const res = await apiRequest<MessageItemEnvelope<MemberSegmentRow>>("/member-segments", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function updateMemberSegment(
  id: string | number,
  payload: Partial<{
    code: string;
    name: string;
    description: string | null;
    segmentType: MemberSegmentType;
    config: Record<string, unknown>;
  }>,
): Promise<MemberSegmentRow> {
  const res = await apiRequest<MessageItemEnvelope<MemberSegmentRow>>(`/member-segments/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function setMemberSegmentActivation(id: string | number, isActive: boolean): Promise<MemberSegmentRow> {
  const res = await apiRequest<MessageItemEnvelope<MemberSegmentRow>>(`/member-segments/${id}/activation`, {
    method: "PATCH",
    body: JSON.stringify({ isActive }),
  });
  return res.data;
}

export async function previewMemberSegment(
  id: string | number,
  limit = 50,
): Promise<{ count: number; members: MemberSegmentPreviewMember[] }> {
  const res = await apiRequest<ItemEnvelope<{ count: number; members: MemberSegmentPreviewMember[] }>>(
    `/member-segments/${id}/preview?limit=${limit}`,
  );
  return res.data;
}

export type LoyaltyTierQualificationType = "lifetime_points" | "lifetime_spending" | "visit_count";

export type LoyaltyTierBenefitConfig = {
  priorityCampaign: boolean;
  exclusiveVoucher: boolean;
  exclusiveReward: boolean;
  monthlyVoucher: boolean;
};

export type LoyaltyTierRow = {
  id: string;
  outletId: number;
  code: string;
  name: string;
  description: string | null;
  qualificationType: LoyaltyTierQualificationType;
  qualificationConfig: Record<string, unknown>;
  benefitConfig?: LoyaltyTierBenefitConfig;
  sortOrder: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export async function listLoyaltyTiers(outletId: number): Promise<LoyaltyTierRow[]> {
  const res = await apiRequest<ListEnvelope<LoyaltyTierRow>>(`/loyalty-tiers?outletId=${outletId}`);
  return res.data;
}

export async function createLoyaltyTier(payload: {
  outletId: number;
  code: string;
  name: string;
  description?: string;
  qualificationType: LoyaltyTierQualificationType;
  qualificationConfig?: Record<string, unknown>;
  benefitConfig?: LoyaltyTierBenefitConfig;
  sortOrder?: number;
  isActive?: boolean;
}): Promise<LoyaltyTierRow> {
  const res = await apiRequest<MessageItemEnvelope<LoyaltyTierRow>>("/loyalty-tiers", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function updateLoyaltyTier(
  id: string | number,
  payload: Partial<{
    code: string;
    name: string;
    description: string | null;
    qualificationType: LoyaltyTierQualificationType;
    qualificationConfig: Record<string, unknown>;
    benefitConfig: LoyaltyTierBenefitConfig;
    sortOrder: number;
  }>,
): Promise<LoyaltyTierRow> {
  const res = await apiRequest<MessageItemEnvelope<LoyaltyTierRow>>(`/loyalty-tiers/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function setLoyaltyTierActivation(id: string | number, isActive: boolean): Promise<LoyaltyTierRow> {
  const res = await apiRequest<MessageItemEnvelope<LoyaltyTierRow>>(`/loyalty-tiers/${id}/activation`, {
    method: "PATCH",
    body: JSON.stringify({ isActive }),
  });
  return res.data;
}

export type LoyaltyAutomationTriggerType =
  | "member_birthday"
  | "member_created"
  | "tier_upgraded"
  | "visit_milestone"
  | "points_milestone"
  | "inactive_member"
  | "voucher_redeemed"
  | "reward_redeemed";

export type LoyaltyAutomationActionType = "issue_voucher" | "send_notification" | "assign_campaign";

export type LoyaltyAutomationRow = {
  id: string;
  outletId: number;
  code: string;
  name: string;
  description: string | null;
  triggerType: LoyaltyAutomationTriggerType;
  condition: Record<string, unknown>;
  actionType: LoyaltyAutomationActionType;
  actionConfig: Record<string, unknown>;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type LoyaltyAutomationLogRow = {
  id: string;
  automationId: string;
  memberId: string;
  triggerType: string;
  actionType: string;
  status: "success" | "failed" | "skipped";
  result: Record<string, unknown>;
  executedAt: string;
  createdAt?: string;
  updatedAt?: string;
};

export async function listLoyaltyAutomations(outletId: number): Promise<LoyaltyAutomationRow[]> {
  const res = await apiRequest<ListEnvelope<LoyaltyAutomationRow>>(`/loyalty-automations?outletId=${outletId}`);
  return res.data;
}

export async function createLoyaltyAutomation(payload: {
  outletId: number;
  code: string;
  name: string;
  description?: string;
  triggerType: LoyaltyAutomationTriggerType;
  condition?: Record<string, unknown>;
  actionType: LoyaltyAutomationActionType;
  actionConfig?: Record<string, unknown>;
  isActive?: boolean;
}): Promise<LoyaltyAutomationRow> {
  const res = await apiRequest<MessageItemEnvelope<LoyaltyAutomationRow>>("/loyalty-automations", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function updateLoyaltyAutomation(
  id: string | number,
  payload: Partial<{
    code: string;
    name: string;
    description: string | null;
    triggerType: LoyaltyAutomationTriggerType;
    condition: Record<string, unknown>;
    actionType: LoyaltyAutomationActionType;
    actionConfig: Record<string, unknown>;
  }>,
): Promise<LoyaltyAutomationRow> {
  const res = await apiRequest<MessageItemEnvelope<LoyaltyAutomationRow>>(`/loyalty-automations/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function setLoyaltyAutomationActivation(
  id: string | number,
  isActive: boolean,
): Promise<LoyaltyAutomationRow> {
  const res = await apiRequest<MessageItemEnvelope<LoyaltyAutomationRow>>(`/loyalty-automations/${id}/activation`, {
    method: "PATCH",
    body: JSON.stringify({ isActive }),
  });
  return res.data;
}

export async function listLoyaltyAutomationLogs(
  id: string | number,
  limit = 50,
): Promise<LoyaltyAutomationLogRow[]> {
  const res = await apiRequest<ListEnvelope<LoyaltyAutomationLogRow>>(
    `/loyalty-automations/${id}/logs?limit=${limit}`,
  );
  return res.data;
}

export type LoyaltyCampaignStatus = "draft" | "scheduled" | "active" | "completed" | "cancelled";

export type LoyaltyCampaignRow = {
  id: string;
  outletId: number;
  code: string;
  name: string;
  description: string | null;
  segmentId: string;
  segment?: MemberSegmentRow;
  campaignType: string;
  scheduledAt: string | null;
  status: LoyaltyCampaignStatus;
  audienceCount?: number;
  capturedCount?: number;
  issuedVoucherCount?: number;
  activatedAt?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type LoyaltyCampaignSnapshot = {
  campaign: LoyaltyCampaignRow;
  capturedCount: number;
  members: MemberSegmentPreviewMember[];
};

export type LoyaltyCampaignAudience = {
  campaign: LoyaltyCampaignRow;
  segment: MemberSegmentRow;
  memberCount: number;
  members: MemberSegmentPreviewMember[];
};

export async function listLoyaltyCampaigns(outletId: number): Promise<LoyaltyCampaignRow[]> {
  const res = await apiRequest<ListEnvelope<LoyaltyCampaignRow>>(`/loyalty-campaigns?outletId=${outletId}`);
  return res.data;
}

export async function createLoyaltyCampaign(payload: {
  outletId: number;
  code: string;
  name: string;
  description?: string;
  segmentId: number;
  campaignType?: string;
  scheduledAt?: string | null;
}): Promise<LoyaltyCampaignRow> {
  const res = await apiRequest<MessageItemEnvelope<LoyaltyCampaignRow>>("/loyalty-campaigns", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function updateLoyaltyCampaign(
  id: string | number,
  payload: Partial<{
    code: string;
    name: string;
    description: string | null;
    segmentId: number;
    campaignType: string;
    scheduledAt: string | null;
  }>,
): Promise<LoyaltyCampaignRow> {
  const res = await apiRequest<MessageItemEnvelope<LoyaltyCampaignRow>>(`/loyalty-campaigns/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function updateLoyaltyCampaignStatus(
  id: string | number,
  status: LoyaltyCampaignStatus,
): Promise<LoyaltyCampaignRow> {
  const res = await apiRequest<MessageItemEnvelope<LoyaltyCampaignRow>>(`/loyalty-campaigns/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
  return res.data;
}

export async function fetchLoyaltyCampaignAudience(
  id: string | number,
  limit = 50,
): Promise<LoyaltyCampaignAudience> {
  const res = await apiRequest<ItemEnvelope<LoyaltyCampaignAudience>>(
    `/loyalty-campaigns/${id}/audience?limit=${limit}`,
  );
  return res.data;
}

export async function fetchLoyaltyCampaignAudienceSnapshot(
  id: string | number,
  limit = 50,
): Promise<LoyaltyCampaignSnapshot> {
  const res = await apiRequest<ItemEnvelope<LoyaltyCampaignSnapshot>>(
    `/loyalty-campaigns/${id}/audience-snapshot?limit=${limit}`,
  );
  return res.data;
}

export async function activateLoyaltyCampaign(id: string | number): Promise<LoyaltyCampaignRow> {
  const res = await apiRequest<MessageItemEnvelope<LoyaltyCampaignRow>>(`/loyalty-campaigns/${id}/activate`, {
    method: "POST",
  });
  return res.data;
}

export async function completeLoyaltyCampaign(id: string | number): Promise<LoyaltyCampaignRow> {
  const res = await apiRequest<MessageItemEnvelope<LoyaltyCampaignRow>>(`/loyalty-campaigns/${id}/complete`, {
    method: "POST",
  });
  return res.data;
}

export async function cancelLoyaltyCampaign(id: string | number): Promise<LoyaltyCampaignRow> {
  const res = await apiRequest<MessageItemEnvelope<LoyaltyCampaignRow>>(`/loyalty-campaigns/${id}/cancel`, {
    method: "POST",
  });
  return res.data;
}

export type LoyaltyVoucherType = "manual" | "campaign" | "reward";
export type LoyaltyVoucherValueType = "percentage" | "fixed_amount" | "free_item";

export type LoyaltyVoucherRow = {
  id: string;
  outletId: number;
  code: string;
  name: string;
  description: string | null;
  voucherType: LoyaltyVoucherType;
  valueType: LoyaltyVoucherValueType;
  value: number;
  minimumSpend: number;
  validFrom: string | null;
  validUntil: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export async function listLoyaltyVouchers(outletId: number): Promise<LoyaltyVoucherRow[]> {
  const res = await apiRequest<ListEnvelope<LoyaltyVoucherRow>>(`/loyalty-vouchers?outletId=${outletId}`);
  return res.data;
}

export async function createLoyaltyVoucher(payload: {
  outletId: number;
  code: string;
  name: string;
  description?: string;
  voucherType?: LoyaltyVoucherType;
  valueType: LoyaltyVoucherValueType;
  value?: number;
  minimumSpend?: number;
  validFrom?: string | null;
  validUntil?: string | null;
  isActive?: boolean;
}): Promise<LoyaltyVoucherRow> {
  const res = await apiRequest<MessageItemEnvelope<LoyaltyVoucherRow>>("/loyalty-vouchers", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function updateLoyaltyVoucher(
  id: string | number,
  payload: Partial<{
    code: string;
    name: string;
    description: string | null;
    voucherType: LoyaltyVoucherType;
    valueType: LoyaltyVoucherValueType;
    value: number;
    minimumSpend: number;
    validFrom: string | null;
    validUntil: string | null;
  }>,
): Promise<LoyaltyVoucherRow> {
  const res = await apiRequest<MessageItemEnvelope<LoyaltyVoucherRow>>(`/loyalty-vouchers/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function setLoyaltyVoucherActivation(id: string | number, isActive: boolean): Promise<LoyaltyVoucherRow> {
  const res = await apiRequest<MessageItemEnvelope<LoyaltyVoucherRow>>(`/loyalty-vouchers/${id}/activation`, {
    method: "PATCH",
    body: JSON.stringify({ isActive }),
  });
  return res.data;
}

export async function issueCampaignVoucher(
  campaignId: string | number,
  voucherId: number,
): Promise<{ audienceCount: number; issuedCount: number; skippedCount: number }> {
  const res = await apiRequest<
    MessageItemEnvelope<{ audienceCount: number; issuedCount: number; skippedCount: number }>
  >(`/loyalty-campaigns/${campaignId}/issue-voucher`, {
    method: "POST",
    body: JSON.stringify({ voucherId }),
  });
  return res.data;
}
