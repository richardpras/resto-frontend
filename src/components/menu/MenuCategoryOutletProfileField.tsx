import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { MenuCategoryPrinterMappingApi } from "@/lib/api-integration/endpoints";
import type { Outlet, Printer } from "@/domain/settingsDomainTypes";

export type CategoryOutletProfileRow = {
  outletId: number;
  outletName: string;
  isActive: boolean;
  printerProfileId: string;
  mappingId: number | null;
};

type Props = {
  outlets: Outlet[];
  printers: Printer[];
  mappings: MenuCategoryPrinterMappingApi[];
  rows: CategoryOutletProfileRow[];
  onChange: (rows: CategoryOutletProfileRow[]) => void;
};

export function buildCategoryOutletProfileRows(
  outlets: Outlet[],
  mappings: MenuCategoryPrinterMappingApi[],
  menuCategoryId: number | null,
): CategoryOutletProfileRow[] {
  const mappingByOutletId = new Map<number, MenuCategoryPrinterMappingApi>();
  if (menuCategoryId !== null) {
    for (const mapping of mappings) {
      if (mapping.menuCategoryId === menuCategoryId) {
        mappingByOutletId.set(mapping.outletId, mapping);
      }
    }
  }

  return outlets.map((outlet) => {
    const existing = mappingByOutletId.get(outlet.id);
    return {
      outletId: outlet.id,
      outletName: outlet.name,
      isActive: existing !== undefined,
      printerProfileId: existing ? String(existing.printerProfileId) : "",
      mappingId: existing?.id ?? null,
    };
  });
}

export function MenuCategoryOutletProfileField({ outlets, printers, rows, onChange }: Props) {
  const { t } = useTranslation("common");

  const printersByOutletId = useMemo(() => {
    const synced = new Map<number, Printer[]>();
    const unsynced = new Map<number, Printer[]>();
    for (const printer of printers) {
      const bucket = typeof printer.printerProfileId === "number" ? synced : unsynced;
      const list = bucket.get(printer.outletId) ?? [];
      list.push(printer);
      bucket.set(printer.outletId, list);
    }
    return { synced, unsynced };
  }, [printers]);

  const updateRow = (outletId: number, patch: Partial<CategoryOutletProfileRow>) => {
    onChange(rows.map((row) => (row.outletId === outletId ? { ...row, ...patch } : row)));
  };

  if (outlets.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("menuCategories.noOutlets")}</p>;
  }

  return (
    <div className="space-y-2.5" data-testid="menu-category-outlet-profile">
      <Label className="text-sm font-medium">{t("menuCategories.outletPrinterProfile")}</Label>
      <p className="text-xs text-muted-foreground">{t("menuCategories.outletPrinterProfileHint")}</p>
      <div className="space-y-2 max-h-64 overflow-y-auto border border-border/50 rounded-xl p-3 bg-muted/10">
        {rows.map((row) => {
          const printerOptions = printersByOutletId.synced.get(row.outletId) ?? [];
          const unsyncedPrinters = printersByOutletId.unsynced.get(row.outletId) ?? [];
          const hasAnyPrinter = printerOptions.length > 0 || unsyncedPrinters.length > 0;

          return (
            <div key={row.outletId} className="rounded-lg border border-border/40 p-3 space-y-2 bg-background">
              <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                <input
                  type="checkbox"
                  checked={row.isActive}
                  onChange={(e) =>
                    updateRow(row.outletId, {
                      isActive: e.target.checked,
                      printerProfileId: e.target.checked ? row.printerProfileId : "",
                    })
                  }
                  className="h-4 w-4 accent-primary"
                />
                {row.outletName}
              </label>
              {row.isActive ? (
                printerOptions.length === 0 ? (
                  <div className="space-y-1">
                    <p className="text-xs text-destructive">
                      {unsyncedPrinters.length > 0
                        ? t("menuCategories.unsyncedPrintersForOutlet")
                        : t("menuCategories.noPrintersForOutlet")}
                    </p>
                    {unsyncedPrinters.length > 0 ? (
                      <p className="text-xs text-muted-foreground">
                        {unsyncedPrinters.map((printer) => printer.name).join(", ")}
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <Select
                    value={row.printerProfileId || undefined}
                    onValueChange={(value) => updateRow(row.outletId, { printerProfileId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("menuCategories.selectPrinter")} />
                    </SelectTrigger>
                    <SelectContent>
                      {printerOptions.map((printer) => (
                        <SelectItem key={printer.id} value={String(printer.printerProfileId)}>
                          {printer.name} ({printer.printerType})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )
              ) : null}
              {row.isActive && !hasAnyPrinter ? (
                <p className="text-xs text-destructive">{t("menuCategories.noPrintersForOutlet")}</p>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
