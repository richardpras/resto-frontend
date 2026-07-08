// Thermal ESC/POS line document (aligns with bridge/src/escposEncoder.js transport layer).
export type EscPosLine = {
  text: string;
  align?: "left" | "center" | "right";
  bold?: boolean;
};

export type EscPosDocument = {
  lines: EscPosLine[];
  cut?: boolean;
  openDrawer?: boolean;
};

const BOLD_ON = new Uint8Array([0x1b, 0x45, 0x01]);
const BOLD_OFF = new Uint8Array([0x1b, 0x45, 0x00]);
const ALIGN_LEFT = new Uint8Array([0x1b, 0x61, 0x00]);
const ALIGN_CENTER = new Uint8Array([0x1b, 0x61, 0x01]);
const ALIGN_RIGHT = new Uint8Array([0x1b, 0x61, 0x02]);
const CUT_PARTIAL = new Uint8Array([0x1d, 0x56, 0x01]);

function alignBytes(align?: EscPosLine["align"]): Uint8Array {
  if (align === "center") return ALIGN_CENTER;
  if (align === "right") return ALIGN_RIGHT;
  return ALIGN_LEFT;
}

function concatChunks(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((sum, c) => sum + c.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

export function encodeEscPos(document: EscPosDocument): Uint8Array {
  const chunks: Uint8Array[] = [];
  const encoder = new TextEncoder();
  for (const line of document.lines ?? []) {
    chunks.push(alignBytes(line.align));
    chunks.push(line.bold ? BOLD_ON : BOLD_OFF);
    chunks.push(encoder.encode(String(line.text ?? "")));
    chunks.push(encoder.encode("\n"));
  }
  if (document.cut !== false) chunks.push(CUT_PARTIAL);
  return concatChunks(chunks);
}

export function thermalWidthChars(paperWidth: "58mm" | "80mm"): number {
  return paperWidth === "80mm" ? 42 : 32;
}

export function dividerLine(paperWidth: "58mm" | "80mm"): string {
  return "-".repeat(thermalWidthChars(paperWidth));
}

export function padLine(left: string, right: string, width: number): string {
  const gap = width - left.length - right.length;
  if (gap >= 1) return left + " ".repeat(gap) + right;
  return `${left} ${right}`;
}

export function centerText(text: string, width: number): string {
  if (text.length >= width) return text.slice(0, width);
  const pad = Math.floor((width - text.length) / 2);
  return " ".repeat(pad) + text;
}
