import { useCallback, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Activity } from "lucide-react";
import { toast } from "sonner";
import {
  getAccountingHealth,
  getAccountingSettings,
  listAccountingPostingFailures,
  retryAccountingPostingFailure,
  updateAccountingSettings,
  type AccountingHealth,
  type AccountingPostingFailureRow,
  type AccountingSettings,
} from "@/lib/api-integration/accountingEndpoints";
import { useOutletStore } from "@/stores/outletStore";

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-semibold mt-1">{value}</p>
      </CardContent>
    </Card>
  );
}

export default function AccountingHealth() {
  const activeOutletId = useOutletStore((s) => s.activeOutletId);
  const [health, setHealth] = useState<AccountingHealth | null>(null);
  const [settings, setSettings] = useState<AccountingSettings | null>(null);
  const [failures, setFailures] = useState<AccountingPostingFailureRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const scope = typeof activeOutletId === "number" && activeOutletId >= 1 ? { outletId: activeOutletId } : undefined;
      const [h, s, f] = await Promise.all([
        getAccountingHealth(scope),
        getAccountingSettings(scope),
        listAccountingPostingFailures("pending"),
      ]);
      setHealth(h);
      setSettings(s);
      setFailures(f);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load accounting health");
    } finally {
      setLoading(false);
    }
  }, [activeOutletId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleModeChange = async (mode: "realtime" | "shift_close") => {
    try {
      const scope = typeof activeOutletId === "number" && activeOutletId >= 1 ? { outletId: activeOutletId } : {};
      const updated = await updateAccountingSettings({ revenuePostingMode: mode, ...scope });
      setSettings(updated);
      toast.success("Revenue posting mode updated");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update settings");
    }
  };

  const handleRetry = async (id: string) => {
    try {
      await retryAccountingPostingFailure(id);
      toast.success("Posting retry succeeded");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Retry failed");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Accounting Health</h2>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw className="h-4 w-4 mr-1" /> Refresh
        </Button>
      </div>

      {health && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard label="Health Score" value={health.healthScore} />
          <MetricCard label="Failed Postings" value={health.failedPostings} />
          <MetricCard label="Pending Postings" value={health.pendingPostings} />
          <MetricCard label="Missing Mappings" value={health.missingMappings} />
          <MetricCard label="Unbalanced Attempts" value={health.unbalancedJournalAttempts} />
          <MetricCard label="Duplicate Attempts" value={health.duplicatePostingAttempts} />
          <MetricCard label="Open Periods" value={health.openPeriods} />
          <MetricCard label="Locked Periods" value={health.lockedPeriods} />
        </div>
      )}

      <Card>
        <CardContent className="p-4 space-y-3">
          <p className="text-sm font-medium">Revenue Posting Mode</p>
          <Select
            value={settings?.revenuePostingMode ?? "realtime"}
            onValueChange={(v) => void handleModeChange(v as "realtime" | "shift_close")}
          >
            <SelectTrigger className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="realtime">Realtime (order payment)</SelectItem>
              <SelectItem value="shift_close">Shift Close (batch)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Only one revenue posting path is active. Realtime posts on payment; Shift Close posts during shift close.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <p className="p-3 text-sm font-medium border-b">Posting Failures</p>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead>Source</TableHead>
                <TableHead>Error</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {failures.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No pending failures.</TableCell>
                </TableRow>
              )}
              {failures.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-mono text-xs">{row.sourceType} #{row.sourceId}</TableCell>
                  <TableCell className="text-sm max-w-xs truncate" title={row.errorMessage}>{row.errorCode}: {row.errorMessage}</TableCell>
                  <TableCell className="text-sm">{row.createdAt ? new Date(row.createdAt).toLocaleString() : "—"}</TableCell>
                  <TableCell><Badge variant="outline">{row.status}</Badge></TableCell>
                  <TableCell className="text-right">
                    {row.status === "pending" && (
                      <Button size="sm" variant="outline" onClick={() => void handleRetry(row.id)}>Retry</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
