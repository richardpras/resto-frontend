import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { createPayroll, listPayrolls, type PayrollApi } from "@/lib/api";

type PayrollForm = {
  employee_id: string;
  period_start: string;
  period_end: string;
  basic_salary: string;
  allowances: string;
  deductions: string;
};

const defaultForm: PayrollForm = {
  employee_id: "",
  period_start: "",
  period_end: "",
  basic_salary: "",
  allowances: "0",
  deductions: "0",
};

export default function Payroll() {
  const [items, setItems] = useState<PayrollApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<PayrollForm>(defaultForm);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setItems(await listPayrolls());
      } catch (error) {
        toast({
          title: "Failed to load payrolls",
          description: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      setSubmitting(true);
      const created = await createPayroll({
        employee_id: form.employee_id.trim(),
        period_start: form.period_start,
        period_end: form.period_end,
        basic_salary: Number(form.basic_salary),
        allowances: Number(form.allowances || 0),
        deductions: Number(form.deductions || 0),
      });
      setItems((prev) => [created, ...prev]);
      setForm(defaultForm);
      toast({ title: "Payroll created", description: "Payroll entry added successfully." });
    } catch (error) {
      toast({
        title: "Create payroll failed",
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Payroll</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Create payroll and review attendance summary data.</p>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-card p-4 rounded-2xl border border-border/50">
        <input
          placeholder="Employee ID"
          value={form.employee_id}
          onChange={(e) => setForm((prev) => ({ ...prev, employee_id: e.target.value }))}
          className="px-3 py-2.5 rounded-xl bg-background border border-border text-sm"
          required
        />
        <input
          type="date"
          aria-label="Period Start"
          value={form.period_start}
          onChange={(e) => setForm((prev) => ({ ...prev, period_start: e.target.value }))}
          className="px-3 py-2.5 rounded-xl bg-background border border-border text-sm"
          required
        />
        <input
          type="date"
          aria-label="Period End"
          value={form.period_end}
          onChange={(e) => setForm((prev) => ({ ...prev, period_end: e.target.value }))}
          className="px-3 py-2.5 rounded-xl bg-background border border-border text-sm"
          required
        />
        <input
          type="number"
          min="0"
          placeholder="Basic Salary"
          value={form.basic_salary}
          onChange={(e) => setForm((prev) => ({ ...prev, basic_salary: e.target.value }))}
          className="px-3 py-2.5 rounded-xl bg-background border border-border text-sm"
          required
        />
        <input
          type="number"
          min="0"
          placeholder="Allowances"
          value={form.allowances}
          onChange={(e) => setForm((prev) => ({ ...prev, allowances: e.target.value }))}
          className="px-3 py-2.5 rounded-xl bg-background border border-border text-sm"
        />
        <input
          type="number"
          min="0"
          placeholder="Deductions"
          value={form.deductions}
          onChange={(e) => setForm((prev) => ({ ...prev, deductions: e.target.value }))}
          className="px-3 py-2.5 rounded-xl bg-background border border-border text-sm"
        />
        <div className="md:col-span-3">
          <Button type="submit" disabled={submitting}>
            {submitting ? "Saving..." : "Create Payroll"}
          </Button>
        </div>
      </form>

      <div className="bg-card rounded-2xl border border-border/50 divide-y divide-border/50">
        {loading ? (
          <p className="p-4 text-sm text-muted-foreground">Loading payroll data...</p>
        ) : items.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">No payroll records yet.</p>
        ) : (
          items.map((payroll) => (
            <div key={payroll.id} className="p-4 space-y-1" data-testid={`payroll-row-${payroll.id}`}>
              <p className="text-sm font-medium text-foreground">
                {payroll.employee_name ?? payroll.employee_id} - {payroll.period_start} to {payroll.period_end}
              </p>
              <p className="text-xs text-muted-foreground">
                Basic: {payroll.basic_salary} | Allowances: {payroll.allowances ?? 0} | Deductions: {payroll.deductions ?? 0}
              </p>
              {payroll.attendance_summary && (
                <p className="text-xs text-muted-foreground">
                  Late: {payroll.attendance_summary.lateCount ?? 0}, Absent: {payroll.attendance_summary.absentCount ?? 0},
                  OT: {payroll.attendance_summary.overtimeMinutes ?? 0} mins
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
