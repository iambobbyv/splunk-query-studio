/**
 * generate-icon.js — Splunk Query Studio professional icon generator
 *
 * Produces assets/icon.ico with 4 embedded sizes:
 *   16×16, 32×32, 48×48 → BMP (32-bit BGRA)
 *   256×256             → PNG (lossless, modern Windows / rcedit compatible)
 *
 * Design: Blue gradient rounded-rect background (#1e3a8a → #3b82f6)
 *         White anti-aliased magnifying glass (lens + handle)
 *         Matches the SQS header logo color scheme.
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

    /* Gradient rounded-rect background */
    background(cornerR, [r0,g0,b0], [r1,g1,b1]) {
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const rx = Math.max(0, cornerR - x,        x - (size - 1 - cornerR));
          const ry = Math.max(0, cornerR - y,        y - (size - 1 - cornerR));
          const d  = Math.sqrt(rx * rx + ry * ry);
          if (d > cornerR + 1) continue;
          const t = (x / (size - 1)) * 0.55 + (y / (size - 1)) * 0.45;
          const r = Math.round(r0 + (r1 - r0) * t);
          const g = Math.round(g0 + (g1 - g0) * t);
          const b = Math.round(b0 + (b1 - b0) * t);
          const alpha = d > cornerR - 1.5 ? Math.round(Math.max(0, cornerR - d) / 1.5 * 255) : 255;
          blend(x, y, r, g, b, alpha);
        }
      }
    },

    /* Subtle inner-circle tint */
    fillCircle(cx, cy, r, rr, gg, bb, a) {
      for (let y = Math.floor(cy - r - 2); y <= Math.ceil(cy + r + 2); y++)
        for (let x = Math.floor(cx - r - 2); x <= Math.ceil(cx + r + 2); x++) {
          const cov = Math.min(1, Math.max(0, r + 0.75 - Math.hypot(x - cx, y - cy)));
          if (cov > 0) blend(x, y, rr, gg, bb, Math.round(cov * a));
        }
    },

    /* Anti-aliased circle ring */
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

    /* Line segment with round caps */
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

    /* Get raw RGBA Uint8Array */
    getRGBA() { return buf; },
  };
}

/* ── Draw the SQS icon at any size ──────────────────────────────────────── */
function drawSQSIcon(size) {
  const cv = createCanvas(size);
  const s  = size / 256;

  /* Background: dark blue → bright blue gradient, rounded corners */
  cv.background(Math.round(52 * s), [0x1e, 0x3a, 0x8a], [0x3b, 0x82, 0xf6]);

  /* Magnifying glass geometry (tuned at 256px, scaled by s) */
  const cx     = Math.round(107 * s);   // lens center x
  const cy     = Math.round(105 * s);   // lens center y
  const outerR = Math.round(70  * s);   // outer lens radius
  const stroke = Math.round(19  * s);   // ring stroke width
  const innerR = outerR - stroke;

  /* Subtle inner-lens tint (white @10%) */
  cv.fillCircle(cx, cy, innerR - 1, 255, 255, 255, 25);

  /* White ring (the lens) */
  cv.strokeCircle(cx, cy, outerR, stroke, 255, 255, 255);

  /* Handle — 45° toward bottom-right, starting from lens edge */
  const ang = Math.PI * 0.25;
  const hx1 = cx + Math.cos(ang) * (outerR - stroke * 0.45);
  const hy1 = cy + Math.sin(ang) * (outerR - stroke * 0.45);
  const hLen = Math.round(60 * s);
  cv.strokeLine(hx1, hy1, hx1 + Math.cos(ang) * hLen, hy1 + Math.sin(ang) * hLen,
                stroke, 255, 255, 255);

  /* Top-left highlight shimmer on lens */
  cv.fillCircle(
    cx - Math.round(33 * s),
    cy - Math.round(33 * s),
    Math.round(11 * s),
    255, 255, 255, 45
  );

  return cv.getRGBA();
}

/* ── ICO entry builders ──────────────────────────────────────────────────── */
function bmpEntry(rgba, size) {
  /* RGBA → BGRA conversion */
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

  buf.writeUInt32LE(40,           o); o += 4;  // biSize
  buf.writeInt32LE (size,         o); o += 4;  // biWidth
  buf.writeInt32LE (size * 2,     o); o += 4;  // biHeight × 2 (ICO convention)
  buf.writeUInt16LE(1,            o); o += 2;  // biPlanes
  buf.writeUInt16LE(32,           o); o += 2;  // biBitCount
  buf.writeUInt32LE(0,            o); o += 4;  // biCompression (BI_RGB)
  buf.writeUInt32LE(0,            o); o += 4;  // biSizeImage (0 OK for BI_RGB)
  o += 16;                                      // skip XPels, YPels, ClrUsed, ClrImportant

  /* XOR (colour) data — BMP is stored bottom-to-top */
  for (let row = size - 1; row >= 0; row--) {
    bgra.copy(buf, o, row * size * 4, (row + 1) * size * 4);
    o += size * 4;
  }
  /* AND mask pre-zeroed (alpha channel handles transparency for 32-bit ICOs) */

  return { buf, size: total };
}

function pngEntry(rgba, size) {
  /* Filter bytes (0 = None) prepended to each row */
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
  ihdr[8] = 8; ihdr[9] = 6; /* 32-bit RGBA */

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

  ico.writeUInt16LE(0,            p); p += 2;  // reserved
  ico.writeUInt16LE(1,            p); p += 2;  // type = icon
  ico.writeUInt16LE(sizes.length, p); p += 2;

  sizes.forEach((sz, i) => {
    ico.writeUInt8(sz === 256 ? 0 : sz, p++);  // width  (0 → 256)
    ico.writeUInt8(sz === 256 ? 0 : sz, p++);  // height (0 → 256)
    ico.writeUInt8(0, p++);                     // colorCount
    ico.writeUInt8(0, p++);                     // reserved
    ico.writeUInt16LE(1,              p); p += 2;  // planes
    ico.writeUInt16LE(32,             p); p += 2;  // bitCount
    ico.writeUInt32LE(entries[i].size,p); p += 4;  // bytesInRes
    ico.writeUInt32LE(offsets[i],     p); p += 4;  // imageOffset
  });

  entries.forEach(e => { e.buf.copy(ico, p); p += e.size; });
  return ico;
}

/* ── Main ────────────────────────────────────────────────────────────────── */
const outPath = path.join(__dirname, 'icon.ico');
fs.writeFileSync(outPath, buildIco([16, 32, 48, 256]));

const kb = (fs.statSync(outPath).size / 1024).toFixed(1);
console.log(`✓ Created ${path.relative(process.cwd(), outPath)}  (${kb} KB)`);
console.log('  Sizes : 16×16, 32×32, 48×48 (BMP) · 256×256 (PNG)');
console.log('  Colors: #1e3a8a → #3b82f6 gradient · white magnifying glass\n');
