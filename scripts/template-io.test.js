/* ============================================================
   template-io.test.js — custom template import/export tests
   Run: node --test scripts/template-io.test.js   (Node 20+)

   Covers: JSON/text import parsers, import dedupe (by id and by
   title+SPL content hash), and export shape round-trip.
   ============================================================ */
'use strict';

const { test, before } = require('node:test');
const assert = require('node:assert/strict');

/* ── browser API stubs (custom-templates.js is DOM-free at import) ── */
const _store = new Map();
globalThis.localStorage = {
  getItem:    k => (_store.has(k) ? _store.get(k) : null),
  setItem:    (k, v) => _store.set(k, String(v)),
  removeItem: k => _store.delete(k),
};
globalThis.window = {}; // not Electron → persistToFile/loadFromFile no-op

let ct; // renderer/js/custom-templates.js (ES module)

before(async () => {
  ct = await import('../renderer/js/custom-templates.js');
  _store.clear();
});

const SPL_A = 'index=security EventCode=4625 | stats count by src_ip';
const SPL_B = 'index=network sourcetype=cisco:asa | stats count by src_ip';

/* ── import parsers ─────────────────────────────────────────── */
test('parseImport handles spl-library-shaped JSON {queries:[...]}', () => {
  const json = JSON.stringify({
    queries: [
      { id: 't1', title: 'Brute Force', description: 'd', spl: SPL_A, tags: ['auth'] },
      { id: 't2', title: 'ASA Denies', spl: SPL_B },
    ],
  });
  const out = ct.parseImport(json, 'export.json');
  assert.equal(out.length, 2);
  assert.equal(out[0].id, 't1');
  assert.equal(out[0].title, 'Brute Force');
  assert.equal(out[0].spl, SPL_A);
  assert.deepEqual(out[0].tags, ['auth']);
  assert.equal(out[0].category, 'custom');
});

test('parseImport handles plain-text blocks separated by ---', () => {
  const text = [
    '# Brute Force Logins',
    '# Repeated 4625 events',
    SPL_A,
    '---',
    'ASA Denies',
    SPL_B,
  ].join('\n');
  const out = ct.parseImport(text, 'notes.txt');
  assert.equal(out.length, 2);
  assert.equal(out[0].title, 'Brute Force Logins');
  assert.equal(out[0].description, 'Repeated 4625 events');
  assert.equal(out[0].spl, SPL_A);
  assert.equal(out[1].title, 'ASA Denies');
});

test('parseImport returns [] for garbage', () => {
  assert.deepEqual(ct.parseImport('{{{not json', 'x.json'), []);
  assert.deepEqual(ct.parseImport('   ', 'x.txt'), []);
});

/* ── dedupe ─────────────────────────────────────────────────── */
test('mergeImportedTemplates skips existing ids and matching content', async () => {
  _store.clear();
  // Seed one stored template (id minting as the app does)
  const seeded = (await ct.saveCustomTemplate({ title: 'Brute Force', spl: SPL_A }))[0];
  assert.equal(ct.getCustomTemplates().length, 1);

  const parsed = ct.parseImport(JSON.stringify({ queries: [
    { id: seeded.id, title: 'Brute Force', spl: SPL_A },          // same id
    { id: 'other-id', title: 'Brute Force', spl: SPL_A },         // same content, fresh id
    { id: 'other-id', title: 'Brute Force', spl: SPL_A },         // dup within batch
    { title: 'ASA Denies', spl: SPL_B },                          // genuinely new
  ] }), 'import.json');

  const { added, skipped } = await ct.mergeImportedTemplates(parsed);
  assert.equal(added, 1);
  assert.equal(skipped, 3);
  const all = ct.getCustomTemplates();
  assert.equal(all.length, 2);
  assert.ok(all.some(t => t.title === 'ASA Denies' && t.spl === SPL_B));
});

test('mergeImportedTemplates treats title case/whitespace as same content', async () => {
  _store.clear();
  await ct.saveCustomTemplate({ title: 'Brute Force', spl: SPL_A });
  const parsed = ct.parseImport(JSON.stringify({ queries: [
    { title: '  BRUTE force  ', spl: `  ${SPL_A}\n` },
  ] }), 'import.json');
  const { added, skipped } = await ct.mergeImportedTemplates(parsed);
  assert.equal(added, 0);
  assert.equal(skipped, 1);
});

/* ── export shape round-trip ────────────────────────────────── */
test('serializeTemplatesForExport emits {queries:[...]} and re-imports cleanly', async () => {
  _store.clear();
  await ct.saveCustomTemplate({ title: 'Brute Force', description: 'd1', spl: SPL_A, tags: ['a'] });
  await ct.saveCustomTemplate({ title: 'ASA Denies', spl: SPL_B });

  const exported = ct.serializeTemplatesForExport(ct.getCustomTemplates());
  assert.ok(Array.isArray(exported.queries));
  assert.equal(exported.queries.length, 2);
  const q = exported.queries[0];
  for (const k of ['id', 'title', 'category', 'tags', 'description', 'spl', 'fields', 'exampleResults'])
    assert.ok(k in q, `missing key ${k}`);

  // Round-trip: exported JSON parses back with titles/SPL intact…
  const json = JSON.stringify(exported);
  const reparsed = ct.parseImport(json, 'splunk-query-studio-templates.json');
  assert.equal(reparsed.length, 2);
  assert.deepEqual(reparsed.map(t => t.title).sort(), ['ASA Denies', 'Brute Force']);

  // …and re-importing the export adds nothing (ids + content match)
  const { added, skipped } = await ct.mergeImportedTemplates(reparsed);
  assert.equal(added, 0);
  assert.equal(skipped, 2);
  assert.equal(ct.getCustomTemplates().length, 2);
});
