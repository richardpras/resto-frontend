import { useEffect, useState } from "react";
import { listProductionStations, type ProductionStationApi } from "@/lib/api-integration/productionStationEndpoints";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useOpsTranslation } from "@/i18n/useOpsTranslation";

type Props = {
  outletId: number | null;
  value: number | null;
  onChange: (stationId: number | null) => void;
};

export function MenuProductionStationField({ outletId, value, onChange }: Props) {
  const { t } = useOpsTranslation();
  const [stations, setStations] = useState<ProductionStationApi[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (outletId === null || outletId < 1) {
      setStations([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    void listProductionStations(outletId, { activeOnly: true })
      .then((rows) => {
        if (!cancelled) setStations(rows);
      })
      .catch(() => {
        if (!cancelled) setStations([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [outletId]);

  const selectValue = value !== null && value > 0 ? String(value) : "none";

  return (
    <div className="space-y-1.5" data-testid="menu-production-station-field">
      <Label className="text-sm font-medium text-foreground">{t("menu.productionStation")}</Label>
      <Select
        value={selectValue}
        onValueChange={(next) => onChange(next === "none" ? null : Number(next))}
        disabled={outletId === null || outletId < 1 || loading}
      >
        <SelectTrigger>
          <SelectValue placeholder={loading ? t("menu.loadingStations") : t("menu.selectStation")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">{t("menu.noStationFallback")}</SelectItem>
          {stations.map((station) => (
            <SelectItem key={station.id} value={String(station.id)}>
              {station.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
