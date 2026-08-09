export type ThermalLogoRaster = {
  width: number;
  height: number;
  widthBytes: number;
  rasterBase64: string;
};

const THERMAL_MAX_WIDTH: Record<"58mm" | "80mm", number> = {
  // Matches api OutletLogoProcessor: THERMAL_WIDTH * THERMAL_SCALE
  "58mm": 192,
  "80mm": 288,
};

/** Bump when raster algorithm changes so devices don't reuse blank logos. */
const RASTER_CACHE_VERSION = "v2";

const rasterCache = new Map<string, ThermalLogoRaster | null>();

/** Rewrite localhost logo URLs to the device-reachable API host. */
export function rewriteLogoUrlForDevice(logoUrl: string): string {
  const raw = String(logoUrl ?? "").trim();
  if (!raw) return raw;
  try {
    const apiBase = String(import.meta.env.VITE_API_BASE_URL ?? "").trim();
    const api = new URL(apiBase || window.location.origin, window.location.origin);
    const logo = new URL(raw, api.origin);
    const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);
    if (localHosts.has(logo.hostname) && !localHosts.has(api.hostname)) {
      logo.protocol = api.protocol;
      logo.hostname = api.hostname;
      logo.port = api.port;
    }
    return logo.toString();
  } catch {
    return raw;
  }
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

async function loadImageElement(url: string): Promise<HTMLImageElement> {
  const res = await fetch(url, { credentials: "omit", cache: "force-cache" });
  if (!res.ok) {
    throw new Error(`Logo fetch failed (${res.status})`);
  }
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Logo image decode failed"));
      el.src = objectUrl;
    });
    return img;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/**
 * Build ink strength 0..255 from RGBA.
 * Light pastel colors (e.g. mint logos) still count as ink via chroma.
 */
function inkStrength(r: number, g: number, b: number, a: number): number {
  if (a < 16) return 0;
  const gray = 0.299 * r + 0.587 * g + 0.114 * b;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const chroma = max - min;
  // Near-white paper: no ink
  if (gray >= 245 && chroma < 18) return 0;
  // Soften alpha edges
  const alphaScale = Math.min(1, a / 255);
  // Dark pixels → strong ink; pastel/chroma → still printable
  const darkness = 255 - gray;
  const chromaBoost = Math.min(220, chroma * 1.8);
  return Math.min(255, (Math.max(darkness, chromaBoost) * alphaScale));
}

function trimMonoRows(rows: Uint8Array[], widthBytes: number): Uint8Array[] {
  if (rows.length === 0) return rows;
  const isBlank = (row: Uint8Array) => row.every((b) => b === 0);
  let top = 0;
  let bottom = rows.length - 1;
  while (top <= bottom && isBlank(rows[top]!)) top++;
  while (bottom >= top && isBlank(rows[bottom]!)) bottom--;
  if (top > bottom) {
    // Keep a tiny placeholder so encode path stays valid if logo was all-white
    return [new Uint8Array(widthBytes)];
  }
  return rows.slice(top, bottom + 1);
}

/**
 * Contrast-aware mono conversion for thermal (black=1).
 * Handles light/pastel brand logos that fail a simple gray&lt;128 threshold.
 */
export function rgbaToThermalMono(
  data: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number,
): { width: number; height: number; widthBytes: number; binary: Uint8Array } {
  const ink = new Float32Array(width * height);
  let inkCount = 0;
  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    const strength = inkStrength(
      data[idx] ?? 255,
      data[idx + 1] ?? 255,
      data[idx + 2] ?? 255,
      data[idx + 3] ?? 255,
    );
    ink[i] = strength;
    if (strength > 0) inkCount++;
  }

  // No detectable ink → empty raster
  if (inkCount === 0) {
    const widthBytes = Math.ceil(width / 8);
    return { width, height: 1, widthBytes, binary: new Uint8Array(widthBytes) };
  }

  // Normalize ink to full range so pastel logos get strong blacks
  let min = 255;
  let max = 0;
  for (let i = 0; i < ink.length; i++) {
    const v = ink[i]!;
    if (v <= 0) continue;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const span = Math.max(1, max - min);
  const normalized = new Float32Array(ink.length);
  for (let i = 0; i < ink.length; i++) {
    const v = ink[i]!;
    normalized[i] = v <= 0 ? 0 : ((v - min) / span) * 255;
  }

  // Floyd–Steinberg dither → 1-bit
  const mono = new Uint8Array(width * height); // 1 = black
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const old = normalized[i] ?? 0;
      const value = old >= 128 ? 255 : 0;
      mono[i] = value === 255 ? 1 : 0;
      const err = old - value;
      if (x + 1 < width) {
        normalized[i + 1] = (normalized[i + 1] ?? 0) + (err * 7) / 16;
      }
      if (y + 1 < height) {
        if (x > 0) {
          normalized[i + width - 1] = (normalized[i + width - 1] ?? 0) + (err * 3) / 16;
        }
        normalized[i + width] = (normalized[i + width] ?? 0) + (err * 5) / 16;
        if (x + 1 < width) {
          normalized[i + width + 1] = (normalized[i + width + 1] ?? 0) + (err * 1) / 16;
        }
      }
    }
  }

  const widthBytes = Math.ceil(width / 8);
  const rows: Uint8Array[] = [];
  for (let y = 0; y < height; y++) {
    const row = new Uint8Array(widthBytes);
    for (let xByte = 0; xByte < widthBytes; xByte++) {
      let byte = 0;
      for (let bit = 0; bit < 8; bit++) {
        const x = xByte * 8 + bit;
        if (x >= width) continue;
        if (mono[y * width + x]) {
          byte |= 1 << (7 - bit);
        }
      }
      row[xByte] = byte;
    }
    rows.push(row);
  }

  const trimmed = trimMonoRows(rows, widthBytes);
  const binary = new Uint8Array(trimmed.length * widthBytes);
  for (let y = 0; y < trimmed.length; y++) {
    binary.set(trimmed[y]!, y * widthBytes);
  }

  return {
    width,
    height: trimmed.length,
    widthBytes,
    binary,
  };
}

/** Convert outlet logo URL to ESC/POS mono raster (black = 1). */
export async function loadThermalLogoRaster(
  logoUrl: string | null | undefined,
  paperWidth: "58mm" | "80mm",
): Promise<ThermalLogoRaster | null> {
  const rewritten = rewriteLogoUrlForDevice(String(logoUrl ?? ""));
  if (!rewritten) return null;

  const cacheKey = `${RASTER_CACHE_VERSION}|${paperWidth}|${rewritten}`;
  if (rasterCache.has(cacheKey)) {
    return rasterCache.get(cacheKey) ?? null;
  }

  try {
    const img = await loadImageElement(rewritten);
    const maxWidth = THERMAL_MAX_WIDTH[paperWidth];
    const scale = Math.min(1, maxWidth / Math.max(1, img.naturalWidth || img.width));
    const width = Math.max(1, Math.round((img.naturalWidth || img.width) * scale));
    const height = Math.max(1, Math.round((img.naturalHeight || img.height) * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) {
      rasterCache.set(cacheKey, null);
      return null;
    }
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    const { data } = ctx.getImageData(0, 0, width, height);
    const mono = rgbaToThermalMono(data, width, height);

    // Guard: refuse "empty" logos (all white after conversion)
    let blackBytes = 0;
    for (let i = 0; i < mono.binary.length; i++) {
      if (mono.binary[i]) blackBytes++;
    }
    if (blackBytes === 0) {
      rasterCache.set(cacheKey, null);
      return null;
    }

    const raster: ThermalLogoRaster = {
      width: mono.width,
      height: mono.height,
      widthBytes: mono.widthBytes,
      rasterBase64: bytesToBase64(mono.binary),
    };
    rasterCache.set(cacheKey, raster);
    return raster;
  } catch {
    rasterCache.set(cacheKey, null);
    return null;
  }
}

export function clearThermalLogoRasterCache(): void {
  rasterCache.clear();
}
