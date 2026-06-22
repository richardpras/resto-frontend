import type { ReactElement } from "react";
import { HrModuleLayout } from "@/pages/hr/HrModuleLayout";
import type { HrBootstrapKey } from "@/hooks/useHrPayrollBootstrap";

export function wrapHrPage(element: ReactElement, bootstrapKeys?: HrBootstrapKey[]) {
  return <HrModuleLayout bootstrapKeys={bootstrapKeys}>{element}</HrModuleLayout>;
}
