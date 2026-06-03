import { create } from "zustand";
import type { MemberApiRow, MemberProfileApi } from "@/lib/api-integration/membersEndpoints";
import {
  createMember as apiCreateMember,
  deleteMember,
  fetchMemberProfile,
  listMembers,
  redeemMemberPoints as apiRedeemMemberPoints,
  redeemMemberReward as apiRedeemMemberReward,
  quickCreateMember,
  searchMembers,
  toggleMemberStatus as apiToggleMemberStatus,
  updateMember as apiUpdateMember,
} from "@/lib/api-integration/membersEndpoints";

export type MemberStatus = "active" | "inactive";

export interface Member {
  id: string;
  outletId?: number;
  memberNo?: string;
  name: string;
  phone: string;
  email?: string;
  birthday?: string;
  gender?: string;
  notes?: string;
  points: number;
  status: MemberStatus;
  createdAt: string;
}

function mapMember(row: MemberApiRow): Member {
  const name = row.fullName ?? row.name;
  return {
    id: String(row.id),
    outletId: row.outletId ?? undefined,
    memberNo: row.memberNo ?? undefined,
    name,
    phone: row.phone,
    email: row.email ?? undefined,
    birthday: row.birthDate ?? row.birthday ?? undefined,
    gender: row.gender ?? undefined,
    notes: row.notes ?? undefined,
    points: 0,
    status: row.status,
    createdAt: row.createdAt,
  };
}

interface MemberStore {
  members: Member[];
  searchResults: Member[];
  loading: boolean;
  searchLoading: boolean;
  lastFetchedAt: number;
  inFlightFetch: Promise<void> | null;
  fetchMembers: (options?: { force?: boolean; outletId?: number }) => Promise<void>;
  searchMembersForOutlet: (outletId: number, query: string) => Promise<Member[]>;
  quickCreateMember: (payload: {
    outletId: number;
    fullName: string;
    phone: string;
    email?: string;
    notes?: string;
  }) => Promise<Member>;
  fetchProfile: (memberId: string, outletId: number) => Promise<MemberProfileApi>;
  redeemPoints: (
    memberId: string,
    outletId: number,
    payload: { points: number; description?: string },
  ) => Promise<import("@/lib/api-integration/membersEndpoints").RedeemMemberPointsResult>;
  redeemReward: (
    memberId: string,
    outletId: number,
    payload: { rewardId: number; notes?: string },
  ) => Promise<import("@/lib/api-integration/membersEndpoints").RedeemMemberRewardResult>;
  addMember: (
    m: Omit<Member, "id" | "createdAt" | "points" | "memberNo"> & { points?: number; outletId?: number },
  ) => Promise<void>;
  updateMember: (id: string, m: Partial<Member>) => Promise<void>;
  toggleStatus: (id: string) => Promise<void>;
  removeMember: (id: string) => Promise<void>;
}

export const useMemberStore = create<MemberStore>((set, get) => ({
  members: [],
  searchResults: [],
  loading: false,
  searchLoading: false,
  lastFetchedAt: 0,
  inFlightFetch: null,

  fetchMembers: async (options) => {
    const state = get();
    const now = Date.now();
    const isFresh = now - state.lastFetchedAt < 60_000 && state.members.length > 0;
    if (!options?.force && isFresh) return;
    if (state.inFlightFetch) return state.inFlightFetch;

    const job = (async () => {
      set({ loading: true });
      try {
        const rows = await listMembers(options?.outletId);
        set({ members: rows.map(mapMember), loading: false, lastFetchedAt: Date.now(), inFlightFetch: null });
      } catch (e) {
        set({ loading: false, inFlightFetch: null });
        throw e;
      }
    })();
    set({ inFlightFetch: job });
    return job;
  },

  searchMembersForOutlet: async (outletId, query) => {
    set({ searchLoading: true });
    try {
      const rows = await searchMembers(outletId, query);
      const mapped = rows.map(mapMember);
      set({ searchResults: mapped, searchLoading: false });
      return mapped;
    } catch (e) {
      set({ searchLoading: false });
      throw e;
    }
  },

  quickCreateMember: async (payload) => {
    const row = await quickCreateMember(payload);
    const member = mapMember(row);
    set((state) => ({
      members: [member, ...state.members.filter((m) => m.id !== member.id)],
      searchResults: [member, ...state.searchResults.filter((m) => m.id !== member.id)],
    }));
    return member;
  },

  fetchProfile: async (memberId, outletId) => fetchMemberProfile(memberId, outletId),

  redeemPoints: async (memberId, outletId, payload) =>
    apiRedeemMemberPoints(memberId, { outletId, ...payload }),

  redeemReward: async (memberId, outletId, payload) =>
    apiRedeemMemberReward(memberId, { outletId, ...payload }),

  addMember: async (m) => {
    await apiCreateMember({
      outletId: m.outletId,
      name: m.name.trim(),
      phone: m.phone.trim(),
      email: m.email?.trim() || undefined,
      birthday: m.birthday?.trim() || undefined,
      notes: m.notes?.trim() || undefined,
      status: m.status,
    });
    await get().fetchMembers({ force: true, outletId: m.outletId });
  },

  updateMember: async (id, m) => {
    const payload: Parameters<typeof apiUpdateMember>[1] = {};
    if (m.name !== undefined) payload.name = m.name;
    if (m.phone !== undefined) payload.phone = m.phone;
    if (m.email !== undefined) payload.email = m.email || null;
    if (m.birthday !== undefined) payload.birthday = m.birthday || null;
    if (m.notes !== undefined) payload.notes = m.notes || null;
    if (m.status !== undefined) payload.status = m.status;

    await apiUpdateMember(id, payload);
    await get().fetchMembers({ force: true });
  },

  toggleStatus: async (id) => {
    await apiToggleMemberStatus(id);
    await get().fetchMembers({ force: true });
  },

  removeMember: async (id) => {
    await deleteMember(id);
    await get().fetchMembers({ force: true });
  },
}));
