import type { EmployeeApiRow } from "@/lib/api-integration/hrEndpoints";
import type { Employee } from "@/stores/payrollStore";

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
