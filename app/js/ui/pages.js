/* Dorax Finance — the addresses of the pages before login.
   Each of those pages has an address of its own (owner, 2026-10-07: "separate the pages of the landing", one address per page, in Portuguese):
       /                   the home page (and, once somebody is logged in, the app, with its screens after a "#")
       /entrar             log in
       /criar-conta        create account
       /recuperar-senha    forgotten password, step 1
       /privacidade        privacy policy
       /termos             terms of use
       /contato            contact form
       /ajuda              the Help center (v209)
       /para-pj, /conversor-de-extrato-ofx, /sobre   for PJ and MEI, the statement converter, about Dorax (v211)
       /blog               the blog, and each post at /blog/<post> (v210): the files a post's page asks for from there (css/…, js/…) are
                           answered from the root (vercel.json)
   It is still one app: every address is answered with the same index.html (vercel.json "rewrites"; tools/serve.js does the same here), and
   this file reads the address when the page opens, changes it when the person moves between pages, and follows the browser's Back and Forward.
   So a page can be reloaded, sent as a link or opened in another tab, and Back goes to the page before instead of leaving the site.
   The screens that are a moment and not a page keep the address they happened on: "check your email", the new password (opened from an
   email), the short wait, "your account could not be opened".
   Where there is no web server (the app opened from disk, the one-file preview) there are no addresses: the pages work as they did before. */
const PAGE_PATHS = { landing: '', login: 'entrar', signup: 'criar-conta', forgot: 'recuperar-senha', privacy: 'privacidade', terms: 'termos', contact: 'contato', help: 'ajuda', blog: 'blog', pj: 'para-pj', converter: 'conversor-de-extrato-ofx', about: 'sobre' };      // ajuda: the Help center (v209); blog: the blog (v210); the pages before launch (v211)
/** The pages that are a screen of their own before login, each at its address (the others: the home page, the login and the account's forms). */
const SITE_PAGES = ['privacy', 'terms', 'contact', 'help', 'blog', 'pj', 'converter', 'about'];
/** A post of the blog has an address of its own under the blog's: blog/<post> (features/blog/blog-posts.js). */
const POST_PATH = /^blog\/([a-z0-9-]+)$/;
const PAGES = (() => {
  let on = false, base = '/';
  try {
    const p = location.pathname, m = p.match(/^(.*\/)blog\/[a-z0-9-]+$/), cut = m ? m[1].length : p.lastIndexOf('/') + 1, last = p.slice(cut);
    on = /^https?:$/.test(location.protocol) && !document.getElementById('lib-pdf') && (!!m || last === '' || last === 'index.html' || Object.values(PAGE_PATHS).includes(last));
    if (on) base = p.slice(0, cut);
  } catch (e) { /* a sandboxed frame has no address to read */ }
  const rest = () => { try { return location.pathname.slice(base.length); } catch (e) { return ''; } };
  /** The page the address names; the home page for an address that names none. */
  const read = () => { if (!on) return 'landing'; const last = rest(); if (POST_PATH.test(last)) return 'blog'; return Object.keys(PAGE_PATHS).find(k => k !== 'landing' && PAGE_PATHS[k] === last) || 'landing'; };
  /** The post of the blog the address names, or ''. */
  const post = () => { if (!on) return ''; const m = rest().match(POST_PATH); return m ? m[1] : ''; };
  /** What the pages before login remember (UI.pub) for a page: the same as pressing its link (features/public/public.actions.js, pub-go). */
  const state = v => {
    if (v === 'help') { let st = null; try { st = history.state; } catch (e) { } UI.hcTopic = (st && st.hc) || ''; }      // reloaded on a topic of the Help center: that topic
    if (v === 'blog') { const id = post(); UI.blogPost = typeof blogPost === 'function' && blogPost(id) ? id : ''; }      // a post's address: that post (an unknown one: the list)
    return v === 'login' || v === 'signup' ? { screen: 'auth', mode: v } : v === 'forgot' ? { screen: 'forgot', mode: 'login' } : SITE_PAGES.includes(v) ? { screen: v } : {};
  };
  /** The page on screen, or null for a screen that keeps whatever address it happened on. The app itself, and the first-time setup, are at the root. */
  const shown = () => { if (UI.session) return UI.webBlog ? 'blog' : UI.webHelp ? 'help' : 'landing';      // the Help center and the blog opened from the app have their addresses too (v209, v210)
    const p = UI.pub || {}, sc = p.screen; return sc === 'landing' || sc === 'onboard' ? 'landing' : sc === 'auth' ? (p.mode === 'login' ? 'login' : 'signup') : PAGE_PATHS[sc] != null ? sc : null; };
  const names = { login: 'Log in', signup: 'Create account', forgot: 'Choose a new password', privacy: 'Privacy policy', terms: 'Terms of use', contact: 'Contact', help: 'Help center', blog: 'Blog', pj: 'For PJ and MEI', converter: 'Statement converter', about: 'About Dorax' };
  const api = {
    on, arrived: 'landing', arrivedPost: '', push: false, homeY: 0,
    read, post, state, shown,
    /** Where the links in the emails, and Google, send the person back to: always the root, whatever page they were sent from. */
    root: () => on ? location.origin + base : location.origin + location.pathname,
    /** A page's address, for its links. With no addresses, a link that goes nowhere: the click is handled by the page (app/events.js). */
    href: v => on ? base + (PAGE_PATHS[v] || '') : '#',
    /** After every drawing of the page: the tab's title names the page (a post, its title), and the address is the page's own. Moving between pages
        by a link adds a step to the browser's history (pub-go and the blog's posts set push); everything else (logging in, logging out, a notice)
        replaces the step. */
    sync() {
      const v = shown(), app = !!UI.session || (UI.pub || {}).screen === 'onboard', push = api.push; api.push = false;
      const art = v === 'blog' && typeof blogPost === 'function' ? blogPost(UI.blogPost) : null, own = v === 'help' || v === 'blog';
      try { document.title = art ? blogText(art).title + ' · Dorax Finance' : v && names[v] && (!app || own) ? t(names[v]) + ' · Dorax Finance' : 'Dorax Finance'; } catch (e) { /* the texts are not loaded yet */ }
      if (!on || v == null) return;
      try {
        const path = base + PAGE_PATHS[v] + (art ? '/' + art.id : ''), now = location.pathname;
        if (now === path || (v === 'landing' && now === base + 'index.html')) return;
        history[push ? 'pushState' : 'replaceState'](null, '', path + (app && !own ? location.search + location.hash : ''));      // the app keeps its screen ("#plan") and what it was opened with
      } catch (e) { /* a frame that may not change its address: the pages still work */ }
    },
  };
  api.arrived = read(); api.arrivedPost = post();
  return api;
})();
/** The service worker's address: always the site's root, so a blog post's page (/blog/<post>) registers the same one as the app. */
const swPath = () => PAGES.on ? PAGES.root() + 'sw.js' : 'sw.js';
/** Somebody who is logged in opened the address of a page before login: the app opens, with the same text or form in its side panel; the Help
    center and the blog open over it, as the website's pages. */
function pageArrival() {
  const v = PAGES.arrived, post = PAGES.arrivedPost; PAGES.arrived = 'landing'; PAGES.arrivedPost = '';
  if (!UI.session || LOCK.on) return;
  if (v === 'privacy' || v === 'terms') A.legal({ v }); else if (v === 'contact') A.contact(); else if (v === 'help') A.help(); else if (v === 'blog') A.blog({ v: post });
}
// The browser's Back and Forward. The address has already changed: the page it names is shown, the way its link shows it. Back on the home
// page returns to where it was being read. While the app, the first-time setup or a waiting screen is up, those stay, at their own address.
window.addEventListener('popstate', () => {
  if (!PAGES.on || !UI.pub) return;      // before start-up there is no page yet (the login library may clear a link out of the address while it loads)
  if (UI.session && UI.webHelp && PAGES.read() !== 'help') { BACK.skip = true; return helpWebClose(); }      // Back from the Help center opened over the app: the app, where it was (app/back.js lets this step go)
  if (UI.session && UI.webBlog && PAGES.read() !== 'blog') { BACK.skip = true; return blogWebClose(); }      // and from the blog
  if (UI.session || ['loading', 'onboard', 'reset', 'offline'].includes(UI.pub.screen) || UI.pub.busy) return PAGES.sync();
  const v = PAGES.read();
  if (v === 'help' && UI.pub.screen === 'help') { let st = null; try { st = history.state; } catch (e) { } UI.hcTopic = (st && st.hc) || ''; UI.helpQ = ''; renderNow(); window.scrollTo(0, 0); return; }      // a topic of the Help center and its first page: steps of the same address
  if (v === 'blog' && UI.pub.screen === 'blog') { const id = PAGES.post(); UI.blogPost = blogPost(id) ? id : ''; renderNow(); window.scrollTo(0, 0); return; }      // the blog's list and its posts: steps of the blog
  if (v === PAGES.shown()) return;
  const y = PAGES.homeY; A['pub-go']({ v, post: PAGES.post() }); PAGES.push = false;
  if (v === 'help') { let st = null; try { st = history.state; } catch (e) { } if (st && st.hc) hcShow(st.hc, false); }      // back to a topic of the Help center
  if (v === 'landing' && y) window.scrollTo(0, y);
});
