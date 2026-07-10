import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { AdminPageShell } from "@/components/layout/AdminPageShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  downloadMasterImportPhase1Template,
  downloadMasterImportPhase2Template,
  downloadMasterImportPhase3Template,
  downloadMasterImportPhase4Template,
  downloadMasterImportPhase4TemplateXlsx,
  importMasterImportPhase1Bundle,
  importMasterImportPhase2Bundle,
  importMasterImportPhase3Bundle,
  importMasterImportPhase4Bundle,
  type MasterImportResult,
} from "@/lib/api-integration/masterImportEndpoints";
import { useSettingsStore } from "@/stores/settingsStore";
import { useAuthStore } from "@/stores/authStore";
import { formatApiErrorMessage } from "@/i18n/apiErrorMessage";
import { Download, FileUp, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

const PHASE1_SECTIONS = [
  "ingredients",
  "opening_stock",
  "menu_categories",
  "menu_items",
  "recipes",
  "suppliers",
  "tables",
] as const;

const PHASE2_SECTIONS = [
  "chart_of_accounts",
  "opening_balances",
  "customers",
  "members",
  "outlet_payment_methods",
] as const;

const PHASE3_SECTIONS = [
  "departments",
  "positions",
  "employees",
  "opening_loyalty_points",
] as const;

const PHASE4_SECTIONS = [
  "employee_salary_profiles",
] as const;

type ImportPhase = "phase1" | "phase2" | "phase3" | "phase4";

function ImportResultCard({
  preview,
  phase,
}: {
  preview: MasterImportResult;
  phase: ImportPhase;
}) {
  const { t } = useTranslation("common");
  const sectionOrder =
    phase === "phase1"
      ? PHASE1_SECTIONS
      : phase === "phase2"
        ? PHASE2_SECTIONS
        : phase === "phase3"
          ? PHASE3_SECTIONS
          : PHASE4_SECTIONS;
  const sectionRows = useMemo(() => {
    return sectionOrder.filter((key) => preview.sections[key]).map((key) => ({
      key,
      ...preview.sections[key],
    }));
  }, [preview, sectionOrder]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("settings.masterImport.resultTitle")}</CardTitle>
        <CardDescription>
          {preview.preview ? t("settings.masterImport.previewMode") : t("settings.masterImport.commitMode")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{t("settings.masterImport.created", { count: preview.created })}</Badge>
          <Badge variant="secondary">{t("settings.masterImport.updated", { count: preview.updated })}</Badge>
          <Badge variant="secondary">{t("settings.masterImport.skipped", { count: preview.skipped })}</Badge>
          {preview.errorCount > 0 ? (
            <Badge variant="destructive">{t("settings.masterImport.errors", { count: preview.errorCount })}</Badge>
          ) : null}
        </div>
        <div className="space-y-3">
          {sectionRows.map((section) => (
            <div key={section.key} className="rounded-md border p-3">
              <div className="mb-2 font-medium">
                {t(`settings.masterImport.sections.${phase}.${section.key}`)}
              </div>
              <div className="text-sm text-muted-foreground">
                {t("settings.masterImport.sectionSummary", {
                  created: section.created,
                  updated: section.updated,
                  skipped: section.skipped,
                  errors: section.errors.length,
                })}
              </div>
              {section.errors.length > 0 ? (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-destructive">
                  {section.errors.slice(0, 8).map((err) => (
                    <li key={`${section.key}-${err.row}`}>
                      {t("settings.masterImport.rowError", { row: err.row, message: err.message })}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function MasterImportPage() {
  const { t } = useTranslation("common");
  const outlets = useSettingsStore((s) => s.outlets);
  const tenantId = useAuthStore((s) => s.user?.tenantId ?? null);
  const [outletId, setOutletId] = useState<number | null>(outlets[0]?.id ?? null);
  const [phase, setPhase] = useState<ImportPhase>("phase1");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<MasterImportResult | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (outletId === null && outlets[0]) {
      setOutletId(outlets[0].id);
    }
  }, [outletId, outlets]);

  useEffect(() => {
    void useSettingsStore.getState().ensureSectionsLoaded(["outlets"], { staleMs: 120_000 });
  }, []);

  const resetFile = () => {
    setFile(null);
    setPreview(null);
  };

  const downloadTemplate = async (format: "zip" | "xlsx" = "zip") => {
    setBusy(true);
    try {
      const blob =
        phase === "phase1"
          ? await downloadMasterImportPhase1Template()
          : phase === "phase2"
            ? await downloadMasterImportPhase2Template()
            : phase === "phase3"
              ? await downloadMasterImportPhase3Template()
              : format === "xlsx"
                ? await downloadMasterImportPhase4TemplateXlsx()
                : await downloadMasterImportPhase4Template();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download =
        phase === "phase1"
          ? "master-import-phase1-template.zip"
          : phase === "phase2"
            ? "master-import-phase2-template.zip"
            : phase === "phase3"
              ? "master-import-phase3-template.zip"
              : format === "xlsx"
                ? "master-import-phase4-template.xlsx"
                : "master-import-phase4-template.zip";
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success(t("settings.masterImport.templateDownloaded"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("settings.masterImport.templateFailed"));
    } finally {
      setBusy(false);
    }
  };

  const runImport = async (previewOnly: boolean) => {
    if (!outletId || !file) {
      toast.error(t("settings.masterImport.missingFile"));
      return;
    }
    setBusy(true);
    try {
      const result =
        phase === "phase1"
          ? await importMasterImportPhase1Bundle({
              outletId,
              tenantId: tenantId ?? undefined,
              file,
              preview: previewOnly,
            })
          : phase === "phase2"
            ? await importMasterImportPhase2Bundle({
                outletId,
                tenantId: tenantId ?? undefined,
                file,
                preview: previewOnly,
              })
            : phase === "phase3"
              ? await importMasterImportPhase3Bundle({
                  outletId,
                  tenantId: tenantId ?? undefined,
                  file,
                  preview: previewOnly,
                })
              : await importMasterImportPhase4Bundle({
                  outletId,
                  tenantId: tenantId ?? undefined,
                  file,
                  preview: previewOnly,
                });
      setPreview(result);
      if (previewOnly) {
        toast.success(
          t("settings.masterImport.previewDone", {
            created: result.created,
            updated: result.updated,
            errors: result.errorCount,
          }),
        );
      } else {
        toast.success(
          t("settings.masterImport.commitDone", {
            created: result.created,
            updated: result.updated,
          }),
        );
      }
    } catch (e) {
      toast.error(formatApiErrorMessage(e, t) || t("settings.masterImport.importFailed"));
    } finally {
      setBusy(false);
    }
  };

  const phaseLabel =
    phase === "phase1"
      ? t("settings.masterImport.phase1Title")
      : phase === "phase2"
        ? t("settings.masterImport.phase2Title")
        : phase === "phase3"
          ? t("settings.masterImport.phase3Title")
          : t("settings.masterImport.phase4Title");
  const phaseDesc =
    phase === "phase1"
      ? t("settings.masterImport.phase1Desc")
      : phase === "phase2"
        ? t("settings.masterImport.phase2Desc")
        : phase === "phase3"
          ? t("settings.masterImport.phase3Desc")
          : t("settings.masterImport.phase4Desc");

  return (
    <AdminPageShell className="space-y-6" maxWidth="5xl">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">{t("settings.masterImport.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("settings.masterImport.subtitle")}</p>
        <p className="text-sm">
          <Link to="/settings" className="text-primary underline-offset-4 hover:underline">
            {t("settings.masterImport.backToSettings")}
          </Link>
        </p>
      </div>

      <Tabs
        value={phase}
        onValueChange={(value) => {
          setPhase(value as ImportPhase);
          resetFile();
        }}
      >
        <TabsList>
          <TabsTrigger value="phase1">{t("settings.masterImport.phase1Tab")}</TabsTrigger>
          <TabsTrigger value="phase2">{t("settings.masterImport.phase2Tab")}</TabsTrigger>
          <TabsTrigger value="phase3">{t("settings.masterImport.phase3Tab")}</TabsTrigger>
          <TabsTrigger value="phase4">{t("settings.masterImport.phase4Tab")}</TabsTrigger>
        </TabsList>

        <TabsContent value={phase} className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{phaseLabel}</CardTitle>
              <CardDescription>{phaseDesc}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t("settings.masterImport.outlet")}</Label>
                  <Select value={outletId ? String(outletId) : ""} onValueChange={(v) => setOutletId(Number(v))}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("settings.masterImport.selectOutlet")} />
                    </SelectTrigger>
                    <SelectContent>
                      {outlets.map((o) => (
                        <SelectItem key={o.id} value={String(o.id)}>
                          {o.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="master-import-file">
                    {phase === "phase4"
                      ? t("settings.masterImport.bundleFile")
                      : t("settings.masterImport.zipFile")}
                  </Label>
                  <input
                    id="master-import-file"
                    type="file"
                    accept={
                      phase === "phase4"
                        ? ".zip,application/zip,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                        : ".zip,application/zip,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    }
                    className="block w-full text-sm"
                    onChange={(e) => {
                      setFile(e.target.files?.[0] ?? null);
                      setPreview(null);
                    }}
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" disabled={busy} onClick={() => void downloadTemplate("zip")}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  <span className="ml-2">{t("settings.masterImport.downloadTemplate")}</span>
                </Button>
                {phase === "phase4" ? (
                  <Button type="button" variant="outline" disabled={busy} onClick={() => void downloadTemplate("xlsx")}>
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    <span className="ml-2">{t("settings.masterImport.downloadXlsxTemplate")}</span>
                  </Button>
                ) : null}
                <Button type="button" variant="secondary" disabled={busy || !file} onClick={() => void runImport(true)}>
                  <FileUp className="h-4 w-4" />
                  <span className="ml-2">{t("settings.masterImport.preview")}</span>
                </Button>
                <Button
                  type="button"
                  disabled={busy || !file || (preview !== null && !preview.canCommit)}
                  onClick={() => void runImport(false)}
                >
                  {t("settings.masterImport.commit")}
                </Button>
              </div>
            </CardContent>
          </Card>

          {preview ? <ImportResultCard preview={preview} phase={phase} /> : null}
        </TabsContent>
      </Tabs>
    </AdminPageShell>
  );
}
