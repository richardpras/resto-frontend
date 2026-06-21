import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getApiAccessToken } from "@/lib/api-integration/client";
import { fetchPosBootstrap } from "@/lib/api-integration/posBootstrapEndpoints";
import { hydratePosBootstrapSettings } from "@/stores/settingsStore";
import { usePosSessionStore } from "@/stores/posSessionStore";

export const POS_BOOTSTRAP_STALE_MS = 5 * 60_000;

export type UsePosBootstrapOptions = {
  tenantId: number;
  outletId: number | null | undefined;
};

export function posBootstrapQueryKey(tenantId: number, outletId: number) {
  return ["pos-bootstrap", tenantId, outletId] as const;
}

export function usePosBootstrap({ tenantId, outletId }: UsePosBootstrapOptions) {
  const queryClient = useQueryClient();
  const enabled = typeof outletId === "number" && outletId >= 1 && Boolean(getApiAccessToken());

  const query = useQuery({
    queryKey: posBootstrapQueryKey(tenantId, outletId ?? 0),
    queryFn: async () => {
      const data = await fetchPosBootstrap({
        outletId: outletId as number,
        tenantId,
        perPage: 200,
      });

      queryClient.setQueryData(["menu-items", tenantId, outletId], data.menuItems.data);
      hydratePosBootstrapSettings(data.merchant, data.system);
      usePosSessionStore.getState().hydrateFromBootstrap(outletId as number, data.posSession);

      return data;
    },
    enabled,
    staleTime: POS_BOOTSTRAP_STALE_MS,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,
  });

  const menuApiItems = query.data?.menuItems.data ?? [];

  return {
    menuApiItems,
    menuLoading: query.isLoading,
    menuError: query.isError,
    refetchMenu: query.refetch,
    bootstrapLoading: query.isLoading,
    bootstrapError: query.isError,
  };
}
