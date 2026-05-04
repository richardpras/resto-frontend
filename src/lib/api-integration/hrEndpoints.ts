import { apiRequest as request } from "./client";

type ApiListEnvelope<T> = { data: T[] };

// --- Employees (auth:api) ---

export type EmployeeApiRow = {
  id: number;
  userId?: number | null;
  tenantId?: number | null;
  employeeNo: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  position: string;
  baseSalary: number;
  hireDate?: string | null;
  status: string;
};

export type EmployeeCreatePayload = {
  userId?: number | null;
  tenantId?: number | null;
  employeeNo: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  position: string;
  baseSalary: number;
  hireDate?: string | null;
  status?: "active" | "inactive";
};

export type EmployeeUpdatePayload = EmployeeCreatePayload;

export async function listEmployees(): Promise<EmployeeApiRow[]> {
  const res = await request<ApiListEnvelope<EmployeeApiRow>>("/employees");
  return res.data;
}

export async function getEmployee(id: string | number): Promise<EmployeeApiRow> {
  const res = await request<{ data: EmployeeApiRow }>(`/employees/${id}`);
  return res.data;
}

export async function createEmployee(payload: EmployeeCreatePayload): Promise<EmployeeApiRow> {
  const res = await request<{ data: EmployeeApiRow }>("/employees", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function updateEmployee(id: string | number, payload: EmployeeUpdatePayload): Promise<EmployeeApiRow> {
  const res = await request<{ data: EmployeeApiRow }>(`/employees/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function deleteEmployee(id: string | number): Promise<void> {
  await request<{ message: string }>(`/employees/${id}`, {
    method: "DELETE",
  });
}

// --- Shift templates (auth:api) ---

export type ShiftApiRow = {
  id: number;
  tenantId?: number | null;
  code: string;
  name: string;
  startTime: string;
  endTime: string;
  lateToleranceMinutes: number;
  overtimeAfterMinutes: number;
  active: boolean;
};

export type ShiftCreatePayload = {
  tenantId?: number | null;
  code: string;
  name: string;
  startTime: string;
  endTime: string;
  lateToleranceMinutes?: number;
  overtimeAfterMinutes?: number;
  active?: boolean;
};

export type ShiftUpdatePayload = Partial<ShiftCreatePayload>;

export async function listShifts(): Promise<ShiftApiRow[]> {
  const res = await request<ApiListEnvelope<ShiftApiRow>>("/shifts");
  return res.data;
}

export async function createShift(payload: ShiftCreatePayload): Promise<ShiftApiRow> {
  const res = await request<{ data: ShiftApiRow }>("/shifts", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function updateShift(id: string | number, payload: ShiftUpdatePayload): Promise<ShiftApiRow> {
  const res = await request<{ data: ShiftApiRow }>(`/shifts/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return res.data;
}

// --- Attendance (auth:api) ---

export type AttendanceApiRow = {
  id: number;
  employeeId: number;
  shiftId?: number | null;
  attendanceDate: string;
  checkIn?: string | null;
  checkOut?: string | null;
  source: string;
  status: string;
  syncKey?: string | null;
  notes?: string | null;
  createdAt?: string | null;
};

export type AttendanceSyncPayload = {
  source?: string;
  externalRef: string;
  employeeId: number;
  shiftId?: number | null;
  attendanceDate: string;
  checkIn?: string | null;
  checkOut?: string | null;
  syncKey?: string;
  notes?: string;
};

export type AttendanceManualCorrectionPayload = {
  attendanceDate?: string | null;
  checkIn?: string | null;
  checkOut?: string | null;
  status?: "present" | "late" | "absent";
  notes?: string | null;
  reason: string;
};

export async function listAttendances(params?: { employeeId?: number; attendanceDate?: string }): Promise<AttendanceApiRow[]> {
  const q = new URLSearchParams();
  if (params?.employeeId !== undefined) q.set("employeeId", String(params.employeeId));
  if (params?.attendanceDate) q.set("attendanceDate", params.attendanceDate);
  const suffix = q.toString() ? `?${q.toString()}` : "";
  const res = await request<ApiListEnvelope<AttendanceApiRow>>(`/attendances${suffix}`);
  return res.data;
}

export async function syncAttendance(
  payload: AttendanceSyncPayload,
): Promise<{ duplicate: boolean; data: AttendanceApiRow | null }> {
  const res = await request<{ message: string; duplicate?: boolean; data: AttendanceApiRow | null }>("/attendances/sync", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return { duplicate: !!res.duplicate, data: res.data };
}

export async function manualCorrectAttendance(
  attendanceId: string | number,
  payload: AttendanceManualCorrectionPayload,
): Promise<AttendanceApiRow> {
  const res = await request<{ data: AttendanceApiRow }>(`/attendances/${attendanceId}/manual-correction`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}

// --- Payrolls (auth:api + permission) ---

export type PayrollAttendanceSummaryApi = {
  lateCount: number;
  absentCount: number;
  overtimeMinutes: number;
  derivedAdjustmentAmount: number;
  derivedDeductionAmount: number;
};

export type PayrollApiRow = {
  id: number;
  tenantId?: number | null;
  employeeId: number;
  periodStart: string;
  periodEnd: string;
  baseAmount: number;
  adjustmentAmount: number;
  deductionAmount: number;
  netAmount: number;
  status: string;
  journalId?: number | null;
  adjustments?: unknown;
  attendanceSummary: PayrollAttendanceSummaryApi;
  createdAt?: string | null;
};

export type CreatePayrollPayload = {
  tenantId?: number | null;
  employeeId: number;
  periodStart: string;
  periodEnd: string;
  adjustmentAmount?: number;
  deductionAmount?: number;
  lateDeductionPerCount?: number;
  absentDeductionPerCount?: number;
  overtimeAdjustmentPerMinute?: number;
  adjustments?: Record<string, unknown>;
  cashAccountCode?: string;
  salaryExpenseAccountCode?: string;
};

export async function listPayrolls(): Promise<PayrollApiRow[]> {
  const res = await request<ApiListEnvelope<PayrollApiRow>>("/payrolls");
  return res.data;
}

export async function createPayroll(payload: CreatePayrollPayload): Promise<PayrollApiRow> {
  const res = await request<{ data: PayrollApiRow }>("/payrolls", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}
