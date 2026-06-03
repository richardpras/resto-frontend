import { create } from "zustand";
import {
  createLoyaltyProgram,
  createLoyaltyProgramRule,
  createLoyaltyReward,
  deleteLoyaltyProgramRule,
  fetchLoyaltyEngineAnalytics,
  listLoyaltyProgramRules,
  listLoyaltyPrograms,
  listLoyaltyRewards,
  setLoyaltyProgramActivation,
  setLoyaltyRewardActivation,
  simulateLoyaltyProgram,
  updateLoyaltyProgram,
  updateLoyaltyProgramRule,
  updateLoyaltyReward,
  type LoyaltyEngineAnalytics,
  type LoyaltyProgramRow,
  type LoyaltyProgramRuleRow,
  type LoyaltyProgramType,
  type LoyaltyRewardRow,
  type LoyaltySimulationResult,
} from "@/lib/api-integration/loyaltyEngineEndpoints";

type LoyaltyEngineState = {
  programs: LoyaltyProgramRow[];
  rules: LoyaltyProgramRuleRow[];
  rewards: LoyaltyRewardRow[];
  analytics: LoyaltyEngineAnalytics | null;
  lastSimulation: LoyaltySimulationResult | null;
  loadingPrograms: boolean;
  loadingRules: boolean;
  loadingRewards: boolean;
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
  }) => Promise<LoyaltyProgramRow>;
  updateProgram: (
    id: string,
    payload: Partial<{ name: string; description: string | null; effectiveFrom: string | null; effectiveUntil: string | null }>,
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
};

let programsInflight: Promise<void> | null = null;

export const useLoyaltyEngineStore = create<LoyaltyEngineState>((set, get) => ({
  programs: [],
  rules: [],
  rewards: [],
  analytics: null,
  lastSimulation: null,
  loadingPrograms: false,
  loadingRules: false,
  loadingRewards: false,
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
}));
