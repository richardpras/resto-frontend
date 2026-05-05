import type { AttendanceApiRow, EmployeeApiRow } from "@/lib/api-integration/hrEndpoints";
import type { Attendance, AttendanceStatus, Employee } from "@/stores/payrollStore";

function isoToHHmm(iso?: string | null): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return undefined;
  const h = d.getHours();
  const m = d.getMinutes();
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function normalizeAttendanceStatus(s: string): AttendanceStatus {
  if (s === "late" || s === "absent" || s === "present") return s;
  return "present";
}

export function employeeFromApi(row: EmployeeApiRow): Employee {
  const fullName = row.fullName ?? row.name ?? "";

  return {
    id: String(row.id),
    name: fullName,
    position: row.position,
    outlet: row.outlet ?? "Main",
    joinDate: row.joinDate ?? row.hireDate ?? new Date().toISOString().slice(0, 10),
    salaryType: row.salaryType ?? "monthly",
    baseSalary: row.baseSalary,
    overtimeRate: row.overtimeRate ?? 0,
    status: row.status === "inactive" ? "inactive" : "active",
    employeeNo: row.employeeNo,
    email: row.email ?? undefined,
    phone: row.phone ?? undefined,
  };
}

export type EmployeeFormForApi = Omit<Employee, "id"> & {
  employeeNo: string;
  email?: string;
  phone?: string;
};

export function employeeToCreatePayload(form: EmployeeFormForApi): import("@/lib/api-integration/hrEndpoints").EmployeeCreatePayload {
  const no = form.employeeNo.trim() || `EMP-${Date.now()}`;
  const fullName = form.name.trim();

  return {
    employeeNo: no,
    name: fullName,
    fullName,
    email: form.email?.trim() || undefined,
    phone: form.phone?.trim() || undefined,
    position: form.position.trim(),
    outlet: form.outlet?.trim() || undefined,
    salaryType: form.salaryType,
    baseSalary: form.baseSalary,
    overtimeRate: form.overtimeRate,
    joinDate: form.joinDate || undefined,
    hireDate: form.joinDate || undefined,
    status: form.status,
  };
}

export function employeeToUpdatePayload(
  form: EmployeeFormForApi,
): import("@/lib/api-integration/hrEndpoints").EmployeeUpdatePayload {
  return employeeToCreatePayload(form);
}

export function attendanceFromApi(row: AttendanceApiRow): Attendance {
  return {
    id: String(row.id),
    employeeId: String(row.employeeId),
    date: row.attendanceDate,
    checkIn: isoToHHmm(row.checkIn),
    checkOut: isoToHHmm(row.checkOut),
    status: normalizeAttendanceStatus(row.status),
    notes: row.notes ?? undefined,
  };
}

export function buildCheckInOutIso(dateStr: string, timeHHmm: string): string {
  const [hh, mm] = timeHHmm.split(":").map((x) => Number.parseInt(x, 10));
  const d = new Date(dateStr);
  d.setHours(Number.isFinite(hh) ? hh : 0, Number.isFinite(mm) ? mm : 0, 0, 0);
  return d.toISOString();
}
