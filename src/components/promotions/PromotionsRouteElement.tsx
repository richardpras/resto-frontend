import { Navigate } from "react-router-dom";
import { isPromotionsModuleEnabled } from "@/domain/featureFlags";

type Props = {
  children: React.ReactNode;
};

/** Redirects to Loyalty Programs when the deprecated Promotions module is disabled. */
export function PromotionsRouteElement({ children }: Props) {
  if (!isPromotionsModuleEnabled()) {
    return <Navigate to="/loyalty-programs" replace />;
  }

  return <>{children}</>;
}
