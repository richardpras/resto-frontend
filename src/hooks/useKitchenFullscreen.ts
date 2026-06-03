import { useCallback, useEffect, useState } from "react";

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

export function useKitchenFullscreen(targetRef: React.RefObject<HTMLElement | null>) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => {
      const active = document.fullscreenElement !== null;
      setIsFullscreen(active);
      writeStoredPreference(active);
    };
    document.addEventListener("fullscreenchange", onChange);
    onChange();
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  useEffect(() => {
    if (!readStoredPreference()) return;
    const node = targetRef.current;
    if (!node || document.fullscreenElement !== null) return;
    void node.requestFullscreen?.().catch(() => {
      writeStoredPreference(false);
    });
  }, [targetRef]);

  const toggleFullscreen = useCallback(async () => {
    const node = targetRef.current;
    if (!node) return;

    try {
      if (document.fullscreenElement !== null) {
        await document.exitFullscreen();
      } else {
        await node.requestFullscreen();
      }
    } catch {
      writeStoredPreference(false);
      setIsFullscreen(false);
    }
  }, [targetRef]);

  return { isFullscreen, toggleFullscreen };
}
