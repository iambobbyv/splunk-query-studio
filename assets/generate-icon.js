/**
 * generate-icon.js — Splunk Query Studio "SQS" branded icon generator
 *
 * Produces assets/icon.ico with 4 embedded sizes:
 *   16×16, 32×32, 48×48 → BMP (32-bit BGRA)
 *   256×256             → PNG (lossless, modern Windows / rcedit compatible)
 *
 * Design (256px):
 *   • Dark navy-to-deep-blue gradient background with rounded corners
 *   • 5×7 pixel-font "SQS" centred — S (white), Q (cyan), S (white)
 *   • Subtle inner-glow ring
 *
 * Design (≤48px):
 *   • Magnifying-glass mark (recognisable at tiny sizes)
 *
 * Usage: node assets/generate-icon.js
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const zlib = require('zlib');

/* ── CRC32 (needed for PNG chunks) ─────────────────────────────────────── */
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf, start = 0, len = buf.length - start) {
  let crc = 0xffffffff;
  for (let i = start; i < start + len; i++)
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ buf[i]) & 0xff];
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const dLen = data ? data.length : 0;
  const buf  = Buffer.alloc(4 + 4 + dLen + 4);
  buf.writeUInt32BE(dLen, 0);
  buf.write(type, 4, 'ascii');
  if (dLen) data.copy(buf, 8);
  buf.writeUInt32BE(crc32(buf, 4, 4 + dLen), 8 + dLen);
  return buf;
}

/* ── Pixel canvas (RGBA) ─────────────────────────────────────────────────── */
function createCanvas(size) {
  const buf = new Uint8Array(size * size * 4);

  function clamp(v) { return v < 0 ? 0 : v > 255 ? 255 : v; }

  function blend(x, y, r, g, b, a) {
    if (x < 0 || x >= size || y < 0 || y >= size || a <= 0) return;
    const i  = (y * size + x) * 4;
    if (a >= 255) { buf[i] = r; buf[i+1] = g; buf[i+2] = b; buf[i+3] = 255; return; }
    const sa = a / 255, da = buf[i+3] / 255, oa = sa + da * (1 - sa);
    if (oa < 0.001) return;
    buf[i]   = clamp(Math.round((r * sa + buf[i]   * da * (1 - sa)) / oa));
    buf[i+1] = clamp(Math.round((g * sa + buf[i+1] * da * (1 - sa)) / oa));
    buf[i+2] = clamp(Math.round((b * sa + buf[i+2] * da * (1 - sa)) / oa));
    buf[i+3] = clamp(Math.round(oa * 255));
  }

  return {
    buf,
    size,

    background(cornerR, [r0,g0,b0], [r1,g1,b1]) {
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const rx = Math.max(0, cornerR - x,        x - (size - 1 - cornerR));
          const ry = Math.max(0, cornerR - y,        y - (size - 1 - cornerR));
          const d  = Math.sqrt(rx * rx + ry * ry);
          if (d > cornerR + 1) continue;
          const t = (x / (size - 1)) * 0.5 + (y / (size - 1)) * 0.5;
          const r = Math.round(r0 + (r1 - r0) * t);
          const g = Math.round(g0 + (g1 - g0) * t);
          const b = Math.round(b0 + (b1 - b0) * t);
          const alpha = d > cornerR - 1.5 ? Math.round(Math.max(0, cornerR - d) / 1.5 * 255) : 255;
          blend(x, y, r, g, b, alpha);
        }
      }
    },

    fillCircle(cx, cy, r, rr, gg, bb, a) {
      for (let y = Math.floor(cy - r - 2); y <= Math.ceil(cy + r + 2); y++)
        for (let x = Math.floor(cx - r - 2); x <= Math.ceil(cx + r + 2); x++) {
          const cov = Math.min(1, Math.max(0, r + 0.75 - Math.hypot(x - cx, y - cy)));
          if (cov > 0) blend(x, y, rr, gg, bb, Math.round(cov * a));
        }
    },

    strokeCircle(cx, cy, outerR, thickness, rr, gg, bb) {
      const innerR = outerR - thickness;
      for (let y = Math.floor(cy - outerR - 2); y <= Math.ceil(cy + outerR + 2); y++)
        for (let x = Math.floor(cx - outerR - 2); x <= Math.ceil(cx + outerR + 2); x++) {
          const d = Math.hypot(x - cx, y - cy);
          const oa = Math.min(1, Math.max(0, outerR + 0.75 - d));
          const ia = Math.min(1, Math.max(0, d - innerR + 0.75));
          const cov = oa * ia;
          if (cov > 0) blend(x, y, rr, gg, bb, Math.round(cov * 255));
        }
    },

    strokeLine(x1, y1, x2, y2, width, rr, gg, bb) {
      const dx = x2 - x1, dy = y2 - y1;
      const len = Math.hypot(dx, dy) || 1;
      const ux = dx / len, uy = dy / len;
      const hw  = width / 2;
      const pad = Math.ceil(hw) + 2;
      for (let y = Math.floor(Math.min(y1, y2) - pad); y <= Math.ceil(Math.max(y1, y2) + pad); y++)
        for (let x = Math.floor(Math.min(x1, x2) - pad); x <= Math.ceil(Math.max(x1, x2) + pad); x++) {
          const t  = Math.min(len, Math.max(0, (x - x1) * ux + (y - y1) * uy));
          const d  = Math.hypot(x - x1 - t * ux, y - y1 - t * uy);
          const cov = Math.min(1, Math.max(0, hw + 0.75 - d));
          if (cov > 0) blend(x, y, rr, gg, bb, Math.round(cov * 255));
        }
    },

    getRGBA() { return buf; },
  };
}

/* ── 5×7 Pixel font bitmaps (bit 4 = leftmost column) ───────────────────── */
const GLYPHS = {
  //  col: 43210
  S: [
    0b01110,   // .███.
    0b10000,   // █....
    0b10000,   // █....
    0b01110,   // .███.
    0b00001,   // ....█
    0b00001,   // ....█
    0b01110,   // .███.
  ],
  Q: [
    0b01110,   // .███.
    0b10001,   // █...█
    0b10001,   // █...█
    0b10001,   // █...█
    0b10101,   // █.█.█
    0b10011,   // █..██
    0b01110,   // .███.
  ],
};

/**
 * Draw a single glyph using filled anti-aliased circles for each "pixel".
 * @param {object} cv       canvas object
 * @param {'S'|'Q'} glyph  letter to draw
 * @param {number} startX   top-left x of letter bounding box
 * @param {number} startY   top-left y of letter bounding box
 * @param {number} ps       pixel cell size (px)
 * @param {number} r,g,b   RGB colour
 * @param {number} alpha    opacity 0-255
 */
function drawGlyph(cv, glyph, startX, startY, ps, r, g, b, alpha = 255) {
  const rows = GLYPHS[glyph];
  const half = ps * 0.48;
  for (let row = 0; row < rows.length; row++) {
    for (let col = 0; col < 5; col++) {
      if (rows[row] & (1 << (4 - col))) {
        const cx = startX + col * ps + half;
        const cy = startY + row * ps + half;
        cv.fillCircle(cx, cy, half * 0.92, r, g, b, alpha);
      }
    }
  }
}

/* ── Draw the SQS icon at any size ──────────────────────────────────────── */
function drawSQSIcon(size) {
  const cv = createCanvas(size);
  const sc = size / 256;

  /* Background: dark navy → rich blue, 44px corner radius (scaled) */
  cv.background(Math.round(44 * sc), [0x06, 0x0a, 0x2e], [0x1a, 0x3a, 0x9a]);

  if (size >= 96) {
    /* ──────────────────── LARGE: SQS pixel font ────────────────────── */

    // Pixel cell size — at 256px, ps=13 makes the font span ~225px wide
    const ps   = Math.round(13 * sc);          // cell size
    const gW   = 5 * ps;                        // glyph width  (5 cols)
    const gH   = 7 * ps;                        // glyph height (7 rows)
    const gap  = Math.round(9 * sc);            // gap between letters
    const totalW = 3 * gW + 2 * gap;

    const ox = Math.round((size - totalW) / 2); // left edge of S
    const oy = Math.round((size - gH) / 2);     // top edge of all letters

    /* Subtle inner glow ring behind text */
    cv.fillCircle(size / 2, size / 2, size * 0.36, 59, 130, 246, 22);
    cv.fillCircle(size / 2, size / 2, size * 0.22, 59, 130, 246, 14);

    /* Shimmer dot top-right */
    cv.fillCircle(size * 0.78, size * 0.20, size * 0.04, 255, 255, 255, 35);

    /* S (left) — white */
    drawGlyph(cv, 'S', ox,              oy, ps, 255, 255, 255);

    /* Q (centre) — cyan (#7dd3fc) */
    drawGlyph(cv, 'Q', ox + gW + gap,   oy, ps, 125, 211, 252);

    /* S (right) — white */
    drawGlyph(cv, 'S', ox + 2*(gW+gap), oy, ps, 255, 255, 255);

  } else {
    /* ────────────────────── SMALL: magnifying glass ─────────────────── */
    const cx     = Math.round(107 * sc);
    const cy     = Math.round(105 * sc);
    const outerR = Math.round(70  * sc);
    const stroke = Math.round(19  * sc);
    const innerR = outerR - stroke;

    cv.fillCircle(cx, cy, innerR - 1, 255, 255, 255, 25);
    cv.strokeCircle(cx, cy, outerR, stroke, 255, 255, 255);

    const ang = Math.PI * 0.25;
    const hx1 = cx + Math.cos(ang) * (outerR - stroke * 0.45);
    const hy1 = cy + Math.sin(ang) * (outerR - stroke * 0.45);
    const hLen = Math.round(60 * sc);
    cv.strokeLine(hx1, hy1, hx1 + Math.cos(ang) * hLen, hy1 + Math.sin(ang) * hLen,
                  stroke, 255, 255, 255);

    cv.fillCircle(
      cx - Math.round(28 * sc),
      cy - Math.round(28 * sc),
      Math.round(10 * sc),
      255, 255, 255, 40
    );
  }

  return cv.getRGBA();
}

/* ── ICO entry builders ──────────────────────────────────────────────────── */
function bmpEntry(rgba, size) {
  const bgra = Buffer.alloc(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    bgra[i*4]   = rgba[i*4 + 2];
    bgra[i*4+1] = rgba[i*4 + 1];
    bgra[i*4+2] = rgba[i*4 + 0];
    bgra[i*4+3] = rgba[i*4 + 3];
  }

  const andRowBytes   = Math.ceil(Math.ceil(size / 8) / 4) * 4;
  const andDataSize   = andRowBytes * size;
  const pixelDataSize = size * size * 4;
  const total         = 40 + pixelDataSize + andDataSize;
  const buf           = Buffer.alloc(total, 0);
  let o = 0;

  buf.writeUInt32LE(40,       o); o += 4;
  buf.writeInt32LE (size,     o); o += 4;
  buf.writeInt32LE (size * 2, o); o += 4;
  buf.writeUInt16LE(1,        o); o += 2;
  buf.writeUInt16LE(32,       o); o += 2;
  buf.writeUInt32LE(0,        o); o += 4;
  buf.writeUInt32LE(0,        o); o += 4;
  o += 16;

  for (let row = size - 1; row >= 0; row--) {
    bgra.copy(buf, o, row * size * 4, (row + 1) * size * 4);
    o += size * 4;
  }

  return { buf, size: total };
}

function pngEntry(rgba, size) {
  const rowLen = 1 + size * 4;
  const raw    = Buffer.alloc(size * rowLen);
  for (let y = 0; y < size; y++) {
    raw[y * rowLen] = 0;
    for (let x = 0; x < size; x++) {
      const s = (y * size + x) * 4;
      const d = y * rowLen + 1 + x * 4;
      raw[d]   = rgba[s];   raw[d+1] = rgba[s+1];
      raw[d+2] = rgba[s+2]; raw[d+3] = rgba[s+3];
    }
  }
  const compressed = zlib.deflateSync(raw, { level: 9 });

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6;

  const data = Buffer.concat([
    Buffer.from([137,80,78,71,13,10,26,10]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', null),
  ]);
  return { buf: data, size: data.length };
}

/* ── Assemble multi-size ICO ─────────────────────────────────────────────── */
function buildIco(sizes) {
  const entries = sizes.map(sz => {
    const rgba = drawSQSIcon(sz);
    return sz === 256 ? pngEntry(rgba, sz) : bmpEntry(rgba, sz);
  });

  const dirSz   = 6 + sizes.length * 16;
  let   offset  = dirSz;
  const offsets = entries.map(e => { const o = offset; offset += e.size; return o; });

  const ico = Buffer.alloc(offset);
  let p = 0;

  ico.writeUInt16LE(0,            p); p += 2;
  ico.writeUInt16LE(1,            p); p += 2;
  ico.writeUInt16LE(sizes.length, p); p += 2;

  sizes.forEach((sz, i) => {
    ico.writeUInt8(sz === 256 ? 0 : sz, p++);
    ico.writeUInt8(sz === 256 ? 0 : sz, p++);
    ico.writeUInt8(0, p++);
    ico.writeUInt8(0, p++);
    ico.writeUInt16LE(1,              p); p += 2;
    ico.writeUInt16LE(32,             p); p += 2;
    ico.writeUInt32LE(entries[i].size,p); p += 4;
    ico.writeUInt32LE(offsets[i],     p); p += 4;
  });

  entries.forEach(e => { e.buf.copy(ico, p); p += e.size; });
  return ico;
}

/* ── Main ────────────────────────────────────────────────────────────────── */
const outPath = path.join(__dirname, 'icon.ico');
fs.writeFileSync(outPath, buildIco([16, 32, 48, 256]));

const kb = (fs.statSync(outPath).size / 1024).toFixed(1);
console.log(`✓ Created ${path.relative(process.cwd(), outPath)}  (${kb} KB)`);
console.log('  Sizes : 16×16, 32×32, 48×48 (magnifying glass · BMP)');
console.log('  Size  : 256×256 (SQS pixel font · PNG)');
console.log('  Colors: #060a2e → #1a3a9a background · white S · cyan Q · white S\n');
