import { apiRequest as request } from "./client";

type ListEnvelope<T> = { data: T[] };
type ItemEnvelope<T> = { data: T };

export type DepartmentRow = {
  id: number;
  outletId: number | null;
  code: string;
  name: string;
  description?: string | null;
  isActive: boolean;
};

export type PositionRow = {
  id: number;
  outletId: number | null;
  departmentId: number | null;
  code: string;
  name: string;
  description?: string | null;
  sortOrder: number;
  isActive: boolean;
  department?: DepartmentRow;
};

export type OrganizationEmployeeRow = {
  id: number;
  outletId: number;
  employeeNo: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  gender?: string | null;
  birthDate?: string | null;
  hireDate?: string | null;
  status: string;
  positionId?: number | null;
  positionName?: string | null;
  departmentId?: number | null;
  department?: DepartmentRow | null;
  userId?: number | null;
  linkedUser?: { id: number; name: string; email: string } | null;
  notes?: string | null;
  outlet?: { id: number; code?: string; name: string };
};

export async function listDepartments(outletId?: number): Promise<DepartmentRow[]> {
  const q = outletId ? `?outletId=${outletId}` : "";
  const res = await request<ListEnvelope<DepartmentRow>>(`/departments${q}`);
  return res.data;
}

export async function createDepartment(payload: {
  outletId?: number | null;
  code: string;
  name: string;
  description?: string;
  isActive?: boolean;
}): Promise<DepartmentRow> {
  const res = await request<ItemEnvelope<DepartmentRow>>("/departments", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function updateDepartment(
  id: number,
  payload: Partial<{ outletId: number | null; code: string; name: string; description: string; isActive: boolean }>,
): Promise<DepartmentRow> {
  const res = await request<ItemEnvelope<DepartmentRow>>(`/departments/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function deleteDepartment(id: number): Promise<void> {
  await request<{ message: string }>(`/departments/${id}`, { method: "DELETE" });
}

export async function listPositions(outletId?: number, departmentId?: number): Promise<PositionRow[]> {
  const q = new URLSearchParams();
  if (outletId) q.set("outletId", String(outletId));
  if (departmentId) q.set("departmentId", String(departmentId));
  const suffix = q.toString() ? `?${q.toString()}` : "";
  const res = await request<ListEnvelope<PositionRow>>(`/positions${suffix}`);
  return res.data;
}

export async function createPosition(payload: {
  outletId?: number | null;
  departmentId?: number | null;
  code: string;
  name: string;
  description?: string;
  sortOrder?: number;
  isActive?: boolean;
}): Promise<PositionRow> {
  const res = await request<ItemEnvelope<PositionRow>>("/positions", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function updatePosition(
  id: number,
  payload: Partial<{
    departmentId: number | null;
    code: string;
    name: string;
    description: string;
    sortOrder: number;
    isActive: boolean;
  }>,
): Promise<PositionRow> {
  const res = await request<ItemEnvelope<PositionRow>>(`/positions/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function deletePosition(id: number): Promise<void> {
  await request<{ message: string }>(`/positions/${id}`, { method: "DELETE" });
}

export async function listOrganizationEmployees(outletId: number, search?: string): Promise<OrganizationEmployeeRow[]> {
  const q = new URLSearchParams({ outletId: String(outletId) });
  if (search?.trim()) q.set("search", search.trim());
  const res = await request<ListEnvelope<OrganizationEmployeeRow>>(`/employees?${q.toString()}`);
  return res.data;
}

export async function getOrganizationEmployee(id: number): Promise<OrganizationEmployeeRow> {
  const res = await request<ItemEnvelope<OrganizationEmployeeRow>>(`/employees/${id}`);
  return res.data;
}

export async function createOrganizationEmployee(payload: {
  outletId: number;
  employeeNo?: string;
  fullName: string;
  email?: string;
  phone?: string;
  gender?: string;
  birthDate?: string;
  hireDate?: string;
  status?: string;
  positionId?: number | null;
  departmentId?: number | null;
  notes?: string;
}): Promise<OrganizationEmployeeRow> {
  const res = await request<ItemEnvelope<OrganizationEmployeeRow>>("/employees", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function updateOrganizationEmployee(
  id: number,
  payload: Partial<{
    employeeNo: string;
    fullName: string;
    email: string;
    phone: string;
    gender: string;
    birthDate: string;
    hireDate: string;
    status: string;
    positionId: number | null;
    departmentId: number | null;
    notes: string;
  }>,
): Promise<OrganizationEmployeeRow> {
  const res = await request<ItemEnvelope<OrganizationEmployeeRow>>(`/employees/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function assignEmployeeUser(employeeId: number, userId: number): Promise<OrganizationEmployeeRow> {
  const res = await request<ItemEnvelope<OrganizationEmployeeRow>>(`/employees/${employeeId}/assign-user`, {
    method: "PATCH",
    body: JSON.stringify({ userId }),
  });
  return res.data;
}

export async function removeEmployeeUser(employeeId: number): Promise<OrganizationEmployeeRow> {
  const res = await request<ItemEnvelope<OrganizationEmployeeRow>>(`/employees/${employeeId}/remove-user`, {
    method: "PATCH",
  });
  return res.data;
}
