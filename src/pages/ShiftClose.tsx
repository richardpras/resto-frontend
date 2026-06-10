import { useEffect, useState } from "react";
import { LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useOutletStore } from "@/stores/outletStore";
import { getAccountingSettings } from "@/lib/api-integration/accountingEndpoints";
import { postShiftClose } from "@/lib/api-integration/posFinanceEndpoints";

const TENANT_ID = Number(import.meta.env.VITE_API_TENANT_ID ?? 1) || 1;

export default function ShiftClose() {
  const activeOutletId = useOutletStore((s) => s.activeOutletId);
  const [postingMode, setPostingMode] = useState<string>("—");
  const [submitting, setSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState<Record<string, unknown> | null>(null);
  const [cashCode, setCashCode] = useState("");
  const [revenueCode, setRevenueCode] = useState("");
  const [cogsCode, setCogsCode] = useState("");
  const [inventoryCode, setInventoryCode] = useState("");

  useEffect(() => {
    if (typeof activeOutletId !== "number" || activeOutletId < 1) return;
    void getAccountingSettings({ outletId: activeOutletId, tenantId: TENANT_ID })
      .then((s) => setPostingMode(s.revenuePostingMode))
      .catch(() => setPostingMode("unknown"));
  }, [activeOutletId]);

  const runShiftClose = async () => {
    if (typeof activeOutletId !== "number" || activeOutletId < 1) {
      toast.error("Select an outlet first.");
      return;
    }
    if (postingMode !== "shift_close") {
      toast.error("Revenue posting mode must be shift_close in Accounting settings.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await postShiftClose({
        tenantId: TENANT_ID,
        outletId: activeOutletId,
        ...(cashCode.trim() ? { cashAccountCode: cashCode.trim() } : {}),
        ...(revenueCode.trim() ? { revenueAccountCode: revenueCode.trim() } : {}),
        ...(cogsCode.trim() ? { cogsAccountCode: cogsCode.trim() } : {}),
        ...(inventoryCode.trim() ? { inventoryAccountCode: inventoryCode.trim() } : {}),
      });
      setLastResult(result as Record<string, unknown>);
      toast.success("Shift close posting completed.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Shift close failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <LockKeyhole className="h-6 w-6" /> Shift Close
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Batch-post paid orders to the general ledger. Requires <code className="text-xs">finance.shift_close</code> and shift_close revenue mode.
        </p>
      </div>
      <Card className="p-4 space-y-3">
        <p className="text-sm">
          Revenue posting mode: <span className="font-semibold">{postingMode}</span>
        </p>
        {postingMode !== "shift_close" && (
          <p className="text-xs text-amber-700 dark:text-amber-300">
            Switch to shift_close in Accounting → Health before running shift close.
          </p>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Cash Account (optional)</Label>
            <Input value={cashCode} onChange={(e) => setCashCode(e.target.value)} placeholder="1000" />
          </div>
          <div>
            <Label>Revenue Account (optional)</Label>
            <Input value={revenueCode} onChange={(e) => setRevenueCode(e.target.value)} placeholder="4000" />
          </div>
          <div>
            <Label>COGS Account (optional)</Label>
            <Input value={cogsCode} onChange={(e) => setCogsCode(e.target.value)} placeholder="5000" />
          </div>
          <div>
            <Label>Inventory Account (optional)</Label>
            <Input value={inventoryCode} onChange={(e) => setInventoryCode(e.target.value)} placeholder="1300" />
          </div>
        </div>
        <Button onClick={() => void runShiftClose()} disabled={submitting || postingMode !== "shift_close"}>
          {submitting ? "Posting…" : "Run Shift Close"}
        </Button>
        {lastResult && (
          <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto">{JSON.stringify(lastResult, null, 2)}</pre>
        )}
      </Card>
    </div>
  );
}
