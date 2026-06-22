import { useEffect, useState } from "react";
import { Banknote, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { usePosSessionStore } from "@/stores/posSessionStore";
import { CashDrawerReconciliationPanel } from "@/components/pos/CashDrawerReconciliationPanel";
import type { PosSessionClosePreview } from "@/lib/api-integration/posSessionEndpoints";
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
  const fetchCurrent = usePosSessionStore((s) => s.fetchCurrent);
  const openSession = usePosSessionStore((s) => s.open);
  const previewClose = usePosSessionStore((s) => s.previewClose);
  const closeSession = usePosSessionStore((s) => s.close);
  const [openDialog, setOpenDialog] = useState(false);
  const [closeDialog, setCloseDialog] = useState(false);
  const [openingCash, setOpeningCash] = useState("");
  const [actualCash, setActualCash] = useState("");
  const [notes, setNotes] = useState("");
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

  const isOpen = currentSession?.status === "open";

  return (
    <div className="flex items-center gap-2 text-xs">
      <Banknote className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="text-muted-foreground">
        {t("posSession.label")}: {isOpen ? t("posSession.openLabel", { id: currentSession.id }) : t("posSession.none")}
        {isOpen && currentSession.openingCash != null
          ? ` · ${t("posSession.openingCashShort", { amount: formatMoney(currentSession.openingCash) })}`
          : ""}
      </span>
      {!isOpen ? (
        <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={() => setOpenDialog(true)}>
          {t("posSession.openShift")}
        </Button>
      ) : (
        <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={() => setCloseDialog(true)}>
          {t("posSession.closeShift")}
        </Button>
      )}

      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("posSession.openShiftTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {t("posSession.defaultFloatHint", { amount: formatMoney(defaultCashFloat) })}
            </p>
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

      <Dialog open={closeDialog} onOpenChange={setCloseDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("posSession.closeShiftTitle")}</DialogTitle>
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
