import { listBugReports } from "@/lib/api-integration/bugReportEndpoints";

export type BugReportCounts = {
  open: number;
  critical: number;
  investigating: number;
  fixedToday: number;
};

export async function fetchBugReportCounts(): Promise<BugReportCounts> {
  const [openRes, criticalRes, investigatingRes, fixedRes] = await Promise.all([
    listBugReports({ status: "open", limit: 1 }),
    listBugReports({ severity: "critical", limit: 50 }),
    listBugReports({ status: "investigating", limit: 1 }),
    listBugReports({ status: "fixed", limit: 50 }),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const fixedToday = fixedRes.data.filter(
    (r) => r.resolvedAt?.slice(0, 10) === today || r.updatedAt?.slice(0, 10) === today,
  ).length;

  const openCritical = criticalRes.data.filter(
    (r) => r.status !== "closed" && r.status !== "wont_fix" && r.status !== "fixed",
  ).length;

  return {
    open: openRes.meta.total + investigatingRes.meta.total,
    critical: openCritical,
    investigating: investigatingRes.meta.total,
    fixedToday,
  };
}
