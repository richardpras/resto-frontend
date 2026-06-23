import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePurchaseStore } from "@/stores/purchaseStore";
import { useSupplierStore } from "@/stores/supplierStore";
import { useOutletStore } from "@/stores/outletStore";
import { getApAgingReport, getProcurementSummary, getSupplierStatement, type ApAgingReport, type ProcurementSummary, type SupplierStatement } from "@/lib/api-integration/purchaseEndpoints";
import { usePurchasePermissions } from "@/hooks/usePurchasePermissions";
import { dialogScroll, dialogSize } from "@/lib/ui/dialogSizes";
import { useErpTranslation } from "@/i18n/useErpTranslation";
import { formatApiErrorMessage } from "@/i18n/apiErrorMessage";
import { Plus, Search, Check, Upload, Ban, Eye } from "lucide-react";
import PostingStatusIndicator, { PostingStatusBadge } from "@/components/procurement/PostingStatusIndicator";
import { useSettingsStore } from "@/stores/settingsStore";
import { toast } from "sonner";

const statusColors = {
  draft: "bg-muted text-muted-foreground",
  approved: "bg-info/15 text-info border-info/30",
  posted: "bg-success/15 text-success border-success/30",
  void: "bg-destructive/15 text-destructive border-destructive/30",
} as const;

type PaymentMethod = "cash" | "bank_transfer" | "giro" | "check" | "other";

export default function PurchasePayments() {
  const { t } = useErpTranslation();
  const {
    supplierPayments,
    invoices,
    fetchSupplierPayments,
    fetchPurchaseInvoices,
    addSupplierPayment,
    approveSupplierPaymentAction,
    postSupplierPaymentAction,
    voidSupplierPaymentAction,
  } = usePurchaseStore();
  const { suppliers, fetchSuppliers } = useSupplierStore();
  const activeOutletId = useOutletStore((s) => s.activeOutletId);
  const { canApprove } = usePurchasePermissions();

  const [tab, setTab] = useState("payments");
  const [search, setSearch] = useState("");
  const [summary, setSummary] = useState<ProcurementSummary | null>(null);
  const [aging, setAging] = useState<ApAgingReport | null>(null);
  const [statement, setStatement] = useState<SupplierStatement | null>(null);
  const [statementSupplierId, setStatementSupplierId] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [viewId, setViewId] = useState<string | null>(null);
  const [supplierId, setSupplierId] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("bank_transfer");
  const [bankAccountId, setBankAccountId] = useState("");
  const banks = useSettingsStore((s) => s.banks);
  const [referenceNo, setReferenceNo] = useState("");
  const [amount, setAmount] = useState(0);
  const [allocations, setAllocations] = useState<Record<string, number>>({});

  const loadDashboard = async () => {
    if (typeof activeOutletId !== "number" || activeOutletId < 1) return;
    try {
      const [sum, age] = await Promise.all([
        getProcurementSummary({ outletId: activeOutletId }),
        getApAgingReport({ outletId: activeOutletId }),
      ]);
      setSummary(sum);
      setAging(age);
    } catch {
      setSummary(null);
      setAging(null);
    }
  };

  useEffect(() => {
    void Promise.all([fetchSupplierPayments(), fetchPurchaseInvoices(), fetchSuppliers(), loadDashboard()]);
  }, [fetchSupplierPayments, fetchPurchaseInvoices, fetchSuppliers, activeOutletId]);

  useEffect(() => {
    if (!statementSupplierId || typeof activeOutletId !== "number") {
      setStatement(null);
      return;
    }
    void getSupplierStatement({ outletId: activeOutletId, supplierId: Number(statementSupplierId) })
      .then(setStatement)
      .catch(() => setStatement(null));
  }, [statementSupplierId, activeOutletId, supplierPayments]);

  const payableInvoices = invoices.filter(
    (inv) => inv.supplierId === supplierId && ["approved", "partial"].includes(inv.status),
  );

  const openNew = () => {
    setSupplierId("");
    setPaymentDate(new Date().toISOString().slice(0, 10));
    setPaymentMethod("bank_transfer");
    setReferenceNo("");
    setAmount(0);
    setAllocations({});
    setFormOpen(true);
  };

  const handleSupplierSelect = (id: string) => {
    setSupplierId(id);
    const alloc: Record<string, number> = {};
    invoices
      .filter((inv) => inv.supplierId === id && ["approved", "partial"].includes(inv.status))
      .forEach((inv) => { alloc[inv.id] = inv.outstandingAmount ?? inv.remainingAmount; });
    setAllocations(alloc);
    setAmount(Object.values(alloc).reduce((s, v) => s + v, 0));
  };

  const handleSave = async () => {
    if (!supplierId || amount <= 0) { toast.error(t("purchases.pay.supplierRequired")); return; }
    const allocRows = Object.entries(allocations)
      .filter(([, v]) => v > 0)
      .map(([invoiceId, allocatedAmount]) => ({ invoiceId, allocatedAmount }));
    if (allocRows.length === 0) { toast.error(t("purchases.pay.allocateRequired")); return; }

    try {
      await addSupplierPayment({
        supplierId,
        paymentDate,
        paymentMethod,
        bankAccountId: paymentMethod === "bank_transfer" && bankAccountId ? bankAccountId : undefined,
        referenceNo: referenceNo || undefined,
        amount,
        allocations: allocRows,
      });
      toast.success(t("purchases.pay.draftCreated"));
      setFormOpen(false);
      await loadDashboard();
    } catch (e) {
      toast.error(formatApiErrorMessage(e, t) || t("purchases.shared.actionFailed"));
    }
  };

  const filtered = supplierPayments.filter((p) =>
    p.paymentNo.toLowerCase().includes(search.toLowerCase()) ||
    (p.supplierName ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const viewedPayment = viewId ? supplierPayments.find((pay) => pay.id === viewId) : null;

  const getSupplierName = (id: string) => suppliers.find((s) => s.id === id)?.name ?? `Supplier #${id}`;

  const summaryCards = summary ? [
    { label: t("purchases.pay.summary.outstandingAp"), value: summary.apOutstandingAmount.toLocaleString() },
    { label: t("purchases.pay.summary.apPaid"), value: summary.apPaidAmount.toLocaleString() },
    { label: t("purchases.pay.summary.postedPayments"), value: summary.postedPayments },
    { label: t("purchases.pay.summary.totalPayments"), value: summary.totalPayments },
    { label: t("purchases.pay.summary.voided"), value: summary.voidedPayments },
  ] : [];

  const paymentStatusLabel = (status: keyof typeof statusColors) => t(`purchases.status.${status}`);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("purchases.pay.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("purchases.pay.subtitle")}</p>
        </div>
        <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> {t("purchases.pay.newPayment")}</Button>
      </div>

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {summaryCards.map((item) => (
            <Card key={item.label}><CardContent className="p-3"><p className="text-xs text-muted-foreground">{item.label}</p><p className="text-lg font-semibold">{item.value}</p></CardContent></Card>
          ))}
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="payments">{t("purchases.pay.tabs.payments")}</TabsTrigger>
          <TabsTrigger value="aging">{t("purchases.pay.tabs.aging")}</TabsTrigger>
          <TabsTrigger value="statement">{t("purchases.pay.tabs.statement")}</TabsTrigger>
        </TabsList>

        <TabsContent value="payments" className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder={t("purchases.pay.searchPlaceholder")} className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>{t("purchases.pay.columns.paymentNo")}</TableHead>
                  <TableHead>{t("purchases.shared.supplier")}</TableHead>
                  <TableHead>{t("purchases.shared.date")}</TableHead>
                  <TableHead>{t("purchases.shared.total")}</TableHead>
                  <TableHead>{t("purchases.pay.columns.allocated")}</TableHead>
                  <TableHead>{t("purchases.shared.status")}</TableHead>
                  <TableHead className="text-right">{t("purchases.shared.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((pay) => (
                  <TableRow key={pay.id}>
                    <TableCell className="font-mono text-sm">{pay.paymentNo}</TableCell>
                    <TableCell>{pay.supplierName ?? getSupplierName(pay.supplierId)}</TableCell>
                    <TableCell>{pay.paymentDate}</TableCell>
                    <TableCell>{pay.amount.toLocaleString()}</TableCell>
                    <TableCell>{pay.allocatedAmount.toLocaleString()}</TableCell>
                    <TableCell className="space-x-1">
                      <Badge variant="outline" className={statusColors[pay.status]}>{paymentStatusLabel(pay.status)}</Badge>
                      {pay.status === "posted" && <PostingStatusBadge postingStatus={pay.postingStatus} />}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button size="sm" variant="ghost" onClick={() => setViewId(pay.id)}><Eye className="h-3.5 w-3.5" /></Button>
                      {pay.status === "draft" && canApprove && <Button size="sm" variant="outline" onClick={() => void approveSupplierPaymentAction(pay.id).then(loadDashboard)}>{t("purchases.shared.approve")}</Button>}
                      {pay.status === "approved" && canApprove && <Button size="sm" onClick={() => void postSupplierPaymentAction(pay.id).then(loadDashboard)}><Upload className="h-3 w-3" /></Button>}
                      {(pay.status === "draft" || pay.status === "approved" || pay.status === "posted") && pay.status !== "void" && (
                        <Button size="sm" variant="destructive" onClick={() => void voidSupplierPaymentAction(pay.id).then(loadDashboard)}><Ban className="h-3 w-3" /></Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="aging">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>{t("purchases.shared.supplier")}</TableHead>
                  <TableHead>{t("purchases.pay.columns.current")}</TableHead>
                  <TableHead>{t("purchases.pay.columns.days1to30")}</TableHead>
                  <TableHead>{t("purchases.pay.columns.days31to60")}</TableHead>
                  <TableHead>{t("purchases.pay.columns.days61to90")}</TableHead>
                  <TableHead>{t("purchases.pay.columns.days90plus")}</TableHead>
                  <TableHead>{t("purchases.shared.total")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {aging?.suppliers.map((row) => (
                  <TableRow key={row.supplierId}>
                    <TableCell className="font-medium">{row.supplierName}</TableCell>
                    <TableCell>{row.current.toLocaleString()}</TableCell>
                    <TableCell>{row.days1to30.toLocaleString()}</TableCell>
                    <TableCell>{row.days31to60.toLocaleString()}</TableCell>
                    <TableCell>{row.days61to90.toLocaleString()}</TableCell>
                    <TableCell>{row.days90plus.toLocaleString()}</TableCell>
                    <TableCell className="font-semibold">{row.total.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="statement" className="space-y-4">
          <Select value={statementSupplierId} onValueChange={setStatementSupplierId}>
            <SelectTrigger className="max-w-sm"><SelectValue placeholder={t("purchases.pay.form.selectSupplier")} /></SelectTrigger>
            <SelectContent>
              {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
          {statement && (
            <div className="grid md:grid-cols-3 gap-3">
              <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">{t("purchases.pay.summary.invoiced")}</p><p className="text-lg font-semibold">{statement.totalInvoiced.toLocaleString()}</p></CardContent></Card>
              <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">{t("purchases.pay.summary.paid")}</p><p className="text-lg font-semibold">{statement.totalPaid.toLocaleString()}</p></CardContent></Card>
              <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">{t("purchases.pay.summary.outstanding")}</p><p className="text-lg font-semibold">{statement.outstanding.toLocaleString()}</p></CardContent></Card>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className={`${dialogSize.xl} ${dialogScroll}`}>
          <DialogHeader><DialogTitle>{t("purchases.pay.createPayment")}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t("purchases.shared.supplier")} *</label>
                <Select value={supplierId} onValueChange={handleSupplierSelect}>
                  <SelectTrigger><SelectValue placeholder={t("purchases.pay.form.selectSupplier")} /></SelectTrigger>
                  <SelectContent>{suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t("purchases.pay.form.paymentDate")}</label>
                <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t("purchases.pay.form.method")}</label>
                <Select value={paymentMethod} onValueChange={(v: PaymentMethod) => setPaymentMethod(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(["cash", "bank_transfer", "giro", "check", "other"] as const).map((m) => (
                      <SelectItem key={m} value={m}>{t(`purchases.pay.methods.${m}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {paymentMethod === "bank_transfer" && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Bank Account</label>
                  <Select value={bankAccountId} onValueChange={setBankAccountId}>
                    <SelectTrigger><SelectValue placeholder="Select bank account" /></SelectTrigger>
                    <SelectContent>
                      {banks.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.bankName} — {b.accountNumber}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t("purchases.pay.form.referenceNo")}</label>
                <Input value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t("purchases.pay.form.amount")}</label>
                <Input type="number" min={0} value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
              </div>
            </div>
            {supplierId && payableInvoices.length > 0 && (
              <Table>
                <TableHeader><TableRow><TableHead>{t("purchases.pay.columns.invoice")}</TableHead><TableHead>{t("purchases.inv.columns.outstanding")}</TableHead><TableHead>{t("purchases.pay.columns.allocate")}</TableHead></TableRow></TableHeader>
                <TableBody>
                  {payableInvoices.map((inv) => {
                    const outstanding = inv.outstandingAmount ?? inv.remainingAmount;
                    return (
                      <TableRow key={inv.id}>
                        <TableCell className="font-mono text-sm">{inv.invoiceNumber}</TableCell>
                        <TableCell>{outstanding.toLocaleString()}</TableCell>
                        <TableCell>
                          <Input type="number" min={0} max={outstanding} className="h-9 w-28" value={allocations[inv.id] ?? 0}
                            onChange={(e) => setAllocations((prev) => ({ ...prev, [inv.id]: Math.min(Number(e.target.value), outstanding) }))} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setFormOpen(false)}>{t("purchases.shared.cancel")}</Button>
              <Button onClick={() => void handleSave()}>{t("purchases.shared.saveDraft")}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewId} onOpenChange={(open) => !open && setViewId(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{t("purchases.pay.detailTitle")} — {viewedPayment?.paymentNo}</DialogTitle></DialogHeader>
          {viewedPayment && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">{t("purchases.shared.supplier")}:</span> {viewedPayment.supplierName ?? getSupplierName(viewedPayment.supplierId)}</div>
                <div><span className="text-muted-foreground">{t("purchases.shared.total")}:</span> {viewedPayment.amount.toLocaleString()}</div>
                <div><span className="text-muted-foreground">{t("purchases.shared.date")}:</span> {viewedPayment.paymentDate}</div>
                <div><span className="text-muted-foreground">{t("purchases.pay.form.method")}:</span> {t(`purchases.pay.methods.${viewedPayment.paymentMethod as PaymentMethod}`, { defaultValue: viewedPayment.paymentMethod })}</div>
              </div>
              <PostingStatusIndicator postingStatus={viewedPayment.postingStatus} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
