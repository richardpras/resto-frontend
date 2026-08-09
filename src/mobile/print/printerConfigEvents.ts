/** Fired when Bluetooth printer is saved/cleared so print hooks re-detect. */
export const PRINTER_CONFIG_CHANGED_EVENT = "restohub:printer-config-changed";

export function notifyPrinterConfigChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(PRINTER_CONFIG_CHANGED_EVENT));
}
