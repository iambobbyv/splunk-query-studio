/* ============================================================
   CUSTOM TEMPLATES — localStorage CRUD + JSON/text/XML import
   ============================================================ */

const STORAGE_KEY = 'sqs_custom_templates_v1';

// In Electron, window.api.storeGet/storeSet is available via preload.js.
// We write-through to a JSON file in userData so templates survive across
// Electron updates, OS updates, or localStorage clears.
const isElectron = () => typeof window !== 'undefined' && !!window.api?.storeGet;

async function persistToFile(all) {
  if (isElectron()) {
    try { await window.api.storeSet(STORAGE_KEY, all); } catch (_) {}
  }
}

async function loadFromFile() {
  if (!isElectron()) return null;
  try {
    const data = await window.api.storeGet(STORAGE_KEY);
    return Array.isArray(data) ? data : null;
  } catch { return null; }
}

/** Call once on startup to hydrate localStorage from the file-backed store. */
export async function hydrateFromStore() {
  const fileData = await loadFromFile();
  if (fileData === null) return; // not in Electron or no data yet
  // Only restore if localStorage is empty (first run or after a clear)
  if (!localStorage.getItem(STORAGE_KEY)) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fileData));
  }
}

/* ---- ID generation ---- */
function genId() {
  return 'custom_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
}

/* ---- CRUD ---- */

export function getCustomTemplates() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

/**
 * Upsert a template. If template.id is absent or not found, inserts as new.
 * Returns the full updated array.
 */
export async function saveCustomTemplate(template) {
  const all  = getCustomTemplates();
  const now  = Date.now();
  const idx  = template.id ? all.findIndex(t => t.id === template.id) : -1;

  if (idx >= 0) {
    all[idx] = { ...all[idx], ...template, category: 'custom', updatedAt: now };
  } else {
    all.push({
      category: 'custom',
      gem:      false,
      ...template,
      id:        template.id || genId(),
      createdAt: now,
      updatedAt: now,
    });
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  await persistToFile(all);
  return all;
}

export async function deleteCustomTemplate(id) {
  const all = getCustomTemplates().filter(t => t.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  await persistToFile(all);
  return all;
}

export async function clearCustomTemplates() {
  localStorage.removeItem(STORAGE_KEY);
  await persistToFile([]);
}

/* ---- Dedupe ---- */

// djb2 hash over normalized title + SPL. normalizeTemplate mints fresh
// ids for every import, so duplicates are detected by content, not id.
export function templateContentHash(t) {
  const s = `${(t.title || '').trim().toLowerCase()}\n${(t.spl || '').trim()}`;
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (((h << 5) + h + s.charCodeAt(i)) >>> 0);
  return h.toString(36);
}

/**
 * Merge parsed import entries into the stored set, skipping duplicates.
 * An entry is skipped when its id already exists OR its title+SPL
 * content hash matches an existing template (also dedupes within the batch).
 * Persists the merged set and returns { added, skipped }.
 */
export async function mergeImportedTemplates(parsed) {
  const all        = getCustomTemplates();
  const seenIds    = new Set(all.map(t => t.id));
  const seenHashes = new Set(all.map(templateContentHash));
  let added = 0, skipped = 0;

  for (const t of parsed) {
    const hash = templateContentHash(t);
    if ((t.id && seenIds.has(t.id)) || seenHashes.has(hash)) { skipped++; continue; }
    if (t.id) seenIds.add(t.id);
    seenHashes.add(hash);
    all.push(t);
    added++;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  await persistToFile(all);
  return { added, skipped };
}

/* ---- Normalization ---- */

function normalizeTemplate(raw, source = 'manual', sourceFile = '') {
  const title = (raw.title || raw.name || '').trim();
  const spl   = (raw.spl   || raw.query || raw.search || '').trim();
  if (!title && !spl) return null;

  return {
    id:          raw.id || genId(),
    title:       title || 'Untitled Template',
    description: (raw.description || raw.desc || '').trim(),
    spl,
    category:    'custom',
    tags:        Array.isArray(raw.tags)
                   ? raw.tags.map(t => String(t).trim()).filter(Boolean)
                   : String(raw.tags || '').split(',').map(t => t.trim()).filter(Boolean),
    gem:         false,
    popularity:  null,
    fields:      Array.isArray(raw.fields) ? raw.fields : [],
    exampleResults: [],
    source,
    sourceFile,
    createdAt:   raw.createdAt || Date.now(),
    updatedAt:   Date.now(),
  };
}

/* ---- Parsers ---- */

function parseJSON(content, filename) {
  let data;
  try { data = JSON.parse(content); } catch { return []; }

  // spl-library.json format: { queries: [...] }
  const list = Array.isArray(data)
    ? data
    : (Array.isArray(data.queries) ? data.queries : [data]);

  return list
    .map(r => normalizeTemplate(r, 'imported', filename))
    .filter(Boolean);
}

function parseText(content, filename) {
  // Support multiple templates separated by "---" (3+ dashes on their own line)
  const blocks = content.split(/^-{3,}\s*$/m).map(b => b.trim()).filter(Boolean);
  const results = [];

  for (const block of blocks) {
    const lines    = block.split('\n');
    let   title    = '';
    const descLines = [];
    const splLines  = [];
    let   inSpl    = false;

    for (const line of lines) {
      if (!inSpl && !title && !line.startsWith('#')) {
        // First non-comment, non-empty line is the title
        if (line.trim()) { title = line.trim(); continue; }
      }
      if (!inSpl && line.startsWith('#')) {
        // # comment lines are description (or title if first)
        const text = line.replace(/^#+\s*/, '').trim();
        if (!title) { title = text; }
        else        { descLines.push(text); }
        continue;
      }
      // SPL starts once we hit a non-# line after the title
      inSpl = true;
      splLines.push(line);
    }

    const spl = splLines.join('\n').trim();
    if (!spl && !title) continue;

    results.push(normalizeTemplate({
      title: title || filename.replace(/\.[^.]+$/, ''),
      description: descLines.join(' ').trim(),
      spl,
    }, 'imported', filename));
  }

  return results.filter(Boolean);
}

function parseXML(content, filename) {
  let doc;
  try {
    doc = new DOMParser().parseFromString(content, 'application/xml');
  } catch { return []; }

  if (doc.querySelector('parsererror')) return [];

  // Support <queries><query> or top-level <query>
  const nodes = doc.querySelectorAll('query');
  if (!nodes.length) return [];

  const results = [];
  nodes.forEach(node => {
    const getText = tag => node.querySelector(tag)?.textContent?.trim() ?? '';
    const tagsRaw = getText('tags');

    results.push(normalizeTemplate({
      title:       getText('title') || getText('name'),
      description: getText('description') || getText('desc'),
      spl:         getText('spl') || getText('search') || getText('query'),
      tags:        tagsRaw,
    }, 'imported', filename));
  });

  return results.filter(Boolean);
}

/* ---- Public import entry point ---- */

/**
 * Parse file content into an array of normalized template objects.
 * Auto-detects format from filename extension, falling back to content sniffing.
 */
export function parseImport(content, filename = '') {
  const ext = filename.split('.').pop().toLowerCase();
  const trimmed = content.trimStart();

  // Explicit extension detection first
  if (ext === 'json' || (!ext && (trimmed.startsWith('{') || trimmed.startsWith('[')))) {
    return parseJSON(content, filename);
  }
  if (ext === 'xml' || (!ext && trimmed.startsWith('<'))) {
    return parseXML(content, filename);
  }

  // Content sniffing as fallback
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return parseJSON(content, filename);
  if (trimmed.startsWith('<'))                             return parseXML(content, filename);

  // Default: treat as plain text / SPL
  return parseText(content, filename);
}

/* ---- Export ---- */

/**
 * Serialize templates to the spl-library-compatible JSON shape
 * { queries: [...] } so exported files re-import cleanly via parseImport.
 */
export function serializeTemplatesForExport(templates) {
  return {
    queries: (templates || []).map(t => ({
      id:             t.id ?? null,
      title:          t.title ?? '',
      category:       t.category ?? 'custom',
      subcategory:    t.subcategory ?? '',
      popularity:     t.popularity ?? null,
      gem:            !!t.gem,
      tags:           Array.isArray(t.tags) ? t.tags : [],
      description:    t.description ?? '',
      spl:            t.spl ?? '',
      fields:         Array.isArray(t.fields) ? t.fields : [],
      exampleResults: Array.isArray(t.exampleResults) ? t.exampleResults : [],
    })),
  };
}
