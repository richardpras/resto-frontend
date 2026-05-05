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
import { apiRequest as request } from "./client";

type Envelope<T> = { data: T };
type MessageEnvelope<T> = { message: string; data: T };

/** GET /merchant-settings */
export async function getMerchantSettings(): Promise<Merchant> {
  const res = await request<Envelope<Merchant>>("/merchant-settings");
  return res.data;
}

/** PATCH /merchant-settings */
export async function patchMerchantSettings(body: Merchant): Promise<Merchant> {
  const res = await request<MessageEnvelope<Merchant>>("/merchant-settings", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  return res.data;
}

/** GET /outlets */
export async function listOutlets(): Promise<Outlet[]> {
  const res = await request<Envelope<Outlet[]>>("/outlets");
  return res.data;
}

/** POST /outlets */
export async function postOutlet(body: Outlet): Promise<Outlet> {
  const res = await request<MessageEnvelope<Outlet>>("/outlets", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return res.data;
}

/** PATCH /outlets/:id */
export async function patchOutlet(outletId: string, body: Outlet): Promise<Outlet> {
  const res = await request<MessageEnvelope<Outlet>>(`/outlets/${encodeURIComponent(outletId)}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  return res.data;
}

/** DELETE /outlets/:id */
export async function deleteOutletApi(outletId: string): Promise<void> {
  await request<{ message?: string }>(`/outlets/${encodeURIComponent(outletId)}`, {
    method: "DELETE",
  });
}

/** GET /taxes */
export async function listTaxes(): Promise<Tax[]> {
  const res = await request<Envelope<Tax[]>>("/taxes");
  return res.data;
}

export async function postTax(body: Tax): Promise<Tax> {
  const res = await request<MessageEnvelope<Tax>>("/taxes", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return res.data;
}

export async function patchTax(taxId: string, body: Tax): Promise<Tax> {
  const res = await request<MessageEnvelope<Tax>>(`/taxes/${encodeURIComponent(taxId)}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  return res.data;
}

export async function deleteTaxApi(taxId: string): Promise<void> {
  await request(`/taxes/${encodeURIComponent(taxId)}`, { method: "DELETE" });
}

/** GET /printers */
export async function listPrinters(): Promise<Printer[]> {
  const res = await request<Envelope<Printer[]>>("/printers");
  return res.data;
}

export async function postPrinter(body: Printer): Promise<Printer> {
  const res = await request<MessageEnvelope<Printer>>("/printers", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return res.data;
}

export async function patchPrinter(printerId: string, body: Printer): Promise<Printer> {
  const res = await request<MessageEnvelope<Printer>>(`/printers/${encodeURIComponent(printerId)}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  return res.data;
}

export async function deletePrinterApi(printerId: string): Promise<void> {
  await request(`/printers/${encodeURIComponent(printerId)}`, { method: "DELETE" });
}

/** GET /payment-methods */
export async function listPaymentMethods(): Promise<PaymentMethod[]> {
  const res = await request<Envelope<PaymentMethod[]>>("/payment-methods");
  return res.data;
}

export async function postPaymentMethod(body: PaymentMethod): Promise<PaymentMethod> {
  const res = await request<MessageEnvelope<PaymentMethod>>("/payment-methods", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return res.data;
}

export async function patchPaymentMethod(paymentMethodId: string, body: PaymentMethod): Promise<PaymentMethod> {
  const res = await request<MessageEnvelope<PaymentMethod>>(
    `/payment-methods/${encodeURIComponent(paymentMethodId)}`,
    { method: "PATCH", body: JSON.stringify(body) },
  );
  return res.data;
}

export async function deletePaymentMethodApi(paymentMethodId: string): Promise<void> {
  await request(`/payment-methods/${encodeURIComponent(paymentMethodId)}`, { method: "DELETE" });
}

/** GET /bank-accounts */
export async function listBankAccounts(): Promise<BankAccount[]> {
  const res = await request<Envelope<BankAccount[]>>("/bank-accounts");
  return res.data;
}

export async function postBankAccount(body: BankAccount): Promise<BankAccount> {
  const res = await request<MessageEnvelope<BankAccount>>("/bank-accounts", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return res.data;
}

export async function patchBankAccount(bankAccountId: string, body: BankAccount): Promise<BankAccount> {
  const res = await request<MessageEnvelope<BankAccount>>(
    `/bank-accounts/${encodeURIComponent(bankAccountId)}`,
    { method: "PATCH", body: JSON.stringify(body) },
  );
  return res.data;
}

export async function deleteBankAccountApi(bankAccountId: string): Promise<void> {
  await request(`/bank-accounts/${encodeURIComponent(bankAccountId)}`, { method: "DELETE" });
}

export async function getSystemSettings(): Promise<SystemPrefs> {
  const res = await request<Envelope<SystemPrefs>>("/system-settings");
  return res.data;
}

export async function patchSystemSettings(body: SystemPrefs): Promise<SystemPrefs> {
  const res = await request<MessageEnvelope<SystemPrefs>>("/system-settings", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  return res.data;
}

export async function getIntegrationSettings(): Promise<IntegrationSettings> {
  const res = await request<Envelope<IntegrationSettings>>("/integration");
  return res.data;
}

export async function putIntegrationSettings(body: IntegrationSettings): Promise<IntegrationSettings> {
  const res = await request<MessageEnvelope<IntegrationSettings>>("/integration", {
    method: "PUT",
    body: JSON.stringify(body),
  });
  return res.data;
}

export async function getNumberingSettings(): Promise<NumberingSettings> {
  const res = await request<Envelope<NumberingSettings>>("/numbering-settings");
  return res.data;
}

export async function patchNumberingSettings(body: NumberingSettings): Promise<NumberingSettings> {
  const res = await request<MessageEnvelope<NumberingSettings>>("/numbering-settings", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  return res.data;
}

/** GET /outlet-receipt-settings */
export async function listOutletReceiptSettings(): Promise<OutletReceiptSettingRow[]> {
  const res = await request<Envelope<OutletReceiptSettingRow[]>>("/outlet-receipt-settings");
  return res.data;
}

/** PATCH /outlet-receipt-settings/:outletId */
export async function patchOutletReceiptSetting(
  outletId: string,
  body: Pick<OutletReceiptSettingRow, "receiptHeader" | "receiptFooter" | "showLogo" | "showTaxBreakdown">,
): Promise<OutletReceiptSettingRow> {
  const res = await request<MessageEnvelope<OutletReceiptSettingRow>>(
    `/outlet-receipt-settings/${encodeURIComponent(outletId)}`,
    { method: "PATCH", body: JSON.stringify(body) },
  );
  return res.data;
}
