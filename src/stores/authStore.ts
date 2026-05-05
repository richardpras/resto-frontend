import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  login as apiLogin,
  logout as apiLogout,
  me as fetchMe,
  verifyScreenPin,
} from "@/lib/api-integration/userManagementEndpoints";
import type { MeResponse } from "@/lib/api-integration/userManagementEndpoints";
import { ApiHttpError, setApiAccessToken } from "@/lib/api-integration/client";
import { toast } from "sonner";

export type RoleName = "Owner" | "Manager" | "Cashier" | "Kitchen";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: RoleName;
  outletIds: string[];
  /** Whether a screen-unlock PIN is stored on the server (hashed); verify via API only. */
  pinSet: boolean;
  permissions: string[];
}

// Permission keys used across the app
export const PERMISSIONS = {
  DASHBOARD_ALL: "dashboard.view_all_outlets",
  DASHBOARD_OWN: "dashboard.view_own_outlet",
  POS: "pos.use",
  KITCHEN: "kitchen.use",
  MENU: "menu.manage",
  INVENTORY: "inventory.manage",
  PURCHASE: "purchase.manage",
  PROMOTIONS: "promotions.manage",
  PAYROLL: "payroll.manage",
  ACCOUNTING: "accounting.manage",
  USERS: "users.manage",
  REPORTS: "reports.view",
  SETTINGS: "settings.manage",
  SUPPLIERS: "suppliers.manage",
  MEMBERS: "members.manage",
  TABLES: "tables.view",
  QR_ORDERS: "qr_orders.view",
} as const;

const allPermValues = new Set<string>(Object.values(PERMISSIONS));

function resolveRole(roles: { name: string }[]): RoleName {
  const names = roles.map((r) => r.name);
  const order: RoleName[] = ["Owner", "Manager", "Cashier", "Kitchen"];
  for (const r of order) {
    if (names.includes(r)) return r;
  }
  return "Manager";
}

/** Merges API /auth/me permission codes with template route-guard keys. */
function expandPermissionCodes(codes: string[]): string[] {
  const out = new Set<string>();
  for (const c of codes) out.add(c);

  const has = (...keys: string[]) => keys.some((k) => codes.includes(k));

  if (has("users.view", "users.create", "users.assign_roles")) out.add(PERMISSIONS.USERS);
  if (has("roles.view", "roles.create", "roles.assign_permissions")) out.add(PERMISSIONS.USERS);
  if (has("permissions.view", "permissions.create")) out.add(PERMISSIONS.USERS);
  if (has("settings.view", "settings.update")) out.add(PERMISSIONS.SETTINGS);
  if (codes.some((c) => c.startsWith("payroll."))) out.add(PERMISSIONS.PAYROLL);

  for (const c of codes) {
    if (allPermValues.has(c)) out.add(c);
  }

  return [...out];
}

function mapMeToAuthUser(meData: MeResponse): AuthUser {
  const role = resolveRole(meData.roles);
  const permissions = expandPermissionCodes(meData.permissionCodes);

  return {
    id: String(meData.id),
    name: meData.name,
    email: meData.email,
    role,
    outletIds: ["o-main"],
    pinSet: meData.pinSet === true,
    permissions,
  };
}

interface AuthStore {
  user: AuthUser | null;
  locked: boolean;
  autoLock: boolean;
  idleMinutes: number;
  accessToken: string | null;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  lock: () => void;
  unlock: (pin: string) => Promise<boolean>;
  setAutoLock: (v: boolean) => void;
  setIdleMinutes: (n: number) => void;
  hasPermission: (perm: string) => boolean;
  restoreSessionFromApi: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      locked: false,
      autoLock: true,
      idleMinutes: 5,
      accessToken: null,

      restoreSessionFromApi: async () => {
        const token = get().accessToken;
        if (!token) return;
        setApiAccessToken(token);
        try {
          const meData = await fetchMe();
          set({ user: mapMeToAuthUser(meData), locked: false });
        } catch {
          set({ user: null, locked: false, accessToken: null });
          setApiAccessToken(undefined);
        }
      },

      login: async (email, password) => {
        try {
          const res = await apiLogin(email, password);
          setApiAccessToken(res.data.accessToken);
          const meData = await fetchMe();
          const user = mapMeToAuthUser(meData);
          set({ user, locked: false, accessToken: res.data.accessToken });
          return { ok: true };
        } catch (e) {
          setApiAccessToken(undefined);
          const msg =
            e instanceof ApiHttpError ? e.message : "Invalid email or password";
          return { ok: false, error: msg };
        }
      },

      logout: () => {
        const token = get().accessToken;
        set({ user: null, locked: false, accessToken: null });
        setApiAccessToken(undefined);
        if (token) {
          void apiLogout().catch(() => undefined);
        }
      },

      lock: () => {
        const u = get().user;
        if (u?.pinSet) set({ locked: true });
      },

      unlock: async (pin) => {
        try {
          await verifyScreenPin(pin);
          set({ locked: false });
          return true;
        } catch (e) {
          if (e instanceof ApiHttpError && e.status === 401) {
            toast.error("Session expired. Please sign in again.");
            get().logout();
            return false;
          }

          return false;
        }
      },

      setAutoLock: (v) => set({ autoLock: v }),

      setIdleMinutes: (n) => set({ idleMinutes: Math.max(1, n) }),

      hasPermission: (perm) => {
        const u = get().user;
        if (!u) return false;
        return u.permissions.includes(perm);
      },
    }),
    {
      name: "resto-auth",
      partialize: (s) => ({
        user: s.user,
        locked: s.locked,
        autoLock: s.autoLock,
        idleMinutes: s.idleMinutes,
        accessToken: s.accessToken,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.accessToken) {
          setApiAccessToken(state.accessToken);
          queueMicrotask(() => {
            void useAuthStore.getState().restoreSessionFromApi();
          });
        }
      },
    },
  ),
);

/**
 * Quick-fill tiles on Login — matches API-seeded users (TemplateDemoUsersSeeder).
 * Screen unlock PIN (after login): Owner 1234, Manager 2345, Cashier 3456, Kitchen 4567.
 */
export const DEMO_CREDENTIALS: { email: string; password: string; role: RoleName }[] = [
  { email: "owner@resto.com", password: "owner", role: "Owner" },
  { email: "manager@resto.com", password: "manager", role: "Manager" },
  { email: "cashier@resto.com", password: "cashier", role: "Cashier" },
  { email: "kitchen@resto.com", password: "kitchen", role: "Kitchen" },
];
