/* Dorax Finance — clicks: the frame of the app: panels, dialogs, the month, the theme, the pager. Joined into A in app/actions.js. */
const SHELL_ACTIONS = {
  close() {
    const d = UI.drawer || {}, back = ({ 'tx-filters': '#tx-filters-btn', 'wallet-pick': '#wallet-pick-btn', 'dash-order': '#dash-order-btn', 'card-view': `#ac-card .w-mini[data-id="${d.id}"], #ac-card .w-tap[data-id="${d.id}"], .acc-stack .w-card[data-id="${d.id}"], .cc-grid .cc-tap[data-id="${d.id}"]` })[d.kind];      // back to what opened it
    UI.drawer = null; UI.sheet = false; renderOverlay(); const el = back && document.querySelector(back); if (el) el.focus({ preventScroll: true });
  },
  // the menu beside the person's name (features/profile/profile.view.js): language, appearance, help, log out
  'user-menu'() { UI.menu = !UI.menu; renderShell(); const el = UI.menu ? document.querySelector('#user-menu a') : $('user-menu-btn'); if (el) el.focus(); },
  // Help: features/help/help.actions.js (the questions people ask, 2026-10-10)
  'theme-set'(ds) { S.settings.theme = ds.v === 'light' ? 'light' : 'dark'; render(); const el = document.querySelector(`#user-menu [data-a="theme-set"][data-v="${S.settings.theme}"]`); if (el) el.focus(); },
  'modal-cancel'() { const m = UI.modal; if (!m) return; UI.modal = null; renderModal(); if (m.onCancel) return m.onCancel(); const el = m.back && document.querySelector(m.back); if (el) el.focus(); },      // onCancel: a dialog whose other answer does something too
  'modal-confirm'() { const m = UI.modal; if (!m || !modalReady()) return; UI.modal = null; renderModal(); inBook(m.book, () => m.run()); },
  sheet() { UI.sheet = true; renderOverlay(); },
  // the dashboard, Plan, Savings & goals and Categories: whose money is shown, and for a company with two currencies, which one
  // Whose money the app shows (the menu's choice). Transactions follow the side; a company with nothing yet gets its setup first, unless it was
  // left for later; a screen the company does not have goes to its dashboard.
  space(ds, el) {
    const co = ds.v === 'business', was = UI.space, to = co ? 'business' : 'personal';
    const go = () => {
      if (co && !hasCompany()) S.user.company = true;      // entering the company's side, by whatever way, is saying there is one
      setPageBook(co ? bookKeyOf(companyCurrencies(S).includes(UI.spaceCur) ? UI.spaceCur : companyCurrencies(S)[0]) : 'personal'); UI.drawer = null; UI.sheet = false;
      Object.assign(UI.tx, TX_RESET, { month: 'current' });      // the list follows the side by itself (features/transactions/transactions.view.js)
      UI.rulePrompt = null;      // an offer about a merchant of the side being left stays with it
      UI.coSetup = co && companyBlank() && !S.user.coLater ? (UI.coSetup || freshCoSetup()) : null;
      if (co ? UI.coSetup || CO_HIDDEN.includes(UI.route) : HOME_HIDDEN.includes(UI.route)) navigate('dashboard'); else render();      // a screen the other side does not have: its dashboard
    };
    // 2026-10-08 (owner: "the account-switch animation shows the other account before the loader; fix that"): a person's tap raises the loading
    // screen over the side they are on, and only once it covers the page (SIDE_SHIFT_IN) is the other side drawn behind it (app/motion.js)
    if (was !== to && el && !reducedMotion() && document.body.animate) { sideShift(el, to); clearTimeout(sideShift.go); sideShift.go = setTimeout(() => { go(); save(); }, SIDE_SHIFT_IN); return; }
    go();
    if (was !== UI.space) sideShift(el, UI.space);      // another room, not a switch flipped (app/motion.js)
  },
  'space-cur'(ds) { if (companyCurrencies(S).includes(ds.v)) setPageBook(bookKeyOf(ds.v)); UI.drawer = null; render(); },
  'rail-toggle'() { UI.railShut = !railShut(); try { localStorage.setItem('dorax-rail', UI.railShut ? 'shut' : 'open'); } catch (e) { /* private window: kept for this visit only */ } railShape(); if (typeof hideTip === 'function') hideTip(); },
  month(ds) { monthGo(addMonths(S.month, +ds.d)); },
  'set-month'(ds) { monthGo(ds.ym); },
  'form-more'() { const d = UI.drawer; if (!d) return; d.more = !d.more; renderOverlayKeepFocus(); const el = document.querySelector('#overlay .form-more'); if (el) el.focus({ preventScroll: true }); },
  // a phone's Reports: General, Income or Expenses (features/reports/reports.view.js); the finger stays on the view chosen
  'rep-view'(ds) { UI.repView = ds.v; renderNow(); const el = document.querySelector(`.rep-view [data-v="${ds.v}"]`); if (el) el.focus({ preventScroll: true }); },
  // a phone, far back: to the present month in one tap (features/phone/phone.month.js); the focus goes to the month, the button is leaving
  'month-now'() { monthGo(ymOf(S.today)); const p = document.querySelector('.pagehead .month [data-d="-1"]'); if (p && (!document.activeElement || document.activeElement === document.body || document.activeElement.closest('.m-back, .m-now'))) p.focus({ preventScroll: true }); },
  'toggle-closed'() { UI.showClosed = !UI.showClosed; render(); },
  // categories & rules
  // the pager of any table: the page changes, the focus stays on the pager (on the other arrow when this one reaches the end)
  pg(ds) { const st = UI.pg[ds.k]; if (!st) return; st.page += ds.v === 'next' ? 1 : -1; render(); const el = $('pg-' + ds.v + '-' + ds.k), other = $('pg-' + (ds.v === 'next' ? 'prev' : 'next') + '-' + ds.k); (el && !el.disabled ? el : other || el || document.body).focus({ preventScroll: true }); },
};
