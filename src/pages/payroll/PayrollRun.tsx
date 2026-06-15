import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Calculator, DollarSign, FileText, Printer, Download, Lock, Unlock } from "lucide-react";
import { usePayrollStore, formatIDR } from "@/stores/payrollStore";
import { generatePayrollRun, getPayrollDetail, listPayrollTable, lockPayrollLine, markLegacyPayrollRunPaid, unlockPayrollLine, type PayrollDetail, type PayrollListRow } from "@/lib/api";
import { useErpTranslation } from "@/i18n/useErpTranslation";
import { formatApiErrorMessage } from "@/i18n/apiErrorMessage";
import { toast } from "sonner";

export default function PayrollRunPage() {
  const { t } = useErpTranslation();
  const { employees } = usePayrollStore();
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [periodTo, setPeriodTo] = useState(new Date().toISOString().slice(0, 7));
  const [outlet, setOutlet] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [status, setStatus] = useState<"" | "paid" | "unpaid">("");
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<PayrollListRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState<10 | 25 | 50>(10);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [detail, setDetail] = useState<PayrollDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchRows = async () => {
    setLoading(true);
    try {
      const res = await listPayrollTable({
        page,
        perPage,
        periodFrom: period,
        periodTo,
        outlet: outlet || undefined,
        employeeId: employeeId ? Number(employeeId) : undefined,
        status,
        search: search || undefined,
      });
      setRows(res.data);
      setLastPage(res.meta.lastPage);
      setTotal(res.meta.total);
    } catch (e) {
      toast.error(formatApiErrorMessage(e, t) || t("payroll.run.loadTableFailed"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, perPage, period, periodTo, outlet, employeeId, status, search]);

  const handleGenerate = async () => {
    try {
      await generatePayrollRun({ period, outlet: outlet || undefined });
      toast.success(t("payroll.run.generated"));
      void fetchRows();
    } catch (e) {
      toast.error(formatApiErrorMessage(e, t) || t("payroll.run.generateFailed"));
    }
  };

  const handleMarkPaid = async (runId: number) => {
    try {
      await markLegacyPayrollRunPaid(runId);
      toast.success(t("payroll.run.markedPaid"));
      void fetchRows();
    } catch (e) {
      toast.error(formatApiErrorMessage(e, t) || t("payroll.run.markPaidFailed"));
    }
  };

  const handleLock = async (lineId: number) => {
    try {
      await lockPayrollLine(lineId);
      toast.success(t("payroll.run.lineLocked"));
      void fetchRows();
    } catch (e) {
      toast.error(formatApiErrorMessage(e, t) || t("payroll.run.lockFailed"));
    }
  };

  const handleUnlock = async (lineId: number) => {
    try {
      await unlockPayrollLine(lineId);
      toast.success(t("payroll.run.lineUnlocked"));
      void fetchRows();
    } catch (e) {
      toast.error(formatApiErrorMessage(e, t) || t("payroll.run.unlockFailed"));
    }
  };

  const openDetail = async (row: PayrollListRow) => {
    setDetailLoading(true);
    try {
      const data = await getPayrollDetail(row.id);
      setDetail(data);
    } catch (e) {
      toast.error(formatApiErrorMessage(e, t) || t("payroll.run.detailLoadFailed"));
    } finally {
      setDetailLoading(false);
    }
  };

  const exportCsv = () => {
    const header = [
      t("payroll.shared.employee"),
      t("payroll.shared.period"),
      t("payroll.shared.basicSalary"),
      t("payroll.shared.overtimeAmount"),
      t("payroll.shared.deduction"),
      t("payroll.shared.netSalary"),
      t("payroll.shared.status"),
    ];
    const lines = rows.map((r) => [
      r.employeeName,
      r.period,
      String(r.basicSalary),
      String(r.overtimeAmount),
      String(r.deductionAmount),
      String(r.netSalary),
      r.status,
    ]);
    const csv = [header, ...lines].map((line) => line.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payroll-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPdf = () => {
    window.print();
  };

  const outlets = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((e) => {
      if (e.outlet) set.add(e.outlet);
    });
    return Array.from(set.values());
  }, [employees]);

  return (
    <div className="space-y-6">
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">{t("payroll.run.listTitle")}</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>{t("payroll.shared.periodFrom")}</Label>
            <Input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>{t("payroll.shared.periodTo")}</Label>
            <Input type="month" value={periodTo} onChange={(e) => setPeriodTo(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>{t("payroll.shared.outlet")}</Label>
            <Select value={outlet || "__ALL__"} onValueChange={(v) => setOutlet(v === "__ALL__" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder={t("payroll.shared.allOutlets")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__ALL__">{t("payroll.shared.allOutlets")}</SelectItem>
                {outlets.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t("payroll.shared.employee")}</Label>
            <Select value={employeeId || "__ALL__"} onValueChange={(v) => setEmployeeId(v === "__ALL__" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder={t("payroll.shared.allEmployees")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__ALL__">{t("payroll.shared.allEmployees")}</SelectItem>
                {employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>{t("payroll.shared.status")}</Label>
            <Select value={status || "__ALL__"} onValueChange={(v) => setStatus(v === "__ALL__" ? "" : (v as "paid" | "unpaid"))}>
              <SelectTrigger><SelectValue placeholder={t("payroll.shared.allStatus")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__ALL__">{t("payroll.shared.allStatus")}</SelectItem>
                <SelectItem value="paid">{t("payroll.shared.paid")}</SelectItem>
                <SelectItem value="unpaid">{t("payroll.shared.unpaid")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t("payroll.run.searchEmployeeName")}</Label>
            <Input placeholder={t("payroll.run.searchEmployeePlaceholder")} value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>{t("payroll.shared.rowsPerPage")}</Label>
            <Select value={String(perPage)} onValueChange={(v) => { setPerPage(Number(v) as 10 | 25 | 50); setPage(1); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end gap-2">
            <Button onClick={handleGenerate} className="w-full"><Calculator className="h-4 w-4" />{t("payroll.run.generatePayroll")}</Button>
            <Button variant="outline" onClick={exportCsv}><Download className="h-4 w-4" />{t("payroll.shared.excel")}</Button>
            <Button variant="outline" onClick={exportPdf}><Printer className="h-4 w-4" />{t("payroll.shared.pdf")}</Button>
          </div>
        </div>
      </Card>

      <Card>
        <div className="p-6 flex items-center gap-2 border-b">
          <FileText className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">{t("payroll.run.recordsTitle")}</h2>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("payroll.shared.employee")}</TableHead>
                <TableHead>{t("payroll.shared.period")}</TableHead>
                <TableHead className="text-right">{t("payroll.shared.basicSalary")}</TableHead>
                <TableHead className="text-right">{t("payroll.shared.overtimeAmount")}</TableHead>
                <TableHead className="text-right">{t("payroll.shared.deduction")}</TableHead>
                <TableHead className="text-right">{t("payroll.shared.netSalary")}</TableHead>
                <TableHead>{t("payroll.shared.status")}</TableHead>
                <TableHead className="text-right">{t("payroll.shared.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 8 }).map((_, idx) => (
                  <TableRow key={`pay-sk-${idx}`}>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-28 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">{t("payroll.run.emptyRecords")}</TableCell>
                </TableRow>
              ) : rows.map((r) => (
                <TableRow key={r.id} onClick={() => void openDetail(r)} className="cursor-pointer">
                  <TableCell>{r.employeeName}</TableCell>
                  <TableCell>{r.period}</TableCell>
                  <TableCell className="text-right">{formatIDR(r.basicSalary)}</TableCell>
                  <TableCell className="text-right">{formatIDR(r.overtimeAmount)}</TableCell>
                  <TableCell className="text-right">
                    <div>{formatIDR(r.deductionAmount)}</div>
                    <div className="text-xs text-muted-foreground">{t("payroll.shared.seeDetailBreakdown")}</div>
                  </TableCell>
                  <TableCell className="text-right font-medium">{formatIDR(r.netSalary)}</TableCell>
                  <TableCell><Badge variant={r.status === "paid" ? "default" : "secondary"}>{r.status}</Badge></TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {r.paymentStatus === "locked" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleUnlock(r.id);
                          }}
                        >
                          <Unlock className="h-4 w-4" />{t("payroll.shared.unlock")}
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleLock(r.id);
                          }}
                        >
                          <Lock className="h-4 w-4" />{t("payroll.shared.lock")}
                        </Button>
                      )}
                      {r.status !== "paid" && (
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleMarkPaid(r.payrollRunId);
                          }}
                        >
                          <DollarSign className="h-4 w-4" />{t("payroll.shared.payRun")}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="p-4 flex items-center justify-between border-t">
          <div className="text-sm text-muted-foreground">
            {t("payroll.shared.showingPage", { page, lastPage, total })}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>{t("payroll.shared.previous")}</Button>
            <Button variant="outline" disabled={page >= lastPage} onClick={() => setPage((p) => Math.min(lastPage, p + 1))}>{t("payroll.shared.next")}</Button>
          </div>
        </div>
      </Card>

      <Dialog open={!!detail || detailLoading} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("payroll.run.detailTitle")}</DialogTitle>
          </DialogHeader>
          {detailLoading && !detail ? (
            <div className="space-y-3">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
          ) : detail ? (
            <div className="space-y-4">
              <div className="border-b pb-2">
                <div className="font-medium">{detail.employeeName}</div>
                <div className="text-sm text-muted-foreground">{t("payroll.run.periodStatus", { period: detail.period, status: detail.status })}</div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="font-medium">{t("payroll.shared.attendanceSummary")}</div>
                <div className="flex justify-between"><span>{t("payroll.shared.lateCount")}</span><span>{detail.attendanceSummary.lateCount}</span></div>
                <div className="flex justify-between"><span>{t("payroll.shared.absentCount")}</span><span>{detail.attendanceSummary.absentCount}</span></div>
                <div className="flex justify-between"><span>{t("payroll.shared.overtimeMinutes")}</span><span>{detail.attendanceSummary.overtimeMinutes}</span></div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="font-medium">{t("payroll.shared.earningsBreakdown")}</div>
                <div className="flex justify-between"><span>{t("payroll.shared.basicSalary")}</span><span>{formatIDR(detail.earningsBreakdown?.basicSalary ?? detail.salaryBreakdown.basicSalary)}</span></div>
                <div className="flex justify-between"><span>{t("payroll.shared.attendanceAdjustment")}</span><span>{formatIDR(detail.earningsBreakdown?.attendanceAdjustment ?? 0)}</span></div>
                <div className="flex justify-between"><span>{t("payroll.shared.overtimePay")}</span><span>{formatIDR(detail.earningsBreakdown?.overtimePay ?? 0)}</span></div>
                <div className="flex justify-between"><span>{t("payroll.shared.allowance")}</span><span>{formatIDR(detail.earningsBreakdown?.allowance ?? detail.salaryBreakdown.allowance)}</span></div>
                <div className="flex justify-between"><span>{t("payroll.shared.taxableIncome")}</span><span>{formatIDR(detail.earningsBreakdown?.taxableIncome ?? 0)}</span></div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="font-medium">{t("payroll.shared.deductionBreakdown")}</div>
                <div className="flex justify-between"><span>{t("payroll.shared.penaltyDeductions")}</span><span>-{formatIDR(detail.deductionBreakdown?.adjustmentDeductions ?? detail.salaryBreakdown.deductions)}</span></div>
                <div className="flex justify-between"><span>{t("payroll.shared.loanDeduction")}</span><span>-{formatIDR(detail.deductionBreakdown?.loanDeduction ?? 0)}</span></div>
                <div className="flex justify-between"><span>PPH21</span><span>-{formatIDR(detail.deductionBreakdown?.pph21 ?? 0)}</span></div>
                <div className="flex justify-between"><span>{t("payroll.shared.totalDeductions")}</span><span>-{formatIDR(detail.deductionBreakdown?.totalDeduction ?? detail.salaryBreakdown.deductions)}</span></div>
                <div className="border-t pt-2 flex justify-between font-bold"><span>{t("payroll.shared.finalNetSalary")}</span><span>{formatIDR(detail.netSalary)}</span></div>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetail(null)}>{t("payroll.shared.close")}</Button>
            <Button onClick={exportPdf}><Printer className="h-4 w-4" />{t("payroll.shared.pdf")}</Button>
            <Button onClick={exportCsv}><Download className="h-4 w-4" />{t("payroll.shared.excel")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
