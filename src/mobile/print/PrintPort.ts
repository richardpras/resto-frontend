import type { EscPosDocument } from "./escposBuilder";

export type PrintResult = { ok: true } | { ok: false; error: string };

export interface PrintPort {
  isAvailable(): Promise<boolean>;
  printDocument(document: EscPosDocument): Promise<PrintResult>;
}
