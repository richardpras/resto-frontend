/** Parse cashier cash tender input (digits only, IDR whole units). */
export function parseCashTenderedInput(raw: string): number {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return 0;
  const value = Number(digits);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

/** Keep only digits for controlled tender input state. */
export function normalizeCashTenderedDigits(raw: string): string {
  return raw.replace(/\D/g, "");
}

/** Format digit string for IDR display (e.g. 100000 → "100.000"). */
export function formatCashTenderDisplay(digits: string): string {
  const value = parseCashTenderedInput(digits);
  if (value <= 0) return "";
  return value.toLocaleString("id-ID");
}

export function computeCashChange(tendered: number, settledAmount: number): number {
  if (!Number.isFinite(tendered) || !Number.isFinite(settledAmount)) return 0;
  return Math.max(0, Math.floor(tendered) - Math.floor(settledAmount));
}

export function isCashTenderSufficient(tendered: number, settledAmount: number): boolean {
  if (settledAmount <= 0) return true;
  return Math.floor(tendered) >= Math.floor(settledAmount);
}

export function cashSettlementFromDraft(
  lines: Array<{ method: string; amount: number }>,
): number {
  return lines
    .filter((line) => String(line.method).toLowerCase() === "cash")
    .reduce((sum, line) => sum + Math.max(0, line.amount), 0);
}

/** Quick tender presets: exact due, round-ups, and common notes at or above due. */
export function cashTenderQuickAmounts(settledAmount: number): number[] {
  const exact = Math.max(0, Math.floor(settledAmount));
  const out: number[] = [];
  if (exact > 0) out.push(exact);

  const pushIfAbove = (amount: number) => {
    const rounded = Math.floor(amount);
    if (rounded > exact && !out.includes(rounded)) out.push(rounded);
  };

  // e.g. 68_000 → 70_000 so cashiers can tender without typing
  pushIfAbove(Math.ceil(exact / 1_000) * 1_000);
  pushIfAbove(Math.ceil(exact / 5_000) * 5_000);
  pushIfAbove(Math.ceil(exact / 10_000) * 10_000);
  for (const amount of [20_000, 50_000, 100_000, 200_000]) {
    pushIfAbove(amount);
  }

  return out.slice(0, 6);
}
