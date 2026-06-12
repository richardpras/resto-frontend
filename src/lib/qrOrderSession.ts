const PREFIX = "qr";

function storageKeyActiveOrders(tableToken: string): string {
  return `${PREFIX}.activeOrderCodes.${tableToken}`;
}

export function setCurrentTableToken(tableToken: string): void {
  if (typeof window === "undefined" || tableToken.trim() === "") return;
  window.localStorage.setItem(`${PREFIX}.currentTableToken`, tableToken.trim());
}

export function getCurrentTableToken(): string | null {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(`${PREFIX}.currentTableToken`);
  return value && value.trim() !== "" ? value : null;
}

export function getActiveOrderCodes(tableToken: string): string[] {
  if (typeof window === "undefined" || tableToken.trim() === "") return [];
  try {
    const raw = window.localStorage.getItem(storageKeyActiveOrders(tableToken));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((code): code is string => typeof code === "string" && code.trim() !== "");
  } catch {
    return [];
  }
}

export function addActiveOrderCode(tableToken: string, orderCode: string): void {
  if (typeof window === "undefined" || tableToken.trim() === "" || orderCode.trim() === "") return;
  const existing = getActiveOrderCodes(tableToken);
  if (existing.includes(orderCode)) return;
  window.localStorage.setItem(storageKeyActiveOrders(tableToken), JSON.stringify([...existing, orderCode]));
}

export function setLastSubmittedOrderCode(orderCode: string): void {
  if (typeof window === "undefined" || orderCode.trim() === "") return;
  window.localStorage.setItem(`${PREFIX}.lastSubmittedOrderCode`, orderCode.trim());
}

export function getLastSubmittedOrderCode(): string | null {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(`${PREFIX}.lastSubmittedOrderCode`);
  return value && value.trim() !== "" ? value : null;
}

export function isAdditionalOrder(tableToken: string, orderCode: string): boolean {
  const codes = getActiveOrderCodes(tableToken);
  const index = codes.indexOf(orderCode);
  return index > 0;
}

export function setOrderRequestId(orderCode: string, requestId: string): void {
  if (typeof window === "undefined" || orderCode.trim() === "" || requestId.trim() === "") return;
  window.localStorage.setItem(`${PREFIX}.requestIdByOrderCode.${orderCode.trim()}`, requestId.trim());
}

export function getOrderRequestId(orderCode: string): string | null {
  if (typeof window === "undefined" || orderCode.trim() === "") return null;
  const value = window.localStorage.getItem(`${PREFIX}.requestIdByOrderCode.${orderCode.trim()}`);
  return value && value.trim() !== "" ? value : null;
}

type OrderTableContext = {
  outletId: number;
  tableId: number;
};

export function setOrderTableContext(orderCode: string, context: OrderTableContext): void {
  if (typeof window === "undefined" || orderCode.trim() === "") return;
  window.localStorage.setItem(
    `${PREFIX}.orderTableContext.${orderCode.trim()}`,
    JSON.stringify(context),
  );
}

export function getOrderTableContext(orderCode: string): OrderTableContext | null {
  if (typeof window === "undefined" || orderCode.trim() === "") return null;
  try {
    const raw = window.localStorage.getItem(`${PREFIX}.orderTableContext.${orderCode.trim()}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OrderTableContext;
    if (!parsed || typeof parsed.outletId !== "number" || typeof parsed.tableId !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}
