import { Link } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SystemHealthStatusBadge } from "@/components/system-health/SystemHealthStatusBadge";
import type { ReactNode } from "react";
import type { SystemHealthWidgetStatus } from "@/hooks/system-health/useSystemHealthData";

type Props = {
  title: string;
  status: SystemHealthWidgetStatus;
  severity?: string;
  openTo?: string;
  errorMessage?: string;
  children?: ReactNode;
};

export function SystemModuleHealthCard({
  title,
  status,
  severity,
  openTo,
  errorMessage,
  children,
}: Props) {
  return (
    <Card className={`h-full ${status === "restricted" ? "border-dashed opacity-80" : ""}`}>
      <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
        <div className="min-w-0">
          <CardTitle className="text-base">{title}</CardTitle>
          {severity && status === "success" ? (
            <div className="mt-1">
              <SystemHealthStatusBadge severity={severity} />
            </div>
          ) : null}
        </div>
        {openTo && status === "success" ? (
          <Button variant="outline" size="sm" asChild className="shrink-0">
            <Link to={openTo}>
              Open
              <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        ) : null}
      </CardHeader>
      <CardContent>
        {status === "loading" ? (
          <div className="space-y-2">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-6 w-1/2" />
          </div>
        ) : null}
        {status === "restricted" ? (
          <p className="text-sm text-muted-foreground py-2">Additional permission required</p>
        ) : null}
        {status === "error" ? (
          <p className="text-sm text-destructive py-2">{errorMessage ?? "Failed to load"}</p>
        ) : null}
        {status === "success" ? children : null}
      </CardContent>
    </Card>
  );
}
