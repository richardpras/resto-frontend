import { useEffect, useState } from "react";
import { ArrowDownToLine, ArrowUpFromLine, Banknote, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { usePosSessionStore } from "@/stores/posSessionStore";
import { CashDrawerReconciliationPanel } from "@/components/pos/CashDrawerReconciliationPanel";
import {
  POS_CASH_IN_CATEGORIES,
  POS_CASH_OUT_CATEGORIES,
  type PosCashMovementDirection,
  type PosSessionClosePreview,
} from "@/lib/api-integration/posSessionEndpoints";
import { formatMoney } from "@/lib/format/currency";
import { useOpsTranslation } from "@/i18n/useOpsTranslation";

type Props = {
  outletId: number | null | undefined;
};

export function PosSessionPanel({ outletId }: Props) {
  const { t } = useOpsTranslation();
  const currentSession = usePosSessionStore((s) => s.currentSession);
  const defaultCashFloat = usePosSessionStore((s) => s.defaultCashFloat);
  const bootstrapSyncedOutletId = usePosSessionStore((s) => s.bootstrapSyncedOutletId);
  const cashMovements = usePosSessionStore((s) => s.cashMovements);
  const fetchCurrent = usePosSessionStore((s) => s.fetchCurrent);
  const openSession = usePosSessionStore((s) => s.open);
  const previewClose = usePosSessionStore((s) => s.previewClose);
  const closeSession = usePosSessionStore((s) => s.close);
  const fetchCashMovements = usePosSessionStore((s) => s.fetchCashMovements);
  const addCashMovement = usePosSessionStore((s) => s.addCashMovement);
  const [openDialog, setOpenDialog] = useState(false);
  const [closeDialog, setCloseDialog] = useState(false);
  const [cashDialog, setCashDialog] = useState<PosCashMovementDirection | null>(null);
  const [openingCash, setOpeningCash] = useState("");
  const [actualCash, setActualCash] = useState("");
  const [notes, setNotes] = useState("");
  const [cashAmount, setCashAmount] = useState("");
  const [cashCategory, setCashCategory] = useState("");
  const [cashNotes, setCashNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [closePreview, setClosePreview] = useState<PosSessionClosePreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    if (typeof outletId !== "number" || outletId < 1) return;
    if (bootstrapSyncedOutletId === outletId) return;
    void fetchCurrent(outletId).catch(() => undefined);
  }, [outletId, bootstrapSyncedOutletId, fetchCurrent]);

  useEffect(() => {
    if (openDialog) {
      setOpeningCash(String(defaultCashFloat));
    }
  }, [openDialog, defaultCashFloat]);

  useEffect(() => {
    if (!currentSession?.id || currentSession.status !== "open") return;
    void fetchCashMovements(currentSession.id).catch(() => undefined);
  }, [currentSession?.id, currentSession?.status, fetchCashMovements]);

  useEffect(() => {
    if (!closeDialog || !currentSession?.id) {
      setClosePreview(null);
      return;
    }
    setPreviewLoading(true);
    void previewClose(currentSession.id)
      .then((data) => {
        setClosePreview(data);
        setActualCash("");
      })
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : t("posSession.closePreviewFailed"));
        setCloseDialog(false);
      })
      .finally(() => setPreviewLoading(false));
  }, [closeDialog, currentSession?.id, previewClose, t]);

  useEffect(() => {
    if (!cashDialog) return;
    const cats = cashDialog === "in" ? POS_CASH_IN_CATEGORIES : POS_CASH_OUT_CATEGORIES;
    setCashCategory(cats[0]);
    setCashAmount("");
    setCashNotes("");
  }, [cashDialog]);

  if (typeof outletId !== "number" || outletId < 1) return null;

  const handleOpen = async () => {
    setBusy(true);
    try {
      const parsed = openingCash.trim() ? Number(openingCash) : undefined;
      await openSession(outletId, parsed, notes || undefined);
      toast.success(t("posSession.opened"));
      setOpenDialog(false);
      setNotes("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("posSession.openFailed"));
    } finally {
      setBusy(false);
    }
  };

  const handleClose = async () => {
    if (!currentSession?.id) return;
    const parsed = Number(actualCash);
    if (!actualCash.trim() || Number.isNaN(parsed)) {
      toast.error(t("posSession.actualCashRequired"));
      return;
    }
    setBusy(true);
    try {
      await closeSession(currentSession.id, parsed, notes || undefined);
      toast.success(t("posSession.closed"));
      setCloseDialog(false);
      setNotes("");
      setActualCash("");
      await fetchCurrent(outletId);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("posSession.closeFailed"));
    } finally {
      setBusy(false);
    }
  };

  const handleCashMovement = async () => {
    if (!currentSession?.id || !cashDialog) return;
    const parsed = Number(cashAmount);
    if (!cashAmount.trim() || Number.isNaN(parsed) || parsed <= 0) {
      toast.error(t("posSession.cashMovement.amountRequired"));
      return;
    }
    if (!cashCategory) {
      toast.error(t("posSession.cashMovement.categoryRequired"));
      return;
    }
    setBusy(true);
    try {
      await addCashMovement({
        sessionId: currentSession.id,
        direction: cashDialog,
        amount: parsed,
        category: cashCategory,
        notes: cashNotes || undefined,
      });
      toast.success(
        cashDialog === "in" ? t("posSession.cashMovement.inSaved") : t("posSession.cashMovement.outSaved"),
      );
      setCashDialog(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("posSession.cashMovement.failed"));
    } finally {
      setBusy(false);
    }
  };

  const isOpen = currentSession?.status === "open";
  const categories = cashDialog === "in" ? POS_CASH_IN_CATEGORIES : POS_CASH_OUT_CATEGORIES;
  const recentMovements = cashMovements.slice(0, 5);

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs min-w-0">
      <Banknote className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <span className="text-muted-foreground min-w-0 truncate">
        {t("posSession.label")}: {isOpen ? t("posSession.openLabel", { id: currentSession.id }) : t("posSession.none")}
        {isOpen && currentSession.openingCash != null
          ? ` · ${t("posSession.openingCashShort", { amount: formatMoney(currentSession.openingCash) })}`
          : ""}
      </span>
      {!isOpen ? (
        <Button type="button" size="sm" variant="outline" className="h-7 text-xs shrink-0" onClick={() => setOpenDialog(true)}>
          {t("posSession.openShift")}
        </Button>
      ) : (
        <>
          <Button type="button" size="sm" variant="outline" className="h-7 text-xs shrink-0" onClick={() => setCashDialog("in")}>
            <ArrowDownToLine className="h-3 w-3 mr-1" />
            {t("posSession.cashMovement.cashIn")}
          </Button>
          <Button type="button" size="sm" variant="outline" className="h-7 text-xs shrink-0" onClick={() => setCashDialog("out")}>
            <ArrowUpFromLine className="h-3 w-3 mr-1" />
            {t("posSession.cashMovement.cashOut")}
          </Button>
          <Button type="button" size="sm" variant="outline" className="h-7 text-xs shrink-0" onClick={() => setCloseDialog(true)}>
            {t("posSession.closeShift")}
          </Button>
        </>
      )}

      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("posSession.openShiftTitle")}</DialogTitle>
            <DialogDescription>{t("posSession.defaultFloatHint", { amount: formatMoney(defaultCashFloat) })}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="openingCash">{t("shiftClose.openingCash")}</Label>
              <Input
                id="openingCash"
                type="number"
                min={0}
                value={openingCash}
                onChange={(e) => setOpeningCash(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="openNotes">{t("posSession.notes")}</Label>
              <Input id="openNotes" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => void handleOpen()} disabled={busy}>
              {t("posSession.openShift")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={cashDialog !== null} onOpenChange={(open) => !open && setCashDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {cashDialog === "in" ? t("posSession.cashMovement.cashInTitle") : t("posSession.cashMovement.cashOutTitle")}
            </DialogTitle>
            <DialogDescription>{t("posSession.cashMovement.hint")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="cashAmount">{t("posSession.cashMovement.amount")}</Label>
              <Input
                id="cashAmount"
                type="number"
                min={0}
                value={cashAmount}
                onChange={(e) => setCashAmount(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="cashCategory">{t("posSession.cashMovement.category")}</Label>
              <select
                id="cashCategory"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={cashCategory}
                onChange={(e) => setCashCategory(e.target.value)}
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {t(`posSession.cashMovement.categories.${cat}`)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="cashNotes">{t("posSession.notes")}</Label>
              <Input id="cashNotes" value={cashNotes} onChange={(e) => setCashNotes(e.target.value)} />
            </div>
            {recentMovements.length > 0 ? (
              <ul className="text-xs text-muted-foreground space-y-1 border-t pt-2 max-h-28 overflow-auto">
                {recentMovements.map((m) => (
                  <li key={`${m.id}-${m.clientLocalRef ?? ""}`}>
                    {m.direction === "in" ? "+" : "−"}
                    {formatMoney(m.amount)} · {t(`posSession.cashMovement.categories.${m.category}`, { defaultValue: m.category })}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCashDialog(null)} disabled={busy}>
              {t("shared.cancel")}
            </Button>
            <Button onClick={() => void handleCashMovement()} disabled={busy}>
              {t("posSession.cashMovement.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={closeDialog} onOpenChange={setCloseDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("posSession.closeShiftTitle")}</DialogTitle>
            <DialogDescription>{t("posSession.cashDrawerTitle", { defaultValue: "Count the cash drawer and confirm closing this shift." })}</DialogDescription>
          </DialogHeader>
          {previewLoading || !closePreview ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              {t("shared.loading")}
            </div>
          ) : (
            <div className="space-y-4">
              <CashDrawerReconciliationPanel
                drawer={closePreview.drawerReconciliation}
                actualCash={actualCash}
                onActualCashChange={setActualCash}
                titleKey="posSession.cashDrawerTitle"
              />
              <p className="text-xs text-muted-foreground">
                {t("posSession.nextShiftFloatHint", { amount: formatMoney(closePreview.defaultCashFloat) })}
              </p>
              <p className="text-xs text-muted-foreground">{t("posSession.varianceExternalHint")}</p>
              <div>
                <Label htmlFor="closeNotes">{t("posSession.notes")}</Label>
                <Input id="closeNotes" value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseDialog(false)} disabled={busy}>
              {t("shared.cancel")}
            </Button>
            <Button onClick={() => void handleClose()} disabled={busy || previewLoading || !closePreview}>
              {t("posSession.confirmCloseShift")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
