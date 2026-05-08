import type {
  CrmDashboardMetrics,
  Customer,
  GiftCard,
  GiftCardSettlementState,
  LoyaltyPointsLedgerEntry,
  LoyaltyRedemption,
  LoyaltyTier,
  PaginationMeta,
} from "@/domain/crmTypes";

type UnknownRow = Record<string, unknown>;

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function asNullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

export function mapPaginationMeta(raw: UnknownRow | null | undefined): PaginationMeta {
  const meta = raw ?? {};
  return {
    currentPage: asNumber(meta.currentPage ?? meta.current_page, 1),
    perPage: asNumber(meta.perPage ?? meta.per_page, 0),
    total: asNumber(meta.total, 0),
    lastPage: asNumber(meta.lastPage ?? meta.last_page, 1),
  };
}

export function mapCustomer(raw: UnknownRow): Customer {
  return {
    id: asString(raw.id),
    outletId: raw.outletId == null ? null : asNumber(raw.outletId, 0),
    code: asString(raw.code),
    name: asString(raw.name),
    phone: asNullableString(raw.phone),
    email: asNullableString(raw.email),
    tierCode: asNullableString(raw.tierCode ?? raw.tier_code),
    tierName: asNullableString(raw.tierName ?? raw.tier_name),
    pointsBalance: asNumber(raw.pointsBalance ?? raw.points_balance, 0),
    giftCardBalance: asNumber(raw.giftCardBalance ?? raw.gift_card_balance, 0),
    createdAt: asNullableString(raw.createdAt ?? raw.created_at),
    updatedAt: asNullableString(raw.updatedAt ?? raw.updated_at),
  };
}

export function mapLoyaltyTier(raw: UnknownRow): LoyaltyTier {
  return {
    id: asString(raw.id),
    code: asString(raw.code),
    name: asString(raw.name),
    minPoints: asNumber(raw.minPoints ?? raw.min_points, 0),
    discountRate: asNumber(raw.discountRate ?? raw.discount_rate, 0),
    benefits: asStringArray(raw.benefits),
  };
}

export function mapPointsLedgerEntry(raw: UnknownRow): LoyaltyPointsLedgerEntry {
  const deltaPoints = asNumber(raw.deltaPoints ?? raw.delta_points, 0);
  return {
    id: asString(raw.id),
    customerId: asString(raw.customerId ?? raw.customer_id),
    outletId: raw.outletId == null ? null : asNumber(raw.outletId, 0),
    deltaPoints,
    direction: deltaPoints < 0 ? "debit" : "credit",
    reason: asString(raw.reason),
    referenceType: asNullableString(raw.referenceType ?? raw.reference_type),
    referenceId: asNullableString(raw.referenceId ?? raw.reference_id),
    createdAt: asNullableString(raw.createdAt ?? raw.created_at),
  };
}

export function mapLoyaltyRedemption(raw: UnknownRow): LoyaltyRedemption {
  return {
    id: asString(raw.id),
    customerId: asString(raw.customerId ?? raw.customer_id),
    outletId: asNumber(raw.outletId ?? raw.outlet_id, 0),
    pointsUsed: asNumber(raw.pointsUsed ?? raw.points_used, 0),
    amountValue: asNumber(raw.amountValue ?? raw.amount_value, 0),
    replayFingerprint: asNullableString(raw.replayFingerprint ?? raw.replay_fingerprint),
    status: (asString(raw.status, "queued") as LoyaltyRedemption["status"]) ?? "queued",
    createdAt: asNullableString(raw.createdAt ?? raw.created_at),
  };
}

function mapSettlementState(raw: unknown): GiftCardSettlementState {
  const value = asString(raw, "idle");
  switch (value) {
    case "pending":
    case "partially_settled":
    case "settled":
    case "failed":
      return value;
    default:
      return "idle";
  }
}

export function mapGiftCard(raw: UnknownRow): GiftCard {
  return {
    id: asString(raw.id),
    outletId: raw.outletId == null ? null : asNumber(raw.outletId, 0),
    cardNumber: asString(raw.cardNumber ?? raw.card_number),
    customerId: asNullableString(raw.customerId ?? raw.customer_id),
    holderName: asNullableString(raw.holderName ?? raw.holder_name),
    status: (asString(raw.status, "inactive") as GiftCard["status"]) ?? "inactive",
    balance: asNumber(raw.balance, 0),
    settlementState: mapSettlementState(raw.settlementState ?? raw.settlement_state),
    expiresAt: asNullableString(raw.expiresAt ?? raw.expires_at),
    updatedAt: asNullableString(raw.updatedAt ?? raw.updated_at),
  };
}

export function mapCrmDashboardMetrics(raw: UnknownRow, outletId: number): CrmDashboardMetrics {
  return {
    outletId,
    customerCount: asNumber(raw.customerCount ?? raw.customer_count, 0),
    activeLoyaltyMembers: asNumber(raw.activeLoyaltyMembers ?? raw.active_loyalty_members, 0),
    pointsIssued: asNumber(raw.pointsIssued ?? raw.points_issued, 0),
    pointsRedeemed: asNumber(raw.pointsRedeemed ?? raw.points_redeemed, 0),
    redemptionCount: asNumber(raw.redemptionCount ?? raw.redemption_count, 0),
    giftCardOutstandingValue: asNumber(raw.giftCardOutstandingValue ?? raw.gift_card_outstanding_value, 0),
    pendingGiftCardSettlements: asNumber(raw.pendingGiftCardSettlements ?? raw.pending_gift_card_settlements, 0),
    updatedAt: asNullableString(raw.updatedAt ?? raw.updated_at),
  };
}
