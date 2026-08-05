import { createDeviceUuid } from "@/mobile/offline/createDeviceUuid";
import { getSecureValue, setSecureValue } from "@/mobile/secureStorage";

const ORDER_MAP_PREFIX = "resto.offline.order.map.";
const SPLIT_MAP_PREFIX = "resto.offline.split.map.";

type OrderItemMap = Record<string, number>;

type OrderMapEntry = {
  serverOrderId?: number;
  localOrderCode: string;
  itemMap: OrderItemMap;
};

function orderKey(localOrderId: string): string {
  return ORDER_MAP_PREFIX + localOrderId;
}

function splitKey(localOrderId: string): string {
  return SPLIT_MAP_PREFIX + localOrderId;
}

export async function saveLocalOrderMapping(
  localOrderId: string,
  localOrderCode: string,
  serverOrderId: number | undefined,
  itemMap: OrderItemMap,
): Promise<void> {
  const entry: OrderMapEntry = { serverOrderId, localOrderCode, itemMap };
  await setSecureValue(orderKey(localOrderId), JSON.stringify(entry));
}

export async function loadLocalOrderMapping(localOrderId: string): Promise<OrderMapEntry | null> {
  const raw = await getSecureValue(orderKey(localOrderId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as OrderMapEntry;
  } catch {
    return null;
  }
}

export async function saveSplitMapping(
  localOrderId: string,
  personIndexToSplitId: Record<number, number>,
): Promise<void> {
  await setSecureValue(splitKey(localOrderId), JSON.stringify(personIndexToSplitId));
}

export async function loadSplitMapping(localOrderId: string): Promise<Record<number, number>> {
  const raw = await getSecureValue(splitKey(localOrderId));
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<number, number>;
  } catch {
    return {};
  }
}

export function isLocalOrderId(orderId: string): boolean {
  return orderId.startsWith("local:");
}

export function createLocalOrderId(): string {
  return `local:${createDeviceUuid()}`;
}

export function resolveServerOrderId(orderId: string, mapping: OrderMapEntry | null): number | null {
  if (!isLocalOrderId(orderId)) {
    const parsed = Number(orderId);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }
  return mapping?.serverOrderId ?? null;
}
