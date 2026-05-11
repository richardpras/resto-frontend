import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Outlet } from "@/domain/settingsDomainTypes";

interface OutletContextState {
  activeOutletId: number | null;
  /** Short code for display (optional) */
  activeOutletCode: string | null;
  hydrateFromApiOutlets: (outlets: Outlet[]) => void;
  setActiveOutlet: (o: Outlet) => void;
  setActiveOutletContext: (id: number, code?: string | null) => void;
  clearActiveOutlet: () => void;
}

export const useOutletStore = create<OutletContextState>()(
  persist(
    (set, get) => ({
      activeOutletId: null,
      activeOutletCode: null,
      hydrateFromApiOutlets: (outlets) => {
        if (outlets.length === 0) return;
        const { activeOutletId } = get();
        if (activeOutletId !== null && outlets.some((o) => o.id === activeOutletId)) return;
        const first = outlets[0];
        set({
          activeOutletId: first.id,
          activeOutletCode: first.code || null,
        });
      },
      setActiveOutlet: (o: Outlet) => {
        set({
          activeOutletId: o.id,
          activeOutletCode: o.code || null,
        });
      },
      setActiveOutletContext: (id, code) => {
        set({
          activeOutletId: id,
          activeOutletCode: code ?? null,
        });
      },
      clearActiveOutlet: () => {
        set({
          activeOutletId: null,
          activeOutletCode: null,
        });
      },
    }),
    { name: "resto-active-outlet-v2" },
  ),
);
