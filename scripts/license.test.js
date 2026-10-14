/* ============================================================
   license.test.js — offline Pro license framework tests
   Run: node --test scripts/license.test.js   (Node 20+)

   The vendored Ed25519 verifier is exercised against signatures
   produced by node:crypto to prove real-world interop.
   A FIXED test keypair (seed below) keeps every assertion
   deterministic — Ed25519 signatures are deterministic per
   RFC 8032, so the minted keys are byte-identical each run.
   ============================================================ */
'use strict';

const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const { sign, createPrivateKey, createPublicKey } = require('node:crypto');

// Fixed test keypair — generated once via generateKeyPairSync('ed25519').
// The private seed is a TEST key only; it is not the vendor key.
const TEST_SEED_B64 = 'klcoiCHeWrRW308nXUIk4jKQUa2kOWbo9+OqsgIX/u8=';
const TEST_PUB_B64  = 'fIGnCsrQRIkvx+OibxOtUOo9urNKSS7OWe1JaWw1K0w=';

const _priv = createPrivateKey({
  key: { kty: 'OKP', crv: 'Ed25519', d: Buffer.from(TEST_SEED_B64, 'base64').toString('base64url'), x: '' },
  format: 'jwk',
});
const _pubRaw = createPublicKey(_priv).export({ type: 'spki', format: 'der' }).subarray(-32);
assert.equal(Buffer.from(_pubRaw).toString('base64'), TEST_PUB_B64, 'fixed test keypair mismatch');

let license;   // renderer/js/license.js (ES module)
let verifier;  // renderer/js/vendor/ed25519-verify.js (ES module)

before(async () => {
  license  = await import('../renderer/js/license.js');
  verifier = await import('../renderer/js/vendor/ed25519-verify.js');
});

/* ── minting helper (mirrors the vendor keygen flow) ────────── */
function mintLicense(payload) {
  const payloadB64u = license.bytesToB64url(new TextEncoder().encode(JSON.stringify(payload)));
  const sig = sign(null, Buffer.from(payloadB64u, 'utf8'), _priv);
  return license.formatLicenseKey(payloadB64u, sig.toString('base64url'));
}

function validPayload(overrides = {}) {
  const now = Math.floor(Date.now() / 1000);
  return {
    email: 'soc-analyst@example.com',
    tier: 'pro',
    seats: 5,
    exp: now + 86400,
    iat: now,
    ...overrides,
  };
}

/* ── vendored verifier interop ───────────────────────────────── */
test('ed25519Verify interoperates with node:crypto signatures', () => {
  const msg = new TextEncoder().encode('{"email":"a@b.c","tier":"pro"}');
  const sig = new Uint8Array(sign(null, msg, _priv));
  const pub = new Uint8Array(_pubRaw);

  assert.equal(verifier.ed25519Verify(msg, sig, pub), true, 'valid signature must verify');

  const badSig = new Uint8Array(sig); badSig[10] ^= 1;
  assert.equal(verifier.ed25519Verify(msg, badSig, pub), false, 'tampered signature must fail');

  const badMsg = new TextEncoder().encode('{"email":"a@b.c","tier":"pro"} ');
  assert.equal(verifier.ed25519Verify(badMsg, sig, pub), false, 'tampered message must fail');

  assert.equal(verifier.ed25519Verify(msg, sig.subarray(0, 32), pub), false, 'short sig must fail');
  assert.equal(verifier.ed25519Verify(msg, sig, pub.subarray(0, 16)), false, 'short key must fail');
  assert.equal(verifier.ed25519Verify('not-bytes', sig, pub), false, 'non-Uint8Array msg must fail');
});

/* ── verifyLicenseKey ────────────────────────────────────────── */
test('verifyLicenseKey accepts a valid key', () => {
  const payload = validPayload();
  const key = mintLicense(payload);
  assert.ok(key.startsWith('SQS1.'), 'key format prefix');
  const res = license.verifyLicenseKey(key, TEST_PUB_B64);
  assert.equal(res.valid, true);
  assert.equal(res.reason, 'OK');
  assert.deepEqual(res.payload, payload);
});

test('verifyLicenseKey rejects a tampered payload', () => {
  const key = mintLicense(validPayload());
  const [prefix, payloadB64u, sigB64u] = key.split('.');
  // Attacker swaps the email but keeps valid JSON — signature must not match
  const obj = JSON.parse(Buffer.from(payloadB64u, 'base64url').toString('utf8'));
  obj.email = 'attacker@example.com';
  const tampered = license.bytesToB64url(new TextEncoder().encode(JSON.stringify(obj)));
  assert.notEqual(tampered, payloadB64u);
  const res = license.verifyLicenseKey(`${prefix}.${tampered}.${sigB64u}`, TEST_PUB_B64);
  assert.equal(res.valid, false);
  assert.equal(res.reason, 'BAD_SIGNATURE');
  assert.equal(res.payload, null);
});

test('verifyLicenseKey rejects a tampered signature', () => {
  const key = mintLicense(validPayload());
  const [prefix, payloadB64u, sigB64u] = key.split('.');
  const tampered = (sigB64u[5] === 'A' ? 'B' : 'A') + sigB64u.slice(1);
  const res = license.verifyLicenseKey(`${prefix}.${payloadB64u}.${tampered}`, TEST_PUB_B64);
  assert.equal(res.valid, false);
  assert.equal(res.reason, 'BAD_SIGNATURE');
});

test('verifyLicenseKey rejects malformed keys', () => {
  const good = mintLicense(validPayload());
  const [, p, s] = good.split('.');
  const cases = [
    ['', 'empty'], ['garbage', 'no dots'], ['SQS1', 'prefix only'],
    ['SQS1..', 'empty segments'], [`WRONG1.${p}.${s}`, 'wrong prefix'],
    [`SQS1.${p}`, 'missing signature'], [`SQS1.${p}.${s}.extra`, 'extra segment'],
    ['SQS1.!!!.???', 'bad base64url'], [`SQS1.${p}.AAAA`, 'short signature'],
    [null, 'null'], [undefined, 'undefined'], [12345, 'non-string'],
  ];
  for (const [input, label] of cases) {
    const res = license.verifyLicenseKey(input, TEST_PUB_B64);
    assert.equal(res.valid, false, label);
    assert.equal(res.reason, 'MALFORMED', label);
  }
});

test('verifyLicenseKey rejects wrong-tier / misshapen payloads', () => {
  for (const payload of [
    { ...validPayload(), tier: 'free' },
    { ...validPayload(), email: '' },
    { ...validPayload(), exp: 'tomorrow' },
  ]) {
    const res = license.verifyLicenseKey(mintLicense(payload), TEST_PUB_B64);
    assert.equal(res.valid, false);
    assert.equal(res.reason, 'MALFORMED');
  }
});

test('verifyLicenseKey rejects expired keys', () => {
  const key = mintLicense(validPayload({ exp: Math.floor(Date.now() / 1000) - 60 }));
  const res = license.verifyLicenseKey(key, TEST_PUB_B64);
  assert.equal(res.valid, false);
  assert.equal(res.reason, 'EXPIRED');
});

test('placeholder baked key cannot validate any signature', () => {
  // The shipped placeholder is 32 zero bytes — unpackneg fails, so
  // verifyLicenseKey with the DEFAULT key must reject real signatures.
  const key = mintLicense(validPayload());
  const res = license.verifyLicenseKey(key); // no override → baked placeholder
  assert.equal(res.valid, false);
  assert.equal(res.reason, 'BAD_SIGNATURE');
});

/* ── activation lifecycle ────────────────────────────────────── */
test('isPro is false with no license stored', () => {
  license.deactivateLicense();
  assert.equal(license.isPro(), false);
  assert.equal(license.getLicensePayload(), null);
  assert.equal(license.getStoredLicenseKey(), null);
});

test('activateLicense persists a valid key; isPro reflects it', () => {
  license.deactivateLicense();
  const payload = validPayload();
  const key = mintLicense(payload);

  const bad = license.activateLicense('SQS1.bogus.key');
  assert.equal(bad.ok, false);
  assert.equal(bad.reason, 'MALFORMED');
  assert.equal(license.isPro(TEST_PUB_B64), false, 'failed activation must not persist');

  const good = license.activateLicense(key, TEST_PUB_B64);
  assert.equal(good.ok, true);
  assert.deepEqual(good.payload, payload);
  assert.equal(license.isPro(TEST_PUB_B64), true);
  assert.deepEqual(license.getLicensePayload(TEST_PUB_B64), payload);
  assert.equal(license.getStoredLicenseKey(), key);

  license.deactivateLicense();
  assert.equal(license.isPro(TEST_PUB_B64), false);
  assert.equal(license.getStoredLicenseKey(), null);
});

test('activateLicense rejects expired keys without persisting', () => {
  license.deactivateLicense();
  const key = mintLicense(validPayload({ exp: 1 }));
  const res = license.activateLicense(key, TEST_PUB_B64);
  assert.equal(res.ok, false);
  assert.equal(res.reason, 'EXPIRED');
  assert.equal(license.isPro(TEST_PUB_B64), false);
});
