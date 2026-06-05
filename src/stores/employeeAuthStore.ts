import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ApiHttpError } from "@/lib/api-integration/client";
import {
  essDashboard,
  essLogin,
  essLogout,
  essMe,
  essProfile,
  setEssAccessToken,
  type EssDashboard,
  type EssMe,
  type EssProfile,
} from "@/lib/api-integration/essEndpoints";

type EmployeeAuthState = {
  accessToken: string | null;
  me: EssMe | null;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
  fetchProfile: () => Promise<EssProfile>;
  fetchDashboard: () => Promise<EssDashboard>;
};

export const useEmployeeAuthStore = create<EmployeeAuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      me: null,
      login: async (email, password) => {
        try {
          const { accessToken } = await essLogin(email, password);
          set({ accessToken });
          setEssAccessToken(accessToken);
          const me = await essMe();
          set({ me });
          return { ok: true };
        } catch (e) {
          const message = e instanceof ApiHttpError ? e.message : "Login failed";
          return { ok: false, error: message };
        }
      },
      logout: async () => {
        try {
          await essLogout();
        } finally {
          set({ accessToken: null, me: null });
          setEssAccessToken(undefined);
        }
      },
      refreshMe: async () => {
        if (!get().accessToken) return;
        const me = await essMe();
        set({ me });
      },
      fetchProfile: () => essProfile(),
      fetchDashboard: () => essDashboard(),
    }),
    {
      name: "resto-ess-auth",
      partialize: (s) => ({ accessToken: s.accessToken, me: s.me }),
      onRehydrateStorage: () => (state) => {
        if (state?.accessToken) setEssAccessToken(state.accessToken);
      },
    },
  ),
);
