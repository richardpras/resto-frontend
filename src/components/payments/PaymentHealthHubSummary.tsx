import { useEffect, useState } from "react";
import { getPaymentHealth, type PaymentHealthReport } from "@/lib/api-integration/paymentEndpoints";
import { useOutletStore } from "@/stores/outletStore";

export function PaymentHealthHubSummary() {
  const activeOutletId = useOutletStore((s) => s.activeOutletId);
  const [health, setHealth] = useState<PaymentHealthReport | null>(null);

  useEffect(() => {
    const scope =
      typeof activeOutletId === "number" && activeOutletId >= 1 ? { outletId: activeOutletId } : undefined;
    void getPaymentHealth(scope)
      .then(setHealth)
      .catch(() => setHealth(null));
  }, [activeOutletId]);

  if (!health) {
    return <p className="text-xs text-muted-foreground mt-2">Loading payment health summary…</p>;
  }

  return (
    <dl className="text-xs mt-2 grid grid-cols-3 gap-2">
      <div>
        <dt className="text-muted-foreground">Severity</dt>
        <dd className="font-medium capitalize">{health.healthSeverity ?? health.status}</dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Open incidents</dt>
        <dd className="font-medium">{health.openIncidents ?? 0}</dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Reliability</dt>
        <dd className="font-medium">{health.reliabilityScore ?? 100}%</dd>
      </div>
    </dl>
  );
}
