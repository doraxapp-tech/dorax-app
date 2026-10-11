/* Dorax Finance — the addresses of the pages before login.
   Each of those pages has an address of its own (owner, 2026-10-07: "separate the pages of the landing", one address per page, in Portuguese):
       /                   the home page (and, once somebody is logged in, the app, with its screens after a "#")
       /entrar             log in
       /criar-conta        create account
       /recuperar-senha    forgotten password, step 1
       /privacidade        privacy policy
       /termos             terms of use
       /contato            contact form
   It is still one app: every address is answered with the same index.html (vercel.json "rewrites"; tools/serve.js does the same here), and
   this file reads the address when the page opens, changes it when the person moves between pages, and follows the browser's Back and Forward.
   So a page can be reloaded, sent as a link or opened in another tab, and Back goes to the page before instead of leaving the site.
   The screens that are a moment and not a page keep the address they happened on: "check your email", the new password (opened from an
   email), the short wait, "your account could not be opened".
   Where there is no web server (the app opened from disk, the one-file preview) there are no addresses: the pages work as they did before. */
const PAGE_PATHS = { landing: '', login: 'entrar', signup: 'criar-conta', forgot: 'recuperar-senha', privacy: 'privacidade', terms: 'termos', contact: 'contato' };
const PAGES = (() => {
  let on = false, base = '/';
  try {
    const p = location.pathname, cut = p.lastIndexOf('/') + 1, last = p.slice(cut);
    on = /^https?:$/.test(location.protocol) && !document.getElementById('lib-pdf') && (last === '' || last === 'index.html' || Object.values(PAGE_PATHS).includes(last));
    if (on) base = p.slice(0, cut);
  } catch (e) { /* a sandboxed frame has no address to read */ }
  /** The page the address names; the home page for an address that names none. */
  const read = () => { if (!on) return 'landing'; let last = ''; try { last = location.pathname.slice(base.length); } catch (e) { return 'landing'; } return Object.keys(PAGE_PATHS).find(k => k !== 'landing' && PAGE_PATHS[k] === last) || 'landing'; };
  /** What the pages before login remember (UI.pub) for a page: the same as pressing its link (features/public/public.actions.js, pub-go). */
  const state = v => v === 'login' || v === 'signup' ? { screen: 'auth', mode: v } : v === 'forgot' ? { screen: 'forgot', mode: 'login' } : v === 'privacy' || v === 'terms' || v === 'contact' ? { screen: v } : {};
  /** The page on screen, or null for a screen that keeps whatever address it happened on. The app itself, and the first-time setup, are at the root. */
  const shown = () => { if (UI.session) return 'landing'; const p = UI.pub || {}, sc = p.screen; return sc === 'landing' || sc === 'onboard' ? 'landing' : sc === 'auth' ? (p.mode === 'login' ? 'login' : 'signup') : PAGE_PATHS[sc] != null ? sc : null; };
  const names = { login: 'Log in', signup: 'Create account', forgot: 'Choose a new password', privacy: 'Privacy policy', terms: 'Terms of use', contact: 'Contact' };
  const api = {
    on, arrived: 'landing', push: false, homeY: 0,
    read, state, shown,
    /** Where the links in the emails, and Google, send the person back to: always the root, whatever page they were sent from. */
    root: () => on ? location.origin + base : location.origin + location.pathname,
    /** A page's address, for its links. With no addresses, a link that goes nowhere: the click is handled by the page (app/events.js). */
    href: v => on ? base + (PAGE_PATHS[v] || '') : '#',
    /** After every drawing of the page: the tab's title names the page, and the address is the page's own. Moving between pages by a
        link adds a step to the browser's history (pub-go sets push); everything else (logging in, logging out, a notice) replaces the step. */
    sync() {
      const v = shown(), app = !!UI.session || (UI.pub || {}).screen === 'onboard', push = api.push; api.push = false;
      try { document.title = v && names[v] && !app ? t(names[v]) + ' · Dorax Finance' : 'Dorax Finance'; } catch (e) { /* the texts are not loaded yet */ }
      if (!on || v == null) return;
      try {
        const path = base + PAGE_PATHS[v], now = location.pathname;
        if (now === path || (v === 'landing' && now === base + 'index.html')) return;
        history[push ? 'pushState' : 'replaceState'](null, '', path + (app ? location.search + location.hash : ''));      // the app keeps its screen ("#plan") and what it was opened with
      } catch (e) { /* a frame that may not change its address: the pages still work */ }
    },
  };
  api.arrived = read();
  return api;
})();
/** Somebody who is logged in opened the address of a page before login: the app opens, with the same text or form in its side panel. */
function pageArrival() {
  const v = PAGES.arrived; PAGES.arrived = 'landing';
  if (!UI.session || LOCK.on) return;
  if (v === 'privacy' || v === 'terms') A.legal({ v }); else if (v === 'contact') A.contact();
}
// The browser's Back and Forward. The address has already changed: the page it names is shown, the way its link shows it. Back on the home
// page returns to where it was being read. While the app, the first-time setup or a waiting screen is up, those stay, at their own address.
window.addEventListener('popstate', () => {
  if (!PAGES.on || !UI.pub) return;      // before start-up there is no page yet (the login library may clear a link out of the address while it loads)
  if (UI.session || ['loading', 'onboard', 'reset', 'offline'].includes(UI.pub.screen) || UI.pub.busy) return PAGES.sync();
  const v = PAGES.read(); if (v === PAGES.shown()) return;
  const y = PAGES.homeY; A['pub-go']({ v }); PAGES.push = false;
  if (v === 'landing' && y) window.scrollTo(0, y);
});
