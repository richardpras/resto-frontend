import { create } from "zustand";
import type { MemberApiRow } from "@/lib/api-integration/membersEndpoints";
import {
  createMember as apiCreateMember,
  deleteMember,
  listMembers,
  toggleMemberStatus as apiToggleMemberStatus,
  updateMember as apiUpdateMember,
} from "@/lib/api-integration/membersEndpoints";

export type MemberStatus = "active" | "inactive";

export interface Member {
  id: string;
  name: string;
  phone: string;
  email?: string;
  birthday?: string;
  notes?: string;
  points: number;
  status: MemberStatus;
  createdAt: string;
}

function mapMember(row: MemberApiRow): Member {
  return {
    id: String(row.id),
    name: row.name,
    phone: row.phone,
    email: row.email ?? undefined,
    birthday: row.birthday ?? undefined,
    notes: row.notes ?? undefined,
    points: row.points,
    status: row.status,
    createdAt: row.createdAt,
  };
}

interface MemberStore {
  members: Member[];
  loading: boolean;
  fetchMembers: () => Promise<void>;
  addMember: (
    m: Omit<Member, "id" | "createdAt" | "points"> & { points?: number },
  ) => Promise<void>;
  updateMember: (id: string, m: Partial<Member>) => Promise<void>;
  toggleStatus: (id: string) => Promise<void>;
  removeMember: (id: string) => Promise<void>;
  addPoints: (id: string, points: number) => Promise<void>;
}

export const useMemberStore = create<MemberStore>((set, get) => ({
  members: [],
  loading: false,

  fetchMembers: async () => {
    set({ loading: true });
    try {
      const rows = await listMembers();
      set({ members: rows.map(mapMember), loading: false });
    } catch (e) {
      set({ loading: false });
      throw e;
    }
  },

  addMember: async (m) => {
    await apiCreateMember({
      name: m.name.trim(),
      phone: m.phone.trim(),
      email: m.email?.trim() || undefined,
      birthday: m.birthday?.trim() || undefined,
      notes: m.notes?.trim() || undefined,
      points: m.points ?? 0,
      status: m.status,
    });
    await get().fetchMembers();
  },

  updateMember: async (id, m) => {
    const payload: Parameters<typeof apiUpdateMember>[1] = {};
    if (m.name !== undefined) payload.name = m.name;
    if (m.phone !== undefined) payload.phone = m.phone;
    if (m.email !== undefined) payload.email = m.email || null;
    if (m.birthday !== undefined) payload.birthday = m.birthday || null;
    if (m.notes !== undefined) payload.notes = m.notes || null;
    if (m.points !== undefined) payload.points = m.points;
    if (m.status !== undefined) payload.status = m.status;

    await apiUpdateMember(id, payload);
    await get().fetchMembers();
  },

  toggleStatus: async (id) => {
    await apiToggleMemberStatus(id);
    await get().fetchMembers();
  },

  removeMember: async (id) => {
    await deleteMember(id);
    await get().fetchMembers();
  },

  addPoints: async (id, points) => {
    const m = get().members.find((x) => x.id === id);
    if (!m) return;
    await apiUpdateMember(id, { points: m.points + points });
    await get().fetchMembers();
  },
}));
