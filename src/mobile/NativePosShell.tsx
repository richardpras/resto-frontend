import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { isNativePosShell } from "@/mobile/platform";
import { useOfflineSyncStore } from "@/stores/offlineSyncStore";

/**
 * Native Android shell: init connectivity listeners and redirect authenticated staff to POS.
 */
export function NativePosShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const initConnectivityListeners = useOfflineSyncStore((s) => s.initConnectivityListeners);

  useEffect(() => {
    if (!isNativePosShell()) return;
    initConnectivityListeners();
  }, [initConnectivityListeners]);

  useEffect(() => {
    if (!isNativePosShell() || !user) return;
    const path = location.pathname;
    if (path === "/" || path === "/login") {
      navigate("/pos", { replace: true });
    }
  }, [user, location.pathname, navigate]);

  return null;
}
