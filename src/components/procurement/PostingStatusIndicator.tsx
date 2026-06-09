import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";
import type { PostingStatusPayload } from "@/lib/api-integration/purchaseEndpoints";

const statusColors: Record<string, string> = {
  posted: "bg-success/15 text-success border-success/30",
  not_posted: "bg-warning/15 text-warning border-warning/30",
  reversed: "bg-muted text-muted-foreground",
};

const statusLabel: Record<string, string> = {
  posted: "Posted",
  not_posted: "Not Posted",
  reversed: "Reversed",
};

export default function PostingStatusIndicator({ postingStatus }: { postingStatus?: PostingStatusPayload | null }) {
  if (!postingStatus) {
    return null;
  }

  const { status, journalEntryId, journalNo, postedAt, reason } = postingStatus;

  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 p-4 space-y-2 text-sm">
      <div className="flex items-center gap-2">
        <span className="font-medium">Posting Status</span>
        <Badge variant="outline" className={statusColors[status] ?? ""}>
          {status === "posted" ? "✅ Posted" : status === "reversed" ? "↩ Reversed" : "⚠ Not Posted"}
        </Badge>
      </div>

      {status === "posted" && (
        <>
          {journalNo && (
            <div>
              <span className="text-muted-foreground">Journal: </span>
              {journalEntryId ? (
                <Link
                  to={`/accounting?tab=journal&journalId=${journalEntryId}`}
                  className="inline-flex items-center gap-1 font-mono text-primary hover:underline"
                >
                  {journalNo}
                  <ExternalLink className="h-3 w-3" />
                </Link>
              ) : (
                <span className="font-mono">{journalNo}</span>
              )}
            </div>
          )}
          {postedAt && (
            <div>
              <span className="text-muted-foreground">Posted At: </span>
              {new Date(postedAt).toLocaleDateString()}
            </div>
          )}
          {journalEntryId && (
            <Link
              to={`/accounting?tab=journal&journalId=${journalEntryId}`}
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              Open Journal
              <ExternalLink className="h-3 w-3" />
            </Link>
          )}
        </>
      )}

      {status === "not_posted" && reason && (
        <div>
          <span className="text-muted-foreground">Reason: </span>
          <span>{reason}</span>
        </div>
      )}

      {status === "reversed" && (
        <>
          {journalNo && (
            <div>
              <span className="text-muted-foreground">Journal: </span>
              <span className="font-mono">{journalNo}</span>
            </div>
          )}
          {reason && (
            <div>
              <span className="text-muted-foreground">Reason: </span>
              <span>{reason}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function PostingStatusBadge({ postingStatus }: { postingStatus?: PostingStatusPayload | null }) {
  if (!postingStatus || postingStatus.status === "not_posted") {
    return postingStatus?.status === "not_posted" ? (
      <Badge variant="outline" className={statusColors.not_posted}>{statusLabel.not_posted}</Badge>
    ) : null;
  }

  return (
    <Badge variant="outline" className={statusColors[postingStatus.status] ?? ""}>
      {statusLabel[postingStatus.status] ?? postingStatus.status}
    </Badge>
  );
}
