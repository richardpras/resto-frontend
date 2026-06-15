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
import { useErpTranslation } from "@/i18n/useErpTranslation";
import { formatApiErrorMessage } from "@/i18n/apiErrorMessage";
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

const WORKFLOW_ACTION_LABELS = {
  approve: "approved",
  reject: "rejected",
  cancel: "cancelled",
  submit: "submitted",
  delete: "deleted",
} as const;

export default function Reimbursements() {
  const { t } = useErpTranslation();
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
      toast.error(formatApiErrorMessage(e, t) || t("payroll.reimbursements.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [outletId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const empName = useCallback(
    (id: number) => employees.find((e) => e.id === id)?.fullName ?? t("payroll.shared.employeeFallback", { id }),
    [employees, t],
  );

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
      toast.error(t("payroll.shared.fillRequired"));
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
      toast.success(editId ? t("payroll.reimbursements.claimUpdated") : t("payroll.reimbursements.draftSaved"));
      setCreateOpen(false);
      await load();
    } catch (e) {
      toast.error(formatApiErrorMessage(e, t) || t("payroll.reimbursements.saveClaimFailed"));
    }
  };

  const saveAndSubmit = async () => {
    const amount = Number(form.claimAmount);
    if (!form.employeeId || amount <= 0 || !form.title.trim() || !form.expenseDate) {
      toast.error(t("payroll.shared.fillRequired"));
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
      toast.success(t("payroll.reimbursements.claimSubmitted"));
      setCreateOpen(false);
      await load();
    } catch (e) {
      toast.error(formatApiErrorMessage(e, t) || t("payroll.reimbursements.submitClaimFailed"));
    }
  };

  const workflow = async (action: keyof typeof WORKFLOW_ACTION_LABELS, id: number) => {
    try {
      if (action === "approve") await approveReimbursement(id);
      else if (action === "reject") await rejectReimbursement(id);
      else if (action === "cancel") await cancelReimbursement(id);
      else if (action === "submit") await submitReimbursement(id);
      else if (action === "delete") await deleteReimbursement(id);
      toast.success(
        t("payroll.reimbursements.claimActioned", {
          action: t(`payroll.shared.${WORKFLOW_ACTION_LABELS[action]}`),
        }),
      );
      await load();
    } catch (e) {
      toast.error(formatApiErrorMessage(e, t) || t("payroll.shared.actionFailed"));
    }
  };

  const baseColumns: Column<EmployeeReimbursementRow>[] = useMemo(
    () => [
      { key: "no", header: t("payroll.shared.claimNo"), sortable: true, render: (r) => r.claimNo },
      {
        key: "employee",
        header: t("payroll.shared.employee"),
        render: (r) => r.employee?.fullName ?? empName(r.employeeId),
      },
      {
        key: "category",
        header: t("payroll.shared.category"),
        sortable: true,
        render: (r) => t(`payroll.shared.reimbursementCategories.${r.category}`, { defaultValue: r.category }),
      },
      {
        key: "amount",
        header: t("payroll.shared.amount"),
        render: (r) => <span className="text-green-600">{formatIDR(r.claimAmount)}</span>,
      },
      { key: "expenseDate", header: t("payroll.shared.expenseDate"), render: (r) => r.expenseDate },
      {
        key: "status",
        header: t("payroll.shared.status"),
        render: (r) => (
          <Badge variant={statusVariant(r.status)}>
            {t(`payroll.shared.${r.status}`, { defaultValue: r.status })}
          </Badge>
        ),
      },
    ],
    [t, empName],
  );

  const actionColumn: Column<EmployeeReimbursementRow> = useMemo(
    () => ({
      key: "actions",
      header: t("payroll.shared.actions"),
      className: "text-right",
      render: (r) => (
        <div className="flex justify-end gap-1 flex-wrap">
          <Button size="sm" variant="ghost" onClick={() => setViewRow(r)}>
            <Eye className="h-3 w-3 mr-1" />
            {t("payroll.shared.view")}
          </Button>
          {r.status === "draft" && (
            <>
              <Button size="sm" variant="outline" onClick={() => openEdit(r)}>
                {t("payroll.shared.edit")}
              </Button>
              <Button size="sm" variant="outline" onClick={() => void workflow("submit", r.id)}>
                <Send className="h-3 w-3 mr-1" />
                {t("payroll.shared.submit")}
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
                {t("payroll.shared.approve")}
              </Button>
              <Button size="sm" variant="destructive" onClick={() => void workflow("reject", r.id)}>
                <X className="h-3 w-3 mr-1" />
                {t("payroll.shared.reject")}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => void workflow("cancel", r.id)}>
                {t("payroll.shared.cancel")}
              </Button>
            </>
          )}
        </div>
      ),
    }),
    [t],
  );

  const claimsRows = rows;
  const pendingRows = rows.filter((r) => r.status === "submitted");
  const paidRows = rows.filter((r) => r.status === "paid");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{t("payroll.reimbursements.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("payroll.reimbursements.subtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {outlets.length > 1 && (
            <Select value={outletId ? String(outletId) : ""} onValueChange={(v) => setOutletId(Number(v))}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t("payroll.shared.outlet")} />
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
            {t("payroll.reimbursements.newClaim")}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="claims">
        <TabsList>
          <TabsTrigger value="claims">{t("payroll.reimbursements.claims")}</TabsTrigger>
          <TabsTrigger value="pending">{t("payroll.reimbursements.pendingApproval")}</TabsTrigger>
          <TabsTrigger value="paid">{t("payroll.reimbursements.paidTab")}</TabsTrigger>
        </TabsList>

        <TabsContent value="claims" className="mt-4">
          <DataTable
            data={claimsRows}
            columns={[...baseColumns, actionColumn]}
            rowKey={(r) => String(r.id)}
            loading={loading}
            emptyMessage={t("payroll.reimbursements.emptyClaims")}
          />
        </TabsContent>

        <TabsContent value="pending" className="mt-4">
          <DataTable
            data={pendingRows}
            columns={[...baseColumns, actionColumn]}
            rowKey={(r) => String(r.id)}
            loading={loading}
            emptyMessage={t("payroll.reimbursements.emptyPending")}
          />
        </TabsContent>

        <TabsContent value="paid" className="mt-4">
          <DataTable
            data={paidRows}
            columns={baseColumns}
            rowKey={(r) => String(r.id)}
            loading={loading}
            emptyMessage={t("payroll.reimbursements.emptyPaid")}
          />
        </TabsContent>
      </Tabs>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editId ? t("payroll.reimbursements.editDraft") : t("payroll.reimbursements.newExpenseClaim")}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1">
              <Label>{t("payroll.shared.employee")}</Label>
              <Select
                value={form.employeeId}
                onValueChange={(v) => setForm((f) => ({ ...f, employeeId: v }))}
                disabled={!!editId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("payroll.shared.selectEmployee")} />
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
              <Label>{t("payroll.shared.category")}</Label>
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
                      {t(`payroll.shared.reimbursementCategories.${c}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1">
              <Label>{t("payroll.shared.title")}</Label>
              <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="grid gap-1">
              <Label>{t("payroll.shared.description")}</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1">
                <Label>{t("payroll.reimbursements.amountIdr")}</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.claimAmount}
                  onChange={(e) => setForm((f) => ({ ...f, claimAmount: e.target.value }))}
                />
              </div>
              <div className="grid gap-1">
                <Label>{t("payroll.shared.expenseDate")}</Label>
                <Input
                  type="date"
                  value={form.expenseDate}
                  onChange={(e) => setForm((f) => ({ ...f, expenseDate: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-1">
              <Label>{t("payroll.shared.notes")}</Label>
              <Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} />
            </div>
            <div className="grid gap-1">
              <Label className="flex items-center gap-1">
                <Paperclip className="h-3.5 w-3.5" />
                {t("payroll.shared.attachments")}
              </Label>
              <Input
                type="file"
                multiple
                accept="image/*,.pdf"
                onChange={(e) => setPendingFiles(Array.from(e.target.files ?? []))}
              />
              {pendingFiles.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {t("payroll.shared.filesSelected", { count: pendingFiles.length })}
                </p>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              {t("payroll.shared.close")}
            </Button>
            <Button variant="secondary" onClick={() => void saveDraft()}>
              {t("payroll.shared.saveDraft")}
            </Button>
            <Button onClick={() => void saveAndSubmit()}>
              <Send className="h-4 w-4 mr-1" />
              {t("payroll.shared.submit")}
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
                <span className="text-muted-foreground">{t("payroll.shared.employee")}:</span>{" "}
                {viewRow.employee?.fullName ?? empName(viewRow.employeeId)}
              </p>
              <p>
                <span className="text-muted-foreground">{t("payroll.shared.category")}:</span>{" "}
                {t(`payroll.shared.reimbursementCategories.${viewRow.category}`, { defaultValue: viewRow.category })}
              </p>
              <p>
                <span className="text-muted-foreground">{t("payroll.shared.title")}:</span> {viewRow.title}
              </p>
              {viewRow.description && (
                <p>
                  <span className="text-muted-foreground">{t("payroll.shared.description")}:</span> {viewRow.description}
                </p>
              )}
              <p>
                <span className="text-muted-foreground">{t("payroll.shared.amount")}:</span> {formatIDR(viewRow.claimAmount)}
              </p>
              <p>
                <span className="text-muted-foreground">{t("payroll.shared.expenseDate")}:</span> {viewRow.expenseDate}
              </p>
              <p>
                <span className="text-muted-foreground">{t("payroll.shared.status")}:</span>{" "}
                <Badge variant={statusVariant(viewRow.status)}>
                  {t(`payroll.shared.${viewRow.status}`, { defaultValue: viewRow.status })}
                </Badge>
              </p>
              {viewRow.attachments && viewRow.attachments.length > 0 && (
                <div>
                  <p className="text-muted-foreground mb-1">{t("payroll.shared.attachments")}:</p>
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
