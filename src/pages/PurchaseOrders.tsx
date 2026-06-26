import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PurchaseItemTable, PurchaseLineItem } from "@/components/PurchaseItemTable";
import { usePurchaseStore, POStatus } from "@/stores/purchaseStore";
import { useSupplierStore } from "@/stores/supplierStore";
import { useOutletStore } from "@/stores/outletStore";
import { useOutletInventory } from "@/hooks/useOutletInventory";
import { dialogScroll, dialogSize } from "@/lib/ui/dialogSizes";
import { usePurchasePermissions } from "@/hooks/usePurchasePermissions";
import { listWarehouses, type WarehouseApiRow } from "@/lib/api-integration/warehouseEndpoints";
import { useErpTranslation } from "@/i18n/useErpTranslation";
import { formatApiErrorMessage } from "@/i18n/apiErrorMessage";
import { Plus, Send, Search, Package, Check, Ban, Eye, Lock, X } from "lucide-react";
import { toast } from "sonner";

const statusColors: Record<POStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  submitted: "bg-info/15 text-info border-info/30",
  approved: "bg-success/15 text-success border-success/30",
  partially_received: "bg-warning/15 text-warning border-warning/30",
  received: "bg-primary/15 text-primary border-primary/30",
  cancelled: "bg-destructive/15 text-destructive border-destructive/30",
  closed: "bg-muted text-muted-foreground",
};

export default function PurchaseOrders() {
  const { t } = useErpTranslation();
  const [searchParams] = useSearchParams();
  const {
    purchaseOrders,
    addPO,
    updatePO,
    submitPO,
    approvePO,
    rejectPO,
    cancelPO,
    closePO,
    purchaseRequests,
    fetchPurchaseOrders,
    fetchPurchaseRequests,
  } = usePurchaseStore();
  const { suppliers, fetchSuppliers } = useSupplierStore();
  const activeOutletId = useOutletStore((s) => s.activeOutletId);
  useOutletInventory();
  const { canApprove } = usePurchasePermissions();
  const [warehouses, setWarehouses] = useState<WarehouseApiRow[]>([]);

  useEffect(() => {
    void Promise.all([fetchPurchaseOrders(), fetchPurchaseRequests(), fetchSuppliers()]);
  }, [fetchPurchaseOrders, fetchPurchaseRequests, fetchSuppliers, activeOutletId]);

  useEffect(() => {
    const poId = searchParams.get("poId");
    if (poId && purchaseOrders.length > 0) {
      setViewId(poId);
    }
  }, [searchParams, purchaseOrders]);

  useEffect(() => {
    if (typeof activeOutletId !== "number" || activeOutletId < 1) {
      setWarehouses([]);
      return;
    }
    void listWarehouses({ outletId: activeOutletId }).then(setWarehouses).catch(() => setWarehouses([]));
  }, [activeOutletId]);

  const [formOpen, setFormOpen] = useState(false);
  const [viewId, setViewId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [supplierId, setSupplierId] = useState("");
  const [destinationWarehouseId, setDestinationWarehouseId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [referencePR, setReferencePR] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<PurchaseLineItem[]>([]);

  const referencePrOptions = useMemo(() => {
    const approved = purchaseRequests.filter((p) => p.status === "approved");
    if (!referencePR || approved.some((p) => p.prNumber === referencePR)) {
      return approved;
    }
    const linked = purchaseRequests.find((p) => p.prNumber === referencePR);
    return linked ? [linked, ...approved] : approved;
  }, [purchaseRequests, referencePR]);

  const resetForm = () => {
    setEditId(null);
    setSupplierId("");
    setDestinationWarehouseId("");
    setDate(new Date().toISOString().slice(0, 10));
    setReferencePR("");
    setNotes("");
    setItems([]);
  };

  const openNew = () => { resetForm(); setFormOpen(true); };

  const openView = (poId: string) => setViewId(poId);

  const openEditForm = (poId: string) => {
    const po = purchaseOrders.find((p) => p.id === poId);
    if (!po || po.status !== "draft") return;
    setViewId(null);
    setEditId(poId);
    setSupplierId(po.supplierId);
    setDestinationWarehouseId(po.destinationWarehouseId ?? "");
    setDate(po.date);
    setReferencePR(po.referencePR ?? "");
    setNotes(po.notes ?? "");
    setItems(po.items.map((i) => ({
      inventoryItemId: i.inventoryItemId,
      qty: i.qty,
      prItemId: i.prItemId,
      requestedQty: i.requestedQty,
      prRemainingQty: i.requestedQty,
      isFromPr: i.isFromPr,
      unit: i.unit,
      price: i.price,
    })));
    setFormOpen(true);
  };

  const handleSelectPr = (prNumber: string) => {
    setReferencePR(prNumber);
    const pr = purchaseRequests.find((p) => p.prNumber === prNumber);
    if (!pr) return;
    setItems(pr.items.map((item) => ({
      inventoryItemId: item.inventoryItemId,
      qty: item.remainingQty ?? item.qty,
      prItemId: item.id,
      requestedQty: item.qty,
      prRemainingQty: item.remainingQty ?? item.qty,
      isFromPr: true,
      unit: item.unit,
      price: item.estimatedCost ?? 0,
    })));
  };

  const handleSaveDraft = async (closeAfter = true) => {
    if (!supplierId) { toast.error(t("purchases.po.selectSupplier")); return false; }
    if (items.length === 0 || items.some((i) => !i.inventoryItemId)) { toast.error(t("purchases.po.addValidItems")); return false; }
    const warehousePayload = destinationWarehouseId ? destinationWarehouseId : undefined;
    try {
      if (editId) {
        await updatePO(editId, { supplierId, destinationWarehouseId: warehousePayload, date, referencePR: referencePR || undefined, notes, items });
        toast.success(t("purchases.po.updated"));
      } else {
        const newId = await addPO({ supplierId, destinationWarehouseId: warehousePayload, date, referencePR: referencePR || undefined, notes, items });
        setEditId(newId);
        toast.success(t("purchases.po.savedDraft"));
      }
      if (closeAfter) {
        setFormOpen(false);
        resetForm();
      }
      return true;
    } catch (e) {
      toast.error(formatApiErrorMessage(e, t) || t("purchases.po.actionFailed"));
      return false;
    }
  };

  const handleSaveAndSubmit = async () => {
    const saved = await handleSaveDraft(false);
    if (!saved || !editId) return;
    try {
      await submitPO(editId);
      toast.success(t("purchases.po.workflowSubmitted"));
      setFormOpen(false);
      resetForm();
      setViewId(editId);
    } catch (e) {
      toast.error(formatApiErrorMessage(e, t) || t("purchases.po.actionFailed"));
    }
  };

  const runWorkflow = async (action: "submit" | "approve" | "reject" | "cancel" | "close", poId: string) => {
    try {
      if (action === "submit") await submitPO(poId);
      if (action === "approve") await approvePO(poId);
      if (action === "reject") await rejectPO(poId);
      if (action === "cancel") await cancelPO(poId);
      if (action === "close") await closePO(poId);
      const msg = {
        submit: t("purchases.po.workflowSubmitted"),
        approve: t("purchases.po.workflowApproved"),
        reject: t("purchases.po.workflowRejected"),
        cancel: t("purchases.po.workflowCancelled"),
        close: t("purchases.po.workflowClosed"),
      }[action];
      toast.success(msg);
      setViewId(null);
    } catch (e) {
      toast.error(formatApiErrorMessage(e, t) || t("purchases.po.actionFailed"));
    }
  };

  const getSupplierName = (id: string) => suppliers.find((s) => s.id === id)?.name ?? "—";
  const getTotal = (po: typeof purchaseOrders[0]) => po.items.reduce((s, i) => s + i.qty * i.price, 0);

  const filtered = purchaseOrders.filter(
    (po) => po.poNumber.toLowerCase().includes(search.toLowerCase()) || getSupplierName(po.supplierId).toLowerCase().includes(search.toLowerCase())
  );

  const viewed = useMemo(() => purchaseOrders.find((p) => p.id === viewId) ?? null, [purchaseOrders, viewId]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("purchases.po.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("purchases.po.subtitle")}</p>
        </div>
        <Button onClick={openNew} className="gap-2" disabled={!activeOutletId || activeOutletId < 1}>
          <Plus className="h-4 w-4" /> {t("purchases.po.newPo")}
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder={t("purchases.po.searchPlaceholder")} className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead>{t("purchases.po.poNumber")}</TableHead>
                <TableHead>{t("purchases.shared.supplier")}</TableHead>
                <TableHead>{t("purchases.po.source")}</TableHead>
                <TableHead>{t("purchases.po.progress")}</TableHead>
                <TableHead>{t("purchases.shared.total")}</TableHead>
                <TableHead>{t("purchases.shared.status")}</TableHead>
                <TableHead className="text-right">{t("purchases.shared.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    <Package className="h-10 w-10 mx-auto mb-2 opacity-30" />{t("purchases.po.empty")}
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((po) => (
                <TableRow key={po.id} className="cursor-pointer hover:bg-muted/30" onClick={() => openView(po.id)}>
                  <TableCell className="font-mono font-semibold text-sm">{po.poNumber}</TableCell>
                  <TableCell className="text-sm">{getSupplierName(po.supplierId)}</TableCell>
                  <TableCell className="text-sm">{po.sourceType ?? (po.referencePR ? "PR" : "DIRECT")}</TableCell>
                  <TableCell className="text-sm w-36">
                    <div className="space-y-1">
                      <Progress value={po.completionPercentage ?? 0} className="h-1.5" />
                      <span className="text-xs text-muted-foreground">{po.completionPercentage ?? 0}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm font-medium">Rp {getTotal(po).toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusColors[po.status]}>{t(`purchases.status.${po.status}`)}</Badge>
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <Button size="sm" variant="ghost" onClick={() => openView(po.id)}><Eye className="h-3.5 w-3.5" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? t("purchases.po.edit") : t("purchases.po.new")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t("purchases.shared.supplier")} *</label>
                <Select value={supplierId} onValueChange={setSupplierId}>
                  <SelectTrigger><SelectValue placeholder={t("purchases.po.selectSupplierPlaceholder")} /></SelectTrigger>
                  <SelectContent>
                    {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t("purchases.shared.date")}</label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t("purchases.po.referencePr")}</label>
                <Select value={referencePR} onValueChange={handleSelectPr}>
                  <SelectTrigger><SelectValue placeholder={t("purchases.shared.optional")} /></SelectTrigger>
                  <SelectContent>
                    {referencePR && !referencePrOptions.some((p) => p.prNumber === referencePR) && (
                      <SelectItem value={referencePR}>{referencePR}</SelectItem>
                    )}
                    {referencePrOptions.map((pr) => (
                      <SelectItem key={pr.id} value={pr.prNumber}>
                        {pr.prNumber}{pr.status === "converted" ? ` (${t("purchases.status.converted")})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t("purchases.po.destinationWarehouse")}</label>
                <Select value={destinationWarehouseId || "__none__"} onValueChange={(v) => setDestinationWarehouseId(v === "__none__" ? "" : v)} disabled={warehouses.length === 0}>
                  <SelectTrigger><SelectValue placeholder={warehouses.length === 0 ? t("purchases.po.noWarehouses") : t("purchases.shared.optional")} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">{t("purchases.po.none")}</SelectItem>
                    {warehouses.map((w) => <SelectItem key={w.id} value={w.id}>{w.code} — {w.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t("purchases.shared.notes")}</label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t("purchases.po.items")}</label>
              <PurchaseItemTable items={items} onChange={setItems} showPrice showPrComparison />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setFormOpen(false)}>{t("purchases.shared.cancel")}</Button>
              <Button variant="secondary" onClick={() => void handleSaveDraft()}>{t("purchases.po.saveDraft")}</Button>
              {editId && (
                <Button onClick={() => void handleSaveAndSubmit()} className="gap-1">
                  <Send className="h-3.5 w-3.5" /> {t("purchases.po.saveAndSubmit")}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewed} onOpenChange={(o) => { if (!o) setViewId(null); }}>
        <DialogContent className={`${dialogSize.xl} ${dialogScroll}`}>
          <DialogHeader>
            <DialogTitle>{viewed?.poNumber}</DialogTitle>
          </DialogHeader>
          {viewed && (
            <div className="space-y-4 text-sm">
              {viewed.status === "draft" && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-100">
                  {t("purchases.po.submitHint")}
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">{t("purchases.shared.status")}</span>
                <Badge variant="outline" className={statusColors[viewed.status]}>{t(`purchases.status.${viewed.status}`)}</Badge>
              </div>
              <div className="flex justify-between"><span className="text-muted-foreground">{t("purchases.shared.supplier")}</span><span>{getSupplierName(viewed.supplierId)}</span></div>
              {viewed.referencePR && <div className="flex justify-between"><span className="text-muted-foreground">{t("purchases.po.relatedPr")}</span><span>{viewed.referencePR}</span></div>}
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{t("purchases.po.receivedOrdered")}</span>
                  <span>{viewed.totalReceivedQty ?? 0} / {viewed.totalOrderedQty ?? 0} ({viewed.completionPercentage ?? 0}%)</span>
                </div>
                <Progress value={viewed.completionPercentage ?? 0} />
              </div>
              <div className="border rounded-lg divide-y">
                {viewed.items.map((item, idx) => (
                  <div key={idx} className="px-3 py-2 grid grid-cols-4 gap-2 text-xs">
                    <span className="col-span-2">{t("purchases.po.itemLabel", { id: item.inventoryItemId })}</span>
                    <span>{t("purchases.po.ordered")} {item.qty}</span>
                    <span>{t("purchases.po.receivedQty")} {item.receivedQty} · {t("purchases.po.remaining")} {item.remainingQty ?? Math.max(0, item.qty - item.receivedQty)}</span>
                  </div>
                ))}
              </div>
              {viewed.goodsReceipts && viewed.goodsReceipts.length > 0 && (
                <div>
                  <p className="text-muted-foreground mb-1">{t("purchases.po.relatedGrns")}</p>
                  <div className="flex flex-wrap gap-1">
                    {viewed.goodsReceipts.map((g) => (
                      <Badge key={g.id} variant="secondary">{g.grnNumber}</Badge>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex flex-wrap gap-2 justify-end pt-2">
                {viewed.status === "draft" && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => openEditForm(viewed.id)}>{t("purchases.po.editBtn")}</Button>
                    <Button size="sm" variant="outline" onClick={() => void runWorkflow("cancel", viewed.id)}><Ban className="h-3.5 w-3.5 mr-1" /> {t("purchases.po.cancel")}</Button>
                    <Button size="sm" onClick={() => void runWorkflow("submit", viewed.id)}><Send className="h-3.5 w-3.5 mr-1" /> {t("purchases.po.submit")}</Button>
                  </>
                )}
                {viewed.status === "submitted" && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => void runWorkflow("cancel", viewed.id)}>{t("purchases.po.cancel")}</Button>
                    {canApprove && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => void runWorkflow("reject", viewed.id)}><X className="h-3.5 w-3.5 mr-1" /> {t("purchases.po.reject")}</Button>
                        <Button size="sm" onClick={() => void runWorkflow("approve", viewed.id)}><Check className="h-3.5 w-3.5 mr-1" /> {t("purchases.po.approve")}</Button>
                      </>
                    )}
                  </>
                )}
                {viewed.status === "received" && (
                  <Button size="sm" onClick={() => void runWorkflow("close", viewed.id)}><Lock className="h-3.5 w-3.5 mr-1" /> {t("purchases.po.close")}</Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
