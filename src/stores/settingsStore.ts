import { create } from "zustand";
import { getSettings, updateSettings } from "@/lib/api-integration/settingsEndpoints";

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
  receiptHeader?: string;
  receiptFooter?: string;
  showLogo?: boolean;
  showTaxBreakdown?: boolean;
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

/** Full document exchanged with `GET/PUT /v1/settings`. */
export type SettingsPayload = {
  merchant: Merchant;
  outlets: Outlet[];
  taxes: Tax[];
  printers: Printer[];
  paymentMethods: PaymentMethod[];
  system: SystemPrefs;
  integration: IntegrationSettings;
  numbering: NumberingSettings;
  banks: BankAccount[];
};

interface SettingsStore {
  merchant: Merchant;
  outlets: Outlet[];
  taxes: Tax[];
  printers: Printer[];
  paymentMethods: PaymentMethod[];
  system: SystemPrefs;
  integration: IntegrationSettings;
  numbering: NumberingSettings;
  banks: BankAccount[];

  updateMerchant: (m: Partial<Merchant>) => void;
  upsertOutlet: (o: Outlet) => void;
  deleteOutlet: (id: string) => void;
  upsertTax: (t: Tax) => void;
  deleteTax: (id: string) => void;
  upsertPrinter: (p: Printer) => void;
  deletePrinter: (id: string) => void;
  upsertPayment: (p: PaymentMethod) => void;
  deletePayment: (id: string) => void;
  updateSystem: (s: Partial<SystemPrefs>) => void;
  updateIntegration: (i: Partial<IntegrationSettings>) => void;
  updateNumbering: (n: Partial<NumberingSettings>) => void;
  upsertBank: (b: BankAccount) => void;
  deleteBank: (id: string) => void;
  setDefaultBank: (id: string) => void;

  hydrateFromPayload: (p: SettingsPayload) => void;
  refreshFromApi: () => Promise<void>;
  persistToApi: () => Promise<void>;
}

const uid = () => Math.random().toString(36).slice(2, 10);

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  merchant: {
    name: "RestoHub",
    businessType: "Restaurant",
    address: "Jl. Sudirman No. 123, Jakarta",
    phone: "+62 812 3456 7890",
    email: "hello@restohub.com",
    currency: "IDR",
    timezone: "Asia/Jakarta",
    language: "en",
  },
  outlets: [
    {
      id: "o-main",
      name: "Main Outlet",
      address: "Jl. Sudirman No. 123",
      phone: "+62 812 3456 7890",
      manager: "Sarah Lee",
      status: "active",
      receiptHeader: "Thank you for visiting RestoHub",
      receiptFooter: "See you again!",
      showLogo: true,
      showTaxBreakdown: true,
      invoicePrefix: "INV-MAIN",
      orderPrefix: "ORD-MAIN",
    },
    {
      id: "o-branch",
      name: "Branch - Downtown",
      address: "Jl. Thamrin No. 45",
      phone: "+62 812 0000 1111",
      manager: "Mike Tan",
      status: "active",
      receiptHeader: "Welcome to RestoHub Downtown",
      receiptFooter: "Thank you!",
      showLogo: true,
      showTaxBreakdown: true,
      invoicePrefix: "INV-DT",
      orderPrefix: "ORD-DT",
    },
  ],
  taxes: [
    { id: uid(), name: "PB1 Service Tax", type: "percentage", value: 10, applyDineIn: true, applyTakeaway: true, inclusive: false, status: "active" },
  ],
  printers: [
    { id: uid(), name: "Kitchen Printer 1", printerType: "kitchen", connection: "lan", ip: "192.168.1.50", outletId: "o-main", assignedCategories: ["Main Course"] },
    { id: uid(), name: "Cashier Printer", printerType: "cashier", connection: "lan", ip: "192.168.1.51", outletId: "o-main" },
  ],
  paymentMethods: [
    { id: uid(), name: "Cash", type: "cash", status: "active" },
    { id: uid(), name: "QRIS", type: "digital", integration: "Midtrans", fee: 0.7, status: "active" },
    { id: uid(), name: "GoPay", type: "digital", integration: "Gojek", fee: 1.5, status: "active" },
  ],
  system: {
    enableSplitBill: true,
    enableMultiPayment: true,
    confirmBeforePayment: true,
    enableQROrdering: true,
  },
  integration: {
    paymentGatewayKey: "",
    webhookUrl: "",
    printAgentUrl: "http://localhost:9100",
    thirdPartyNotes: "",
  },
  numbering: {
    invoiceFormat: "INV-{YYYY}{MM}-{0000}",
    orderFormat: "ORD-{YYYY}{MM}{DD}-{000}",
  },
  banks: [
    { id: uid(), bankName: "BCA", accountName: "PT RestoHub Indonesia", accountNumber: "1234567890", isDefault: true },
  ],

  updateMerchant: (m) => set((s) => ({ merchant: { ...s.merchant, ...m } })),
  upsertOutlet: (o) => set((s) => ({ outlets: s.outlets.find((x) => x.id === o.id) ? s.outlets.map((x) => (x.id === o.id ? o : x)) : [...s.outlets, o] })),
  deleteOutlet: (id) => set((s) => ({ outlets: s.outlets.filter((x) => x.id !== id) })),
  upsertTax: (t) => set((s) => ({ taxes: s.taxes.find((x) => x.id === t.id) ? s.taxes.map((x) => (x.id === t.id ? t : x)) : [...s.taxes, t] })),
  deleteTax: (id) => set((s) => ({ taxes: s.taxes.filter((x) => x.id !== id) })),
  upsertPrinter: (p) => set((s) => ({ printers: s.printers.find((x) => x.id === p.id) ? s.printers.map((x) => (x.id === p.id ? p : x)) : [...s.printers, p] })),
  deletePrinter: (id) => set((s) => ({ printers: s.printers.filter((x) => x.id !== id) })),
  upsertPayment: (p) => set((s) => ({ paymentMethods: s.paymentMethods.find((x) => x.id === p.id) ? s.paymentMethods.map((x) => (x.id === p.id ? p : x)) : [...s.paymentMethods, p] })),
  deletePayment: (id) => set((s) => ({ paymentMethods: s.paymentMethods.filter((x) => x.id !== id) })),
  updateSystem: (p) => set((s) => ({ system: { ...s.system, ...p } })),
  updateIntegration: (p) => set((s) => ({ integration: { ...s.integration, ...p } })),
  updateNumbering: (p) => set((s) => ({ numbering: { ...s.numbering, ...p } })),
  upsertBank: (b) => set((s) => ({ banks: s.banks.find((x) => x.id === b.id) ? s.banks.map((x) => (x.id === b.id ? b : x)) : [...s.banks, b] })),
  deleteBank: (id) => set((s) => ({ banks: s.banks.filter((x) => x.id !== id) })),
  setDefaultBank: (id) => set((s) => ({ banks: s.banks.map((x) => ({ ...x, isDefault: x.id === id })) })),

  hydrateFromPayload: (p) =>
    set({
      merchant: p.merchant,
      outlets: p.outlets,
      taxes: p.taxes,
      printers: p.printers,
      paymentMethods: p.paymentMethods,
      system: p.system,
      integration: p.integration,
      numbering: p.numbering,
      banks: p.banks,
    }),

  refreshFromApi: async () => {
    const p = await getSettings();
    get().hydrateFromPayload(p);
  },

  persistToApi: async () => {
    const s = get();
    const payload: SettingsPayload = {
      merchant: s.merchant,
      outlets: s.outlets,
      taxes: s.taxes,
      printers: s.printers,
      paymentMethods: s.paymentMethods,
      system: s.system,
      integration: s.integration,
      numbering: s.numbering,
      banks: s.banks,
    };
    const saved = await updateSettings(payload);
    get().hydrateFromPayload(saved);
  },
}));

export const newId = uid;
