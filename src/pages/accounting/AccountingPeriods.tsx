import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAccountingStore } from "@/stores/accountingStore";

export default function AccountingPeriods() {
  const accountingPeriods = useAccountingStore((s) => s.accountingPeriods);
  const accountingPeriodsLoading = useAccountingStore((s) => s.accountingPeriodsLoading);
  const accountingPeriodsSubmitting = useAccountingStore((s) => s.accountingPeriodsSubmitting);
  const accountingPeriodsPagination = useAccountingStore((s) => s.accountingPeriodsPagination);
  const fetchAccountingPeriods = useAccountingStore((s) => s.fetchAccountingPeriods);
  const createAccountingPeriod = useAccountingStore((s) => s.createAccountingPeriod);
  const closeAccountingPeriod = useAccountingStore((s) => s.closeAccountingPeriod);
  const openAccountingPeriod = useAccountingStore((s) => s.openAccountingPeriod);

  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    void fetchAccountingPeriods().catch((e) => {
      toast.error(e instanceof Error ? e.message : "Failed to fetch accounting periods");
    });
  }, [fetchAccountingPeriods]);

  const handleCreate = async () => {
    try {
      await createAccountingPeriod({ name, startDate, endDate });
      setName("");
      setStartDate("");
      setEndDate("");
      toast.success("Accounting period created");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create accounting period");
    }
  };

  const handleToggle = async (periodId: string, status: "open" | "closed") => {
    try {
      if (status === "open") {
        await closeAccountingPeriod(periodId);
        toast.success("Accounting period closed");
      } else {
        await openAccountingPeriod(periodId);
        toast.success("Accounting period opened");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update accounting period");
    }
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div>
          <Label>Period Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="May 2026" />
        </div>
        <div>
          <Label>Start Date</Label>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div>
          <Label>End Date</Label>
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
        <div className="flex items-end">
          <Button className="w-full" onClick={() => void handleCreate()} disabled={accountingPeriodsSubmitting || !startDate || !endDate}>
            Create Period
          </Button>
        </div>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Date Range</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accountingPeriodsLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">Loading periods...</TableCell>
              </TableRow>
            ) : accountingPeriods.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">No accounting periods</TableCell>
              </TableRow>
            ) : (
              accountingPeriods.map((period) => (
                <TableRow key={period.id}>
                  <TableCell>{period.name || "Unnamed Period"}</TableCell>
                  <TableCell className="font-mono text-sm">{period.startDate} - {period.endDate}</TableCell>
                  <TableCell>
                    <Badge variant={period.status === "closed" ? "destructive" : "default"}>
                      {period.status === "closed" ? "Locked" : "Open"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant={period.status === "open" ? "destructive" : "outline"}
                      disabled={accountingPeriodsSubmitting}
                      onClick={() => void handleToggle(period.id, period.status)}
                    >
                      {period.status === "open" ? "Close" : "Open"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {accountingPeriodsPagination ? (
        <div className="text-xs text-muted-foreground">
          Page {accountingPeriodsPagination.currentPage} / {accountingPeriodsPagination.lastPage} - {accountingPeriodsPagination.total} periods
        </div>
      ) : null}
    </Card>
  );
}
