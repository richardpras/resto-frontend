import { apiRequest as request, API_BASE_URL, ApiHttpError, getApiAccessToken } from "./client";

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
  const res = await request<ApiListEnvelope<EmployeeApiRow>>("/hr/employees");
  return res.data;
}

export async function getEmployee(id: string | number): Promise<EmployeeApiRow> {
  const res = await request<{ data: EmployeeApiRow }>(`/hr/employees/${id}`);
  return res.data;
}

export async function createEmployee(payload: EmployeeCreatePayload): Promise<EmployeeApiRow> {
  const res = await request<{ data: EmployeeApiRow }>("/hr/employees", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function updateEmployee(id: string | number, payload: EmployeeUpdatePayload): Promise<EmployeeApiRow> {
  const res = await request<{ data: EmployeeApiRow }>(`/hr/employees/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function deleteEmployee(id: string | number): Promise<void> {
  await request<{ message: string }>(`/hr/employees/${id}`, {
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

// --- Employee shift assignments (auth:api) ---

export type ShiftAssignmentShiftRef = {
  id: number;
  code: string;
  name: string;
  startTime: string;
  endTime: string;
};

export type ShiftAssignmentEmployeeRef = {
  id: number;
  employeeNo: string;
  fullName: string;
};

export type ShiftAssignmentApiRow = {
  id: number;
  outletId: number;
  employeeId: number;
  shiftId: number;
  effectiveFrom: string;
  effectiveUntil: string | null;
  isActive: boolean;
  notes?: string | null;
  employee?: ShiftAssignmentEmployeeRef | null;
  shift?: ShiftAssignmentShiftRef | null;
};

export type ShiftAssignmentPayload = {
  employeeId: number;
  shiftId: number;
  effectiveFrom: string;
  effectiveUntil?: string | null;
  isActive?: boolean;
  notes?: string | null;
};

export type EmployeeShiftHistoryResponse = {
  current: ShiftAssignmentApiRow | null;
  history: ShiftAssignmentApiRow[];
};

export async function listShiftAssignments(params?: {
  outletId?: number;
  employeeId?: number;
}): Promise<ShiftAssignmentApiRow[]> {
  const qs = new URLSearchParams();
  if (params?.outletId) qs.set("outletId", String(params.outletId));
  if (params?.employeeId) qs.set("employeeId", String(params.employeeId));
  const suffix = qs.toString() ? `?${qs}` : "";
  const res = await request<ApiListEnvelope<ShiftAssignmentApiRow>>(`/shift-assignments${suffix}`);
  return res.data;
}

export async function getShiftAssignment(id: string | number): Promise<ShiftAssignmentApiRow> {
  const res = await request<{ data: ShiftAssignmentApiRow }>(`/shift-assignments/${id}`);
  return res.data;
}

export async function createShiftAssignment(payload: ShiftAssignmentPayload): Promise<ShiftAssignmentApiRow> {
  const res = await request<{ data: ShiftAssignmentApiRow }>("/shift-assignments", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function updateShiftAssignment(
  id: string | number,
  payload: Partial<ShiftAssignmentPayload>,
): Promise<ShiftAssignmentApiRow> {
  const res = await request<{ data: ShiftAssignmentApiRow }>(`/shift-assignments/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function deactivateShiftAssignment(id: string | number): Promise<ShiftAssignmentApiRow> {
  const res = await request<{ data: ShiftAssignmentApiRow }>(`/shift-assignments/${id}/deactivate`, {
    method: "PATCH",
  });
  return res.data;
}

export async function getEmployeeShiftHistory(employeeId: string | number): Promise<EmployeeShiftHistoryResponse> {
  const res = await request<{ data: EmployeeShiftHistoryResponse }>(`/hr/employees/${employeeId}/shift-history`);
  return res.data;
}

// --- Employee rosters / scheduling (auth:api) ---

export type RosterShiftRef = {
  id: number;
  code: string;
  name: string;
  startTime: string;
  endTime: string;
};

export type RosterApiRow = {
  id: number;
  outletId: number;
  employeeId: number;
  shiftId: number | null;
  rosterDate: string;
  status: "draft" | "published";
  notes?: string | null;
  publishedAt?: string | null;
  employee?: { id: number; employeeNo: string; fullName: string; departmentId?: number | null } | null;
  shift?: RosterShiftRef | null;
};

export type RosterListMeta = {
  draftCount: number;
  publishedCount: number;
};

export type RosterPayload = {
  employeeId: number;
  shiftId?: number | null;
  rosterDate: string;
  notes?: string | null;
};

export type EmployeeScheduleDay = {
  date: string;
  dayName: string;
  status?: string | null;
  publishedAt?: string | null;
  shift: RosterShiftRef | null;
  label: string;
};

export type EmployeeScheduleResponse = {
  weekStart: string;
  weekEnd: string;
  days: EmployeeScheduleDay[];
};

export async function listRosters(params: {
  outletId?: number;
  employeeId?: number;
  departmentId?: number;
  status?: string;
  fromDate: string;
  toDate: string;
}): Promise<{ rows: RosterApiRow[]; meta: RosterListMeta }> {
  const qs = new URLSearchParams();
  if (params.outletId) qs.set("outletId", String(params.outletId));
  if (params.employeeId) qs.set("employeeId", String(params.employeeId));
  if (params.departmentId) qs.set("departmentId", String(params.departmentId));
  if (params.status) qs.set("status", params.status);
  qs.set("fromDate", params.fromDate);
  qs.set("toDate", params.toDate);
  const res = await request<{ data: RosterApiRow[]; meta: RosterListMeta }>(`/rosters?${qs}`);
  return { rows: res.data, meta: res.meta };
}

export async function createRoster(payload: RosterPayload): Promise<RosterApiRow> {
  const res = await request<{ data: RosterApiRow }>("/rosters", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function updateRoster(id: number, payload: Partial<RosterPayload>): Promise<RosterApiRow> {
  const res = await request<{ data: RosterApiRow }>(`/rosters/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function deleteRoster(id: number): Promise<void> {
  await request<{ message: string }>(`/rosters/${id}`, { method: "DELETE" });
}

export async function generateRosters(payload: {
  outletId?: number;
  employeeId?: number;
  departmentId?: number;
  fromDate: string;
  toDate: string;
  overwriteExisting?: boolean;
}): Promise<{ created: number; skipped: number; updated: number }> {
  const res = await request<{ data: { created: number; skipped: number; updated: number } }>("/rosters/generate", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function copyRosters(payload: {
  outletId?: number;
  employeeId?: number;
  sourceFrom: string;
  sourceTo: string;
  destFrom: string;
  destTo: string;
}): Promise<{ copied: number; skipped: number }> {
  const res = await request<{ data: { copied: number; skipped: number } }>("/rosters/copy", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function publishRosters(payload: {
  outletId?: number;
  employeeId?: number;
  fromDate?: string;
  toDate?: string;
}): Promise<{ published: number }> {
  const res = await request<{ data: { published: number } }>("/rosters/publish", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function getEmployeeSchedule(
  employeeId: string | number,
  weekStart?: string,
): Promise<EmployeeScheduleResponse> {
  const qs = weekStart ? `?weekStart=${weekStart}` : "";
  const res = await request<{ data: EmployeeScheduleResponse }>(`/hr/employees/${employeeId}/schedule${qs}`);
  return res.data;
}

// --- Attendance records (ATTENDANCE-01, auth:api) ---

export type AttendanceRecordStatus =
  | "present"
  | "late"
  | "early_leave"
  | "absent"
  | "incomplete";

export type AttendanceRecordSource = "fingerprint" | "csv_import" | "manual";

export type AttendanceRecordApiRow = {
  id: number;
  outletId: number;
  employeeId: number;
  rosterId?: number | null;
  shiftId?: number | null;
  attendanceDate: string;
  date: string;
  clockIn?: string | null;
  clockOut?: string | null;
  workedMinutes?: number | null;
  workedHours?: number | null;
  status: AttendanceRecordStatus;
  source: AttendanceRecordSource;
  notes?: string | null;
  importBatchId?: number | null;
  updatedBy?: number | null;
  updatedAt?: string | null;
  employee?: { id: number; employeeNo: string; fullName: string } | null;
  shift?: { id: number; name: string; startTime: string; endTime: string } | null;
};

export type AttendanceImportPreviewRow = {
  employeeCode: string;
  employeeName: string;
  date: string;
  clockIn?: string | null;
  clockOut?: string | null;
  status: string;
  shiftName?: string | null;
};

export type AttendanceImportBatchRow = {
  id: number;
  outletId: number;
  filename: string;
  importedRows: number;
  importedAt: string;
  createdBy?: number | null;
};

export async function listAttendanceRecords(params?: {
  outletId?: number;
  employeeId?: number;
  departmentId?: number;
  status?: string;
  fromDate?: string;
  toDate?: string;
}): Promise<AttendanceRecordApiRow[]> {
  const qs = new URLSearchParams();
  if (params?.outletId) qs.set("outletId", String(params.outletId));
  if (params?.employeeId) qs.set("employeeId", String(params.employeeId));
  if (params?.departmentId) qs.set("departmentId", String(params.departmentId));
  if (params?.status) qs.set("status", params.status);
  if (params?.fromDate) qs.set("fromDate", params.fromDate);
  if (params?.toDate) qs.set("toDate", params.toDate);
  const suffix = qs.toString() ? `?${qs}` : "";
  const res = await request<ApiListEnvelope<AttendanceRecordApiRow>>(`/attendance${suffix}`);
  return res.data;
}

export async function getAttendanceRecord(id: number | string): Promise<AttendanceRecordApiRow> {
  const res = await request<{ data: AttendanceRecordApiRow }>(`/attendance/${id}`);
  return res.data;
}

export async function patchAttendanceRecord(
  id: number | string,
  payload: { clockIn?: string | null; clockOut?: string | null; notes?: string | null },
): Promise<AttendanceRecordApiRow> {
  const res = await request<{ data: AttendanceRecordApiRow }>(`/attendance/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function importAttendanceCsv(payload: {
  outletId: number;
  csv: string;
  filename?: string;
  employeeCodeColumn?: string;
  timestampColumn?: string;
  preview?: boolean;
  dryRun?: boolean;
  overwriteExisting?: boolean;
}): Promise<{
  preview: AttendanceImportPreviewRow[];
  created: number;
  skipped: number;
  batch: AttendanceImportBatchRow | null;
}> {
  const res = await request<{
    data: {
      preview: AttendanceImportPreviewRow[];
      created: number;
      skipped: number;
      batch: AttendanceImportBatchRow | null;
    };
  }>("/attendance/import", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function listAttendanceImportBatches(outletId?: number): Promise<AttendanceImportBatchRow[]> {
  const qs = outletId ? `?outletId=${outletId}` : "";
  const res = await request<ApiListEnvelope<AttendanceImportBatchRow>>(`/attendance/import-batches${qs}`);
  return res.data;
}

export async function getEmployeeAttendance(
  employeeId: string | number,
  limit = 30,
): Promise<AttendanceRecordApiRow[]> {
  const res = await request<ApiListEnvelope<AttendanceRecordApiRow>>(
    `/hr/employees/${employeeId}/attendance?limit=${limit}`,
  );
  return res.data;
}

// --- Attendance daily summaries (ATTENDANCE-02, auth:api) ---

export type AttendanceSummaryStatus =
  | "present"
  | "late"
  | "early_leave"
  | "absent"
  | "incomplete"
  | "review_required";

export type AttendanceReviewType = "approved" | "corrected" | "excused_absence" | "ignored";

export type AttendanceDailySummaryRow = {
  id: number;
  outletId: number;
  employeeId: number;
  attendanceDate: string;
  scheduledStart?: string | null;
  scheduledEnd?: string | null;
  clockIn?: string | null;
  clockOut?: string | null;
  workedMinutes?: number | null;
  workedHours?: number | null;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  isAbsent: boolean;
  isIncomplete: boolean;
  requiresReview: boolean;
  attendanceStatus: AttendanceSummaryStatus;
  employee?: { id: number; employeeNo: string; fullName: string } | null;
  shift?: { id: number; name: string; startTime: string; endTime: string } | null;
};

export type AttendancePayrollPrepRow = {
  employeeId: number;
  employeeNo?: string;
  fullName?: string;
  outletId: number;
  attendanceDays: number;
  absentDays: number;
  lateCount: number;
  lateMinutes: number;
  earlyLeaveCount: number;
  workedMinutes: number;
  overtimeMinutes: number;
  overtimeHours: number;
};

export async function listAttendanceSummaries(params?: {
  outletId?: number;
  employeeId?: number;
  status?: string;
  fromDate?: string;
  toDate?: string;
}): Promise<AttendanceDailySummaryRow[]> {
  const qs = new URLSearchParams();
  if (params?.outletId) qs.set("outletId", String(params.outletId));
  if (params?.employeeId) qs.set("employeeId", String(params.employeeId));
  if (params?.status) qs.set("status", params.status);
  if (params?.fromDate) qs.set("fromDate", params.fromDate);
  if (params?.toDate) qs.set("toDate", params.toDate);
  const suffix = qs.toString() ? `?${qs}` : "";
  const res = await request<ApiListEnvelope<AttendanceDailySummaryRow>>(`/attendance/summaries${suffix}`);
  return res.data;
}

export async function getAttendanceSummary(id: number | string): Promise<AttendanceDailySummaryRow> {
  const res = await request<{ data: AttendanceDailySummaryRow }>(`/attendance/summaries/${id}`);
  return res.data;
}

export async function reviewAttendanceSummary(
  id: number | string,
  payload: { reviewType: AttendanceReviewType; notes?: string },
): Promise<AttendanceDailySummaryRow> {
  const res = await request<{ data: AttendanceDailySummaryRow }>(`/attendance/summaries/${id}/review`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export type AttendancePeriodStatus = "draft" | "approved" | "locked";

export type AttendancePeriodLockRow = {
  id: number;
  outletId: number;
  periodStart: string;
  periodEnd: string;
  periodLabel?: string;
  status: AttendancePeriodStatus;
  approvedBy?: number | null;
  approvedAt?: string | null;
  lockedBy?: number | null;
  lockedAt?: string | null;
  notes?: string | null;
  employeeCount?: number;
};

export type AttendancePayrollPrepMeta = {
  lockStatus: AttendancePeriodStatus | null;
  approvedAt: string | null;
  lockedAt: string | null;
  periodId: number | null;
};

export async function listAttendancePeriods(outletId?: number): Promise<AttendancePeriodLockRow[]> {
  const qs = outletId ? `?outletId=${outletId}` : "";
  const res = await request<ApiListEnvelope<AttendancePeriodLockRow>>(`/attendance/periods${qs}`);
  return res.data;
}

export async function createAttendancePeriod(payload: {
  outletId: number;
  periodStart: string;
  periodEnd: string;
  notes?: string;
}): Promise<AttendancePeriodLockRow> {
  const res = await request<{ data: AttendancePeriodLockRow }>("/attendance/periods", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function approveAttendancePeriod(id: number): Promise<AttendancePeriodLockRow> {
  const res = await request<{ data: AttendancePeriodLockRow }>(`/attendance/periods/${id}/approve`, {
    method: "PATCH",
  });
  return res.data;
}

export async function lockAttendancePeriod(id: number): Promise<AttendancePeriodLockRow> {
  const res = await request<{ data: AttendancePeriodLockRow }>(`/attendance/periods/${id}/lock`, {
    method: "PATCH",
  });
  return res.data;
}

export async function reopenAttendancePeriod(id: number): Promise<AttendancePeriodLockRow> {
  const res = await request<{ data: AttendancePeriodLockRow }>(`/attendance/periods/${id}/reopen`, {
    method: "PATCH",
  });
  return res.data;
}

export async function getAttendancePayrollPreparation(params: {
  outletId?: number;
  periodStart: string;
  periodEnd: string;
}): Promise<{ meta: AttendancePayrollPrepMeta; employees: AttendancePayrollPrepRow[] }> {
  const qs = new URLSearchParams();
  if (params.outletId) qs.set("outletId", String(params.outletId));
  qs.set("periodStart", params.periodStart);
  qs.set("periodEnd", params.periodEnd);
  const res = await request<{
    meta: AttendancePayrollPrepMeta;
    data: AttendancePayrollPrepRow[];
  }>(`/attendance/payroll-preparation?${qs}`);
  return { meta: res.meta, employees: res.data };
}

// --- Leave management (LEAVE-01, auth:api) ---

export type LeaveRequestStatus = "pending" | "approved" | "rejected" | "cancelled";

export type LeaveTypeRow = {
  id: number;
  outletId: number;
  code: string;
  name: string;
  requiresAttachment: boolean;
  deductLeaveBalance: boolean;
  paidLeave: boolean;
  isActive: boolean;
};

export type LeaveRequestRow = {
  id: number;
  outletId: number;
  employeeId: number;
  leaveTypeId: number;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason?: string | null;
  attachmentPath?: string | null;
  status: LeaveRequestStatus;
  employee?: { id: number; employeeNo: string; fullName: string } | null;
  leaveType?: { id: number; code: string; name: string } | null;
};

export type EmployeeLeaveBalanceRow = {
  id: number;
  employeeId: number;
  leaveTypeId: number;
  allocatedDays: number;
  usedDays: number;
  remainingDays: number;
  leaveType?: { id: number; code: string; name: string; deductLeaveBalance?: boolean } | null;
};

export async function listLeaveTypes(outletId?: number): Promise<LeaveTypeRow[]> {
  const qs = outletId ? `?outletId=${outletId}` : "";
  const res = await request<ApiListEnvelope<LeaveTypeRow>>(`/leave-types${qs}`);
  return res.data;
}

export async function createLeaveType(payload: {
  outletId: number;
  code: string;
  name: string;
  requiresAttachment?: boolean;
  deductLeaveBalance?: boolean;
  paidLeave?: boolean;
  isActive?: boolean;
}): Promise<LeaveTypeRow> {
  const res = await request<{ data: LeaveTypeRow }>("/leave-types", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function updateLeaveType(id: number, payload: Partial<LeaveTypeRow>): Promise<LeaveTypeRow> {
  const res = await request<{ data: LeaveTypeRow }>(`/leave-types/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function listLeaveRequests(params?: {
  outletId?: number;
  employeeId?: number;
  status?: string;
}): Promise<LeaveRequestRow[]> {
  const qs = new URLSearchParams();
  if (params?.outletId) qs.set("outletId", String(params.outletId));
  if (params?.employeeId) qs.set("employeeId", String(params.employeeId));
  if (params?.status) qs.set("status", params.status);
  const suffix = qs.toString() ? `?${qs}` : "";
  const res = await request<ApiListEnvelope<LeaveRequestRow>>(`/leave-requests${suffix}`);
  return res.data;
}

export async function createLeaveRequest(payload: {
  employeeId: number;
  leaveTypeId: number;
  startDate: string;
  endDate: string;
  reason?: string;
  attachmentPath?: string;
}): Promise<LeaveRequestRow> {
  const res = await request<{ data: LeaveRequestRow }>("/leave-requests", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function approveLeaveRequest(id: number): Promise<LeaveRequestRow> {
  const res = await request<{ data: LeaveRequestRow }>(`/leave-requests/${id}/approve`, { method: "PATCH" });
  return res.data;
}

export async function rejectLeaveRequest(id: number, rejectionReason?: string): Promise<LeaveRequestRow> {
  const res = await request<{ data: LeaveRequestRow }>(`/leave-requests/${id}/reject`, {
    method: "PATCH",
    body: JSON.stringify({ rejectionReason }),
  });
  return res.data;
}

export async function cancelLeaveRequest(id: number): Promise<LeaveRequestRow> {
  const res = await request<{ data: LeaveRequestRow }>(`/leave-requests/${id}/cancel`, { method: "PATCH" });
  return res.data;
}

export async function listEmployeeLeaveBalances(employeeId: number): Promise<EmployeeLeaveBalanceRow[]> {
  const res = await request<ApiListEnvelope<EmployeeLeaveBalanceRow>>(`/employees/${employeeId}/leave-balances`);
  return res.data;
}

export async function updateEmployeeLeaveBalances(
  employeeId: number,
  balances: { leaveTypeId: number; allocatedDays: number }[],
): Promise<EmployeeLeaveBalanceRow[]> {
  const res = await request<{ data: EmployeeLeaveBalanceRow[] }>(`/employees/${employeeId}/leave-balances`, {
    method: "PATCH",
    body: JSON.stringify({ balances }),
  });
  return res.data;
}

// --- Overtime management (OVERTIME-01, auth:api) ---

export type OvertimeRequestStatus = "pending" | "approved" | "rejected" | "cancelled";

export type OvertimeTypeRow = {
  id: number;
  outletId: number;
  code: string;
  name: string;
  multiplier: number;
  isActive: boolean;
};

export type OvertimeRequestRow = {
  id: number;
  outletId: number;
  employeeId: number;
  overtimeTypeId: number;
  overtimeDate: string;
  startTime: string;
  endTime: string;
  totalMinutes: number;
  totalHours: number;
  reason?: string | null;
  status: OvertimeRequestStatus;
  employee?: { id: number; employeeNo: string; fullName: string } | null;
  overtimeType?: { id: number; code: string; name: string; multiplier: number } | null;
};

export type OvertimeDailySummaryRow = {
  id: number;
  employeeId: number;
  overtimeDate: string;
  approvedMinutes: number;
  approvedHours: number;
  requestCount: number;
  employee?: { id: number; employeeNo: string; fullName: string } | null;
};

export async function listOvertimeTypes(outletId?: number): Promise<OvertimeTypeRow[]> {
  const qs = outletId ? `?outletId=${outletId}` : "";
  const res = await request<ApiListEnvelope<OvertimeTypeRow>>(`/overtime-types${qs}`);
  return res.data;
}

export async function createOvertimeType(payload: {
  outletId: number;
  code: string;
  name: string;
  multiplier?: number;
  isActive?: boolean;
}): Promise<OvertimeTypeRow> {
  const res = await request<{ data: OvertimeTypeRow }>("/overtime-types", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function updateOvertimeType(id: number, payload: Partial<OvertimeTypeRow>): Promise<OvertimeTypeRow> {
  const res = await request<{ data: OvertimeTypeRow }>(`/overtime-types/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function listOvertimeRequests(params?: {
  outletId?: number;
  employeeId?: number;
  status?: string;
}): Promise<OvertimeRequestRow[]> {
  const qs = new URLSearchParams();
  if (params?.outletId) qs.set("outletId", String(params.outletId));
  if (params?.employeeId) qs.set("employeeId", String(params.employeeId));
  if (params?.status) qs.set("status", params.status);
  const suffix = qs.toString() ? `?${qs}` : "";
  const res = await request<ApiListEnvelope<OvertimeRequestRow>>(`/overtime-requests${suffix}`);
  return res.data;
}

export async function createOvertimeRequest(payload: {
  employeeId: number;
  overtimeTypeId: number;
  overtimeDate: string;
  startTime: string;
  endTime: string;
  reason?: string;
}): Promise<OvertimeRequestRow> {
  const res = await request<{ data: OvertimeRequestRow }>("/overtime-requests", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function approveOvertimeRequest(id: number): Promise<OvertimeRequestRow> {
  const res = await request<{ data: OvertimeRequestRow }>(`/overtime-requests/${id}/approve`, { method: "PATCH" });
  return res.data;
}

export async function rejectOvertimeRequest(id: number, rejectionReason?: string): Promise<OvertimeRequestRow> {
  const res = await request<{ data: OvertimeRequestRow }>(`/overtime-requests/${id}/reject`, {
    method: "PATCH",
    body: JSON.stringify({ rejectionReason }),
  });
  return res.data;
}

export async function cancelOvertimeRequest(id: number): Promise<OvertimeRequestRow> {
  const res = await request<{ data: OvertimeRequestRow }>(`/overtime-requests/${id}/cancel`, { method: "PATCH" });
  return res.data;
}

export async function listOvertimeSummaries(params?: {
  outletId?: number;
  employeeId?: number;
  fromDate?: string;
  toDate?: string;
}): Promise<OvertimeDailySummaryRow[]> {
  const qs = new URLSearchParams();
  if (params?.outletId) qs.set("outletId", String(params.outletId));
  if (params?.employeeId) qs.set("employeeId", String(params.employeeId));
  if (params?.fromDate) qs.set("fromDate", params.fromDate);
  if (params?.toDate) qs.set("toDate", params.toDate);
  const suffix = qs.toString() ? `?${qs}` : "";
  const res = await request<ApiListEnvelope<OvertimeDailySummaryRow>>(`/overtime-summaries${suffix}`);
  return res.data;
}

// --- Payroll preparation (PAYROLL-PREP-01, auth:api) ---

export type PayrollPreparationPeriodStatus = "draft" | "approved" | "locked";

export type PayrollPreparationPeriodRow = {
  id: number;
  outletId: number;
  periodStart: string;
  periodEnd: string;
  periodLabel?: string;
  status: PayrollPreparationPeriodStatus;
  approvedAt?: string | null;
  lockedAt?: string | null;
  generatedAt?: string | null;
  employeeCount?: number;
};

export type PayrollPreparationSnapshotRow = {
  id: number;
  preparationPeriodId: number;
  employeeId: number;
  scheduledDays: number;
  attendedDays: number;
  absentDays: number;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  leaveDays: number;
  paidLeaveDays: number;
  unpaidLeaveDays: number;
  overtimeMinutes: number;
  overtimeHours: number;
  reviewRequired: boolean;
  employee?: { id: number; employeeNo: string; fullName: string } | null;
};

export type PayrollPreparationSummaryRow = {
  periodId: number;
  outletId: number;
  periodStart: string;
  periodEnd: string;
  status: PayrollPreparationPeriodStatus;
  generatedAt?: string | null;
  employeeCount: number;
  attendanceDays: number;
  leaveDays: number;
  overtimeHours: number;
  reviewRequiredCount: number;
};

export async function listPayrollPreparationPeriods(outletId?: number): Promise<PayrollPreparationPeriodRow[]> {
  const qs = outletId ? `?outletId=${outletId}` : "";
  const res = await request<ApiListEnvelope<PayrollPreparationPeriodRow>>(`/payroll-preparation-periods${qs}`);
  return res.data;
}

export async function createPayrollPreparationPeriod(payload: {
  outletId: number;
  periodStart: string;
  periodEnd: string;
}): Promise<PayrollPreparationPeriodRow> {
  const res = await request<{ data: PayrollPreparationPeriodRow }>("/payroll-preparation-periods", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function generatePayrollPreparationSnapshot(periodId: number): Promise<PayrollPreparationPeriodRow> {
  const res = await request<{ data: PayrollPreparationPeriodRow }>(`/payroll-preparation-periods/${periodId}/generate`, {
    method: "POST",
  });
  return res.data;
}

export async function approvePayrollPreparationPeriod(periodId: number): Promise<PayrollPreparationPeriodRow> {
  const res = await request<{ data: PayrollPreparationPeriodRow }>(`/payroll-preparation-periods/${periodId}/approve`, {
    method: "PATCH",
  });
  return res.data;
}

export async function lockPayrollPreparationPeriod(periodId: number): Promise<PayrollPreparationPeriodRow> {
  const res = await request<{ data: PayrollPreparationPeriodRow }>(`/payroll-preparation-periods/${periodId}/lock`, {
    method: "PATCH",
  });
  return res.data;
}

export async function listPayrollPreparationSnapshots(periodId: number): Promise<PayrollPreparationSnapshotRow[]> {
  const res = await request<ApiListEnvelope<PayrollPreparationSnapshotRow>>(
    `/payroll-preparation-periods/${periodId}/snapshots`,
  );
  return res.data;
}

export async function getPayrollPreparationSummary(periodId: number): Promise<PayrollPreparationSummaryRow> {
  const res = await request<{ data: PayrollPreparationSummaryRow }>(
    `/payroll-preparation-periods/${periodId}/summary`,
  );
  return res.data;
}

// --- Payroll engine v2 (PAYROLL-ENGINE-01, auth:api) ---

export type PayrollRunV2Status =
  | "draft"
  | "calculated"
  | "approved"
  | "finalized"
  | "processing_payment"
  | "paid"
  | "closed";

export type PayrollPaymentStatus = "pending" | "processing" | "paid";

export type OvertimeRateType = "fixed_hourly" | "multiplier_hourly_salary";

export type EmployeeSalaryProfileRow = {
  id: number;
  employeeId: number;
  basicSalary: number;
  defaultAllowance: number;
  defaultDeduction: number;
  overtimeRateType: OvertimeRateType;
  overtimeRateValue: number;
  unpaidLeaveDeductionEnabled: boolean;
  attendanceDeductionEnabled: boolean;
  attendanceDeductionPerDay?: number | null;
  employee?: { id: number; employeeNo: string; fullName: string; outletId: number } | null;
};

export type PayrollRunV2Row = {
  id: number;
  outletId: number;
  payrollPreparationPeriodId: number;
  status: PayrollRunV2Status;
  paymentStatus?: PayrollPaymentStatus;
  approvedAt?: string | null;
  finalizedAt?: string | null;
  paidAt?: string | null;
  closedAt?: string | null;
  closedNotes?: string | null;
  isClosed?: boolean;
  itemCount?: number;
  preparationPeriod?: {
    id: number;
    periodStart: string;
    periodEnd: string;
    status: string;
  } | null;
};

export type PayrollRunAuditRow = {
  id: number;
  payrollRunId: number;
  action: string;
  performedBy?: { id: number; name: string } | null;
  notes?: string | null;
  createdAt?: string | null;
};

export type PayrollClosingSummaryTotals = {
  employeeCount: number;
  grossPayroll: number;
  netPayroll: number;
  totalBPJS: number;
  totalBpjsEmployee?: number;
  totalBpjsEmployer?: number;
  totalPPh21: number;
  totalLoans: number;
  totalCashAdvance: number;
  totalReimbursement: number;
  totalAdjustments: number;
  totalAdjustmentEarning?: number;
  totalAdjustmentDeduction?: number;
  paymentStatus?: PayrollPaymentStatus;
  closedStatus: "closed" | "open";
};

export type PayrollClosingSummary = {
  run: {
    id: number;
    status: PayrollRunV2Status;
    paymentStatus: PayrollPaymentStatus;
    closedStatus: "closed" | "open";
    paidAt?: string | null;
    closedAt?: string | null;
  };
  totals: PayrollClosingSummaryTotals;
  auditTrail: PayrollRunAuditRow[];
};

export type PayrollRunItemV2Row = {
  id: number;
  payrollRunId: number;
  employeeId: number;
  basicSalary: number;
  attendanceDays: number;
  absentDays: number;
  leaveDays: number;
  unpaidLeaveDays: number;
  overtimeHours: number;
  overtimePay: number;
  unpaidLeaveDeduction: number;
  attendanceDeduction: number;
  loanDeduction: number;
  remainingLoanBalance: number;
  cashAdvanceDeduction: number;
  remainingCashAdvanceBalance: number;
  adjustmentEarning: number;
  adjustmentDeduction: number;
  taxableIncome?: number;
  annualTaxableIncome?: number;
  annualPkp?: number;
  pph21Amount?: number;
  reimbursementEarning?: number;
  remainingReimbursement?: number;
  grossSalary: number;
  totalDeductions: number;
  netSalary: number;
  calculationJson?: Record<string, unknown> | null;
  employee?: { id: number; employeeNo: string; fullName: string } | null;
};

export type PayrollRunItemsV2Meta = {
  totalOvertimePay: number;
  totalUnpaidLeaveDeduction: number;
  totalAttendanceDeduction: number;
  totalLoanDeduction: number;
  totalCashAdvanceDeduction: number;
  totalAdjustmentEarning: number;
  totalAdjustmentDeduction: number;
  totalBpjsEmployeeDeduction?: number;
  totalBpjsEmployerCost?: number;
  totalPph21?: number;
  totalTaxableIncome?: number;
  totalReimbursements?: number;
  totalBonus: number;
  totalIncentive: number;
  totalGrossSalary: number;
  totalNetSalary: number;
};

export async function listSalaryProfiles(params?: {
  outletId?: number;
  employeeId?: number;
}): Promise<EmployeeSalaryProfileRow[]> {
  const qs = new URLSearchParams();
  if (params?.outletId) qs.set("outletId", String(params.outletId));
  if (params?.employeeId) qs.set("employeeId", String(params.employeeId));
  const suffix = qs.toString() ? `?${qs}` : "";
  const res = await request<ApiListEnvelope<EmployeeSalaryProfileRow>>(`/salary-profiles${suffix}`);
  return res.data;
}

export async function createSalaryProfile(payload: {
  employeeId: number;
  basicSalary: number;
  defaultAllowance?: number;
  defaultDeduction?: number;
  overtimeRateType?: OvertimeRateType;
  overtimeRateValue?: number;
  unpaidLeaveDeductionEnabled?: boolean;
  attendanceDeductionEnabled?: boolean;
  attendanceDeductionPerDay?: number;
}): Promise<EmployeeSalaryProfileRow> {
  const res = await request<{ data: EmployeeSalaryProfileRow }>("/salary-profiles", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function updateSalaryProfile(
  id: number,
  payload: Partial<
    Pick<
      EmployeeSalaryProfileRow,
      | "basicSalary"
      | "defaultAllowance"
      | "defaultDeduction"
      | "overtimeRateType"
      | "overtimeRateValue"
      | "unpaidLeaveDeductionEnabled"
      | "attendanceDeductionEnabled"
      | "attendanceDeductionPerDay"
    >
  >,
): Promise<EmployeeSalaryProfileRow> {
  const res = await request<{ data: EmployeeSalaryProfileRow }>(`/salary-profiles/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function listPayrollRunsV2(outletId?: number): Promise<PayrollRunV2Row[]> {
  const qs = outletId ? `?outletId=${outletId}` : "";
  const res = await request<ApiListEnvelope<PayrollRunV2Row>>(`/payroll-runs-v2${qs}`);
  return res.data;
}

export async function createPayrollRunV2(payrollPreparationPeriodId: number): Promise<PayrollRunV2Row> {
  const res = await request<{ data: PayrollRunV2Row }>("/payroll-runs-v2", {
    method: "POST",
    body: JSON.stringify({ payrollPreparationPeriodId }),
  });
  return res.data;
}

export async function calculatePayrollRunV2(runId: number): Promise<PayrollRunV2Row> {
  const res = await request<{ data: PayrollRunV2Row }>(`/payroll-runs-v2/${runId}/calculate`, { method: "PATCH" });
  return res.data;
}

export async function approvePayrollRunV2(runId: number): Promise<PayrollRunV2Row> {
  const res = await request<{ data: PayrollRunV2Row }>(`/payroll-runs-v2/${runId}/approve`, { method: "PATCH" });
  return res.data;
}

export async function finalizePayrollRunV2(runId: number): Promise<PayrollRunV2Row> {
  const res = await request<{ data: PayrollRunV2Row }>(`/payroll-runs-v2/${runId}/finalize`, { method: "PATCH" });
  return res.data;
}

export async function listPayrollRunItemsV2(
  runId: number,
): Promise<{ items: PayrollRunItemV2Row[]; meta: PayrollRunItemsV2Meta }> {
  const res = await request<ApiListEnvelope<PayrollRunItemV2Row> & { meta: PayrollRunItemsV2Meta }>(
    `/payroll-runs-v2/${runId}/items`,
  );
  return { items: res.data, meta: res.meta };
}

export async function getPayrollClosingSummary(runId: number): Promise<PayrollClosingSummary> {
  const res = await request<{ data: PayrollClosingSummary }>(`/payroll-runs-v2/${runId}/closing-summary`);
  return res.data;
}

export async function listPayrollRunAudit(runId: number): Promise<PayrollRunAuditRow[]> {
  const res = await request<ApiListEnvelope<PayrollRunAuditRow>>(`/payroll-runs-v2/${runId}/audit`);
  return res.data;
}

export async function startPayrollPayment(runId: number): Promise<PayrollRunV2Row> {
  const res = await request<{ data: PayrollRunV2Row }>(`/payroll-runs-v2/${runId}/start-payment`, { method: "POST" });
  return res.data;
}

export async function markPayrollRunPaid(runId: number, paidAt?: string): Promise<PayrollRunV2Row> {
  const res = await request<{ data: PayrollRunV2Row }>(`/payroll-runs-v2/${runId}/mark-paid`, {
    method: "POST",
    body: JSON.stringify(paidAt ? { paidAt } : {}),
  });
  return res.data;
}

export async function closePayrollRun(runId: number, notes?: string): Promise<PayrollRunV2Row> {
  const res = await request<{ data: PayrollRunV2Row }>(`/payroll-runs-v2/${runId}/close`, {
    method: "POST",
    body: JSON.stringify(notes ? { notes } : {}),
  });
  return res.data;
}

export async function reopenPayrollRun(runId: number): Promise<PayrollRunV2Row> {
  const res = await request<{ data: PayrollRunV2Row }>(`/payroll-runs-v2/${runId}/reopen`, { method: "POST" });
  return res.data;
}

// --- Payroll posting (HRM PAYROLL-POSTING-01) ---

export type PayrollPostingStatus = "draft" | "posted" | "reversed";

export type PayrollPostingPreviewLine = {
  accountId: number;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  memo: string;
};

export type PayrollPostingPreview = {
  payrollRunId: number;
  lines: PayrollPostingPreviewLine[];
  totals: {
    debit: number;
    credit: number;
    grossPayroll: number;
    employerBpjs: number;
    netPayroll: number;
  };
  balanced: boolean;
  postingStatus: PayrollPostingStatus;
};

export type PayrollPostingRow = {
  id: number;
  payrollRunId: number;
  journalEntryId?: number | null;
  postingStatus: PayrollPostingStatus;
  postedAt?: string | null;
  reversedAt?: string | null;
  notes?: string | null;
  journal?: {
    id: number;
    journalNo: string;
    status: string;
    journalDate?: string | null;
  } | null;
};

export async function getPayrollPostingPreview(runId: number): Promise<PayrollPostingPreview> {
  const res = await request<{ data: PayrollPostingPreview }>(`/payroll-runs-v2/${runId}/posting-preview`);
  return res.data;
}

export async function getPayrollPostingStatus(runId: number): Promise<PayrollPostingRow | null> {
  const res = await request<{ data: PayrollPostingRow | null }>(`/payroll-runs-v2/${runId}/posting`);
  return res.data;
}

export async function postPayrollToAccounting(runId: number): Promise<PayrollPostingRow> {
  const res = await request<{ data: PayrollPostingRow }>(`/payroll-runs-v2/${runId}/post`, { method: "POST" });
  return res.data;
}

export async function reversePayrollPosting(runId: number, notes?: string): Promise<PayrollPostingRow> {
  const res = await request<{ data: PayrollPostingRow }>(`/payroll-runs-v2/${runId}/reverse-posting`, {
    method: "POST",
    body: JSON.stringify(notes ? { notes } : {}),
  });
  return res.data;
}

export async function listLockedPayrollPreparationPeriods(outletId: number): Promise<PayrollPreparationPeriodRow[]> {
  const rows = await listPayrollPreparationPeriods(outletId);
  return rows.filter((p) => p.status === "locked");
}

// --- Employee loans (HRM LOAN-01) ---

export type EmployeeLoanRow = {
  id: number;
  outletId: number;
  employeeId: number;
  loanNo: string;
  principalAmount: number;
  installmentAmount: number;
  totalInstallments: number;
  paidInstallments: number;
  remainingBalance: number;
  status: string;
  approvedBy?: number | null;
  approvedAt?: string | null;
  employee?: { id: number; employeeNo: string; fullName: string } | null;
  installments?: EmployeeLoanInstallmentRow[] | null;
};

export type EmployeeLoanInstallmentRow = {
  id: number;
  loanId: number;
  installmentNo: number;
  dueDate: string;
  amount: number;
  status: string;
  payrollRunItemId?: number | null;
};

export type EmployeeLoanCreatePayload = {
  employeeId: number;
  principalAmount: number;
  installmentAmount: number;
  totalInstallments: number;
};

export async function listEmployeeLoans(params?: {
  outletId?: number;
  employeeId?: number;
  status?: string;
}): Promise<EmployeeLoanRow[]> {
  const qs = new URLSearchParams();
  if (params?.outletId) qs.set("outletId", String(params.outletId));
  if (params?.employeeId) qs.set("employeeId", String(params.employeeId));
  if (params?.status) qs.set("status", params.status);
  const suffix = qs.toString() ? `?${qs}` : "";
  const res = await request<ApiListEnvelope<EmployeeLoanRow>>(`/employee-loans${suffix}`);
  return res.data;
}

export async function createEmployeeLoan(payload: EmployeeLoanCreatePayload): Promise<EmployeeLoanRow> {
  const res = await request<{ data: EmployeeLoanRow }>("/employee-loans", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function updateEmployeeLoan(
  id: number,
  payload: Partial<EmployeeLoanCreatePayload>,
): Promise<EmployeeLoanRow> {
  const res = await request<{ data: EmployeeLoanRow }>(`/employee-loans/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function approveEmployeeLoan(id: number): Promise<EmployeeLoanRow> {
  const res = await request<{ data: EmployeeLoanRow }>(`/employee-loans/${id}/approve`, { method: "PATCH" });
  return res.data;
}

export async function activateEmployeeLoan(id: number): Promise<EmployeeLoanRow> {
  const res = await request<{ data: EmployeeLoanRow }>(`/employee-loans/${id}/activate`, { method: "PATCH" });
  return res.data;
}

export async function cancelEmployeeLoan(id: number): Promise<EmployeeLoanRow> {
  const res = await request<{ data: EmployeeLoanRow }>(`/employee-loans/${id}/cancel`, { method: "PATCH" });
  return res.data;
}

export async function listEmployeeLoanInstallments(loanId: number): Promise<EmployeeLoanInstallmentRow[]> {
  const res = await request<ApiListEnvelope<EmployeeLoanInstallmentRow>>(
    `/employee-loans/${loanId}/installments`,
  );
  return res.data;
}

// --- Employee cash advances (HRM CASH-ADVANCE-01) ---

export type EmployeeCashAdvanceRow = {
  id: number;
  outletId: number;
  employeeId: number;
  advanceNo: string;
  amount: number;
  repaymentType: "next_payroll" | "installment";
  installmentCount?: number | null;
  installmentAmount?: number | null;
  deductedAmount: number;
  remainingAmount: number;
  status: string;
  approvedBy?: number | null;
  approvedAt?: string | null;
  employee?: { id: number; employeeNo: string; fullName: string } | null;
  installments?: EmployeeCashAdvanceInstallmentRow[] | null;
};

export type EmployeeCashAdvanceInstallmentRow = {
  id: number;
  cashAdvanceId: number;
  installmentNo: number;
  dueDate: string;
  amount: number;
  status: string;
  payrollRunItemId?: number | null;
};

export type EmployeeCashAdvanceCreatePayload = {
  employeeId: number;
  amount: number;
  repaymentType: "next_payroll" | "installment";
  installmentCount?: number;
  installmentAmount?: number;
};

export async function listCashAdvances(params?: {
  outletId?: number;
  employeeId?: number;
  status?: string;
}): Promise<EmployeeCashAdvanceRow[]> {
  const qs = new URLSearchParams();
  if (params?.outletId) qs.set("outletId", String(params.outletId));
  if (params?.employeeId) qs.set("employeeId", String(params.employeeId));
  if (params?.status) qs.set("status", params.status);
  const suffix = qs.toString() ? `?${qs}` : "";
  const res = await request<ApiListEnvelope<EmployeeCashAdvanceRow>>(`/cash-advances${suffix}`);
  return res.data;
}

export async function createCashAdvance(payload: EmployeeCashAdvanceCreatePayload): Promise<EmployeeCashAdvanceRow> {
  const res = await request<{ data: EmployeeCashAdvanceRow }>("/cash-advances", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function approveCashAdvance(id: number): Promise<EmployeeCashAdvanceRow> {
  const res = await request<{ data: EmployeeCashAdvanceRow }>(`/cash-advances/${id}/approve`, { method: "PATCH" });
  return res.data;
}

export async function activateCashAdvance(id: number): Promise<EmployeeCashAdvanceRow> {
  const res = await request<{ data: EmployeeCashAdvanceRow }>(`/cash-advances/${id}/activate`, { method: "PATCH" });
  return res.data;
}

export async function cancelCashAdvance(id: number): Promise<EmployeeCashAdvanceRow> {
  const res = await request<{ data: EmployeeCashAdvanceRow }>(`/cash-advances/${id}/cancel`, { method: "PATCH" });
  return res.data;
}

export async function listCashAdvanceInstallments(advanceId: number): Promise<EmployeeCashAdvanceInstallmentRow[]> {
  const res = await request<ApiListEnvelope<EmployeeCashAdvanceInstallmentRow>>(
    `/cash-advances/${advanceId}/installments`,
  );
  return res.data;
}

// --- Payroll adjustments (HRM PAYROLL-ADJUSTMENT-01) ---

export type PayrollAdjustmentRow = {
  id: number;
  outletId: number;
  employeeId: number;
  adjustmentNo: string;
  type: "earning" | "deduction";
  category: string;
  amount: number;
  effectiveFrom: string;
  effectiveTo: string;
  status: string;
  approvedBy?: number | null;
  approvedAt?: string | null;
  description?: string | null;
  employee?: { id: number; employeeNo: string; fullName: string } | null;
};

export type PayrollAdjustmentCreatePayload = {
  employeeId: number;
  type: "earning" | "deduction";
  category: string;
  amount: number;
  effectiveFrom: string;
  effectiveTo?: string;
  description?: string;
};

export async function listPayrollAdjustments(params?: {
  outletId?: number;
  employeeId?: number;
  status?: string;
  type?: string;
  category?: string;
  periodFrom?: string;
  periodTo?: string;
}): Promise<PayrollAdjustmentRow[]> {
  const qs = new URLSearchParams();
  if (params?.outletId) qs.set("outletId", String(params.outletId));
  if (params?.employeeId) qs.set("employeeId", String(params.employeeId));
  if (params?.status) qs.set("status", params.status);
  if (params?.type) qs.set("type", params.type);
  if (params?.category) qs.set("category", params.category);
  if (params?.periodFrom) qs.set("periodFrom", params.periodFrom);
  if (params?.periodTo) qs.set("periodTo", params.periodTo);
  const suffix = qs.toString() ? `?${qs}` : "";
  const res = await request<ApiListEnvelope<PayrollAdjustmentRow>>(`/payroll-adjustments${suffix}`);
  return res.data;
}

export async function createPayrollAdjustment(payload: PayrollAdjustmentCreatePayload): Promise<PayrollAdjustmentRow> {
  const res = await request<{ data: PayrollAdjustmentRow }>("/payroll-adjustments", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function approvePayrollAdjustment(id: number): Promise<PayrollAdjustmentRow> {
  const res = await request<{ data: PayrollAdjustmentRow }>(`/payroll-adjustments/${id}/approve`, { method: "PATCH" });
  return res.data;
}

export async function cancelPayrollAdjustment(id: number): Promise<PayrollAdjustmentRow> {
  const res = await request<{ data: PayrollAdjustmentRow }>(`/payroll-adjustments/${id}/cancel`, { method: "PATCH" });
  return res.data;
}

// --- Reimbursements (HRM REIMBURSEMENT-01) ---

export type ReimbursementAttachmentRow = {
  id: number;
  reimbursementId: number;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType?: string | null;
  createdAt?: string | null;
};

export type EmployeeReimbursementRow = {
  id: number;
  outletId: number;
  employeeId: number;
  claimNo: string;
  category: string;
  title: string;
  description?: string | null;
  claimAmount: number;
  expenseDate: string;
  status: string;
  submittedAt?: string | null;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  paidAt?: string | null;
  payrollRunItemId?: number | null;
  notes?: string | null;
  attachments?: ReimbursementAttachmentRow[];
  employee?: { id: number; employeeNo: string; fullName: string } | null;
};

export const REIMBURSEMENT_CATEGORIES = [
  "transport",
  "fuel",
  "meal",
  "medical",
  "communication",
  "purchase",
  "entertainment",
  "training",
  "other",
] as const;

export async function listReimbursements(params?: {
  outletId?: number;
  employeeId?: number;
  status?: string;
  category?: string;
}): Promise<EmployeeReimbursementRow[]> {
  const qs = new URLSearchParams();
  if (params?.outletId) qs.set("outletId", String(params.outletId));
  if (params?.employeeId) qs.set("employeeId", String(params.employeeId));
  if (params?.status) qs.set("status", params.status);
  if (params?.category) qs.set("category", params.category);
  const suffix = qs.toString() ? `?${qs}` : "";
  const res = await request<ApiListEnvelope<EmployeeReimbursementRow>>(`/reimbursements${suffix}`);
  return res.data;
}

export async function createReimbursement(payload: {
  employeeId: number;
  category: string;
  title: string;
  description?: string;
  claimAmount: number;
  expenseDate: string;
  notes?: string;
}): Promise<EmployeeReimbursementRow> {
  const res = await request<{ data: EmployeeReimbursementRow }>("/reimbursements", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function updateReimbursement(
  id: number,
  payload: Partial<{
    category: string;
    title: string;
    description: string;
    claimAmount: number;
    expenseDate: string;
    notes: string;
  }>,
): Promise<EmployeeReimbursementRow> {
  const res = await request<{ data: EmployeeReimbursementRow }>(`/reimbursements/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function deleteReimbursement(id: number): Promise<void> {
  await request<{ message: string }>(`/reimbursements/${id}`, { method: "DELETE" });
}

export async function submitReimbursement(id: number): Promise<EmployeeReimbursementRow> {
  const res = await request<{ data: EmployeeReimbursementRow }>(`/reimbursements/${id}/submit`, { method: "POST" });
  return res.data;
}

export async function approveReimbursement(id: number, notes?: string): Promise<EmployeeReimbursementRow> {
  const res = await request<{ data: EmployeeReimbursementRow }>(`/reimbursements/${id}/approve`, {
    method: "POST",
    body: JSON.stringify(notes ? { notes } : {}),
  });
  return res.data;
}

export async function rejectReimbursement(id: number, notes?: string): Promise<EmployeeReimbursementRow> {
  const res = await request<{ data: EmployeeReimbursementRow }>(`/reimbursements/${id}/reject`, {
    method: "POST",
    body: JSON.stringify(notes ? { notes } : {}),
  });
  return res.data;
}

export async function cancelReimbursement(id: number, notes?: string): Promise<EmployeeReimbursementRow> {
  const res = await request<{ data: EmployeeReimbursementRow }>(`/reimbursements/${id}/cancel`, {
    method: "POST",
    body: JSON.stringify(notes ? { notes } : {}),
  });
  return res.data;
}

export async function uploadReimbursementAttachment(
  reimbursementId: number,
  file: File,
): Promise<ReimbursementAttachmentRow> {
  const form = new FormData();
  form.append("file", file);
  const token = getApiAccessToken();
  const response = await fetch(`${API_BASE_URL}/reimbursements/${reimbursementId}/attachments`, {
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
  return (body as { data: ReimbursementAttachmentRow }).data;
}

export async function deleteReimbursementAttachment(attachmentId: number): Promise<void> {
  await request<{ message: string }>(`/reimbursements/attachments/${attachmentId}`, { method: "DELETE" });
}

// --- PPh21 (HRM PPH21-01) ---

export type Pph21BracketRow = {
  id?: number;
  incomeFrom: number;
  incomeTo?: number | null;
  taxRate: number;
};

export type Pph21ConfigRow = {
  id: number;
  effectiveDate: string;
  ptkpTk0: number;
  ptkpTk1: number;
  ptkpTk2: number;
  ptkpTk3: number;
  ptkpK0: number;
  ptkpK1: number;
  ptkpK2: number;
  ptkpK3: number;
  isActive: boolean;
  brackets?: Pph21BracketRow[];
};

export type Pph21ConfigCreatePayload = {
  effectiveDate: string;
  ptkpTk0?: number;
  ptkpTk1?: number;
  ptkpTk2?: number;
  ptkpTk3?: number;
  ptkpK0?: number;
  ptkpK1?: number;
  ptkpK2?: number;
  ptkpK3?: number;
  isActive?: boolean;
  brackets?: Pph21BracketRow[];
};

export type EmployeeTaxProfileRow = {
  id: number;
  employeeId: number;
  npwpNumber?: string | null;
  ptkpStatus: string;
  pph21Enabled: boolean;
  employee?: { id: number; employeeNo: string; fullName: string } | null;
};

export type EmployeeTaxProfileUpsertPayload = {
  employeeId: number;
  npwpNumber?: string;
  ptkpStatus?: string;
  pph21Enabled?: boolean;
};

export const PTKP_STATUSES = ["TK0", "TK1", "TK2", "TK3", "K0", "K1", "K2", "K3"] as const;

export async function listPph21Configs(): Promise<Pph21ConfigRow[]> {
  const res = await request<ApiListEnvelope<Pph21ConfigRow>>("/pph21-configs");
  return res.data;
}

export async function createPph21Config(payload: Pph21ConfigCreatePayload): Promise<Pph21ConfigRow> {
  const res = await request<{ data: Pph21ConfigRow }>("/pph21-configs", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function updatePph21Config(id: number, payload: Partial<Pph21ConfigCreatePayload>): Promise<Pph21ConfigRow> {
  const res = await request<{ data: Pph21ConfigRow }>(`/pph21-configs/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function listEmployeeTaxProfiles(params?: {
  outletId?: number;
  employeeId?: number;
}): Promise<EmployeeTaxProfileRow[]> {
  const qs = new URLSearchParams();
  if (params?.outletId) qs.set("outletId", String(params.outletId));
  if (params?.employeeId) qs.set("employeeId", String(params.employeeId));
  const suffix = qs.toString() ? `?${qs}` : "";
  const res = await request<ApiListEnvelope<EmployeeTaxProfileRow>>(`/employee-tax-profiles${suffix}`);
  return res.data;
}

export async function upsertEmployeeTaxProfile(payload: EmployeeTaxProfileUpsertPayload): Promise<EmployeeTaxProfileRow> {
  const res = await request<{ data: EmployeeTaxProfileRow }>("/employee-tax-profiles", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function updateEmployeeTaxProfile(
  id: number,
  payload: Partial<EmployeeTaxProfileUpsertPayload>,
): Promise<EmployeeTaxProfileRow> {
  const res = await request<{ data: EmployeeTaxProfileRow }>(`/employee-tax-profiles/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return res.data;
}

// --- BPJS (HRM BPJS-01) ---

export type BpjsConfigRow = {
  id: number;
  effectiveDate: string;
  kesehatanEmployeeRate: number;
  kesehatanCompanyRate: number;
  jhtEmployeeRate: number;
  jhtCompanyRate: number;
  jpEmployeeRate: number;
  jpCompanyRate: number;
  jkkCompanyRate: number;
  jkmCompanyRate: number;
  status: string;
};

export type BpjsConfigCreatePayload = {
  effectiveDate: string;
  kesehatanEmployeeRate?: number;
  kesehatanCompanyRate?: number;
  jhtEmployeeRate?: number;
  jhtCompanyRate?: number;
  jpEmployeeRate?: number;
  jpCompanyRate?: number;
  jkkCompanyRate?: number;
  jkmCompanyRate?: number;
  status?: string;
};

export type BpjsProfileRow = {
  id: number;
  employeeId: number;
  bpjsKesehatanNo?: string | null;
  bpjsTkNo?: string | null;
  bpjsKesehatanEnabled: boolean;
  bpjsTkEnabled: boolean;
  bpjsSalaryBase?: number | null;
  kesehatanEmployeeRateOverride?: number | null;
  kesehatanCompanyRateOverride?: number | null;
  jhtEmployeeRateOverride?: number | null;
  jhtCompanyRateOverride?: number | null;
  jpEmployeeRateOverride?: number | null;
  jpCompanyRateOverride?: number | null;
  jkkCompanyRateOverride?: number | null;
  jkmCompanyRateOverride?: number | null;
  employee?: { id: number; employeeNo: string; fullName: string } | null;
};

export type BpjsProfileUpsertPayload = {
  employeeId: number;
  bpjsKesehatanNo?: string;
  bpjsTkNo?: string;
  bpjsKesehatanEnabled?: boolean;
  bpjsTkEnabled?: boolean;
  bpjsSalaryBase?: number;
  kesehatanEmployeeRateOverride?: number;
  kesehatanCompanyRateOverride?: number;
  jhtEmployeeRateOverride?: number;
  jhtCompanyRateOverride?: number;
  jpEmployeeRateOverride?: number;
  jpCompanyRateOverride?: number;
  jkkCompanyRateOverride?: number;
  jkmCompanyRateOverride?: number;
};

export async function listBpjsConfigs(): Promise<BpjsConfigRow[]> {
  const res = await request<ApiListEnvelope<BpjsConfigRow>>("/bpjs-configs");
  return res.data;
}

export async function createBpjsConfig(payload: BpjsConfigCreatePayload): Promise<BpjsConfigRow> {
  const res = await request<{ data: BpjsConfigRow }>("/bpjs-configs", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function listBpjsProfiles(params?: { outletId?: number; employeeId?: number }): Promise<BpjsProfileRow[]> {
  const qs = new URLSearchParams();
  if (params?.outletId) qs.set("outletId", String(params.outletId));
  if (params?.employeeId) qs.set("employeeId", String(params.employeeId));
  const suffix = qs.toString() ? `?${qs}` : "";
  const res = await request<ApiListEnvelope<BpjsProfileRow>>(`/bpjs-profiles${suffix}`);
  return res.data;
}

export async function upsertBpjsProfile(payload: BpjsProfileUpsertPayload): Promise<BpjsProfileRow> {
  const res = await request<{ data: BpjsProfileRow }>("/bpjs-profiles", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function updateBpjsProfile(id: number, payload: Partial<BpjsProfileUpsertPayload>): Promise<BpjsProfileRow> {
  const res = await request<{ data: BpjsProfileRow }>(`/bpjs-profiles/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return res.data;
}

// --- Payslips (HRM PAYSLIP-01) ---

export type PayrollPayslipRow = {
  id: number;
  outletId: number;
  payrollRunId: number;
  payrollRunItemId: number;
  employeeId: number;
  payrollPeriodId: number;
  payslipNo: string;
  grossSalary: number;
  totalDeductions: number;
  netSalary: number;
  pdfPath?: string | null;
  pdfAvailable: boolean;
  status: string;
  publishedAt?: string | null;
  employee?: { id: number; employeeNo: string; fullName: string; position?: string } | null;
  payrollPeriod?: { id: number; periodStart: string; periodEnd: string } | null;
  payrollRun?: { id: number; status: string } | null;
};

export async function listPayslips(params?: {
  outletId?: number;
  employeeId?: number;
  payrollRunId?: number;
  status?: string;
  periodFrom?: string;
  periodTo?: string;
}): Promise<PayrollPayslipRow[]> {
  const qs = new URLSearchParams();
  if (params?.outletId) qs.set("outletId", String(params.outletId));
  if (params?.employeeId) qs.set("employeeId", String(params.employeeId));
  if (params?.payrollRunId) qs.set("payrollRunId", String(params.payrollRunId));
  if (params?.status) qs.set("status", params.status);
  if (params?.periodFrom) qs.set("periodFrom", params.periodFrom);
  if (params?.periodTo) qs.set("periodTo", params.periodTo);
  const suffix = qs.toString() ? `?${qs}` : "";
  const res = await request<ApiListEnvelope<PayrollPayslipRow>>(`/payslips${suffix}`);
  return res.data;
}

export async function generatePayslips(payrollRunId: number): Promise<PayrollPayslipRow[]> {
  const res = await request<{ data: PayrollPayslipRow[]; meta: { count: number } }>("/payslips/generate", {
    method: "POST",
    body: JSON.stringify({ payrollRunId }),
  });
  return res.data;
}

export async function publishPayslip(id: number): Promise<PayrollPayslipRow> {
  const res = await request<{ data: PayrollPayslipRow }>(`/payslips/${id}/publish`, { method: "POST" });
  return res.data;
}

export async function regeneratePayslip(id: number): Promise<PayrollPayslipRow> {
  const res = await request<{ data: PayrollPayslipRow }>(`/payslips/${id}/regenerate`, { method: "POST" });
  return res.data;
}

export async function listEmployeePayslips(employeeId: number): Promise<PayrollPayslipRow[]> {
  const res = await request<ApiListEnvelope<PayrollPayslipRow>>(`/employees/${employeeId}/payslips`);
  return res.data;
}

export async function downloadPayslipPdf(id: number): Promise<Blob> {
  const token = getApiAccessToken();
  const response = await fetch(`${API_BASE_URL}/payslips/${id}/download`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message =
      typeof body === "object" && body !== null && "message" in body && typeof (body as { message: unknown }).message === "string"
        ? (body as { message: string }).message
        : `Download failed (${response.status})`;
    throw new ApiHttpError(response.status, message, body);
  }
  return response.blob();
}

// --- Legacy payroll attendance (auth:api) ---

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

export async function markLegacyPayrollRunPaid(runId: number | string): Promise<void> {
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
