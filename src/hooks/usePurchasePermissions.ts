import { useAuthStore, PERMISSIONS } from "@/stores/authStore";
import { canApprovePurchases } from "@/domain/permissionGates";

export function usePurchasePermissions() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const user = useAuthStore((s) => s.user);

  return {
    canManage: hasPermission(PERMISSIONS.PURCHASE),
    canApprove: canApprovePurchases(user),
  };
}
