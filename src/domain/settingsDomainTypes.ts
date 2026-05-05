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
  id: string;
  name: string;
  address: string;
  phone: string;
  manager: string;
  status: "active" | "inactive";
  logo?: string;
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
}

export interface Printer {
  id: string;
  name: string;
  printerType: "kitchen" | "cashier";
  connection: "bluetooth" | "lan";
  ip?: string;
  bluetoothDevice?: string;
  outletId: string;
  assignedCategories?: string[];
}

export interface PaymentMethod {
  id: string;
  name: string;
  type: "cash" | "digital";
  integration?: string;
  fee?: number;
  status: "active" | "inactive";
}

export interface SystemPrefs {
  enableSplitBill: boolean;
  enableMultiPayment: boolean;
  confirmBeforePayment: boolean;
  enableQROrdering: boolean;
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
}

export interface OutletReceiptSettingRow {
  outletId: string;
  outletName: string;
  receiptHeader: string;
  receiptFooter: string;
  showLogo: boolean;
  showTaxBreakdown: boolean;
}
