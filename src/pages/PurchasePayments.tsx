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
import { Plus, Search, Check, Upload, Ban } from "lucide-react";
import { toast } from "sonner";

const statusColors = {
  draft: "bg-muted text-muted-foreground",
  approved: "bg-info/15 text-info border-info/30",
  posted: "bg-success/15 text-success border-success/30",
  void: "bg-destructive/15 text-destructive border-destructive/30",
} as const;

export default function PurchasePayments() {
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

  const [tab, setTab] = useState("payments");
  const [search, setSearch] = useState("");
  const [summary, setSummary] = useState<ProcurementSummary | null>(null);
  const [aging, setAging] = useState<ApAgingReport | null>(null);
  const [statement, setStatement] = useState<SupplierStatement | null>(null);
  const [statementSupplierId, setStatementSupplierId] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "bank_transfer" | "giro" | "check" | "other">("bank_transfer");
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
    if (!supplierId || amount <= 0) { toast.error("Supplier and amount required"); return; }
    const allocRows = Object.entries(allocations)
      .filter(([, v]) => v > 0)
      .map(([invoiceId, allocatedAmount]) => ({ invoiceId, allocatedAmount }));
    if (allocRows.length === 0) { toast.error("Allocate to at least one invoice"); return; }

    await addSupplierPayment({
      supplierId,
      paymentDate,
      paymentMethod,
      referenceNo: referenceNo || undefined,
      amount,
      allocations: allocRows,
    });
    toast.success("Payment draft created");
    setFormOpen(false);
    await loadDashboard();
  };

  const filtered = supplierPayments.filter((p) =>
    p.paymentNo.toLowerCase().includes(search.toLowerCase()) ||
    (p.supplierName ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const getSupplierName = (id: string) => suppliers.find((s) => s.id === id)?.name ?? `Supplier #${id}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Supplier Payments</h1>
          <p className="text-sm text-muted-foreground">Draft → Approve → Post payment allocations</p>
        </div>
        <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> New Payment</Button>
      </div>

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: "Outstanding AP", value: summary.apOutstandingAmount.toLocaleString() },
            { label: "AP Paid", value: summary.apPaidAmount.toLocaleString() },
            { label: "Posted Payments", value: summary.postedPayments },
            { label: "Total Payments", value: summary.totalPayments },
            { label: "Voided", value: summary.voidedPayments },
          ].map((item) => (
            <Card key={item.label}><CardContent className="p-3"><p className="text-xs text-muted-foreground">{item.label}</p><p className="text-lg font-semibold">{item.value}</p></CardContent></Card>
          ))}
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="aging">AP Aging</TabsTrigger>
          <TabsTrigger value="statement">Supplier Statement</TabsTrigger>
        </TabsList>

        <TabsContent value="payments" className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search payment…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>Payment #</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Allocated</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
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
                    <TableCell><Badge variant="outline" className={statusColors[pay.status]}>{pay.status}</Badge></TableCell>
                    <TableCell className="text-right space-x-1">
                      {pay.status === "draft" && <Button size="sm" variant="outline" onClick={() => void approveSupplierPaymentAction(pay.id).then(loadDashboard)}>Approve</Button>}
                      {pay.status === "approved" && <Button size="sm" onClick={() => void postSupplierPaymentAction(pay.id).then(loadDashboard)}><Upload className="h-3 w-3" /></Button>}
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
                  <TableHead>Supplier</TableHead>
                  <TableHead>Current</TableHead>
                  <TableHead>1-30</TableHead>
                  <TableHead>31-60</TableHead>
                  <TableHead>61-90</TableHead>
                  <TableHead>90+</TableHead>
                  <TableHead>Total</TableHead>
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
            <SelectTrigger className="max-w-sm"><SelectValue placeholder="Select supplier" /></SelectTrigger>
            <SelectContent>
              {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
          {statement && (
            <div className="grid md:grid-cols-3 gap-3">
              <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Invoiced</p><p className="text-lg font-semibold">{statement.totalInvoiced.toLocaleString()}</p></CardContent></Card>
              <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Paid</p><p className="text-lg font-semibold">{statement.totalPaid.toLocaleString()}</p></CardContent></Card>
              <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Outstanding</p><p className="text-lg font-semibold">{statement.outstanding.toLocaleString()}</p></CardContent></Card>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Create Payment</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Supplier *</label>
                <Select value={supplierId} onValueChange={handleSupplierSelect}>
                  <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                  <SelectContent>{suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Payment Date</label>
                <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Method</label>
                <Select value={paymentMethod} onValueChange={(v: typeof paymentMethod) => setPaymentMethod(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="giro">Giro</SelectItem>
                    <SelectItem value="check">Check</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Reference No</label>
                <Input value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Amount *</label>
                <Input type="number" min={0} value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
              </div>
            </div>
            {supplierId && payableInvoices.length > 0 && (
              <Table>
                <TableHeader><TableRow><TableHead>Invoice</TableHead><TableHead>Outstanding</TableHead><TableHead>Allocate</TableHead></TableRow></TableHeader>
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
              <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button onClick={() => void handleSave()}>Save Draft</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
