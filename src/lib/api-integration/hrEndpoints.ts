import { apiRequest as request } from "./client";

type ApiListEnvelope<T> = { data: T[] };

// --- Employees (auth:api) ---

export type EmployeeApiRow = {
  id: number;
  userId?: number | null;
  tenantId?: number | null;
  employeeNo: string;
  name?: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  position: string;
  outlet?: string | null;
  salaryType?: "monthly" | "daily" | "hourly" | null;
  baseSalary: number;
  overtimeRate?: number | null;
  joinDate?: string | null;
  hireDate?: string | null;
  status: string;
};

export type EmployeeCreatePayload = {
  userId?: number | null;
  tenantId?: number | null;
  employeeNo: string;
  name?: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  position: string;
  outlet?: string | null;
  salaryType?: "monthly" | "daily" | "hourly";
  baseSalary: number;
  overtimeRate?: number;
  joinDate?: string | null;
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

export async function deleteShift(id: string | number): Promise<void> {
  await request<{ message: string }>(`/shifts/${id}`, { method: "DELETE" });
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

export type AttendanceCrudPayload = {
  employeeId: number;
  shiftId?: number | null;
  date: string;
  checkIn?: string;
  checkOut?: string;
  status: "present" | "late" | "absent";
  notes?: string;
};

export async function createAttendance(payload: AttendanceCrudPayload): Promise<AttendanceApiRow> {
  const res = await request<{ data: AttendanceApiRow }>("/attendance", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function deleteAttendance(id: string | number): Promise<void> {
  await request<{ message: string }>(`/attendance/${id}`, {
    method: "DELETE",
  });
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

export type PayrollListRow = {
  id: number;
  payrollRunId: number;
  employeeId: number;
  employeeName: string;
  employeeOutlet?: string | null;
  period: string;
  outlet?: string | null;
  status: string;
  basicSalary: number;
  overtimeAmount: number;
  deductionAmount: number;
  netSalary: number;
  paymentStatus?: "unlocked" | "locked";
};

export type PayrollListMeta = {
  currentPage: number;
  perPage: number;
  total: number;
  lastPage: number;
};

export type PayrollListParams = {
  page?: number;
  perPage?: 10 | 25 | 50;
  periodFrom?: string;
  periodTo?: string;
  outlet?: string;
  employeeId?: number;
  status?: "paid" | "unpaid" | "";
  search?: string;
};

export async function listPayrollTable(params?: PayrollListParams): Promise<{ data: PayrollListRow[]; meta: PayrollListMeta }> {
  const q = new URLSearchParams();
  if (params?.page) q.set("page", String(params.page));
  if (params?.perPage) q.set("perPage", String(params.perPage));
  if (params?.periodFrom) q.set("periodFrom", params.periodFrom);
  if (params?.periodTo) q.set("periodTo", params.periodTo);
  if (params?.outlet) q.set("outlet", params.outlet);
  if (params?.employeeId) q.set("employeeId", String(params.employeeId));
  if (params?.status) q.set("status", params.status);
  if (params?.search) q.set("search", params.search);
  const suffix = q.toString() ? `?${q.toString()}` : "";
  return request<{ data: PayrollListRow[]; meta: PayrollListMeta }>(`/payroll${suffix}`);
}

export type PayrollDetail = {
  id: number;
  payrollRunId: number;
  employeeId: number;
  employeeName: string;
  period: string;
  status: string;
  attendanceSummary: {
    lateCount: number;
    absentCount: number;
    overtimeMinutes: number;
  };
  salaryBreakdown: {
    basicSalary: number;
    allowance: number;
    deductions: number;
  };
  earningsBreakdown?: {
    basicSalary: number;
    attendanceAdjustment: number;
    overtimePay: number;
    allowance: number;
    taxableIncome: number;
  };
  deductionBreakdown?: {
    adjustmentDeductions: number;
    loanDeduction: number;
    pph21: number;
    totalDeduction: number;
  };
  netSalary: number;
};

export async function getPayrollDetail(id: number | string): Promise<PayrollDetail> {
  const res = await request<{ data: PayrollDetail }>(`/payroll/${id}`);
  return res.data;
}

export async function generatePayrollRun(payload: { period: string; outlet?: string }): Promise<void> {
  await request<{ message: string; data: unknown }>("/payroll/run", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function markPayrollRunPaid(runId: number | string): Promise<void> {
  await request<{ message: string; data: unknown }>(`/payroll/${runId}/pay`, {
    method: "POST",
  });
}

export async function lockPayrollLine(lineId: number | string): Promise<void> {
  await request<{ message: string; data: unknown }>(`/payroll-lines/${lineId}/lock`, {
    method: "POST",
  });
}

export async function unlockPayrollLine(lineId: number | string): Promise<void> {
  await request<{ message: string; data: unknown }>(`/payroll-lines/${lineId}/unlock`, {
    method: "POST",
  });
}

// --- Overtime (auth:api) ---
export type OvertimeApiRow = {
  id: number;
  employeeId: number;
  date: string;
  hours: number;
  status: "pending" | "approved" | "rejected";
  notes?: string | null;
};

export type OvertimePayload = {
  employeeId: number;
  date: string;
  hours: number;
  status: "pending" | "approved" | "rejected";
  notes?: string;
};

export async function listOvertime(): Promise<OvertimeApiRow[]> {
  const res = await request<ApiListEnvelope<OvertimeApiRow>>("/overtime");
  return res.data;
}

export async function createOvertime(payload: OvertimePayload): Promise<OvertimeApiRow> {
  const res = await request<{ data: OvertimeApiRow }>("/overtime", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function updateOvertime(id: string | number, payload: Partial<OvertimePayload>): Promise<OvertimeApiRow> {
  const res = await request<{ data: OvertimeApiRow }>(`/overtime/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function deleteOvertime(id: string | number): Promise<void> {
  await request<{ message: string }>(`/overtime/${id}`, { method: "DELETE" });
}

// --- Adjustments (auth:api) ---
export type AdjustmentApiRow = {
  id: number;
  employeeId: number;
  type: "allowance" | "deduction";
  category: string;
  amount: number;
  date: string;
  notes?: string | null;
};

export type AdjustmentPayload = {
  employeeId: number;
  type: "allowance" | "deduction";
  category: string;
  amount: number;
  date: string;
  notes?: string;
};

export async function listAdjustments(): Promise<AdjustmentApiRow[]> {
  const res = await request<ApiListEnvelope<AdjustmentApiRow>>("/adjustments");
  return res.data;
}

export async function createAdjustment(payload: AdjustmentPayload): Promise<AdjustmentApiRow> {
  const res = await request<{ data: AdjustmentApiRow }>("/adjustments", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function deleteAdjustment(id: string | number): Promise<void> {
  await request<{ message: string }>(`/adjustments/${id}`, { method: "DELETE" });
}

// --- Loans (auth:api) ---
export type LoanApiRow = {
  id: number;
  employeeId: number;
  amount: number;
  installments: number;
  paidInstallments: number;
  startDate: string;
  notes?: string | null;
  status: "active" | "completed";
};

export type LoanPayload = {
  employeeId: number;
  amount: number;
  installments: number;
  paidInstallments?: number;
  startDate: string;
  notes?: string;
  status: "active" | "completed";
};

export async function listLoans(): Promise<LoanApiRow[]> {
  const res = await request<ApiListEnvelope<LoanApiRow>>("/loans");
  return res.data;
}

export async function createLoan(payload: LoanPayload): Promise<LoanApiRow> {
  const res = await request<{ data: LoanApiRow }>("/loans", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function updateLoan(id: string | number, payload: Partial<LoanPayload>): Promise<LoanApiRow> {
  const res = await request<{ data: LoanApiRow }>(`/loans/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function deleteLoan(id: string | number): Promise<void> {
  await request<{ message: string }>(`/loans/${id}`, { method: "DELETE" });
}
