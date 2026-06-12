import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, ExternalLink, LockKeyhole } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { useOutletStore } from "@/stores/outletStore";
import {
  getShiftClosePreflight,
  postShiftCloseRun,
  type ShiftClosePreflight,
  type ShiftCloseRunResult,
} from "@/lib/api-integration/shiftCloseEndpoints";
import { ShiftClosePreflightCards } from "@/components/shift-close/ShiftClosePreflightCards";
import { ShiftCloseCashDrawerPanel } from "@/components/shift-close/ShiftCloseCashDrawerPanel";
import { formatMoney } from "@/lib/format/currency";

const TENANT_ID = Number(import.meta.env.VITE_API_TENANT_ID ?? 1) || 1;
const STEPS = ["Preflight", "Cash Drawer", "Warnings", "Run Close", "Complete"] as const;

export default function ShiftClose() {
  const activeOutletId = useOutletStore((s) => s.activeOutletId);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [closing, setClosing] = useState(false);
  const [preflight, setPreflight] = useState<ShiftClosePreflight | null>(null);
  const [actualCash, setActualCash] = useState("");
  const [result, setResult] = useState<ShiftCloseRunResult | null>(null);

  const loadPreflight = async () => {
    if (typeof activeOutletId !== "number" || activeOutletId < 1) return;
    setLoading(true);
    try {
      const data = await getShiftClosePreflight(activeOutletId, TENANT_ID);
      setPreflight(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Preflight failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPreflight();
    setStep(0);
    setResult(null);
    setClosing(false);
  }, [activeOutletId]);

  const goAfterCash = () => {
    if (preflight?.severity === "warning") {
      setStep(2);
    } else {
      setStep(3);
    }
  };

  const runClose = async (opts: { confirm?: boolean; force?: boolean }) => {
    if (typeof activeOutletId !== "number" || activeOutletId < 1 || closing) return;
    setClosing(true);
    try {
      const parsedCash = actualCash.trim() ? Number(actualCash) : undefined;
      const data = await postShiftCloseRun({
        outletId: activeOutletId,
        tenantId: TENANT_ID,
        confirm: opts.confirm ?? true,
        force: opts.force ?? false,
        ...(parsedCash !== undefined && !Number.isNaN(parsedCash) ? { actualCash: parsedCash } : {}),
      });
      setResult(data);
      setStep(4);
      toast.success("Shift closed successfully.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Shift close failed");
    } finally {
      setClosing(false);
    }
  };

  if (typeof activeOutletId !== "number" || activeOutletId < 1) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold">Shift Close</h1>
        <p className="text-sm text-muted-foreground mt-2">Select an outlet to begin.</p>
      </div>
    );
  }

  const severity = preflight?.severity ?? "healthy";
  const isBlocked = severity === "block";
  const drawer = preflight?.drawerReconciliation;
  const qr = preflight?.qrOrders;

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <LockKeyhole className="h-6 w-6" /> Shift Close
        </h1>
        <p className="text-sm text-muted-foreground mt-1">End-of-shift preflight, drawer reconciliation, and posting.</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {STEPS.map((name, i) => (
          <button
            key={name}
            type="button"
            onClick={() => i <= step && setStep(i)}
            className={`text-xs px-3 py-1 rounded-full border ${
              i === step ? "bg-primary text-primary-foreground" : i < step ? "bg-muted" : "opacity-50"
            }`}
          >
            {i + 1}. {name}
          </button>
        ))}
      </div>

      {step === 0 && (
        <Card className="p-4 space-y-4">
          <div className="flex items-center gap-2 capitalize">
            {isBlocked ? <AlertTriangle className="h-5 w-5 text-destructive" /> : severity === "warning" ? <AlertTriangle className="h-5 w-5 text-amber-500" /> : <CheckCircle2 className="h-5 w-5 text-green-600" />}
            <span className="font-medium">Severity: {severity}</span>
          </div>
          {preflight ? <ShiftClosePreflightCards preflight={preflight} /> : <p className="text-sm text-muted-foreground">{loading ? "Loading…" : "No data"}</p>}
          {preflight?.openPosSessions?.items?.length ? (
            <ul className="text-xs space-y-1 text-muted-foreground">
              {preflight.openPosSessions.items.map((s) => (
                <li key={s.id}>{s.cashierName} — opened {s.openedAt ? new Date(s.openedAt).toLocaleString() : "—"} — {formatMoney(s.openingCash)}</li>
              ))}
            </ul>
          ) : null}
          {qr && (
            <p className="text-xs text-muted-foreground">
              QR: pending {qr.pending}, under review {qr.underReview}, linked unpaid {qr.linkedUnpaidBills}
            </p>
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => void loadPreflight()} disabled={loading}>Refresh</Button>
            <Button onClick={() => setStep(1)} disabled={loading || isBlocked || !preflight}>Continue</Button>
          </div>
        </Card>
      )}

      {step === 1 && drawer && (
        <Card className="p-4 space-y-4">
          <ShiftCloseCashDrawerPanel drawer={drawer} actualCash={actualCash} onActualCashChange={setActualCash} />
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(0)}>Back</Button>
            <Button onClick={goAfterCash}>Continue</Button>
          </div>
        </Card>
      )}

      {step === 2 && preflight?.severity === "warning" && (
        <Card className="p-4 space-y-4">
          <p className="text-sm text-amber-700 dark:text-amber-300">Preflight warnings detected. Review before closing anyway.</p>
          <ul className="text-sm list-disc pl-5 space-y-1">
            {(preflight.warnings ?? []).map((w) => (
              <li key={w}>{w.replace(/_/g, " ")}</li>
            ))}
          </ul>
          {isBlocked ? (
            <p className="text-sm text-destructive">Block policy active — resolve required issues first.</p>
          ) : (
            <Button onClick={() => setStep(3)}>Close Anyway — Continue</Button>
          )}
          <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
        </Card>
      )}

      {step === 3 && (
        <Card className="p-4 space-y-4">
          <p className="text-sm text-muted-foreground">Inventory and accounting posting will run. This may take a moment.</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(preflight?.severity === "warning" ? 2 : 1)} disabled={closing}>Back</Button>
            <Button
              onClick={() => void runClose({ confirm: true, force: preflight?.severity === "warning" })}
              disabled={closing || isBlocked}
            >
              {closing ? "Closing…" : "Confirm & Close Shift"}
            </Button>
          </div>
        </Card>
      )}

      {step === 4 && result && (
        <Card className="p-4 space-y-4">
          <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
            <CheckCircle2 className="h-6 w-6" />
            <span className="font-semibold text-lg">Shift Closed — {result.status ?? "completed"}</span>
          </div>
          <div className="text-sm space-y-2">
            <div className="flex justify-between"><span className="text-muted-foreground">Sales</span><span>{formatMoney(result.totalSales)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Cash variance</span><span>{result.cash.variance != null ? formatMoney(result.cash.variance) : "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Inventory processed</span><span>{result.inventory.processed}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Journal</span><span>{result.journalId ?? "—"}</span></div>
          </div>
          <Button variant="outline" asChild>
            <Link to={`/shift-close?report=${result.runId}`}>
              <ExternalLink className="h-4 w-4 mr-2" /> View report (run #{result.runId})
            </Link>
          </Button>
          <Button variant="outline" onClick={() => { setStep(0); void loadPreflight(); }}>Start New Close</Button>
        </Card>
      )}
    </div>
  );
}
