import { Link } from "react-router-dom";
import { ExternalLink, Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { ReactNode } from "react";

export type ExecutiveWidgetStatus = "loading" | "restricted" | "empty" | "success" | "error";

type Props = {
  title: string;
  description?: string;
  status: ExecutiveWidgetStatus;
  permissionHint?: string;
  openTo?: string;
  openLabel?: string;
  errorMessage?: string;
  children?: ReactNode;
};

export function ExecutiveWidgetCard({
  title,
  description,
  status,
  permissionHint,
  openTo,
  openLabel = "Open",
  errorMessage,
  children,
}: Props) {
  return (
    <Card className={`h-full ${status === "restricted" ? "border-dashed opacity-80" : ""}`}>
      <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
        <div className="min-w-0">
          <CardTitle className="text-base">{title}</CardTitle>
          {description ? <p className="text-xs text-muted-foreground mt-1">{description}</p> : null}
        </div>
        {openTo && status === "success" ? (
          <Button variant="outline" size="sm" asChild className="shrink-0">
            <Link to={openTo}>
              {openLabel}
              <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        ) : null}
      </CardHeader>
      <CardContent>
        {status === "loading" ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-6 w-2/3" />
          </div>
        ) : null}

        {status === "restricted" ? (
          <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
            <Lock className="h-8 w-8 text-muted-foreground" />
            <Badge variant="outline">Restricted</Badge>
            <p className="text-sm text-muted-foreground">
              {permissionHint ? `Requires ${permissionHint}` : "Additional permission required"}
            </p>
          </div>
        ) : null}

        {status === "empty" ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No data for the selected outlet.</p>
        ) : null}

        {status === "error" ? (
          <p className="text-sm text-destructive py-4">{errorMessage ?? "Failed to load widget data."}</p>
        ) : null}

        {status === "success" ? children : null}
      </CardContent>
    </Card>
  );
}
