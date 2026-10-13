/* Dorax Finance — clicks and field changes: the pages before login: moving between them, the price switch, the home page's calculator, the contact form,
   the legal texts. Joined into A in app/actions.js and into C in app/changes.js. */
const PUBLIC_ACTIONS = {
  // before login
  'pub-go'(ds) {
    const page = x => SITE_PAGES.includes(x);      // the pages that are a screen of their own (ui/pages.js): the legal texts, contact, help, the blog, the pages before launch
    const v = ds.v, legal = page(v), p = UI.pub, fromLegal = page(p.screen);
    const backToForm = !legal && fromLegal && p.back === v;      // the terms were read in the middle of signing up: what was typed is still there
    if (p.screen === 'landing' && v !== 'landing') PAGES.homeY = window.scrollY || 0;      // Back returns to where the home page was being read (ui/pages.js)
    PAGES.push = true;                                                                  // each page has its own address: this move is a step Back can undo
    if (v === 'contact') UI.contact = null;
    if (v === 'help') { UI.hcTopic = ''; UI.helpQ = ''; }      // the Help center opens on its first page
    if (v === 'blog') { UI.blogPost = ds.post && blogPost(ds.post) ? ds.post : ''; UI.blogCat = ''; }      // and the blog on its list (Back and Forward: on the post the address names)
    if (legal) p.back = p.screen === 'auth' ? p.mode : fromLegal ? p.back : null;
    else if (!backToForm) Object.assign(p, { password: '', show: false, accept: false });      // anywhere else, a typed password is dropped
    Object.assign(p, { screen: v === 'landing' ? 'landing' : legal ? v : v === 'forgot' ? 'forgot' : 'auth', mode: v === 'landing' || legal ? p.mode : v === 'forgot' ? 'login' : v, error: null, errs: {}, notice: null, resent: false, sent: null });
    if (!legal) p.back = null;
    renderNow(); toTop(); enterView(); const el = $('au-name') || $('au-email') || $('legal-title') || $('contact-title') || $('hc-title') || $('bl-title') || $('st-title'); if (el) el.focus({ preventScroll: true });
  },
  /** Monthly or yearly prices on the home page. Both are in the page; this shows one, without drawing the page again. */
  'lp-bill'(ds) { UI.lpBill = ds.v === 'year' ? 'year' : 'month'; const box = document.querySelector('.lp-plans'); if (box) box.dataset.bill = UI.lpBill; document.querySelectorAll('.seg.bill button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === UI.lpBill))); },
  // the home page's calculator (features/public/landing.view.js): two rows of buttons since v213
  /** Another dream, at the first-time setup's own round cost. The tool is drawn again, and the pressed dream keeps the focus. */
  'calc-dream'(ds) {
    const c = calcState(), row = obDreams().find(x => x[0] === ds.v); if (!row) return;
    c.dream = ds.v; c.cost = plain(row[4] * 100); calcDraw(); const el = document.querySelector('#calc-tool [data-a="calc-dream"][aria-pressed="true"]'); if (el) el.focus({ preventScroll: true });
  },
  /** Another amount put aside each month (one of CALC_MONTHLY, in reais). */
  'calc-monthly'(ds) {
    const v = +ds.v; if (!CALC_MONTHLY.includes(v)) return;
    calcState().monthly = plain(v * 100); calcDraw(); const el = document.querySelector('#calc-tool [data-a="calc-monthly"][aria-pressed="true"]'); if (el) el.focus({ preventScroll: true });
  },
  /** The way in: what was chosen is kept on this device for a day, for the first-time setup of the account about to be created (calcCarry). */
  'calc-go'() {
    const c = calcState(); try { localStorage.setItem(CALC_KEY, JSON.stringify({ at: Date.now(), dream: c.dream, cost: c.cost, saved: c.saved })); } catch (e) { /* a browser that keeps nothing: the setup starts empty */ }
    PUBLIC_ACTIONS['pub-go']({ v: 'signup' });
  },
  /** One of the four moments of the month opens and shows how it looks in Dorax; only the four are drawn again. */
  'lp-moment'(ds) {
    const n = Math.max(0, Math.min(3, +ds.v || 0)), row = $('l2-moments'); UI.lpMoment = n; if (!row) return;
    row.innerHTML = l2Moments(); const el = row.querySelector('.l2-mo.on'); if (el) el.focus({ preventScroll: true });
  },
  'pub-scroll'(ds) { if (!$(ds.id) && !UI.session && UI.pub.screen !== 'landing') PUBLIC_ACTIONS['pub-go']({ v: 'landing' });      // from another page (the Help center's footer): the home page first
    const el = $(ds.id); if (el) el.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' }); },
  // contact: the same form before login (a page) and inside the app (a panel). The message goes to the server.
  contact() { UI.sheet = false; UI.contact = null; UI.drawer = { kind: 'contact', title: t('Contact') }; renderOverlay(); const el = $('ct-message'); if (el) el.focus(); },
  async 'contact-send'() {
    const c = contactState(), email = (c.email || '').trim().toLowerCase(), msg = (c.message || '').trim(), again = id => { UI.session ? renderOverlay() : renderNow(); const el = $(id); if (el) el.focus(); };
    if (c.busy) return;
    if (!EMAIL_RE.test(email)) { c.error = t('That email does not look right. Check it and try again.'); return again('ct-email'); }
    if (msg.length < 10) { c.error = t('Write a few words about what you need.'); return again('ct-message'); }
    Object.assign(c, { email, message: msg, error: null, busy: true }); again('ct-message');
    const r = await SERVER.sendContact({ email, topic: c.topic, message: msg, lang: S.settings.lang });
    if (UI.contact !== c) return;       // the form was closed while the message was on its way
    c.busy = false;
    if (!r.ok) { c.error = r.code === 'network' || r.code === 'not_connected' ? serverSays(r.code) : t('The message could not be sent. Try again in a moment.'); return again('ct-message'); }
    c.sent = true; again('contact-done');
  },
  'contact-new'() { const email = contactState().email; UI.contact = { ...freshContact(), email }; UI.session ? renderOverlay() : renderNow(); const el = $('ct-message'); if (el) el.focus(); },
  legal(ds) { UI.sheet = false; UI.drawer = { kind: 'legal', doc: ds.v === 'terms' ? 'terms' : 'privacy', title: legalDoc(ds.v === 'terms' ? 'terms' : 'privacy').title }; renderOverlay(); },
};
/** The calculator is drawn again when one of its buttons is pressed. */
function calcDraw() { const el = $('calc-tool'); if (el) el.innerHTML = calcTool(); }
/** Fields of the pages before login: none since v213 (the home page's calculator has buttons, not fields). Joined into C in app/changes.js. */
const PUBLIC_CHANGES = {};
