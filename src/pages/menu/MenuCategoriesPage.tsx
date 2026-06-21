import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil } from "lucide-react";
import { toast } from "sonner";
import { ApiHttpError, getApiAccessToken } from "@/lib/api-integration/client";
import {
  createMenuCategory,
  deleteMenuCategoryPrinterMapping,
  listMenuCategories,
  listMenuCategoryPrinterMappings,
  saveMenuCategoryPrinterMapping,
  updateMenuCategory,
  type MenuCategoryApi,
  type MenuCategoryPayload,
  type MenuCategoryPrinterMappingApi,
} from "@/lib/api-integration/endpoints";
import { listOutlets } from "@/lib/api-integration/settingsDomainEndpoints";
import { useSettingsStore } from "@/stores/settingsStore";
import type { Outlet } from "@/domain/settingsDomainTypes";
import {
  MenuCategoryOutletProfileField,
  buildCategoryOutletProfileRows,
  type CategoryOutletProfileRow,
} from "@/components/menu/MenuCategoryOutletProfileField";

const TENANT_ID = Number(import.meta.env.VITE_API_TENANT_ID ?? 1) || 1;

type CategoryForm = {
  id: number | null;
  name: string;
  nameEn: string;
  nameId: string;
  sortOrder: number;
  isActive: boolean;
};

const emptyForm = (): CategoryForm => ({
  id: null,
  name: "",
  nameEn: "",
  nameId: "",
  sortOrder: 100,
  isActive: true,
});

export default function MenuCategoriesPage() {
  const { t } = useTranslation("common");
  const printers = useSettingsStore((s) => s.printers);
  const ensureSectionsLoaded = useSettingsStore((s) => s.ensureSectionsLoaded);
  const [rows, setRows] = useState<MenuCategoryApi[]>([]);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [allMappings, setAllMappings] = useState<MenuCategoryPrinterMappingApi[]>([]);
  const [loading, setLoading] = useState(false);
  const [mappingsLoading, setMappingsLoading] = useState(false);
  const [mappingsLoaded, setMappingsLoaded] = useState(false);
  const [dialogMappingsLoading, setDialogMappingsLoading] = useState(false);
  const [printersLoading, setPrintersLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CategoryForm>(emptyForm());
  const [outletProfiles, setOutletProfiles] = useState<CategoryOutletProfileRow[]>([]);
  const inFlightMappingsRef = useRef<Promise<MenuCategoryPrinterMappingApi[]> | null>(null);

  const unmappedActiveCategories = useMemo(() => {
    if (!mappingsLoaded) return [];
    const mappedCategoryIds = new Set(allMappings.map((m) => m.menuCategoryId));
    return rows.filter((category) => category.isActive && !mappedCategoryIds.has(category.id));
  }, [rows, allMappings, mappingsLoaded]);

  const loadMappingsForOutlets = useCallback(async (outletRows: Outlet[]): Promise<MenuCategoryPrinterMappingApi[]> => {
    if (outletRows.length === 0) {
      setAllMappings([]);
      setMappingsLoaded(true);
      return [];
    }
    if (inFlightMappingsRef.current) {
      return inFlightMappingsRef.current;
    }

    const job = (async () => {
      const mappingGroups = await Promise.all(
        outletRows.map((outlet) => listMenuCategoryPrinterMappings(outlet.id)),
      );
      const flat = mappingGroups.flat();
      setAllMappings(flat);
      setMappingsLoaded(true);
      return flat;
    })();

    inFlightMappingsRef.current = job;
    try {
      return await job;
    } finally {
      inFlightMappingsRef.current = null;
    }
  }, []);

  const ensureMappingsLoaded = useCallback(async () => {
    if (mappingsLoaded) return allMappings;
    setMappingsLoading(true);
    try {
      return await loadMappingsForOutlets(outlets);
    } finally {
      setMappingsLoading(false);
    }
  }, [allMappings, loadMappingsForOutlets, mappingsLoaded, outlets]);

  const load = useCallback(async () => {
    if (!getApiAccessToken()) return;
    setLoading(true);
    try {
      const [categories, outletRows] = await Promise.all([
        listMenuCategories({ tenantId: TENANT_ID }),
        listOutlets(),
      ]);
      setRows(categories);
      setOutlets(outletRows);
      setMappingsLoaded(false);
      void loadMappingsForOutlets(outletRows).finally(() => setMappingsLoading(false));
      setMappingsLoading(true);
    } catch (error) {
      toast.error(error instanceof ApiHttpError ? error.message : t("menuCategories.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [loadMappingsForOutlets, t]);

  const loadDialogData = useCallback(
    async (categoryId: number | null) => {
      setDialogMappingsLoading(true);
      setPrintersLoading(true);
      try {
        const [mappings] = await Promise.all([
          ensureMappingsLoaded(),
          ensureSectionsLoaded(["printers"], { staleMs: 90_000 }),
        ]);
        setOutletProfiles(buildCategoryOutletProfileRows(outlets, mappings, categoryId));
      } finally {
        setDialogMappingsLoading(false);
        setPrintersLoading(false);
      }
    },
    [ensureMappingsLoaded, ensureSectionsLoaded, outlets],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = async () => {
    setForm(emptyForm());
    setOpen(true);
    await loadDialogData(null);
  };

  const openEdit = async (category: MenuCategoryApi) => {
    setForm({
      id: category.id,
      name: category.name,
      nameEn: category.nameEn ?? category.name,
      nameId: category.nameId ?? category.name,
      sortOrder: category.sortOrder ?? 100,
      isActive: category.isActive,
    });
    setOpen(true);
    await loadDialogData(category.id);
  };

  const toPayload = (): MenuCategoryPayload => ({
    tenantId: TENANT_ID,
    name: form.name.trim(),
    nameEn: form.nameEn.trim() || form.name.trim(),
    nameId: form.nameId.trim() || form.name.trim(),
    sortOrder: form.sortOrder,
    isActive: form.isActive,
  });

  const syncOutletProfiles = async (categoryId: number) => {
    for (const row of outletProfiles) {
      if (row.isActive) {
        const printerProfileId = Number(row.printerProfileId);
        if (!printerProfileId || Number.isNaN(printerProfileId)) {
          throw new Error(t("menuCategories.printerRequiredForOutlet", { outlet: row.outletName }));
        }
        await saveMenuCategoryPrinterMapping({
          tenantId: TENANT_ID,
          outletId: row.outletId,
          menuCategoryId: categoryId,
          printerProfileId,
          isActive: true,
        });
        continue;
      }
      if (row.mappingId !== null) {
        await deleteMenuCategoryPrinterMapping(row.mappingId);
      }
    }
  };

  const save = async () => {
    if (!form.name.trim()) {
      toast.error(t("menuCategories.nameRequired"));
      return;
    }
    if (!getApiAccessToken()) {
      toast.message(t("settings.notSignedInTitle"), { description: t("settings.notSignedInDesc") });
      return;
    }
    for (const row of outletProfiles) {
      if (row.isActive && (!row.printerProfileId || Number.isNaN(Number(row.printerProfileId)))) {
        toast.error(t("menuCategories.printerRequiredForOutlet", { outlet: row.outletName }));
        return;
      }
    }
    setSaving(true);
    try {
      let categoryId = form.id;
      if (categoryId) {
        await updateMenuCategory(categoryId, toPayload());
      } else {
        const created = await createMenuCategory(toPayload());
        categoryId = created.id;
      }
      if (categoryId) {
        await syncOutletProfiles(categoryId);
      }
      toast.success(t("menuCategories.saved"));
      setOpen(false);
      setMappingsLoaded(false);
      await load();
    } catch (error) {
      toast.error(error instanceof ApiHttpError ? error.message : error instanceof Error ? error.message : t("common.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("menuCategories.title")}</h1>
        <p className="text-muted-foreground text-sm">{t("menuCategories.subtitle")}</p>
      </div>

      {mappingsLoading && !mappingsLoaded ? (
        <p className="text-sm text-muted-foreground" data-testid="menu-category-mappings-loading">
          {t("menuCategories.loadingMappings")}
        </p>
      ) : null}

      {mappingsLoaded && unmappedActiveCategories.length > 0 ? (
        <div
          className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm"
          data-testid="menu-category-unmapped-banner"
        >
          <p className="font-medium text-destructive">{t("menuCategories.unmappedActive")}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {unmappedActiveCategories.map((category) => category.displayName ?? category.name).join(", ")}
          </p>
        </div>
      ) : null}

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex justify-between items-center gap-3">
            <h2 className="font-semibold">{t("menuCategories.listTitle")}</h2>
            <Button type="button" onClick={() => void openCreate()}>
              <Plus className="h-4 w-4 mr-2" />
              {t("menuCategories.add")}
            </Button>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("menuCategories.nameEn")}</TableHead>
                  <TableHead>{t("menuCategories.nameId")}</TableHead>
                  <TableHead>{t("menuCategories.sortOrder")}</TableHead>
                  <TableHead>{t("common.status")}</TableHead>
                  <TableHead className="w-16" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell className="font-medium">{category.nameEn ?? category.name}</TableCell>
                    <TableCell>{category.nameId ?? category.name}</TableCell>
                    <TableCell>{category.sortOrder}</TableCell>
                    <TableCell>
                      <Badge variant={category.isActive ? "default" : "secondary"}>
                        {category.isActive ? t("common.active") : t("common.inactive")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button type="button" size="icon" variant="ghost" onClick={() => void openEdit(category)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? t("menuCategories.editTitle") : t("menuCategories.addTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t("menuCategories.canonicalName")}</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t("menuCategories.nameEn")}</Label>
                <Input value={form.nameEn} onChange={(e) => setForm({ ...form, nameEn: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{t("menuCategories.nameId")}</Label>
                <Input value={form.nameId} onChange={(e) => setForm({ ...form, nameId: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("menuCategories.sortOrder")}</Label>
              <Input
                type="number"
                value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) || 0 })}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="menu-category-active"
                checked={form.isActive}
                onCheckedChange={(checked) => setForm({ ...form, isActive: checked === true })}
              />
              <Label htmlFor="menu-category-active">{t("common.active")}</Label>
            </div>

            {dialogMappingsLoading || printersLoading ? (
              <div className="space-y-1">
                {dialogMappingsLoading ? (
                  <p className="text-sm text-muted-foreground">{t("menuCategories.loadingMappings")}</p>
                ) : null}
                {printersLoading ? (
                  <p className="text-sm text-muted-foreground" data-testid="menu-category-printers-loading">
                    {t("menuCategories.loadingPrinters")}
                  </p>
                ) : null}
              </div>
            ) : (
              <MenuCategoryOutletProfileField
                outlets={outlets}
                printers={printers}
                mappings={allMappings}
                rows={outletProfiles}
                onChange={setOutletProfiles}
              />
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              {t("common.cancel")}
            </Button>
            <Button type="button" onClick={() => void save()} disabled={saving || dialogMappingsLoading || printersLoading}>
              {saving ? t("common.saving") : t("common.saveShort")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
