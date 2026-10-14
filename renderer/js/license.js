/* ============================================================
   LICENSE — offline Pro license framework (Ed25519-signed keys)

   Zero network calls: verification is pure JS via the vendored
   tweetnacl verifier, so activation works fully offline /
   air-gapped (SOC analysts with no internet access).

   Key format:  SQS1.<base64url(payloadJSON)>.<base64url(signature)>
   The signature is Ed25519 over the UTF-8 bytes of the base64url
   payload segment. Payload shape:
     { email, tier: "pro", seats, exp (unix seconds), iat }

   Persistence is localStorage only (pure JS — no Electron IPC or
   filesystem), so the same code runs on desktop, web, and iOS.
   ============================================================ */

import { ed25519Verify } from './vendor/ed25519-verify.js';

/* ── Vendor public key ──────────────────────────────────────────
   !!! PLACEHOLDER — Bobby must replace this with his own key !!!
   Generate a keypair on your Mac with:
     node -e "const {generateKeyPairSync}=require('node:crypto');
       const {publicKey}=generateKeyPairSync('ed25519');
       console.log(publicKey.export({type:'spki',format:'der'}).subarray(-32).toString('base64'));"
   Keep the private key secret; it signs customer license keys.
   Until replaced, no license key can validate (isPro() = false).
*/
export const LICENSE_PUBLIC_KEY_B64 = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';

const LICENSE_STORAGE_KEY = 'sqs_pro_license_v1';
const KEY_PREFIX = 'SQS1';
const TIER_PRO   = 'pro';

/* ── base64 helpers (atob exists in browsers and Node 16+) ───── */

function b64ToBytes(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function b64urlToBytes(s) {
  if (typeof s !== 'string' || !/^[A-Za-z0-9\-_]*$/.test(s)) throw new Error('bad base64url');
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  return b64ToBytes(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
}

function bytesToB64url(bytes) {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/* ── storage (localStorage; in-memory fallback for Node tests) ─ */

const _mem = new Map();

function storageGet(k) {
  try {
    if (typeof localStorage !== 'undefined') return localStorage.getItem(k);
  } catch { /* private-mode / unavailable */ }
  return _mem.has(k) ? _mem.get(k) : null;
}

function storageSet(k, v) {
  try {
    if (typeof localStorage !== 'undefined') { localStorage.setItem(k, v); return; }
  } catch { /* fall through to memory */ }
  _mem.set(k, v);
}

function storageDel(k) {
  try {
    if (typeof localStorage !== 'undefined') { localStorage.removeItem(k); return; }
  } catch { /* fall through to memory */ }
  _mem.delete(k);
}

/* ── verification ─────────────────────────────────────────────── */

/**
 * Verify a license key's authenticity and expiry.
 * @param {string} key  SQS1.<payload>.<signature>
 * @param {string} [publicKeyB64]  override for tests/vendor tooling;
 *                                 defaults to the baked LICENSE_PUBLIC_KEY_B64.
 * @returns {{ valid: boolean, payload: object|null,
 *             reason: 'OK'|'MALFORMED'|'BAD_SIGNATURE'|'EXPIRED' }}
 */
export function verifyLicenseKey(key, publicKeyB64 = LICENSE_PUBLIC_KEY_B64) {
  const fail = reason => ({ valid: false, payload: null, reason });

  if (typeof key !== 'string') return fail('MALFORMED');
  const parts = key.trim().split('.');
  if (parts.length !== 3 || parts[0] !== KEY_PREFIX) return fail('MALFORMED');
  const [, payloadB64u, sigB64u] = parts;
  if (!payloadB64u || !sigB64u) return fail('MALFORMED');

  let payloadBytes, sigBytes, pubBytes;
  try {
    payloadBytes = b64urlToBytes(payloadB64u);
    sigBytes     = b64urlToBytes(sigB64u);
    pubBytes     = b64ToBytes(publicKeyB64);
  } catch {
    return fail('MALFORMED');
  }
  if (sigBytes.length !== 64 || pubBytes.length !== 32) return fail('MALFORMED');

  let payload;
  try {
    payload = JSON.parse(new TextDecoder().decode(payloadBytes));
  } catch {
    return fail('MALFORMED');
  }
  if (!payload || typeof payload !== 'object' ||
      payload.tier !== TIER_PRO ||
      typeof payload.email !== 'string' || !payload.email ||
      typeof payload.exp !== 'number' || !Number.isFinite(payload.exp)) {
    return fail('MALFORMED');
  }

  // Signature covers the UTF-8 bytes of the base64url payload segment
  const signedBytes = new TextEncoder().encode(payloadB64u);
  if (!ed25519Verify(signedBytes, sigBytes, pubBytes)) return fail('BAD_SIGNATURE');

  if (payload.exp * 1000 <= Date.now()) return fail('EXPIRED');

  return { valid: true, payload, reason: 'OK' };
}

/* ── activation state ─────────────────────────────────────────── */

export function getStoredLicenseKey() {
  const v = storageGet(LICENSE_STORAGE_KEY);
  return typeof v === 'string' && v ? v : null;
}

/**
 * Validate + persist a license key. Pure offline operation.
 * @param {string} key
 * @param {string} [publicKeyB64]  test/vendor override (see verifyLicenseKey)
 * @returns {{ ok: boolean, payload?: object, reason?: string }}
 */
export function activateLicense(key, publicKeyB64 = LICENSE_PUBLIC_KEY_B64) {
  const res = verifyLicenseKey(key, publicKeyB64);
  if (!res.valid) return { ok: false, reason: res.reason };
  storageSet(LICENSE_STORAGE_KEY, key.trim());
  return { ok: true, payload: res.payload };
}

export function deactivateLicense() {
  storageDel(LICENSE_STORAGE_KEY);
}

/**
 * Pro = a stored key with a valid signature and a future expiry.
 * @param {string} [publicKeyB64]  test/vendor override (see verifyLicenseKey)
 */
export function isPro(publicKeyB64 = LICENSE_PUBLIC_KEY_B64) {
  const key = getStoredLicenseKey();
  return key ? verifyLicenseKey(key, publicKeyB64).valid : false;
}

/**
 * Payload of the stored license, or null when absent/invalid.
 * @param {string} [publicKeyB64]  test/vendor override (see verifyLicenseKey)
 */
export function getLicensePayload(publicKeyB64 = LICENSE_PUBLIC_KEY_B64) {
  const key = getStoredLicenseKey();
  if (!key) return null;
  const res = verifyLicenseKey(key, publicKeyB64);
  return res.valid ? res.payload : null;
}

/* ── key minting helper (vendor tooling; not used by the app) ───
   Sign with node:crypto on your Mac:
     const payloadB64u = <base64url(JSON.stringify({email, tier:'pro', seats, exp, iat}))>;
     const sig = sign(null, Buffer.from(payloadB64url, 'utf8'), privateKey);
     const key = `SQS1.${payloadB64u}.${sig.toString('base64url')}`;
*/
export function formatLicenseKey(payloadB64u, signatureB64u) {
  return `${KEY_PREFIX}.${payloadB64u}.${signatureB64u}`;
}

// Re-exported for tests/vendor tooling
export { bytesToB64url };
