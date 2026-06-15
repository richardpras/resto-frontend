import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAccountingStore } from "@/stores/accountingStore";
import { useErpTranslation } from "@/i18n/useErpTranslation";
import { formatApiErrorMessage } from "@/i18n/apiErrorMessage";

export default function AccountingPeriods() {
  const { t } = useErpTranslation();
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
      toast.error(formatApiErrorMessage(e, t) || t("accounting.periods.fetchFailed"));
    });
  }, [fetchAccountingPeriods, t]);

  const handleCreate = async () => {
    try {
      await createAccountingPeriod({ name, startDate, endDate });
      setName("");
      setStartDate("");
      setEndDate("");
      toast.success(t("accounting.periods.created"));
    } catch (e) {
      toast.error(formatApiErrorMessage(e, t) || t("accounting.periods.createFailed"));
    }
  };

  const handleToggle = async (periodId: string, status: "open" | "closed") => {
    try {
      if (status === "open") {
        await closeAccountingPeriod(periodId);
        toast.success(t("accounting.periods.periodClosed"));
      } else {
        await openAccountingPeriod(periodId);
        toast.success(t("accounting.periods.periodOpened"));
      }
    } catch (e) {
      toast.error(formatApiErrorMessage(e, t) || t("accounting.periods.updateFailed"));
    }
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div>
          <Label>{t("accounting.periods.periodName")}</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="May 2026" />
        </div>
        <div>
          <Label>{t("accounting.periods.startDate")}</Label>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div>
          <Label>{t("accounting.periods.endDate")}</Label>
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
        <div className="flex items-end">
          <Button className="w-full" onClick={() => void handleCreate()} disabled={accountingPeriodsSubmitting || !startDate || !endDate}>
            {t("accounting.periods.createPeriod")}
          </Button>
        </div>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("accounting.coa.name")}</TableHead>
              <TableHead>{t("accounting.periods.dateRange")}</TableHead>
              <TableHead>{t("common:common.status")}</TableHead>
              <TableHead className="text-right">{t("accounting.periods.action")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accountingPeriodsLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">{t("accounting.periods.loadingPeriods")}</TableCell>
              </TableRow>
            ) : accountingPeriods.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">{t("accounting.periods.noPeriods")}</TableCell>
              </TableRow>
            ) : (
              accountingPeriods.map((period) => (
                <TableRow key={period.id}>
                  <TableCell>{period.name || t("accounting.periods.unnamedPeriod")}</TableCell>
                  <TableCell className="font-mono text-sm">{period.startDate} - {period.endDate}</TableCell>
                  <TableCell>
                    <Badge variant={period.status === "closed" ? "destructive" : "default"}>
                      {period.status === "closed" ? t("accounting.periods.locked") : t("accounting.periods.open")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant={period.status === "open" ? "destructive" : "outline"}
                      disabled={accountingPeriodsSubmitting}
                      onClick={() => void handleToggle(period.id, period.status)}
                    >
                      {period.status === "open" ? t("accounting.periods.close") : t("accounting.periods.open")}
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
          {t("accounting.periods.pageInfo", {
            current: accountingPeriodsPagination.currentPage,
            last: accountingPeriodsPagination.lastPage,
            total: accountingPeriodsPagination.total,
          })}
        </div>
      ) : null}
    </Card>
  );
}
