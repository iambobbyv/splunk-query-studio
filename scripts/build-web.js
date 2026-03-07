/**
 * build-web.js — Copy web assets into www/ for Capacitor (iOS / iPadOS) builds.
 *
 * What goes in www/:
 *   index.html                ← app shell (no Electron-specific code)
 *   renderer/**               ← all JS modules + CSS
 *   assets/spl-knowledge.json ← AI knowledge base
 *
 * Excluded (Electron-only, not meaningful in a Capacitor webview):
 *   main.js, preload.js, splash.html, node_modules/, dist/, ios/, android/
 *
 * Usage:  node scripts/build-web.js
 *         npm run build:web
 */
'use strict';

const fs   = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const WWW  = path.join(ROOT, 'www');

/* ── Clean + recreate www/ ───────────────────────────────────────────────── */
if (fs.existsSync(WWW)) {
  fs.rmSync(WWW, { recursive: true, force: true });
  console.log('  Cleaned www/');
}
fs.mkdirSync(WWW);

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function cp(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function cpDir(src, dest) {
  if (!fs.existsSync(src)) {
    console.warn(`  ⚠  Skipped (not found): ${path.relative(ROOT, src)}`);
    return;
  }
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    entry.isDirectory() ? cpDir(s, d) : cp(s, d);
  }
}

function countFiles(dir) {
  let n = 0;
  for (const e of fs.readdirSync(dir, { withFileTypes: true }))
    n += e.isDirectory() ? countFiles(path.join(dir, e.name)) : 1;
  return n;
}

/* ── Copy ────────────────────────────────────────────────────────────────── */
// HTML shell (no Electron APIs — the app already has navigator.clipboard fallbacks)
cp(path.join(ROOT, 'index.html'),
   path.join(WWW,  'index.html'));

// All renderer JS modules + CSS
cpDir(path.join(ROOT, 'renderer'),
      path.join(WWW,  'renderer'));

// AI knowledge base (fetched by ai-assistant.js via import.meta.url-relative path)
cp(path.join(ROOT, 'assets', 'spl-knowledge.json'),
   path.join(WWW,  'assets', 'spl-knowledge.json'));

// SPL Query Library — 40 curated queries (fetched by renderer/js/library.js)
cp(path.join(ROOT, 'assets', 'spl-library.json'),
   path.join(WWW,  'assets', 'spl-library.json'));

/* ── Report ──────────────────────────────────────────────────────────────── */
console.log(`✓ www/  →  ${countFiles(WWW)} files ready for Capacitor`);
console.log('  Next:  npx cap sync  (on macOS with Xcode + CocoaPods)');
