import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { registerSW } from "virtual:pwa-register";
import {
  injectStaffManifest,
  isPublicGuestPath,
  isStaffPwaPath,
  removeStaffManifest,
  removeStaffThemeColor,
  setStaffThemeColor,
} from "./publicGuestRoutes";

let swRegistered = false;

function ensureServiceWorkerRegistered(): void {
  if (swRegistered || typeof window === "undefined") return;
  registerSW({ immediate: true });
  swRegistered = true;
}

export function useStaffPwa(): void {
  const { pathname } = useLocation();

  useEffect(() => {
    if (isStaffPwaPath(pathname)) {
      injectStaffManifest();
      setStaffThemeColor();
      ensureServiceWorkerRegistered();
      return;
    }

    if (isPublicGuestPath(pathname)) {
      removeStaffManifest();
      removeStaffThemeColor();
    }
  }, [pathname]);
}

export function PwaRouteController(): null {
  useStaffPwa();
  return null;
}
