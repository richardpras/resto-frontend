/** Shared shapes for ERP settings (camelCase ↔ API). */

export interface Merchant {
  name: string;
  businessType: string;
  address: string;
  phone: string;
  email: string;
  logo?: string;
  currency: string;
  timezone: string;
  language: string;
}

export interface Outlet {
  id: number;
  code: string;
  name: string;
  address: string;
  phone: string;
  manager: string;
  status: "active" | "inactive";
  logo?: string;
  logoUrl?: string;
  hasLogo?: boolean;
  logoVersion?: number;
  invoicePrefix?: string;
  orderPrefix?: string;
}

export interface Tax {
  id: string;
  name: string;
  type: "percentage" | "fixed";
  value: number;
  applyDineIn: boolean;
  applyTakeaway: boolean;
  inclusive: boolean;
  status: "active" | "inactive";
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
}

export interface Printer {
  id: string;
  printerProfileId?: number | null;
  name: string;
  printerType: "kitchen" | "cashier" | "bar" | "dessert";
  connection: "bluetooth" | "lan" | "usb" | "shared";
  thermalPaperWidth?: "58mm" | "80mm";
  ip?: string;
  port?: number;
  bluetoothDevice?: string;
  bluetoothAddress?: string;
  devicePath?: string;
  sharePath?: string;
  sharePrinterName?: string;
  outletId: number;
  assignedCategories?: string[];
}

export interface PaymentMethod {
  id: string;
  name: string;
  type: "cash" | "digital";
  integration?: string;
  fee?: number;
  status: "active" | "inactive";
  chartAccountId?: number | null;
  chartAccountCode?: string | null;
}

export type StockEnforcementMode = "strict" | "warning" | "deferred";

export interface SystemPrefs {
  enableSplitBill: boolean;
  enableMultiPayment: boolean;
  confirmBeforePayment: boolean;
  enableQROrdering: boolean;
  enableCallCashier: boolean;
  requireCustomerApprovalForAdjustments?: boolean;
  qrPendingConfirmationTtlMinutes: number;
  /** @deprecated Use stockEnforcementMode === "strict" */
  enforceStockOnSale: boolean;
  stockEnforcementMode: StockEnforcementMode;
  allowNegativeStock: boolean;
}

export interface IntegrationSettings {
  paymentGatewayKey: string;
  webhookUrl: string;
  printAgentUrl: string;
  thirdPartyNotes: string;
}

export interface NumberingSettings {
  invoiceFormat: string;
  orderFormat: string;
}

export interface BankAccount {
  id: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  isDefault: boolean;
  chartAccountId?: number | null;
  chartAccountCode?: string | null;
}

export interface OutletReceiptSettingRow {
  outletId: number;
  outletName: string;
  receiptHeader: string;
  receiptFooter: string;
  showLogo: boolean;
  showTaxBreakdown: boolean;
  logoUrl?: string;
  hasLogo?: boolean;
  logoVersion?: number;
}
