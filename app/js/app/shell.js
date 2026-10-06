/* Dorax Finance — the frame: routes, menu, top bar, theme, drawing a screen, moving between screens. */
const ROUTES = [
  ['dashboard', 'grid', viewDashboard], ['transactions', 'list', viewTransactions], ['plan', 'calendar', viewPlan], ['goals', 'flag', viewGoals],
  ['investments', 'trend', viewInvestments], ['reports', 'chart', viewReports], ['accounts', 'wallet', viewAccounts],
  ['imports', 'upload', viewImports], ['openfinance', 'bank', viewOpenFinance], ['converter', 'swap', viewConverter], ['recurring', 'repeat', viewRecurring], ['categories', 'tag', viewCategories], ['settings', 'gear', viewSettings],
  ['profile', 'user', viewProfile],
];
const routeLabel = id => ({ dashboard: t('Dashboard'), transactions: t('Transactions'), plan: t('Plan'), goals: t('Savings & goals'), investments: t('Investments'), reports: t('Reports'), accounts: t('Accounts'),
  converter: t('Statement converter'), imports: t('Imports'), openfinance: t('Open Finance'), recurring: t('Recurring'), categories: t('Categories & rules'), settings: t('Settings'), profile: t('Profile') }[id]);
const MONTH_ROUTES = ['dashboard', 'plan', 'goals', 'reports'];
// v31 (owner: the converter is one person's tool, not everyone's): the fourth place on a phone goes to what every user has, savings and goals. The converter is in More, with the file tools.
const TABS = ['dashboard', 'transactions', 'plan', 'goals'];
const tabLabel = id => id === 'goals' ? t('Goals') : routeLabel(id);
const $ = id => document.getElementById(id);

function navLinks(list) {
  const pending = S.transactions.filter(x => x.status === 'pending').length, c = closeInfo(addMonths(ymOf(S.today), -1)), open = c.total - c.sent;
  return list.map(([id, ic]) => `<a href="#${id}" ${UI.route === id ? 'aria-current="page"' : ''}>${icon(ic)}<span>${routeLabel(id)}</span>${id === 'transactions' && pending ? `<span class="count" title="${t('Pending')}">${pending}</span>` : ''}${id === 'converter' && open ? `<span class="count" title="${t('Pending')}">${open}</span>` : ''}</a>`).join('');
}
/** Light or dark, for the app only (owner, v35). The public pages (home, login, first-time setup, legal) are always dark: the choice is applied as a class on the
    page's root only while the app itself is on screen, and taken off the moment a public page is. Dark is the default; the choice is kept with the account.
    A class of the app's own is used, not a data-theme attribute, so that a host page which stamps its own theme on the root cannot turn the public pages light. */
function applyTheme(pub) {
  const light = !pub && S.settings.theme === 'light', root = document.documentElement;
  root.classList.toggle('app-light', light);
  const meta = document.querySelector('meta[name="theme-color"]'); if (meta) meta.setAttribute('content', light ? '#F6F6F6' : '#000000');
}
const themeButton = () => { const light = S.settings.theme === 'light'; return `<button class="tbtn" data-a="theme" aria-label="${light ? t('Switch to dark') : t('Switch to light')}" data-tip="${light ? t('Dark') : t('Light')}">${icon(light ? 'moon' : 'sun')}</button>`; };
/** Top bar: a warning while the last changes have not reached the server. While everything is saved, nothing is shown (the owner found the
    bar cluttered); where the data lives is said in Settings, under Your data. It never claims a save that did not happen. */
function saveBadge() {
  if (savedState() !== 'failed') return '';
  return `<a class="save-badge warn" href="#settings" title="${t('The server could not be reached. Your changes are sent again by themselves when the connection is back: keep this page open.')}">${t('Your data')}<span class="long"> · ${t('not saved yet')}</span></a>`;
}
function renderShell() {
  document.documentElement.lang = S.settings.lang;
  // two groups, the household's screens and the tools for bringing data in, with a faint line between them and no names over them
  // (owner, 2026-10-05: "remove the sidebar section names and add a line to divide them")
  $('nav').innerHTML = navLinks(ROUTES.slice(0, 7)) + '<div class="nav-rule" role="separator"></div>' + navLinks(ROUTES.slice(7, 13));
  $('rail-foot').innerHTML = userCard();
  const tabs = TABS.map(id => ROUTES.find(r => r[0] === id)), inMore = !TABS.includes(UI.route);
  $('tabbar').innerHTML = tabs.map(([id, ic]) => `<a href="#${id}" ${UI.route === id ? 'aria-current="page"' : ''}>${icon(ic)}${tabLabel(id)}</a>`).join('') + `<button data-a="sheet" ${inMore ? 'aria-current="page"' : ''} aria-haspopup="dialog">${icon('more')}${t('More')}</button>`;
  const ym = S.month;
  // One markup, two layouts. Wide screens: a single row (title, month, tools, main action). Phones: an iOS navigation bar that stays on top
  // (small title appears once the page is scrolled, tools on the right) and, under it, the large title that scrolls away with the content.
  const main = { goals: ['goal-new', '', t('New goal')], plan: ['line-new', '', t('New fixed cost')], investments: ['fii-move', 'data-kind="buy"', t('Record movement')], dashboard: ['new-tx', '', t('Add transaction')], transactions: ['new-tx', '', t('Add transaction')], accounts: ['edit-account', 'data-id=""', t('Add account')] }[UI.route];
  $('topbar').innerHTML = `<div class="navbar">
      ${saveBadge()}
      <span class="bar-title" aria-hidden="true">${routeLabel(UI.route)}</span>
      <div class="bar-tools"><label class="sr" for="lang">${t('Language')}</label><select id="lang" class="lang" data-c="setting" data-k="lang">${options(LANGS.map(([v, l]) => [v, v.toUpperCase()]), S.settings.lang)}</select>
        ${themeButton()}
        ${bellButton()}
        ${main ? `<button class="btn primary" data-a="${main[0]}" ${main[1]}>${icon('plus')}<span class="lbl">${main[2]}</span></button>` : ''}</div></div>
    <div class="pagehead"><h1>${routeLabel(UI.route)}</h1>
      ${MONTH_ROUTES.includes(UI.route) ? `<div class="month" role="group" aria-label="${t('Month')}"><button data-a="month" data-d="-1" aria-label="${t('Previous month')}" ${ym <= minMonth() ? 'disabled' : ''}>${icon('left')}</button><span>${fmt.month(ym, true)}</span><button data-a="month" data-d="1" aria-label="${t('Next month')}" ${ym >= ymOf(S.today) ? 'disabled' : ''}>${icon('right')}</button></div>` : ''}</div>`;
}
// Renders triggered by a field's change event are postponed until focus has moved and any click in progress has landed,
// so Tab order survives and a button pressed straight after typing still receives its click. State is always updated immediately.
let deferring = false, renderPending = false, overlayPending = false, pointerDown = false;
function flushDeferred() {
  if (pointerDown) return setTimeout(flushDeferred, 40);
  const full = renderPending; renderPending = overlayPending = false;
  if (full) renderNow(); else overlayNow();
}
function render() { if (!deferring) return renderNow(); if (!renderPending && !overlayPending) setTimeout(flushDeferred, 0); renderPending = true; }
function renderNow() {
  syncNames();
  const active = document.activeElement, id = active && active.id, pos = id && active.selectionStart != null ? [active.selectionStart, active.selectionEnd] : null, key = id ? null : focusKey(active);
  const sx = [...document.querySelectorAll('#view .tbl-wrap')].map(w => w.scrollLeft), before = UI.autoScroll || reducedMotion() ? null : snapshot();
  $('view').classList.remove('enter'); $('topbar').classList.remove('enter'); $('public').classList.remove('enter');
  const pub = !UI.session;
  document.querySelector('.app').hidden = pub; $('tabbar').hidden = pub; $('public').hidden = !pub;
  applyTheme(pub);
  if (pub) {       // not logged in: the landing page, the login or the first question; nothing of the app is in the page
    document.documentElement.lang = S.settings.lang; $('view').innerHTML = ''; $('public').innerHTML = viewPublic(); UI.autoScroll = false; watchReveal();
    renderOverlay();
    if (id) { const el = $(id); if (el && el !== document.activeElement) { el.focus({ preventScroll: true }); if (pos && el.setSelectionRange) try { el.setSelectionRange(pos[0], pos[1]); } catch (e) { } } }
    return;
  }
  $('public').innerHTML = '';
  renderShell();
  $('view').innerHTML = ROUTES.find(x => x[0] === UI.route)[2]();
  document.querySelectorAll('#view .tbl-wrap').forEach((w, i) => {
    if (UI.autoScroll) { const cur = w.querySelector('thead th.cur'), first = w.querySelector('thead th'); if (cur && first) w.scrollLeft = Math.max(0, cur.offsetLeft - first.offsetWidth - 8); }
    else if (sx[i]) w.scrollLeft = sx[i];
  });
  UI.autoScroll = false; UI.flash = null;
  if (before) morph(before);
  renderOverlay();
  if (id) { const el = $(id); if (el && el !== document.activeElement) { el.focus({ preventScroll: true }); if (pos && el.setSelectionRange) try { el.setSelectionRange(pos[0], pos[1]); } catch (e) { } } }
  else if (key) { const el = document.querySelector(key); if (el && el !== document.activeElement) el.focus({ preventScroll: true }); }
}
/** A button has no id; after a re-render the same button is found again by its action and data attributes, so keyboard focus is not lost. */
function focusKey(el) {
  if (!el || !el.dataset || !el.dataset.a || !el.closest('#view, #overlay, #topbar, #public, #rail-foot')) return null;
  return el.tagName.toLowerCase() + Object.entries(el.dataset).map(([k, v]) => `[data-${k.replace(/[A-Z]/g, c => '-' + c.toLowerCase())}="${String(v).replace(/["\\]/g, '\\$&')}"]`).join('');
}
// Navigation never relies on the browser following a "#route" link: inside a hosted or embedded frame that would load another page.
// Clicks on such links are intercepted (see the click handler) and routed here; the address is updated only where the browser allows it.
function navigate(route) {
  if (route === 'contabilizei') route = 'converter';      // the screen's name before v31: old links still open it
  UI.route = ROUTES.some(r => r[0] === route) ? route : 'dashboard';
  UI.sheet = false; UI.autoScroll = true; UI.pg = {};      // another screen: every table starts on its first page
  try { if (UI.session && location.hash.slice(1) !== UI.route) history.replaceState(null, '', '#' + UI.route); } catch (e) { /* sandboxed frame: keep the route in memory only */ }
  renderNow(); window.scrollTo(0, 0); enterView();
}
const go = navigate;
