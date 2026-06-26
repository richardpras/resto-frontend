import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";
import type { PostingStatusPayload } from "@/lib/api-integration/purchaseEndpoints";
import { useErpTranslation } from "@/i18n/useErpTranslation";

const statusColors: Record<string, string> = {
  posted: "bg-success/15 text-success border-success/30",
  not_posted: "bg-warning/15 text-warning border-warning/30",
  reversed: "bg-muted text-muted-foreground",
};

export default function PostingStatusIndicator({ postingStatus }: { postingStatus?: PostingStatusPayload | null }) {
  const { t } = useErpTranslation();

  if (!postingStatus) {
    return null;
  }

  const { status, journalEntryId, journalNo, postedAt, reason } = postingStatus;

  const badgeLabel =
    status === "posted"
      ? t("purchases.postingStatus.badgePosted")
      : status === "reversed"
        ? t("purchases.postingStatus.badgeReversed")
        : t("purchases.postingStatus.badgeNotPosted");

  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 p-4 space-y-2 text-sm">
      <div className="flex items-center gap-2">
        <span className="font-medium">{t("purchases.postingStatus.title")}</span>
        <Badge variant="outline" className={statusColors[status] ?? ""}>
          {badgeLabel}
        </Badge>
      </div>

      {status === "posted" && (
        <>
          {journalNo && (
            <div>
              <span className="text-muted-foreground">{t("purchases.postingStatus.journal")}: </span>
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
              <span className="text-muted-foreground">{t("purchases.postingStatus.postedAt")}: </span>
              {new Date(postedAt).toLocaleDateString()}
            </div>
          )}
          {journalEntryId && (
            <Link
              to={`/accounting?tab=journal&journalId=${journalEntryId}`}
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              {t("purchases.postingStatus.openJournal")}
              <ExternalLink className="h-3 w-3" />
            </Link>
          )}
        </>
      )}

      {status === "not_posted" && reason && (
        <div>
          <span className="text-muted-foreground">{t("purchases.postingStatus.reason")}: </span>
          <span>{reason}</span>
        </div>
      )}

      {status === "reversed" && (
        <>
          {journalNo && (
            <div>
              <span className="text-muted-foreground">{t("purchases.postingStatus.journal")}: </span>
              <span className="font-mono">{journalNo}</span>
            </div>
          )}
          {reason && (
            <div>
              <span className="text-muted-foreground">{t("purchases.postingStatus.reason")}: </span>
              <span>{reason}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function PostingStatusBadge({ postingStatus }: { postingStatus?: PostingStatusPayload | null }) {
  const { t } = useErpTranslation();

  if (!postingStatus || postingStatus.status === "not_posted") {
    return postingStatus?.status === "not_posted" ? (
      <Badge variant="outline" className={statusColors.not_posted}>
        {t("purchases.postingStatus.not_posted")}
      </Badge>
    ) : null;
  }

  return (
    <Badge variant="outline" className={statusColors[postingStatus.status] ?? ""}>
      {t(`purchases.postingStatus.${postingStatus.status}`, { defaultValue: postingStatus.status })}
    </Badge>
  );
}
