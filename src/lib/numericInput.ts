/** Parse quantity: non-negative, no leading zeros (02 -> 2). */
export function sanitizeQuantityInput(raw: string): number {
  const trimmed = raw.trim();
  if (trimmed === "") return 0;
  if (!/^\d*\.?\d*$/.test(trimmed)) return 0;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return parsed;
}

/** Parse money/price: non-negative decimal, no leading zeros on integer part. */
export function sanitizeMoneyInput(raw: string): number {
  const trimmed = raw.trim();
  if (trimmed === "") return 0;
  if (!/^\d*\.?\d*$/.test(trimmed)) return 0;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return parsed;
}

/** Display value for controlled number inputs (strips leading zeros). */
export function formatNumericFieldValue(value: number): string {
  if (!Number.isFinite(value)) return "0";
  return String(value);
}
