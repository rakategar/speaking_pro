// Regenerates every installed-app icon from a single source artwork onto an
// opaque WHITE canvas.
//
// Why this exists: the icons that shipped before were transparent PNGs whose
// transparent pixels stored RGB (0,0,0). iOS discards alpha for home-screen
// icons and several Android launchers flatten non-maskable icons the same
// way, so the logo composited onto black and the installed app looked like a
// black tile. manifest.background_color cannot rescue that -- it only paints
// the PWA startup splash, never the icon itself. So the white background has
// to be baked into the PNG here.
//
// Run with: npm run generate-icons
//
// `sharp` is not declared in package.json on purpose -- Next.js already ships
// it for image optimization, and this is a build-time-only utility, so
// declaring it would mean touching the lockfile of a live install for no
// runtime benefit. If a future Next.js version drops it, add it under
// devDependencies then.

import sharp from "sharp";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = path.join(root, "public", "icons", "src-logo.png");
const OUT_DIR = path.join(root, "public", "icons");
const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };

// `ratio` is the artwork's longest side as a share of the canvas. The logo is
// taller than it is wide, so measuring the bounding box (rather than width)
// is what reproduces the framing the previous hand-authored icons had:
// "any" icons nearly fill the tile, maskable ones sit well inside the 80%
// safe zone a launcher may crop to.
const TARGETS = [
  { file: "icon-192.png", size: 192, ratio: 0.87 },
  { file: "icon-512.png", size: 512, ratio: 0.87 },
  { file: "icon-192-maskable.png", size: 192, ratio: 0.59 },
  { file: "icon-512-maskable.png", size: 512, ratio: 0.59 },
  { file: "apple-touch-icon.png", size: 180, ratio: 0.72 },
];

// Trim the source's transparent margin first so `ratio` measures the actual
// artwork rather than whatever padding the source file happens to carry.
const artwork = await sharp(SOURCE).trim().toBuffer();

for (const { file, size, ratio } of TARGETS) {
  const inner = Math.round(size * ratio);
  const logo = await sharp(artwork)
    .resize(inner, inner, { fit: "inside", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();
  const { width = inner, height = inner } = await sharp(logo).metadata();

  await sharp({ create: { width: size, height: size, channels: 4, background: WHITE } })
    .composite([
      {
        input: logo,
        left: Math.round((size - width) / 2),
        top: Math.round((size - height) / 2),
      },
    ])
    // Belt and braces: the canvas is already opaque white, but flatten()
    // composites any stray transparency onto white and removeAlpha() drops
    // the channel entirely, so no downstream consumer can reinterpret this
    // icon against black -- which is the whole point of the fix.
    .flatten({ background: WHITE })
    .removeAlpha()
    .png({ compressionLevel: 9 })
    .toFile(path.join(OUT_DIR, file));

  console.log(`wrote ${file} (${size}x${size}, artwork ${width}x${height})`);
}
