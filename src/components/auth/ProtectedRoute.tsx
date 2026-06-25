import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore, type AuthUser } from "@/stores/authStore";
import { getDefaultIdleLockMinutes } from "@/lib/sessionConfig";
import { resolveDefaultLandingPath } from "@/domain/permissionGates";
import { useEffect } from "react";

export function ProtectedRoute({
  children,
  permission,
  accessCheck,
}: {
  children: React.ReactNode;
  permission?: string;
  /** Custom access predicate evaluated after login (e.g. multi-permission module gates). */
  accessCheck?: (user: AuthUser, hasPermission: (perm: string) => boolean) => boolean;
}) {
  const user = useAuthStore((s) => s.user);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const denied =
    (accessCheck && !accessCheck(user, hasPermission)) ||
    (permission && !hasPermission(permission));

  if (denied) {
    const fallback = resolveDefaultLandingPath(user);
    if (fallback === location.pathname) {
      return <Navigate to="/login" replace state={{ from: location }} />;
    }
    return <Navigate to={fallback} replace />;
  }

  return <>{children}</>;
}

export function IdleTracker() {
  const { user, autoLock, idleMinutes, lock, locked } = useAuthStore();
  const effectiveIdleMinutes = idleMinutes > 0 ? idleMinutes : getDefaultIdleLockMinutes();

  useEffect(() => {
    if (!user?.pinSet || !autoLock || locked) return;
    let timer: number;
    const reset = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => lock(), effectiveIdleMinutes * 60 * 1000);
    };
    const events = ["mousemove", "keydown", "click", "touchstart", "scroll"] as const;
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      window.clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [user, user?.pinSet, autoLock, effectiveIdleMinutes, lock, locked]);

  return null;
}
