import { create } from "zustand";
import { getApiAccessToken } from "@/lib/api-integration/client";
import {
  deleteBankAccountApi,
  deleteOutletApi,
  deletePaymentMethodApi,
  deletePrinterApi,
  deleteTaxApi,
  getIntegrationSettings,
  getMerchantSettings,
  getNumberingSettings,
  getSystemSettings,
  listBankAccounts,
  listOutletReceiptSettings,
  listOutlets,
  listPaymentMethods,
  listPrinters,
  listTaxes,
  patchOutlet,
} from "@/lib/api-integration/settingsDomainEndpoints";
import type {
  BankAccount,
  IntegrationSettings,
  Merchant,
  NumberingSettings,
  Outlet,
  OutletReceiptSettingRow,
  PaymentMethod,
  Printer,
  SystemPrefs,
  Tax,
} from "@/domain/settingsDomainTypes";

export type {
  BankAccount,
  IntegrationSettings,
  Merchant,
  NumberingSettings,
  Outlet,
  OutletReceiptSettingRow,
  PaymentMethod,
  Printer,
  SystemPrefs,
  Tax,
} from "@/domain/settingsDomainTypes";

const uid = () => Math.random().toString(36).slice(2, 10);

const EMPTY_MERCHANT: Merchant = {
  name: "",
  businessType: "Restaurant",
  address: "",
  phone: "",
  email: "",
  currency: "IDR",
  timezone: "Asia/Jakarta",
  language: "en",
};

const EMPTY_SYSTEM: SystemPrefs = {
  enableSplitBill: true,
  enableMultiPayment: true,
  confirmBeforePayment: true,
  enableQROrdering: true,
};

const EMPTY_NUMBERING: NumberingSettings = {
  invoiceFormat: "",
  orderFormat: "",
};

const EMPTY_INTEGRATION: IntegrationSettings = {
  paymentGatewayKey: "",
  webhookUrl: "",
  printAgentUrl: "http://localhost:9100",
  thirdPartyNotes: "",
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
  outletReceiptRows: OutletReceiptSettingRow[];

  updateMerchant: (m: Partial<Merchant>) => void;
  upsertOutlet: (o: Outlet) => void;
  deleteOutlet: (id: number) => void;
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
  setOutletReceiptRows: (rows: OutletReceiptSettingRow[]) => void;
  patchOutletReceiptLocal: (outletId: number, patch: Partial<OutletReceiptSettingRow>) => void;

  refreshFromApi: () => Promise<void>;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  merchant: { ...EMPTY_MERCHANT },
  outlets: [],
  taxes: [],
  printers: [],
  paymentMethods: [],
  system: { ...EMPTY_SYSTEM },
  integration: { ...EMPTY_INTEGRATION },
  numbering: { ...EMPTY_NUMBERING },
  banks: [],
  outletReceiptRows: [],

  updateMerchant: (m) => set((s) => ({ merchant: { ...s.merchant, ...m } })),
  upsertOutlet: (o) =>
    set((s) => ({
      outlets: s.outlets.find((x) => x.id === o.id) ? s.outlets.map((x) => (x.id === o.id ? o : x)) : [...s.outlets, o],
    })),
  deleteOutlet: (id) => set((s) => ({ outlets: s.outlets.filter((x) => x.id !== id) })),
  upsertTax: (t) =>
    set((s) => ({
      taxes: s.taxes.find((x) => x.id === t.id) ? s.taxes.map((x) => (x.id === t.id ? t : x)) : [...s.taxes, t],
    })),
  deleteTax: (id) => set((s) => ({ taxes: s.taxes.filter((x) => x.id !== id) })),
  upsertPrinter: (p) =>
    set((s) => ({
      printers: s.printers.find((x) => x.id === p.id)
        ? s.printers.map((x) => (x.id === p.id ? p : x))
        : [...s.printers, p],
    })),
  deletePrinter: (id) => set((s) => ({ printers: s.printers.filter((x) => x.id !== id) })),
  upsertPayment: (p) =>
    set((s) => ({
      paymentMethods: s.paymentMethods.find((x) => x.id === p.id)
        ? s.paymentMethods.map((x) => (x.id === p.id ? p : x))
        : [...s.paymentMethods, p],
    })),
  deletePayment: (id) => set((s) => ({ paymentMethods: s.paymentMethods.filter((x) => x.id !== id) })),
  updateSystem: (p) => set((s) => ({ system: { ...s.system, ...p } })),
  updateIntegration: (p) => set((s) => ({ integration: { ...s.integration, ...p } })),
  updateNumbering: (p) => set((s) => ({ numbering: { ...s.numbering, ...p } })),
  upsertBank: (b) =>
    set((s) => ({
      banks: s.banks.find((x) => x.id === b.id) ? s.banks.map((x) => (x.id === b.id ? b : x)) : [...s.banks, b],
    })),
  deleteBank: (id) => set((s) => ({ banks: s.banks.filter((x) => x.id !== id) })),
  setDefaultBank: (id) =>
    set((s) => ({ banks: s.banks.map((x) => ({ ...x, isDefault: x.id === id })) })),

  setOutletReceiptRows: (rows) => set({ outletReceiptRows: rows }),
  patchOutletReceiptLocal: (outletId, patch) =>
    set((s) => ({
      outletReceiptRows: s.outletReceiptRows.map((r) => (r.outletId === outletId ? { ...r, ...patch } : r)),
    })),

  refreshFromApi: async () => {
    if (!getApiAccessToken()) return;
    const [
      merchant,
      outlets,
      taxes,
      printers,
      paymentMethods,
      banks,
      system,
      integration,
      numbering,
      outletReceiptRows,
    ] = await Promise.all([
      getMerchantSettings(),
      listOutlets(),
      listTaxes(),
      listPrinters(),
      listPaymentMethods(),
      listBankAccounts(),
      getSystemSettings(),
      getIntegrationSettings(),
      getNumberingSettings(),
      listOutletReceiptSettings(),
    ]);
    set({
      merchant,
      outlets,
      taxes,
      printers,
      paymentMethods,
      banks,
      system,
      integration,
      numbering,
      outletReceiptRows,
    });
  },
}));

export const newId = uid;

export async function persistOutletPrefixesFromStore(): Promise<void> {
  const { outlets } = useSettingsStore.getState();
  if (!getApiAccessToken()) return;
  await Promise.all(outlets.map((o) => patchOutlet(o.id, o)));
}

export async function removeOutletCascade(outletId: number): Promise<void> {
  if (getApiAccessToken()) await deleteOutletApi(outletId);
  useSettingsStore.getState().deleteOutlet(outletId);
}

export async function removeTaxCascade(taxId: string): Promise<void> {
  if (getApiAccessToken()) await deleteTaxApi(taxId);
  useSettingsStore.getState().deleteTax(taxId);
}

export async function removePrinterCascade(printerId: string): Promise<void> {
  if (getApiAccessToken()) await deletePrinterApi(printerId);
  useSettingsStore.getState().deletePrinter(printerId);
}

export async function removePaymentCascade(paymentMethodId: string): Promise<void> {
  if (getApiAccessToken()) await deletePaymentMethodApi(paymentMethodId);
  useSettingsStore.getState().deletePayment(paymentMethodId);
}

export async function removeBankCascade(bankAccountId: string): Promise<void> {
  if (getApiAccessToken()) await deleteBankAccountApi(bankAccountId);
  useSettingsStore.getState().deleteBank(bankAccountId);
}
