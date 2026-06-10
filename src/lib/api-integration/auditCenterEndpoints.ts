import { apiRequest as request } from "./client";

export type AuditRiskLevel = "info" | "warning" | "critical";

export type UnifiedAuditRecord = {
  id: string;
  module: string;
  entityType: string;
  entityId: number;
  action: string;
  userId: number | null;
  userName: string | null;
  outletId: number | null;
  timestamp: string;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  metadata: Record<string, unknown> & { riskLevel?: AuditRiskLevel };
};

export type AuditCenterSummary = {
  todayEvents: number;
  activeUsers: number;
  financialChanges: number;
  approvals: number;
  criticalEvents: number;
  topActors: Array<{ userId: number; userName: string; count: number }>;
  topModules: Array<{ module: string; count: number }>;
  riskEvents: UnifiedAuditRecord[];
};

export type ListAuditCenterParams = {
  outletId?: number;
  module?: string;
  userId?: number;
  entityType?: string;
  entityId?: number;
  action?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
};

export type PaginatedAuditResponse = {
  data: UnifiedAuditRecord[];
  meta: {
    currentPage: number;
    lastPage: number;
    perPage: number;
    total: number;
  };
};

function buildQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      search.set(key, String(value));
    }
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export async function listAuditTimeline(params: ListAuditCenterParams = {}): Promise<PaginatedAuditResponse> {
  const response = await request<PaginatedAuditResponse>(
    `/audit-center${buildQuery(params as Record<string, string | number | undefined>)}`,
  );
  return {
    data: response.data ?? [],
    meta: response.meta ?? { currentPage: 1, lastPage: 1, perPage: 20, total: 0 },
  };
}

export async function searchAuditCenter(
  query: string,
  params: Omit<ListAuditCenterParams, "page"> & { page?: number } = {},
): Promise<PaginatedAuditResponse> {
  const response = await request<PaginatedAuditResponse>(
    `/audit-center/search${buildQuery({ q: query, ...params })}`,
  );
  return {
    data: response.data ?? [],
    meta: response.meta ?? { currentPage: 1, lastPage: 1, perPage: 20, total: 0 },
  };
}

export async function getAuditEntityHistory(params: {
  entityType: string;
  entityId: number;
  outletId?: number;
}): Promise<UnifiedAuditRecord[]> {
  const response = await request<{ data: UnifiedAuditRecord[] }>(
    `/audit-center/entity-history${buildQuery(params)}`,
  );
  return response.data ?? [];
}

export async function getAuditCenterSummary(outletId?: number): Promise<AuditCenterSummary> {
  const response = await request<{ data: AuditCenterSummary }>(
    `/audit-center/summary${buildQuery({ outletId })}`,
  );
  return (
    response.data ?? {
      todayEvents: 0,
      activeUsers: 0,
      financialChanges: 0,
      approvals: 0,
      criticalEvents: 0,
      topActors: [],
      topModules: [],
      riskEvents: [],
    }
  );
}
