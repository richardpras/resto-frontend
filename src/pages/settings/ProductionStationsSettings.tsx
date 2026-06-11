import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Factory } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useOutletStore } from "@/stores/outletStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { ApiHttpError } from "@/lib/api-integration/client";
import {
  createProductionStation,
  listProductionStations,
  updateProductionStation,
  updateProductionStationStatus,
  type ProductionStationApi,
} from "@/lib/api-integration/productionStationEndpoints";

type StationForm = {
  id?: number;
  outletId: number;
  code: string;
  name: string;
  type: string;
  displayOrder: number;
  kdsEnabled: boolean;
  printEnabled: boolean;
};

const emptyForm = (outletId: number): StationForm => ({
  outletId,
  code: "",
  name: "",
  type: "kitchen",
  displayOrder: 100,
  kdsEnabled: true,
  printEnabled: true,
});

export default function ProductionStationsSettings() {
  const activeOutletId = useOutletStore((s) => s.activeOutletId);
  const outlets = useSettingsStore((s) => s.outlets);
  const ensureSectionsLoaded = useSettingsStore((s) => s.ensureSectionsLoaded);
  const [stations, setStations] = useState<ProductionStationApi[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<StationForm>(emptyForm(0));
  const [saving, setSaving] = useState(false);

  const resolvedOutletId = typeof activeOutletId === "number" && activeOutletId > 0 ? activeOutletId : outlets[0]?.id ?? 0;
  const outletName = outlets.find((o) => o.id === resolvedOutletId)?.name ?? "Outlet";

  const loadStations = useCallback(async () => {
    if (resolvedOutletId < 1) {
      setStations([]);
      return;
    }
    setLoading(true);
    try {
      const rows = await listProductionStations(resolvedOutletId);
      setStations(rows);
    } catch (error) {
      toast.error(error instanceof ApiHttpError ? error.message : "Failed to load production stations");
    } finally {
      setLoading(false);
    }
  }, [resolvedOutletId]);

  useEffect(() => {
    void ensureSectionsLoaded(["outlets"]);
  }, [ensureSectionsLoaded]);

  useEffect(() => {
    void loadStations();
  }, [loadStations]);

  const openCreate = () => {
    setForm(emptyForm(resolvedOutletId));
    setOpen(true);
  };

  const openEdit = (station: ProductionStationApi) => {
    setForm({
      id: station.id,
      outletId: station.outletId,
      code: station.code,
      name: station.name,
      type: station.type,
      displayOrder: station.displayOrder,
      kdsEnabled: station.kdsEnabled,
      printEnabled: station.printEnabled,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) {
      toast.error("Station name is required");
      return;
    }
    if (resolvedOutletId < 1) {
      toast.error("Select an outlet first");
      return;
    }

    setSaving(true);
    try {
      if (form.id) {
        await updateProductionStation(form.id, {
          code: form.code.trim() || undefined,
          name: form.name.trim(),
          type: form.type,
          displayOrder: form.displayOrder,
          kdsEnabled: form.kdsEnabled,
          printEnabled: form.printEnabled,
        });
        toast.success("Production station updated");
      } else {
        await createProductionStation({
          outletId: resolvedOutletId,
          code: form.code.trim() || undefined,
          name: form.name.trim(),
          type: form.type,
          displayOrder: form.displayOrder,
          kdsEnabled: form.kdsEnabled,
          printEnabled: form.printEnabled,
        });
        toast.success("Production station created");
      }
      setOpen(false);
      await loadStations();
    } catch (error) {
      toast.error(error instanceof ApiHttpError ? error.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (station: ProductionStationApi) => {
    try {
      await updateProductionStationStatus(station.id, !station.isActive);
      await loadStations();
      toast.success(station.isActive ? "Station deactivated" : "Station activated");
    } catch (error) {
      toast.error(error instanceof ApiHttpError ? error.message : "Status update failed");
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Factory className="h-6 w-6" />
            Production Stations
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage kitchen, bar, and production routing targets for {outletName}.
          </p>
        </div>
        <Button onClick={openCreate} disabled={resolvedOutletId < 1}>
          <Plus className="h-4 w-4 mr-2" />
          Add Station
        </Button>
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          {resolvedOutletId < 1 ? (
            <p className="text-sm text-muted-foreground">Select an active outlet to manage production stations.</p>
          ) : loading ? (
            <p className="text-sm text-muted-foreground">Loading stations…</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>KDS</TableHead>
                  <TableHead>Print</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-28" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {stations.map((station) => (
                  <TableRow key={station.id}>
                    <TableCell>{station.displayOrder}</TableCell>
                    <TableCell className="font-medium">{station.name}</TableCell>
                    <TableCell>{station.code}</TableCell>
                    <TableCell className="capitalize">{station.type}</TableCell>
                    <TableCell>{station.kdsEnabled ? "Yes" : "No"}</TableCell>
                    <TableCell>{station.printEnabled ? "Yes" : "No"}</TableCell>
                    <TableCell>
                      <Badge variant={station.isActive ? "default" : "secondary"}>
                        {station.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(station)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => void toggleActive(station)}>
                          {station.isActive ? "Deactivate" : "Activate"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit Production Station" : "Add Production Station"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="production-station-name">Name</Label>
              <Input
                id="production-station-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Code</Label>
                <Input
                  value={form.code}
                  placeholder="kitchen"
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Display order</Label>
                <Input
                  type="number"
                  value={form.displayOrder}
                  onChange={(e) => setForm({ ...form, displayOrder: Number(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(value) => setForm({ ...form, type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kitchen">Kitchen</SelectItem>
                  <SelectItem value="bar">Bar</SelectItem>
                  <SelectItem value="cashier">Cashier</SelectItem>
                  <SelectItem value="dessert">Dessert</SelectItem>
                  <SelectItem value="bakery">Bakery</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={form.kdsEnabled}
                onCheckedChange={(checked) => setForm({ ...form, kdsEnabled: checked === true })}
              />
              <Label>KDS enabled</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={form.printEnabled}
                onCheckedChange={(checked) => setForm({ ...form, printEnabled: checked === true })}
              />
              <Label>Print enabled</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void save()} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
