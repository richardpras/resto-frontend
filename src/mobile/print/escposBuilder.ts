// Thermal ESC/POS line document (aligns with bridge/src/escposEncoder.js transport layer).
export type EscPosLine = {
  text: string;
  align?: "left" | "center" | "right";
  bold?: boolean;
};

export type EscPosImage = {
  align?: "left" | "center" | "right";
  rasterBase64: string;
  width: number;
  height: number;
  widthBytes: number;
};

export type EscPosDocument = {
  lines: EscPosLine[];
  images?: EscPosImage[];
  /** true/"partial" = partial cut, "full" = full cut, false/"none" = no cut. */
  cut?: boolean | "partial" | "full" | "none";
  openDrawer?: boolean;
};

const INIT = new Uint8Array([0x1b, 0x40]);
const BOLD_ON = new Uint8Array([0x1b, 0x45, 0x01]);
const BOLD_OFF = new Uint8Array([0x1b, 0x45, 0x00]);
const ALIGN_LEFT = new Uint8Array([0x1b, 0x61, 0x00]);
const ALIGN_CENTER = new Uint8Array([0x1b, 0x61, 0x01]);
const ALIGN_RIGHT = new Uint8Array([0x1b, 0x61, 0x02]);
/** Feed enough paper so content clears the cutter window on 58mm printers. */
const FEED_BEFORE_CUT = new Uint8Array([0x1b, 0x64, 0x04]);
const CUT_FULL = new Uint8Array([0x1d, 0x56, 0x00]);
const CUT_PARTIAL = new Uint8Array([0x1d, 0x56, 0x01]);

export function resolveCutMode(cut: EscPosDocument["cut"]): "none" | "partial" | "full" {
  if (cut === false || cut === "none") return "none";
  if (cut === "full") return "full";
  return "partial";
}
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

/** ESC/POS printers (SharkPOS/EPPOS) expect single-byte text, not UTF-8. */
function encodeEscPosText(text: string): Uint8Array {
  const raw = String(text ?? "");
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    const code = raw.charCodeAt(i);
    out[i] = code <= 0xff ? code : 0x3f; // '?'
  }
  return out;
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(String(b64 ?? ""));
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

/** GS v 0 m xL xH yL yH d1…dk — bit-image raster. */
function encodeRasterImage(image: EscPosImage): Uint8Array[] {
  const widthBytes = Math.max(1, Math.floor(Number(image.widthBytes) || 0));
  const height = Math.max(1, Math.floor(Number(image.height) || 0));
  const data = base64ToBytes(image.rasterBase64);
  const xL = widthBytes & 0xff;
  const xH = (widthBytes >> 8) & 0xff;
  const yL = height & 0xff;
  const yH = (height >> 8) & 0xff;
  return [
    alignBytes(image.align),
    new Uint8Array([0x1d, 0x76, 0x30, 0x00, xL, xH, yL, yH]),
    data,
  ];
}

export function encodeEscPos(document: EscPosDocument): Uint8Array {
  const chunks: Uint8Array[] = [INIT];
  const images = document.images ?? [];
  for (const image of images) {
    chunks.push(...encodeRasterImage(image));
  }
  // Single line feed only — logo should sit tight above the title.
  if (images.length > 0) {
    chunks.push(encodeEscPosText("\n"));
  }
  for (const line of document.lines ?? []) {
    chunks.push(alignBytes(line.align));
    chunks.push(line.bold ? BOLD_ON : BOLD_OFF);
    chunks.push(encodeEscPosText(String(line.text ?? "")));
    chunks.push(encodeEscPosText("\n"));
  }
  if (document.cut !== false && document.cut !== "none") {
    // Portable printers without a cutter ignore GS V; feed is still useful.
    chunks.push(FEED_BEFORE_CUT);
    const mode = resolveCutMode(document.cut);
    chunks.push(mode === "full" ? CUT_FULL : CUT_PARTIAL);
  }
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
