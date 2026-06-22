import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useOrdersExplorerStore } from "@/stores/ordersExplorerStore";
import type { OrderApi } from "@/lib/api-integration/endpoints";
import { RECOVERY_RESOLUTION_OPTIONS } from "./recoveryShared";

type Props = {
  orderId: string;
  line: OrderApi["items"][number];
  onComplete: () => void;
};

export function RecoveryDecisionStep({ orderId, line, onComplete }: Props) {
  const { t } = useTranslation("ops");
  const approveItemRecovery = useOrdersExplorerStore((s) => s.approveItemRecovery);
  const recoveryApprovalSubmitting = useOrdersExplorerStore((s) => s.recoveryApprovalSubmitting);
  const [resolution, setResolution] = useState("recovery_approved");
  const [notes, setNotes] = useState("");
  const [replacedBy, setReplacedBy] = useState("");

  const submit = async () => {
    try {
      const trimmedReplace = replacedBy.trim();
      const payload =
        resolution === "replaced" && trimmedReplace !== "" && Number.isFinite(Number(trimmedReplace))
          ? { replacedByOrderItemId: Number(trimmedReplace) }
          : null;
      await approveItemRecovery(orderId, line.orderItemId ?? line.id, {
        resolution,
        notes: notes.trim() || null,
        payload,
      });
      toast.success(t("managerRecovery.wizard.decide.success", "Recovery resolution recorded"));
      onComplete();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("managerRecovery.wizard.decide.failed", "Approval failed"));
    }
  };

  return (
    <div className="space-y-3" data-testid="recovery-wizard-decide">
      <p className="text-xs font-semibold text-foreground">{t("managerRecovery.wizard.decide.title", "Manager decision")}</p>
      <label className="block text-[10px] text-muted-foreground">
        {t("managerRecovery.wizard.decide.resolution", "Resolution")}
        <select
          className="mt-0.5 w-full rounded-md border border-border/60 bg-background px-2 py-1.5 text-[11px] text-foreground"
          value={resolution}
          disabled={recoveryApprovalSubmitting}
          onChange={(e) => setResolution(e.target.value)}
        >
          {RECOVERY_RESOLUTION_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {t(o.labelKey, o.fallback)}
            </option>
          ))}
        </select>
      </label>
      {resolution === "replaced" ? (
        <label className="block text-[10px] text-muted-foreground">
          {t("managerRecovery.wizard.decide.replacedBy", "Replaced by item #")}
          <input
            type="text"
            inputMode="numeric"
            className="mt-0.5 w-full rounded-md border border-border/60 bg-background px-2 py-1.5 text-[11px]"
            value={replacedBy}
            disabled={recoveryApprovalSubmitting}
            onChange={(e) => setReplacedBy(e.target.value)}
          />
        </label>
      ) : null}
      <Textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder={t("managerRecovery.wizard.decide.notesPlaceholder", "Approval notes (optional)")}
        rows={2}
        disabled={recoveryApprovalSubmitting}
        className="text-[11px] min-h-0"
      />
      <Button type="button" size="sm" disabled={recoveryApprovalSubmitting} onClick={() => void submit()}>
        {t("managerRecovery.wizard.decide.apply", "Apply resolution")}
      </Button>
    </div>
  );
}
