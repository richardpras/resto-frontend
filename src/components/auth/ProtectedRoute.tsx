import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore, type AuthUser } from "@/stores/authStore";

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
  if (accessCheck && !accessCheck(user, hasPermission)) {
    return <Navigate to="/" replace />;
  } else if (permission && !hasPermission(permission)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

export function IdleTracker() {
  const { user, autoLock, idleMinutes, lock, locked } = useAuthStore();
  const [, force] = useState(0);

  useEffect(() => {
    if (!user?.pinSet || !autoLock || locked) return;
    let timer: number;
    const reset = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => lock(), idleMinutes * 60 * 1000);
    };
    const events = ["mousemove", "keydown", "click", "touchstart", "scroll"];
    events.forEach((e) => window.addEventListener(e, reset));
    reset();
    return () => {
      window.clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [user, user?.pinSet, autoLock, idleMinutes, lock, locked]);

  return null;
}
