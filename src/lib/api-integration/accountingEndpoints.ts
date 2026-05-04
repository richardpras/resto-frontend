import { apiRequest as request } from "./client";

type ApiListEnvelope<T> = { data: T[] };

export type AccountApiRow = {
  id: string;
  code: string;
  name: string;
  type: "asset" | "liability" | "equity" | "revenue" | "expense";
  subtype: string;
  parentId?: string | null;
  description?: string | null;
  active: boolean;
};

export type AccountCreatePayload = {
  tenantId?: number;
  code: string;
  name: string;
  type: AccountApiRow["type"];
  subtype?: string;
  parentId?: string | null;
  description?: string;
  active?: boolean;
};

export type AccountUpdatePayload = Partial<AccountCreatePayload>;

export type JournalLineApi = {
  id: string;
  accountId: string;
  debit: number;
  credit: number;
  memo?: string | null;
};

export type JournalApiRow = {
  id: string;
  journalNo: string;
  date: string;
  reference: string;
  description: string;
  outlet: string;
  status: "draft" | "posted";
  lines: JournalLineApi[];
};

export type JournalCreatePayload = {
  tenantId?: number;
  journalNo?: string;
  journalDate: string;
  description?: string;
  outlet?: string;
  status?: "draft" | "posted";
  lines: { accountId: string; debit: number; credit: number; memo?: string }[];
};

export type JournalUpdatePayload = Partial<
  Pick<JournalCreatePayload, "journalDate" | "description" | "outlet">
> & {
  lines?: JournalCreatePayload["lines"];
};

export async function listAccounts(): Promise<AccountApiRow[]> {
  const res = await request<ApiListEnvelope<AccountApiRow>>("/accounts");
  return res.data;
}

export async function createAccount(payload: AccountCreatePayload): Promise<AccountApiRow> {
  const res = await request<{ data: AccountApiRow }>("/accounts", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function updateAccount(id: string, payload: AccountUpdatePayload): Promise<AccountApiRow> {
  const res = await request<{ data: AccountApiRow }>(`/accounts/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function deleteAccount(id: string): Promise<void> {
  await request<{ message: string }>(`/accounts/${id}`, {
    method: "DELETE",
  });
}

export async function listJournals(): Promise<JournalApiRow[]> {
  const res = await request<ApiListEnvelope<JournalApiRow>>("/journals");
  return res.data;
}

export async function createJournal(payload: JournalCreatePayload): Promise<JournalApiRow> {
  const res = await request<{ data: JournalApiRow }>("/journals", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function updateJournal(id: string, payload: JournalUpdatePayload): Promise<JournalApiRow> {
  const res = await request<{ data: JournalApiRow }>(`/journals/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function deleteJournal(id: string): Promise<void> {
  await request<{ message: string }>(`/journals/${id}`, {
    method: "DELETE",
  });
}

export async function postJournal(id: string): Promise<JournalApiRow> {
  const res = await request<{ data: JournalApiRow }>(`/journals/${id}/post`, {
    method: "POST",
  });
  return res.data;
}
