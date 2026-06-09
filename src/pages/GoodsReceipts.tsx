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
import { Plus, PackageCheck, Search, Check, Upload, Ban, Eye } from "lucide-react";
import PostingStatusIndicator, { PostingStatusBadge } from "@/components/procurement/PostingStatusIndicator";
import { toast } from "sonner";

const statusColors: Record<GRNStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  received: "bg-warning/15 text-warning border-warning/30",
  posted: "bg-success/15 text-success border-success/30",
  cancelled: "bg-destructive/15 text-destructive border-destructive/30",
};

const statusLabel: Record<GRNStatus, string> = {
  draft: "Draft",
  received: "Received",
  posted: "Posted",
  cancelled: "Cancelled",
};

export default function GoodsReceipts() {
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
    if (!po) { toast.error("Select a PO"); return; }
    if (!warehouseId) { toast.error("Select a warehouse"); return; }

    const grnItems = po.items.map((i) => ({
      inventoryItemId: i.inventoryItemId,
      orderedQty: i.qty,
      receivedQty: receivedQtys[i.inventoryItemId] ?? 0,
      unit: i.unit,
    })).filter((i) => i.receivedQty > 0);

    if (grnItems.length === 0) { toast.error("Enter received quantities"); return; }

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
    toast.success("Draft goods receipt created");
    setFormOpen(false);
    await loadSummary();
  };

  const handleReceive = async (id: string) => {
    await receiveGRN(id);
    toast.success("Goods receipt marked as received");
    await loadSummary();
  };

  const handlePost = async (id: string) => {
    await postGRN(id);
    toast.success("Inventory posted");
    await loadSummary();
  };

  const handleCancel = async (id: string) => {
    await cancelGRN(id);
    toast.success("Goods receipt cancelled");
    setViewId(null);
    await loadSummary();
  };

  const getItemName = (id: string) => `Item #${id}`;
  const filtered = goodsReceipts.filter((g) =>
    g.grnNumber.toLowerCase().includes(search.toLowerCase()) ||
    g.poReference.toLowerCase().includes(search.toLowerCase())
  );

  const warehouseName = (id?: string) => warehouses.find((w) => w.id === id)?.name ?? (id ? `Warehouse #${id}` : "—");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Goods Receipt</h1>
          <p className="text-sm text-muted-foreground">Draft → Receive → Post workflow</p>
        </div>
        <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> New GRN</Button>
      </div>

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {[
            { label: "Draft", value: summary.draftReceivings },
            { label: "Received", value: summary.receivedReceivings },
            { label: "Posted", value: summary.postedReceivings },
            { label: "Cancelled", value: summary.cancelledReceivings },
            { label: "Today Posted", value: summary.todayReceivings },
            { label: "Today Value", value: summary.todayReceivedValue.toLocaleString() },
            { label: "Total GRN", value: summary.totalGoodsReceipts },
          ].map((item) => (
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
        <Input placeholder="Search GRN…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead>GRN Number</TableHead>
                <TableHead>PO Reference</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    <PackageCheck className="h-10 w-10 mx-auto mb-2 opacity-30" />No goods receipts yet
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((grn) => (
                <TableRow key={grn.id}>
                  <TableCell className="font-mono font-semibold text-sm">{grn.grnNumber}</TableCell>
                  <TableCell className="text-sm font-mono">{grn.poReference}</TableCell>
                  <TableCell className="text-sm">{grn.date}</TableCell>
                  <TableCell className="text-sm">{grn.items.length} items</TableCell>
                  <TableCell className="space-x-1">
                    <Badge variant="outline" className={statusColors[grn.status]}>{statusLabel[grn.status]}</Badge>
                    {grn.status === "posted" && <PostingStatusBadge postingStatus={grn.postingStatus} />}
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button size="sm" variant="ghost" onClick={() => setViewId(grn.id)}><Eye className="h-3.5 w-3.5" /></Button>
                    {grn.status === "draft" && (
                      <Button size="sm" variant="outline" onClick={() => void handleReceive(grn.id)}>Receive</Button>
                    )}
                    {grn.status === "received" && (
                      <Button size="sm" onClick={() => void handlePost(grn.id)} className="gap-1"><Upload className="h-3.5 w-3.5" /> Post</Button>
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
          <DialogHeader><DialogTitle>Create Goods Receipt (Draft)</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">PO Reference *</label>
                <Select value={selectedPO} onValueChange={handlePOSelect}>
                  <SelectTrigger><SelectValue placeholder="Select PO" /></SelectTrigger>
                  <SelectContent>
                    {receivablePOs.map((po) => <SelectItem key={po.id} value={po.id}>{po.poNumber}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Warehouse *</label>
                <Select value={warehouseId} onValueChange={setWarehouseId}>
                  <SelectTrigger><SelectValue placeholder="Select warehouse" /></SelectTrigger>
                  <SelectContent>
                    {warehouses.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Date</label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Supplier Delivery No</label>
                <Input value={supplierDeliveryNo} onChange={(e) => setSupplierDeliveryNo(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Supplier Delivery Date</label>
                <Input type="date" value={supplierDeliveryDate} onChange={(e) => setSupplierDeliveryDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Vehicle No</label>
                <Input value={vehicleNo} onChange={(e) => setVehicleNo(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Driver Name</label>
                <Input value={driverName} onChange={(e) => setDriverName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Received By</label>
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
                        <TableHead>Item</TableHead>
                        <TableHead className="w-24">Ordered</TableHead>
                        <TableHead className="w-24">Posted</TableHead>
                        <TableHead className="w-24">Remaining</TableHead>
                        <TableHead className="w-28">Receive Now</TableHead>
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
              <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button onClick={() => void handleCreateDraft()} className="gap-1"><Check className="h-3.5 w-3.5" /> Save Draft</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewId} onOpenChange={(open) => !open && setViewId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>GRN Detail — {viewedGrn?.grnNumber}</DialogTitle></DialogHeader>
          {viewedGrn && (
            <div className="space-y-4 text-sm">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={statusColors[viewedGrn.status]}>{statusLabel[viewedGrn.status]}</Badge>
                <span className="text-muted-foreground">PO: {viewedGrn.poReference}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">Warehouse:</span> {warehouseName(viewedGrn.warehouseId)}</div>
                <div><span className="text-muted-foreground">Delivery No:</span> {viewedGrn.supplierDeliveryNo ?? "—"}</div>
                <div><span className="text-muted-foreground">Delivery Date:</span> {viewedGrn.supplierDeliveryDate ?? "—"}</div>
                <div><span className="text-muted-foreground">Vehicle:</span> {viewedGrn.vehicleNo ?? "—"}</div>
                <div><span className="text-muted-foreground">Driver:</span> {viewedGrn.driverName ?? "—"}</div>
                <div><span className="text-muted-foreground">Received By:</span> {viewedGrn.receivedBy ?? "—"}</div>
                <div><span className="text-muted-foreground">Related Invoices:</span> {viewedGrn.relatedInvoiceCount ?? 0}</div>
                <div><span className="text-muted-foreground">Received Value:</span> {(viewedGrn.receivedValue ?? 0).toLocaleString()}</div>
              </div>

              {progress && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span>PO Progress</span>
                    <span>{progress.completionPercentage}% ({progress.receivedQty}/{progress.orderedQty})</span>
                  </div>
                  <Progress value={progress.completionPercentage} />
                </div>
              )}

              <PostingStatusIndicator postingStatus={viewedGrn.postingStatus} />

              <div className="flex justify-end gap-2">
                {viewedGrn.status === "draft" && <Button onClick={() => void handleReceive(viewedGrn.id)}>Receive</Button>}
                {viewedGrn.status === "received" && <Button onClick={() => void handlePost(viewedGrn.id)}>Post to Inventory</Button>}
                {(viewedGrn.status === "draft" || viewedGrn.status === "received") && (
                  <Button variant="destructive" onClick={() => void handleCancel(viewedGrn.id)}>Cancel</Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
