import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

export const POS_BACKGROUND_REQUEST_DEFER_MS = 2000;

const HEAVY_CHECKOUT_ROUTE = /^\/(pos|cashier)\/?$/;

export function isHeavyCheckoutRoute(pathname: string): boolean {
  return HEAVY_CHECKOUT_ROUTE.test(pathname);
}

/** Delays non-critical background polling on POS/Cashier so critical menu/table loads run first. */
export function usePosRouteBackgroundDefer(): boolean {
  const { pathname } = useLocation();
  const heavyRoute = isHeavyCheckoutRoute(pathname);
  const [ready, setReady] = useState(!heavyRoute);

  useEffect(() => {
    if (!heavyRoute) {
      setReady(true);
      return;
    }
    setReady(false);
    const timer = window.setTimeout(() => setReady(true), POS_BACKGROUND_REQUEST_DEFER_MS);
    return () => window.clearTimeout(timer);
  }, [heavyRoute, pathname]);

  return ready;
}
