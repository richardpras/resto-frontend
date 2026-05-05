import { apiRequest as request } from "./client";

type ListEnvelope<T> = { data: T[] };
type ItemEnvelope<T> = { data: T };

export type AuthUserSummary = {
  id: number;
  name: string;
  email: string;
};

export type MeResponse = AuthUserSummary & {
  roles: { id: number; name: string }[];
  permissionCodes: string[];
  /** Server stores a bcrypt PIN hash; unlock goes through verify-screen-pin. */
  pinSet?: boolean;
};

export type LoginResponse = {
  message: string;
  data: {
    accessToken: string;
    tokenType: string;
    /** Seconds until access token expires (Passport), if configured. */
    expiresIn?: number | null;
    /** ISO-8601 expiry instant when known. */
    expiresAt?: string | null;
    user: AuthUserSummary;
  };
};

export type UserRoleSummary = { id: number; name: string };

export type UserApiRow = {
  id: number;
  name: string;
  email: string;
  /** POS screen-lock PIN configured (hash on server only). */
  pinSet?: boolean;
  roles?: UserRoleSummary[];
  createdAt?: string | null;
};

export type RolePermissionRow = { id: number; code: string; name: string };

export type RoleApiRow = {
  id: number;
  name: string;
  description: string | null;
  permissions?: RolePermissionRow[];
};

export type PermissionApiRow = {
  id: number;
  code: string;
  name: string;
  description?: string | null;
};

export async function login(email: string, password: string): Promise<LoginResponse> {
  return request<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function logout(): Promise<{ message: string }> {
  return request<{ message: string }>("/auth/logout", {
    method: "POST",
  });
}

export async function me(): Promise<MeResponse> {
  const res = await request<ItemEnvelope<MeResponse>>("/auth/me");
  return res.data;
}

export async function verifyScreenPin(pin: string): Promise<void> {
  await request<{ message: string }>("/auth/verify-screen-pin", {
    method: "POST",
    body: JSON.stringify({ pin }),
  });
}

export async function updateScreenPin(payload: { pin: string; currentPin?: string }): Promise<void> {
  const body =
    payload.currentPin !== undefined ? { pin: payload.pin, currentPin: payload.currentPin } : { pin: payload.pin };
  await request<{ message: string }>("/auth/screen-pin", {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function listUsers(): Promise<UserApiRow[]> {
  const res = await request<ListEnvelope<UserApiRow>>("/users");
  return res.data;
}

export async function createUser(payload: {
  name: string;
  email: string;
  password: string;
  /** Optional 4-digit POS unlock PIN set by admin during create. */
  pin?: string;
}): Promise<UserApiRow> {
  const res = await request<{ message: string; data: UserApiRow }>("/users", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function adminSetUserScreenPin(userId: number | string, pin: string): Promise<UserApiRow> {
  const res = await request<{ message: string; data: UserApiRow }>(`/users/${userId}/screen-pin`, {
    method: "PUT",
    body: JSON.stringify({ pin }),
  });
  return res.data;
}

export async function adminClearUserScreenPin(userId: number | string): Promise<UserApiRow> {
  const res = await request<{ message: string; data: UserApiRow }>(`/users/${userId}/screen-pin`, {
    method: "DELETE",
  });
  return res.data;
}

export async function assignUserRoles(userId: number | string, roleIds: number[]): Promise<UserApiRow> {
  const res = await request<{ message: string; data: UserApiRow }>(`/users/${userId}/roles`, {
    method: "POST",
    body: JSON.stringify({ roleIds }),
  });
  return res.data;
}

export async function listRoles(): Promise<RoleApiRow[]> {
  const res = await request<ListEnvelope<RoleApiRow>>("/roles");
  return res.data;
}

export async function createRole(payload: { name: string; description?: string | null }): Promise<RoleApiRow> {
  const res = await request<{ message: string; data: RoleApiRow }>("/roles", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function assignRolePermissions(
  roleId: number | string,
  permissionIds: number[],
): Promise<RoleApiRow> {
  const res = await request<{ message: string; data: RoleApiRow }>(`/roles/${roleId}/permissions`, {
    method: "POST",
    body: JSON.stringify({ permissionIds }),
  });
  return res.data;
}

export async function listPermissions(): Promise<PermissionApiRow[]> {
  const res = await request<ListEnvelope<PermissionApiRow>>("/permissions");
  return res.data;
}

export async function createPermission(payload: {
  code: string;
  name: string;
  description?: string | null;
}): Promise<PermissionApiRow> {
  const res = await request<{ message: string; data: PermissionApiRow }>("/permissions", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}
