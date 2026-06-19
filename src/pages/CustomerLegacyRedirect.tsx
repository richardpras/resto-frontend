import { useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { findMemberByLoyaltyAccountId } from "@/lib/api-integration/membersEndpoints";

export default function CustomerLegacyRedirect() {
  const { customerId } = useParams<{ customerId: string }>();
  const [memberId, setMemberId] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    if (!customerId) {
      setMemberId(null);
      return;
    }
    void findMemberByLoyaltyAccountId(customerId).then((id) => setMemberId(id));
  }, [customerId]);

  if (memberId === undefined) {
    return <div className="p-6 text-sm text-muted-foreground">Redirecting...</div>;
  }
  if (memberId) {
    return <Navigate to={`/members/${memberId}`} replace />;
  }
  return <Navigate to="/members" replace />;
}
