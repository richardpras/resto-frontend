import { encodeEscPos, type EscPosDocument } from "./escposBuilder";
import type { PrintPort, PrintResult } from "./PrintPort";

/** Web / cloud print path — POS continues using existing receipt API. */
export class CloudPrintAdapter implements PrintPort {
  async isAvailable(): Promise<boolean> {
    return false;
  }

  async printDocument(_document: EscPosDocument): Promise<PrintResult> {
    return { ok: false, error: "Use cloud print API on web" };
  }
}

export function getCloudPrintAdapter(): PrintPort {
  return new CloudPrintAdapter();
}

export async function encodeDocumentBase64(document: EscPosDocument): Promise<string> {
  const bytes = encodeEscPos(document);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
