/* ============================================================
   UI — Toast system, DOM helpers, SVG icon map
   ============================================================ */

/* ---- SVG Icons ---- */
export const icons = {
  network: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="8" cy="3" r="1.5"/>
    <circle cx="3" cy="13" r="1.5"/>
    <circle cx="13" cy="13" r="1.5"/>
    <path d="M8 4.5v3M8 7.5L3 11.5M8 7.5L13 11.5"/>
  </svg>`,

  server: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <rect x="2" y="3" width="12" height="4" rx="1"/>
    <rect x="2" y="9" width="12" height="4" rx="1"/>
    <circle cx="12" cy="5" r="0.8" fill="currentColor" stroke="none"/>
    <circle cx="12" cy="11" r="0.8" fill="currentColor" stroke="none"/>
  </svg>`,

  datacenter: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <rect x="2" y="2" width="12" height="3" rx="0.8"/>
    <rect x="2" y="6.5" width="12" height="3" rx="0.8"/>
    <rect x="2" y="11" width="12" height="3" rx="0.8"/>
    <circle cx="12" cy="3.5" r="0.6" fill="currentColor" stroke="none"/>
    <circle cx="12" cy="8" r="0.6" fill="currentColor" stroke="none"/>
    <circle cx="12" cy="12.5" r="0.6" fill="currentColor" stroke="none"/>
  </svg>`,

  apps: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <rect x="2" y="2" width="5" height="5" rx="1"/>
    <rect x="9" y="2" width="5" height="5" rx="1"/>
    <rect x="2" y="9" width="5" height="5" rx="1"/>
    <rect x="9" y="9" width="5" height="5" rx="1"/>
  </svg>`,

  clock: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="8" cy="8" r="6"/>
    <path d="M8 5v3l2 2"/>
  </svg>`,

  search: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="7" cy="7" r="4.5"/>
    <path d="M10.5 10.5L13.5 13.5"/>
  </svg>`,

  copy: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <rect x="5" y="5" width="8" height="9" rx="1.2"/>
    <path d="M11 5V3.8A.8.8 0 0010.2 3H3.8A.8.8 0 003 3.8v8.4a.8.8 0 00.8.8H5"/>
  </svg>`,

  save: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M3 3h8l2 2v8a1 1 0 01-1 1H4a1 1 0 01-1-1V3z"/>
    <rect x="5" y="9" width="6" height="4" rx="0.5"/>
    <rect x="5" y="3" width="5" height="3" rx="0.5"/>
  </svg>`,

  run: `<svg viewBox="0 0 16 16" fill="currentColor">
    <path d="M5 3l9 5-9 5V3z"/>
  </svg>`,

  reset: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M2.5 8A5.5 5.5 0 118 13.5"/>
    <path d="M2.5 4v4h4"/>
  </svg>`,

  history: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="8" cy="8" r="6"/>
    <path d="M8 5v3l-2 2"/>
  </svg>`,

  preset: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <polygon points="8,2 10,6 14,6 11,9 12,13 8,10.5 4,13 5,9 2,6 6,6"/>
  </svg>`,

  spl: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M3 4l4 4-4 4M9 12h4"/>
  </svg>`,

  globe: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="8" cy="8" r="6"/>
    <path d="M2 8h12M8 2c-2 1.5-3 3.5-3 6s1 4.5 3 6M8 2c2 1.5 3 3.5 3 6s-1 4.5-3 6"/>
  </svg>`,

  gear: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="8" cy="8" r="2.5"/>
    <path d="M8 2v1.5M8 12.5V14M2 8h1.5M12.5 8H14M3.5 3.5l1 1M11.5 11.5l1 1M12.5 3.5l-1 1M4.5 11.5l-1 1"/>
  </svg>`,

  check: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M3 8l3.5 3.5L13 4"/>
  </svg>`,

  warn: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M8 2L1 14h14L8 2z"/>
    <path d="M8 7v3M8 12h.01"/>
  </svg>`,

  error: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="8" cy="8" r="6"/>
    <path d="M6 6l4 4M10 6l-4 4"/>
  </svg>`,

  info: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="8" cy="8" r="6"/>
    <path d="M8 7v4M8 5h.01"/>
  </svg>`,

  trash: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M3 4h10M6 4V3h4v1M5 4l.7 9h4.6L11 4"/>
  </svg>`
};

/* ---- Toast system ---- */

const TOAST_ICONS = {
  success: icons.check,
  error:   icons.error,
  info:    icons.info
};

export function showToast(message, type = 'success', duration = 3000) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `${TOAST_ICONS[type] || TOAST_ICONS.info}${escapeHtml(message)}`;

  container.appendChild(toast);

  // Auto-remove
  const timer = setTimeout(() => removeToast(toast), duration);

  // Click to dismiss
  toast.addEventListener('click', () => {
    clearTimeout(timer);
    removeToast(toast);
  });
}

function removeToast(toast) {
  if (!toast.isConnected) return;
  toast.classList.add('removing');
  toast.addEventListener('animationend', () => toast.remove(), { once: true });
  // Fallback if animation doesn't fire
  setTimeout(() => toast.remove(), 300);
}

/* ---- DOM helpers ---- */

export function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function qs(selector, root = document) {
  return root.querySelector(selector);
}

export function qsa(selector, root = document) {
  return Array.from(root.querySelectorAll(selector));
}
