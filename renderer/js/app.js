/* ============================================================
   APP — Wizard state machine + SPL generation
   ============================================================ */

import { CATEGORY_PROFILES, CATEGORY_META, TIME_RANGE_MAP } from './profiles.js';
import { appendHistory, getHistory, clearHistory, savePreset, getPresets, deletePreset } from './storage.js';
import { buildSPL, computeMetrics } from './query-engine.js';
import { highlight } from './highlighter.js';
import { icons, showToast, qs, qsa, escapeHtml } from './ui.js';
import {
  loadKnowledge, checkOllama, askOllama,
  analyzeQuery, getAutoSuggestions, searchKnowledge, resetOllamaCheck
} from './ai-assistant.js';

/* ============================================================
   STATE
   ============================================================ */

const state = {
  // Wizard
  step: 1,
  maxReached: 1,

  // Selections
  category:     'network',
  techKey:      'cisco_wildcard',
  timeRange:    'Last 1h',
  ips:          '',
  queryType:    'IP Address Lookup',
  customFields: {},   // map of fieldName → value string

  // Generated
  currentSPL: ''
};

/* ============================================================
   HELPERS
   ============================================================ */

function debounce(fn, ms) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

function currentProfile() {
  return CATEGORY_PROFILES[state.category]?.[state.techKey] ?? null;
}

function generateSPL() {
  const prof = currentProfile();
  if (!prof) return '';
  return buildSPL({
    index:        prof.index,
    sourcetype:   prof.sourcetype,
    timeRange:    state.timeRange,
    ips:          state.ips,
    queryType:    state.queryType,
    category:     state.category,
    customFields: state.customFields
  });
}

/* ============================================================
   WIZARD NAVIGATION
   ============================================================ */

function goToStep(n) {
  if (n < 1 || n > 4) return;
  if (n > state.maxReached + 1) return; // don't skip ahead

  state.step = n;
  if (n > state.maxReached) state.maxReached = n;

  // Mobile: CSS slide classes; Desktop: hidden toggle
  const isMobile = window.innerWidth <= 768;
  for (let i = 1; i <= 4; i++) {
    const panel = qs(`#panel-step-${i}`);
    if (!panel) continue;
    if (isMobile) {
      panel.classList.remove('hidden', 'slide-active', 'slide-left');
      if (i === n)      panel.classList.add('slide-active');
      else if (i < n)  panel.classList.add('slide-left');
      // panels with i > n get no class → stay off-screen right (translateX(105%))
    } else {
      panel.classList.remove('slide-active', 'slide-left');
      panel.classList.toggle('hidden', i !== n);
    }
  }

  updateMobileStepIndicator(n);
  updateStepper();
  updateNav();

  // Step-specific actions
  if (n === 2) renderTechSelector();
  if (n === 3) {
    renderQueryTypes();
    renderIPFilter();
    renderFieldFilters();
    updatePreview();
  }
  if (n === 4) { renderResult(); aiAnalyzeCurrentQuery(); }

  // On desktop scroll main to top; on mobile each panel scrolls itself
  if (!isMobile) qs('main')?.scrollTo(0, 0);
  else qs('.wizard-panel.slide-active')?.scrollTo(0, 0);
}

function updateMobileStepIndicator(n) {
  const stepNames = ['Category', 'Platform', 'Parameters', 'Query'];
  const label = qs('#mobile-step-label');
  if (label) label.textContent = stepNames[n - 1] ?? '';
  qsa('.mobile-dot').forEach(dot => {
    const s = Number(dot.dataset.step);
    dot.classList.remove('active', 'done');
    if (s === n)      dot.classList.add('active');
    else if (s < n)  dot.classList.add('done');
  });
}

function updateStepper() {
  const items = qsa('.wizard-step-item');
  items.forEach(el => {
    const s = Number(el.dataset.step);
    el.classList.remove('active', 'done');
    if (s === state.step) el.classList.add('active');
    else if (s < state.step) el.classList.add('done');

    // Allow clicking already-visited steps
    el.disabled = s > state.maxReached;
  });

  // Connectors
  for (let i = 1; i <= 3; i++) {
    const conn = qs(`#connector-${i}-${i + 1}`);
    if (conn) conn.classList.toggle('done', i < state.step);
  }

  // Step summaries
  const catMeta = CATEGORY_META[state.category];
  const prof = currentProfile();

  setText('summary-1', state.maxReached >= 1 ? catMeta?.label ?? 'Choose type' : 'Choose type');
  setText('summary-2', state.maxReached >= 2 ? prof?.label ?? 'Select source' : 'Select source');
  setText('summary-3', state.maxReached >= 3 ? state.timeRange : 'Set filters');
}

function updateNav() {
  const nav = qs('#wizard-nav');
  const backBtn = qs('#btn-back');
  const continueBtn = qs('#btn-continue');
  const navInfo = qs('#wizard-nav-info');

  if (!nav) return;

  // Hide nav on step 1 (category cards advance automatically)
  if (state.step === 1) {
    nav.classList.add('hidden');
    return;
  }
  nav.classList.remove('hidden');

  if (backBtn) backBtn.disabled = state.step <= 1;

  if (state.step === 4) {
    continueBtn.style.display = 'none';
  } else {
    continueBtn.style.display = '';
    continueBtn.textContent = state.step === 3 ? 'Generate Query' : 'Continue';
    if (state.step === 3) {
      continueBtn.innerHTML = `Generate Query
        <svg viewBox="0 0 16 16" fill="currentColor" style="width:14px;height:14px;flex-shrink:0"><path d="M5 3l9 5-9 5V3z"/></svg>`;
    } else {
      continueBtn.innerHTML = `Continue
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;flex-shrink:0"><path d="M6 4l4 4-4 4"/></svg>`;
    }
  }

  const catMeta = CATEGORY_META[state.category];
  const prof = currentProfile();
  const stepHints = {
    2: catMeta ? `Category: ${catMeta.label}` : '',
    3: prof ? `Platform: ${prof.label}` : '',
    4: ''
  };
  if (navInfo) navInfo.textContent = stepHints[state.step] ?? '';
}

function setText(id, text) {
  const el = qs(`#${id}`);
  if (el) el.textContent = text;
}

/* ============================================================
   STEP 1 — Category cards
   ============================================================ */

const CATEGORY_DESCS = {
  network:      'Cisco, Palo Alto, SolarWinds, and more',
  server:       'Linux, Windows, CrowdStrike endpoint data',
  datacenter:   'VMware, NetApp, Pure Storage infrastructure',
  applications: 'Web servers, Okta, Microsoft 365'
};

function renderCategoryCards() {
  const grid = qs('#category-card-grid');
  if (!grid) return;

  grid.innerHTML = Object.entries(CATEGORY_META).map(([key, meta]) => `
    <button class="category-card${state.category === key ? ' selected' : ''}" data-category="${key}">
      <div class="card-icon">${icons[meta.iconKey] ?? ''}</div>
      <div class="card-title">${escapeHtml(meta.label)}</div>
      <div class="card-desc">${escapeHtml(CATEGORY_DESCS[key] ?? '')}</div>
      <div class="card-badge">${meta.badge} platform${meta.badge !== 1 ? 's' : ''}</div>
    </button>
  `).join('');

  qsa('.category-card', grid).forEach(card => {
    card.addEventListener('click', () => {
      const cat = card.dataset.category;
      state.category     = cat;
      state.customFields = {};   // clear field filters when switching category

      // Reset downstream selections to defaults for new category
      const meta = CATEGORY_META[cat];
      state.techKey   = meta.defaultTech;
      const prof = CATEGORY_PROFILES[cat]?.[state.techKey];
      state.queryType = prof?.queryTypes?.[0] ?? 'Lookup';

      // Mark selection visually
      qsa('.category-card', grid).forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');

      // Also update sidebar
      renderSidebar();

      // Auto-advance after brief visual feedback
      setTimeout(() => goToStep(2), 200);
    });
  });
}

/* ============================================================
   SIDEBAR (mirrors category selection)
   ============================================================ */

function renderSidebar() {
  const list = qs('#sidebar-category-list');
  if (!list) return;

  list.innerHTML = Object.entries(CATEGORY_META).map(([key, meta]) => `
    <div class="category-item${state.category === key ? ' active' : ''}" data-category="${key}">
      <div class="category-item-inner">
        ${icons[meta.iconKey] ?? ''}
        <span class="category-label">${escapeHtml(meta.label)}</span>
      </div>
      <span class="category-badge">${meta.badge}</span>
    </div>
  `).join('');

  qsa('.category-item', list).forEach(el => {
    el.addEventListener('click', () => {
      const cat = el.dataset.category;
      state.category     = cat;
      state.customFields = {};
      const meta = CATEGORY_META[cat];
      state.techKey   = meta.defaultTech;
      const prof = CATEGORY_PROFILES[cat]?.[state.techKey];
      state.queryType = prof?.queryTypes?.[0] ?? 'Lookup';
      renderSidebar();
      renderCategoryCards();
      goToStep(2);
    });
  });
}

/* ============================================================
   STEP 2 — Tech selector
   ============================================================ */

function renderTechSelector() {
  const selector = qs('#tech-selector');
  if (!selector) return;

  const profiles = CATEGORY_PROFILES[state.category] ?? {};
  const desc = qs('#step2-desc');
  const catMeta = CATEGORY_META[state.category];
  if (desc && catMeta) {
    desc.textContent = `Select a platform within ${catMeta.label}`;
  }

  selector.innerHTML = Object.entries(profiles).map(([key, prof]) => `
    <div class="tech-option${state.techKey === key ? ' active' : ''}" data-tech="${key}">
      ${escapeHtml(prof.label)}
    </div>
  `).join('');

  qsa('.tech-option', selector).forEach(el => {
    el.addEventListener('click', () => {
      state.techKey     = el.dataset.tech;
      state.customFields = {};     // clear stale field values for new platform
      const prof = profiles[state.techKey];
      state.queryType = prof?.queryTypes?.[0] ?? state.queryType;

      qsa('.tech-option', selector).forEach(o => o.classList.remove('active'));
      el.classList.add('active');
      updateStepper();
    });
  });
}

/* ============================================================
   STEP 3 — Parameters
   ============================================================ */

function renderIPFilter() {
  const card = qs('#ip-filter-card');
  if (!card) return;
  const meta = CATEGORY_META[state.category];
  card.style.display = meta?.ipFilterVisible ? '' : 'none';
}

function renderFieldFilters() {
  const card    = qs('#field-filter-card');
  const grid    = qs('#field-filter-inputs');
  const badge   = qs('#field-filter-badge');
  if (!card || !grid) return;

  const prof = currentProfile();
  const filters = prof?.fieldFilters ?? [];

  if (filters.length === 0) {
    card.style.display = 'none';
    return;
  }
  card.style.display = '';

  // Build the field input grid
  grid.innerHTML = filters.map(f => {
    const val = escapeHtml(state.customFields[f.field] ?? '');
    const hintHtml = f.hint
      ? `<div class="ff-hint">${escapeHtml(f.hint)}</div>`
      : '';
    return `
      <div class="ff-row">
        <label class="ff-label" for="ff-${escapeHtml(f.field)}">${escapeHtml(f.label)}</label>
        ${hintHtml}
        <input
          class="input-field ff-input"
          id="ff-${escapeHtml(f.field)}"
          data-ff-field="${escapeHtml(f.field)}"
          type="text"
          value="${val}"
          placeholder="${escapeHtml(f.placeholder ?? '')}"
          autocomplete="off"
          spellcheck="false"
        />
      </div>`;
  }).join('');

  // Wire each input → state.customFields → preview
  qsa('.ff-input', grid).forEach(input => {
    input.addEventListener('input', debounce(() => {
      const fieldName = input.dataset.ffField;
      const val = input.value.trim();
      if (val) {
        state.customFields[fieldName] = val;
      } else {
        delete state.customFields[fieldName];
      }
      updateFieldBadge(badge);
      updatePreview();
    }, 250));
  });

  updateFieldBadge(badge);
}

function updateFieldBadge(badge) {
  if (!badge) return;
  const count = Object.values(state.customFields).filter(v => v && String(v).trim()).length;
  if (count > 0) {
    badge.textContent = `${count} active`;
    badge.style.display = '';
  } else {
    badge.style.display = 'none';
  }
}

function renderQueryTypes() {
  const sel = qs('#query-type-select');
  if (!sel) return;
  const prof = currentProfile();
  const types = prof?.queryTypes ?? ['Lookup'];

  sel.innerHTML = types.map(t =>
    `<option value="${escapeHtml(t)}"${t === state.queryType ? ' selected' : ''}>${escapeHtml(t)}</option>`
  ).join('');

  state.queryType = sel.value;
}

function updatePreview() {
  const spl = generateSPL();
  state.currentSPL = spl;
  const el = qs('#spl-preview');
  if (el) el.innerHTML = highlight(spl);
}

/* ============================================================
   STEP 4 — Result
   ============================================================ */

function renderResult() {
  const spl = generateSPL();
  state.currentSPL = spl;

  // Highlighted output
  const output = qs('#spl-output');
  if (output) {
    output.innerHTML = highlight(spl);
    output.dataset.raw = spl;
  }

  // Profile chips
  const prof = currentProfile();
  const indexEl = qs('[data-index-display]');
  const stEl    = qs('[data-sourcetype-display]');
  if (indexEl && prof) indexEl.textContent = prof.index;
  if (stEl    && prof) stEl.textContent    = prof.sourcetype;

  // Metrics
  renderMetrics(computeMetrics(spl, {
    index:        prof?.index ?? '',
    sourcetype:   prof?.sourcetype ?? '',
    ips:          state.ips,
    timeRange:    state.timeRange,
    customFields: state.customFields
  }));

  // Enable header buttons
  const copyBtn = qs('#btn-copy');
  const saveBtn = qs('#btn-save-preset');
  if (copyBtn) copyBtn.disabled = false;
  if (saveBtn) saveBtn.disabled = false;

  // Save to history
  if (spl && prof) {
    appendHistory({
      spl,
      category:   state.category,
      techKey:    state.techKey,
      queryType:  state.queryType,
      index:      prof.index,
      sourcetype: prof.sourcetype,
      createdAt:  Date.now()
    });
    renderHistory();
  }
}

function renderMetrics(metrics) {
  const container = qs('#optimization-metrics');
  if (!container) return;

  const iconMap = { good: icons.check, warning: icons.warn, danger: icons.error };

  container.innerHTML = metrics.map(m => `
    <div class="metric-card metric-${m.status}">
      <div class="metric-value">
        ${iconMap[m.status] ?? ''}
        ${escapeHtml(m.label)}
      </div>
      <div class="metric-label">${escapeHtml(m.detail)}</div>
    </div>
  `).join('');
}

/* ============================================================
   ASIDE — History & Presets
   ============================================================ */

function renderHistory() {
  const container = qs('#history-list');
  if (!container) return;

  const history = getHistory(10);
  if (!history.length) {
    container.innerHTML = '<div class="history-empty">No queries yet</div>';
    return;
  }

  container.innerHTML = history.map((h, i) => `
    <div class="history-item" data-index="${i}">
      <div class="history-item-meta">${escapeHtml((h.category ?? 'query').toUpperCase())}: ${escapeHtml(h.queryType ?? '')}</div>
      <div class="history-item-spl">${escapeHtml(h.spl ?? '')}</div>
      <div class="history-item-time">${formatTime(h.createdAt)}</div>
    </div>
  `).join('');

  qsa('.history-item', container).forEach(el => {
    el.addEventListener('click', () => {
      const h = history[Number(el.dataset.index)];
      if (!h?.spl) return;
      const output = qs('#spl-output');
      if (output) {
        output.innerHTML = highlight(h.spl);
        output.dataset.raw = h.spl;
      }
      // Jump to step 4 to show it
      if (state.step !== 4) {
        state.maxReached = 4;
        goToStep(4);
      }
      showToast('Loaded from history', 'info');
    });
  });
}

function renderPresets() {
  const container = qs('#preset-list');
  if (!container) return;

  const entries = Object.entries(getPresets());
  if (!entries.length) {
    container.innerHTML = '<div class="history-empty" style="padding:12px 0;font-size:12px">No saved presets</div>';
    return;
  }

  container.innerHTML = entries.map(([name]) => `
    <div class="preset-item">
      <span class="preset-name">${escapeHtml(name)}</span>
      <button class="preset-delete" data-name="${escapeHtml(name)}" title="Delete">${icons.trash}</button>
    </div>
  `).join('');

  qsa('.preset-name', container).forEach(el => {
    el.addEventListener('click', () => {
      const name = el.nextElementSibling?.dataset.name ?? '';
      const preset = getPresets()[name];
      if (!preset?.spl) return;
      const output = qs('#spl-output');
      if (output) {
        output.innerHTML = highlight(preset.spl);
        output.dataset.raw = preset.spl;
      }
      if (state.step !== 4) { state.maxReached = 4; goToStep(4); }
      showToast(`Loaded: ${name}`, 'info');
    });
  });

  qsa('.preset-delete', container).forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      deletePreset(btn.dataset.name);
      renderPresets();
      showToast('Preset deleted', 'info');
    });
  });
}

/* ============================================================
   ACTIONS
   ============================================================ */

async function doCopy() {
  const spl = qs('#spl-output')?.dataset?.raw ?? state.currentSPL;
  if (!spl) { showToast('No query to copy', 'error'); return; }
  try {
    if (window.api?.copyToClipboard) await window.api.copyToClipboard(spl);
    else await navigator.clipboard.writeText(spl);
    showToast('Copied to clipboard!', 'success');
  } catch (e) {
    showToast('Copy failed', 'error');
  }
}

function doSavePreset() {
  const spl = qs('#spl-output')?.dataset?.raw ?? state.currentSPL;
  if (!spl) { showToast('Generate a query first', 'error'); return; }

  const name = prompt('Preset name:');
  if (!name?.trim()) return;

  const prof = currentProfile();
  const ok = savePreset(name.trim(), {
    spl,
    category:   state.category,
    techKey:    state.techKey,
    queryType:  state.queryType,
    index:      prof?.index ?? '',
    sourcetype: prof?.sourcetype ?? ''
  });

  if (ok) { renderPresets(); showToast(`Saved: "${name.trim()}"`, 'success'); }
  else showToast('Save failed', 'error');
}

function doReset() {
  state.step         = 1;
  state.maxReached   = 1;
  state.category     = 'network';
  state.techKey      = 'cisco_wildcard';
  state.timeRange    = 'Last 1h';
  state.ips          = '';
  state.queryType    = 'IP Address Lookup';
  state.customFields = {};
  state.currentSPL   = '';

  const ip = qs('#ip-filter');
  if (ip) ip.value = '';

  // Clear any field filter inputs
  qsa('.ff-input').forEach(el => { el.value = ''; });
  const badge = qs('#field-filter-badge');
  if (badge) badge.style.display = 'none';
  const ffCard = qs('#field-filter-card');
  if (ffCard) ffCard.style.display = 'none';

  const copyBtn = qs('#btn-copy');
  const saveBtn = qs('#btn-save-preset');
  if (copyBtn) copyBtn.disabled = true;
  if (saveBtn) saveBtn.disabled = true;

  renderCategoryCards();
  renderSidebar();
  goToStep(1);
  showToast('Reset — start over', 'info');
}

function formatTime(ts) {
  if (!ts) return '';
  try {
    return new Date(ts).toLocaleString(undefined, {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  } catch { return ''; }
}

/* ============================================================
   MODALS & HEADER MENU
   ============================================================ */

function openModal(name) {
  qsa('.modal-overlay.open').forEach(el => el.classList.remove('open'));
  const modal = qs(`#modal-${name}`);
  if (!modal) return;
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  qs('#header-dropdown')?.classList.remove('open');
}

function closeModal(name) {
  const modal = qs(`#modal-${name}`);
  if (!modal) return;
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
}

function openExternal(url) {
  if (window.api?.openExternal) {
    window.api.openExternal(url);
  } else {
    window.open(url, '_blank', 'noopener');
  }
}

function initModals() {
  const dropdown = qs('#header-dropdown');

  // Header "?" menu toggle
  qs('#btn-menu')?.addEventListener('click', e => {
    e.stopPropagation();
    dropdown?.classList.toggle('open');
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', e => {
    if (!e.target.closest('.header-menu-wrapper')) {
      dropdown?.classList.remove('open');
    }
  });

  // [data-open-modal] triggers anywhere in the doc
  document.addEventListener('click', e => {
    const trigger = e.target.closest('[data-open-modal]');
    if (trigger) openModal(trigger.dataset.openModal);
  });

  // [data-close-modal] triggers (X buttons, Done/Cancel buttons)
  document.addEventListener('click', e => {
    const trigger = e.target.closest('[data-close-modal]');
    if (trigger) closeModal(trigger.dataset.closeModal);
  });

  // Click backdrop to dismiss
  qsa('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) closeModal(overlay.id.replace('modal-', ''));
    });
  });

  // [data-href] external link buttons (modal footer "View Full…" buttons + modal-link-btn)
  document.addEventListener('click', e => {
    const trigger = e.target.closest('[data-href]');
    if (trigger?.dataset.href) openExternal(trigger.dataset.href);
  });

  // Feedback: "Send via Email"
  qs('#btn-send-feedback')?.addEventListener('click', () => {
    const text  = (qs('#feedback-text')?.value ?? '').trim();
    const subj  = encodeURIComponent('Feedback: Splunk Query Studio');
    const body  = encodeURIComponent(
      text
        ? `${text}\n\n---\nSplunk Query Studio v1.0.0`
        : 'Hi,\n\nFeedback about Splunk Query Studio:\n\n'
    );
    openExternal(`mailto:iambobbyv@icloud.com?subject=${subj}&body=${body}`);
    closeModal('feedback');
    showToast('Opening your email client…', 'info');
  });

  // Escape closes open modal (takes priority over toast escape)
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      const open = qs('.modal-overlay.open');
      if (open) { closeModal(open.id.replace('modal-', '')); e.stopImmediatePropagation(); }
    }
  }, true); // capture phase — runs before the toast Escape listener
}

/* ============================================================
   MOBILE NAVIGATION — Sidebar drawer + History bottom sheet
   ============================================================ */

function closeMobileSidebar() {
  document.body.classList.remove('sidebar-open');
}

function closeMobileAside() {
  document.body.classList.remove('aside-open');
}

function closeMobileDrawers() {
  document.body.classList.remove('sidebar-open', 'aside-open');
}

function initMobileNav() {
  const menuBtn  = qs('#btn-mobile-menu');
  const asideBtn = qs('#btn-mobile-aside');
  const backdrop = qs('#mobile-backdrop');

  // Hamburger → toggle sidebar drawer
  menuBtn?.addEventListener('click', e => {
    e.stopPropagation();
    closeMobileAside();
    document.body.classList.toggle('sidebar-open');
  });

  // FAB → toggle history/AI aside bottom sheet
  asideBtn?.addEventListener('click', e => {
    e.stopPropagation();
    closeMobileSidebar();
    document.body.classList.toggle('aside-open');
  });

  // Backdrop click → close all drawers
  backdrop?.addEventListener('click', () => closeMobileDrawers());

  // Category card or sidebar item click → close sidebar drawer
  document.addEventListener('click', e => {
    if (e.target.closest('.category-card') || e.target.closest('.category-item')) {
      setTimeout(() => closeMobileSidebar(), 200);
    }
  });

  // Escape → close mobile drawers (before modal escape handler)
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeMobileDrawers();
  });

  // Resize → clean up body classes + reinit panel display mode
  let _lastMobile = window.innerWidth <= 768;
  window.addEventListener('resize', () => {
    const nowMobile = window.innerWidth <= 768;
    if (!nowMobile) closeMobileDrawers();

    // Only reinit panels when crossing the breakpoint boundary
    if (nowMobile !== _lastMobile) {
      _lastMobile = nowMobile;
      for (let i = 1; i <= 4; i++) {
        const panel = qs(`#panel-step-${i}`);
        if (!panel) continue;
        if (nowMobile) {
          panel.classList.remove('hidden', 'slide-active', 'slide-left');
          if (i === state.step)     panel.classList.add('slide-active');
          else if (i < state.step) panel.classList.add('slide-left');
        } else {
          panel.classList.remove('slide-active', 'slide-left');
          panel.classList.toggle('hidden', i !== state.step);
        }
      }
    }
  });

  // Enable slide transitions after first paint (prevents flash on load)
  setTimeout(() => qs('#wizard-slides')?.classList.add('slides-ready'), 50);
}

/* ============================================================
   AI ADVISOR
   ============================================================ */

// ── Tab switching ──────────────────────────────────────────────────────────
function initAsideTabs() {
  qsa('[data-aside-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      qsa('[data-aside-tab]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const tab = btn.dataset.asideTab;
      qsa('.aside-tab-panel').forEach(p => p.classList.add('hidden'));
      qs(`#aside-panel-${tab}`)?.classList.remove('hidden');
    });
  });
}

// ── Ollama status + background polling ────────────────────────────────────
let _ollamaRetryTimer = null;

async function updateAIStatus() {
  const dot      = qs('#ai-status-dot');
  const text     = qs('#ai-status-text');
  const retryBtn = qs('#ai-retry-btn');
  if (!dot || !text) return;

  // Show checking state
  dot.className    = 'ai-status-dot';
  text.textContent = 'Checking for Ollama…';
  if (retryBtn) retryBtn.style.display = 'none';

  const { available, model } = await checkOllama();

  if (available) {
    dot.className    = 'ai-status-dot online';
    text.textContent = `Ollama · ${model} · ready`;
    if (retryBtn) retryBtn.style.display = 'none';
    // Stop background polling if it was running
    if (_ollamaRetryTimer) { clearInterval(_ollamaRetryTimer); _ollamaRetryTimer = null; }
  } else {
    dot.className    = 'ai-status-dot offline';
    text.textContent = 'Knowledge base active · Ollama offline';
    if (retryBtn) retryBtn.style.display = '';

    // Background poll every 30 s — silently reconnects if Ollama starts later
    if (!_ollamaRetryTimer) {
      _ollamaRetryTimer = setInterval(async () => {
        resetOllamaCheck();
        const { available: on, model: m } = await checkOllama();
        if (on) {
          clearInterval(_ollamaRetryTimer); _ollamaRetryTimer = null;
          const d = qs('#ai-status-dot');
          const t = qs('#ai-status-text');
          const r = qs('#ai-retry-btn');
          if (d) d.className    = 'ai-status-dot online';
          if (t) t.textContent  = `Ollama · ${m} · ready`;
          if (r) r.style.display = 'none';
          showToast('Ollama connected — AI mode enabled!', 'success');
        }
      }, 30_000);
    }
  }
}

// ── Render suggestion cards ────────────────────────────────────────────────
function renderAISuggestions(suggestions) {
  const container = qs('#ai-chat-messages');
  if (!container) return;

  // Remove existing suggestion cards (not welcome, not user/assistant messages)
  qsa('.ai-suggestion', container).forEach(el => el.remove());

  // Prepend new cards after the welcome block
  const welcome = container.querySelector('.ai-welcome');
  for (const s of suggestions) {
    const card = document.createElement('div');
    card.className = `ai-suggestion ${s.type}`;

    let html = `<div class="ai-suggestion-title">${escapeHtml(s.title)}</div>`;
    html += `<div class="ai-suggestion-body">${escapeHtml(s.body)}</div>`;
    if (s.fix) {
      html += `<div class="ai-suggestion-spl" title="Click to copy">${escapeHtml(s.fix)}</div>`;
    }
    if (s.spl) {
      html += `<div class="ai-suggestion-spl" title="Click to copy">${escapeHtml(s.spl)}</div>`;
    }
    card.innerHTML = html;

    // Click-to-copy on SPL snippets inside cards
    card.querySelectorAll('.ai-suggestion-spl').forEach(el => {
      el.addEventListener('click', () => {
        const text = el.textContent;
        if (window.api?.copyToClipboard) {
          window.api.copyToClipboard(text).then(() => showToast('SPL copied!'));
        } else {
          navigator.clipboard.writeText(text).then(() => showToast('SPL copied!'));
        }
      });
    });

    container.insertBefore(card, welcome ? welcome.nextSibling : container.firstChild);
  }

  // Show badge on AI tab if there are warnings/danger findings
  const hasBad = suggestions.some(s => s.type === 'danger' || s.type === 'warning');
  const badge  = qs('#ai-tab-badge');
  if (badge) badge.style.display = hasBad ? '' : 'none';
}

// ── Auto-analyse when entering Step 4 ─────────────────────────────────────
async function aiAnalyzeCurrentQuery() {
  const spl = state.currentSPL || '';
  if (!spl) return;
  const prof = currentProfile();
  const suggestions = await getAutoSuggestions(spl, {
    category:     state.category,
    techKey:      state.techKey,
    queryType:    state.queryType,
    customFields: state.customFields,
  });
  renderAISuggestions(suggestions);
}

// ── Chat message rendering ─────────────────────────────────────────────────
function appendChatMessage(role, text) {
  const container = qs('#ai-chat-messages');
  if (!container) return;

  const msg = document.createElement('div');
  msg.className = `ai-message ${role}`;

  const roleLabel = role === 'user' ? 'You' : 'SPL Advisor';

  // Convert ```spl ... ``` blocks to <pre> elements
  const bodyHtml = escapeHtml(text)
    .replace(/```(?:spl)?\n?([\s\S]*?)```/g, (_, code) =>
      `<pre title="Click to copy">${code}</pre>`
    );

  msg.innerHTML = `<div class="ai-message-role">${roleLabel}</div>
    <div class="ai-message-body">${bodyHtml}</div>`;

  // Click-to-copy on SPL pre blocks
  msg.querySelectorAll('pre').forEach(pre => {
    pre.addEventListener('click', () => {
      if (window.api?.copyToClipboard) {
        window.api.copyToClipboard(pre.textContent).then(() => showToast('SPL copied!'));
      } else {
        navigator.clipboard.writeText(pre.textContent).then(() => showToast('SPL copied!'));
      }
    });
  });

  container.appendChild(msg);
  container.scrollTop = container.scrollHeight;
}

function showTypingIndicator() {
  const container = qs('#ai-chat-messages');
  if (!container) return null;
  const el = document.createElement('div');
  el.className = 'ai-typing';
  el.id = 'ai-typing';
  el.innerHTML = `<div class="ai-typing-dots"><span></span><span></span><span></span></div> Thinking…`;
  container.appendChild(el);
  container.scrollTop = container.scrollHeight;
  return el;
}

// ── Send message ──────────────────────────────────────────────────────────
async function sendAIMessage(userText) {
  if (!userText.trim()) return;

  const input = qs('#ai-input');
  if (input) input.value = '';

  // Switch to AI tab if not already
  const aiTabBtn = qs('[data-aside-tab="ai"]');
  if (aiTabBtn && !aiTabBtn.classList.contains('active')) aiTabBtn.click();

  appendChatMessage('user', userText);
  const typingEl = showTypingIndicator();

  const context = state.currentSPL
    ? `Current SPL:\n${state.currentSPL}\n\nPlatform: ${state.techKey} (${state.category})`
    : '';

  try {
    // Try Ollama first
    const { available } = await checkOllama();
    let reply;

    if (available) {
      reply = await askOllama(userText, context);
    } else {
      // Static knowledge base response
      reply = await staticKBResponse(userText);
    }

    typingEl?.remove();
    appendChatMessage('assistant', reply);
  } catch (err) {
    typingEl?.remove();
    const fallback = await staticKBResponse(userText);
    appendChatMessage('assistant', fallback);
  }
}

// ── Static knowledge base response ────────────────────────────────────────
async function staticKBResponse(query) {
  const results = await searchKnowledge(query);

  if (results.length === 0) {
    return `I couldn't find a direct match in my SPL knowledge base. Try asking about specific commands like "stats", "eval", "timechart", or ask for optimization tips on your current query.`;
  }

  let reply = '';
  for (const r of results.slice(0, 3)) {
    if (r.kind === 'command') {
      const c = r.data;
      reply += `**${c.name}** (${c.category})\n`;
      reply += `${c.description}\n`;
      reply += `Syntax: \`${c.syntax}\`\n`;
      if (c.examples?.length) {
        reply += `Examples:\n\`\`\`spl\n${c.examples.slice(0, 2).join('\n')}\n\`\`\`\n`;
      }
      if (c.tips?.length) reply += `Tip: ${c.tips[0]}\n`;
      reply += '\n';
    } else if (r.kind === 'template') {
      const t = r.data;
      reply += `**Template: ${t.name}**\n${t.description}\n\`\`\`spl\n${t.spl}\n\`\`\`\n\n`;
    } else if (r.kind === 'error') {
      const e = r.data;
      reply += `**Error: ${e.error}**\nCause: ${e.cause}\nFix: ${e.fix}\n\n`;
    }
  }

  return reply.trim() || 'No specific results found. Try a different search term.';
}

// ── Init AI panel ─────────────────────────────────────────────────────────
function initAIPanel() {
  loadKnowledge(); // pre-load in background
  updateAIStatus();

  // Retry button — clears cache and re-probes Ollama
  qs('#ai-retry-btn')?.addEventListener('click', () => {
    resetOllamaCheck();
    updateAIStatus();
  });

  // Send button
  qs('#ai-send-btn')?.addEventListener('click', () => {
    const val = qs('#ai-input')?.value.trim();
    if (val) sendAIMessage(val);
  });

  // Enter key in textarea (Shift+Enter = newline)
  qs('#ai-input')?.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const val = e.target.value.trim();
      if (val) sendAIMessage(val);
    }
  });

  // Quick prompt chips
  qsa('.ai-quick').forEach(btn => {
    btn.addEventListener('click', () => {
      const prompt = btn.dataset.prompt;
      if (prompt) sendAIMessage(prompt);
    });
  });

  // Click-to-copy on pre blocks (delegated)
  qs('#ai-chat-messages')?.addEventListener('click', e => {
    const pre = e.target.closest('pre');
    if (!pre) return;
    if (window.api?.copyToClipboard) {
      window.api.copyToClipboard(pre.textContent).then(() => showToast('SPL copied!'));
    } else {
      navigator.clipboard.writeText(pre.textContent).then(() => showToast('SPL copied!'));
    }
  });
}

/* ============================================================
   THEME TOGGLE
   ============================================================ */

function initTheme() {
  const html = document.documentElement;
  const btn  = qs('#btn-theme-toggle');

  // Apply saved theme on load
  const saved = localStorage.getItem('sqs-theme');
  if (saved === 'light') html.dataset.theme = 'light';

  btn?.addEventListener('click', () => {
    const isLight = html.dataset.theme === 'light';
    if (isLight) {
      delete html.dataset.theme;
      localStorage.removeItem('sqs-theme');
    } else {
      html.dataset.theme = 'light';
      localStorage.setItem('sqs-theme', 'light');
    }
  });
}

/* ============================================================
   FAQ ACCORDION
   ============================================================ */

function initFAQ() {
  document.addEventListener('click', e => {
    const btn = e.target.closest('.faq-question');
    if (!btn) return;
    const isOpen = btn.getAttribute('aria-expanded') === 'true';
    const answer = btn.nextElementSibling;
    if (!answer?.classList.contains('faq-answer')) return;

    // Close all siblings first
    const modal = btn.closest('.modal-body');
    if (modal) {
      modal.querySelectorAll('.faq-question[aria-expanded="true"]').forEach(q => {
        if (q !== btn) {
          q.setAttribute('aria-expanded', 'false');
          q.nextElementSibling?.classList.remove('open');
        }
      });
    }

    btn.setAttribute('aria-expanded', String(!isOpen));
    answer.classList.toggle('open', !isOpen);
  });
}

/* ============================================================
   INIT
   ============================================================ */

function init() {
  try {
    // Render step 1 content
    renderCategoryCards();
    renderSidebar();

    // Set initial wizard state (also initializes mobile slide classes)
    goToStep(state.step);

    // Aside
    renderHistory();
    renderPresets();
    initAsideTabs();
    initAIPanel();

    /* ---- Modals & header menu ---- */
    initModals();

    /* ---- Theme toggle ---- */
    initTheme();

    /* ---- FAQ accordion ---- */
    initFAQ();

    /* ---- Mobile navigation ---- */
    initMobileNav();

    /* ---- Wizard navigation buttons ---- */
    qs('#btn-back')?.addEventListener('click', () => goToStep(state.step - 1));
    qs('#btn-continue')?.addEventListener('click', () => goToStep(state.step + 1));

    /* ---- Stepper click (jump to visited step) ---- */
    qsa('.wizard-step-item').forEach(el => {
      el.addEventListener('click', () => {
        const s = Number(el.dataset.step);
        if (s <= state.maxReached) goToStep(s);
      });
    });

    /* ---- Parameter inputs (step 3) ---- */
    const ipInput = qs('#ip-filter');
    if (ipInput) {
      const onIP = debounce(() => { state.ips = ipInput.value; updatePreview(); }, 300);
      ipInput.addEventListener('input', onIP);
    }

    qs('#time-range-select')?.addEventListener('change', e => {
      state.timeRange = e.target.value;
      updatePreview();
    });

    qs('#query-type-select')?.addEventListener('change', e => {
      state.queryType = e.target.value;
      updatePreview();
    });

    /* ---- Action buttons ---- */
    qs('#btn-copy')?.addEventListener('click', doCopy);
    qs('#btn-copy-result')?.addEventListener('click', doCopy);
    qs('#btn-save-preset')?.addEventListener('click', doSavePreset);
    qs('#btn-save-preset-result')?.addEventListener('click', doSavePreset);
    qs('#btn-reset')?.addEventListener('click', doReset);
    qs('#btn-run')?.addEventListener('click', () => showToast('Open the SPL in your Splunk instance', 'info'));

    qs('#btn-clear-history')?.addEventListener('click', () => {
      clearHistory();
      renderHistory();
      showToast('History cleared', 'info');
    });

    /* ---- Keyboard shortcuts ---- */
    document.addEventListener('keydown', e => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.shiftKey && e.key === 'C') { e.preventDefault(); doCopy(); }
      if (ctrl && e.shiftKey && e.key === 'N') { e.preventDefault(); doReset(); }
      if (e.key === 'Escape') qsa('.toast').forEach(t => t.click());
    });

  } catch (err) {
    console.error('[SQS] init error:', err);
  }
}

// Module scripts are deferred — DOM is ready when this runs
init();
