import { useCallback, useEffect } from "react";
import { useInventoryStore } from "@/stores/inventoryStore";
import { useOutletStore } from "@/stores/outletStore";
import { useErpTranslation } from "@/i18n/useErpTranslation";

const TENANT_ID = Number(import.meta.env.VITE_API_TENANT_ID ?? 1) || 1;

type Options = {
  enabled?: boolean;
  perPage?: number;
};

export function useOutletInventory(options?: Options) {
  const enabled = options?.enabled ?? true;
  const perPage = options?.perPage ?? 200;
  const activeOutletId = useOutletStore((s) => s.activeOutletId);
  const { t } = useErpTranslation();
  const ingredients = useInventoryStore((s) => s.ingredients);
  const isLoading = useInventoryStore((s) => s.isInventoryLoading);
  const fetchInventory = useInventoryStore((s) => s.fetchInventory);

  useEffect(() => {
    if (!enabled || typeof activeOutletId !== "number" || activeOutletId < 1) return;
    void fetchInventory({ tenantId: TENANT_ID, outletId: activeOutletId, perPage }).catch(() => {});
  }, [enabled, activeOutletId, fetchInventory, perPage]);

  const resolveItemName = useCallback(
    (id: string) => ingredients.find((i) => i.id === id)?.name ?? t("purchases.po.itemLabel", { id }),
    [ingredients, t],
  );

  return { ingredients, isLoading, activeOutletId, resolveItemName };
}
