import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const MAX_WIDTH_CLASS = {
  "5xl": "max-w-5xl",
  "6xl": "max-w-6xl",
  "7xl": "max-w-7xl",
  full: "max-w-none",
} as const;

export type AdminPageShellProps = {
  children: ReactNode;
  className?: string;
  maxWidth?: keyof typeof MAX_WIDTH_CLASS;
};

export function AdminPageShell({ children, className, maxWidth = "7xl" }: AdminPageShellProps) {
  return (
    <div className={cn("p-4 md:p-6 space-y-5 mx-auto w-full", MAX_WIDTH_CLASS[maxWidth], className)}>
      {children}
    </div>
  );
}
