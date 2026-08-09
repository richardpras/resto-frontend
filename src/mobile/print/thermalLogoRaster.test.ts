import { describe, expect, it } from "vitest";
import { rgbaToThermalMono } from "./thermalLogoRaster";

function fillRgba(
  width: number,
  height: number,
  rgba: [number, number, number, number],
): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    data[i * 4] = rgba[0];
    data[i * 4 + 1] = rgba[1];
    data[i * 4 + 2] = rgba[2];
    data[i * 4 + 3] = rgba[3];
  }
  return data;
}

describe("rgbaToThermalMono", () => {
  it("keeps pastel mint logos printable (not all-white)", () => {
    // Approx logo palette: pale mint circle + teal icon body
    const width = 32;
    const height = 32;
    const data = fillRgba(width, height, [255, 255, 255, 255]);
    for (let y = 4; y < 28; y++) {
      for (let x = 4; x < 28; x++) {
        const dx = x - 15.5;
        const dy = y - 15.5;
        if (dx * dx + dy * dy > 12 * 12) continue;
        const idx = (y * width + x) * 4;
        const isIcon = Math.abs(x - 16) < 4 && y >= 10 && y <= 24;
        data[idx] = isIcon ? 20 : 200;
        data[idx + 1] = isIcon ? 140 : 240;
        data[idx + 2] = isIcon ? 120 : 220;
        data[idx + 3] = 255;
      }
    }

    const mono = rgbaToThermalMono(data, width, height);
    let black = 0;
    for (const b of mono.binary) {
      // count set bits roughly
      let v = b;
      while (v) {
        black += v & 1;
        v >>= 1;
      }
    }
    expect(black).toBeGreaterThan(20);
    expect(mono.height).toBeGreaterThan(1);
  });

  it("leaves pure white as empty ink", () => {
    const data = fillRgba(16, 16, [255, 255, 255, 255]);
    const mono = rgbaToThermalMono(data, 16, 16);
    expect(mono.binary.every((b) => b === 0)).toBe(true);
  });
});
