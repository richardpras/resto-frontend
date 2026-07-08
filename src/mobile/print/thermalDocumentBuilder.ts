import type { Order, OrderItem } from "@/stores/orderStore";
import type { OfflineBootstrapSnapshot } from "./offlineBootstrapDb";
import {
  centerText,
  dividerLine,
  padLine,
  thermalWidthChars,
  type EscPosDocument,
} from "@/mobile/print/escposBuilder";

export type ReceiptPrintContext = {
  paperWidth: "58mm" | "80mm";
  outletName: string;
  receiptHeader?: string;
  receiptFooter?: string;
  currency?: string;
};

export function receiptContextFromBootstrap(snapshot: OfflineBootstrapSnapshot | null): ReceiptPrintContext {
  const rs = snapshot?.receiptSettings ?? {};
  const merchant = snapshot?.merchant ?? {};
  return {
    paperWidth: snapshot?.thermalPaperWidth ?? "58mm",
    outletName: String(rs.outletName ?? merchant.name ?? "Outlet"),
    receiptHeader: String(rs.receiptHeader ?? ""),
    receiptFooter: String(rs.receiptFooter ?? ""),
    currency: String(merchant.currency ?? "IDR"),
  };
}

function formatMoney(amount: number): string {
  return Math.round(amount).toLocaleString("id-ID");
}

export function buildCustomerReceiptDocument(order: Order, ctx: ReceiptPrintContext): EscPosDocument {
  const width = thermalWidthChars(ctx.paperWidth);
  const divider = dividerLine(ctx.paperWidth);
  const lines: EscPosDocument["lines"] = [];

  lines.push({ text: centerText(ctx.outletName, width), align: "center", bold: true });
  if (ctx.receiptHeader) {
    for (const part of ctx.receiptHeader.split("\n")) {
      if (part.trim()) lines.push({ text: centerText(part.trim(), width), align: "center" });
    }
  }
  lines.push({ text: divider, align: "center" });
  lines.push({ text: `Order #${order.code}` });
  if (order.tableName) lines.push({ text: `Table: ${order.tableName}` });
  lines.push({ text: divider });

  for (const item of order.items) {
    lines.push({ text: `${item.qty} x ${item.name}`, bold: true });
    lines.push({ text: padLine("", formatMoney(item.price * item.qty), width), align: "right" });
  }

  lines.push({ text: divider });
  lines.push({ text: padLine("Subtotal", formatMoney(order.subtotal), width) });
  if (order.tax > 0) {
    lines.push({ text: padLine("Tax", formatMoney(order.tax), width) });
  }
  lines.push({ text: padLine("TOTAL", formatMoney(order.total), width), bold: true });

  const paid = order.payments.reduce((s, p) => s + p.amount, 0);
  if (paid > 0) {
    lines.push({ text: divider });
    for (const p of order.payments) {
      lines.push({ text: padLine(String(p.method).toUpperCase(), formatMoney(p.amount), width) });
    }
    if (paid < order.total) {
      lines.push({ text: padLine("Balance", formatMoney(order.total - paid), width) });
    }
  }

  if (ctx.receiptFooter) {
    lines.push({ text: divider });
    for (const part of ctx.receiptFooter.split("\n")) {
      if (part.trim()) lines.push({ text: centerText(part.trim(), width), align: "center" });
    }
  }

  lines.push({ text: new Date().toLocaleString("id-ID"), align: "center" });

  return { lines, cut: true };
}

export function buildKitchenChitDocument(
  order: Pick<Order, "code" | "tableName" | "orderType" | "items">,
  ctx: ReceiptPrintContext,
  station = "KITCHEN",
): EscPosDocument {
  const width = thermalWidthChars(ctx.paperWidth);
  const divider = dividerLine(ctx.paperWidth);
  const lines: EscPosDocument["lines"] = [
    { text: centerText(`${station} TICKET`, width), align: "center", bold: true },
    { text: divider, align: "center" },
    { text: `Order #${order.code}` },
  ];
  if (order.tableName) lines.push({ text: `Table: ${order.tableName}` });
  if (order.orderType) lines.push({ text: `Type: ${order.orderType}` });
  lines.push({ text: divider });

  for (const item of order.items as OrderItem[]) {
    lines.push({ text: `${item.qty} x ${item.name}`, bold: true });
    if (item.notes) lines.push({ text: `  Note: ${item.notes}` });
  }

  lines.push({ text: divider });
  lines.push({ text: new Date().toLocaleString("id-ID"), align: "center" });

  return { lines, cut: true };
}
