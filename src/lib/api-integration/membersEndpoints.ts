import { apiRequest } from "./client";

type ListEnvelope<T> = { data: T[] };
type MessageItemEnvelope<T> = { message?: string; data: T };

export type MemberApiRow = {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  birthday?: string | null;
  notes?: string | null;
  points: number;
  status: "active" | "inactive";
  createdAt: string;
};

export async function listMembers(): Promise<MemberApiRow[]> {
  const res = await apiRequest<ListEnvelope<MemberApiRow>>("/members");
  return res.data;
}

export async function createMember(payload: {
  name: string;
  phone: string;
  email?: string;
  birthday?: string;
  notes?: string;
  points?: number;
  status: "active" | "inactive";
}): Promise<MemberApiRow> {
  const res = await apiRequest<MessageItemEnvelope<MemberApiRow>>("/members", {
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
    points: number;
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
