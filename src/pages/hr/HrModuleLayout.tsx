import type { ReactNode } from "react";
import { useHrPayrollBootstrap, type HrBootstrapKey } from "@/hooks/useHrPayrollBootstrap";

type HrModuleLayoutProps = {
  children: ReactNode;
  bootstrapKeys?: HrBootstrapKey[];
};

/** Thin page shell for `/hr/*` routes — padding only, no in-content tab nav. */
export function HrModuleLayout({ children, bootstrapKeys }: HrModuleLayoutProps) {
  useHrPayrollBootstrap(bootstrapKeys);
  return <div className="p-4 md:p-6 space-y-6">{children}</div>;
}
