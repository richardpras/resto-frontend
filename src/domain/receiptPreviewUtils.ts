import type { Printer } from "@/domain/settingsDomainTypes";

export function resolveReceiptPreviewWidthCh(
  outletId: number,
  printers: Pick<Printer, "outletId" | "printerType" | "thermalPaperWidth">[],
): number {
  const cashier = printers.find(
    (p) => p.outletId === outletId && (p.printerType === "cashier" || p.printerType === "receipt"),
  );
  return cashier?.thermalPaperWidth === "80mm" ? 42 : 32;
}

export function formatPreviewMoney(value: number): string {
  return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatPreviewColumns(left: string, right: string, widthCh: number): string {
  const pad = Math.max(1, widthCh - left.length - right.length);
  return `${left}${" ".repeat(pad)}${right}`;
}
