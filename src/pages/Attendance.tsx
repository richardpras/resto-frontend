import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import {
  listAttendances,
  manualCorrectAttendance,
  syncAttendance,
  type AttendanceApi,
} from "@/lib/api";

type SyncForm = {
  employee_id: string;
  attendance_date: string;
  check_in: string;
  check_out: string;
  notes: string;
};

type CorrectionForm = {
  attendance_id: string;
  reason: string;
};

const defaultSyncForm: SyncForm = {
  employee_id: "",
  attendance_date: "",
  check_in: "",
  check_out: "",
  notes: "",
};

export default function Attendance() {
  const [items, setItems] = useState<AttendanceApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [correcting, setCorrecting] = useState(false);
  const [syncForm, setSyncForm] = useState<SyncForm>(defaultSyncForm);
  const [correction, setCorrection] = useState<CorrectionForm>({ attendance_id: "", reason: "" });

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setItems(await listAttendances());
      } catch (error) {
        toast({
          title: "Failed to load attendance",
          description: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const handleSync = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      setSyncing(true);
      const created = await syncAttendance({
        employee_id: syncForm.employee_id.trim(),
        attendance_date: syncForm.attendance_date,
        check_in: syncForm.check_in || null,
        check_out: syncForm.check_out || null,
        notes: syncForm.notes || undefined,
      });
      setItems((prev) => [created, ...prev]);
      setSyncForm(defaultSyncForm);
      toast({ title: "Attendance synced", description: "Sync payload was processed." });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      toast({
        title: "Attendance sync",
        description: message.toLowerCase().includes("duplicate")
          ? "Duplicate payload ignored."
          : message,
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleManualCorrection = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!correction.attendance_id) return;
    try {
      setCorrecting(true);
      const updated = await manualCorrectAttendance(correction.attendance_id, {
        reason: correction.reason,
      });
      setItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setCorrection({ attendance_id: "", reason: "" });
      toast({ title: "Correction saved", description: "Manual correction recorded with reason." });
    } catch (error) {
      toast({
        title: "Correction failed",
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setCorrecting(false);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Attendance</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Sync attendance and submit manual corrections.</p>
      </div>

      <form onSubmit={handleSync} className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-card p-4 rounded-2xl border border-border/50">
        <input
          placeholder="Employee ID"
          value={syncForm.employee_id}
          onChange={(e) => setSyncForm((prev) => ({ ...prev, employee_id: e.target.value }))}
          className="px-3 py-2.5 rounded-xl bg-background border border-border text-sm"
          required
        />
        <input
          type="date"
          aria-label="Attendance Date"
          value={syncForm.attendance_date}
          onChange={(e) => setSyncForm((prev) => ({ ...prev, attendance_date: e.target.value }))}
          className="px-3 py-2.5 rounded-xl bg-background border border-border text-sm"
          required
        />
        <input
          type="text"
          placeholder="Notes"
          value={syncForm.notes}
          onChange={(e) => setSyncForm((prev) => ({ ...prev, notes: e.target.value }))}
          className="px-3 py-2.5 rounded-xl bg-background border border-border text-sm"
        />
        <input
          type="datetime-local"
          value={syncForm.check_in}
          onChange={(e) => setSyncForm((prev) => ({ ...prev, check_in: e.target.value }))}
          className="px-3 py-2.5 rounded-xl bg-background border border-border text-sm"
        />
        <input
          type="datetime-local"
          value={syncForm.check_out}
          onChange={(e) => setSyncForm((prev) => ({ ...prev, check_out: e.target.value }))}
          className="px-3 py-2.5 rounded-xl bg-background border border-border text-sm"
        />
        <div className="md:col-span-3">
          <Button type="submit" disabled={syncing}>
            {syncing ? "Syncing..." : "Sync Attendance"}
          </Button>
        </div>
      </form>

      <form onSubmit={handleManualCorrection} className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-card p-4 rounded-2xl border border-border/50">
        <select
          aria-label="Attendance To Correct"
          value={correction.attendance_id}
          onChange={(e) => setCorrection((prev) => ({ ...prev, attendance_id: e.target.value }))}
          className="px-3 py-2.5 rounded-xl bg-background border border-border text-sm"
          required
        >
          <option value="">Select attendance to correct</option>
          {items.map((item) => (
            <option key={item.id} value={item.id}>
              {item.employee_name ?? item.employee_id} - {item.attendance_date}
            </option>
          ))}
        </select>
        <input
          placeholder="Correction reason"
          value={correction.reason}
          onChange={(e) => setCorrection((prev) => ({ ...prev, reason: e.target.value }))}
          className="px-3 py-2.5 rounded-xl bg-background border border-border text-sm"
          required
        />
        <div>
          <Button type="submit" disabled={correcting}>
            {correcting ? "Saving..." : "Submit Correction"}
          </Button>
        </div>
      </form>

      <div className="bg-card rounded-2xl border border-border/50 divide-y divide-border/50">
        {loading ? (
          <p className="p-4 text-sm text-muted-foreground">Loading attendance data...</p>
        ) : items.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">No attendance records yet.</p>
        ) : (
          items.map((attendance) => (
            <div key={attendance.id} className="p-4 space-y-1" data-testid={`attendance-row-${attendance.id}`}>
              <p className="text-sm font-medium text-foreground">
                {attendance.employee_name ?? attendance.employee_id} - {attendance.attendance_date}
              </p>
              <p className="text-xs text-muted-foreground">
                Status: {attendance.status} | Source: {attendance.source}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
