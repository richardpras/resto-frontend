import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";

/** Backend does not expose user-management audit trail via API yet. */
export default function AuditLog() {
  const { t } = useTranslation("common");

  return (
    <Card className="rounded-2xl p-10 text-center text-muted-foreground">
      <p className="text-sm">{t("usersManagement.audit.unavailable")}</p>
      <p className="text-xs mt-2">{t("usersManagement.audit.hint")}</p>
    </Card>
  );
}
