// Renders MoneyMap's logo mark (same shape as public/favicon.svg and
// Logo.tsx: a ring, a four-point sparkle, and a punched-out center dot) to
// PNG app icons, at whatever sizes the PWA manifest, iOS and the Android app
// (launcher icons + splash screens under android/, once `npx cap add
// android` has created it) need. No image
// libraries — just pixel math (supersampled 4x then box-downsampled for
// anti-aliasing) and a minimal hand-rolled PNG encoder built on Node's
// built-in zlib, since installing a native image dependency isn't worth it
// for three static files that basically never change.
//
// Run with: node scripts/generate-icons.mjs

import { existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'public', 'icons');
const ANDROID_RES = join(__dirname, '..', 'android', 'app', 'src', 'main', 'res');
mkdirSync(OUT_DIR, { recursive: true });

// Brand colors — must match src/index.css's --color-ink / --color-verdigris
// (dark theme values; icons are static files so they can't follow the
// light/dark toggle, and dark-on-brand is the app's primary identity).
const INK = [0x0d, 0x13, 0x21];
const VERDIGRIS = [0x4f, 0xa0, 0x8f];

function blend(bg, fg, alpha) {
  return [
    Math.round(bg[0] + (fg[0] - bg[0]) * alpha),
    Math.round(bg[1] + (fg[1] - bg[1]) * alpha),
    Math.round(bg[2] + (fg[2] - bg[2]) * alpha),
  ];
}

// The sparkle's 8 vertices as (dx, dy) offsets from center, copied straight
// from favicon.svg's path (which is drawn in a 32x32 viewBox centered at
// 16,16) — e.g. (16,8.5) becomes (0,-7.5). Reused as-is; only the scale
// factor changes per output size.
const SPARKLE = [
  [0, -7.5],
  [2.4, -1.4],
  [8, 0],
  [2.4, 1.4],
  [0, 7.5],
  [-2.4, 1.4],
  [-8, 0],
  [-2.4, -1.4],
];

function pointInPolygon(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    const crosses = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (crosses) inside = !inside;
  }
  return inside;
}

/** Renders the mark centered on a `width`x`height` ink canvas as RGBA (always
 *  opaque — every icon fills its whole area with the ink background, which is
 *  what both Android's maskable-icon safe zone and Apple's "no transparency"
 *  rule for touch icons want). `markScale` shrinks the mark relative to the
 *  canvas's shorter side: 1 for a plain icon, less for an adaptive-icon
 *  foreground (whose outer third gets masked off) or a splash screen. */
function renderIcon(width, height = width, markScale = 1) {
  // Big splash screens don't need 4x supersampling to look smooth, and it'd
  // mean buffers in the hundreds of MB.
  const SUPERSAMPLE = width * height > 1_000_000 ? 2 : 4;
  const workW = width * SUPERSAMPLE;
  const workH = height * SUPERSAMPLE;
  const half = (Math.min(width, height) / 2) * markScale;
  // favicon.svg's mark is drawn relative to a center-16 (half of its
  // 32-viewBox); this maps those source units onto this icon's own half-size.
  const unit = half / 16;

  const ringRadius = 10.5 * unit;
  const ringStroke = 1.6 * unit; // a touch thicker than the source ratio so it still reads at 192px
  const dotRadius = 2.1 * unit;
  const sparkle = SPARKLE.map(([dx, dy]) => [dx * unit, dy * unit]);

  const raw = Buffer.alloc(workW * workH * 3);

  for (let y = 0; y < workH; y++) {
    for (let x = 0; x < workW; x++) {
      const fx = x / SUPERSAMPLE - width / 2;
      const fy = y / SUPERSAMPLE - height / 2;
      const dist = Math.hypot(fx, fy);

      let color = INK;
      if (Math.abs(dist - ringRadius) <= ringStroke / 2) color = blend(INK, VERDIGRIS, 0.45);
      if (pointInPolygon(fx, fy, sparkle)) color = VERDIGRIS;
      if (dist <= dotRadius) color = INK;

      const i = (y * workW + x) * 3;
      raw[i] = color[0];
      raw[i + 1] = color[1];
      raw[i + 2] = color[2];
    }
  }

  // Box-downsample the working size -> output size for anti-aliased edges.
  const out = Buffer.alloc(width * height * 4);
  const n = SUPERSAMPLE * SUPERSAMPLE;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      for (let sy = 0; sy < SUPERSAMPLE; sy++) {
        for (let sx = 0; sx < SUPERSAMPLE; sx++) {
          const i = ((y * SUPERSAMPLE + sy) * workW + (x * SUPERSAMPLE + sx)) * 3;
          r += raw[i];
          g += raw[i + 1];
          b += raw[i + 2];
        }
      }
      const o = (y * width + x) * 4;
      out[o] = Math.round(r / n);
      out[o + 1] = Math.round(g / n);
      out[o + 2] = Math.round(b / n);
      out[o + 3] = 255;
    }
  }
  return out;
}

// --- Minimal PNG encoder: 8-bit RGBA, no interlacing, one IDAT chunk. ---
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePng(width, height, rgba) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type: RGBA
  // bytes 10-12 (compression, filter, interlace) already zero.
  const ihdr = pngChunk('IHDR', ihdrData);

  const stride = width * 4;
  const filtered = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    filtered[y * (stride + 1)] = 0; // filter type: none
    rgba.copy(filtered, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = pngChunk('IDAT', deflateSync(filtered));
  const iend = pngChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

function writeIcon(path, width, height = width, markScale = 1) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, encodePng(width, height, renderIcon(width, height, markScale)));
  console.log(`wrote ${path}`);
}

for (const size of [192, 512, 180]) {
  const name = size === 180 ? 'apple-touch-icon.png' : `icon-${size}.png`;
  writeIcon(join(OUT_DIR, name), size);
}

if (existsSync(ANDROID_RES)) {
  // Launcher icons: legacy square/round at 48dp, adaptive foreground at
  // 108dp with the mark shrunk into the ~66dp that survives every
  // launcher's mask (the background layer is the same ink, set in
  // values/ic_launcher_background.xml).
  const DENSITIES = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
  for (const [density, factor] of Object.entries(DENSITIES)) {
    const dir = join(ANDROID_RES, `mipmap-${density}`);
    writeIcon(join(dir, 'ic_launcher.png'), 48 * factor);
    writeIcon(join(dir, 'ic_launcher_round.png'), 48 * factor);
    writeIcon(join(dir, 'ic_launcher_foreground.png'), 108 * factor, 108 * factor, 0.6);
  }

  // Splash screens (pre-Android 12; 12+ draws the launcher icon instead),
  // at the same sizes Capacitor's template ships.
  const SPLASH = {
    'drawable': [480, 320],
    'drawable-land-mdpi': [480, 320],
    'drawable-land-hdpi': [800, 480],
    'drawable-land-xhdpi': [1280, 720],
    'drawable-land-xxhdpi': [1600, 960],
    'drawable-land-xxxhdpi': [1920, 1280],
    'drawable-port-mdpi': [320, 480],
    'drawable-port-hdpi': [480, 800],
    'drawable-port-xhdpi': [720, 1280],
    'drawable-port-xxhdpi': [960, 1600],
    'drawable-port-xxxhdpi': [1280, 1920],
  };
  for (const [dir, [w, h]] of Object.entries(SPLASH)) {
    writeIcon(join(ANDROID_RES, dir, 'splash.png'), w, h, 0.3);
  }
}
