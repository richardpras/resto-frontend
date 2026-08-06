/**
 * Build brand icons from a crisp Capacitor-geometry SVG:
 * template greens (--sidebar-primary family), diagonal gradient, no grid dust.
 * All PNG sizes are downscaled from a 1024 master (sharp edges).
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, "..");

/** Template greens around --sidebar-primary (#70c292) → deeper same hue. */
const GREEN_LIGHT = "#8dceb0"; // hsl(145 40% 68%)
const GREEN_MID = "#70c292"; // --sidebar-primary hsl(145 40% 60%)
const GREEN_DARK = "#3d7a58"; // hsl(145 33% 36%), toward --primary forest

/** Official Capacitor mark paths (simple-icons), viewBox 0 0 24 24. */
const CAP_PATH =
  "M24 3.7l-5.766 5.766 5.725 5.736-3.713 3.712L5.073 3.742 8.786.03l5.736 5.726L20.284 0 24 3.7zM.029 8.785l3.713-3.713 15.173 15.173-3.713 3.714-5.732-5.726L3.7 24 0 20.285l5.754-5.764L.029 8.785z";

function fullIconSvg(size) {
  // Clear white margin around the mark (~52% of canvas).
  const pad = size * 0.24;
  const mark = size - pad * 2;
  const scale = mark / 24;
  const rx = size * 0.22;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${GREEN_LIGHT}"/>
      <stop offset="45%" stop-color="${GREEN_MID}"/>
      <stop offset="100%" stop-color="${GREEN_DARK}"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${rx}" ry="${rx}" fill="#FFFFFF"/>
  <g transform="translate(${pad},${pad}) scale(${scale})">
    <path fill="url(#g)" d="${CAP_PATH}"/>
  </g>
</svg>`;
}

function foregroundSvg(size) {
  // Adaptive foreground: mark in safe zone (~48% center).
  const pad = size * 0.26;
  const mark = size - pad * 2;
  const scale = mark / 24;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${GREEN_LIGHT}"/>
      <stop offset="45%" stop-color="${GREEN_MID}"/>
      <stop offset="100%" stop-color="${GREEN_DARK}"/>
    </linearGradient>
  </defs>
  <g transform="translate(${pad},${pad}) scale(${scale})">
    <path fill="url(#g)" d="${CAP_PATH}"/>
  </g>
</svg>`;
}

async function raster(kind, size) {
  // Render 4× then lanczos-downscale for cleaner edges than 1× SVG raster.
  const hi = size * 4;
  const source = kind === "fg" ? foregroundSvg(hi) : fullIconSvg(hi);
  return sharp(Buffer.from(source))
    .resize(size, size, { fit: "fill", kernel: sharp.kernel.lanczos3 })
    .png()
    .toBuffer();
}

async function writePng(buf, outPath, size, { transparent = false } = {}) {
  await fs.promises.mkdir(path.dirname(outPath), { recursive: true });
  await sharp(buf)
    .resize(size, size, {
      fit: "contain",
      kernel: sharp.kernel.lanczos3,
      background: transparent
        ? { r: 0, g: 0, b: 0, alpha: 0 }
        : { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .png()
    .toFile(outPath);
  console.log("wrote", outPath);
}

async function main() {
  const masterSize = 1024;
  const fullSvg = fullIconSvg(masterSize);
  const fgSvg = foregroundSvg(masterSize);

  fs.writeFileSync(path.join(__dirname, "_restohub-mark-full.svg"), fullSvg);
  fs.writeFileSync(path.join(__dirname, "_restohub-mark-fg.svg"), fgSvg);

  const masterFull = await raster("full", masterSize);
  const masterFg = await raster("fg", masterSize);

  const brandDir = path.join(webRoot, "public/brand");
  const assetsDir = path.join(webRoot, "src/assets/brand");
  await fs.promises.mkdir(brandDir, { recursive: true });
  await fs.promises.mkdir(assetsDir, { recursive: true });

  await writePng(masterFull, path.join(brandDir, "restohub-mark.png"), 256);
  await writePng(masterFull, path.join(brandDir, "restohub-mark-64.png"), 64);
  await writePng(masterFull, path.join(assetsDir, "restohub-mark.png"), 256);
  await writePng(masterFull, path.join(assetsDir, "restohub-mark-64.png"), 64);
  await writePng(masterFg, path.join(brandDir, "restohub-mark-fg.png"), 256, { transparent: true });

  await writePng(masterFull, path.join(webRoot, "public/icons/icon-192.png"), 192);
  await writePng(masterFull, path.join(webRoot, "public/icons/icon-512.png"), 512);
  await writePng(masterFull, path.join(webRoot, "public/icons/icon-maskable-512.png"), 512);
  await writePng(masterFull, path.join(webRoot, "public/favicon.ico"), 32);
  await writePng(masterFull, path.join(webRoot, "public/favicon.png"), 32);

  // Crisp SVG for web: gradient vector (not embedded raster)
  const webSvg = fullIconSvg(512);
  fs.writeFileSync(path.join(webRoot, "public/icons/icon.svg"), webSvg);
  console.log("wrote public/icons/icon.svg");

  const densities = [
    ["mdpi", 48, 108],
    ["hdpi", 72, 162],
    ["xhdpi", 96, 216],
    ["xxhdpi", 144, 324],
    ["xxxhdpi", 192, 432],
  ];
  for (const [dens, launcherSize, fgSize] of densities) {
    const dir = path.join(webRoot, `android/app/src/main/res/mipmap-${dens}`);
    await writePng(masterFull, path.join(dir, "ic_launcher.png"), launcherSize);
    await writePng(masterFull, path.join(dir, "ic_launcher_round.png"), launcherSize);
    await writePng(masterFg, path.join(dir, "ic_launcher_foreground.png"), fgSize, { transparent: true });
  }

  const splashTargets = [
    "drawable/splash.png",
    "drawable-port-mdpi/splash.png",
    "drawable-port-hdpi/splash.png",
    "drawable-port-xhdpi/splash.png",
    "drawable-port-xxhdpi/splash.png",
    "drawable-port-xxxhdpi/splash.png",
    "drawable-land-mdpi/splash.png",
    "drawable-land-hdpi/splash.png",
    "drawable-land-xhdpi/splash.png",
    "drawable-land-xxhdpi/splash.png",
    "drawable-land-xxxhdpi/splash.png",
  ];
  for (const rel of splashTargets) {
    const out = path.join(webRoot, "android/app/src/main/res", rel);
    if (!fs.existsSync(path.dirname(out))) continue;
    await writePng(masterFull, out, 512);
  }

  // Sanity: no pale grid dust
  const splash = path.join(webRoot, "android/app/src/main/res/drawable-port-xxxhdpi/splash.png");
  const { data, info } = await sharp(splash).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let nonWhiteNonGreen = 0;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    if (a < 200) continue;
    if (r >= 250 && g >= 250 && b >= 250) continue;
    // green mark: g dominant-ish
    if (g >= r && g >= b - 5 && g - Math.min(r, b) >= 20) continue;
    // rounded-corner AA against black viewer is white→transparent; allow near-white
    if (r > 230 && g > 230 && b > 230) continue;
    nonWhiteNonGreen++;
  }
  console.log("splash odd pixels:", nonWhiteNonGreen, "size", info.width);
  console.log("done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
