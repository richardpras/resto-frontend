import { ApiHttpError } from "./client";

export const ESS_API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, "") ?? "http://127.0.0.1:8000/api/v1";

const ESS_STORAGE_KEY = "resto-ess-auth";

export function getEssAccessToken(): string | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.localStorage.getItem(ESS_STORAGE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as { state?: { accessToken?: string }; accessToken?: string } | null;
    const token = parsed?.state?.accessToken ?? parsed?.accessToken;
    return typeof token === "string" && token.trim() !== "" ? token : undefined;
  } catch {
    return undefined;
  }
}

export function setEssAccessToken(token: string | undefined): void {
  if (typeof window === "undefined") return;
  if (!token) {
    window.localStorage.removeItem(ESS_STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(
    ESS_STORAGE_KEY,
    JSON.stringify({ state: { accessToken: token }, accessToken: token }),
  );
}

async function essRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getEssAccessToken();
  const response = await fetch(`${ESS_API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      typeof body === "object" && body !== null && "message" in body && typeof body.message === "string"
        ? body.message
        : `Request failed (${response.status})`;
    throw new ApiHttpError(response.status, message, body);
  }
  return body as T;
}

export type EssMe = {
  id: number;
  email: string;
  employeeId: number;
  isActive: boolean;
  permissionCodes: string[];
  employee?: { id: number; employeeNo: string; fullName: string; outletId: number } | null;
};

export type EssProfile = {
  employee: { id: number; employeeNo: string; fullName: string; email?: string | null; phone?: string | null; hireDate?: string | null };
  position?: { id?: number; name: string; code?: string | null } | null;
  department?: { id: number; name: string; code?: string | null } | null;
  outlet?: { id: number; name: string; code?: string | null } | null;
  shift?: { id: number; name: string; startTime?: string; endTime?: string } | null;
  employmentStatus: { status: string; hireDate?: string | null; terminationDate?: string | null };
};

export type EssDashboard = {
  employee: EssProfile["employee"];
  todaySchedule?: { rosterDate?: string; shift?: { id: number; name: string; startTime?: string; endTime?: string } | null } | null;
  attendanceSummary: {
    periodStart: string;
    periodEnd: string;
    presentDays: number;
    absentDays: number;
    lateCount: number;
    totalDays: number;
  };
  leaveBalanceSummary: Array<{
    leaveTypeId: number;
    leaveTypeName?: string | null;
    allocatedDays: number;
    usedDays: number;
    remainingDays: number;
  }>;
  upcomingShifts: Array<{ rosterDate?: string; shift?: { id: number; name: string; startTime?: string; endTime?: string } | null }>;
  latestPayslip?: {
    id: number;
    payslipNo: string;
    status: string;
    netSalary: number;
    grossSalary: number;
    publishedAt?: string | null;
    period?: { periodStart?: string; periodEnd?: string } | null;
  } | null;
  notifications: unknown[];
};

export async function essLogin(email: string, password: string): Promise<{ accessToken: string }> {
  const res = await essRequest<{ data: { accessToken: string } }>("/ess/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  setEssAccessToken(res.data.accessToken);
  return { accessToken: res.data.accessToken };
}

export async function essLogout(): Promise<void> {
  try {
    await essRequest<{ message: string }>("/ess/logout", { method: "POST" });
  } finally {
    setEssAccessToken(undefined);
  }
}

export async function essMe(): Promise<EssMe> {
  const res = await essRequest<{ data: EssMe }>("/ess/me");
  return res.data;
}

export async function essProfile(): Promise<EssProfile> {
  const res = await essRequest<{ data: EssProfile }>("/ess/profile");
  return res.data;
}

export async function essDashboard(): Promise<EssDashboard> {
  const res = await essRequest<{ data: EssDashboard }>("/ess/dashboard");
  return res.data;
}
