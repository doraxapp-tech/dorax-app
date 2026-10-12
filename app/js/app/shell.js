/* Dorax Finance — the frame: routes, menu, top bar, theme, drawing a screen, moving between screens. */
const ROUTES = [
  ['dashboard', 'grid', viewDashboard], ['transactions', 'list', viewTransactions], ['plan', 'calendar', viewPlan], ['goals', 'flag', viewGoals],
  ['investments', 'trend', viewInvestments], ['reports', 'chart', viewReports], ['accounts', 'wallet', viewAccounts],
  ['imports', 'upload', viewImports], ['openfinance', 'bank', viewOpenFinance], ['converter', 'swap', viewConverter], ['recurring', 'repeat', viewRecurring], ['categories', 'tag', viewCategories], ['settings', 'gear', viewSettings],
  ['profile', 'user', viewProfile],
];
// 2026-10-09 (owner: "goals and savings should be separate: the savings are real, the goals' numbers are not; group accounts and savings"): Goals is
// what the person wants to achieve; Accounts & savings is what they really have
const routeLabel = id => ({ dashboard: t('Dashboard'), transactions: t('Transactions'), plan: t('Plan'), goals: t('Goals'), investments: t('Investments'), reports: t('Reports'), accounts: t('Accounts & savings'),
  converter: t('Statement converter'), imports: t('Imports'), openfinance: t('Open Finance'), recurring: t('Recurring'), categories: t('Categories & rules'), settings: t('Settings'), profile: t('Profile') }[id]);
const MONTH_ROUTES = ['dashboard', 'plan', 'goals', 'reports'];
// v31 (owner: the converter is one person's tool, not everyone's): the fourth place on a phone goes to what every user has, savings and goals. The converter is in More, with the file tools.
const TABS = ['dashboard', 'transactions', 'plan', 'goals'];
// BETA (owner, 2026-10-08): with the cards on, Accounts takes Transactions' place in the bar; Transactions moves to More (features/accounts/wallet.js)
// 2026-10-08 (owner: "in the mobile menu change Accounts for Reports"): Reports takes the place; Accounts is in More and a tap on the balance on top
const tabsNow = () => walletOn() ? ['dashboard', 'reports', 'plan', 'goals'] : TABS;
const tabLabel = id => id === 'goals' ? t('Goals') : routeLabel(id);
const $ = id => document.getElementById(id);

// 2026-10-07 (owner: "I don't want a switch on every tab, I want two separate dashboards"): whose money the app shows is chosen once, in the
// menu under the logo, and the whole app follows: the dashboard, Plan, Savings & goals and Categories show that side's book, Transactions
// lists that side's accounts, the screens the company does not have yet leave the menu, and the company's side wears blue. A phone has no
// side menu: the same choice is one button at the left of its top bar, on every screen. (Before: a Household | Company switch in the top
// bar of each of those four screens, from 2026-10-06.)
/** The screens that are the household's only: on the company's side they are not in the menu, and opening one goes back to the household. */
const CO_HIDDEN = ['investments', 'recurring', 'openfinance'];
/** The screens that are the company's only (owner, 2026-10-09: "the statement converter is only for the company account; I don't think a person
    needs it"): it makes the OFX files an accounting platform asks of a company. On the household's side it is not in the menu, and opening it
    goes to the company's side, or to Imports for someone with no company. */
const HOME_HIDDEN = ['converter'];
const sideRoutes = list => list.filter(r => !(UI.space === 'business' ? CO_HIDDEN : HOME_HIDDEN).includes(r[0]));
/** The company's side, for a company-only screen opened from the household's (render). */
function toCompanySide() {
  const cs = companyCurrencies(S); setPageBook(bookKeyOf(cs.includes(UI.spaceCur) ? UI.spaceCur : cs[0]));
  Object.assign(UI.tx, TX_RESET, { month: 'current' }); UI.coSetup = null;
}
/** The side an account belongs to, for something of that account opened from the other side (an account's transactions). */
function toSideOf(a) {
  if (a.scope === 'business') { const cs = companyCurrencies(S); setPageBook(bookKeyOf(cs.includes(a.currency) ? a.currency : cs[0])); }
  else setPageBook('personal');
  Object.assign(UI.tx, TX_RESET, { month: 'current' }); UI.coSetup = null; UI.drawer = null; UI.sheet = false; applyTheme(false);
}
/** Household or Company, in the menu. It is there for everybody, with or without a company. */
/** The computer's way to the other side: the phone's button with two opposite arrows, beside the eye at the top of the menu (owner, 2026-10-08:
    "put the account-switch icon beside the eye on the computer, and take out the switch that is there now"). Only for someone with a company. */
function railFlip() {
  if (!hasCompany()) return '';
  const co = UI.space === 'business', say = co ? t('Switch to Household') : t('Switch to Company');
  return `<button class="iconbtn rail-flip" data-a="space" data-v="${co ? 'personal' : 'business'}" aria-label="${say}" data-tip="${say}">${icon('swap')}</button>`;
}
/** The menu at the side opens and closes (owner, 2026-10-08: "add a button to open and close the sidebar"). Closed, it is a narrow column of icons
    (each one's name in a tip), so every screen is still one click away. Kept on this device (a computer's own preference). */
const railShut = () => { if (UI.railShut === undefined) { try { UI.railShut = localStorage.getItem('dorax-rail') === 'shut'; } catch (e) { UI.railShut = false; } } return UI.railShut; };
function railShape() {
  const shut = railShut(), app = document.querySelector('.app'), b = $('rail-toggle'); if (app) app.classList.toggle('rail-shut', shut);
  if (b) { const say = shut ? t('Open the menu') : t('Close the menu'); b.setAttribute('aria-expanded', String(!shut)); b.setAttribute('aria-label', say); b.dataset.tip = say; b.innerHTML = icon(shut ? 'right' : 'left'); }
  // closed, each icon says what it is when pointed at; open, the words are there and no tip is needed
  document.querySelectorAll('#rail .nav a, #rail .findbtn, #rail .who').forEach(e => { if (shut) e.dataset.tip = e.classList.contains('who') ? (S.user.name || S.user.email || '') : e.classList.contains('findbtn') ? t('Search') + ' (F)' : e.querySelector('span').textContent; else delete e.dataset.tip; });
}
function sideSwitch() {
  if (!hasCompany()) return '';      // someone with no company has nothing to choose between (ui/lookups.js)
  const co = UI.space === 'business';
  return `<div class="side-seg" role="group" aria-label="${t('Whose money')}">${[['personal', 'home', t('Household')], ['business', 'briefcase', t('Company')]].map(([v, ic, l]) => `<button data-a="space" data-v="${v}" aria-pressed="${co === (v === 'business')}">${icon(ic)}<span>${l}</span></button>`).join('')}</div>`;
}
/** A company that holds money in more than one currency plans each one apart: on its side, the screens that read a book ask which.
    Categories are the same for every currency, so that screen does not ask. */
function spaceSwitch() {
  const cs = companyCurrencies(S); if (UI.space !== 'business' || !SPACE_ROUTES.includes(UI.route) || UI.route === 'categories' || cs.length < 2) return '';
  return `<div class="space">${seg('space-cur', cs.map(c => [c, c]), pageBookKey().slice(9), t('Currency'))}${info(t('The company’s money is planned one currency at a time: fixed costs and goals count only its accounts in the currency chosen here, and nothing is converted.'))}</div>`;
}
function navLinks(list) {
  const biz = UI.space === 'business', pending = S.transactions.filter(x => x.status === 'pending' && acct(x.accountId) && isBiz(x.accountId) === biz).length, c = closeInfo(addMonths(ymOf(S.today), -1)), open = c.total - c.sent;
  return list.map(([id, ic]) => `<a href="#${id}" ${UI.route === id ? 'aria-current="page"' : ''}>${icon(ic)}<span>${routeLabel(id)}</span>${id === 'transactions' && pending ? `<span class="count" title="${t('Pending')}">${pending}</span>` : ''}${id === 'converter' && open ? `<span class="count" title="${t('Pending')}">${open}</span>` : ''}</a>`).join('');
}
/** Light or dark, for the app only (owner, v35). The public pages (home, login, first-time setup, legal) are always dark: the choice is applied as a class on the
    page's root only while the app itself is on screen, and taken off the moment a public page is. Dark is the default; the choice is kept with the account.
    A class of the app's own is used, not a data-theme attribute, so that a host page which stamps its own theme on the root cannot turn the public pages light. */
/** The theme on screen (v196, owner, 2026-10-12: "agrega en el modo light/dark la opción de copiar al dispositivo del usuario, y muestra el lado
    oscuro o claro desde el primer inicio, basado en la configuración de su dispositivo"): the person's choice, light or dark, or, with "Automatic"
    (a new account's, and any account that never chose), the device's own; when the device changes (at nightfall, from its settings) the app follows. */
const THEME_MQ = window.matchMedia ? matchMedia('(prefers-color-scheme: dark)') : null;
/** The computer and the phone each keep their own (v202, owner, 2026-10-12: "desenlaza la PC del móvil en cuanto a light/dark theme, quiero tener
    las versiones que quiera y que una no afecte a la otra"): S.settings.theme is the computer's, S.settings.themePhone the phone's (the phone's
    layout, up to 920 px). An account from before has only the first: both start from it, and the first change on either side keeps the other as
    it was. */
const themeKey = () => isPhone() ? 'themePhone' : 'theme';
/** What the person chose on this side: 'light', 'dark' or 'system' (Automatic). */
const themeChoice = () => { const k = themeKey(), v = S.settings[k] === undefined ? S.settings.theme : S.settings[k]; return v === 'light' || v === 'dark' ? v : 'system'; };
const themeNow = () => { const v = themeChoice(); return v !== 'system' ? v : THEME_MQ && THEME_MQ.matches ? 'dark' : 'light'; };
/** A choice made on this side, and only for it. */
function themeSet(v) { if (S.settings.themePhone === undefined) S.settings.themePhone = themeOf(S.settings.theme); S.settings[themeKey()] = themeOf(v); }
const themeOf = v => v === 'light' || v === 'dark' ? v : 'system';
if (THEME_MQ && THEME_MQ.addEventListener) THEME_MQ.addEventListener('change', () => { if (UI.session && themeChoice() === 'system') render(); });
/** The phone's look before the summary "Bosque" (v175–v194), for the suites that test the parts it still shares with the company's side and a
    computer (tests/pw.js: oldLook). The household on a phone always has the new one. */
const lookOld = () => window.DORAX_OLD_LOOK === true;
function applyTheme(pub) {
  const light = !pub && themeNow() === 'light', root = document.documentElement;
  root.classList.toggle('app-light', light);
  root.classList.toggle('side-co', !pub && UI.space === 'business');      // the company's side wears blue (css/screens/company.css)
  root.classList.toggle('in-app', !pub);      // the app itself is on screen: the room for the page's scroll bar is kept (css/base/tokens.css)
  // on a phone the browser's own bar takes the colour of the panel at the top of the page, so the two read as one piece
  const phone = !pub && window.matchMedia && matchMedia('(max-width: 920px)').matches;
  // a phone's summary, light, on the household's side: the summary "Bosque", its forest block at the top (owner, 2026-10-11: "lleva esa a cabo en
  // resumen, exactamente lo que me muestras"; features/phone/bosque.js, css/look/look-land.css), and the browser's bar the same forest
  // a computer too since v199 (owner, 2026-10-12: "push updates a la versión de ordenador"; css/look/look-land-desk.css)
  const land = !pub && UI.space !== 'business' && !lookOld(); root.classList.toggle('land', land); root.classList.toggle('land-dark', land && !light);      // both themes since v194 ("el modo oscuro me lleva al diseño viejo"): the dark one is the look's dark version
  root.classList.toggle('land-page', land && UI.route !== 'dashboard' && UI.route !== 'transactions');      // every screen since v193 ("sigue con el resto de la webapp", features/phone/bosque-frame.js); the summary and Transactions have their own top
  const meta = document.querySelector('meta[name="theme-color"]'); if (meta) meta.setAttribute('content', land ? '#112622' : phone ? (UI.space === 'business' ? (light ? '#DAE0EB' : '#081429') : (light ? '#F3F9EF' : '#10180A')) : light ? '#F6F6F6' : '#000000');      // a phone: the top of its glass panel (screens/phone.css)
}
/** Top bar: a warning while the last changes have not reached the server. While everything is saved, nothing is shown (the owner found the
    bar cluttered); where the data lives is said in Settings, under Your data. It never claims a save that did not happen. */
function saveBadge() {
  if (savedState() !== 'failed') return '';
  return `<a class="save-badge warn" href="#settings" title="${t('The server could not be reached. Your changes are sent again by themselves when the connection is back: keep this page open.')}">${t('Your data')}<span class="long"> · ${t('not saved yet')}</span></a>`;
}
/** The main thing to add on a screen: [action, its data attributes, its words]. The top bar's button on a computer; the first row of the phone's quick list. */
const routeMain = route => ({ goals: ['goal-new', '', t('New goal')], plan: ['line-new', '', t('New fixed cost')], investments: ['fii-move', 'data-kind="buy"', t('Record movement')], dashboard: ['new-tx', '', t('Add transaction')], transactions: ['new-tx', '', t('Add transaction')], accounts: ['edit-account', 'data-id=""', t('Add account')] }[route]);
let shellRoute = null;      // the screen the top bar was last drawn for: arriving at the summary lights the Journey's flame (owner, 2026-10-10)
function renderShell() {
  document.documentElement.lang = S.settings.lang;
  const arrived = UI.route !== shellRoute; shellRoute = UI.route;
  // two groups, the household's screens and the tools for bringing data in, with a faint line between them and no names over them
  // (owner, 2026-10-05: "remove the sidebar section names and add a line to divide them")
  $('rail-side').innerHTML = railFlip();      // was the Household | Company switch under the logo (sideSwitch), until 2026-10-08
  // the word "Company" sits beside the logo while the company's side is on screen (owner, 2026-10-07: "put the blue bullet that says company next to the Dorax logo in the sidebar")
  const tag = $('brand-tag'); if (tag) { tag.hidden = UI.space !== 'business'; tag.textContent = t('Company'); }
  const eye = $('rail-eye'); if (eye) eye.innerHTML = numsButton();      // a computer's eye, in the logo's row (a phone has it in its balance)
  $('nav').innerHTML = navLinks(sideRoutes(ROUTES.slice(0, 7))) + '<div class="nav-rule" role="separator"></div>' + navLinks(sideRoutes(ROUTES.slice(7, 13)));
  $('rail-find').innerHTML = findField();
  $('rail-foot').innerHTML = userCard();
  railShape();
  const tabs = tabsNow().map(id => ROUTES.find(r => r[0] === id)), inMore = !tabsNow().includes(UI.route);
  // 2026-10-07 (owner: "separate the mobile version too: intuitive, easy, fun in a way, with the main things in the palm of the hand").
  // The phone's bar: two screens, the round + in the middle (what a thumb reaches first: it opens the short list of things to record,
  // quickSheet below), two screens. "More" moved up to the top bar, where the + used to be.
  const tab = ([id, ic]) => `<a href="#${id}" ${UI.route === id ? 'aria-current="page"' : ''}>${icon(ic)}${tabLabel(id)}</a>`;
  // The bar is drawn once per language and afterwards only the mark of the screen in use moves (owner, 2026-10-07: "the bar changes position
  // depending on the tab"): drawn again on every screen, its round + played its entrance each time and the whole bar blinked.
  const bar = $('tabbar'), barKey = S.settings.lang + '|' + tabsNow().join();
  if (bar.dataset.k !== barKey) { bar.dataset.k = barKey; bar.innerHTML = tabs.slice(0, 2).map(tab).join('') + `<button class="fab" data-a="quick" aria-haspopup="dialog" aria-label="${t('Add')}">${icon('plus')}</button>` + tabs.slice(2).map(tab).join(''); }
  else for (const a of bar.querySelectorAll('a')) { if (a.getAttribute('href') === '#' + UI.route) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); }
  const ym = S.month;
  // One markup, two layouts. Wide screens: a single row (title, month, tools, main action). Phones: an iOS navigation bar that stays on top
  // (small title appears once the page is scrolled, tools on the right) and, under it, the large title that scrolls away with the content.
  // a phone's title is the short name the bar at the foot uses, so the title and the month always share one row
  const main = routeMain(UI.route), full = routeLabel(UI.route), short = tabsNow().includes(UI.route) ? tabLabel(UI.route) : full;
  // a phone: the summary has the person's photo and greeting at the left of the top panel; every other screen has its name there instead (owner,
  // 2026-10-10: "on the phone, in the top menu, on every tab except Resumen, remove the profile photo and the greeting and put the tab's name in
  // their place"). So no screen repeats its name in a large title under the panel (before: the screens of the bar at the foot had none, the others
  // had one, owner 2026-10-08). The title stays for screen readers; a screen with no month keeps no empty row. The profile is in More.
  const named = UI.route !== 'dashboard';
  // a phone in the summary's look: the switch, the bell and More are the summary's; the other screens keep their own tools (features/phone/bosque-frame.js)
  const bqFrame = named && typeof landOn === 'function' && landOn() && isPhone();      // a computer keeps its row: the title, the month, the bell, the screen's main button (v199)
  // the month's row: the summary's, and every screen's on a computer or outside this look; in this look the other screens say their month where it
  // counts (owner, 2026-10-12: "no me gusta la fecha en todas las pantallas, es repetitivo": Reports has it in its top, Plan and Goals a way back
  // when another month is in view; features/phone/bosque-frame.js)
  const monthHere = MONTH_ROUTES.includes(UI.route) && !bqFrame;
  // the side's net balance, with its eye, belongs to the summary (owner, 2026-10-09: "the household's net balance shows on every screen on the phone;
  // it belongs to Resumen"): the other screens start right under the top row
  $('topbar').innerHTML = `${installBanner()}<div class="navbar">
      <span class="bar-left">${named ? `${bqFrame ? bqBack() : ''}<span class="bar-name" aria-hidden="true">${esc(short)}</span>` : barWho()}${saveBadge()}</span>
      <span class="bar-title" aria-hidden="true">${routeLabel(UI.route)}</span>
      <div class="bar-tools">${bqFrame ? bqPageTools() : `${sideFlip()}${bellButton()}<button class="more-btn" data-a="sheet" ${inMore ? 'aria-current="page"' : ''} aria-haspopup="dialog" aria-label="${t('More')}">${icon('more')}</button>`}
        ${main ? `<button class="btn primary" data-a="${main[0]}" ${main[1]}>${icon('plus')}<span class="lbl">${main[2]}</span></button>` : ''}</div></div>
    ${UI.route === 'dashboard' ? `<div class="bar-bal${UI.space === 'business' ? ' co' : ''}">${barBalance()}</div>` : ''}
    <div class="pagehead${monthHere ? ' has-month' : ''}${!monthHere && !spaceSwitch() ? ' bare' : ''}"><h1>${short === full ? full : `<span class="h-full">${full}</span><span class="h-short" aria-hidden="true">${short}</span>`}</h1>
      ${monthHere && isPhone() ? monthPhone(ym) : monthHere ? `${monthFar(ym) ? `<button class="btn m-now" data-a="month-now">${t('Back to present')}</button>` : ''}<div class="month" role="group" aria-label="${t('Month')}"><button data-a="month" data-d="-1" aria-label="${t('Previous month')}" ${ym <= minMonth() ? 'disabled' : ''}>${icon('left')}</button><span>${fmt.month(ym, true)}</span><button data-a="month" data-d="1" aria-label="${t('Next month')}" ${ym >= ymOf(S.today) ? 'disabled' : ''}>${icon('right')}</button></div>` : ''}${UI.route === 'dashboard' ? journeyButton(arrived) : ''}${coBalRow() ? '' : spaceSwitch()}</div>`;      // the Journey out of debt, at the right of the month (owner, 2026-10-10)
  fitCoBal();      // a phone, the company's summary: its balance whole beside the currency (features/phone/phone.view.js)
  monthPlace();      // the month: on a phone the strip on its month; on both, the way back to the present (features/phone/phone.month.js)
}
// Renders triggered by a field's change event are postponed until focus has moved and any click in progress has landed,
// so Tab order survives and a button pressed straight after typing still receives its click. State is always updated immediately.
let deferring = false, renderPending = false, overlayPending = false, pointerDown = false;
function flushDeferred() {
  if (pointerDown) return setTimeout(flushDeferred, 40);
  const full = renderPending; renderPending = overlayPending = false;
  if (full) renderNow(); else overlayNow();
}
/** A phone, the company's summary: the currency is chosen at the right of its net balance, not in a row of its own under the month (owner, 2026-10-10:
    "on the company account put the company's net balance on the left and the currency switch on the right"). features/phone/phone.view.js draws it. */
const coBalRow = () => UI.route === 'dashboard' && UI.space === 'business' && isPhone();
function render() { if (!deferring) return renderNow(); if (!renderPending && !overlayPending) setTimeout(flushDeferred, 0); renderPending = true; }
function renderNow() {
  syncNames();
  const active = document.activeElement, id = active && active.id, pos = id && active.selectionStart != null ? [active.selectionStart, active.selectionEnd] : null, key = id ? null : focusKey(active);
  const sx = [...document.querySelectorAll('#view .tbl-wrap')].map(w => w.scrollLeft), before = UI.autoScroll || reducedMotion() ? null : snapshot();
  $('view').classList.remove('enter'); $('topbar').classList.remove('enter'); $('public').classList.remove('enter');
  const pub = !UI.session;
  document.querySelector('.app').hidden = pub; $('tabbar').hidden = pub; $('public').hidden = !pub;
  if (!pub) document.documentElement.classList.remove('ob-open');      // the first-time setup's page is gone once the app is open
  applyTheme(pub); PAGES.sync();      // the address and the tab's title follow the page on screen (ui/pages.js)
  if (pub) {       // not logged in: the landing page, the login or the first question; nothing of the app is in the page
    document.documentElement.lang = S.settings.lang; $('view').innerHTML = ''; $('public').innerHTML = viewPublic(); obAfter(); UI.autoScroll = false; watchReveal();      // obAfter: the first-time setup's path (features/onboarding)
    renderOverlay();
    if (id) { const el = $(id); if (el && el !== document.activeElement) { el.focus({ preventScroll: true }); if (pos && el.setSelectionRange) try { el.setSelectionRange(pos[0], pos[1]); } catch (e) { } } }
    return;
  }
  $('public').innerHTML = '';
  if (UI.space === 'business' && CO_HIDDEN.includes(UI.route)) { setPageBook('personal'); UI.coSetup = null; applyTheme(false); }      // a household-only screen: the side goes back to the household
  if (UI.space !== 'business' && HOME_HIDDEN.includes(UI.route)) { if (hasCompany()) { toCompanySide(); applyTheme(false); } else UI.route = 'imports'; }      // a company-only screen: the company's side
  renderShell(); issuesMaybe();      // a new issue rings the bell the moment it happens (features/reminders/issues.actions.js)
  $('view').innerHTML = inBook(pageBookKey(), () => ROUTES.find(x => x[0] === UI.route)[2]());       // the page shows its own book, whatever panel is open over it
  document.querySelectorAll('#view .tbl-wrap').forEach((w, i) => {
    if (UI.autoScroll) { const cur = w.querySelector('thead th.cur'), first = w.querySelector('thead th'); if (cur && first) w.scrollLeft = Math.max(0, cur.offsetLeft - first.offsetWidth - 8); }
    else if (sx[i]) w.scrollLeft = sx[i];
  });
  UI.autoScroll = false; UI.flash = null;
  walletAfter();      // the wallet's open row keeps its card (features/accounts/wallet.js)
  if (before) morph(before);
  renderOverlay(); renderCurio(); centsSmall();      // the big figures' cents drawn small (ui/cents.js)
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
  UI.sheet = false; UI.menu = false; UI.autoScroll = true; UI.pg = {}; UI.walletAt = 0;      // another screen: every table starts on its first page, the wallet on its first card
  try { if (UI.session && location.hash.slice(1) !== UI.route) history.replaceState(null, '', '#' + UI.route); } catch (e) { /* sandboxed frame: keep the route in memory only */ }
  renderNow(); toTop(); enterView();
  curioMaybe();      // a curiosity, when one is due (features/ahead/curios.view.js)
  tourMaybe();      // a new person's first visit to a main screen (features/tours)
}
const go = navigate;
