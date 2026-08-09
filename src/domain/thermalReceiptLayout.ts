/**
 * Client mirror of api ThermalReceiptLayoutBuilder (LAYOUT_VERSION v4).
 * Settings receipt preview and native Bluetooth/Sunmi print must use this.
 */

export const THERMAL_RECEIPT_LAYOUT_VERSION = "v4";

export type ThermalReceiptLine = {
  text: string;
  bold?: boolean;
  align?: "left" | "center" | "right";
};

export type ThermalReceiptBranding = {
  outletName: string;
  header?: string;
  footer?: string;
  showTaxBreakdown?: boolean;
  showLogo?: boolean;
};

export type ThermalReceiptItemLine = {
  name: string;
  qty: number;
  price: number;
};

export type ThermalReceiptDiscountLine = {
  label: string;
  type?: "promotion" | "voucher" | "gift_card" | "store_credit" | string;
  amount: number;
};

export type ThermalReceiptTaxLine = {
  label: string;
  amount: number;
};

export type ThermalReceiptPaymentLine = {
  label: string;
  amount: number;
  tenderedAmount?: number | null;
  changeAmount?: number | null;
};

export type ThermalReceiptSnapshot = {
  order_code?: string | null;
  customer_display?: string | null;
  customer?: string | null;
  paid_at?: string | Date | null;
  order_type?: string | null;
  service_mode?: string | null;
  cashier_name?: string | null;
  split_label?: string | null;
  fiscal_invoice_number?: string | null;
  is_proforma?: boolean;
  apply_tax?: boolean;
  subtotal?: number;
  tax?: number;
  total?: number;
  amount?: number;
  balance_due?: number;
  lines?: ThermalReceiptItemLine[];
  discount_lines?: ThermalReceiptDiscountLine[];
  tax_lines?: ThermalReceiptTaxLine[];
  payments?: ThermalReceiptPaymentLine[];
  receipt_branding?: ThermalReceiptBranding;
};

export function formatThermalMoney(value: number): string {
  return Number(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatThermalColumns(left: string, right: string, width: number): string {
  const rightLen = [...right].length;
  const leftMax = Math.max(1, width - rightLen - 1);
  const clippedLeft = [...left].slice(0, leftMax).join("");
  const pad = Math.max(1, width - [...clippedLeft].length - [...right].length);
  return `${clippedLeft}${" ".repeat(pad)}${right}`;
}

export function formatCustomerDisplay(name?: string | null): string {
  const trimmed = String(name ?? "").trim();
  return trimmed !== "" ? trimmed : "Guest";
}

export function formatOrderTypeLabel(orderType?: string | null, serviceMode?: string | null): string {
  const candidates = [orderType, serviceMode]
    .map((v) => String(v ?? "").trim())
    .filter(Boolean);

  for (const candidate of candidates) {
    const normalized = candidate.toLowerCase().replace(/[-_]/g, " ");
    if (normalized === "dine in" || normalized === "dinein") return "Dine In";
    if (normalized === "take away" || normalized === "takeaway") return "Take Away";
    if (normalized === "online") return "Online";
  }

  const primary = String(orderType || serviceMode || "").trim();
  if (!primary) return "-";
  return primary
    .toLowerCase()
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatPaidTime(paidAt?: string | Date | null): string {
  const date = paidAt ? new Date(paidAt) : new Date();
  if (Number.isNaN(date.getTime())) {
    return formatPaidTime(null);
  }
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}

function formatDiscountLabel(discountLine: ThermalReceiptDiscountLine): string {
  const name = String(discountLine.label ?? "Discount").trim() || "Discount";
  switch (discountLine.type) {
    case "promotion":
      return `Promo (${name})`;
    case "voucher":
      return `Voucher (${name})`;
    case "gift_card":
      return `Gift Card (${name})`;
    case "store_credit":
      return `Store Credit (${name})`;
    default:
      return name;
  }
}

function splitMultiline(text: string): string[] {
  return text.split(/\r\n|\n|\r/).map((l) => l.trim()).filter(Boolean);
}

function trailingFeedLines(count = 3): ThermalReceiptLine[] {
  return Array.from({ length: count }, () => ({ text: " " }));
}

/** Same structure as Settings → Receipt preview and API ThermalReceiptLayoutBuilder. */
export function buildCustomerReceiptLines(snapshot: ThermalReceiptSnapshot, width: number): ThermalReceiptLine[] {
  const w = Math.max(20, Math.min(80, width));
  const divider = "-".repeat(w);
  const branding = snapshot.receipt_branding ?? { outletName: "" };
  const lines: ThermalReceiptLine[] = [];
  const isProforma = Boolean(snapshot.is_proforma);

  const outletName = String(branding.outletName ?? "").trim();
  if (outletName) {
    lines.push({ text: outletName, bold: true, align: "center" });
  }

  // Subtitle block (proforma bill markers).
  if (isProforma) {
    lines.push({ text: "BILL", bold: true, align: "center" });
    lines.push({ text: "NOT PAID", bold: true, align: "center" });
  }

  const header = String(branding.header ?? "").trim();
  // Title + subtitle + header stay tight; one blank only before order meta.
  if (header) {
    for (const headerLine of splitMultiline(header)) {
      lines.push({ text: headerLine, align: "center" });
    }
  }
  if (outletName || isProforma || header) {
    lines.push({ text: " " });
  }

  if (snapshot.order_code) {
    lines.push({ text: formatThermalColumns("Order", String(snapshot.order_code), w) });
  }

  lines.push({
    text: formatThermalColumns(
      "Customer",
      formatCustomerDisplay(snapshot.customer_display ?? snapshot.customer),
      w,
    ),
  });

  lines.push({
    text: formatThermalColumns("Time", formatPaidTime(snapshot.paid_at), w),
  });

  lines.push({
    text: formatThermalColumns(
      "Type",
      formatOrderTypeLabel(snapshot.order_type, snapshot.service_mode),
      w,
    ),
  });

  const cashierName = String(snapshot.cashier_name ?? "").trim();
  if (cashierName) {
    lines.push({ text: formatThermalColumns("Cashier", cashierName, w) });
  }

  const splitLabel = String(snapshot.split_label ?? "").trim();
  if (splitLabel) {
    lines.push({ text: formatThermalColumns("Split", splitLabel, w) });
  }

  if (snapshot.fiscal_invoice_number) {
    lines.push({
      text: formatThermalColumns("Invoice", String(snapshot.fiscal_invoice_number), w),
    });
  }

  lines.push({ text: divider, align: "center" });

  for (const row of snapshot.lines ?? []) {
    const name = [...String(row.name ?? "")].slice(0, w).join("");
    if (name) lines.push({ text: name });

    const qty = Number(row.qty ?? 0);
    const unitPrice = Number(row.price ?? 0);
    const lineTotal = unitPrice * qty;
    const qtyLabel = `${Math.round(qty)} x ${formatThermalMoney(unitPrice)}`;
    lines.push({ text: formatThermalColumns(qtyLabel, formatThermalMoney(lineTotal), w) });
  }

  lines.push({ text: divider, align: "center" });
  lines.push({
    text: formatThermalColumns("Subtotal", formatThermalMoney(Number(snapshot.subtotal ?? 0)), w),
  });

  for (const discountLine of snapshot.discount_lines ?? []) {
    const amount = Number(discountLine.amount ?? 0);
    if (amount === 0) continue;
    lines.push({
      text: formatThermalColumns(formatDiscountLabel(discountLine), formatThermalMoney(amount), w),
    });
  }

  if (Boolean(branding.showTaxBreakdown) && Boolean(snapshot.apply_tax)) {
    const taxLines = snapshot.tax_lines ?? [];
    if (taxLines.length > 0) {
      for (const taxLine of taxLines) {
        const amount = Number(taxLine.amount ?? 0);
        if (amount === 0) continue;
        const label = String(taxLine.label ?? "Tax").trim() || "Tax";
        lines.push({ text: formatThermalColumns(label, formatThermalMoney(amount), w) });
      }
    } else if (Number(snapshot.tax ?? 0) > 0) {
      lines.push({
        text: formatThermalColumns("Tax", formatThermalMoney(Number(snapshot.tax ?? 0)), w),
      });
    }
  }

  lines.push({
    text: formatThermalColumns(
      "TOTAL",
      formatThermalMoney(Number(snapshot.total ?? snapshot.amount ?? 0)),
      w,
    ),
    bold: true,
  });

  if (isProforma) {
    lines.push({
      text: formatThermalColumns("Balance Due", formatThermalMoney(Number(snapshot.balance_due ?? 0)), w),
      bold: true,
    });
  }

  const payments = snapshot.payments ?? [];
  if (!isProforma && payments.length > 0) {
    lines.push({ text: divider, align: "center" });
    let tenderedTotal = 0;
    let changeTotal = 0;
    for (const payment of payments) {
      const label = String(payment.label ?? "Payment").trim() || "Payment";
      lines.push({
        text: formatThermalColumns(label, formatThermalMoney(Number(payment.amount ?? 0)), w),
      });
      if (payment.tenderedAmount != null && Number.isFinite(Number(payment.tenderedAmount))) {
        tenderedTotal += Number(payment.tenderedAmount);
      }
      if (payment.changeAmount != null && Number.isFinite(Number(payment.changeAmount))) {
        changeTotal += Number(payment.changeAmount);
      }
    }
    if (tenderedTotal > 0) {
      lines.push({ text: formatThermalColumns("Dibayar", formatThermalMoney(tenderedTotal), w) });
    }
    if (changeTotal > 0) {
      lines.push({ text: formatThermalColumns("Kembali", formatThermalMoney(changeTotal), w) });
    }
  }

  lines.push({ text: divider, align: "center" });

  const footer = String(branding.footer ?? "").trim();
  if (footer) {
    for (const footerLine of splitMultiline(footer)) {
      lines.push({ text: footerLine, align: "center" });
    }
  }

  return [...lines, ...trailingFeedLines()].slice(0, 256);
}

/** Sample snapshot used by Settings → Receipt preview (keeps UI in sync with print). */
export function buildSettingsReceiptPreviewSnapshot(input: {
  outletName: string;
  header: string;
  footer: string;
  showTaxBreakdown: boolean;
}): ThermalReceiptSnapshot {
  return {
    order_code: "ORD-SAMPLE-001",
    customer_display: "Budi",
    paid_at: new Date(),
    order_type: "Dine In",
    cashier_name: "Siti",
    split_label: "Guest A",
    is_proforma: false,
    apply_tax: true,
    subtotal: 45000,
    tax: 4500,
    total: 44500,
    lines: [
      { name: "Item A", qty: 1, price: 15000 },
      { name: "Item B", qty: 2, price: 15000 },
    ],
    discount_lines: [{ label: "SAVE10", type: "promotion", amount: -5000 }],
    tax_lines: [{ label: "PB1 10%", amount: 4500 }],
    payments: [
      { label: "Cash", amount: 30000 },
      { label: "QRIS", amount: 14500 },
    ],
    receipt_branding: {
      outletName: input.outletName,
      header: input.header,
      footer: input.footer,
      showTaxBreakdown: input.showTaxBreakdown,
    },
  };
}
