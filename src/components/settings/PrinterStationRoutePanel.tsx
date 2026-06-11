import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listProductionStations, type ProductionStationApi } from "@/lib/api-integration/productionStationEndpoints";
import {
  assignPrinterRoute,
  listPrinterRoutes,
  type PrinterRouteApi,
} from "@/lib/api-integration/printerRouteEndpoints";
import { useSettingsStore } from "@/stores/settingsStore";
import { toast } from "sonner";

type Props = {
  outletId: number;
};

export function PrinterStationRoutePanel({ outletId }: Props) {
  const printers = useSettingsStore((s) => s.printers);
  const [stations, setStations] = useState<ProductionStationApi[]>([]);
  const [routes, setRoutes] = useState<PrinterRouteApi[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [draftProfileByStation, setDraftProfileByStation] = useState<Record<number, string>>({});

  const kitchenPrinters = useMemo(
    () => printers.filter((printer) => printer.outletId === outletId && printer.printerType === "kitchen"),
    [printers, outletId],
  );

  const printStations = useMemo(
    () => stations.filter((station) => station.isActive && station.printEnabled),
    [stations],
  );

  const stationRouteById = useMemo(() => {
    const map = new Map<number, PrinterRouteApi>();
    for (const route of routes) {
      if (route.printType !== "kitchen" || !route.productionStationId) continue;
      map.set(route.productionStationId, route);
    }
    return map;
  }, [routes]);

  const load = useCallback(async () => {
    if (outletId < 1) return;
    setIsLoading(true);
    try {
      const routeRows = await listPrinterRoutes(outletId);
      setRoutes(routeRows);
      try {
        const stationRows = await listProductionStations(outletId, { activeOnly: true });
        setStations(stationRows);
      } catch {
        const fromRoutes = routeRows
          .map((route) => route.productionStation)
          .filter((station): station is NonNullable<typeof station> => station != null && station.id > 0)
          .map((station) => ({
            id: station.id,
            outletId,
            code: station.code,
            name: station.name,
            type: station.code,
            displayOrder: 0,
            isActive: true,
            kdsEnabled: true,
            printEnabled: true,
          }));
        setStations(fromRoutes);
      }
    } catch {
      toast.error("Failed to load production station printer routes");
    } finally {
      setIsLoading(false);
    }
  }, [outletId]);

  useEffect(() => {
    void load();
  }, [load]);

  const assignStation = async (station: ProductionStationApi) => {
    const profileId = Number(draftProfileByStation[station.id] ?? stationRouteById.get(station.id)?.printerProfileId);
    if (!profileId || Number.isNaN(profileId)) {
      toast.error("Select a printer profile");
      return;
    }
    try {
      await assignPrinterRoute({
        outletId,
        printerProfileId: profileId,
        printType: "kitchen",
        routeScope: "production_station",
        productionStationId: station.id,
        priority: 10,
        isActive: true,
      });
      toast.success(`${station.name} route saved`);
      await load();
    } catch {
      toast.error("Failed to save station route");
    }
  };

  if (outletId < 1) {
    return null;
  }

  return (
    <div className="space-y-3 border-t pt-4" data-testid="printer-station-route-panel">
      <div>
        <h3 className="font-medium">Production station routing</h3>
        <p className="text-xs text-muted-foreground">
          Map each production station to a kitchen printer profile. Category routing below is used only when a menu item has no production station.
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading station routes…</p>
      ) : printStations.length === 0 ? (
        <p className="text-sm text-muted-foreground">No print-enabled production stations for this outlet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Station</TableHead>
              <TableHead>Printer profile</TableHead>
              <TableHead className="w-28" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {printStations.map((station) => {
              const existing = stationRouteById.get(station.id);
              const selectedProfile = draftProfileByStation[station.id] ?? (existing ? String(existing.printerProfileId) : "");

              return (
                <TableRow key={station.id} data-testid={`printer-station-row-${station.code}`}>
                  <TableCell className="font-medium">{station.name}</TableCell>
                  <TableCell>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      data-testid={`printer-station-profile-${station.code}`}
                      value={selectedProfile}
                      onChange={(event) =>
                        setDraftProfileByStation((current) => ({
                          ...current,
                          [station.id]: event.target.value,
                        }))
                      }
                    >
                      <option value="">Select printer</option>
                      {kitchenPrinters.map((printer) => (
                        <option key={printer.id} value={printer.id}>
                          {printer.name}
                        </option>
                      ))}
                    </select>
                  </TableCell>
                  <TableCell>
                    <Button type="button" size="sm" variant="secondary" onClick={() => void assignStation(station)}>
                      Save
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
