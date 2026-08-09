import type { Order, OrderItem } from "@/stores/orderStore";
import type { OfflineBootstrapSnapshot } from "@/mobile/offline/offlineBootstrapDb";
import { thermalWidthChars, type EscPosDocument } from "@/mobile/print/escposBuilder";
import { loadThermalLogoRaster } from "@/mobile/print/thermalLogoRaster";
import {
  buildCustomerReceiptLines,
  type ThermalReceiptBranding,
  type ThermalReceiptDiscountLine,
  type ThermalReceiptSnapshot,
} from "@/domain/thermalReceiptLayout";

export type ReceiptPrintContext = {
  paperWidth: "58mm" | "80mm";
  outletName: string;
  receiptHeader?: string;
  receiptFooter?: string;
  showTaxBreakdown?: boolean;
  showLogo?: boolean;
  logoUrl?: string | null;
  currency?: string;
  cashierName?: string;
};

export function receiptContextFromBootstrap(snapshot: OfflineBootstrapSnapshot | null): ReceiptPrintContext {
  const rs = snapshot?.receiptSettings ?? {};
  const merchant = snapshot?.merchant ?? {};
  const logoUrl = String(rs.logoUrl ?? "").trim();
  return {
    paperWidth: snapshot?.thermalPaperWidth ?? "58mm",
    outletName: String(rs.outletName ?? merchant.name ?? "Outlet"),
    receiptHeader: String(rs.receiptHeader ?? rs.header ?? ""),
    receiptFooter: String(rs.receiptFooter ?? rs.footer ?? ""),
    showTaxBreakdown: Boolean(rs.showTaxBreakdown ?? false),
    showLogo: Boolean(rs.showLogo ?? false),
    logoUrl: logoUrl || null,
    currency: String(merchant.currency ?? "IDR"),
  };
}

function buildDiscountLines(order: Order): ThermalReceiptDiscountLine[] {
  const lines: ThermalReceiptDiscountLine[] = [];
  const promo = Number(order.promotionDiscount ?? 0);
  if (promo > 0) {
    const promoObj = order.promotion as { code?: string; name?: string } | null | undefined;
    const label = String(promoObj?.code || promoObj?.name || "Promo");
    lines.push({ label, type: "promotion", amount: -Math.abs(promo) });
  }
  const voucher = Number(order.voucherDiscount ?? 0);
  if (voucher > 0) {
    const voucherObj = order.voucher as { code?: string } | null | undefined;
    const label = String(voucherObj?.code || "Voucher");
    lines.push({ label, type: "voucher", amount: -Math.abs(voucher) });
  }
  const leftover = Number(order.discountAmount ?? 0) - promo - voucher;
  if (leftover > 0.009) {
    lines.push({ label: "Discount", amount: -Math.abs(leftover) });
  }
  return lines;
}

export function orderToThermalReceiptSnapshot(
  order: Order,
  ctx: ReceiptPrintContext,
  options?: { isProforma?: boolean },
): ThermalReceiptSnapshot {
  const isProforma =
    options?.isProforma ??
    (order.paymentStatus !== "paid" || (order.payments?.length ?? 0) === 0);

  const branding: ThermalReceiptBranding = {
    outletName: ctx.outletName,
    header: ctx.receiptHeader,
    footer: ctx.receiptFooter,
    showTaxBreakdown: ctx.showTaxBreakdown,
    showLogo: ctx.showLogo,
  };

  const paidAt =
    order.payments.length > 0
      ? order.payments[order.payments.length - 1]?.paidAt ?? order.createdAt
      : order.createdAt;

  return {
    order_code: order.code,
    customer_display: order.customerName || order.tableName || "",
    paid_at: paidAt,
    order_type: order.orderType,
    service_mode: order.serviceMode,
    cashier_name: ctx.cashierName ?? "",
    split_label: order.splitBill?.persons?.length
      ? order.splitBill.persons.map((p) => p.label).filter(Boolean).join(", ")
      : "",
    is_proforma: isProforma,
    apply_tax: Boolean(order.applyTax),
    subtotal: order.subtotal,
    tax: order.tax,
    total: order.total,
    balance_due:
      order.balanceDue ??
      Math.max(0, order.total - order.payments.reduce((s, p) => s + p.amount, 0)),
    lines: order.items.map((item) => ({
      name: item.name,
      qty: item.qty,
      price: item.price,
    })),
    discount_lines: buildDiscountLines(order),
    tax_lines: (order.taxSnapshot ?? []).map((t) => ({
      label: t.name || "Tax",
      amount: t.amount,
    })),
    payments: isProforma
      ? []
      : order.payments.map((p) => ({
          label: String(p.method),
          amount: p.amount,
          tenderedAmount: p.tenderedAmount,
          changeAmount: p.changeAmount,
        })),
    receipt_branding: branding,
  };
}

export async function buildCustomerReceiptDocument(
  order: Order,
  ctx: ReceiptPrintContext,
  options?: { isProforma?: boolean },
): Promise<EscPosDocument> {
  const width = thermalWidthChars(ctx.paperWidth);
  const snapshot = orderToThermalReceiptSnapshot(order, ctx, options);
  const lines = buildCustomerReceiptLines(snapshot, width);
  const document: EscPosDocument = { lines, cut: true };

  if (ctx.showLogo && ctx.logoUrl) {
    const raster = await loadThermalLogoRaster(ctx.logoUrl, ctx.paperWidth);
    if (raster) {
      document.images = [
        {
          align: "center",
          rasterBase64: raster.rasterBase64,
          width: raster.width,
          height: raster.height,
          widthBytes: raster.widthBytes,
        },
      ];
    }
  }

  return document;
}

export function buildKitchenChitDocument(
  order: Pick<Order, "code" | "tableName" | "orderType" | "items">,
  ctx: ReceiptPrintContext,
  station = "KITCHEN",
): EscPosDocument {
  const width = thermalWidthChars(ctx.paperWidth);
  const divider = "-".repeat(width);
  const stationLabel = String(station || "KITCHEN").trim().toUpperCase() || "KITCHEN";
  const lines: EscPosDocument["lines"] = [
    { text: `${stationLabel} TICKET`, align: "center", bold: true },
    { text: divider },
    { text: `Order #${order.code}` },
  ];
  if (order.tableName) lines.push({ text: `Table: ${order.tableName}` });
  if (order.orderType) lines.push({ text: `Type: ${order.orderType}` });
  lines.push({ text: divider });

  for (const item of order.items as OrderItem[]) {
    lines.push({ text: `${item.qty} x ${item.name}`, bold: true });
    const note = String(item.notes ?? "").trim();
    if (note) {
      lines.push({ text: `>> CATATAN: ${note}`, bold: true });
    }
  }

  lines.push({ text: divider });
  lines.push({ text: new Date().toLocaleString("id-ID"), align: "center" });

  return { lines, cut: true };
}

/** One kitchen ticket per menu category (same printer when category mapping is unset). */
export function buildKitchenChitDocuments(
  order: Pick<Order, "code" | "tableName" | "orderType" | "items">,
  ctx: ReceiptPrintContext,
): EscPosDocument[] {
  const groups = new Map<string, OrderItem[]>();
  for (const item of order.items as OrderItem[]) {
    const key = String(item.category ?? "").trim() || "Uncategorized";
    const list = groups.get(key) ?? [];
    list.push(item);
    groups.set(key, list);
  }

  if (groups.size === 0) {
    return [buildKitchenChitDocument(order, ctx, "KITCHEN")];
  }

  return [...groups.entries()].map(([category, items]) =>
    buildKitchenChitDocument({ ...order, items }, ctx, category),
  );
}
