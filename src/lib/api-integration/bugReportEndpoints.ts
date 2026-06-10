import { apiRequest, API_BASE_URL, getApiAccessToken, ApiHttpError } from "./client";

export type BugReportSeverity = "low" | "medium" | "high" | "critical";
export type BugReportStatus = "open" | "triaged" | "investigating" | "fixed" | "closed" | "wont_fix";

export type BugReportAttachment = {
  id: number;
  bugReportId: number;
  fileType: string | null;
  fileSize: number;
  createdAt: string | null;
  downloadUrl: string;
};

export type BugReportComment = {
  id: number;
  bugReportId: number;
  userId: number;
  userName: string | null;
  comment: string;
  createdAt: string | null;
};

export type BugReportRow = {
  id: number;
  outletId: number | null;
  reporterUserId: number;
  reporterName: string | null;
  title: string;
  message: string;
  severity: BugReportSeverity;
  status: BugReportStatus;
  currentRoute: string | null;
  browser: string | null;
  userAgent: string | null;
  viewport: string | null;
  appVersion: string | null;
  diagnosticsJson: Record<string, unknown> | null;
  assignedToUserId: number | null;
  assigneeName: string | null;
  resolvedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  attachments?: BugReportAttachment[];
  comments?: BugReportComment[];
};

export type SubmitBugReportPayload = {
  outletId?: number;
  title: string;
  message: string;
  severity?: BugReportSeverity;
  currentRoute?: string;
  browser?: string;
  userAgent?: string;
  viewport?: string;
  appVersion?: string;
  diagnosticsJson?: Record<string, unknown>;
  screenshot?: Blob | null;
};

export type ListBugReportsParams = {
  outletId?: number;
  status?: BugReportStatus;
  severity?: BugReportSeverity;
  search?: string;
  page?: number;
  limit?: number;
};

type ListEnvelope = {
  data: BugReportRow[];
  meta: { currentPage: number; lastPage: number; perPage: number; total: number };
};

type SingleEnvelope = { data: BugReportRow; message?: string };

export async function submitBugReport(payload: SubmitBugReportPayload): Promise<BugReportRow> {
  const form = new FormData();
  form.append("title", payload.title);
  form.append("message", payload.message);
  if (payload.severity) form.append("severity", payload.severity);
  if (payload.outletId) form.append("outletId", String(payload.outletId));
  if (payload.currentRoute) form.append("currentRoute", payload.currentRoute);
  if (payload.browser) form.append("browser", payload.browser);
  if (payload.userAgent) form.append("userAgent", payload.userAgent);
  if (payload.viewport) form.append("viewport", payload.viewport);
  if (payload.appVersion) form.append("appVersion", payload.appVersion);
  if (payload.diagnosticsJson) {
    form.append("diagnosticsJson", JSON.stringify(payload.diagnosticsJson));
  }
  if (payload.screenshot) {
    form.append("screenshot", payload.screenshot, "screenshot.webp");
  }

  const token = getApiAccessToken();
  const response = await fetch(`${API_BASE_URL}/bug-reports`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: form,
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      typeof body === "object" && body !== null && "message" in body && typeof body.message === "string"
        ? body.message
        : `Request failed (${response.status})`;
    throw new ApiHttpError(response.status, message, body);
  }
  return (body as SingleEnvelope).data;
}

export async function listBugReports(params: ListBugReportsParams = {}): Promise<ListEnvelope> {
  const qs = new URLSearchParams();
  if (params.outletId) qs.set("outletId", String(params.outletId));
  if (params.status) qs.set("status", params.status);
  if (params.severity) qs.set("severity", params.severity);
  if (params.search) qs.set("search", params.search);
  if (params.page) qs.set("page", String(params.page));
  if (params.limit) qs.set("limit", String(params.limit));
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return apiRequest<ListEnvelope>(`/bug-reports${suffix}`);
}

export async function getBugReport(id: number): Promise<BugReportRow> {
  const res = await apiRequest<SingleEnvelope>(`/bug-reports/${id}`);
  return res.data;
}

export async function updateBugReport(
  id: number,
  payload: { status?: BugReportStatus; severity?: BugReportSeverity; assignedToUserId?: number | null },
): Promise<BugReportRow> {
  const res = await apiRequest<SingleEnvelope>(`/bug-reports/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function addBugReportComment(id: number, comment: string): Promise<BugReportComment> {
  const res = await apiRequest<{ data: BugReportComment }>(`/bug-reports/${id}/comments`, {
    method: "POST",
    body: JSON.stringify({ comment }),
  });
  return res.data;
}

export async function fetchBugReportAttachmentBlob(downloadPath: string): Promise<string | null> {
  const token = getApiAccessToken();
  if (!token) return null;

  const response = await fetch(`${API_BASE_URL}${downloadPath}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) return null;

  const blob = await response.blob();
  return URL.createObjectURL(blob);
}
