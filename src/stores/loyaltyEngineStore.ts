import { create } from "zustand";
import {
  createLoyaltyCampaign,
  createLoyaltyProgram,
  createLoyaltyProgramRule,
  createLoyaltyReward,
  createLoyaltyVoucher,
  createMemberSegment,
  createLoyaltyAutomation,
  createLoyaltyTier,
  deleteLoyaltyProgramRule,
  activateLoyaltyCampaign,
  cancelLoyaltyCampaign,
  completeLoyaltyCampaign,
  fetchLoyaltyCampaignAudience,
  fetchLoyaltyCampaignAudienceSnapshot,
  fetchLoyaltyEngineAnalytics,
  issueCampaignVoucher as issueCampaignVoucherApi,
  listLoyaltyCampaigns,
  listLoyaltyProgramRules,
  listLoyaltyPrograms,
  listLoyaltyRewards,
  listLoyaltyVouchers,
  listLoyaltyAutomations,
  listLoyaltyAutomationLogs,
  listLoyaltyTiers,
  listMemberSegments,
  previewMemberSegment,
  setLoyaltyProgramActivation,
  setLoyaltyRewardActivation,
  setLoyaltyAutomationActivation,
  setLoyaltyTierActivation,
  setLoyaltyVoucherActivation,
  setMemberSegmentActivation,
  simulateLoyaltyProgram,
  updateLoyaltyCampaign,
  updateLoyaltyCampaignStatus,
  updateLoyaltyProgram,
  updateLoyaltyProgramRule,
  updateLoyaltyReward,
  updateLoyaltyAutomation,
  updateLoyaltyTier,
  updateLoyaltyVoucher,
  updateMemberSegment,
  type LoyaltyCampaignAudience,
  type LoyaltyCampaignRow,
  type LoyaltyCampaignSnapshot,
  type LoyaltyCampaignStatus,
  type LoyaltyAutomationActionType,
  type LoyaltyAutomationLogRow,
  type LoyaltyAutomationRow,
  type LoyaltyAutomationTriggerType,
  type LoyaltyEngineAnalytics,
  type LoyaltyProgramRow,
  type LoyaltyProgramRuleRow,
  type LoyaltyProgramType,
  type LoyaltyRewardRow,
  type LoyaltySimulationResult,
  type LoyaltyTierQualificationType,
  type LoyaltyTierRow,
  type LoyaltyVoucherRow,
  type LoyaltyVoucherType,
  type LoyaltyVoucherValueType,
  type MemberSegmentPreviewMember,
  type MemberSegmentRow,
  type MemberSegmentType,
} from "@/lib/api-integration/loyaltyEngineEndpoints";

type LoyaltyEngineState = {
  programs: LoyaltyProgramRow[];
  rules: LoyaltyProgramRuleRow[];
  rewards: LoyaltyRewardRow[];
  vouchers: LoyaltyVoucherRow[];
  segments: MemberSegmentRow[];
  tiers: LoyaltyTierRow[];
  automations: LoyaltyAutomationRow[];
  campaigns: LoyaltyCampaignRow[];
  analytics: LoyaltyEngineAnalytics | null;
  lastSimulation: LoyaltySimulationResult | null;
  loadingPrograms: boolean;
  loadingRules: boolean;
  loadingRewards: boolean;
  loadingVouchers: boolean;
  loadingSegments: boolean;
  loadingTiers: boolean;
  loadingAutomations: boolean;
  loadingCampaigns: boolean;
  loadingAnalytics: boolean;
  simulating: boolean;
  fetchPrograms: (outletId?: number) => Promise<void>;
  createProgram: (payload: {
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
  }) => Promise<LoyaltyProgramRow>;
  updateProgram: (
    id: string,
    payload: Partial<{
      name: string;
      description: string | null;
      effectiveFrom: string | null;
      effectiveUntil: string | null;
      expiryEnabled?: boolean;
      expiryDays?: number | null;
      ruleConfig?: Record<string, unknown>;
    }>,
  ) => Promise<void>;
  setProgramActive: (id: string, isActive: boolean) => Promise<void>;
  fetchRules: (programId: string) => Promise<void>;
  saveRule: (programId: string, ruleType: string, config: Record<string, unknown>, ruleId?: string) => Promise<void>;
  removeRule: (ruleId: string, programId: string) => Promise<void>;
  runSimulation: (payload: {
    outletId: number;
    programId: number;
    spendingAmount?: number;
    visitCount?: number;
    simulationDate?: string;
  }) => Promise<LoyaltySimulationResult>;
  fetchAnalytics: (outletId: number) => Promise<void>;
  fetchRewards: (outletId: number) => Promise<void>;
  createReward: (payload: {
    outletId: number;
    code: string;
    name: string;
    description?: string;
    pointsCost: number;
    sortOrder?: number;
  }) => Promise<LoyaltyRewardRow>;
  updateReward: (
    id: string,
    payload: Partial<{ code: string; name: string; description: string | null; pointsCost: number; sortOrder: number | null }>,
  ) => Promise<void>;
  setRewardActive: (id: string, isActive: boolean, outletId: number) => Promise<void>;
  fetchVouchers: (outletId: number) => Promise<void>;
  createVoucher: (payload: {
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
  }) => Promise<LoyaltyVoucherRow>;
  updateVoucher: (
    id: string,
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
    outletId: number,
  ) => Promise<void>;
  setVoucherActive: (id: string, isActive: boolean, outletId: number) => Promise<void>;
  issueCampaignVoucher: (
    campaignId: string,
    voucherId: number,
    outletId: number,
  ) => Promise<{ audienceCount: number; issuedCount: number; skippedCount: number }>;
  fetchSegments: (outletId: number) => Promise<void>;
  createSegment: (payload: {
    outletId: number;
    code: string;
    name: string;
    description?: string;
    segmentType: MemberSegmentType;
    config?: Record<string, unknown>;
    isActive?: boolean;
  }) => Promise<MemberSegmentRow>;
  updateSegment: (
    id: string,
    payload: Partial<{
      code: string;
      name: string;
      description: string | null;
      segmentType: MemberSegmentType;
      config: Record<string, unknown>;
    }>,
    outletId: number,
  ) => Promise<void>;
  setSegmentActive: (id: string, isActive: boolean, outletId: number) => Promise<void>;
  previewSegment: (id: string, limit?: number) => Promise<{ count: number; members: MemberSegmentPreviewMember[] }>;
  fetchTiers: (outletId: number) => Promise<void>;
  createTier: (payload: {
    outletId: number;
    code: string;
    name: string;
    description?: string;
    qualificationType: LoyaltyTierQualificationType;
    qualificationConfig?: Record<string, unknown>;
    benefitConfig?: LoyaltyTierBenefitConfig;
    sortOrder?: number;
    isActive?: boolean;
  }) => Promise<LoyaltyTierRow>;
  updateTier: (
    id: string,
    payload: Partial<{
      code: string;
      name: string;
      description: string | null;
      qualificationType: LoyaltyTierQualificationType;
      qualificationConfig: Record<string, unknown>;
      benefitConfig: LoyaltyTierBenefitConfig;
      sortOrder: number;
    }>,
    outletId: number,
  ) => Promise<void>;
  setTierActive: (id: string, isActive: boolean, outletId: number) => Promise<void>;
  fetchAutomations: (outletId: number) => Promise<void>;
  createAutomation: (payload: {
    outletId: number;
    code: string;
    name: string;
    description?: string;
    triggerType: LoyaltyAutomationTriggerType;
    condition?: Record<string, unknown>;
    actionType: LoyaltyAutomationActionType;
    actionConfig?: Record<string, unknown>;
    isActive?: boolean;
  }) => Promise<LoyaltyAutomationRow>;
  updateAutomation: (
    id: string,
    payload: Partial<{
      code: string;
      name: string;
      description: string | null;
      triggerType: LoyaltyAutomationTriggerType;
      condition: Record<string, unknown>;
      actionType: LoyaltyAutomationActionType;
      actionConfig: Record<string, unknown>;
    }>,
    outletId: number,
  ) => Promise<void>;
  setAutomationActive: (id: string, isActive: boolean, outletId: number) => Promise<void>;
  fetchAutomationLogs: (id: string, limit?: number) => Promise<LoyaltyAutomationLogRow[]>;
  fetchCampaigns: (outletId: number) => Promise<void>;
  createCampaign: (payload: {
    outletId: number;
    code: string;
    name: string;
    description?: string;
    segmentId: number;
    campaignType?: string;
    scheduledAt?: string | null;
  }) => Promise<LoyaltyCampaignRow>;
  updateCampaign: (
    id: string,
    payload: Partial<{
      code: string;
      name: string;
      description: string | null;
      segmentId: number;
      campaignType: string;
      scheduledAt: string | null;
    }>,
    outletId: number,
  ) => Promise<void>;
  updateCampaignStatus: (id: string, status: LoyaltyCampaignStatus, outletId: number) => Promise<void>;
  fetchCampaignAudience: (id: string, limit?: number) => Promise<LoyaltyCampaignAudience>;
  fetchCampaignAudienceSnapshot: (id: string, limit?: number) => Promise<LoyaltyCampaignSnapshot>;
  activateCampaign: (id: string, outletId: number) => Promise<void>;
  completeCampaign: (id: string, outletId: number) => Promise<void>;
  cancelCampaign: (id: string, outletId: number) => Promise<void>;
};

let programsInflight: Promise<void> | null = null;

export const useLoyaltyEngineStore = create<LoyaltyEngineState>((set, get) => ({
  programs: [],
  rules: [],
  rewards: [],
  vouchers: [],
  segments: [],
  tiers: [],
  automations: [],
  campaigns: [],
  analytics: null,
  lastSimulation: null,
  loadingPrograms: false,
  loadingRules: false,
  loadingRewards: false,
  loadingVouchers: false,
  loadingSegments: false,
  loadingTiers: false,
  loadingAutomations: false,
  loadingCampaigns: false,
  loadingAnalytics: false,
  simulating: false,

  fetchPrograms: async (outletId) => {
    if (programsInflight) return programsInflight;
    set({ loadingPrograms: true });
    programsInflight = (async () => {
      try {
        const rows = await listLoyaltyPrograms(outletId != null ? { outletId } : undefined);
        set({ programs: rows });
      } finally {
        set({ loadingPrograms: false });
        programsInflight = null;
      }
    })();
    return programsInflight;
  },

  createProgram: async (payload) => {
    const row = await createLoyaltyProgram(payload);
    await get().fetchPrograms(payload.outletId);
    return row;
  },

  updateProgram: async (id, payload) => {
    await updateLoyaltyProgram(id, payload);
    const outletId = get().programs.find((p) => p.id === id)?.outletId ?? undefined;
    await get().fetchPrograms(outletId ?? undefined);
  },

  setProgramActive: async (id, isActive) => {
    await setLoyaltyProgramActivation(id, isActive);
    const outletId = get().programs.find((p) => p.id === id)?.outletId ?? undefined;
    await get().fetchPrograms(outletId ?? undefined);
  },

  fetchRules: async (programId) => {
    set({ loadingRules: true });
    try {
      const rows = await listLoyaltyProgramRules(programId);
      set({ rules: rows });
    } finally {
      set({ loadingRules: false });
    }
  },

  saveRule: async (programId, ruleType, config, ruleId) => {
    if (ruleId) {
      await updateLoyaltyProgramRule(ruleId, { config });
    } else {
      await createLoyaltyProgramRule(programId, { ruleType, config });
    }
    await get().fetchRules(programId);
    const outletId = get().programs.find((p) => p.id === programId)?.outletId ?? undefined;
    await get().fetchPrograms(outletId ?? undefined);
  },

  removeRule: async (ruleId, programId) => {
    await deleteLoyaltyProgramRule(ruleId);
    await get().fetchRules(programId);
  },

  runSimulation: async (payload) => {
    set({ simulating: true });
    try {
      const result = await simulateLoyaltyProgram(payload);
      set({ lastSimulation: result });
      return result;
    } finally {
      set({ simulating: false });
    }
  },

  fetchAnalytics: async (outletId) => {
    set({ loadingAnalytics: true });
    try {
      const data = await fetchLoyaltyEngineAnalytics(outletId);
      set({ analytics: data });
    } finally {
      set({ loadingAnalytics: false });
    }
  },

  fetchRewards: async (outletId) => {
    set({ loadingRewards: true });
    try {
      const rows = await listLoyaltyRewards(outletId);
      set({ rewards: rows });
    } finally {
      set({ loadingRewards: false });
    }
  },

  createReward: async (payload) => {
    const row = await createLoyaltyReward(payload);
    await get().fetchRewards(payload.outletId);
    return row;
  },

  updateReward: async (id, payload) => {
    await updateLoyaltyReward(id, payload);
    const outletId = get().rewards.find((r) => r.id === id)?.outletId;
    if (outletId) await get().fetchRewards(outletId);
  },

  setRewardActive: async (id, isActive, outletId) => {
    await setLoyaltyRewardActivation(id, isActive);
    await get().fetchRewards(outletId);
  },

  fetchVouchers: async (outletId) => {
    set({ loadingVouchers: true });
    try {
      const rows = await listLoyaltyVouchers(outletId);
      set({ vouchers: rows });
    } finally {
      set({ loadingVouchers: false });
    }
  },

  createVoucher: async (payload) => {
    const row = await createLoyaltyVoucher(payload);
    await get().fetchVouchers(payload.outletId);
    return row;
  },

  updateVoucher: async (id, payload, outletId) => {
    await updateLoyaltyVoucher(id, payload);
    await get().fetchVouchers(outletId);
  },

  setVoucherActive: async (id, isActive, outletId) => {
    await setLoyaltyVoucherActivation(id, isActive);
    await get().fetchVouchers(outletId);
  },

  issueCampaignVoucher: async (campaignId, voucherId, outletId) => {
    const result = await issueCampaignVoucherApi(campaignId, voucherId);
    await get().fetchCampaigns(outletId);
    return result;
  },

  fetchSegments: async (outletId) => {
    set({ loadingSegments: true });
    try {
      const rows = await listMemberSegments(outletId);
      set({ segments: rows });
    } finally {
      set({ loadingSegments: false });
    }
  },

  createSegment: async (payload) => {
    const row = await createMemberSegment(payload);
    await get().fetchSegments(payload.outletId);
    return row;
  },

  updateSegment: async (id, payload, outletId) => {
    await updateMemberSegment(id, payload);
    await get().fetchSegments(outletId);
  },

  setSegmentActive: async (id, isActive, outletId) => {
    await setMemberSegmentActivation(id, isActive);
    await get().fetchSegments(outletId);
  },

  previewSegment: async (id, limit) => previewMemberSegment(id, limit),

  fetchTiers: async (outletId) => {
    set({ loadingTiers: true });
    try {
      const rows = await listLoyaltyTiers(outletId);
      set({ tiers: rows });
    } finally {
      set({ loadingTiers: false });
    }
  },

  createTier: async (payload) => {
    const row = await createLoyaltyTier(payload);
    await get().fetchTiers(payload.outletId);
    return row;
  },

  updateTier: async (id, payload, outletId) => {
    await updateLoyaltyTier(id, payload);
    await get().fetchTiers(outletId);
  },

  setTierActive: async (id, isActive, outletId) => {
    await setLoyaltyTierActivation(id, isActive);
    await get().fetchTiers(outletId);
  },

  fetchAutomations: async (outletId) => {
    set({ loadingAutomations: true });
    try {
      const rows = await listLoyaltyAutomations(outletId);
      set({ automations: rows });
    } finally {
      set({ loadingAutomations: false });
    }
  },

  createAutomation: async (payload) => {
    const row = await createLoyaltyAutomation(payload);
    await get().fetchAutomations(payload.outletId);
    return row;
  },

  updateAutomation: async (id, payload, outletId) => {
    await updateLoyaltyAutomation(id, payload);
    await get().fetchAutomations(outletId);
  },

  setAutomationActive: async (id, isActive, outletId) => {
    await setLoyaltyAutomationActivation(id, isActive);
    await get().fetchAutomations(outletId);
  },

  fetchAutomationLogs: async (id, limit) => listLoyaltyAutomationLogs(id, limit),

  fetchCampaigns: async (outletId) => {
    set({ loadingCampaigns: true });
    try {
      const rows = await listLoyaltyCampaigns(outletId);
      set({ campaigns: rows });
    } finally {
      set({ loadingCampaigns: false });
    }
  },

  createCampaign: async (payload) => {
    const row = await createLoyaltyCampaign(payload);
    await get().fetchCampaigns(payload.outletId);
    return row;
  },

  updateCampaign: async (id, payload, outletId) => {
    await updateLoyaltyCampaign(id, payload);
    await get().fetchCampaigns(outletId);
  },

  updateCampaignStatus: async (id, status, outletId) => {
    await updateLoyaltyCampaignStatus(id, status);
    await get().fetchCampaigns(outletId);
  },

  fetchCampaignAudience: async (id, limit) => fetchLoyaltyCampaignAudience(id, limit),

  fetchCampaignAudienceSnapshot: async (id, limit) => fetchLoyaltyCampaignAudienceSnapshot(id, limit),

  activateCampaign: async (id, outletId) => {
    await activateLoyaltyCampaign(id);
    await get().fetchCampaigns(outletId);
  },

  completeCampaign: async (id, outletId) => {
    await completeLoyaltyCampaign(id);
    await get().fetchCampaigns(outletId);
  },

  cancelCampaign: async (id, outletId) => {
    await cancelLoyaltyCampaign(id);
    await get().fetchCampaigns(outletId);
  },
}));
