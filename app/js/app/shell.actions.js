/* Dorax Finance — clicks: the frame of the app: panels, dialogs, the month, the theme, the pager. Joined into A in app/actions.js. */
const SHELL_ACTIONS = {
  close() { const filters = UI.drawer && UI.drawer.kind === 'tx-filters'; UI.drawer = null; UI.sheet = false; renderOverlay(); if (filters) { const el = $('tx-filters-btn'); if (el) el.focus({ preventScroll: true }); } },
  theme() { S.settings.theme = S.settings.theme === 'light' ? 'dark' : 'light'; render(); const el = document.querySelector('.tbtn'); if (el) el.focus(); },
  'modal-cancel'() { const m = UI.modal; if (!m) return; UI.modal = null; renderModal(); const el = m.back && document.querySelector(m.back); if (el) el.focus(); },
  'modal-confirm'() { const m = UI.modal; if (!m || !modalReady()) return; UI.modal = null; renderModal(); m.run(); },
  sheet() { UI.sheet = true; renderOverlay(); },
  month(ds) { S.month = addMonths(S.month, +ds.d); render(); },
  'set-month'(ds) { S.month = ds.ym; render(); },
  'toggle-closed'() { UI.showClosed = !UI.showClosed; render(); },
  // categories & rules
  // the pager of any table: the page changes, the focus stays on the pager (on the other arrow when this one reaches the end)
  pg(ds) { const st = UI.pg[ds.k]; if (!st) return; st.page += ds.v === 'next' ? 1 : -1; render(); const el = $('pg-' + ds.v + '-' + ds.k), other = $('pg-' + (ds.v === 'next' ? 'prev' : 'next') + '-' + ds.k); (el && !el.disabled ? el : other || el || document.body).focus({ preventScroll: true }); },
};
