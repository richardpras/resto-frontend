import * as React from "react";
import { TabsList } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

type ScrollableTabsListProps = React.ComponentPropsWithoutRef<typeof TabsList>;

export const ScrollableTabsList = React.forwardRef<
  React.ElementRef<typeof TabsList>,
  ScrollableTabsListProps
>(({ className, ...props }, ref) => (
  <div className="w-full overflow-x-auto scrollbar-hide">
    <TabsList
      ref={ref}
      className={cn(
        "inline-flex h-auto min-h-10 w-max max-w-full flex-nowrap justify-start gap-1 p-1",
        className,
      )}
      {...props}
    />
  </div>
));
ScrollableTabsList.displayName = "ScrollableTabsList";
