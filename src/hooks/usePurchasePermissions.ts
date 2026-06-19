import { useAuthStore, PERMISSIONS } from "@/stores/authStore";

export function usePurchasePermissions() {
  const hasPermission = useAuthStore((s) => s.hasPermission);

  return {
    canManage: hasPermission(PERMISSIONS.PURCHASE),
    canApprove:
      hasPermission(PERMISSIONS.PURCHASE_APPROVE) || hasPermission(PERMISSIONS.PURCHASE),
  };
}
