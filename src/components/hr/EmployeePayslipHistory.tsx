import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/DataTable";
import { ApiHttpError } from "@/lib/api-integration/client";
import {
  downloadPayslipPdf,
  listEmployeePayslips,
  type PayrollPayslipRow,
} from "@/lib/api-integration/hrEndpoints";
import { Download } from "lucide-react";
import { toast } from "sonner";

function formatIDR(value: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(
    value,
  );
}

type Props = {
  employeeId: number;
};

export function EmployeePayslipHistory({ employeeId }: Props) {
  const [rows, setRows] = useState<PayrollPayslipRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listEmployeePayslips(employeeId);
      setRows(data);
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : "Failed to load payslips");
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    void load();
  }, [load]);

  const download = async (id: number, payslipNo: string) => {
    try {
      const blob = await downloadPayslipPdf(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${payslipNo}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : "Download failed");
    }
  };

  const columns: Column<PayrollPayslipRow>[] = [
    { key: "no", header: "Payslip No", render: (r) => r.payslipNo },
    {
      key: "period",
      header: "Period",
      render: (r) =>
        r.payrollPeriod ? `${r.payrollPeriod.periodStart} → ${r.payrollPeriod.periodEnd}` : "—",
    },
    { key: "net", header: "Net", render: (r) => formatIDR(r.netSalary) },
    {
      key: "status",
      header: "Status",
      render: (r) => <Badge variant={r.status === "published" ? "default" : "secondary"}>{r.status}</Badge>,
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (r) =>
        r.pdfAvailable ? (
          <Button size="sm" variant="outline" onClick={() => void download(r.id, r.payslipNo)}>
            <Download className="h-3.5 w-3.5 mr-1" />
            PDF
          </Button>
        ) : null,
    },
  ];

  return (
    <DataTable
      data={rows}
      columns={columns}
      rowKey={(r) => r.id}
      emptyMessage={loading ? "Loading…" : "No payslips yet"}
      defaultPageSize={10}
    />
  );
}
