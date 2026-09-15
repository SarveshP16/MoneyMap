// Renders MoneyMap's logo mark (same shape as public/favicon.svg and
// Logo.tsx: a ring, a four-point sparkle, and a punched-out center dot) to
// PNG app icons, at whatever sizes the PWA manifest and iOS need. No image
// libraries — just pixel math (supersampled 4x then box-downsampled for
// anti-aliasing) and a minimal hand-rolled PNG encoder built on Node's
// built-in zlib, since installing a native image dependency isn't worth it
// for three static files that basically never change.
//
// Run with: node scripts/generate-icons.mjs

import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'public', 'icons');
mkdirSync(OUT_DIR, { recursive: true });

// Brand colors — must match src/index.css's --color-ink / --color-amber
// (dark theme values; icons are static files so they can't follow the
// light/dark toggle, and dark-on-brand is the app's primary identity).
const INK = [0x0d, 0x13, 0x21];
const AMBER = [0xe8, 0xa3, 0x3d];

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

/** Renders one icon at `size`x`size` as a flat RGB buffer (no alpha — every
 *  icon fills its whole square with the ink background, which is what both
 *  Android's maskable-icon safe zone and Apple's "no transparency" rule for
 *  touch icons want). */
function renderIcon(size) {
  const SUPERSAMPLE = 4;
  const workingSize = size * SUPERSAMPLE;
  const half = size / 2;
  // favicon.svg's mark is drawn relative to a center-16 (half of its
  // 32-viewBox); this maps those source units onto this icon's own half-size.
  const unit = half / 16;

  const ringRadius = 10.5 * unit;
  const ringStroke = 1.6 * unit; // a touch thicker than the source ratio so it still reads at 192px
  const dotRadius = 2.1 * unit;
  const sparkle = SPARKLE.map(([dx, dy]) => [dx * unit, dy * unit]);

  const raw = Buffer.alloc(workingSize * workingSize * 3);

  for (let y = 0; y < workingSize; y++) {
    for (let x = 0; x < workingSize; x++) {
      const fx = x / SUPERSAMPLE - half;
      const fy = y / SUPERSAMPLE - half;
      const dist = Math.hypot(fx, fy);

      let color = INK;
      if (Math.abs(dist - ringRadius) <= ringStroke / 2) color = blend(INK, AMBER, 0.45);
      if (pointInPolygon(fx, fy, sparkle)) color = AMBER;
      if (dist <= dotRadius) color = INK;

      const i = (y * workingSize + x) * 3;
      raw[i] = color[0];
      raw[i + 1] = color[1];
      raw[i + 2] = color[2];
    }
  }

  // Box-downsample workingSize -> size for anti-aliased edges.
  const out = Buffer.alloc(size * size * 4);
  const n = SUPERSAMPLE * SUPERSAMPLE;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      for (let sy = 0; sy < SUPERSAMPLE; sy++) {
        for (let sx = 0; sx < SUPERSAMPLE; sx++) {
          const i = ((y * SUPERSAMPLE + sy) * workingSize + (x * SUPERSAMPLE + sx)) * 3;
          r += raw[i];
          g += raw[i + 1];
          b += raw[i + 2];
        }
      }
      const o = (y * size + x) * 4;
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

function encodePng(size, rgba) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0);
  ihdrData.writeUInt32BE(size, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type: RGBA
  // bytes 10-12 (compression, filter, interlace) already zero.
  const ihdr = pngChunk('IHDR', ihdrData);

  const stride = size * 4;
  const filtered = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    filtered[y * (stride + 1)] = 0; // filter type: none
    rgba.copy(filtered, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = pngChunk('IDAT', deflateSync(filtered));
  const iend = pngChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

for (const size of [192, 512, 180]) {
  const png = encodePng(size, renderIcon(size));
  const name = size === 180 ? 'apple-touch-icon.png' : `icon-${size}.png`;
  writeFileSync(join(OUT_DIR, name), png);
  console.log(`wrote public/icons/${name} (${png.length} bytes)`);
}
