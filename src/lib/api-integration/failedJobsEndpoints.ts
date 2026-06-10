import { apiRequest as request } from "./client";

export type FailedJobRow = {
  id: number;
  uuid: string;
  connection: string;
  queue: string;
  jobClass: string;
  module: string;
  jobSeverity: "critical" | "warning" | "info";
  exceptionPreview: string;
  failedAt: string | null;
  ageMinutes: number;
  outletId: number | null;
};

export type FailedJobSummary = {
  failedJobs: number;
  criticalFailures: number;
  repeatFailures: number;
  oldestFailureMinutes: number | null;
  healthStatus: string;
  healthScore: number;
};

export type FailedJobSnapshot = {
  snapshotDate: string;
  totalFailures: number;
  criticalFailures: number;
  resolvedFailures: number;
  healthStatus: string;
};

export type ListFailedJobsParams = {
  module?: string;
  severity?: string;
  queue?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
};

export type ListFailedJobsResponse = {
  data: FailedJobRow[];
  meta: {
    currentPage: number;
    lastPage: number;
    perPage: number;
    total: number;
  };
  grouped: {
    byModule: Array<{ module: string; count: number; criticalCount: number }>;
    byQueue: Array<{ queue: string; count: number }>;
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

export async function listFailedJobs(params: ListFailedJobsParams = {}): Promise<ListFailedJobsResponse> {
  const response = await request<ListFailedJobsResponse>(
    `/system/failed-jobs${buildQuery(params as Record<string, string | number | undefined>)}`,
  );
  return {
    data: response.data ?? [],
    meta: response.meta ?? { currentPage: 1, lastPage: 1, perPage: 20, total: 0 },
    grouped: response.grouped ?? { byModule: [], byQueue: [] },
  };
}

export async function getFailedJobsSummary(): Promise<FailedJobSummary> {
  const response = await request<{ data: FailedJobSummary }>("/system/failed-jobs/summary");
  return response.data;
}

export async function getFailedJobsTrends(params?: {
  startDate?: string;
  endDate?: string;
}): Promise<FailedJobSnapshot[]> {
  const response = await request<{ data: FailedJobSnapshot[] }>(
    `/system/failed-jobs/trends${buildQuery(params ?? {})}`,
  );
  return response.data ?? [];
}
