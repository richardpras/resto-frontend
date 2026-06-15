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
import { useOpsTranslation } from "@/i18n/useOpsTranslation";

const TENANT_ID = Number(import.meta.env.VITE_API_TENANT_ID ?? 1) || 1;
const STEP_KEYS = ["preflight", "cashDrawer", "warnings", "runClose", "complete"] as const;

export default function ShiftClose() {
  const { t } = useOpsTranslation();
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
      toast.error(e instanceof Error ? e.message : t("shiftClose.preflightFailed"));
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
      toast.success(t("shiftClose.success"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("shiftClose.failed"));
    } finally {
      setClosing(false);
    }
  };

  if (typeof activeOutletId !== "number" || activeOutletId < 1) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold">{t("shiftClose.title")}</h1>
        <p className="text-sm text-muted-foreground mt-2">{t("shiftClose.selectOutlet")}</p>
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
          <LockKeyhole className="h-6 w-6" /> {t("shiftClose.title")}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{t("shiftClose.subtitle")}</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {STEP_KEYS.map((key, i) => (
          <button
            key={key}
            type="button"
            onClick={() => i <= step && setStep(i)}
            className={`text-xs px-3 py-1 rounded-full border ${
              i === step ? "bg-primary text-primary-foreground" : i < step ? "bg-muted" : "opacity-50"
            }`}
          >
            {i + 1}. {t(`shiftClose.steps.${key}`)}
          </button>
        ))}
      </div>

      {step === 0 && (
        <Card className="p-4 space-y-4">
          <div className="flex items-center gap-2 capitalize">
            {isBlocked ? <AlertTriangle className="h-5 w-5 text-destructive" /> : severity === "warning" ? <AlertTriangle className="h-5 w-5 text-amber-500" /> : <CheckCircle2 className="h-5 w-5 text-green-600" />}
            <span className="font-medium">{t("shiftClose.severity", { severity })}</span>
          </div>
          {preflight ? <ShiftClosePreflightCards preflight={preflight} /> : <p className="text-sm text-muted-foreground">{loading ? t("shared.loading") : t("shared.noData")}</p>}
          {preflight?.openPosSessions?.items?.length ? (
            <ul className="text-xs space-y-1 text-muted-foreground">
              {preflight.openPosSessions.items.map((s) => (
                <li key={s.id}>
                  {t("shiftClose.openedSession", {
                    name: s.cashierName,
                    at: s.openedAt ? new Date(s.openedAt).toLocaleString() : "—",
                    amount: formatMoney(s.openingCash),
                  })}
                </li>
              ))}
            </ul>
          ) : null}
          {qr && (
            <p className="text-xs text-muted-foreground">
              {t("shiftClose.qrSummary", {
                pending: qr.pending,
                review: qr.underReview,
                unpaid: qr.linkedUnpaidBills,
              })}
            </p>
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => void loadPreflight()} disabled={loading}>
              {t("common:common.refresh")}
            </Button>
            <Button onClick={() => setStep(1)} disabled={loading || isBlocked || !preflight}>
              {t("shared.continue")}
            </Button>
          </div>
        </Card>
      )}

      {step === 1 && drawer && (
        <Card className="p-4 space-y-4">
          <ShiftCloseCashDrawerPanel drawer={drawer} actualCash={actualCash} onActualCashChange={setActualCash} />
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(0)}>
              {t("shared.back")}
            </Button>
            <Button onClick={goAfterCash}>{t("shared.continue")}</Button>
          </div>
        </Card>
      )}

      {step === 2 && preflight?.severity === "warning" && (
        <Card className="p-4 space-y-4">
          <p className="text-sm text-amber-700 dark:text-amber-300">{t("shiftClose.warningsDetected")}</p>
          <ul className="text-sm list-disc pl-5 space-y-1">
            {(preflight.warnings ?? []).map((w) => (
              <li key={w}>{w.replace(/_/g, " ")}</li>
            ))}
          </ul>
          {isBlocked ? (
            <p className="text-sm text-destructive">{t("shiftClose.blockPolicy")}</p>
          ) : (
            <Button onClick={() => setStep(3)}>{t("shiftClose.closeAnyway")}</Button>
          )}
          <Button variant="outline" onClick={() => setStep(1)}>
            {t("shared.back")}
          </Button>
        </Card>
      )}

      {step === 3 && (
        <Card className="p-4 space-y-4">
          <p className="text-sm text-muted-foreground">{t("shiftClose.runHint")}</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(preflight?.severity === "warning" ? 2 : 1)} disabled={closing}>
              {t("shared.back")}
            </Button>
            <Button
              onClick={() => void runClose({ confirm: true, force: preflight?.severity === "warning" })}
              disabled={closing || isBlocked}
            >
              {closing ? t("shiftClose.closing") : t("shiftClose.confirmClose")}
            </Button>
          </div>
        </Card>
      )}

      {step === 4 && result && (
        <Card className="p-4 space-y-4">
          <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
            <CheckCircle2 className="h-6 w-6" />
            <span className="font-semibold text-lg">
              {t("shiftClose.closedTitle", { status: result.status ?? "completed" })}
            </span>
          </div>
          <div className="text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("shiftClose.sales")}</span>
              <span>{formatMoney(result.totalSales)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("shiftClose.cashVariance")}</span>
              <span>{result.cash.variance != null ? formatMoney(result.cash.variance) : "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("shiftClose.inventoryProcessed")}</span>
              <span>{result.inventory.processed}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("shiftClose.journal")}</span>
              <span>{result.journalId ?? "—"}</span>
            </div>
          </div>
          <Button variant="outline" asChild>
            <Link to={`/shift-close?report=${result.runId}`}>
              <ExternalLink className="h-4 w-4 mr-2" /> {t("shiftClose.viewReport", { id: result.runId })}
            </Link>
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setStep(0);
              void loadPreflight();
            }}
          >
            {t("shiftClose.startNew")}
          </Button>
        </Card>
      )}
    </div>
  );
}
