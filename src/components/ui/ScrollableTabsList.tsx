import type { ComponentPropsWithoutRef } from "react";
import { TabsList } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

type ScrollableTabsListProps = ComponentPropsWithoutRef<typeof TabsList>;

export function ScrollableTabsList({ className, children, ...props }: ScrollableTabsListProps) {
  return (
    <div className="overflow-x-auto scrollbar-hide -mx-1 px-1">
      <TabsList
        className={cn("inline-flex w-max min-w-full h-auto flex-nowrap justify-start", className)}
        {...props}
      >
        {children}
      </TabsList>
    </div>
  );
}
