import { RestoSunmiPrinter } from "@restohub/capacitor-sunmi-printer";
import { encodeEscPos, type EscPosDocument } from "./escposBuilder";
import { encodeDocumentBase64 } from "./CloudPrintAdapter";
import type { PrintPort, PrintResult } from "./PrintPort";

export class SunmiPrintAdapter implements PrintPort {
  private available: boolean | null = null;

  async isAvailable(): Promise<boolean> {
    if (this.available !== null) return this.available;
    try {
      const status = await RestoSunmiPrinter.isAvailable();
      this.available = Boolean(status.available);
      return this.available;
    } catch {
      this.available = false;
      return false;
    }
  }

  async printDocument(document: EscPosDocument): Promise<PrintResult> {
    if (!(await this.isAvailable())) {
      return { ok: false, error: "Sunmi printer unavailable" };
    }
    try {
      const base64 = await encodeDocumentBase64(document);
      await RestoSunmiPrinter.printRaw({ data: base64 });
      if (document.cut !== false) {
        await RestoSunmiPrinter.cutPaper();
      }
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Sunmi print failed" };
    }
  }

  /** Direct text fallback for debugging. */
  async printPlainText(text: string): Promise<PrintResult> {
    if (!(await this.isAvailable())) {
      return { ok: false, error: "Sunmi printer unavailable" };
    }
    try {
      await RestoSunmiPrinter.printText({ text });
      await RestoSunmiPrinter.cutPaper();
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Sunmi print failed" };
    }
  }
}

let sunmiAdapter: SunmiPrintAdapter | null = null;

export function getSunmiPrintAdapter(): SunmiPrintAdapter {
  if (!sunmiAdapter) sunmiAdapter = new SunmiPrintAdapter();
  return sunmiAdapter;
}

export function bytesForDocument(document: EscPosDocument): Uint8Array {
  return encodeEscPos(document);
}
