import { useEffect, useState } from "react";
import { Banknote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { usePosSessionStore } from "@/stores/posSessionStore";

type Props = {
  outletId: number | null | undefined;
};

export function PosSessionPanel({ outletId }: Props) {
  const currentSession = usePosSessionStore((s) => s.currentSession);
  const bootstrapSyncedOutletId = usePosSessionStore((s) => s.bootstrapSyncedOutletId);
  const fetchCurrent = usePosSessionStore((s) => s.fetchCurrent);
  const openSession = usePosSessionStore((s) => s.open);
  const closeSession = usePosSessionStore((s) => s.close);
  const [openDialog, setOpenDialog] = useState(false);
  const [closeDialog, setCloseDialog] = useState(false);
  const [openingCash, setOpeningCash] = useState("0");
  const [closingCash, setClosingCash] = useState("0");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof outletId !== "number" || outletId < 1) return;
    if (bootstrapSyncedOutletId === outletId) return;
    void fetchCurrent(outletId).catch(() => undefined);
  }, [outletId, bootstrapSyncedOutletId, fetchCurrent]);

  if (typeof outletId !== "number" || outletId < 1) return null;

  const handleOpen = async () => {
    setBusy(true);
    try {
      await openSession(outletId, Number(openingCash) || 0, notes || undefined);
      toast.success("POS session opened.");
      setOpenDialog(false);
      setNotes("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to open session");
    } finally {
      setBusy(false);
    }
  };

  const handleClose = async () => {
    if (!currentSession?.id) return;
    setBusy(true);
    try {
      await closeSession(currentSession.id, Number(closingCash) || 0, notes || undefined);
      toast.success("POS session closed.");
      setCloseDialog(false);
      setNotes("");
      await fetchCurrent(outletId);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to close session");
    } finally {
      setBusy(false);
    }
  };

  const isOpen = currentSession?.status === "open";

  return (
    <div className="flex items-center gap-2 text-xs">
      <Banknote className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="text-muted-foreground">
        Session: {isOpen ? `Open #${currentSession.id}` : "None"}
        {isOpen && currentSession.openingCash != null ? ` · Opening Rp ${currentSession.openingCash.toLocaleString("id-ID")}` : ""}
      </span>
      {!isOpen ? (
        <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={() => setOpenDialog(true)}>
          Open
        </Button>
      ) : (
        <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={() => setCloseDialog(true)}>
          Close
        </Button>
      )}

      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Open POS Session</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm">Opening Cash</label>
              <Input type="number" value={openingCash} onChange={(e) => setOpeningCash(e.target.value)} />
            </div>
            <div>
              <label className="text-sm">Notes</label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => void handleOpen()} disabled={busy}>Open Session</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={closeDialog} onOpenChange={setCloseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close POS Session</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm">Closing Cash</label>
              <Input type="number" value={closingCash} onChange={(e) => setClosingCash(e.target.value)} />
            </div>
            <div>
              <label className="text-sm">Notes</label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => void handleClose()} disabled={busy}>Close Session</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
