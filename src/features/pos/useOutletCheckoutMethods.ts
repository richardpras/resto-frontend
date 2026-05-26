import { useQuery } from "@tanstack/react-query";
import {
  listOutletCheckoutMethods,
  type OutletPaymentMethodConfigApi,
} from "@/lib/api-integration/outletPaymentMethodEndpoints";
import { FALLBACK_CHECKOUT_METHODS } from "@/features/pos/paymentMethodCapabilities";

export function useOutletCheckoutMethods(
  outletId: number | null | undefined,
  options?: { enabled?: boolean },
) {
  const enabled =
    (options?.enabled ?? true) && typeof outletId === "number" && outletId >= 1;

  return useQuery({
    queryKey: ["outlet-checkout-methods", outletId],
    queryFn: () => listOutletCheckoutMethods(outletId as number),
    enabled,
    staleTime: 60_000,
    placeholderData: FALLBACK_CHECKOUT_METHODS,
  });
}

export function findCheckoutMethod(
  methods: OutletPaymentMethodConfigApi[],
  code: string | null | undefined,
): OutletPaymentMethodConfigApi | undefined {
  if (!code) return undefined;
  return methods.find((m) => m.paymentMethodCode === code);
}
