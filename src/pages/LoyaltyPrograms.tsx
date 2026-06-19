import { useEffect, useMemo, useState } from "react";
import { Gift, Plus, Pencil, Power, Calculator, ListTree, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { dialogScroll, dialogSize } from "@/lib/ui/dialogSizes";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable, type Column } from "@/components/DataTable";
import { LoyaltyAnalyticsDashboard } from "@/components/loyalty/LoyaltyAnalyticsDashboard";
import { PromotionsTab } from "@/components/loyalty/PromotionsTab";
import { useOutletStore } from "@/stores/outletStore";
import {
  useLoyaltyEngineStore,
} from "@/stores/loyaltyEngineStore";
import type {
  LoyaltyProgramRow,
  LoyaltyProgramType,
  LoyaltyRewardRow,
  LoyaltyVoucherRow,
  LoyaltyVoucherType,
  LoyaltyVoucherValueType,
  LoyaltyCampaignAudience,
  LoyaltyCampaignRow,
  LoyaltyCampaignSnapshot,
  LoyaltyCampaignStatus,
  MemberSegmentPreviewMember,
  MemberSegmentRow,
  MemberSegmentType,
  LoyaltyTierQualificationType,
  LoyaltyTierRow,
  LoyaltyAutomationActionType,
  LoyaltyAutomationLogRow,
  LoyaltyAutomationRow,
  LoyaltyAutomationTriggerType,
} from "@/lib/api-integration/loyaltyEngineEndpoints";
import { useErpTranslation } from "@/i18n/useErpTranslation";
import { formatApiErrorMessage } from "@/i18n/apiErrorMessage";
import type { TFunction } from "i18next";
import { toast } from "sonner";

const PROGRAM_TYPES: { value: LoyaltyProgramType; labelKey: string }[] = [
  { value: "spend_based", labelKey: "loyalty.enums.programTypes.spend_based" },
  { value: "visit_based", labelKey: "loyalty.enums.programTypes.visit_based" },
  { value: "period_spending", labelKey: "loyalty.enums.programTypes.period_spending" },
  { value: "percentage_reward", labelKey: "loyalty.enums.programTypes.percentage_reward" },
];

const SEGMENT_TYPES: { value: MemberSegmentType; labelKey: string }[] = [
  { value: "vip_spender", labelKey: "loyalty.enums.segmentTypes.vip_spender" },
  { value: "frequent_visitor", labelKey: "loyalty.enums.segmentTypes.frequent_visitor" },
  { value: "birthday_month", labelKey: "loyalty.enums.segmentTypes.birthday_month" },
  { value: "inactive_member", labelKey: "loyalty.enums.segmentTypes.inactive_member" },
  { value: "never_redeemed", labelKey: "loyalty.enums.segmentTypes.never_redeemed" },
  { value: "expiring_soon", labelKey: "loyalty.enums.segmentTypes.expiring_soon" },
];

function defaultSegmentConfig(type: MemberSegmentType): Record<string, unknown> {
  switch (type) {
    case "vip_spender":
      return { minimum_spending: 5000000 };
    case "frequent_visitor":
      return { minimum_visits: 20 };
    case "inactive_member":
      return { inactive_days: 90 };
    case "expiring_soon":
      return { days_before_expiry: 30 };
    default:
      return {};
  }
}

const segmentTypeLabel = (value: string, t: TFunction) => {
  const item = SEGMENT_TYPES.find((s) => s.value === value);
  return item ? t(item.labelKey) : value;
};

const TIER_TYPES: { value: LoyaltyTierQualificationType; labelKey: string }[] = [
  { value: "lifetime_points", labelKey: "loyalty.enums.tierTypes.lifetime_points" },
  { value: "lifetime_spending", labelKey: "loyalty.enums.tierTypes.lifetime_spending" },
  { value: "visit_count", labelKey: "loyalty.enums.tierTypes.visit_count" },
];

function defaultTierConfig(type: LoyaltyTierQualificationType): Record<string, unknown> {
  switch (type) {
    case "lifetime_points":
      return { minimum_points: 1000 };
    case "lifetime_spending":
      return { minimum_spending: 5000000 };
    case "visit_count":
      return { minimum_visits: 20 };
  }
}

const tierTypeLabel = (value: string, t: TFunction) => {
  const item = TIER_TYPES.find((s) => s.value === value);
  return item ? t(item.labelKey) : value;
};

const AUTOMATION_TRIGGERS: { value: LoyaltyAutomationTriggerType; labelKey: string }[] = [
  { value: "member_birthday", labelKey: "loyalty.enums.automationTriggers.member_birthday" },
  { value: "member_created", labelKey: "loyalty.enums.automationTriggers.member_created" },
  { value: "tier_upgraded", labelKey: "loyalty.enums.automationTriggers.tier_upgraded" },
  { value: "visit_milestone", labelKey: "loyalty.enums.automationTriggers.visit_milestone" },
  { value: "points_milestone", labelKey: "loyalty.enums.automationTriggers.points_milestone" },
  { value: "inactive_member", labelKey: "loyalty.enums.automationTriggers.inactive_member" },
  { value: "voucher_redeemed", labelKey: "loyalty.enums.automationTriggers.voucher_redeemed" },
  { value: "reward_redeemed", labelKey: "loyalty.enums.automationTriggers.reward_redeemed" },
];

const AUTOMATION_ACTIONS: { value: LoyaltyAutomationActionType; labelKey: string }[] = [
  { value: "issue_voucher", labelKey: "loyalty.enums.automationActions.issue_voucher" },
  { value: "send_notification", labelKey: "loyalty.enums.automationActions.send_notification" },
  { value: "assign_campaign", labelKey: "loyalty.enums.automationActions.assign_campaign" },
];

function defaultAutomationCondition(trigger: LoyaltyAutomationTriggerType): Record<string, unknown> {
  switch (trigger) {
    case "member_birthday":
      return { daysBefore: 0 };
    case "visit_milestone":
      return { visitCount: 10 };
    case "points_milestone":
      return { points: 1000 };
    case "inactive_member":
      return { daysInactive: 30 };
    default:
      return {};
  }
}

function defaultAutomationPreset(trigger: LoyaltyAutomationTriggerType): { code: string; nameKey: string } {
  switch (trigger) {
    case "member_birthday":
      return { code: "BDAY_VOUCHER", nameKey: "loyalty.enums.automationPresets.bdayVoucher" };
    case "inactive_member":
      return { code: "INACTIVE_VOUCHER", nameKey: "loyalty.enums.automationPresets.inactiveVoucher" };
    case "tier_upgraded":
      return { code: "TIER_NOTIFY", nameKey: "loyalty.enums.automationPresets.tierNotify" };
    case "visit_milestone":
      return { code: "VISIT_REWARD", nameKey: "loyalty.enums.automationPresets.visitReward" };
    case "points_milestone":
      return { code: "POINTS_CAMPAIGN", nameKey: "loyalty.enums.automationPresets.pointsCampaign" };
    default:
      return { code: "", nameKey: "" };
  }
}

function defaultAutomationActionConfig(
  action: LoyaltyAutomationActionType,
  t: TFunction,
): Record<string, unknown> {
  switch (action) {
    case "send_notification":
      return {
        title: t("loyalty.enums.notificationDefaults.helloMember"),
        content: t("loyalty.enums.notificationDefaults.thankYouLoyal"),
      };
    default:
      return {};
  }
}

const automationTriggerLabel = (value: string, t: TFunction) => {
  const item = AUTOMATION_TRIGGERS.find((s) => s.value === value);
  return item ? t(item.labelKey) : value;
};
const automationActionLabel = (value: string, t: TFunction) => {
  const item = AUTOMATION_ACTIONS.find((s) => s.value === value);
  return item ? t(item.labelKey) : value;
};

const defaultTierBenefitConfig = () => ({
  priorityCampaign: false,
  exclusiveVoucher: false,
  exclusiveReward: false,
  monthlyVoucher: false,
});

type TierBenefitKey = keyof ReturnType<typeof defaultTierBenefitConfig>;

const TIER_BENEFIT_OPTIONS: { key: TierBenefitKey; labelKey: string }[] = [
  { key: "priorityCampaign", labelKey: "loyalty.enums.tierBenefits.priorityCampaign" },
  { key: "exclusiveVoucher", labelKey: "loyalty.enums.tierBenefits.exclusiveVoucher" },
  { key: "exclusiveReward", labelKey: "loyalty.enums.tierBenefits.exclusiveReward" },
  { key: "monthlyVoucher", labelKey: "loyalty.enums.tierBenefits.monthlyVoucher" },
];

const typeLabel = (value: string, t: TFunction) => {
  const item = PROGRAM_TYPES.find((p) => p.value === value);
  return item ? t(item.labelKey) : value;
};

function defaultRuleConfig(type: string): Record<string, unknown> {
  switch (type) {
    case "visit_based":
      return { visit_threshold: 10, points_awarded: 100 };
    case "period_spending":
      return { period: "monthly", minimum_spend: 0, reward_percent: 5 };
    case "percentage_reward":
      return { percentage: 5 };
    default:
      return { earnPerAmount: 10000, pointsEarned: 1 };
  }
}

function updateRuleConfigField(
  current: Record<string, unknown>,
  key: string,
  value: string | number,
): Record<string, unknown> {
  return { ...current, [key]: value };
}

function ProgramRuleFields({
  type,
  ruleConfig,
  onChange,
  t,
}: {
  type: LoyaltyProgramType;
  ruleConfig: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
  t: TFunction;
}) {
  if (type === "manual") {
    return <p className="text-sm text-muted-foreground">{t("loyalty.form.manualProgramsNoRules")}</p>;
  }

  if (type === "spend_based") {
    return (
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>{t("loyalty.form.earnPerAmount")}</Label>
          <Input
            type="number"
            min={1}
            value={String(ruleConfig.earnPerAmount ?? 10000)}
            onChange={(e) => onChange(updateRuleConfigField(ruleConfig, "earnPerAmount", Number(e.target.value) || 0))}
          />
        </div>
        <div className="space-y-1">
          <Label>{t("loyalty.form.pointsEarned")}</Label>
          <Input
            type="number"
            min={1}
            value={String(ruleConfig.pointsEarned ?? 1)}
            onChange={(e) => onChange(updateRuleConfigField(ruleConfig, "pointsEarned", Number(e.target.value) || 0))}
          />
        </div>
        <p className="sm:col-span-2 text-xs text-muted-foreground">
          {t("loyalty.form.earnExample")}
        </p>
      </div>
    );
  }

  if (type === "visit_based") {
    return (
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>{t("loyalty.form.visitThreshold")}</Label>
          <Input
            type="number"
            min={1}
            value={String(ruleConfig.visit_threshold ?? 10)}
            onChange={(e) => onChange(updateRuleConfigField(ruleConfig, "visit_threshold", Number(e.target.value) || 0))}
          />
        </div>
        <div className="space-y-1">
          <Label>{t("loyalty.form.pointsAwarded")}</Label>
          <Input
            type="number"
            min={1}
            value={String(ruleConfig.points_awarded ?? 100)}
            onChange={(e) => onChange(updateRuleConfigField(ruleConfig, "points_awarded", Number(e.target.value) || 0))}
          />
        </div>
      </div>
    );
  }

  if (type === "period_spending") {
    return (
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>{t("loyalty.form.period")}</Label>
          <Select
            value={String(ruleConfig.period ?? "monthly")}
            onValueChange={(v) => onChange(updateRuleConfigField(ruleConfig, "period", v))}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">{t("loyalty.enums.periods.weekly")}</SelectItem>
              <SelectItem value="monthly">{t("loyalty.enums.periods.monthly")}</SelectItem>
              <SelectItem value="yearly">{t("loyalty.enums.periods.yearly")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>{t("loyalty.form.minimumSpend")}</Label>
          <Input
            type="number"
            min={0}
            value={String(ruleConfig.minimum_spend ?? 0)}
            onChange={(e) => onChange(updateRuleConfigField(ruleConfig, "minimum_spend", Number(e.target.value) || 0))}
          />
        </div>
        <div className="space-y-1">
          <Label>{t("loyalty.form.rewardPercent")}</Label>
          <Input
            type="number"
            min={0}
            step={0.1}
            value={String(ruleConfig.reward_percent ?? 5)}
            onChange={(e) => onChange(updateRuleConfigField(ruleConfig, "reward_percent", Number(e.target.value) || 0))}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <Label>{t("loyalty.form.rewardPercentage")}</Label>
      <Input
        type="number"
        min={0}
        step={0.1}
        value={String(ruleConfig.percentage ?? 5)}
        onChange={(e) => onChange(updateRuleConfigField(ruleConfig, "percentage", Number(e.target.value) || 0))}
      />
    </div>
  );
}

export default function LoyaltyPrograms() {
  const { t } = useErpTranslation();
  const activeOutletId = useOutletStore((s) => s.activeOutletId);
  const {
    programs,
    lastSimulation,
    loadingPrograms,
    simulating,
    fetchPrograms,
    createProgram,
    updateProgram,
    setProgramActive,
    runSimulation,
    rewards,
    loadingRewards,
    fetchRewards,
    createReward,
    updateReward,
    setRewardActive,
    vouchers,
    loadingVouchers,
    fetchVouchers,
    createVoucher,
    updateVoucher,
    setVoucherActive,
    issueCampaignVoucher,
    segments,
    loadingSegments,
    fetchSegments,
    createSegment,
    updateSegment,
    setSegmentActive,
    previewSegment,
    tiers,
    loadingTiers,
    fetchTiers,
    createTier,
    updateTier,
    setTierActive,
    automations,
    loadingAutomations,
    fetchAutomations,
    createAutomation,
    updateAutomation,
    setAutomationActive,
    fetchAutomationLogs,
    campaigns,
    loadingCampaigns,
    fetchCampaigns,
    createCampaign,
    updateCampaign,
    updateCampaignStatus,
    fetchCampaignAudience,
    fetchCampaignAudienceSnapshot,
    activateCampaign,
    completeCampaign,
    cancelCampaign,
  } = useLoyaltyEngineStore();

  const [tab, setTab] = useState("programs");
  const [programOpen, setProgramOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<LoyaltyProgramRow | null>(null);
  const [programForm, setProgramForm] = useState({
    code: "",
    name: "",
    description: "",
    type: "spend_based" as LoyaltyProgramType,
    effectiveFrom: "",
    effectiveUntil: "",
    isActive: true,
    expiryEnabled: false,
    expiryDays: "365",
    ruleConfig: defaultRuleConfig("spend_based"),
  });
  const [simForm, setSimForm] = useState({
    programId: "",
    spendingAmount: "100000",
    visitCount: "1",
    simulationDate: new Date().toISOString().slice(0, 10),
  });
  const [saving, setSaving] = useState(false);
  const [rewardOpen, setRewardOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<LoyaltyRewardRow | null>(null);
  const [rewardForm, setRewardForm] = useState({
    code: "",
    name: "",
    description: "",
    pointsCost: "500",
    sortOrder: "",
  });
  const [voucherOpen, setVoucherOpen] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState<LoyaltyVoucherRow | null>(null);
  const [voucherForm, setVoucherForm] = useState({
    code: "",
    name: "",
    description: "",
    voucherType: "manual" as LoyaltyVoucherType,
    valueType: "fixed_amount" as LoyaltyVoucherValueType,
    value: "10000",
    minimumSpend: "0",
    validFrom: "",
    validUntil: "",
  });
  const [issueVoucherOpen, setIssueVoucherOpen] = useState(false);
  const [issueVoucherCampaign, setIssueVoucherCampaign] = useState<LoyaltyCampaignRow | null>(null);
  const [issueVoucherId, setIssueVoucherId] = useState("");
  const [segmentOpen, setSegmentOpen] = useState(false);
  const [editingSegment, setEditingSegment] = useState<MemberSegmentRow | null>(null);
  const [segmentForm, setSegmentForm] = useState({
    code: "",
    name: "",
    description: "",
    segmentType: "vip_spender" as MemberSegmentType,
    configJson: JSON.stringify(defaultSegmentConfig("vip_spender"), null, 2),
    isActive: true,
  });
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewSegmentRow, setPreviewSegmentRow] = useState<MemberSegmentRow | null>(null);
  const [previewCount, setPreviewCount] = useState(0);
  const [previewMembers, setPreviewMembers] = useState<MemberSegmentPreviewMember[]>([]);
  const [tierOpen, setTierOpen] = useState(false);
  const [editingTier, setEditingTier] = useState<LoyaltyTierRow | null>(null);
  const [tierForm, setTierForm] = useState({
    code: "",
    name: "",
    description: "",
    qualificationType: "lifetime_points" as LoyaltyTierQualificationType,
    configJson: JSON.stringify(defaultTierConfig("lifetime_points"), null, 2),
    benefits: defaultTierBenefitConfig(),
    sortOrder: "0",
    isActive: true,
  });
  const [previewLoading, setPreviewLoading] = useState(false);
  const [campaignOpen, setCampaignOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<LoyaltyCampaignRow | null>(null);
  const [campaignForm, setCampaignForm] = useState({
    code: "",
    name: "",
    description: "",
    segmentId: "",
    campaignType: "audience",
    scheduledAt: "",
    status: "draft" as LoyaltyCampaignStatus,
  });
  const [campaignAudienceOpen, setCampaignAudienceOpen] = useState(false);
  const [campaignAudience, setCampaignAudience] = useState<LoyaltyCampaignAudience | null>(null);
  const [campaignAudienceLoading, setCampaignAudienceLoading] = useState(false);
  const [campaignSnapshotOpen, setCampaignSnapshotOpen] = useState(false);
  const [campaignSnapshot, setCampaignSnapshot] = useState<LoyaltyCampaignSnapshot | null>(null);
  const [campaignSnapshotLoading, setCampaignSnapshotLoading] = useState(false);
  const [automationOpen, setAutomationOpen] = useState(false);
  const [editingAutomation, setEditingAutomation] = useState<LoyaltyAutomationRow | null>(null);
  const [automationForm, setAutomationForm] = useState({
    code: "",
    name: "",
    description: "",
    triggerType: "member_created" as LoyaltyAutomationTriggerType,
    actionType: "send_notification" as LoyaltyAutomationActionType,
    daysBefore: "0",
    visitCount: "10",
    points: "1000",
    daysInactive: "30",
    voucherId: "",
    campaignId: "",
    notificationTitle: "",
    notificationContent: "",
    isActive: true,
  });
  const [automationLogsOpen, setAutomationLogsOpen] = useState(false);
  const [automationLogsLoading, setAutomationLogsLoading] = useState(false);
  const [automationLogs, setAutomationLogs] = useState<LoyaltyAutomationLogRow[]>([]);
  const [automationLogsTitle, setAutomationLogsTitle] = useState("");

  const outletPrograms = useMemo(
    () =>
      programs.filter(
        (p) =>
          activeOutletId == null ||
          p.outletId === activeOutletId ||
          p.outletId == null,
      ),
    [programs, activeOutletId],
  );

  useEffect(() => {
    if (!activeOutletId) return;
    void fetchPrograms(activeOutletId).catch((e) =>
      toast.error(formatApiErrorMessage(e, t) || t("loyalty.toast.loadProgramsFailed")),
    );
  }, [activeOutletId, fetchPrograms]);

  useEffect(() => {
    if (tab === "rewards" && activeOutletId) {
      void fetchRewards(activeOutletId).catch((e) =>
        toast.error(formatApiErrorMessage(e, t) || t("loyalty.toast.loadRewardsFailed")),
      );
    }
  }, [tab, activeOutletId, fetchRewards]);

  useEffect(() => {
    if (tab === "vouchers" && activeOutletId) {
      void fetchVouchers(activeOutletId).catch((e) =>
        toast.error(formatApiErrorMessage(e, t) || t("loyalty.toast.loadVouchersFailed")),
      );
    }
  }, [tab, activeOutletId, fetchVouchers]);

  useEffect(() => {
    if (tab === "segments" && activeOutletId) {
      void fetchSegments(activeOutletId).catch((e) =>
        toast.error(formatApiErrorMessage(e, t) || t("loyalty.toast.loadSegmentsFailed")),
      );
    }
  }, [tab, activeOutletId, fetchSegments]);

  useEffect(() => {
    if (tab === "tiers" && activeOutletId) {
      void fetchTiers(activeOutletId).catch((e) =>
        toast.error(formatApiErrorMessage(e, t) || t("loyalty.toast.loadTiersFailed")),
      );
    }
  }, [tab, activeOutletId, fetchTiers]);

  useEffect(() => {
    if (tab === "automations" && activeOutletId) {
      void fetchAutomations(activeOutletId).catch((e) =>
        toast.error(formatApiErrorMessage(e, t) || t("loyalty.toast.loadAutomationsFailed")),
      );
      void fetchVouchers(activeOutletId).catch(() => undefined);
      void fetchCampaigns(activeOutletId).catch(() => undefined);
    }
  }, [tab, activeOutletId, fetchAutomations, fetchVouchers, fetchCampaigns]);

  useEffect(() => {
    if (tab === "campaigns" && activeOutletId) {
      void fetchCampaigns(activeOutletId).catch((e) =>
        toast.error(formatApiErrorMessage(e, t) || t("loyalty.toast.loadCampaignsFailed")),
      );
      void fetchSegments(activeOutletId).catch(() => undefined);
      void fetchVouchers(activeOutletId).catch(() => undefined);
    }
  }, [tab, activeOutletId, fetchCampaigns, fetchSegments, fetchVouchers]);

  const openNewProgram = () => {
    setEditingProgram(null);
    setProgramForm({
      code: "",
      name: "",
      description: "",
      type: "spend_based",
      effectiveFrom: "",
      effectiveUntil: "",
      isActive: true,
      expiryEnabled: false,
      expiryDays: "365",
      ruleConfig: defaultRuleConfig("spend_based"),
    });
    setProgramOpen(true);
  };

  const openEditProgram = (p: LoyaltyProgramRow) => {
    setEditingProgram(p);
    setProgramForm({
      code: p.code,
      name: p.name,
      description: p.description ?? "",
      type: p.type,
      effectiveFrom: p.effectiveFrom ?? "",
      effectiveUntil: p.effectiveUntil ?? "",
      isActive: p.isActive,
      expiryEnabled: p.expiryEnabled ?? false,
      expiryDays: p.expiryDays != null ? String(p.expiryDays) : "365",
      ruleConfig: p.ruleConfig ?? defaultRuleConfig(p.type),
    });
    setProgramOpen(true);
  };

  const handleSaveProgram = async () => {
    if ((!editingProgram && !programForm.code.trim()) || !programForm.name.trim()) {
      return toast.error(t("loyalty.toast.codeNameRequired"));
    }
    if (!activeOutletId && !editingProgram) {
      return toast.error(t("loyalty.toast.selectOutletFirst"));
    }
    if (programForm.expiryEnabled) {
      const days = Number(programForm.expiryDays);
      if (!Number.isFinite(days) || days < 1) {
        return toast.error(t("loyalty.toast.expiryDaysMin"));
      }
    }
    setSaving(true);
    try {
      const expiryPayload = {
        expiryEnabled: programForm.expiryEnabled,
        expiryDays: programForm.expiryEnabled ? Number(programForm.expiryDays) : null,
      };
      const rulePayload =
        programForm.type !== "manual" ? { ruleConfig: programForm.ruleConfig } : {};
      if (editingProgram) {
        await updateProgram(editingProgram.id, {
          name: programForm.name,
          description: programForm.description || null,
          effectiveFrom: programForm.effectiveFrom || null,
          effectiveUntil: programForm.effectiveUntil || null,
          ...expiryPayload,
          ...rulePayload,
        });
        if (editingProgram.isActive !== programForm.isActive) {
          await setProgramActive(editingProgram.id, programForm.isActive);
        }
        toast.success(t("loyalty.toast.programUpdated"));
      } else {
        await createProgram({
          outletId: activeOutletId ?? undefined,
          code: programForm.code,
          name: programForm.name,
          description: programForm.description || undefined,
          type: programForm.type,
          isActive: programForm.isActive,
          effectiveFrom: programForm.effectiveFrom || undefined,
          effectiveUntil: programForm.effectiveUntil || undefined,
          ...expiryPayload,
          ...rulePayload,
        });
        toast.success(t("loyalty.toast.programCreated"));
      }
      setProgramOpen(false);
    } catch (e) {
      toast.error(formatApiErrorMessage(e, t) || t("loyalty.toast.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const openNewReward = () => {
    setEditingReward(null);
    setRewardForm({ code: "", name: "", description: "", pointsCost: "500", sortOrder: "" });
    setRewardOpen(true);
  };

  const openEditReward = (r: LoyaltyRewardRow) => {
    setEditingReward(r);
    setRewardForm({
      code: r.code,
      name: r.name,
      description: r.description ?? "",
      pointsCost: String(r.pointsCost),
      sortOrder: r.sortOrder != null ? String(r.sortOrder) : "",
    });
    setRewardOpen(true);
  };

  const openNewVoucher = () => {
    setEditingVoucher(null);
    setVoucherForm({
      code: "",
      name: "",
      description: "",
      voucherType: "manual",
      valueType: "fixed_amount",
      value: "10000",
      minimumSpend: "0",
      validFrom: "",
      validUntil: "",
    });
    setVoucherOpen(true);
  };

  const openEditVoucher = (v: LoyaltyVoucherRow) => {
    setEditingVoucher(v);
    setVoucherForm({
      code: v.code,
      name: v.name,
      description: v.description ?? "",
      voucherType: v.voucherType,
      valueType: v.valueType,
      value: String(v.value),
      minimumSpend: String(v.minimumSpend),
      validFrom: v.validFrom ? v.validFrom.slice(0, 16) : "",
      validUntil: v.validUntil ? v.validUntil.slice(0, 16) : "",
    });
    setVoucherOpen(true);
  };

  const handleSaveVoucher = async () => {
    if (!activeOutletId || !voucherForm.code.trim() || !voucherForm.name.trim()) {
      return toast.error(t("loyalty.toast.codeNameRequired"));
    }
    setSaving(true);
    try {
      const payload = {
        code: voucherForm.code,
        name: voucherForm.name,
        description: voucherForm.description || undefined,
        voucherType: voucherForm.voucherType,
        valueType: voucherForm.valueType,
        value: Number(voucherForm.value) || 0,
        minimumSpend: Number(voucherForm.minimumSpend) || 0,
        validFrom: voucherForm.validFrom ? new Date(voucherForm.validFrom).toISOString() : null,
        validUntil: voucherForm.validUntil ? new Date(voucherForm.validUntil).toISOString() : null,
      };
      if (editingVoucher) {
        await updateVoucher(editingVoucher.id, payload, activeOutletId);
        toast.success(t("loyalty.toast.voucherUpdated"));
      } else {
        await createVoucher({ outletId: activeOutletId, ...payload });
        toast.success(t("loyalty.toast.voucherCreated"));
      }
      setVoucherOpen(false);
    } catch (e) {
      toast.error(formatApiErrorMessage(e, t) || t("loyalty.toast.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const openIssueVoucher = (campaign: LoyaltyCampaignRow) => {
    setIssueVoucherCampaign(campaign);
    setIssueVoucherId(vouchers.find((v) => v.isActive)?.id ?? "");
    setIssueVoucherOpen(true);
  };

  const handleIssueVoucher = async () => {
    if (!activeOutletId || !issueVoucherCampaign || !issueVoucherId) {
      return toast.error(t("loyalty.toast.selectVoucher"));
    }
    setSaving(true);
    try {
      const result = await issueCampaignVoucher(
        issueVoucherCampaign.id,
        Number(issueVoucherId),
        activeOutletId,
      );
      toast.success(
        t("loyalty.toast.issuedSummary", {
          issued: result.issuedCount,
          skipped: result.skippedCount,
        }),
      );
      setIssueVoucherOpen(false);
    } catch (e) {
      toast.error(formatApiErrorMessage(e, t) || t("loyalty.toast.issueFailed"));
    } finally {
      setSaving(false);
    }
  };

  const openNewSegment = () => {
    setEditingSegment(null);
    setSegmentForm({
      code: "",
      name: "",
      description: "",
      segmentType: "vip_spender",
      configJson: JSON.stringify(defaultSegmentConfig("vip_spender"), null, 2),
      isActive: true,
    });
    setSegmentOpen(true);
  };

  const openEditSegment = (s: MemberSegmentRow) => {
    setEditingSegment(s);
    setSegmentForm({
      code: s.code,
      name: s.name,
      description: s.description ?? "",
      segmentType: s.segmentType,
      configJson: JSON.stringify(s.config ?? {}, null, 2),
      isActive: s.isActive,
    });
    setSegmentOpen(true);
  };

  const handleSaveSegment = async () => {
    if (!activeOutletId || !segmentForm.code.trim() || !segmentForm.name.trim()) {
      return toast.error(t("loyalty.toast.codeNameRequired"));
    }
    let config: Record<string, unknown>;
    try {
      config = JSON.parse(segmentForm.configJson) as Record<string, unknown>;
    } catch {
      return toast.error(t("loyalty.toast.configInvalidJson"));
    }
    setSaving(true);
    try {
      if (editingSegment) {
        await updateSegment(
          editingSegment.id,
          {
            code: segmentForm.code,
            name: segmentForm.name,
            description: segmentForm.description || null,
            segmentType: segmentForm.segmentType,
            config,
          },
          activeOutletId,
        );
        if (editingSegment.isActive !== segmentForm.isActive) {
          await setSegmentActive(editingSegment.id, segmentForm.isActive, activeOutletId);
        }
        toast.success(t("loyalty.toast.segmentUpdated"));
      } else {
        await createSegment({
          outletId: activeOutletId,
          code: segmentForm.code,
          name: segmentForm.name,
          description: segmentForm.description || undefined,
          segmentType: segmentForm.segmentType,
          config,
          isActive: segmentForm.isActive,
        });
        toast.success(t("loyalty.toast.segmentCreated"));
      }
      setSegmentOpen(false);
    } catch (e) {
      toast.error(formatApiErrorMessage(e, t) || t("loyalty.toast.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const openNewTier = () => {
    setEditingTier(null);
    setTierForm({
      code: "",
      name: "",
      description: "",
      qualificationType: "lifetime_points",
      configJson: JSON.stringify(defaultTierConfig("lifetime_points"), null, 2),
      benefits: defaultTierBenefitConfig(),
      sortOrder: "0",
      isActive: true,
    });
    setTierOpen(true);
  };

  const openEditTier = (t: LoyaltyTierRow) => {
    setEditingTier(t);
    setTierForm({
      code: t.code,
      name: t.name,
      description: t.description ?? "",
      qualificationType: t.qualificationType,
      configJson: JSON.stringify(t.qualificationConfig ?? {}, null, 2),
      benefits: {
        ...defaultTierBenefitConfig(),
        ...(t.benefitConfig ?? {}),
      },
      sortOrder: String(t.sortOrder ?? 0),
      isActive: t.isActive,
    });
    setTierOpen(true);
  };

  const handleSaveTier = async () => {
    if (!activeOutletId || !tierForm.code.trim() || !tierForm.name.trim()) {
      return toast.error(t("loyalty.toast.codeNameRequired"));
    }
    let qualificationConfig: Record<string, unknown>;
    try {
      qualificationConfig = JSON.parse(tierForm.configJson) as Record<string, unknown>;
    } catch {
      return toast.error(t("loyalty.toast.qualificationConfigInvalidJson"));
    }
    setSaving(true);
    try {
      const sortOrder = Number(tierForm.sortOrder) || 0;
      if (editingTier) {
        await updateTier(
          editingTier.id,
          {
            code: tierForm.code,
            name: tierForm.name,
            description: tierForm.description || null,
            qualificationType: tierForm.qualificationType,
            qualificationConfig,
            benefitConfig: tierForm.benefits,
            sortOrder,
          },
          activeOutletId,
        );
        if (editingTier.isActive !== tierForm.isActive) {
          await setTierActive(editingTier.id, tierForm.isActive, activeOutletId);
        }
        toast.success(t("loyalty.toast.tierUpdated"));
      } else {
        await createTier({
          outletId: activeOutletId,
          code: tierForm.code,
          name: tierForm.name,
          description: tierForm.description || undefined,
          qualificationType: tierForm.qualificationType,
          qualificationConfig,
          benefitConfig: tierForm.benefits,
          sortOrder,
          isActive: tierForm.isActive,
        });
        toast.success(t("loyalty.toast.tierCreated"));
      }
      setTierOpen(false);
    } catch (e) {
      toast.error(formatApiErrorMessage(e, t) || t("loyalty.toast.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const openNewAutomation = () => {
    const triggerType = "member_created" as LoyaltyAutomationTriggerType;
    const preset = defaultAutomationPreset(triggerType);
    setEditingAutomation(null);
    setAutomationForm({
      code: preset.code,
      name: preset.nameKey ? t(preset.nameKey) : t("loyalty.enums.automationPresets.welcomeNotification"),
      description: "",
      triggerType,
      actionType: "send_notification",
      daysBefore: "0",
      visitCount: "10",
      points: "1000",
      daysInactive: "30",
      voucherId: vouchers[0]?.id ?? "",
      campaignId: campaigns[0]?.id ?? "",
      notificationTitle: t("loyalty.enums.notificationDefaults.welcomeMember"),
      notificationContent: t("loyalty.enums.notificationDefaults.thanksJoining"),
      isActive: true,
    });
    setAutomationOpen(true);
  };

  const openEditAutomation = (row: LoyaltyAutomationRow) => {
    const condition = row.condition ?? {};
    const actionConfig = row.actionConfig ?? {};
    setEditingAutomation(row);
    setAutomationForm({
      code: row.code,
      name: row.name,
      description: row.description ?? "",
      triggerType: row.triggerType,
      actionType: row.actionType,
      daysBefore: String(condition.daysBefore ?? 0),
      visitCount: String(condition.visitCount ?? 10),
      points: String(condition.points ?? 1000),
      daysInactive: String(condition.daysInactive ?? 30),
      voucherId: String(actionConfig.voucherId ?? vouchers[0]?.id ?? ""),
      campaignId: String(actionConfig.campaignId ?? campaigns[0]?.id ?? ""),
      notificationTitle: String(
        actionConfig.title ?? t("loyalty.enums.notificationDefaults.helloMember"),
      ),
      notificationContent: String(actionConfig.content ?? row.description ?? row.name),
      isActive: row.isActive,
    });
    setAutomationOpen(true);
  };

  const buildAutomationCondition = (): Record<string, unknown> => {
    switch (automationForm.triggerType) {
      case "member_birthday":
        return { daysBefore: Number(automationForm.daysBefore) || 0 };
      case "visit_milestone":
        return { visitCount: Number(automationForm.visitCount) || 0 };
      case "points_milestone":
        return { points: Number(automationForm.points) || 0 };
      case "inactive_member":
        return { daysInactive: Number(automationForm.daysInactive) || 0 };
      default:
        return {};
    }
  };

  const buildAutomationActionConfig = (): Record<string, unknown> => {
    switch (automationForm.actionType) {
      case "issue_voucher":
        return { voucherId: Number(automationForm.voucherId) || 0 };
      case "assign_campaign":
        return { campaignId: Number(automationForm.campaignId) || 0 };
      case "send_notification":
        return {
          title: automationForm.notificationTitle,
          content: automationForm.notificationContent,
        };
      default:
        return {};
    }
  };

  const handleSaveAutomation = async () => {
    if (!activeOutletId || !automationForm.code.trim() || !automationForm.name.trim()) {
      return toast.error(t("loyalty.toast.codeNameRequired"));
    }
    setSaving(true);
    try {
      const payload = {
        code: automationForm.code,
        name: automationForm.name,
        description: automationForm.description || undefined,
        triggerType: automationForm.triggerType,
        condition: buildAutomationCondition(),
        actionType: automationForm.actionType,
        actionConfig: buildAutomationActionConfig(),
        isActive: automationForm.isActive,
      };
      if (editingAutomation) {
        await updateAutomation(editingAutomation.id, payload, activeOutletId);
        if (editingAutomation.isActive !== automationForm.isActive) {
          await setAutomationActive(editingAutomation.id, automationForm.isActive, activeOutletId);
        }
        toast.success(t("loyalty.toast.automationUpdated"));
      } else {
        await createAutomation({ outletId: activeOutletId, ...payload });
        toast.success(t("loyalty.toast.automationCreated"));
      }
      setAutomationOpen(false);
    } catch (e) {
      toast.error(formatApiErrorMessage(e, t) || t("loyalty.toast.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const handleViewAutomationLogs = async (row: LoyaltyAutomationRow) => {
    setAutomationLogsTitle(row.name);
    setAutomationLogsOpen(true);
    setAutomationLogsLoading(true);
    setAutomationLogs([]);
    try {
      const logs = await fetchAutomationLogs(row.id, 50);
      setAutomationLogs(logs);
    } catch (e) {
      toast.error(formatApiErrorMessage(e, t) || t("loyalty.toast.loadLogsFailed"));
    } finally {
      setAutomationLogsLoading(false);
    }
  };

  const handlePreviewSegment = async (segment: MemberSegmentRow) => {
    setPreviewSegmentRow(segment);
    setPreviewOpen(true);
    setPreviewLoading(true);
    try {
      const result = await previewSegment(segment.id, 50);
      setPreviewCount(result.count);
      setPreviewMembers(result.members);
    } catch (e) {
      toast.error(formatApiErrorMessage(e, t) || t("loyalty.toast.previewFailed"));
      setPreviewCount(0);
      setPreviewMembers([]);
    } finally {
      setPreviewLoading(false);
    }
  };

  const openNewCampaign = () => {
    setEditingCampaign(null);
    setCampaignForm({
      code: "",
      name: "",
      description: "",
      segmentId: segments[0]?.id ?? "",
      campaignType: "audience",
      scheduledAt: "",
      status: "draft",
    });
    setCampaignOpen(true);
  };

  const openEditCampaign = (c: LoyaltyCampaignRow) => {
    setEditingCampaign(c);
    setCampaignForm({
      code: c.code,
      name: c.name,
      description: c.description ?? "",
      segmentId: c.segmentId,
      campaignType: c.campaignType,
      scheduledAt: c.scheduledAt ? c.scheduledAt.slice(0, 16) : "",
      status: c.status,
    });
    setCampaignOpen(true);
  };

  const handleSaveCampaign = async () => {
    if (!activeOutletId || !campaignForm.code.trim() || !campaignForm.name.trim() || !campaignForm.segmentId) {
      return toast.error(t("loyalty.toast.codeNameSegmentRequired"));
    }
    setSaving(true);
    try {
      const scheduledAt = campaignForm.scheduledAt
        ? new Date(campaignForm.scheduledAt).toISOString()
        : null;
      if (editingCampaign) {
        await updateCampaign(
          editingCampaign.id,
          {
            code: campaignForm.code,
            name: campaignForm.name,
            description: campaignForm.description || null,
            segmentId: Number(campaignForm.segmentId),
            campaignType: campaignForm.campaignType,
            scheduledAt,
          },
          activeOutletId,
        );
        if (editingCampaign.status !== campaignForm.status) {
          await updateCampaignStatus(editingCampaign.id, campaignForm.status, activeOutletId);
        }
        toast.success(t("loyalty.toast.campaignUpdated"));
      } else {
        await createCampaign({
          outletId: activeOutletId,
          code: campaignForm.code,
          name: campaignForm.name,
          description: campaignForm.description || undefined,
          segmentId: Number(campaignForm.segmentId),
          campaignType: campaignForm.campaignType,
          scheduledAt,
        });
        toast.success(t("loyalty.toast.campaignCreated"));
      }
      setCampaignOpen(false);
    } catch (e) {
      toast.error(formatApiErrorMessage(e, t) || t("loyalty.toast.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const handleCampaignAudience = async (campaign: LoyaltyCampaignRow) => {
    setCampaignAudienceOpen(true);
    setCampaignAudienceLoading(true);
    setCampaignAudience(null);
    try {
      const data = await fetchCampaignAudience(campaign.id, 50);
      setCampaignAudience(data);
    } catch (e) {
      toast.error(formatApiErrorMessage(e, t) || t("loyalty.toast.audiencePreviewFailed"));
    } finally {
      setCampaignAudienceLoading(false);
    }
  };

  const handleCampaignSnapshot = async (campaign: LoyaltyCampaignRow) => {
    setCampaignSnapshotOpen(true);
    setCampaignSnapshotLoading(true);
    setCampaignSnapshot(null);
    try {
      const data = await fetchCampaignAudienceSnapshot(campaign.id, 50);
      setCampaignSnapshot(data);
    } catch (e) {
      toast.error(formatApiErrorMessage(e, t) || t("loyalty.toast.snapshotLoadFailed"));
    } finally {
      setCampaignSnapshotLoading(false);
    }
  };

  const handleActivateCampaign = async (campaign: LoyaltyCampaignRow) => {
    if (!activeOutletId) return;
    try {
      await activateCampaign(campaign.id, activeOutletId);
      toast.success(t("loyalty.toast.campaignActivated"));
    } catch (e) {
      toast.error(formatApiErrorMessage(e, t) || t("loyalty.toast.activationFailed"));
    }
  };

  const handleCompleteCampaign = async (campaign: LoyaltyCampaignRow) => {
    if (!activeOutletId) return;
    try {
      await completeCampaign(campaign.id, activeOutletId);
      toast.success(t("loyalty.toast.campaignCompleted"));
    } catch (e) {
      toast.error(formatApiErrorMessage(e, t) || t("loyalty.toast.completeFailed"));
    }
  };

  const handleCancelCampaign = async (campaign: LoyaltyCampaignRow) => {
    if (!activeOutletId) return;
    try {
      await cancelCampaign(campaign.id, activeOutletId);
      toast.success(t("loyalty.toast.campaignCancelled"));
    } catch (e) {
      toast.error(formatApiErrorMessage(e, t) || t("loyalty.toast.cancelFailed"));
    }
  };

  const handleSaveReward = async () => {
    if (!activeOutletId || !rewardForm.code.trim() || !rewardForm.name.trim()) {
      return toast.error(t("loyalty.toast.codeNameRequired"));
    }
    const pointsCost = Number(rewardForm.pointsCost);
    if (!Number.isFinite(pointsCost) || pointsCost < 1) {
      return toast.error(t("loyalty.toast.pointsCostMin"));
    }
    setSaving(true);
    try {
      const sortOrder = rewardForm.sortOrder.trim() ? Number(rewardForm.sortOrder) : undefined;
      if (editingReward) {
        await updateReward(editingReward.id, {
          code: rewardForm.code,
          name: rewardForm.name,
          description: rewardForm.description || null,
          pointsCost,
          sortOrder: sortOrder ?? null,
        });
        toast.success(t("loyalty.toast.rewardUpdated"));
      } else {
        await createReward({
          outletId: activeOutletId,
          code: rewardForm.code,
          name: rewardForm.name,
          description: rewardForm.description || undefined,
          pointsCost,
          sortOrder,
        });
        toast.success(t("loyalty.toast.rewardCreated"));
      }
      setRewardOpen(false);
    } catch (e) {
      toast.error(formatApiErrorMessage(e, t) || t("loyalty.toast.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const rewardColumns: Column<LoyaltyRewardRow>[] = [
    { key: "code", header: t("loyalty.columns.code"), sortable: true },
    { key: "name", header: t("loyalty.columns.name"), sortable: true },
    { key: "pointsCost", header: t("loyalty.columns.points"), render: (r) => r.pointsCost.toLocaleString() },
    {
      key: "isActive",
      header: t("loyalty.columns.status"),
      render: (r) => (
        <span className={r.isActive ? "text-emerald-600" : "text-muted-foreground"}>
          {r.isActive ? t("payroll.shared.active") : t("payroll.shared.inactive")}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (r) => (
        <div className="flex gap-1 justify-end">
          <Button size="icon" variant="ghost" onClick={() => openEditReward(r)} aria-label={t("loyalty.actions.edit")}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() =>
              void setRewardActive(r.id, !r.isActive, activeOutletId!)
                .then(() =>
                  toast.success(r.isActive ? t("loyalty.toast.deactivated") : t("loyalty.toast.activated")),
                )
                .catch((e) => toast.error(formatApiErrorMessage(e, t) || t("loyalty.toast.failed")))
            }
            aria-label={t("loyalty.actions.toggleActive")}
          >
            <Power className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const voucherColumns: Column<LoyaltyVoucherRow>[] = [
    { key: "code", header: t("loyalty.columns.code"), sortable: true },
    { key: "name", header: t("loyalty.columns.name"), sortable: true },
    {
      key: "voucherType",
      header: t("loyalty.columns.type"),
      render: (r) => t(`loyalty.enums.voucherTypes.${r.voucherType}`, { defaultValue: r.voucherType }),
    },
    {
      key: "value",
      header: t("loyalty.columns.value"),
      render: (r) =>
        r.valueType === "percentage"
          ? `${r.value}%`
          : r.valueType === "free_item"
            ? t("loyalty.columns.freeItem")
            : r.value.toLocaleString(),
    },
    {
      key: "isActive",
      header: t("loyalty.columns.status"),
      render: (r) => (
        <span className={r.isActive ? "text-emerald-600" : "text-muted-foreground"}>
          {r.isActive ? t("payroll.shared.active") : t("payroll.shared.inactive")}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (r) => (
        <div className="flex gap-1 justify-end">
          <Button size="icon" variant="ghost" onClick={() => openEditVoucher(r)} aria-label={t("loyalty.actions.edit")}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() =>
              void setVoucherActive(r.id, !r.isActive, activeOutletId!)
                .then(() =>
                  toast.success(r.isActive ? t("loyalty.toast.deactivated") : t("loyalty.toast.activated")),
                )
                .catch((e) => toast.error(formatApiErrorMessage(e, t) || t("loyalty.toast.failed")))
            }
            aria-label={t("loyalty.actions.toggleActive")}
          >
            <Power className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const segmentColumns: Column<MemberSegmentRow>[] = [
    { key: "code", header: t("loyalty.columns.code"), sortable: true },
    { key: "name", header: t("loyalty.columns.name"), sortable: true },
    { key: "segmentType", header: t("loyalty.columns.type"), render: (r) => segmentTypeLabel(r.segmentType, t) },
    {
      key: "isActive",
      header: t("loyalty.columns.status"),
      render: (r) => (
        <span className={r.isActive ? "text-emerald-600" : "text-muted-foreground"}>
          {r.isActive ? t("payroll.shared.active") : t("payroll.shared.inactive")}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (r) => (
        <div className="flex gap-1 justify-end">
          <Button size="icon" variant="ghost" onClick={() => void handlePreviewSegment(r)} aria-label={t("loyalty.actions.preview")}>
            <Users className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={() => openEditSegment(r)} aria-label={t("loyalty.actions.edit")}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() =>
              void setSegmentActive(r.id, !r.isActive, activeOutletId!)
                .then(() =>
                  toast.success(r.isActive ? t("loyalty.toast.deactivated") : t("loyalty.toast.activated")),
                )
                .catch((e) => toast.error(formatApiErrorMessage(e, t) || t("loyalty.toast.failed")))
            }
            aria-label={t("loyalty.actions.toggleActive")}
          >
            <Power className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const tierColumns: Column<LoyaltyTierRow>[] = [
    { key: "code", header: t("loyalty.columns.code"), sortable: true },
    { key: "name", header: t("loyalty.columns.name"), sortable: true },
    { key: "qualificationType", header: t("loyalty.columns.qualification"), render: (r) => tierTypeLabel(r.qualificationType, t) },
    { key: "sortOrder", header: t("loyalty.columns.order"), sortable: true },
    {
      key: "isActive",
      header: t("loyalty.columns.status"),
      render: (r) => (
        <span className={r.isActive ? "text-emerald-600" : "text-muted-foreground"}>
          {r.isActive ? t("payroll.shared.active") : t("payroll.shared.inactive")}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (r) => (
        <div className="flex gap-1 justify-end">
          <Button size="icon" variant="ghost" onClick={() => openEditTier(r)} aria-label={t("loyalty.actions.edit")}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() =>
              void setTierActive(r.id, !r.isActive, activeOutletId!)
                .then(() =>
                  toast.success(r.isActive ? t("loyalty.toast.deactivated") : t("loyalty.toast.activated")),
                )
                .catch((e) => toast.error(formatApiErrorMessage(e, t) || t("loyalty.toast.failed")))
            }
            aria-label={t("loyalty.actions.toggleActive")}
          >
            <Power className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const automationColumns: Column<LoyaltyAutomationRow>[] = [
    { key: "code", header: t("loyalty.columns.code"), sortable: true },
    { key: "name", header: t("loyalty.columns.name"), sortable: true },
    { key: "triggerType", header: t("loyalty.columns.trigger"), render: (r) => automationTriggerLabel(r.triggerType, t) },
    { key: "actionType", header: t("loyalty.columns.action"), render: (r) => automationActionLabel(r.actionType, t) },
    {
      key: "isActive",
      header: t("loyalty.columns.status"),
      render: (r) => (
        <span className={r.isActive ? "text-emerald-600" : "text-muted-foreground"}>
          {r.isActive ? t("payroll.shared.active") : t("payroll.shared.inactive")}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (r) => (
        <div className="flex gap-1 justify-end">
          <Button size="icon" variant="ghost" onClick={() => void handleViewAutomationLogs(r)} aria-label={t("loyalty.actions.logs")}>
            <ListTree className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={() => openEditAutomation(r)} aria-label={t("loyalty.actions.edit")}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() =>
              void setAutomationActive(r.id, !r.isActive, activeOutletId!)
                .then(() =>
                  toast.success(r.isActive ? t("loyalty.toast.deactivated") : t("loyalty.toast.activated")),
                )
                .catch((e) => toast.error(formatApiErrorMessage(e, t) || t("loyalty.toast.failed")))
            }
            aria-label={t("loyalty.actions.toggleActive")}
          >
            <Power className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const campaignColumns: Column<LoyaltyCampaignRow>[] = [
    { key: "name", header: t("loyalty.columns.campaign"), sortable: true },
    {
      key: "segment",
      header: t("loyalty.columns.segment"),
      render: (r) => r.segment?.name ?? segments.find((s) => s.id === r.segmentId)?.name ?? "—",
    },
    {
      key: "status",
      header: t("loyalty.columns.status"),
      render: (r) => (
        <span className="capitalize">
          {t(`loyalty.enums.campaignStatus.${r.status}`, { defaultValue: r.status })}
        </span>
      ),
    },
    {
      key: "audienceCount",
      header: t("loyalty.columns.audience"),
      render: (r) => (r.audienceCount ?? 0).toLocaleString(),
    },
    {
      key: "capturedCount",
      header: t("loyalty.columns.captured"),
      render: (r) => (r.capturedCount ?? 0).toLocaleString(),
    },
    {
      key: "issuedVoucherCount",
      header: t("loyalty.columns.issued"),
      render: (r) => (r.issuedVoucherCount ?? 0).toLocaleString(),
    },
    {
      key: "scheduledAt",
      header: t("loyalty.columns.scheduled"),
      render: (r) => (r.scheduledAt ? new Date(r.scheduledAt).toLocaleString() : "—"),
    },
    {
      key: "activatedAt",
      header: t("loyalty.columns.activated"),
      render: (r) => (r.activatedAt ? new Date(r.activatedAt).toLocaleString() : "—"),
    },
    {
      key: "actions",
      header: "",
      render: (r) => (
        <div className="flex gap-1 justify-end flex-wrap">
          <Button size="icon" variant="ghost" onClick={() => void handleCampaignAudience(r)} aria-label={t("loyalty.actions.liveAudience")}>
            <Users className="h-4 w-4" />
          </Button>
          {(r.status === "active" || r.status === "completed" || (r.capturedCount ?? 0) > 0) && (
            <Button size="icon" variant="ghost" onClick={() => void handleCampaignSnapshot(r)} aria-label={t("loyalty.actions.snapshot")}>
              <ListTree className="h-4 w-4" />
            </Button>
          )}
          {(r.status === "active" || r.status === "completed") && (r.capturedCount ?? 0) > 0 && (
            <Button size="sm" variant="outline" onClick={() => openIssueVoucher(r)}>
              {t("loyalty.actions.issueVoucher")}
            </Button>
          )}
          {(r.status === "draft" || r.status === "scheduled") && (
            <Button size="sm" variant="outline" onClick={() => void handleActivateCampaign(r)}>
              {t("loyalty.actions.activate")}
            </Button>
          )}
          {r.status === "active" && (
            <Button size="sm" variant="outline" onClick={() => void handleCompleteCampaign(r)}>
              {t("loyalty.actions.complete")}
            </Button>
          )}
          {(r.status === "draft" || r.status === "scheduled" || r.status === "active") && (
            <Button size="sm" variant="ghost" onClick={() => void handleCancelCampaign(r)}>
              {t("loyalty.actions.cancelCampaign")}
            </Button>
          )}
          <Button size="icon" variant="ghost" onClick={() => openEditCampaign(r)} aria-label={t("loyalty.actions.edit")}>
            <Pencil className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const handleSimulate = async () => {
    if (!activeOutletId || !simForm.programId) {
      return toast.error(t("loyalty.toast.selectOutletAndProgram"));
    }
    try {
      await runSimulation({
        outletId: activeOutletId,
        programId: Number(simForm.programId),
        spendingAmount: Number(simForm.spendingAmount) || 0,
        visitCount: Number(simForm.visitCount) || 0,
        simulationDate: simForm.simulationDate,
      });
    } catch (e) {
      toast.error(formatApiErrorMessage(e, t) || t("loyalty.toast.simulationFailed"));
    }
  };

  const programColumns: Column<LoyaltyProgramRow>[] = [
    { key: "code", header: t("loyalty.columns.code"), sortable: true },
    { key: "name", header: t("loyalty.columns.name"), sortable: true },
    { key: "type", header: t("loyalty.columns.type"), render: (r) => typeLabel(r.type, t) },
    {
      key: "effective",
      header: t("loyalty.columns.effective"),
      render: (r) =>
        [r.effectiveFrom, r.effectiveUntil].filter(Boolean).join(" → ") || t("loyalty.columns.always"),
    },
    {
      key: "isActive",
      header: t("loyalty.columns.status"),
      render: (r) => (
        <span className={r.isActive ? "text-emerald-600" : "text-muted-foreground"}>
          {r.isActive ? t("payroll.shared.active") : t("payroll.shared.inactive")}
        </span>
      ),
    },
    { key: "ruleSummary", header: t("loyalty.columns.earnRule"), render: (r) => r.ruleSummary ?? "—" },
    {
      key: "actions",
      header: "",
      render: (r) => (
        <div className="flex gap-1 justify-end">
          <Button size="icon" variant="ghost" onClick={() => openEditProgram(r)} aria-label={t("loyalty.actions.edit")}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() =>
              void setProgramActive(r.id, !r.isActive)
                .then(() =>
                  toast.success(r.isActive ? t("loyalty.toast.deactivated") : t("loyalty.toast.activated")),
                )
                .catch((e) => toast.error(formatApiErrorMessage(e, t) || t("loyalty.toast.failed")))
            }
            aria-label={t("loyalty.actions.toggleActive")}
          >
            <Power className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  if (!activeOutletId) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold">{t("loyalty.page.title")}</h1>
        <p className="text-sm text-muted-foreground mt-2">{t("loyalty.page.noOutlet")}</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Gift className="h-6 w-6" /> {t("loyalty.page.title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t("loyalty.page.subtitle")}
          </p>
        </div>
        {tab === "programs" && (
          <Button onClick={openNewProgram}>
            <Plus className="h-4 w-4 mr-1" /> {t("loyalty.actions.newProgram")}
          </Button>
        )}
        {tab === "rewards" && (
          <Button onClick={openNewReward}>
            <Plus className="h-4 w-4 mr-1" /> {t("loyalty.actions.newReward")}
          </Button>
        )}
        {tab === "vouchers" && (
          <Button onClick={openNewVoucher}>
            <Plus className="h-4 w-4 mr-1" /> {t("loyalty.actions.newVoucher")}
          </Button>
        )}
        {tab === "segments" && (
          <Button onClick={openNewSegment}>
            <Plus className="h-4 w-4 mr-1" /> {t("loyalty.actions.newSegment")}
          </Button>
        )}
        {tab === "tiers" && (
          <Button onClick={openNewTier}>
            <Plus className="h-4 w-4 mr-1" /> {t("loyalty.actions.newTier")}
          </Button>
        )}
        {tab === "campaigns" && (
          <Button onClick={openNewCampaign}>
            <Plus className="h-4 w-4 mr-1" /> {t("loyalty.actions.newCampaign")}
          </Button>
        )}
        {tab === "automations" && (
          <Button onClick={openNewAutomation}>
            <Plus className="h-4 w-4 mr-1" /> {t("loyalty.actions.newAutomation")}
          </Button>
        )}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="programs">{t("loyalty.tabs.programs")}</TabsTrigger>
          <TabsTrigger value="simulator">{t("loyalty.tabs.simulator")}</TabsTrigger>
          <TabsTrigger value="rewards">{t("loyalty.tabs.rewards")}</TabsTrigger>
          <TabsTrigger value="vouchers">{t("loyalty.tabs.vouchers")}</TabsTrigger>
          <TabsTrigger value="promotions">{t("loyalty.tabs.promotions")}</TabsTrigger>
          <TabsTrigger value="segments">{t("loyalty.tabs.segments")}</TabsTrigger>
          <TabsTrigger value="tiers">{t("loyalty.tabs.tiers")}</TabsTrigger>
          <TabsTrigger value="campaigns">{t("loyalty.tabs.campaigns")}</TabsTrigger>
          <TabsTrigger value="automations">{t("loyalty.tabs.automations")}</TabsTrigger>
          <TabsTrigger value="analytics">{t("loyalty.tabs.analytics")}</TabsTrigger>
        </TabsList>

        <TabsContent value="programs" className="mt-4">
          <DataTable
            columns={programColumns}
            data={outletPrograms}
            rowKey={(r) => r.id}
            loading={loadingPrograms}
            emptyMessage={t("loyalty.page.empty.programs")}
          />
        </TabsContent>

        <TabsContent value="rewards" className="mt-4">
          <DataTable
            columns={rewardColumns}
            data={rewards}
            rowKey={(r) => r.id}
            loading={loadingRewards}
            emptyMessage={t("loyalty.page.empty.rewards")}
          />
        </TabsContent>

        <TabsContent value="vouchers" className="mt-4">
          <DataTable
            columns={voucherColumns}
            data={vouchers}
            rowKey={(r) => r.id}
            loading={loadingVouchers}
            emptyMessage={t("loyalty.page.empty.vouchers")}
          />
        </TabsContent>

        <TabsContent value="promotions" className="mt-4">
          <PromotionsTab outletId={activeOutletId} />
        </TabsContent>

        <TabsContent value="segments" className="mt-4">
          <DataTable
            columns={segmentColumns}
            data={segments}
            rowKey={(r) => r.id}
            loading={loadingSegments}
            emptyMessage={t("loyalty.page.empty.segments")}
          />
        </TabsContent>

        <TabsContent value="tiers" className="mt-4">
          <DataTable
            columns={tierColumns}
            data={tiers}
            rowKey={(r) => r.id}
            loading={loadingTiers}
            emptyMessage={t("loyalty.page.empty.tiers")}
          />
        </TabsContent>

        <TabsContent value="campaigns" className="mt-4">
          <DataTable
            columns={campaignColumns}
            data={campaigns}
            rowKey={(r) => r.id}
            loading={loadingCampaigns}
            emptyMessage={t("loyalty.page.empty.campaigns")}
          />
        </TabsContent>

        <TabsContent value="automations" className="mt-4">
          <DataTable
            columns={automationColumns}
            data={automations}
            rowKey={(r) => r.id}
            loading={loadingAutomations}
            emptyMessage={t("loyalty.page.empty.automations")}
          />
        </TabsContent>

        <TabsContent value="simulator" className="mt-4 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4 max-w-xl">
            <div className="space-y-1">
              <Label>{t("loyalty.form.program")}</Label>
              <Select
                value={simForm.programId}
                onValueChange={(v) => setSimForm((f) => ({ ...f, programId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("loyalty.form.selectProgram")} />
                </SelectTrigger>
                <SelectContent>
                  {outletPrograms.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>{t("loyalty.form.simulationDate")}</Label>
              <Input
                type="date"
                value={simForm.simulationDate}
                onChange={(e) => setSimForm((f) => ({ ...f, simulationDate: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>{t("loyalty.form.spendingAmount")}</Label>
              <Input
                type="number"
                min={0}
                value={simForm.spendingAmount}
                onChange={(e) => setSimForm((f) => ({ ...f, spendingAmount: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>{t("loyalty.form.visitCount")}</Label>
              <Input
                type="number"
                min={0}
                value={simForm.visitCount}
                onChange={(e) => setSimForm((f) => ({ ...f, visitCount: e.target.value }))}
              />
            </div>
          </div>
          <Button onClick={() => void handleSimulate()} disabled={simulating}>
            <Calculator className="h-4 w-4 mr-1" />
            {simulating ? t("loyalty.actions.simulating") : t("loyalty.actions.runSimulation")}
          </Button>
          {lastSimulation && (
            <div className="rounded-lg border p-4 space-y-2 bg-card">
              <p className="font-semibold">
                {t("loyalty.form.expectedPoints")}: <span className="text-primary">{lastSimulation.expectedPoints}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                {lastSimulation.programName} · {t("loyalty.form.effectiveLabel")}: {lastSimulation.isEffective ? t("payroll.shared.yes") : t("payroll.shared.no")} · {t("loyalty.form.activeLabel")}:{" "}
                {lastSimulation.isActive ? t("payroll.shared.yes") : t("payroll.shared.no")}
              </p>
              {lastSimulation.triggeredRules.length > 0 && (
                <div>
                  <p className="text-sm font-medium flex items-center gap-1">
                    <ListTree className="h-4 w-4" /> {t("loyalty.form.triggeredRules")}
                  </p>
                  <pre className="text-xs bg-muted p-2 rounded overflow-auto">
                    {JSON.stringify(lastSimulation.triggeredRules, null, 2)}
                  </pre>
                </div>
              )}
              <div>
                <p className="text-sm font-medium">{t("loyalty.form.breakdown")}</p>
                <pre className="text-xs bg-muted p-2 rounded overflow-auto">
                  {JSON.stringify(lastSimulation.breakdown, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="mt-4">
          {activeOutletId ? (
            <LoyaltyAnalyticsDashboard outletId={activeOutletId} />
          ) : (
            <p className="text-sm text-muted-foreground">{t("loyalty.page.analyticsNoOutlet")}</p>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={programOpen} onOpenChange={setProgramOpen}>
        <DialogContent className={`${dialogSize.xl} ${dialogScroll}`}>
          <DialogHeader>
            <DialogTitle>
              {editingProgram ? t("loyalty.dialogs.editProgram") : t("loyalty.dialogs.newProgram")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {!editingProgram && (
              <>
                <div className="space-y-1">
                  <Label>{t("loyalty.form.code")}</Label>
                  <Input value={programForm.code} onChange={(e) => setProgramForm((f) => ({ ...f, code: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>{t("loyalty.form.type")}</Label>
                  <Select
                    value={programForm.type}
                    onValueChange={(v) =>
                      setProgramForm((f) => ({
                        ...f,
                        type: v as LoyaltyProgramType,
                        ruleConfig: defaultRuleConfig(v),
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROGRAM_TYPES.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {t(opt.labelKey)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            <div className="space-y-1">
              <Label>{t("loyalty.form.name")}</Label>
              <Input value={programForm.name} onChange={(e) => setProgramForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>{t("loyalty.form.description")}</Label>
              <Textarea
                value={programForm.description}
                onChange={(e) => setProgramForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="rounded-xl border border-border/50 p-3 space-y-2">
              <p className="text-sm font-medium">
                {t("loyalty.form.earnRule")} {editingProgram ? `(${typeLabel(programForm.type, t)})` : ""}
              </p>
              <ProgramRuleFields
                type={programForm.type}
                ruleConfig={programForm.ruleConfig}
                onChange={(ruleConfig) => setProgramForm((f) => ({ ...f, ruleConfig }))}
                t={t}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>{t("loyalty.form.effectiveFrom")}</Label>
                <Input
                  type="date"
                  value={programForm.effectiveFrom}
                  onChange={(e) => setProgramForm((f) => ({ ...f, effectiveFrom: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>{t("loyalty.form.effectiveUntil")}</Label>
                <Input
                  type="date"
                  value={programForm.effectiveUntil}
                  onChange={(e) => setProgramForm((f) => ({ ...f, effectiveUntil: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <Checkbox
                id="expiry-enabled"
                checked={programForm.expiryEnabled}
                onCheckedChange={(checked) =>
                  setProgramForm((f) => ({ ...f, expiryEnabled: checked === true }))
                }
              />
              <Label htmlFor="expiry-enabled" className="font-normal cursor-pointer">
                {t("loyalty.form.enableExpiry")}
              </Label>
            </div>
            {programForm.expiryEnabled && (
              <div className="space-y-1">
                <Label>{t("loyalty.form.expiryDays")}</Label>
                <Input
                  type="number"
                  min={1}
                  value={programForm.expiryDays}
                  onChange={(e) => setProgramForm((f) => ({ ...f, expiryDays: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  {t("loyalty.form.expiryHint")}
                </p>
              </div>
            )}
            <div className="space-y-1">
              <Label>{t("loyalty.form.status")}</Label>
              <Select
                value={programForm.isActive ? "active" : "inactive"}
                onValueChange={(v) => setProgramForm((f) => ({ ...f, isActive: v === "active" }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{t("payroll.shared.active")}</SelectItem>
                  <SelectItem value="inactive">{t("payroll.shared.inactive")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProgramOpen(false)}>
              {t("loyalty.actions.cancel")}
            </Button>
            <Button onClick={() => void handleSaveProgram()} disabled={saving}>
              {t("loyalty.actions.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rewardOpen} onOpenChange={setRewardOpen}>
        <DialogContent className={`${dialogSize.lg} ${dialogScroll}`}>
          <DialogHeader>
            <DialogTitle>
              {editingReward ? t("loyalty.dialogs.editReward") : t("loyalty.dialogs.newReward")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>{t("loyalty.form.code")}</Label>
              <Input
                value={rewardForm.code}
                onChange={(e) => setRewardForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
              />
            </div>
            <div className="space-y-1">
              <Label>{t("loyalty.form.name")}</Label>
              <Input value={rewardForm.name} onChange={(e) => setRewardForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>{t("loyalty.form.description")}</Label>
              <Textarea
                value={rewardForm.description}
                onChange={(e) => setRewardForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>{t("loyalty.form.pointsCost")}</Label>
                <Input
                  type="number"
                  min={1}
                  value={rewardForm.pointsCost}
                  onChange={(e) => setRewardForm((f) => ({ ...f, pointsCost: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>{t("loyalty.form.sortOrder")}</Label>
                <Input
                  type="number"
                  min={0}
                  value={rewardForm.sortOrder}
                  onChange={(e) => setRewardForm((f) => ({ ...f, sortOrder: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRewardOpen(false)}>
              {t("loyalty.actions.cancel")}
            </Button>
            <Button onClick={() => void handleSaveReward()} disabled={saving}>
              {t("loyalty.actions.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={segmentOpen} onOpenChange={setSegmentOpen}>
        <DialogContent className={`${dialogSize.xl} ${dialogScroll}`}>
          <DialogHeader>
            <DialogTitle>
              {editingSegment ? t("loyalty.dialogs.editSegment") : t("loyalty.dialogs.newSegment")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>{t("loyalty.form.code")}</Label>
              <Input
                value={segmentForm.code}
                onChange={(e) => setSegmentForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
              />
            </div>
            <div className="space-y-1">
              <Label>{t("loyalty.form.name")}</Label>
              <Input value={segmentForm.name} onChange={(e) => setSegmentForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>{t("loyalty.form.description")}</Label>
              <Textarea
                value={segmentForm.description}
                onChange={(e) => setSegmentForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>{t("loyalty.form.segmentType")}</Label>
              <Select
                value={segmentForm.segmentType}
                onValueChange={(v) => {
                  const type = v as MemberSegmentType;
                  setSegmentForm((f) => ({
                    ...f,
                    segmentType: type,
                    configJson: JSON.stringify(defaultSegmentConfig(type), null, 2),
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEGMENT_TYPES.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {t(opt.labelKey)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>{t("loyalty.form.configJson")}</Label>
              <Textarea
                className="font-mono text-sm min-h-[120px]"
                value={segmentForm.configJson}
                onChange={(e) => setSegmentForm((f) => ({ ...f, configJson: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>{t("loyalty.form.status")}</Label>
              <Select
                value={segmentForm.isActive ? "active" : "inactive"}
                onValueChange={(v) => setSegmentForm((f) => ({ ...f, isActive: v === "active" }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{t("payroll.shared.active")}</SelectItem>
                  <SelectItem value="inactive">{t("payroll.shared.inactive")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSegmentOpen(false)}>
              {t("loyalty.actions.cancel")}
            </Button>
            <Button onClick={() => void handleSaveSegment()} disabled={saving}>
              {t("loyalty.actions.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={tierOpen} onOpenChange={setTierOpen}>
        <DialogContent className={`${dialogSize.xl} ${dialogScroll}`}>
          <DialogHeader>
            <DialogTitle>
              {editingTier ? t("loyalty.dialogs.editTier") : t("loyalty.dialogs.newTier")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>{t("loyalty.form.code")}</Label>
              <Input
                value={tierForm.code}
                onChange={(e) => setTierForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
              />
            </div>
            <div className="space-y-1">
              <Label>{t("loyalty.form.name")}</Label>
              <Input value={tierForm.name} onChange={(e) => setTierForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>{t("loyalty.form.description")}</Label>
              <Textarea
                value={tierForm.description}
                onChange={(e) => setTierForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>{t("loyalty.form.qualificationType")}</Label>
              <Select
                value={tierForm.qualificationType}
                onValueChange={(v) => {
                  const type = v as LoyaltyTierQualificationType;
                  setTierForm((f) => ({
                    ...f,
                    qualificationType: type,
                    configJson: JSON.stringify(defaultTierConfig(type), null, 2),
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIER_TYPES.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {t(opt.labelKey)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>{t("loyalty.form.qualificationConfigJson")}</Label>
              <Textarea
                className="font-mono text-sm min-h-[120px]"
                value={tierForm.configJson}
                onChange={(e) => setTierForm((f) => ({ ...f, configJson: e.target.value }))}
              />
            </div>
            <div className="space-y-2 rounded-lg border p-3">
              <p className="text-sm font-medium">{t("loyalty.form.benefits")}</p>
              <p className="text-xs text-muted-foreground">{t("loyalty.form.benefitsHint")}</p>
              <div className="space-y-2">
                {TIER_BENEFIT_OPTIONS.map((option) => (
                  <label key={option.key} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={tierForm.benefits[option.key]}
                      onCheckedChange={(checked) =>
                        setTierForm((f) => ({
                          ...f,
                          benefits: { ...f.benefits, [option.key]: checked === true },
                        }))
                      }
                    />
                    {t(option.labelKey)}
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <Label>{t("loyalty.form.sortOrder")}</Label>
              <Input
                type="number"
                min={0}
                value={tierForm.sortOrder}
                onChange={(e) => setTierForm((f) => ({ ...f, sortOrder: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>{t("loyalty.form.status")}</Label>
              <Select
                value={tierForm.isActive ? "active" : "inactive"}
                onValueChange={(v) => setTierForm((f) => ({ ...f, isActive: v === "active" }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{t("payroll.shared.active")}</SelectItem>
                  <SelectItem value="inactive">{t("payroll.shared.inactive")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTierOpen(false)}>
              {t("loyalty.actions.cancel")}
            </Button>
            <Button onClick={() => void handleSaveTier()} disabled={saving}>
              {t("loyalty.actions.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={automationOpen} onOpenChange={setAutomationOpen}>
        <DialogContent className={`${dialogSize.xl} ${dialogScroll}`}>
          <DialogHeader>
            <DialogTitle>
              {editingAutomation ? t("loyalty.dialogs.editAutomation") : t("loyalty.dialogs.newAutomation")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>{t("loyalty.form.code")}</Label>
              <Input
                value={automationForm.code}
                onChange={(e) => setAutomationForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
              />
            </div>
            <div className="space-y-1">
              <Label>{t("loyalty.form.name")}</Label>
              <Input
                value={automationForm.name}
                onChange={(e) => setAutomationForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>{t("loyalty.form.description")}</Label>
              <Textarea
                value={automationForm.description}
                onChange={(e) => setAutomationForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>{t("loyalty.form.trigger")}</Label>
              <Select
                value={automationForm.triggerType}
                onValueChange={(v) => {
                  const triggerType = v as LoyaltyAutomationTriggerType;
                  const preset = defaultAutomationPreset(triggerType);
                  setAutomationForm((f) => ({
                    ...f,
                    triggerType,
                    code: f.code || preset.code,
                    name: f.name || (preset.nameKey ? t(preset.nameKey) : f.name),
                    ...Object.fromEntries(
                      Object.entries(defaultAutomationCondition(triggerType)).map(([key, value]) => {
                        if (key === "daysBefore") return ["daysBefore", String(value)];
                        if (key === "visitCount") return ["visitCount", String(value)];
                        if (key === "points") return ["points", String(value)];
                        if (key === "daysInactive") return ["daysInactive", String(value)];
                        return [key, String(value)];
                      }),
                    ),
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AUTOMATION_TRIGGERS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {t(opt.labelKey)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {automationForm.triggerType === "member_birthday" && (
              <div className="space-y-1">
                <Label>{t("loyalty.form.daysBeforeBirthday")}</Label>
                <Input
                  type="number"
                  min={0}
                  value={automationForm.daysBefore}
                  onChange={(e) => setAutomationForm((f) => ({ ...f, daysBefore: e.target.value }))}
                />
              </div>
            )}
            {automationForm.triggerType === "visit_milestone" && (
              <div className="space-y-1">
                <Label>{t("loyalty.form.visitCount")}</Label>
                <Input
                  type="number"
                  min={1}
                  value={automationForm.visitCount}
                  onChange={(e) => setAutomationForm((f) => ({ ...f, visitCount: e.target.value }))}
                />
              </div>
            )}
            {automationForm.triggerType === "points_milestone" && (
              <div className="space-y-1">
                <Label>{t("loyalty.form.pointsThreshold")}</Label>
                <Input
                  type="number"
                  min={1}
                  value={automationForm.points}
                  onChange={(e) => setAutomationForm((f) => ({ ...f, points: e.target.value }))}
                />
              </div>
            )}
            {automationForm.triggerType === "inactive_member" && (
              <div className="space-y-1">
                <Label>{t("loyalty.form.daysInactive")}</Label>
                <Input
                  type="number"
                  min={1}
                  value={automationForm.daysInactive}
                  onChange={(e) => setAutomationForm((f) => ({ ...f, daysInactive: e.target.value }))}
                />
              </div>
            )}
            <div className="space-y-1">
              <Label>{t("loyalty.form.action")}</Label>
              <Select
                value={automationForm.actionType}
                onValueChange={(v) => {
                  const actionType = v as LoyaltyAutomationActionType;
                  const defaults = defaultAutomationActionConfig(actionType, t);
                  setAutomationForm((f) => ({
                    ...f,
                    actionType,
                    notificationTitle: String(defaults.title ?? f.notificationTitle),
                    notificationContent: String(defaults.content ?? f.notificationContent),
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AUTOMATION_ACTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {t(opt.labelKey)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {automationForm.actionType === "issue_voucher" && (
              <div className="space-y-1">
                <Label>{t("loyalty.form.voucher")}</Label>
                <Select
                  value={automationForm.voucherId}
                  onValueChange={(v) => setAutomationForm((f) => ({ ...f, voucherId: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("loyalty.form.selectVoucher")} />
                  </SelectTrigger>
                  <SelectContent>
                    {vouchers.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.name} ({v.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {automationForm.actionType === "assign_campaign" && (
              <div className="space-y-1">
                <Label>{t("loyalty.form.campaign")}</Label>
                <Select
                  value={automationForm.campaignId}
                  onValueChange={(v) => setAutomationForm((f) => ({ ...f, campaignId: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("loyalty.form.selectCampaign")} />
                  </SelectTrigger>
                  <SelectContent>
                    {campaigns.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} ({c.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {automationForm.actionType === "send_notification" && (
              <>
                <div className="space-y-1">
                  <Label>{t("loyalty.form.notificationTitle")}</Label>
                  <Input
                    value={automationForm.notificationTitle}
                    onChange={(e) => setAutomationForm((f) => ({ ...f, notificationTitle: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label>{t("loyalty.form.notificationContent")}</Label>
                  <Textarea
                    value={automationForm.notificationContent}
                    onChange={(e) => setAutomationForm((f) => ({ ...f, notificationContent: e.target.value }))}
                  />
                </div>
              </>
            )}
            <div className="space-y-1">
              <Label>{t("loyalty.form.status")}</Label>
              <Select
                value={automationForm.isActive ? "active" : "inactive"}
                onValueChange={(v) => setAutomationForm((f) => ({ ...f, isActive: v === "active" }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{t("payroll.shared.active")}</SelectItem>
                  <SelectItem value="inactive">{t("payroll.shared.inactive")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAutomationOpen(false)}>
              {t("loyalty.actions.cancel")}
            </Button>
            <Button onClick={() => void handleSaveAutomation()} disabled={saving}>
              {t("loyalty.actions.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={automationLogsOpen} onOpenChange={setAutomationLogsOpen}>
        <DialogContent className={`${dialogSize.xl} ${dialogScroll}`}>
          <DialogHeader>
            <DialogTitle>{t("loyalty.dialogs.executionLogs", { name: automationLogsTitle })}</DialogTitle>
          </DialogHeader>
          {automationLogsLoading && <p className="text-sm text-muted-foreground">{t("loyalty.form.loading")}</p>}
          {!automationLogsLoading && automationLogs.length === 0 && (
            <p className="text-sm text-muted-foreground">{t("loyalty.form.noExecutionLogs")}</p>
          )}
          {!automationLogsLoading && automationLogs.length > 0 && (
            <div className="space-y-2">
              {automationLogs.map((log) => (
                <div key={log.id} className="rounded-lg border p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium capitalize">
                      {t(`loyalty.enums.campaignStatus.${log.status}`, { defaultValue: log.status })}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(log.executedAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("loyalty.form.memberRef", { id: log.memberId })} · {automationTriggerLabel(log.triggerType, t)} →{" "}
                    {automationActionLabel(log.actionType, t)}
                  </p>
                  {Object.keys(log.result ?? {}).length > 0 && (
                    <pre className="text-xs bg-muted p-2 rounded mt-2 overflow-auto">
                      {JSON.stringify(log.result, null, 2)}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className={`${dialogSize.lg} ${dialogScroll}`}>
          <DialogHeader>
            <DialogTitle>
              {t("loyalty.dialogs.previewSegment", {
                name: previewSegmentRow?.name ?? t("loyalty.form.segmentFallback"),
              })}
            </DialogTitle>
          </DialogHeader>
          {previewLoading ? (
            <p className="text-sm text-muted-foreground">{t("loyalty.form.loadingPreview")}</p>
          ) : (
            <div className="space-y-3">
              <p className="text-sm">
                <span className="text-muted-foreground">{t("loyalty.form.matchingMembers")}: </span>
                <span className="font-semibold">{previewCount.toLocaleString()}</span>
              </p>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {previewMembers.length === 0 ? (
                  <p className="text-xs text-muted-foreground">{t("loyalty.form.noMatchingMembers")}</p>
                ) : (
                  previewMembers.map((m) => (
                    <div key={m.id} className="flex justify-between text-sm border rounded-lg px-3 py-2">
                      <div>
                        <p className="font-medium">{m.fullName}</p>
                        <p className="text-xs text-muted-foreground">{m.phone}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">{m.memberNo ?? m.id}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              {t("loyalty.actions.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={campaignOpen} onOpenChange={setCampaignOpen}>
        <DialogContent className={`${dialogSize.lg} ${dialogScroll}`}>
          <DialogHeader>
            <DialogTitle>
              {editingCampaign ? t("loyalty.dialogs.editCampaign") : t("loyalty.dialogs.newCampaign")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>{t("loyalty.form.code")}</Label>
              <Input
                value={campaignForm.code}
                onChange={(e) => setCampaignForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
              />
            </div>
            <div className="space-y-1">
              <Label>{t("loyalty.form.name")}</Label>
              <Input value={campaignForm.name} onChange={(e) => setCampaignForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>{t("loyalty.form.description")}</Label>
              <Textarea
                value={campaignForm.description}
                onChange={(e) => setCampaignForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>{t("loyalty.form.segment")}</Label>
              <Select
                value={campaignForm.segmentId}
                onValueChange={(v) => setCampaignForm((f) => ({ ...f, segmentId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("loyalty.form.selectSegment")} />
                </SelectTrigger>
                <SelectContent>
                  {segments.filter((s) => s.isActive).map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>{t("loyalty.form.scheduledAt")}</Label>
              <Input
                type="datetime-local"
                value={campaignForm.scheduledAt}
                onChange={(e) => setCampaignForm((f) => ({ ...f, scheduledAt: e.target.value }))}
              />
            </div>
            {editingCampaign && (editingCampaign.status === "draft" || editingCampaign.status === "scheduled") && (
              <div className="space-y-1">
                <Label>{t("loyalty.form.status")}</Label>
                <Select
                  value={campaignForm.status}
                  onValueChange={(v) => setCampaignForm((f) => ({ ...f, status: v as LoyaltyCampaignStatus }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">{t("loyalty.enums.campaignStatus.draft")}</SelectItem>
                    <SelectItem value="scheduled">{t("loyalty.enums.campaignStatus.scheduled")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCampaignOpen(false)}>
              {t("loyalty.actions.cancel")}
            </Button>
            <Button onClick={() => void handleSaveCampaign()} disabled={saving}>
              {t("loyalty.actions.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={campaignSnapshotOpen} onOpenChange={setCampaignSnapshotOpen}>
        <DialogContent className={`${dialogSize.lg} ${dialogScroll}`}>
          <DialogHeader>
            <DialogTitle>
              {t("loyalty.dialogs.capturedAudience", {
                name: campaignSnapshot?.campaign.name ?? t("loyalty.form.campaignFallback"),
              })}
            </DialogTitle>
          </DialogHeader>
          {campaignSnapshotLoading ? (
            <p className="text-sm text-muted-foreground">{t("loyalty.form.loadingSnapshot")}</p>
          ) : campaignSnapshot ? (
            <div className="space-y-3">
              <p className="text-sm">
                <span className="text-muted-foreground">{t("loyalty.form.capturedAtActivation")}: </span>
                <span className="font-semibold">{campaignSnapshot.capturedCount.toLocaleString()}</span>
              </p>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {campaignSnapshot.members.length === 0 ? (
                  <p className="text-xs text-muted-foreground">{t("loyalty.form.noCapturedMembers")}</p>
                ) : (
                  campaignSnapshot.members.map((m) => (
                    <div key={m.id} className="flex justify-between text-sm border rounded-lg px-3 py-2">
                      <div>
                        <p className="font-medium">{m.fullName}</p>
                        <p className="text-xs text-muted-foreground">{m.phone}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">{m.memberNo ?? m.id}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCampaignSnapshotOpen(false)}>
              {t("loyalty.actions.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={campaignAudienceOpen} onOpenChange={setCampaignAudienceOpen}>
        <DialogContent className={`${dialogSize.lg} ${dialogScroll}`}>
          <DialogHeader>
            <DialogTitle>
              {t("loyalty.dialogs.liveAudience", {
                name: campaignAudience?.campaign.name ?? t("loyalty.form.campaignFallback"),
              })}
            </DialogTitle>
          </DialogHeader>
          {campaignAudienceLoading ? (
            <p className="text-sm text-muted-foreground">{t("loyalty.form.loadingAudience")}</p>
          ) : campaignAudience ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {t("loyalty.form.segmentCurrentRules", { name: campaignAudience.segment.name })}
              </p>
              <p className="text-sm">
                <span className="text-muted-foreground">{t("loyalty.form.liveAudienceSize")}: </span>
                <span className="font-semibold">{campaignAudience.memberCount.toLocaleString()}</span>
              </p>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {campaignAudience.members.length === 0 ? (
                  <p className="text-xs text-muted-foreground">{t("loyalty.form.noAudienceMembers")}</p>
                ) : (
                  campaignAudience.members.map((m) => (
                    <div key={m.id} className="flex justify-between text-sm border rounded-lg px-3 py-2">
                      <div>
                        <p className="font-medium">{m.fullName}</p>
                        <p className="text-xs text-muted-foreground">{m.phone}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">{m.memberNo ?? m.id}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCampaignAudienceOpen(false)}>
              {t("loyalty.actions.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={voucherOpen} onOpenChange={setVoucherOpen}>
        <DialogContent className={`${dialogSize.lg} ${dialogScroll}`}>
          <DialogHeader>
            <DialogTitle>
              {editingVoucher ? t("loyalty.dialogs.editVoucher") : t("loyalty.dialogs.newVoucher")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>{t("loyalty.form.code")}</Label>
              <Input
                value={voucherForm.code}
                onChange={(e) => setVoucherForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
              />
            </div>
            <div className="space-y-1">
              <Label>{t("loyalty.form.name")}</Label>
              <Input value={voucherForm.name} onChange={(e) => setVoucherForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>{t("loyalty.form.description")}</Label>
              <Textarea
                value={voucherForm.description}
                onChange={(e) => setVoucherForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>{t("loyalty.form.type")}</Label>
                <Select
                  value={voucherForm.voucherType}
                  onValueChange={(v) => setVoucherForm((f) => ({ ...f, voucherType: v as LoyaltyVoucherType }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">{t("loyalty.enums.voucherTypes.manual")}</SelectItem>
                    <SelectItem value="campaign">{t("loyalty.enums.voucherTypes.campaign")}</SelectItem>
                    <SelectItem value="reward">{t("loyalty.enums.voucherTypes.reward")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>{t("loyalty.form.valueType")}</Label>
                <Select
                  value={voucherForm.valueType}
                  onValueChange={(v) => setVoucherForm((f) => ({ ...f, valueType: v as LoyaltyVoucherValueType }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">{t("loyalty.enums.voucherValueTypes.percentage")}</SelectItem>
                    <SelectItem value="fixed_amount">{t("loyalty.enums.voucherValueTypes.fixed_amount")}</SelectItem>
                    <SelectItem value="free_item">{t("loyalty.enums.voucherValueTypes.free_item")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>{t("loyalty.form.value")}</Label>
                <Input
                  type="number"
                  value={voucherForm.value}
                  onChange={(e) => setVoucherForm((f) => ({ ...f, value: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>{t("loyalty.form.minimumSpendShort")}</Label>
                <Input
                  type="number"
                  value={voucherForm.minimumSpend}
                  onChange={(e) => setVoucherForm((f) => ({ ...f, minimumSpend: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVoucherOpen(false)}>{t("loyalty.actions.cancel")}</Button>
            <Button onClick={() => void handleSaveVoucher()} disabled={saving}>{t("loyalty.actions.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={issueVoucherOpen} onOpenChange={setIssueVoucherOpen}>
        <DialogContent className={`${dialogSize.lg} ${dialogScroll}`}>
          <DialogHeader>
            <DialogTitle>{t("loyalty.dialogs.issueVoucher")}</DialogTitle>
          </DialogHeader>
          {issueVoucherCampaign && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {t("loyalty.form.campaignSummary", {
                  name: issueVoucherCampaign.name,
                  captured: (issueVoucherCampaign.capturedCount ?? 0).toLocaleString(),
                  issued: (issueVoucherCampaign.issuedVoucherCount ?? 0).toLocaleString(),
                })}
              </p>
              <div className="space-y-1">
                <Label>{t("loyalty.form.voucher")}</Label>
                <Select value={issueVoucherId} onValueChange={setIssueVoucherId}>
                  <SelectTrigger><SelectValue placeholder={t("loyalty.form.selectVoucher")} /></SelectTrigger>
                  <SelectContent>
                    {vouchers.filter((v) => v.isActive).map((v) => (
                      <SelectItem key={v.id} value={v.id}>{v.name} ({v.code})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIssueVoucherOpen(false)}>{t("loyalty.actions.cancel")}</Button>
            <Button onClick={() => void handleIssueVoucher()} disabled={saving}>{t("loyalty.actions.issue")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
