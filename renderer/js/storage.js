/* ============================================================
   STORAGE — localStorage wrappers for history and presets
   ============================================================ */

const HISTORY_KEY  = 'sqs_history_v2';
const PRESETS_KEY  = 'sqs_presets_v1';
const HISTORY_LIMIT = 75;

/* ----- Helpers ----- */

function safeLoad(key, fallback = []) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function safeSave(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/* ----- History ----- */

export function appendHistory(entry) {
  let history = safeLoad(HISTORY_KEY);
  // Deduplicate by SPL text
  history = history.filter(h => h.spl !== entry.spl);
  history.unshift({ ...entry, createdAt: entry.createdAt ?? Date.now() });
  if (history.length > HISTORY_LIMIT) history = history.slice(0, HISTORY_LIMIT);
  safeSave(HISTORY_KEY, history);
}

export function getHistory(limit = 5) {
  return safeLoad(HISTORY_KEY).slice(0, limit);
}

export function clearHistory() {
  safeSave(HISTORY_KEY, []);
}

/* ----- Presets ----- */

export function savePreset(name, entry) {
  const presets = safeLoad(PRESETS_KEY, {});
  presets[name] = { ...entry, savedAt: Date.now() };
  return safeSave(PRESETS_KEY, presets);
}

export function getPresets() {
  return safeLoad(PRESETS_KEY, {});
}

export function deletePreset(name) {
  const presets = safeLoad(PRESETS_KEY, {});
  delete presets[name];
  safeSave(PRESETS_KEY, presets);
}
