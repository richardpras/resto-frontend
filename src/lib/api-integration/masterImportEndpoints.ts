import { API_BASE_URL, apiRequest as request, getApiAccessToken } from "./client";

export type MasterImportSectionResult = {
  created: number;
  updated: number;
  skipped: number;
  errors: Array<{ row: number; message: string }>;
  previewRows: Array<Record<string, unknown>>;
};

export type MasterImportResult = {
  preview: boolean;
  canCommit: boolean;
  created: number;
  updated: number;
  skipped: number;
  errorCount: number;
  sections: Record<string, MasterImportSectionResult>;
  batchId?: number | null;
};

export async function downloadMasterImportPhase1Template(): Promise<Blob> {
  return downloadMasterImportTemplate("/imports/phase1/template");
}

export async function downloadMasterImportPhase1TemplateXlsx(outletId: number): Promise<Blob> {
  return downloadMasterImportTemplate(`/imports/phase1/template-xlsx?outletId=${outletId}`);
}

async function downloadMasterImportTemplate(path: string): Promise<Blob> {
  const token = getApiAccessToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) {
    throw new Error("Failed to download import template.");
  }
  return response.blob();
}

export async function importMasterImportPhase1Bundle(payload: {
  outletId: number;
  tenantId?: number;
  file: File;
  preview?: boolean;
}): Promise<MasterImportResult> {
  const form = new FormData();
  form.append("outletId", String(payload.outletId));
  if (payload.tenantId) {
    form.append("tenantId", String(payload.tenantId));
  }
  form.append("preview", payload.preview ? "1" : "0");
  form.append("file", payload.file);

  const token = getApiAccessToken();
  const response = await fetch(`${API_BASE_URL}/imports/phase1/bundle`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  const body = (await response.json()) as { message?: string; data?: MasterImportResult };
  if (!response.ok) {
    throw new Error(body.message ?? "Import failed.");
  }
  return body.data as MasterImportResult;
}

export async function importMasterImportPhase1Type(payload: {
  type: string;
  outletId: number;
  tenantId?: number;
  csv: string;
  filename?: string;
  preview?: boolean;
}): Promise<MasterImportResult> {
  const res = await request<{ data: MasterImportResult }>(`/imports/phase1/${encodeURIComponent(payload.type)}`, {
    method: "POST",
    body: JSON.stringify({
      outletId: payload.outletId,
      tenantId: payload.tenantId,
      csv: payload.csv,
      filename: payload.filename,
      preview: payload.preview ?? false,
    }),
  });
  return res.data;
}

export async function downloadMasterImportPhase2Template(): Promise<Blob> {
  return downloadMasterImportTemplate("/imports/phase2/template");
}

export async function downloadMasterImportPhase2TemplateXlsx(outletId: number): Promise<Blob> {
  return downloadMasterImportTemplate(`/imports/phase2/template-xlsx?outletId=${outletId}`);
}

export async function importMasterImportPhase2Bundle(payload: {
  outletId: number;
  tenantId?: number;
  file: File;
  preview?: boolean;
}): Promise<MasterImportResult> {
  const form = new FormData();
  form.append("outletId", String(payload.outletId));
  if (payload.tenantId) {
    form.append("tenantId", String(payload.tenantId));
  }
  form.append("preview", payload.preview ? "1" : "0");
  form.append("file", payload.file);

  const token = getApiAccessToken();
  const response = await fetch(`${API_BASE_URL}/imports/phase2/bundle`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  const body = (await response.json()) as { message?: string; data?: MasterImportResult };
  if (!response.ok) {
    throw new Error(body.message ?? "Import failed.");
  }
  return body.data as MasterImportResult;
}

export async function downloadMasterImportPhase3Template(): Promise<Blob> {
  return downloadMasterImportTemplate("/imports/phase3/template");
}

export async function downloadMasterImportPhase3TemplateXlsx(outletId: number): Promise<Blob> {
  return downloadMasterImportTemplate(`/imports/phase3/template-xlsx?outletId=${outletId}`);
}

export async function importMasterImportPhase3Bundle(payload: {
  outletId: number;
  tenantId?: number;
  file: File;
  preview?: boolean;
}): Promise<MasterImportResult> {
  const form = new FormData();
  form.append("outletId", String(payload.outletId));
  if (payload.tenantId) {
    form.append("tenantId", String(payload.tenantId));
  }
  form.append("preview", payload.preview ? "1" : "0");
  form.append("file", payload.file);

  const token = getApiAccessToken();
  const response = await fetch(`${API_BASE_URL}/imports/phase3/bundle`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  const body = (await response.json()) as { message?: string; data?: MasterImportResult };
  if (!response.ok) {
    throw new Error(body.message ?? "Import failed.");
  }
  return body.data as MasterImportResult;
}

export async function downloadMasterImportPhase4Template(): Promise<Blob> {
  return downloadMasterImportTemplate("/imports/phase4/template");
}

export async function downloadMasterImportPhase4TemplateXlsx(outletId: number): Promise<Blob> {
  return downloadMasterImportTemplate(`/imports/phase4/template-xlsx?outletId=${outletId}`);
}

export async function importMasterImportPhase4Bundle(payload: {
  outletId: number;
  tenantId?: number;
  file: File;
  preview?: boolean;
}): Promise<MasterImportResult> {
  const form = new FormData();
  form.append("outletId", String(payload.outletId));
  if (payload.tenantId) {
    form.append("tenantId", String(payload.tenantId));
  }
  form.append("preview", payload.preview ? "1" : "0");
  form.append("file", payload.file);

  const token = getApiAccessToken();
  const response = await fetch(`${API_BASE_URL}/imports/phase4/bundle`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  const body = (await response.json()) as { message?: string; data?: MasterImportResult };
  if (!response.ok) {
    throw new Error(body.message ?? "Import failed.");
  }
  return body.data as MasterImportResult;
}
