/**
 * setup-check.js — Splunk Query Studio: Project Verification & Setup
 *
 * Checks that every required file, directory, and dependency is present
 * and not a placeholder. Auto-fixes what it can (icon, missing dirs).
 *
 * Usage : node setup-check.js
 * Flags : --fix   (attempt auto-repairs, e.g. regenerate icon)
 *         --quiet (errors only)
 *
 * IMPORTANT: Keep this file in sync with every app update.
 * It documents the canonical file layout for restore/onboarding.
 *
 * Last updated: 2026-02-28 · v1.0.0
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT  = __dirname;
const FIX   = process.argv.includes('--fix');
const QUIET = process.argv.includes('--quiet');

/* ── colour helpers ──────────────────────────────────────────────────────── */
const C = {
  reset:  '\x1b[0m',
  green:  '\x1b[32m',
  red:    '\x1b[31m',
  yellow: '\x1b[33m',
  cyan:   '\x1b[36m',
  bold:   '\x1b[1m',
  dim:    '\x1b[2m',
};
const ok    = (msg) => !QUIET && console.log(`  ${C.green}✅${C.reset}  ${msg}`);
const warn  = (msg) =>           console.log(`  ${C.yellow}⚠️ ${C.reset}  ${msg}`);
const fail  = (msg) =>           console.log(`  ${C.red}❌${C.reset}  ${msg}`);
const info  = (msg) => !QUIET && console.log(`${C.dim}${msg}${C.reset}`);
const head  = (msg) =>           console.log(`\n${C.bold}${C.cyan}${msg}${C.reset}`);
const sep   = ()    => !QUIET && console.log(C.dim + '─'.repeat(54) + C.reset);

function kb(bytes) { return (bytes / 1024).toFixed(1) + ' KB'; }

/* ── stat helpers ────────────────────────────────────────────────────────── */
function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}
function size(rel) {
  try { return fs.statSync(path.join(ROOT, rel)).size; } catch { return 0; }
}
function isDir(rel) {
  try { return fs.statSync(path.join(ROOT, rel)).isDirectory(); } catch { return false; }
}

/* ── result tracking ─────────────────────────────────────────────────────── */
let failures = 0;
let warnings = 0;

function checkFile(rel, { minBytes = 50, label, fixCmd } = {}) {
  const fullPath = path.join(ROOT, rel);
  const display  = label ?? rel;

  if (!exists(rel)) {
    fail(`MISSING  ${display}`);
    failures++;
    if (FIX && fixCmd) {
      try {
        console.log(`         → Running: ${fixCmd}`);
        execSync(fixCmd, { cwd: ROOT, stdio: 'inherit' });
        ok(`FIXED    ${display}`);
        failures--;
      } catch {
        fail(`FIX FAILED for ${display}`);
      }
    }
    return false;
  }

  const bytes = size(rel);
  if (bytes < minBytes) {
    warn(`TOO SMALL  ${display}  (${kb(bytes)} — expected ≥${kb(minBytes)})`);
    warnings++;
    if (FIX && fixCmd) {
      try {
        execSync(fixCmd, { cwd: ROOT, stdio: 'inherit' });
        ok(`FIXED    ${display}`);
        warnings--;
      } catch {
        fail(`FIX FAILED for ${display}`);
      }
    }
    return false;
  }

  ok(`${display.padEnd(42)}${C.dim}${kb(bytes)}${C.reset}`);
  return true;
}

function checkDir(rel) {
  if (!isDir(rel)) {
    fail(`MISSING DIR  ${rel}/`);
    failures++;
    if (FIX) {
      fs.mkdirSync(path.join(ROOT, rel), { recursive: true });
      ok(`CREATED DIR  ${rel}/`);
      failures--;
    }
    return false;
  }
  ok(`${(rel + '/').padEnd(42)}${C.dim}directory${C.reset}`);
  return true;
}

function checkPkg(field, expected) {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    const val = field.split('.').reduce((o, k) => o?.[k], pkg);
    if (!val) { fail(`package.json missing: ${field}`); failures++; return; }
    if (expected && val !== expected) {
      warn(`package.json ${field} = "${val}" (expected "${expected}")`);
      warnings++;
      return;
    }
    ok(`package.json ${field.padEnd(26)}${C.dim}"${val}"${C.reset}`);
  } catch (e) {
    fail(`Cannot read package.json: ${e.message}`);
    failures++;
  }
}

function checkYml(field, expected) {
  try {
    const raw = fs.readFileSync(path.join(ROOT, 'electron-builder.yml'), 'utf8');
    if (!raw.includes(expected)) {
      fail(`electron-builder.yml missing: ${field} = ${expected}`);
      failures++;
    } else {
      ok(`electron-builder.yml ${field.padEnd(22)}${C.dim}${expected}${C.reset}`);
    }
  } catch {
    fail(`Cannot read electron-builder.yml`);
    failures++;
  }
}

function checkNodeMod(pkg) {
  const modPath = path.join(ROOT, 'node_modules', pkg);
  if (!fs.existsSync(modPath)) {
    fail(`node_modules/${pkg}  NOT INSTALLED  → run: npm install`);
    failures++;
  } else {
    ok(`node_modules/${pkg.padEnd(28)}${C.dim}installed${C.reset}`);
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   RUN CHECKS
   ══════════════════════════════════════════════════════════════════════════ */

console.log(`\n${C.bold}${C.cyan}Splunk Query Studio — Setup Verification${C.reset}`);
console.log(`${C.dim}v1.0.0 · ${new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' })}${C.reset}`);
if (FIX)   console.log(`${C.yellow}⚡ Auto-fix mode enabled${C.reset}`);
if (QUIET) console.log(`${C.dim}(quiet mode — only warnings/errors shown)${C.reset}`);

/* ── Directories ──────────────────────────────────────────────────────── */
head('Directories');
sep();
checkDir('renderer');
checkDir('renderer/styles');
checkDir('renderer/js');
checkDir('assets');

/* ── Core app files ───────────────────────────────────────────────────── */
head('Core App Files');
sep();
checkFile('index.html',    { minBytes: 10_000, label: 'index.html' });
checkFile('main.js',       { minBytes: 400,    label: 'main.js' });
checkFile('preload.js',    { minBytes: 100,    label: 'preload.js' });
checkFile('devserver.js',  { minBytes: 200,    label: 'devserver.js' });

/* ── CSS ──────────────────────────────────────────────────────────────── */
head('Stylesheets  (renderer/styles/)');
sep();
checkFile('renderer/styles/variables.css',  { minBytes: 1_500 });
checkFile('renderer/styles/layout.css',     { minBytes: 5_000 });
checkFile('renderer/styles/components.css', { minBytes: 15_000 });

/* ── JavaScript modules ───────────────────────────────────────────────── */
head('JS Modules  (renderer/js/)');
sep();
checkFile('renderer/js/app.js',          { minBytes: 10_000 });
checkFile('renderer/js/profiles.js',     { minBytes: 3_000  });
checkFile('renderer/js/storage.js',      { minBytes: 800    });
checkFile('renderer/js/query-engine.js', { minBytes: 1_500  });
checkFile('renderer/js/highlighter.js',  { minBytes: 1_500  });
checkFile('renderer/js/ui.js',           { minBytes: 800    });

/* ── Assets / Icon ────────────────────────────────────────────────────── */
head('Assets');
sep();
checkFile('assets/generate-icon.js', { minBytes: 3_000 });
checkFile('assets/icon.ico', {
  minBytes: 10_000,
  label:   'assets/icon.ico  (must contain 256×256)',
  fixCmd:  'node assets/generate-icon.js',
});

/* ── Build config ─────────────────────────────────────────────────────── */
head('Build Config');
sep();
checkFile('package.json',        { minBytes: 200 });
checkFile('electron-builder.yml',{ minBytes: 200 });

/* ── package.json fields ──────────────────────────────────────────────── */
head('package.json Fields');
sep();
checkPkg('name',                    'splunk-query-studio');
checkPkg('version',                 '1.0.0');
checkPkg('author.name',             'Bobby Vongchanh');
checkPkg('author.email',            'iambobbyv@icloud.com');
checkPkg('scripts.start',           'electron .');
checkPkg('scripts.build',           'electron-builder --win');

/* ── electron-builder.yml fields ──────────────────────────────────────── */
head('electron-builder.yml Fields');
sep();
checkYml('appId',     'com.souriapps.splunk-query-studio');
checkYml('win.nsis',  'nsis');
checkYml('win.port',  'portable');
checkYml('icon',      'assets/icon.ico');

/* ── Node dependencies ────────────────────────────────────────────────── */
head('Node Dependencies (node_modules)');
sep();
checkNodeMod('electron');
checkNodeMod('electron-builder');

/* ── Summary ──────────────────────────────────────────────────────────── */
head('Summary');
sep();

if (failures === 0 && warnings === 0) {
  console.log(`\n  ${C.green}${C.bold}All checks passed!${C.reset} 🎉\n`);
  console.log(`  ${C.dim}Run:${C.reset}  npm start          ${C.dim}← launch Electron app${C.reset}`);
  console.log(`  ${C.dim}Run:${C.reset}  npm run build      ${C.dim}← build Windows installer${C.reset}`);
  console.log(`  ${C.dim}Run:${C.reset}  node devserver.js  ${C.dim}← start HTTP preview server (port 3737)${C.reset}`);
} else {
  if (failures > 0) console.log(`\n  ${C.red}${C.bold}${failures} failure(s)${C.reset}`);
  if (warnings > 0) console.log(`  ${C.yellow}${warnings} warning(s)${C.reset}`);
  if (!FIX)         console.log(`\n  ${C.dim}Re-run with --fix to attempt auto-repairs:${C.reset}`);
  if (!FIX)         console.log(`  node setup-check.js --fix\n`);
}

console.log();
process.exit(failures > 0 ? 1 : 0);
