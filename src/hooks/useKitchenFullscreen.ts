import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "kitchen.display.fullscreen";

function readStoredPreference(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function writeStoredPreference(enabled: boolean): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
  } catch {
    // ignore quota errors
  }
}

function syncKioskDom(active: boolean): void {
  if (typeof document === "undefined") return;
  if (active) {
    document.documentElement.setAttribute("data-kds-kiosk", "true");
    document.body.classList.add("kds-kiosk-active");
  } else {
    document.documentElement.removeAttribute("data-kds-kiosk");
    document.body.classList.remove("kds-kiosk-active");
  }
}

function isOurFullscreenElement(node: HTMLElement | null): boolean {
  if (!node || !document.fullscreenElement) return false;
  return document.fullscreenElement === node || document.fullscreenElement.contains(node);
}

export function useKitchenFullscreen(targetRef: React.RefObject<HTMLElement | null>) {
  const [isKiosk, setIsKiosk] = useState(() => readStoredPreference());
  const isKioskRef = useRef(isKiosk);

  useEffect(() => {
    isKioskRef.current = isKiosk;
    syncKioskDom(isKiosk);
    writeStoredPreference(isKiosk);
  }, [isKiosk]);

  useEffect(() => {
    return () => {
      syncKioskDom(false);
      if (document.fullscreenElement && isOurFullscreenElement(targetRef.current)) {
        void document.exitFullscreen().catch(() => {});
      }
    };
  }, [targetRef]);

  useEffect(() => {
    const onFullscreenChange = () => {
      if (document.fullscreenElement !== null) return;
      if (!isKioskRef.current) return;
      setIsKiosk(false);
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  useEffect(() => {
    if (!isKiosk) return;
    const node = targetRef.current;
    if (!node || document.fullscreenElement !== null) return;
    void node.requestFullscreen?.().catch(() => {
      // Kiosk overlay still works without native fullscreen.
    });
  }, [isKiosk, targetRef]);

  const toggleFullscreen = useCallback(async () => {
    const next = !isKioskRef.current;
    setIsKiosk(next);
    syncKioskDom(next);
    writeStoredPreference(next);

    const node = targetRef.current;
    if (!node) return;

    try {
      if (next) {
        if (document.fullscreenElement === null) {
          await node.requestFullscreen();
        }
      } else if (document.fullscreenElement !== null) {
        await document.exitFullscreen();
      }
    } catch {
      // Keep kiosk CSS mode even when the Fullscreen API is unavailable.
      if (!next && document.fullscreenElement !== null) {
        try {
          await document.exitFullscreen();
        } catch {
          // ignore
        }
      }
    }
  }, [targetRef]);

  return { isFullscreen: isKiosk, toggleFullscreen };
}
