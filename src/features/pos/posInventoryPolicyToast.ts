import type { StockEnforcementMode } from "@/domain/settingsDomainTypes";
import { toast } from "sonner";

export function showInventoryPolicySuccessToast(mode: StockEnforcementMode | undefined): void {
  if (mode === "warning" || mode === "deferred") {
    toast.message("Inventory warning", {
      description:
        "Inventory records may be insufficient. Sale completed successfully. Manager review may be required.",
      icon: "⚠️",
    });
  }
}
