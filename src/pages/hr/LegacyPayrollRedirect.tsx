import { Navigate, useSearchParams } from "react-router-dom";
import { resolveLegacyPayrollTabRedirect } from "@/domain/hrRouteMap";

/** Backward-compat: `/payroll?tab=*` → dedicated `/hr/*` route. */
export function LegacyPayrollRedirect() {
  const [searchParams] = useSearchParams();
  const to = resolveLegacyPayrollTabRedirect(searchParams.get("tab"));
  return <Navigate to={to} replace />;
}
