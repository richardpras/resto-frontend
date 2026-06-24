import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { usePurchaseStore, GRNStatus } from "@/stores/purchaseStore";
import { useOutletStore } from "@/stores/outletStore";
import { getProcurementSummary, type ProcurementSummary } from "@/lib/api-integration/purchaseEndpoints";
import { listWarehouses, type WarehouseApiRow } from "@/lib/api-integration/warehouseEndpoints";
import { dialogScroll, dialogSize } from "@/lib/ui/dialogSizes";
import { useErpTranslation } from "@/i18n/useErpTranslation";
import { formatApiErrorMessage } from "@/i18n/apiErrorMessage";
import { Plus, PackageCheck, Search, Check, Upload, Ban, Eye } from "lucide-react";
import PostingStatusIndicator, { PostingStatusBadge } from "@/components/procurement/PostingStatusIndicator";
import { useOutletInventory } from "@/hooks/useOutletInventory";
import { toast } from "sonner";

const statusColors: Record<GRNStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  received: "bg-warning/15 text-warning border-warning/30",
  posted: "bg-success/15 text-success border-success/30",
  cancelled: "bg-destructive/15 text-destructive border-destructive/30",
};

export default function GoodsReceipts() {
  const { t } = useErpTranslation();
  const {
    goodsReceipts,
    addGRN,
    receiveGRN,
    postGRN,
    cancelGRN,
    getGRNProgress,
    purchaseOrders,
    fetchGoodsReceipts,
    fetchPurchaseOrders,
  } = usePurchaseStore();
  const activeOutletId = useOutletStore((s) => s.activeOutletId);
  const { resolveItemName } = useOutletInventory();

  const [formOpen, setFormOpen] = useState(false);
  const [viewId, setViewId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [summary, setSummary] = useState<ProcurementSummary | null>(null);
  const [warehouses, setWarehouses] = useState<WarehouseApiRow[]>([]);
  const [progress, setProgress] = useState<{ orderedQty: number; receivedQty: number; remainingQty: number; completionPercentage: number } | null>(null);

  const [selectedPO, setSelectedPO] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [supplierDeliveryNo, setSupplierDeliveryNo] = useState("");
  const [supplierDeliveryDate, setSupplierDeliveryDate] = useState("");
  const [vehicleNo, setVehicleNo] = useState("");
  const [driverName, setDriverName] = useState("");
  const [receivedBy, setReceivedBy] = useState("");
  const [receivedQtys, setReceivedQtys] = useState<Record<string, number>>({});

  const loadSummary = async () => {
    if (typeof activeOutletId !== "number" || activeOutletId < 1) {
      setSummary(null);
      return;
    }
    try {
      const data = await getProcurementSummary({ outletId: activeOutletId });
      setSummary(data);
    } catch {
      setSummary(null);
    }
  };

  useEffect(() => {
    void Promise.all([fetchGoodsReceipts(), fetchPurchaseOrders(), loadSummary()]);
  }, [fetchGoodsReceipts, fetchPurchaseOrders, activeOutletId]);

  useEffect(() => {
    if (typeof activeOutletId !== "number" || activeOutletId < 1) {
      setWarehouses([]);
      return;
    }
    void listWarehouses({ outletId: activeOutletId }).then(setWarehouses).catch(() => setWarehouses([]));
  }, [activeOutletId]);

  useEffect(() => {
    if (!viewId) {
      setProgress(null);
      return;
    }
    void getGRNProgress(viewId).then(setProgress).catch(() => setProgress(null));
  }, [viewId, getGRNProgress, goodsReceipts]);

  const receivablePOs = purchaseOrders.filter((po) => po.status === "approved" || po.status === "partially_received");
  const viewedGrn = goodsReceipts.find((g) => g.id === viewId);

  const openNew = () => {
    setSelectedPO("");
    setWarehouseId("");
    setDate(new Date().toISOString().slice(0, 10));
    setSupplierDeliveryNo("");
    setSupplierDeliveryDate("");
    setVehicleNo("");
    setDriverName("");
    setReceivedBy("");
    setReceivedQtys({});
    setFormOpen(true);
  };

  const handlePOSelect = (poId: string) => {
    setSelectedPO(poId);
    const po = purchaseOrders.find((p) => p.id === poId);
    if (po) {
      const qtys: Record<string, number> = {};
      po.items.forEach((i) => { qtys[i.inventoryItemId] = Math.max(0, i.qty - i.receivedQty); });
      setReceivedQtys(qtys);
      if (po.destinationWarehouseId) setWarehouseId(po.destinationWarehouseId);
    }
  };

  const handleCreateDraft = async () => {
    const po = purchaseOrders.find((p) => p.id === selectedPO);
    if (!po) { toast.error(t("purchases.grn.selectPoRequired")); return; }
    if (!warehouseId) { toast.error(t("purchases.grn.selectWarehouseRequired")); return; }

    const grnItems = po.items.map((i) => ({
      inventoryItemId: i.inventoryItemId,
      orderedQty: i.qty,
      receivedQty: receivedQtys[i.inventoryItemId] ?? 0,
      unit: i.unit,
    })).filter((i) => i.receivedQty > 0);

    if (grnItems.length === 0) { toast.error(t("purchases.grn.enterReceivedQty")); return; }

    try {
      await addGRN({
        poReference: po.poNumber,
        warehouseId,
        date,
        status: "draft",
        supplierDeliveryNo: supplierDeliveryNo || undefined,
        supplierDeliveryDate: supplierDeliveryDate || undefined,
        vehicleNo: vehicleNo || undefined,
        driverName: driverName || undefined,
        receivedBy: receivedBy || undefined,
        items: grnItems,
      });
      toast.success(t("purchases.grn.draftCreated"));
      setFormOpen(false);
      await loadSummary();
    } catch (e) {
      toast.error(formatApiErrorMessage(e, t) || t("purchases.shared.actionFailed"));
    }
  };

  const handleReceive = async (id: string) => {
    try {
      await receiveGRN(id);
      toast.success(t("purchases.grn.markedReceived"));
      await loadSummary();
    } catch (e) {
      toast.error(formatApiErrorMessage(e, t) || t("purchases.shared.actionFailed"));
    }
  };

  const handlePost = async (id: string) => {
    try {
      await postGRN(id);
      toast.success(t("purchases.grn.inventoryPosted"));
      await loadSummary();
    } catch (e) {
      toast.error(formatApiErrorMessage(e, t) || t("purchases.shared.actionFailed"));
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await cancelGRN(id);
      toast.success(t("purchases.grn.cancelled"));
      setViewId(null);
      await loadSummary();
    } catch (e) {
      toast.error(formatApiErrorMessage(e, t) || t("purchases.shared.actionFailed"));
    }
  };

  const getItemName = (id: string, ingredientName?: string | null) =>
    ingredientName?.trim() || resolveItemName(id);
  const filtered = goodsReceipts.filter((g) =>
    g.grnNumber.toLowerCase().includes(search.toLowerCase()) ||
    g.poReference.toLowerCase().includes(search.toLowerCase())
  );

  const warehouseName = (id?: string) => warehouses.find((w) => w.id === id)?.name ?? (id ? `Warehouse #${id}` : "—");

  const summaryCards = summary ? [
    { label: t("purchases.grn.summaryDraft"), value: summary.draftReceivings },
    { label: t("purchases.grn.summaryReceived"), value: summary.receivedReceivings },
    { label: t("purchases.grn.summaryPosted"), value: summary.postedReceivings },
    { label: t("purchases.grn.summaryCancelled"), value: summary.cancelledReceivings },
    { label: t("purchases.grn.summaryTodayPosted"), value: summary.todayReceivings },
    { label: t("purchases.grn.summaryTodayValue"), value: summary.todayReceivedValue.toLocaleString() },
    { label: t("purchases.grn.summaryTotalGrn"), value: summary.totalGoodsReceipts },
  ] : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("purchases.grn.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("purchases.grn.subtitle")}</p>
        </div>
        <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> {t("purchases.grn.newGrn")}</Button>
      </div>

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
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

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder={t("purchases.grn.searchPlaceholder")} className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead>{t("purchases.grn.grnNumber")}</TableHead>
                <TableHead>{t("purchases.grn.poReference")}</TableHead>
                <TableHead>{t("purchases.shared.date")}</TableHead>
                <TableHead>{t("purchases.shared.items")}</TableHead>
                <TableHead>{t("purchases.shared.status")}</TableHead>
                <TableHead className="text-right">{t("purchases.shared.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    <PackageCheck className="h-10 w-10 mx-auto mb-2 opacity-30" />{t("purchases.grn.empty")}
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((grn) => (
                <TableRow key={grn.id}>
                  <TableCell className="font-mono font-semibold text-sm">{grn.grnNumber}</TableCell>
                  <TableCell className="text-sm font-mono">{grn.poReference}</TableCell>
                  <TableCell className="text-sm">{grn.date}</TableCell>
                  <TableCell className="text-sm">{t("purchases.grn.itemsCount", { count: grn.items.length })}</TableCell>
                  <TableCell className="space-x-1">
                    <Badge variant="outline" className={statusColors[grn.status]}>{t(`purchases.status.${grn.status}`)}</Badge>
                    {grn.status === "posted" && <PostingStatusBadge postingStatus={grn.postingStatus} />}
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button size="sm" variant="ghost" onClick={() => setViewId(grn.id)}><Eye className="h-3.5 w-3.5" /></Button>
                    {grn.status === "draft" && (
                      <Button size="sm" variant="outline" onClick={() => void handleReceive(grn.id)}>{t("purchases.grn.receive")}</Button>
                    )}
                    {grn.status === "received" && (
                      <Button size="sm" onClick={() => void handlePost(grn.id)} className="gap-1"><Upload className="h-3.5 w-3.5" /> {t("purchases.grn.post")}</Button>
                    )}
                    {(grn.status === "draft" || grn.status === "received") && (
                      <Button size="sm" variant="destructive" onClick={() => void handleCancel(grn.id)}><Ban className="h-3.5 w-3.5" /></Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{t("purchases.grn.createDraft")}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t("purchases.grn.poReference")} *</label>
                <Select value={selectedPO} onValueChange={handlePOSelect}>
                  <SelectTrigger><SelectValue placeholder={t("purchases.grn.selectPo")} /></SelectTrigger>
                  <SelectContent>
                    {receivablePOs.map((po) => <SelectItem key={po.id} value={po.id}>{po.poNumber}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t("purchases.grn.warehouse")} *</label>
                <Select value={warehouseId} onValueChange={setWarehouseId}>
                  <SelectTrigger><SelectValue placeholder={t("purchases.grn.selectWarehouse")} /></SelectTrigger>
                  <SelectContent>
                    {warehouses.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t("purchases.shared.date")}</label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t("purchases.grn.supplierDeliveryNo")}</label>
                <Input value={supplierDeliveryNo} onChange={(e) => setSupplierDeliveryNo(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t("purchases.grn.supplierDeliveryDate")}</label>
                <Input type="date" value={supplierDeliveryDate} onChange={(e) => setSupplierDeliveryDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t("purchases.grn.vehicleNo")}</label>
                <Input value={vehicleNo} onChange={(e) => setVehicleNo(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t("purchases.grn.driverName")}</label>
                <Input value={driverName} onChange={(e) => setDriverName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t("purchases.grn.receivedBy")}</label>
                <Input value={receivedBy} onChange={(e) => setReceivedBy(e.target.value)} />
              </div>
            </div>

            {selectedPO && (() => {
              const po = purchaseOrders.find((p) => p.id === selectedPO);
              if (!po) return null;
              return (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>{t("purchases.grn.item")}</TableHead>
                        <TableHead className="w-24">{t("purchases.grn.ordered")}</TableHead>
                        <TableHead className="w-24">{t("purchases.grn.postedQty")}</TableHead>
                        <TableHead className="w-24">{t("purchases.grn.remaining")}</TableHead>
                        <TableHead className="w-28">{t("purchases.grn.receiveNow")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {po.items.map((item) => {
                        const remaining = Math.max(0, item.qty - item.receivedQty);
                        return (
                          <TableRow key={item.inventoryItemId}>
                            <TableCell className="text-sm font-medium">{getItemName(item.inventoryItemId)}</TableCell>
                            <TableCell className="text-sm">{item.qty}</TableCell>
                            <TableCell className="text-sm">{item.receivedQty}</TableCell>
                            <TableCell className="text-sm font-medium">{remaining}</TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min={0}
                                max={remaining}
                                className="h-9 w-24"
                                value={receivedQtys[item.inventoryItemId] ?? 0}
                                onChange={(e) => setReceivedQtys((prev) => ({ ...prev, [item.inventoryItemId]: Math.min(Number(e.target.value), remaining) }))}
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              );
            })()}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setFormOpen(false)}>{t("purchases.shared.cancel")}</Button>
              <Button onClick={() => void handleCreateDraft()} className="gap-1"><Check className="h-3.5 w-3.5" /> {t("purchases.grn.saveDraft")}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewId} onOpenChange={(open) => !open && setViewId(null)}>
        <DialogContent className={`${dialogSize.xl} ${dialogScroll}`}>
          <DialogHeader><DialogTitle>{t("purchases.grn.detailTitle")} — {viewedGrn?.grnNumber}</DialogTitle></DialogHeader>
          {viewedGrn && (
            <div className="space-y-4 text-sm">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={statusColors[viewedGrn.status]}>{t(`purchases.status.${viewedGrn.status}`)}</Badge>
                <span className="text-muted-foreground">PO: {viewedGrn.poReference}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">{t("purchases.grn.warehouse")}:</span> {warehouseName(viewedGrn.warehouseId)}</div>
                <div><span className="text-muted-foreground">{t("purchases.grn.deliveryNo")}:</span> {viewedGrn.supplierDeliveryNo ?? "—"}</div>
                <div><span className="text-muted-foreground">{t("purchases.grn.deliveryDate")}:</span> {viewedGrn.supplierDeliveryDate ?? "—"}</div>
                <div><span className="text-muted-foreground">{t("purchases.grn.vehicle")}:</span> {viewedGrn.vehicleNo ?? "—"}</div>
                <div><span className="text-muted-foreground">{t("purchases.grn.driver")}:</span> {viewedGrn.driverName ?? "—"}</div>
                <div><span className="text-muted-foreground">{t("purchases.grn.receivedBy")}:</span> {viewedGrn.receivedBy ?? "—"}</div>
                <div><span className="text-muted-foreground">{t("purchases.grn.relatedInvoices")}:</span> {viewedGrn.relatedInvoiceCount ?? 0}</div>
                <div><span className="text-muted-foreground">{t("purchases.grn.receivedValue")}:</span> {(viewedGrn.receivedValue ?? 0).toLocaleString()}</div>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>{t("purchases.grn.item")}</TableHead>
                      <TableHead className="w-24">{t("purchases.grn.ordered")}</TableHead>
                      <TableHead className="w-24">{t("purchases.grn.receiveNow")}</TableHead>
                      <TableHead className="w-28">{t("purchases.grn.unitCost")}</TableHead>
                      <TableHead className="w-28 text-right">{t("purchases.grn.lineValue")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {viewedGrn.items.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          {t("purchases.grn.noItems")}
                        </TableCell>
                      </TableRow>
                    )}
                    {viewedGrn.items.map((item) => (
                      <TableRow key={item.id ?? item.inventoryItemId}>
                        <TableCell className="text-sm font-medium">
                          {getItemName(item.inventoryItemId, item.ingredientName)}
                        </TableCell>
                        <TableCell className="text-sm">{item.orderedQty}</TableCell>
                        <TableCell className="text-sm">{item.receivedQty}</TableCell>
                        <TableCell className="text-sm">{(item.unitCost ?? 0).toLocaleString()}</TableCell>
                        <TableCell className="text-sm text-right">
                          {((item.receivedQty ?? 0) * (item.unitCost ?? 0)).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {progress && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span>{t("purchases.grn.poProgress")}</span>
                    <span>{progress.completionPercentage}% ({progress.receivedQty}/{progress.orderedQty})</span>
                  </div>
                  <Progress value={progress.completionPercentage} />
                </div>
              )}

              <PostingStatusIndicator postingStatus={viewedGrn.postingStatus} />

              <div className="flex justify-end gap-2">
                {viewedGrn.status === "draft" && <Button onClick={() => void handleReceive(viewedGrn.id)}>{t("purchases.grn.receive")}</Button>}
                {viewedGrn.status === "received" && <Button onClick={() => void handlePost(viewedGrn.id)}>{t("purchases.grn.postToInventory")}</Button>}
                {(viewedGrn.status === "draft" || viewedGrn.status === "received") && (
                  <Button variant="destructive" onClick={() => void handleCancel(viewedGrn.id)}>{t("purchases.shared.cancel")}</Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
