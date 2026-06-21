/** Outlet used for POS print/bridge status — prefer the order's outlet over header selector. */
export function resolvePrintStatusOutletId(
  activeOutletId: number | null | undefined,
  orderOutletId?: number | null,
): number | null {
  if (typeof orderOutletId === "number" && orderOutletId > 0) return orderOutletId;
  if (typeof activeOutletId === "number" && activeOutletId > 0) return activeOutletId;
  return null;
}
