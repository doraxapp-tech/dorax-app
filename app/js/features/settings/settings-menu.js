/* Dorax Finance — Settings in parts (v205, owner, 2026-10-12: "crea sub menus debajo de ajustes ya que veo que ajustes es muy largo y no es
   funcional. El sub-menu se muestra al hacer click en ajustes"; and "saca de perfil todo lo que no tenga que ver con ajustes de perfil de usuario y
   ponlo en ajustes").
   Settings is six parts, each a page of its own with its own address (#settings/general…):
     General        the language, the main currency, the number and date format
     Appearance     light or dark, the accounts as cards
     Notifications  the reminders (were in Profile)
     Security       the app lock on this device (was in Profile)
     Imports        how statements come in; on the company's side, the converter and its OFX profiles
     Your data      backup, deleting data, the company's side, privacy, contact
   On a computer the parts open under "Settings" in the side bar when it is pressed, and stay open while a part is on screen; Settings alone opens
   General. On a phone, Settings is the list of the parts (a row each, with what it holds) and a row opens its part; the top bar's ‹ goes back to
   the list. The pages themselves: settings.view.js. */
const SET_IDS = ['general', 'appearance', 'notifications', 'security', 'imports', 'data'];
/** The parts: [id, icon, name, what it holds]. */
const SET_SECS = () => [
  ['general', 'globe', t('General'), t('Language, currency and number format')],
  ['appearance', 'sun', t('Appearance'), t('Light or dark, and how your accounts look')],
  ['notifications', 'bell', t('Notifications'), t('Reminders of bills, pay day and goals')],
  ['security', 'shield', t('Security'), t('The lock of the app on this device')],
  ['imports', 'upload', t('Imports'), UI.space === 'business' ? t('Statements, the converter and its OFX profiles') : t('How your statements come in')],
  ['data', 'archive', t('Your data'), t('Backup, deleting data, privacy and contact')],
];
/** The part on screen: the one chosen; with none, General on a computer and the list on a phone (''). */
const setSecNow = () => UI.route !== 'settings' ? '' : SET_IDS.includes(UI.setSec) ? UI.setSec : isPhone() ? '' : 'general';
const setSecName = id => (SET_SECS().find(s => s[0] === id) || [])[2] || routeLabel('settings');
/** "#settings/currency" for a part of Settings, the screen's name otherwise: what the address says (app/shell.js: navigate). */
const routeAddr = () => UI.route === 'settings' && SET_IDS.includes(UI.setSec) ? 'settings/' + UI.setSec : UI.route;
/** The side bar's Settings: the link, and under it, while Settings is on screen, its parts. Pressing Settings opens them (and General). */
function navSettings(ic) {
  const on = UI.route === 'settings', now = setSecNow();
  const parent = `<a href="#settings" class="nav-parent${on ? ' on' : ''}" aria-expanded="${on}" aria-controls="nav-sub-settings">${icon(ic)}<span>${routeLabel('settings')}</span><i class="nav-chev" aria-hidden="true">${icon('right')}</i></a>`;
  if (!on) return parent;
  return `${parent}<div class="nav-sub" id="nav-sub-settings" role="group" aria-label="${esc(routeLabel('settings'))}">${SET_SECS().map(([id, i, name]) => `<a href="#settings/${id}"${now === id ? ' aria-current="page"' : ''}>${icon(i)}<span>${esc(name)}</span></a>`).join('')}</div>`;
}
/** A phone's Settings: the parts as a list, a row each with what it holds. */
function setList() {
  return `<nav class="set-list" aria-label="${esc(routeLabel('settings'))}">${SET_SECS().map(([id, i, name, say]) => `<a class="set-li" href="#settings/${id}"><span class="set-li-i" aria-hidden="true">${icon(i)}</span><span class="set-li-t"><b>${esc(name)}</b><small>${esc(say)}</small></span><span class="set-li-go" aria-hidden="true">${icon('right')}</span></a>`).join('')}</nav>`;
}
/** A part on a phone outside the summary's look (whose top bar has its own ‹): the way back to the list, at the top of the page. */
const setBackRow = () => isPhone() && !(typeof landOn === 'function' && landOn()) ? `<button type="button" class="set-back" data-a="set-up">${icon('left')}<span>${esc(routeLabel('settings'))}</span></button>` : '';
/** The part on screen stays in sight in the side bar: on a short screen the bar scrolls, and the person's card covers its foot. */
function setNavInView() {
  const r = $('rail'), el = r && UI.route === 'settings' && r.querySelector('#nav-sub-settings a[aria-current]'); if (!el || r.scrollHeight <= r.clientHeight) return;
  const b = el.getBoundingClientRect(), rb = r.getBoundingClientRect(), foot = ($('rail-foot') || {}).offsetHeight || 0, low = rb.bottom - foot - 28;
  if (b.bottom > low) r.scrollTop += b.bottom - low; else if (b.top < rb.top + 8) r.scrollTop -= rb.top + 8 - b.top;
}
