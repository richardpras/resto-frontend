import type { Tax } from "@/domain/settingsDomainTypes";

export type OrderTaxLine = {
  taxId: string;
  name: string;
  type: string;
  rate: number;
  inclusive: boolean;
  amount: number;
};

export type ComputeOrderTaxInput = {
  rules: Tax[];
  orderType: string;
  serviceMode?: string | null;
  subtotal: number;
  discount: number;
  applyTax: boolean;
  asOfDate?: string;
};

export type ComputeOrderTaxResult = {
  subtotalAfterDiscount: number;
  tax: number;
  total: number;
  taxLines: OrderTaxLine[];
};

function isTakeawayMode(serviceMode?: string | null, orderType?: string): boolean {
  const mode = (serviceMode ?? "").toLowerCase().trim();
  if (["takeaway", "take_away", "take-away"].includes(mode)) return true;
  const type = (orderType ?? "").toLowerCase().trim();
  return ["takeaway", "take away", "take-away", "online"].includes(type);
}

function isEffectiveOnDate(rule: Tax, asOfDate: string): boolean {
  if (rule.effectiveFrom && rule.effectiveFrom > asOfDate) return false;
  if (rule.effectiveTo && rule.effectiveTo < asOfDate) return false;
  return true;
}

function filterMatchingRules(rules: Tax[], orderType: string, serviceMode?: string | null, asOfDate?: string): Tax[] {
  const date = asOfDate ?? new Date().toISOString().slice(0, 10);
  const takeaway = isTakeawayMode(serviceMode, orderType);
  return rules.filter((rule) => {
    if (rule.status !== "active") return false;
    if (!isEffectiveOnDate(rule, date)) return false;
    return takeaway ? rule.applyTakeaway : rule.applyDineIn;
  });
}

function calculateLineAmount(rule: Tax, base: number): number {
  if (base <= 0) return 0;
  if (rule.type === "fixed") return Math.max(0, rule.value);
  if (rule.value <= 0) return 0;
  if (rule.inclusive) return base - base / (1 + rule.value / 100);
  return base * (rule.value / 100);
}

export function computeOrderTax(input: ComputeOrderTaxInput): ComputeOrderTaxResult {
  const subtotalAfterDiscount = Math.max(0, Math.round((input.subtotal - input.discount) * 100) / 100);
  if (!input.applyTax || input.rules.length === 0) {
    return { subtotalAfterDiscount, tax: 0, total: subtotalAfterDiscount, taxLines: [] };
  }

  const matching = filterMatchingRules(input.rules, input.orderType, input.serviceMode, input.asOfDate);
  if (matching.length === 0) {
    return { subtotalAfterDiscount, tax: 0, total: subtotalAfterDiscount, taxLines: [] };
  }

  const taxLines: OrderTaxLine[] = [];
  let taxTotal = 0;
  let runningBase = subtotalAfterDiscount;

  for (const rule of matching) {
    const raw = calculateLineAmount(rule, runningBase);
    const amount = Math.round(raw);
    if (amount <= 0) continue;
    taxLines.push({
      taxId: rule.id,
      name: rule.name,
      type: rule.type,
      rate: rule.value,
      inclusive: rule.inclusive,
      amount,
    });
    taxTotal += amount;
    if (rule.type === "percentage" && !rule.inclusive) {
      runningBase += amount;
    }
  }

  const tax = Math.round(taxTotal);
  return {
    subtotalAfterDiscount,
    tax,
    total: Math.round(subtotalAfterDiscount + tax),
    taxLines,
  };
}

export function formatTaxRulesLabel(rules: Tax[]): string {
  if (rules.length === 0) return "";
  return rules
    .map((rule) => (rule.type === "percentage" ? `${rule.name} (${rule.value}%)` : rule.name))
    .join(" + ");
}
