import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePurchaseStore, InvoiceStatus } from "@/stores/purchaseStore";
import { useInventoryStore } from "@/stores/inventoryStore";
import { useSupplierStore } from "@/stores/supplierStore";
import { useOutletStore } from "@/stores/outletStore";
import { getProcurementSummary, type ProcurementSummary, type SupplierPayableRow } from "@/lib/api-integration/purchaseEndpoints";
import { useErpTranslation } from "@/i18n/useErpTranslation";
import { formatApiErrorMessage } from "@/i18n/apiErrorMessage";
import { Plus, Receipt, Search, Check, Send, Ban, Eye } from "lucide-react";
import PostingStatusIndicator, { PostingStatusBadge } from "@/components/procurement/PostingStatusIndicator";
import { toast } from "sonner";

const statusColors: Record<InvoiceStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  submitted: "bg-info/15 text-info border-info/30",
  approved: "bg-warning/15 text-warning border-warning/30",
  partial: "bg-warning/15 text-warning border-warning/30",
  paid: "bg-success/15 text-success border-success/30",
  void: "bg-destructive/15 text-destructive border-destructive/30",
};

const matchColors: Record<string, string> = {
  matched: "bg-success/15 text-success border-success/30",
  matched_with_tolerance: "bg-info/15 text-info border-info/30",
  mismatch: "bg-destructive/15 text-destructive border-destructive/30",
  blocked: "bg-muted text-muted-foreground",
};

export default function PurchaseInvoices() {
  const { t } = useErpTranslation();
  const {
    invoices,
    addInvoice,
    submitInvoice,
    approveInvoice,
    voidInvoice,
    purchaseOrders,
    goodsReceipts,
    fetchPurchaseOrders,
    fetchGoodsReceipts,
    fetchPurchaseInvoices,
    fetchSupplierPayables,
  } = usePurchaseStore();
  const { suppliers, fetchSuppliers } = useSupplierStore();
  const { ingredients } = useInventoryStore();
  const activeOutletId = useOutletStore((s) => s.activeOutletId);

  const [tab, setTab] = useState("invoices");
  const [formOpen, setFormOpen] = useState(false);
  const [viewId, setViewId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [summary, setSummary] = useState<ProcurementSummary | null>(null);
  const [payables, setPayables] = useState<SupplierPayableRow[]>([]);

  const [selectedPO, setSelectedPO] = useState("");
  const [selectedGR, setSelectedGR] = useState("");
  const [supplierInvoiceNo, setSupplierInvoiceNo] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState("");
  const [tax, setTax] = useState(0);
  const [taxPercentage, setTaxPercentage] = useState(11);
  const [lineQtys, setLineQtys] = useState<Record<string, number>>({});

  const loadDashboard = async () => {
    if (typeof activeOutletId !== "number" || activeOutletId < 1) {
      setSummary(null);
      setPayables([]);
      return;
    }
    try {
      const [sum, pay] = await Promise.all([
        getProcurementSummary({ outletId: activeOutletId }),
        fetchSupplierPayables(),
      ]);
      setSummary(sum);
      setPayables(pay);
    } catch {
      setSummary(null);
      setPayables([]);
    }
  };

  useEffect(() => {
    void Promise.all([fetchPurchaseOrders(), fetchGoodsReceipts(), fetchPurchaseInvoices(), fetchSuppliers(), loadDashboard()]);
  }, [fetchPurchaseOrders, fetchGoodsReceipts, fetchPurchaseInvoices, fetchSuppliers, activeOutletId]);

  const openNew = () => {
    setSelectedPO("");
    setSelectedGR("");
    setSupplierInvoiceNo("");
    setDate(new Date().toISOString().slice(0, 10));
    setDueDate("");
    setTax(0);
    setLineQtys({});
    setFormOpen(true);
  };

  const handlePOSelect = (poId: string) => {
    setSelectedPO(poId);
    setSelectedGR("");
    setLineQtys({});
  };

  const handleGRSelect = (grId: string) => {
    setSelectedGR(grId);
    const gr = goodsReceipts.find((g) => g.id === grId);
    if (gr) {
      const qtys: Record<string, number> = {};
      gr.items.forEach((i) => { qtys[i.inventoryItemId] = i.receivedQty; });
      setLineQtys(qtys);
    }
  };

  const handleSaveDraft = async () => {
    const po = purchaseOrders.find((p) => p.id === selectedPO);
    const gr = goodsReceipts.find((g) => g.id === selectedGR);
    if (!po || !gr) { toast.error(t("purchases.inv.selectPoGrn")); return; }
    if (gr.status !== "posted") { toast.error(t("purchases.inv.postedGrnOnly")); return; }

    const items = gr.items
      .map((i) => ({
        inventoryItemId: i.inventoryItemId,
        qty: lineQtys[i.inventoryItemId] ?? i.receivedQty,
      }))
      .filter((i) => i.qty > 0);

    try {
      const id = await addInvoice({
        purchaseOrderId: po.id,
        goodsReceiptId: gr.id,
        supplierInvoiceNo: supplierInvoiceNo || undefined,
        date,
        dueDate: dueDate || undefined,
        tax: tax > 0 ? tax : undefined,
        taxPercentage: tax <= 0 ? taxPercentage : undefined,
        items,
      });
      toast.success(t("purchases.inv.draftCreated"));
      setFormOpen(false);
      await loadDashboard();
      return id;
    } catch (e) {
      toast.error(formatApiErrorMessage(e, t) || t("purchases.shared.actionFailed"));
    }
  };

  const getSupplierName = (id: string) => suppliers.find((s) => s.id === id)?.name ?? "—";
  const getItemName = (id: string) => ingredients.find((i) => i.id === id)?.name ?? `Item #${id}`;

  const filtered = invoices.filter((inv) =>
    inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
    inv.poReference.toLowerCase().includes(search.toLowerCase())
  );

  const outstandingInvoices = invoices.filter((inv) =>
    ["approved", "partial"].includes(inv.status) && (inv.outstandingAmount ?? inv.remainingAmount) > 0
  );

  const viewedInvoice = viewId ? invoices.find((inv) => inv.id === viewId) : null;

  const eligiblePOs = purchaseOrders.filter((po) => ["approved", "partially_received", "received"].includes(po.status));
  const eligibleGRs = goodsReceipts.filter((gr) => {
    if (gr.status !== "posted") return false;
    const po = purchaseOrders.find((p) => p.id === selectedPO);
    return po ? gr.poReference === po.poNumber : false;
  });

  const selectedGr = goodsReceipts.find((g) => g.id === selectedGR);

  const summaryCards = summary ? [
    { label: t("purchases.inv.summary.outstandingAp"), value: summary.outstandingPayables.toLocaleString() },
    { label: t("purchases.inv.summary.overdue"), value: summary.overdueInvoices },
    { label: t("purchases.inv.summary.draft"), value: summary.draftInvoices },
    { label: t("purchases.inv.summary.submitted"), value: summary.submittedInvoices },
    { label: t("purchases.inv.summary.approved"), value: summary.approvedInvoices },
    { label: t("purchases.inv.summary.paid"), value: summary.paidInvoices },
  ] : [];

  const invoiceStatusLabel = (status: InvoiceStatus) => {
    if (status === "partial") return t("purchases.status.partial");
    return t(`purchases.status.${status}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("purchases.inv.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("purchases.inv.subtitle")}</p>
        </div>
        <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> {t("purchases.inv.newInvoice")}</Button>
      </div>

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {summaryCards.map((item) => (
            <Card key={item.label}>
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="text-lg font-semibold">{item.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="invoices">{t("purchases.inv.tabs.invoices")}</TabsTrigger>
          <TabsTrigger value="outstanding">{t("purchases.inv.tabs.outstanding")}</TabsTrigger>
          <TabsTrigger value="payables">{t("purchases.inv.tabs.payables")}</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder={t("purchases.inv.searchPlaceholder")} className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>{t("purchases.inv.columns.invoiceNo")}</TableHead>
                    <TableHead>{t("purchases.shared.supplier")}</TableHead>
                    <TableHead>{t("purchases.inv.columns.poGrn")}</TableHead>
                    <TableHead>{t("purchases.inv.columns.due")}</TableHead>
                    <TableHead>{t("purchases.shared.total")}</TableHead>
                    <TableHead>{t("purchases.inv.columns.outstanding")}</TableHead>
                    <TableHead>{t("purchases.shared.status")}</TableHead>
                    <TableHead className="text-right">{t("purchases.shared.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                        <Receipt className="h-10 w-10 mx-auto mb-2 opacity-30" />{t("purchases.inv.empty")}
                      </TableCell>
                    </TableRow>
                  )}
                  {filtered.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-mono font-semibold text-sm">{inv.invoiceNumber}</TableCell>
                      <TableCell className="text-sm">{getSupplierName(inv.supplierId)}</TableCell>
                      <TableCell className="text-sm font-mono">{inv.poReference} / {inv.grReference}</TableCell>
                      <TableCell className="text-sm">{inv.dueDate ?? "—"}</TableCell>
                      <TableCell className="text-sm font-medium">{inv.total.toLocaleString()}</TableCell>
                      <TableCell className="text-sm">{(inv.outstandingAmount ?? inv.remainingAmount).toLocaleString()}</TableCell>
                      <TableCell className="space-x-1">
                        <Badge variant="outline" className={statusColors[inv.status]}>{invoiceStatusLabel(inv.status)}</Badge>
                        {inv.matchStatus && (
                          <Badge variant="outline" className={matchColors[inv.matchStatus] ?? "bg-muted text-muted-foreground"}>
                            {t(`purchases.matchStatus.${inv.matchStatus}`, { defaultValue: inv.matchStatus })}
                          </Badge>
                        )}
                        {["approved", "partial", "paid"].includes(inv.status) && (
                          <PostingStatusBadge postingStatus={inv.postingStatus} />
                        )}
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button size="sm" variant="ghost" onClick={() => setViewId(inv.id)}><Eye className="h-3.5 w-3.5" /></Button>
                        {inv.status === "draft" && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => void submitInvoice(inv.id).then(loadDashboard)}><Send className="h-3 w-3" /></Button>
                            <Button size="sm" variant="destructive" onClick={() => void voidInvoice(inv.id).then(loadDashboard)}><Ban className="h-3 w-3" /></Button>
                          </>
                        )}
                        {inv.status === "submitted" && (
                          <>
                            <Button size="sm" onClick={() => void approveInvoice(inv.id).then(() => { toast.success(t("purchases.inv.approved")); return loadDashboard(); })}><Check className="h-3 w-3" /></Button>
                            <Button size="sm" variant="destructive" onClick={() => void voidInvoice(inv.id).then(loadDashboard)}><Ban className="h-3 w-3" /></Button>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="outstanding">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>{t("purchases.inv.columns.invoiceNo")}</TableHead>
                    <TableHead>{t("purchases.shared.supplier")}</TableHead>
                    <TableHead>{t("purchases.inv.columns.due")}</TableHead>
                    <TableHead>{t("purchases.inv.columns.outstanding")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {outstandingInvoices.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-mono text-sm">{inv.invoiceNumber}</TableCell>
                      <TableCell>{getSupplierName(inv.supplierId)}</TableCell>
                      <TableCell>{inv.dueDate ?? "—"}</TableCell>
                      <TableCell className="font-medium">{(inv.outstandingAmount ?? inv.remainingAmount).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payables">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>{t("purchases.shared.supplier")}</TableHead>
                    <TableHead>{t("purchases.inv.columns.invoices")}</TableHead>
                    <TableHead>{t("purchases.inv.columns.outstanding")}</TableHead>
                    <TableHead>{t("purchases.inv.summary.overdue")}</TableHead>
                    <TableHead>{t("purchases.inv.columns.lastInvoice")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payables.map((row) => (
                    <TableRow key={row.supplierId}>
                      <TableCell className="font-medium">{row.supplierName}</TableCell>
                      <TableCell>{row.invoiceCount}</TableCell>
                      <TableCell>{row.outstandingBalance.toLocaleString()}</TableCell>
                      <TableCell>{row.overdueBalance.toLocaleString()}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{row.lastInvoiceNumber} ({row.lastInvoiceDate})</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{t("purchases.inv.createDraft")}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t("purchases.inv.form.po")}</label>
                <Select value={selectedPO} onValueChange={handlePOSelect}>
                  <SelectTrigger><SelectValue placeholder={t("purchases.inv.form.selectPo")} /></SelectTrigger>
                  <SelectContent>
                    {eligiblePOs.map((po) => (
                      <SelectItem key={po.id} value={po.id}>{po.poNumber}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t("purchases.inv.form.postedGrn")}</label>
                <Select value={selectedGR} onValueChange={handleGRSelect}>
                  <SelectTrigger><SelectValue placeholder={t("purchases.inv.form.selectGrn")} /></SelectTrigger>
                  <SelectContent>
                    {eligibleGRs.map((gr) => (
                      <SelectItem key={gr.id} value={gr.id}>{gr.grnNumber}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t("purchases.inv.form.supplierInvoiceNo")}</label>
                <Input value={supplierInvoiceNo} onChange={(e) => setSupplierInvoiceNo(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t("purchases.inv.form.invoiceDate")}</label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t("purchases.inv.form.dueDate")}</label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} placeholder={t("purchases.inv.form.dueDatePlaceholder")} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t("purchases.inv.form.taxPercent")}</label>
                <Input type="number" min={0} max={100} value={taxPercentage} onChange={(e) => setTaxPercentage(Number(e.target.value))} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t("purchases.inv.form.taxOverride")}</label>
                <Input type="number" min={0} value={tax} onChange={(e) => setTax(Number(e.target.value))} />
              </div>
            </div>

            {selectedGr && (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>{t("purchases.grn.item")}</TableHead>
                      <TableHead>{t("purchases.inv.form.received")}</TableHead>
                      <TableHead>{t("purchases.inv.form.invoiceQty")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedGr.items.map((item) => (
                      <TableRow key={item.inventoryItemId}>
                        <TableCell className="text-sm">{getItemName(item.inventoryItemId)}</TableCell>
                        <TableCell>{item.receivedQty}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            max={item.receivedQty}
                            className="h-9 w-24"
                            value={lineQtys[item.inventoryItemId] ?? item.receivedQty}
                            onChange={(e) => setLineQtys((prev) => ({
                              ...prev,
                              [item.inventoryItemId]: Math.min(Number(e.target.value), item.receivedQty),
                            }))}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setFormOpen(false)}>{t("purchases.shared.cancel")}</Button>
              <Button onClick={() => void handleSaveDraft()}>{t("purchases.shared.saveDraft")}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewId} onOpenChange={(open) => !open && setViewId(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{t("purchases.inv.detailTitle")} — {viewedInvoice?.invoiceNumber}</DialogTitle></DialogHeader>
          {viewedInvoice && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">{t("purchases.shared.supplier")}:</span> {getSupplierName(viewedInvoice.supplierId)}</div>
                <div><span className="text-muted-foreground">{t("purchases.shared.total")}:</span> {viewedInvoice.total.toLocaleString()}</div>
                <div><span className="text-muted-foreground">{t("purchases.inv.columns.poGrn")}:</span> {viewedInvoice.poReference} / {viewedInvoice.grReference}</div>
                <div><span className="text-muted-foreground">{t("purchases.inv.columns.due")}:</span> {viewedInvoice.dueDate ?? "—"}</div>
              </div>
              <PostingStatusIndicator postingStatus={viewedInvoice.postingStatus} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
