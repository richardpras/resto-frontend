import { Check } from "lucide-react";
import type { QrOrderTimelineEvent } from "@/lib/api-integration/qrOrderPublicEndpoints";

const STEPS = [
  { key: "pending_review", label: "Menunggu review" },
  { key: "confirmed", label: "Dikonfirmasi" },
  { key: "cooking", label: "Sedang dimasak" },
  { key: "ready", label: "Siap diantar" },
  { key: "served", label: "Sudah diantar" },
  { key: "completed", label: "Selesai" },
] as const;

type Props = {
  customerStatus: string;
  timelineStep: number | null;
  timeline?: QrOrderTimelineEvent[];
};

export function QrOrderStatusTimeline({ customerStatus, timelineStep, timeline = [] }: Props) {
  if (customerStatus === "cancelled") {
    return (
      <div
        className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-center"
        data-testid="qr-order-status-cancelled"
      >
        <p className="text-sm font-semibold text-destructive">Dibatalkan</p>
        <p className="text-xs text-muted-foreground mt-1">Pesanan ini tidak dilanjutkan.</p>
      </div>
    );
  }

  if (customerStatus === "adjusted" || customerStatus === "under_review") {
    return (
      <div className="space-y-3" data-testid="qr-order-status-adjusted">
        {customerStatus === "adjusted" && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Diubah kasir</p>
            <p className="text-xs text-muted-foreground mt-1">
              Pesanan Anda telah diperbarui oleh kasir. Mohon cek detail pesanan.
            </p>
          </div>
        )}
        <TimelineList activeStep={timelineStep} />
        {timeline.length > 0 && <TimelineEvents events={timeline} />}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <TimelineList activeStep={timelineStep} />
      {timeline.length > 0 && <TimelineEvents events={timeline} />}
    </div>
  );
}

function TimelineList({ activeStep }: { activeStep: number | null }) {
  const current = activeStep ?? 0;

  return (
    <ol className="space-y-0" data-testid="qr-order-status-timeline">
      {STEPS.map((step, index) => {
        const done = index < current;
        const active = index === current;
        const upcoming = index > current;

        return (
          <li key={step.key} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                  done
                    ? "bg-primary border-primary text-primary-foreground"
                    : active
                      ? "border-primary text-primary bg-primary/10"
                      : "border-muted-foreground/30 text-muted-foreground"
                }`}
                data-testid={`qr-timeline-step-${step.key}`}
                data-active={active ? "true" : "false"}
              >
                {done ? <Check className="h-4 w-4" /> : index + 1}
              </span>
              {index < STEPS.length - 1 && (
                <span className={`w-0.5 flex-1 min-h-8 ${done ? "bg-primary" : "bg-border"}`} />
              )}
            </div>
            <div className={`pb-5 pt-1.5 ${upcoming ? "text-muted-foreground" : "text-foreground"}`}>
              <p className={`text-sm ${active ? "font-semibold" : "font-medium"}`}>{step.label}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function TimelineEvents({ events }: { events: QrOrderTimelineEvent[] }) {
  return (
    <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-2" data-testid="qr-order-timeline-events">
      {events.map((event, index) => (
        <div key={`${event.status}-${index}`} className="text-xs">
          <p className="font-medium text-foreground">{event.label}</p>
          <p className="text-muted-foreground">
            {[event.actor, event.timestamp ? new Date(event.timestamp).toLocaleString() : null]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      ))}
    </div>
  );
}
