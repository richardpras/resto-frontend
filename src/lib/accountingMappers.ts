import type { AccountApiRow, JournalApiRow } from "@/lib/api-integration/accountingEndpoints";
import type { Account, AccountSubtype, AccountType, JournalEntry, JournalLine } from "@/stores/accountingStore";

function coerceSubtype(raw: string, type: AccountType): AccountSubtype {
  const allowed: AccountSubtype[] = [
    "current_asset",
    "fixed_asset",
    "short_term_liability",
    "long_term_liability",
    "equity",
    "revenue",
    "cogs",
    "expense",
  ];
  if (allowed.includes(raw as AccountSubtype)) {
    return raw as AccountSubtype;
  }
  if (type === "asset") {
    return "current_asset";
  }
  if (type === "liability") {
    return "short_term_liability";
  }
  if (type === "equity") {
    return "equity";
  }
  if (type === "revenue") {
    return "revenue";
  }
  return "expense";
}

export function accountFromApi(row: AccountApiRow): Account {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    type: row.type,
    subtype: coerceSubtype(row.subtype, row.type),
    parentId: row.parentId ?? undefined,
    description: row.description ?? "",
    active: row.active,
  };
}

export function journalFromApi(row: JournalApiRow): JournalEntry {
  const lines: JournalLine[] = row.lines.map((l) => ({
    id: l.id,
    accountId: l.accountId,
    debit: l.debit,
    credit: l.credit,
  }));
  return {
    id: row.id,
    date: row.date,
    reference: row.reference,
    description: row.description,
    outlet: row.outlet,
    status: row.status,
    lines,
  };
}
