/* ============================================================
   CUSTOM TEMPLATES — localStorage CRUD + JSON/text/XML import
   ============================================================ */

const STORAGE_KEY = 'sqs_custom_templates_v1';

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
export function saveCustomTemplate(template) {
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
  return all;
}

export function deleteCustomTemplate(id) {
  const all = getCustomTemplates().filter(t => t.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  return all;
}

export function clearCustomTemplates() {
  localStorage.removeItem(STORAGE_KEY);
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
