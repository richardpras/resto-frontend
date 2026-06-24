import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Save } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ChartAccountSelect from "@/components/settings/ChartAccountSelect";
import {
  getPostingMappings,
  updatePostingMappings,
  type AccountApiRow,
  type PostingMappingModule,
  type PostingMappingRuleRow,
} from "@/lib/api-integration/accountingEndpoints";
import { listOutletPaymentMethodConfigs, type OutletPaymentMethodConfigApi } from "@/lib/api-integration/outletPaymentMethodEndpoints";
import { useErpTranslation } from "@/i18n/useErpTranslation";
import { formatApiErrorMessage } from "@/i18n/apiErrorMessage";
import { useSettingsStore } from "@/stores/settingsStore";
import { useOutletStore } from "@/stores/outletStore";

const TENANT_SCOPE = "tenant";

const MODULES: PostingMappingModule[] = ["procurement", "pos", "payroll", "inventory"];

function ruleAccountType(rule: PostingMappingRuleRow): AccountApiRow["type"] {
  if (rule.accountTypes.includes("revenue")) return "revenue";
  if (rule.accountTypes.includes("expense")) return "expense";
  if (rule.accountTypes.includes("liability")) return "liability";
  if (rule.accountTypes.includes("asset")) return "asset";
  return "asset";
}

export default function AccountingPostingMappings() {
  const { t } = useErpTranslation();
  const outlets = useSettingsStore((s) => s.outlets);
  const ensureSectionsLoaded = useSettingsStore((s) => s.ensureSectionsLoaded);
  const banks = useSettingsStore((s) => s.banks);
  const activeOutletId = useOutletStore((s) => s.activeOutletId);

  const [activeModule, setActiveModule] = useState<PostingMappingModule>("procurement");
  const [scopeOutletId, setScopeOutletId] = useState<string>(
    typeof activeOutletId === "number" && activeOutletId >= 1 ? String(activeOutletId) : TENANT_SCOPE,
  );
  const [rules, setRules] = useState<PostingMappingRuleRow[]>([]);
  const [bankOverrides, setBankOverrides] = useState<Record<string, number | null>>({});
  const [paymentOverrides, setPaymentOverrides] = useState<Record<string, number | null>>({});
  const [outletPaymentMethods, setOutletPaymentMethods] = useState<OutletPaymentMethodConfigApi[]>([]);
  const [missingRequiredCount, setMissingRequiredCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const outletScope = useMemo(
    () => (scopeOutletId === TENANT_SCOPE ? undefined : { outletId: Number(scopeOutletId) }),
    [scopeOutletId],
  );

  const scopedOutletId = outletScope?.outletId;

  const loadOutletPaymentMethods = useCallback(async (outletId?: number) => {
    if (!outletId || outletId < 1) {
      setOutletPaymentMethods([]);
      return;
    }
    try {
      const configs = await listOutletPaymentMethodConfigs(outletId);
      setOutletPaymentMethods(configs);
    } catch {
      setOutletPaymentMethods([]);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPostingMappings({ module: activeModule, ...outletScope });
      setRules(data.rules);
      setMissingRequiredCount(data.missingRequiredCount);

      const bankMap: Record<string, number | null> = {};
      data.bankOverrides.forEach((row) => {
        bankMap[row.bankAccountId] = row.chartAccountId ?? null;
      });
      if (activeModule === "procurement") {
        banks.forEach((bank) => {
          if (!(bank.id in bankMap)) bankMap[bank.id] = null;
        });
      }
      setBankOverrides(bankMap);

      const paymentMap: Record<string, number | null> = {};
      data.paymentOverrides.forEach((row) => {
        paymentMap[row.paymentMethodCode] = row.chartAccountId ?? null;
      });
      if (activeModule === "pos" && scopedOutletId) {
        const configs = outletPaymentMethods.length > 0
          ? outletPaymentMethods
          : await listOutletPaymentMethodConfigs(scopedOutletId).catch(() => []);
        if (outletPaymentMethods.length === 0) {
          setOutletPaymentMethods(configs);
        }
        configs.forEach((pm) => {
          if (!(pm.paymentMethodCode in paymentMap)) paymentMap[pm.paymentMethodCode] = null;
        });
      }
      setPaymentOverrides(paymentMap);
    } catch (e) {
      toast.error(formatApiErrorMessage(e, t) || t("accounting.posting.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [activeModule, banks, outletPaymentMethods, outletScope, scopedOutletId, t]);

  useEffect(() => {
    void ensureSectionsLoaded(["outlets", "banks"], { staleMs: 90_000 });
  }, [ensureSectionsLoaded]);

  useEffect(() => {
    void loadOutletPaymentMethods(scopedOutletId);
  }, [loadOutletPaymentMethods, scopedOutletId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleRuleChange = (ruleKey: string, chartAccountId: number | null) => {
    setRules((prev) =>
      prev.map((rule) =>
        rule.ruleKey === ruleKey
          ? { ...rule, chartAccountId, configured: chartAccountId !== null && chartAccountId > 0 }
          : rule,
      ),
    );
  };

  const handleSave = async () => {
    const incomplete = rules.filter((r) => r.required && (!r.chartAccountId || r.chartAccountId < 1));
    if (incomplete.length > 0) {
      toast.error(t("accounting.posting.incompleteRules"));
      return;
    }

    setSaving(true);
    try {
      const payload: Parameters<typeof updatePostingMappings>[0] = {
        module: activeModule,
        ...outletScope,
        mappings: rules
          .filter((r) => r.chartAccountId && r.chartAccountId > 0)
          .map((r) => ({ ruleKey: r.ruleKey, chartAccountId: r.chartAccountId as number })),
      };

      if (activeModule === "procurement") {
        payload.bankOverrides = Object.entries(bankOverrides)
          .filter(([, chartAccountId]) => chartAccountId !== null && chartAccountId > 0)
          .map(([bankAccountId, chartAccountId]) => ({ bankAccountId, chartAccountId }));
      }

      if (activeModule === "pos") {
        payload.paymentOverrides = Object.entries(paymentOverrides)
          .filter(([, chartAccountId]) => chartAccountId !== null && chartAccountId > 0)
          .map(([paymentMethodCode, chartAccountId]) => ({ paymentMethodCode, chartAccountId }));
      }

      const data = await updatePostingMappings(payload);
      setRules(data.rules);
      setMissingRequiredCount(data.missingRequiredCount);
      toast.success(t("accounting.posting.saved"));
    } catch (e) {
      toast.error(formatApiErrorMessage(e, t) || t("accounting.posting.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const ruleLabel = (ruleKey: string, fallback: string) =>
    t(`accounting.posting.rules.${ruleKey}`, { defaultValue: fallback });

  const moduleSectionKey = `${activeModule}Section` as const;
  const moduleSectionHintKey = `${activeModule}SectionHint` as const;

  return (
    <div className="space-y-4">
      <Tabs value={activeModule} onValueChange={(v) => setActiveModule(v as PostingMappingModule)}>
        <TabsList>
          {MODULES.map((mod) => (
            <TabsTrigger key={mod} value={mod}>
              {t(`accounting.posting.modules.${mod}`)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {missingRequiredCount > 0 && (
        <Card className="border-warning/40 bg-warning/5">
          <CardContent className="p-4 flex items-start gap-3 text-sm">
            <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">{t("accounting.posting.incompleteBannerTitle", { module: t(`accounting.posting.modules.${activeModule}`) })}</p>
              <p className="text-muted-foreground mt-1">
                {t("accounting.posting.incompleteBannerBody", { count: missingRequiredCount })}
              </p>
              <Link to="/accounting?tab=health" className="text-primary underline-offset-4 hover:underline text-xs mt-2 inline-block">
                {t("accounting.posting.viewHealth")}
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1.5 min-w-[220px]">
          <label className="text-sm font-medium">{t("accounting.posting.scope")}</label>
          <Select value={scopeOutletId} onValueChange={setScopeOutletId}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TENANT_SCOPE}>{t("accounting.posting.tenantDefault")}</SelectItem>
              {outlets.map((o) => (
                <SelectItem key={o.id} value={String(o.id)}>{o.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" onClick={() => void load()} disabled={loading}>
          {t("accounting.posting.reload")}
        </Button>
        <Button onClick={() => void handleSave()} disabled={saving || loading} className="gap-2">
          <Save className="h-4 w-4" />
          {t("accounting.posting.save")}
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="px-4 py-3 border-b">
            <h3 className="font-semibold">{t(`accounting.posting.${moduleSectionKey}`, { defaultValue: activeModule })}</h3>
            <p className="text-sm text-muted-foreground">{t(`accounting.posting.${moduleSectionHintKey}`, { defaultValue: "" })}</p>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead>{t("accounting.posting.ruleColumn")}</TableHead>
                <TableHead>{t("accounting.posting.accountColumn")}</TableHead>
                <TableHead className="w-28">{t("accounting.posting.statusColumn")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((rule) => (
                <TableRow key={rule.ruleKey}>
                  <TableCell>
                    <div className="text-sm font-medium">{ruleLabel(rule.ruleKey, rule.label)}</div>
                    <div className="text-xs text-muted-foreground font-mono">{rule.ruleKey}</div>
                  </TableCell>
                  <TableCell className="max-w-md">
                    <ChartAccountSelect
                      value={rule.chartAccountId ?? null}
                      onChange={(chartAccountId) => handleRuleChange(rule.ruleKey, chartAccountId)}
                      accountType={ruleAccountType(rule)}
                      placeholder={t("accounting.posting.selectAccount")}
                    />
                  </TableCell>
                  <TableCell>
                    <Badge variant={rule.configured ? "outline" : "destructive"}>
                      {rule.configured ? t("accounting.posting.configured") : t("accounting.posting.missing")}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {rules.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                    {t("accounting.posting.empty")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {activeModule === "procurement" && (
        <Card>
          <CardContent className="p-0">
            <div className="px-4 py-3 border-b">
              <h3 className="font-semibold">{t("accounting.posting.bankOverridesSection")}</h3>
              <p className="text-sm text-muted-foreground">{t("accounting.posting.bankOverridesHint")}</p>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>{t("accounting.posting.bankColumn")}</TableHead>
                  <TableHead>{t("accounting.posting.accountColumn")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {banks.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center py-8 text-muted-foreground text-sm">
                      {t("accounting.posting.noBanks")}
                    </TableCell>
                  </TableRow>
                )}
                {banks.map((bank) => (
                  <TableRow key={bank.id}>
                    <TableCell className="text-sm">
                      {bank.bankName} — {bank.accountNumber}
                    </TableCell>
                    <TableCell className="max-w-md">
                      <ChartAccountSelect
                        value={bankOverrides[bank.id] ?? null}
                        onChange={(chartAccountId) =>
                          setBankOverrides((prev) => ({ ...prev, [bank.id]: chartAccountId }))
                        }
                        accountType="asset"
                        placeholder={t("accounting.posting.useBankDefault")}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {activeModule === "pos" && (
        <Card>
          <CardContent className="p-0">
            <div className="px-4 py-3 border-b">
              <h3 className="font-semibold">{t("accounting.posting.paymentOverridesSection")}</h3>
              <p className="text-sm text-muted-foreground">{t("accounting.posting.paymentOverridesHint")}</p>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>{t("accounting.posting.paymentMethodColumn")}</TableHead>
                  <TableHead>{t("accounting.posting.accountColumn")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!scopedOutletId && (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center py-8 text-muted-foreground text-sm">
                      {t("accounting.posting.paymentOverridesOutletRequired")}
                    </TableCell>
                  </TableRow>
                )}
                {scopedOutletId && outletPaymentMethods.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center py-8 text-muted-foreground text-sm">
                      {t("accounting.posting.noPaymentMethods")}
                    </TableCell>
                  </TableRow>
                )}
                {scopedOutletId && outletPaymentMethods.map((pm) => (
                  <TableRow key={pm.paymentMethodCode}>
                    <TableCell className="text-sm">
                      <div>{pm.label}</div>
                      <div className="text-xs text-muted-foreground font-mono">{pm.paymentMethodCode}</div>
                    </TableCell>
                    <TableCell className="max-w-md">
                      <ChartAccountSelect
                        value={paymentOverrides[pm.paymentMethodCode] ?? null}
                        onChange={(chartAccountId) =>
                          setPaymentOverrides((prev) => ({ ...prev, [pm.paymentMethodCode]: chartAccountId }))
                        }
                        accountType="asset"
                        placeholder={t("accounting.posting.usePaymentDefault")}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
