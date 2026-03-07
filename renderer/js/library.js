/* ============================================================
   LIBRARY — SPL Query Library loader, search, filter
   ============================================================ */

const LIB_URL = new URL('../../assets/spl-library.json', import.meta.url).href;

/** Cached queries array (null until first load) */
let _queries   = null;
let _categories = null;

/**
 * Load the library JSON once; subsequent calls return the cache.
 * @returns {Promise<{ queries: object[], categories: object[] }>}
 */
export async function loadLibrary() {
  if (_queries) return { queries: _queries, categories: _categories };

  try {
    const resp = await fetch(LIB_URL);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    _queries    = data.queries   ?? [];
    _categories = data.categories ?? [];
    return { queries: _queries, categories: _categories };
  } catch (err) {
    console.error('[library] failed to load:', err);
    _queries    = [];
    _categories = [];
    return { queries: _queries, categories: _categories };
  }
}

/**
 * Filter + text-search the query list.
 * @param {object[]} queries - full list from loadLibrary
 * @param {object}   opts
 * @param {string}   [opts.text='']       - substring search (case-insensitive)
 * @param {string}   [opts.category='all'] - category id or 'all'
 * @param {string}   [opts.popularity='all'] - 'all' | 'top' | 'gem'
 * @returns {object[]} filtered list
 */
export function searchLibrary(queries, { text = '', category = 'all', popularity = 'all' } = {}) {
  const needle = text.trim().toLowerCase();

  return queries.filter(q => {
    // Category filter
    if (category !== 'all' && q.category !== category) return false;

    // Popularity filter
    if (popularity === 'top' && q.popularity !== 'top') return false;
    if (popularity === 'gem' && !q.gem)                return false;

    // Full-text search across title, description, tags, subcategory
    if (needle) {
      const haystack = [
        q.title        ?? '',
        q.description  ?? '',
        q.subcategory  ?? '',
        q.category     ?? '',
        ...(q.tags ?? [])
      ].join(' ').toLowerCase();
      if (!haystack.includes(needle)) return false;
    }

    return true;
  });
}

/**
 * Look up a single query by its id.
 * @param {object[]} queries
 * @param {string}   id
 * @returns {object|null}
 */
export function getQuery(queries, id) {
  return queries.find(q => q.id === id) ?? null;
}
