import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable, type Column } from "@/components/DataTable";
import { ApiHttpError } from "@/lib/api-integration/client";
import {
  REIMBURSEMENT_CATEGORIES,
  approveReimbursement,
  cancelReimbursement,
  createReimbursement,
  deleteReimbursement,
  listReimbursements,
  rejectReimbursement,
  submitReimbursement,
  updateReimbursement,
  uploadReimbursementAttachment,
  type EmployeeReimbursementRow,
} from "@/lib/api-integration/hrEndpoints";
import { listOrganizationEmployees, type OrganizationEmployeeRow } from "@/lib/api-integration/organizationEndpoints";
import { useAuthStore } from "@/stores/authStore";
import { Check, Eye, Paperclip, Plus, Send, Trash2, X } from "lucide-react";
import { toast } from "sonner";

function formatIDR(value: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(
    value,
  );
}

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "approved" || status === "paid") return "default";
  if (status === "draft") return "secondary";
  if (status === "rejected" || status === "cancelled") return "destructive";
  return "outline";
}

type FormState = {
  employeeId: string;
  category: (typeof REIMBURSEMENT_CATEGORIES)[number];
  title: string;
  description: string;
  claimAmount: string;
  expenseDate: string;
  notes: string;
};

const emptyForm = (): FormState => ({
  employeeId: "",
  category: "transport",
  title: "",
  description: "",
  claimAmount: "",
  expenseDate: new Date().toISOString().slice(0, 10),
  notes: "",
});

export default function Reimbursements() {
  const { user } = useAuthStore();
  const outlets = user?.assignedOutlets ?? [];
  const [outletId, setOutletId] = useState<number | null>(outlets[0]?.id ?? null);

  const [rows, setRows] = useState<EmployeeReimbursementRow[]>([]);
  const [employees, setEmployees] = useState<OrganizationEmployeeRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [viewRow, setViewRow] = useState<EmployeeReimbursementRow | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  const load = useCallback(async () => {
    if (!outletId) return;
    setLoading(true);
    try {
      const [claims, emps] = await Promise.all([
        listReimbursements({ outletId }),
        listOrganizationEmployees(outletId),
      ]);
      setRows(claims);
      setEmployees(emps);
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : "Failed to load reimbursements");
    } finally {
      setLoading(false);
    }
  }, [outletId]);

  useEffect(() => {
    void load();
  }, [load]);

  const empName = (id: number) => employees.find((e) => e.id === id)?.fullName ?? `Employee #${id}`;

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm());
    setPendingFiles([]);
    setCreateOpen(true);
  };

  const openEdit = (row: EmployeeReimbursementRow) => {
    if (row.status !== "draft") return;
    setEditId(row.id);
    setForm({
      employeeId: String(row.employeeId),
      category: row.category as FormState["category"],
      title: row.title,
      description: row.description ?? "",
      claimAmount: String(row.claimAmount),
      expenseDate: row.expenseDate,
      notes: row.notes ?? "",
    });
    setPendingFiles([]);
    setCreateOpen(true);
  };

  const saveDraft = async () => {
    const amount = Number(form.claimAmount);
    if (!form.employeeId || amount <= 0 || !form.title.trim() || !form.expenseDate) {
      toast.error("Fill required fields");
      return;
    }
    try {
      let row: EmployeeReimbursementRow;
      if (editId) {
        row = await updateReimbursement(editId, {
          category: form.category,
          title: form.title,
          description: form.description || undefined,
          claimAmount: amount,
          expenseDate: form.expenseDate,
          notes: form.notes || undefined,
        });
      } else {
        row = await createReimbursement({
          employeeId: Number(form.employeeId),
          category: form.category,
          title: form.title,
          description: form.description || undefined,
          claimAmount: amount,
          expenseDate: form.expenseDate,
          notes: form.notes || undefined,
        });
      }
      for (const file of pendingFiles) {
        await uploadReimbursementAttachment(row.id, file);
      }
      toast.success(editId ? "Claim updated" : "Draft saved");
      setCreateOpen(false);
      await load();
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : "Failed to save claim");
    }
  };

  const saveAndSubmit = async () => {
    const amount = Number(form.claimAmount);
    if (!form.employeeId || amount <= 0 || !form.title.trim() || !form.expenseDate) {
      toast.error("Fill required fields");
      return;
    }
    try {
      let row: EmployeeReimbursementRow;
      if (editId) {
        row = await updateReimbursement(editId, {
          category: form.category,
          title: form.title,
          description: form.description || undefined,
          claimAmount: amount,
          expenseDate: form.expenseDate,
          notes: form.notes || undefined,
        });
      } else {
        row = await createReimbursement({
          employeeId: Number(form.employeeId),
          category: form.category,
          title: form.title,
          description: form.description || undefined,
          claimAmount: amount,
          expenseDate: form.expenseDate,
          notes: form.notes || undefined,
        });
      }
      for (const file of pendingFiles) {
        await uploadReimbursementAttachment(row.id, file);
      }
      await submitReimbursement(row.id);
      toast.success("Claim submitted");
      setCreateOpen(false);
      await load();
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : "Failed to submit claim");
    }
  };

  const workflow = async (action: "approve" | "reject" | "cancel" | "submit" | "delete", id: number) => {
    try {
      if (action === "approve") await approveReimbursement(id);
      else if (action === "reject") await rejectReimbursement(id);
      else if (action === "cancel") await cancelReimbursement(id);
      else if (action === "submit") await submitReimbursement(id);
      else if (action === "delete") await deleteReimbursement(id);
      toast.success(`Claim ${action === "delete" ? "deleted" : action + (action.endsWith("e") ? "d" : "ed")}`);
      await load();
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : `Failed to ${action}`);
    }
  };

  const baseColumns: Column<EmployeeReimbursementRow>[] = useMemo(
    () => [
      { key: "no", header: "Claim No", sortable: true, render: (r) => r.claimNo },
      { key: "employee", header: "Employee", render: (r) => r.employee?.fullName ?? empName(r.employeeId) },
      { key: "category", header: "Category", sortable: true, render: (r) => r.category },
      {
        key: "amount",
        header: "Amount",
        render: (r) => <span className="text-green-600">{formatIDR(r.claimAmount)}</span>,
      },
      { key: "expenseDate", header: "Expense Date", render: (r) => r.expenseDate },
      {
        key: "status",
        header: "Status",
        render: (r) => <Badge variant={statusVariant(r.status)}>{r.status}</Badge>,
      },
    ],
    [employees],
  );

  const actionColumn: Column<EmployeeReimbursementRow> = {
    key: "actions",
    header: "Actions",
    className: "text-right",
    render: (r) => (
      <div className="flex justify-end gap-1 flex-wrap">
        <Button size="sm" variant="ghost" onClick={() => setViewRow(r)}>
          <Eye className="h-3 w-3 mr-1" />
          View
        </Button>
        {r.status === "draft" && (
          <>
            <Button size="sm" variant="outline" onClick={() => openEdit(r)}>
              Edit
            </Button>
            <Button size="sm" variant="outline" onClick={() => void workflow("submit", r.id)}>
              <Send className="h-3 w-3 mr-1" />
              Submit
            </Button>
            <Button size="sm" variant="ghost" onClick={() => void workflow("delete", r.id)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </>
        )}
        {r.status === "submitted" && (
          <>
            <Button size="sm" variant="outline" onClick={() => void workflow("approve", r.id)}>
              <Check className="h-3 w-3 mr-1" />
              Approve
            </Button>
            <Button size="sm" variant="destructive" onClick={() => void workflow("reject", r.id)}>
              <X className="h-3 w-3 mr-1" />
              Reject
            </Button>
            <Button size="sm" variant="ghost" onClick={() => void workflow("cancel", r.id)}>
              Cancel
            </Button>
          </>
        )}
      </div>
    ),
  };

  const claimsRows = rows;
  const pendingRows = rows.filter((r) => r.status === "submitted");
  const paidRows = rows.filter((r) => r.status === "paid");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Expense Reimbursements</h2>
          <p className="text-sm text-muted-foreground">Employee expense claims with approval workflow</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {outlets.length > 1 && (
            <Select value={outletId ? String(outletId) : ""} onValueChange={(v) => setOutletId(Number(v))}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Outlet" />
              </SelectTrigger>
              <SelectContent>
                {outlets.map((o) => (
                  <SelectItem key={o.id} value={String(o.id)}>
                    {o.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" />
            New Claim
          </Button>
        </div>
      </div>

      <Tabs defaultValue="claims">
        <TabsList>
          <TabsTrigger value="claims">Claims</TabsTrigger>
          <TabsTrigger value="pending">Pending Approval</TabsTrigger>
          <TabsTrigger value="paid">Paid</TabsTrigger>
        </TabsList>

        <TabsContent value="claims" className="mt-4">
          <DataTable
            data={claimsRows}
            columns={[...baseColumns, actionColumn]}
            loading={loading}
            emptyMessage="No reimbursement claims"
          />
        </TabsContent>

        <TabsContent value="pending" className="mt-4">
          <DataTable
            data={pendingRows}
            columns={[...baseColumns, actionColumn]}
            loading={loading}
            emptyMessage="No claims pending approval"
          />
        </TabsContent>

        <TabsContent value="paid" className="mt-4">
          <DataTable
            data={paidRows}
            columns={baseColumns}
            loading={loading}
            emptyMessage="No paid claims"
          />
        </TabsContent>
      </Tabs>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Draft Claim" : "New Expense Claim"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1">
              <Label>Employee</Label>
              <Select
                value={form.employeeId}
                onValueChange={(v) => setForm((f) => ({ ...f, employeeId: v }))}
                disabled={!!editId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={String(e.id)}>
                      {e.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1">
              <Label>Category</Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm((f) => ({ ...f, category: v as FormState["category"] }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REIMBURSEMENT_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1">
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="grid gap-1">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1">
                <Label>Amount (IDR)</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.claimAmount}
                  onChange={(e) => setForm((f) => ({ ...f, claimAmount: e.target.value }))}
                />
              </div>
              <div className="grid gap-1">
                <Label>Expense Date</Label>
                <Input
                  type="date"
                  value={form.expenseDate}
                  onChange={(e) => setForm((f) => ({ ...f, expenseDate: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-1">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} />
            </div>
            <div className="grid gap-1">
              <Label className="flex items-center gap-1">
                <Paperclip className="h-3.5 w-3.5" />
                Attachments
              </Label>
              <Input
                type="file"
                multiple
                accept="image/*,.pdf"
                onChange={(e) => setPendingFiles(Array.from(e.target.files ?? []))}
              />
              {pendingFiles.length > 0 && (
                <p className="text-xs text-muted-foreground">{pendingFiles.length} file(s) selected</p>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Close
            </Button>
            <Button variant="secondary" onClick={() => void saveDraft()}>
              Save Draft
            </Button>
            <Button onClick={() => void saveAndSubmit()}>
              <Send className="h-4 w-4 mr-1" />
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewRow} onOpenChange={(open) => !open && setViewRow(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{viewRow?.claimNo}</DialogTitle>
          </DialogHeader>
          {viewRow && (
            <div className="space-y-2 text-sm">
              <p>
                <span className="text-muted-foreground">Employee:</span> {viewRow.employee?.fullName ?? empName(viewRow.employeeId)}
              </p>
              <p>
                <span className="text-muted-foreground">Category:</span> {viewRow.category}
              </p>
              <p>
                <span className="text-muted-foreground">Title:</span> {viewRow.title}
              </p>
              {viewRow.description && (
                <p>
                  <span className="text-muted-foreground">Description:</span> {viewRow.description}
                </p>
              )}
              <p>
                <span className="text-muted-foreground">Amount:</span> {formatIDR(viewRow.claimAmount)}
              </p>
              <p>
                <span className="text-muted-foreground">Expense Date:</span> {viewRow.expenseDate}
              </p>
              <p>
                <span className="text-muted-foreground">Status:</span>{" "}
                <Badge variant={statusVariant(viewRow.status)}>{viewRow.status}</Badge>
              </p>
              {viewRow.attachments && viewRow.attachments.length > 0 && (
                <div>
                  <p className="text-muted-foreground mb-1">Attachments:</p>
                  <ul className="list-disc pl-5">
                    {viewRow.attachments.map((a) => (
                      <li key={a.id}>{a.fileName}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
