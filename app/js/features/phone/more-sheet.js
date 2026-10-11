/* Dorax Finance — More, on a phone: the sheet the button with three dots opens. Drawn by app/overlay.js (renderOverlay: moreSheet).
   Moved out of app/overlay.js on 2026-10-10 (owner: "separate the things that can be separated"). Its styles: css/components/more-sheet.css. */
/** In More, on a phone: the screens left to the computer are named in one line, not listed as places to go (features/phone/desk-only.js). */
function sheetDesk() { const there = sideRoutes(ROUTES).filter(r => deskOnly(r[0])).map(r => routeLabel(r[0])); return there.length ? `<p class="sheet-desk" id="sheet-desk">${DESK_ICON}<span>${t('On the computer: {list}.', { list: there.join(', ') })}</span></p>` : ''; }
/** More, on a phone (owner, 2026-10-10: "order this menu, it mixes the system's settings with the person's and the app's tabs; here are some
    examples", Cash App and ARQ): first the person (photo, name and email, leading to the profile), then the search, then the app's places
    ("Your money"; a tablet also has "Files"), then what is set once ("Preferences": categories, Settings, language, appearance) and Help, and at
    the end the account's own actions as buttons (open a company account, log out), with the terms and the privacy policy under them.
    Each row that goes somewhere ends in a chevron. Transactions is in "Your money" only while the beta puts Accounts in the bar (features/accounts/wallet.js). */
const MORE_GROUPS = [['transactions', 'accounts', 'reports', 'investments', 'recurring', 'imports'], ['openfinance', 'converter'], ['categories', 'settings']];      // imports with the money since a phone has them too (2026-10-10)
const MORE_TITLES = () => [t('Your money'), t('Files'), t('Preferences')];
const moreChev = () => `<span class="mr-chev" aria-hidden="true">${icon('right')}</span>`;
function sheetNav() {
  const can = sideRoutes(ROUTES.filter(r => !tabsNow().includes(r[0]) && !deskOnly(r[0]) && r[0] !== 'profile')), known = MORE_GROUPS.flat();
  const groups = MORE_GROUPS.map(g => g.map(id => can.find(r => r[0] === id)).filter(Boolean));
  groups[0] = groups[0].concat(can.filter(r => !known.includes(r[0])));      // a screen no group names goes with the money
  const light = S.settings.theme === 'light', lang = (LANGS.find(l => l[0] === S.settings.lang) || LANGS[0])[1];
  // a choice in a row: the row says the name and the value, and the whole row is the system's own picker, laid over it unseen
  const pick = (id, ic, label, value, opts, cur) => `<div class="mr-pick"><span class="mr-ic">${icon(ic)}</span><label for="${id}">${label}</label><span class="mr-val" aria-hidden="true">${value}</span>${moreChev()}<select id="${id}" data-c="setting" data-k="${id === 'lang-m' ? 'lang' : 'theme'}"${id === 'lang-m' ? ' class="lang"' : ''}>${options(opts, cur)}</select></div>`;
  const prefs = pick('lang-m', 'globe', t('Language'), lang, LANGS, S.settings.lang) + pick('theme-m', light ? 'sun' : 'moon', t('Appearance'), light ? t('Light') : t('Dark'), [['dark', t('Dark')], ['light', t('Light')]], light ? 'light' : 'dark');
  return groups.map((g, i) => i === 2 || g.length ? `<div class="nav-group mr-group"><h3 class="mr-h">${MORE_TITLES()[i]}</h3>${navLinks(g).replace(/<\/a>/g, moreChev() + '</a>')}${i === 0 ? sheetDesk() : ''}${i === 2 ? prefs : ''}</div>` : '').join('');
}
function moreSheet() {
  const me = `<a class="mr-me" href="#profile"${UI.route === 'profile' ? ' aria-current="page"' : ''}>${avatar()}<span class="mr-who"><b>${esc(S.user.name || t('Profile'))}</b><small>${esc(S.user.email || '')}</small></span>${moreChev()}</a>`;
  return `<div class="scrim" data-a="close"></div><div class="sheet more" role="dialog" aria-label="${t('More')}"><div class="grab" aria-hidden="true"></div>${me}
    <button class="sheet-find" data-a="find">${icon('search')}<span>${t('Search')}</span></button>
    <nav class="nav mr-nav">${sheetNav()}</nav>
    <div class="nav-group mr-group mr-help"><button class="mr-row" data-a="help"><span class="mr-ic">${icon('help')}</span><span>${t('Help')}</span>${moreChev()}</button></div>
    <div class="mr-acts">${hasCompany() ? '' : `<button class="mr-btn sheet-co" data-a="co-open">${t('Open a company account')}</button>`}<button class="mr-btn out" data-a="logout">${t('Log out')}</button></div>
    <p class="mr-legal"><button class="linkbtn" data-a="legal" data-v="terms">${t('Terms of use')}</button> · <button class="linkbtn" data-a="legal" data-v="privacy">${t('Privacy policy')}</button></p></div>`;
}
