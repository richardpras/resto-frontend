import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";

export function ProtectedRoute({
  children,
  permission,
}: {
  children: React.ReactNode;
  permission?: string;
}) {
  const user = useAuthStore((s) => s.user);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  if (permission && !hasPermission(permission)) {
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
