import { Capacitor } from "@capacitor/core";

export function isCapacitorNative(): boolean {
  return Capacitor.isNativePlatform();
}

export function isNativeAndroid(): boolean {
  return Capacitor.getPlatform() === "android";
}

/** True when running inside the RestoHub Android APK (Capacitor WebView). */
export function isNativePosShell(): boolean {
  return isNativeAndroid();
}

let sunmiAvailableCache: boolean | null = null;

/**
 * Probes Sunmi printer plugin when on Android native.
 * Returns false on web or when plugin unavailable.
 */
export async function isSunmiPrinterAvailable(): Promise<boolean> {
  if (!isNativeAndroid()) return false;
  if (sunmiAvailableCache !== null) return sunmiAvailableCache;
  try {
    const { RestoSunmiPrinter } = await import("@restohub/capacitor-sunmi-printer");
    const result = await RestoSunmiPrinter.isAvailable();
    sunmiAvailableCache = Boolean(result.available);
    return sunmiAvailableCache;
  } catch {
    sunmiAvailableCache = false;
    return false;
  }
}

export function resetSunmiAvailabilityCache(): void {
  sunmiAvailableCache = null;
}
