import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";
import { usePayrollStore } from "@/stores/payrollStore";
import { DataTable, type Column } from "@/components/DataTable";
import { useErpTranslation } from "@/i18n/useErpTranslation";
import { formatApiErrorMessage } from "@/i18n/apiErrorMessage";
import { toast } from "sonner";

export default function Shifts() {
  const { t } = useErpTranslation();
  const { shifts, addShift, removeShift } = usePayrollStore();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    startTime: "09:00",
    endTime: "17:00",
    notes: "General shift",
  });

  const submit = async () => {
    if (!form.startTime || !form.endTime) return toast.error(t("payroll.shifts.startEndRequired"));
    try {
      await addShift({
        employeeId: "",
        date: "",
        startTime: form.startTime,
        endTime: form.endTime,
        notes: form.notes,
      });
      toast.success(t("payroll.shifts.saved"));
      setOpen(false);
    } catch (e) {
      toast.error(formatApiErrorMessage(e, t) || t("payroll.shifts.saveFailed"));
    }
  };

  const columns: Column<(typeof shifts)[number]>[] = [
    { key: "notes", header: t("payroll.shifts.shiftCol"), sortable: true, render: (s) => s.notes || t("payroll.shifts.unnamedShift") },
    { key: "startTime", header: t("payroll.shared.start"), sortable: true },
    { key: "endTime", header: t("payroll.shared.end"), sortable: true },
    {
      key: "actions",
      header: t("payroll.shared.actions"),
      className: "text-right",
      render: (s) => (
        <div className="flex justify-end">
          <Button variant="ghost" size="icon" onClick={() => void removeShift(s.id)}><Trash2 className="h-4 w-4" /></Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">{t("payroll.shifts.title")}</h2>
        <Button onClick={() => setOpen(true)} size="sm"><Plus className="h-4 w-4" />{t("payroll.shifts.scheduleShift")}</Button>
      </div>

      <DataTable
        data={shifts}
        columns={columns}
        rowKey={(s) => s.id}
        searchKeys={["notes", "startTime", "endTime"]}
        emptyMessage={t("payroll.shifts.empty")}
        defaultPageSize={10}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("payroll.shifts.scheduleShift")}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("payroll.shared.start")}</Label>
                <Input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{t("payroll.shared.end")}</Label>
                <Input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("payroll.shared.notes")}</Label>
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{t("payroll.shared.cancel")}</Button>
            <Button onClick={() => void submit()}>{t("payroll.shared.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
