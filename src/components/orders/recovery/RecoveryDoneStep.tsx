import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import type { OrderApi } from "@/lib/api-integration/endpoints";

type Props = {
  line: OrderApi["items"][number];
  onClose: () => void;
  onNextLine?: () => void;
  hasMorePending: boolean;
};

export function RecoveryDoneStep({ line, onClose, onNextLine, hasMorePending }: Props) {
  const { t } = useTranslation("ops");

  return (
    <div className="space-y-3 text-center py-2" data-testid="recovery-wizard-done">
      <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto" />
      <p className="text-sm font-semibold text-foreground">{t("managerRecovery.wizard.done.title", "Line resolved")}</p>
      <p className="text-[11px] text-muted-foreground">{line.name}</p>
      <div className="flex flex-col gap-2">
        {hasMorePending && onNextLine ? (
          <Button type="button" size="sm" onClick={onNextLine}>
            {t("managerRecovery.wizard.done.next", "Next pending line")}
          </Button>
        ) : null}
        <Button type="button" size="sm" variant="outline" onClick={onClose}>
          {t("managerRecovery.wizard.done.close", "Close wizard")}
        </Button>
      </div>
    </div>
  );
}
