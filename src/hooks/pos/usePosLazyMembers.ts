import { useEffect, useRef } from "react";
import { ApiHttpError } from "@/lib/api-integration/client";
import { toast } from "sonner";
import { useMemberStore } from "@/stores/memberStore";
import { useLoyaltyStore } from "@/stores/loyaltyStore";

type UsePosLazyMembersOptions = {
  activeOutletId: number | null | undefined;
  showMemberPicker: boolean;
  memberSearch: string;
  crmEnabled: boolean;
};

export function usePosLazyMembers({
  activeOutletId,
  showMemberPicker,
  memberSearch,
  crmEnabled,
}: UsePosLazyMembersOptions) {
  const fetchMembers = useMemberStore((s) => s.fetchMembers);
  const searchMembersForOutlet = useMemberStore((s) => s.searchMembersForOutlet);
  const refreshLoyalty = useLoyaltyStore((s) => s.refreshForOutlet);
  const crmLazyFetchedRef = useRef<Record<number, boolean>>({});

  useEffect(() => {
    if (!showMemberPicker) return;
    if (typeof activeOutletId !== "number" || activeOutletId < 1) return;
    const timer = setTimeout(() => {
      void searchMembersForOutlet(activeOutletId, memberSearch).catch((e) => {
        if (e instanceof ApiHttpError) toast.error(e.message);
      });
    }, 250);
    return () => clearTimeout(timer);
  }, [activeOutletId, memberSearch, searchMembersForOutlet, showMemberPicker]);

  useEffect(() => {
    if (!crmEnabled || !showMemberPicker) return;
    if (typeof activeOutletId !== "number" || activeOutletId < 1) return;
    if (crmLazyFetchedRef.current[activeOutletId]) return;
    crmLazyFetchedRef.current[activeOutletId] = true;
    void fetchMembers({ outletId: activeOutletId }).catch((e) => {
      if (e instanceof ApiHttpError) toast.error(e.message);
    });
    void refreshLoyalty(activeOutletId);
  }, [activeOutletId, crmEnabled, fetchMembers, refreshLoyalty, showMemberPicker]);
}
