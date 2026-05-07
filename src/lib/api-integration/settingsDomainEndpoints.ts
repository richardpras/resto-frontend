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
import { mapOutletDtoToViewModel, parseOutletListPayload } from "@/domain/outletAdapters";
import { apiRequest as request } from "./client";

type Envelope<T> = { data: T };
type MessageEnvelope<T> = { message: string; data: T };
type OutletListPayload = { data: unknown } | Outlet[] | unknown;
type OutletListQuery = { page?: number; perPage?: number };

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
export async function listOutlets(query?: OutletListQuery): Promise<Outlet[]> {
  const params = new URLSearchParams();
  if (typeof query?.page === "number") params.set("page", String(query.page));
  if (typeof query?.perPage === "number") params.set("per_page", String(query.perPage));
  const path = params.size > 0 ? `/outlets?${params.toString()}` : "/outlets";
  const res = await request<OutletListPayload>(path);
  return parseOutletListPayload(res);
}

function serializeOutletCreate(o: Omit<Outlet, "id">): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    name: o.name,
    address: o.address || null,
    phone: o.phone || null,
    manager: o.manager || null,
    status: o.status,
    logo: o.logo ?? null,
    invoicePrefix: o.invoicePrefix ?? null,
    orderPrefix: o.orderPrefix ?? null,
  };
  if ((o.code ?? "").trim() !== "") {
    payload.code = o.code.trim();
  }
  return payload;
}

function serializeOutletPatch(o: Outlet): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    name: o.name,
    address: o.address || null,
    phone: o.phone || null,
    manager: o.manager || null,
    status: o.status,
    logo: o.logo ?? null,
    invoicePrefix: o.invoicePrefix ?? null,
    orderPrefix: o.orderPrefix ?? null,
  };
  if ((o.code ?? "").trim() !== "") {
    payload.code = o.code.trim();
  }
  return payload;
}

/** POST /outlets */
export async function postOutlet(body: Omit<Outlet, "id">): Promise<Outlet> {
  const payload = serializeOutletCreate(body);
  const res = await request<MessageEnvelope<unknown>>("/outlets", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return mapOutletDtoToViewModel(res.data as Record<string, unknown>);
}

/** PATCH /outlets/:id */
export async function patchOutlet(outletId: number, body: Outlet): Promise<Outlet> {
  const payload = serializeOutletPatch(body);
  const res = await request<MessageEnvelope<unknown>>(`/outlets/${encodeURIComponent(String(outletId))}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return mapOutletDtoToViewModel(res.data as Record<string, unknown>);
}

/** DELETE /outlets/:id */
export async function deleteOutletApi(outletId: number): Promise<void> {
  await request<{ message?: string }>(`/outlets/${encodeURIComponent(String(outletId))}`, {
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
  outletId: number,
  body: Pick<OutletReceiptSettingRow, "receiptHeader" | "receiptFooter" | "showLogo" | "showTaxBreakdown">,
): Promise<OutletReceiptSettingRow> {
  const res = await request<MessageEnvelope<OutletReceiptSettingRow>>(
    `/outlet-receipt-settings/${encodeURIComponent(String(outletId))}`,
    { method: "PATCH", body: JSON.stringify(body) },
  );
  return res.data;
}
