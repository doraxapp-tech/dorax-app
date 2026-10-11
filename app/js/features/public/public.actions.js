/* Dorax Finance — clicks and field changes: the pages before login: moving between them, the price switch, the home page's calculator, the contact form,
   the legal texts. Joined into A in app/actions.js and into C in app/changes.js. */
const PUBLIC_ACTIONS = {
  // before login
  'pub-go'(ds) {
    const v = ds.v, legal = v === 'privacy' || v === 'terms' || v === 'contact', p = UI.pub, fromLegal = p.screen === 'privacy' || p.screen === 'terms' || p.screen === 'contact';
    const backToForm = !legal && fromLegal && p.back === v;      // the terms were read in the middle of signing up: what was typed is still there
    if (p.screen === 'landing' && v !== 'landing') PAGES.homeY = window.scrollY || 0;      // Back returns to where the home page was being read (ui/pages.js)
    PAGES.push = true;                                                                  // each page has its own address: this move is a step Back can undo
    if (v === 'contact') UI.contact = null;
    if (legal) p.back = p.screen === 'auth' ? p.mode : fromLegal ? p.back : null;
    else if (!backToForm) Object.assign(p, { password: '', show: false, accept: false });      // anywhere else, a typed password is dropped
    Object.assign(p, { screen: v === 'landing' ? 'landing' : legal ? v : v === 'forgot' ? 'forgot' : 'auth', mode: v === 'landing' || legal ? p.mode : v === 'forgot' ? 'login' : v, error: null, errs: {}, notice: null, resent: false, sent: null });
    if (!legal) p.back = null;
    renderNow(); toTop(); enterView(); const el = $('au-name') || $('au-email') || $('legal-title') || $('contact-title'); if (el) el.focus({ preventScroll: true });
  },
  /** Monthly or yearly prices on the home page. Both are in the page; this shows one, without drawing the page again. */
  'lp-bill'(ds) { UI.lpBill = ds.v === 'year' ? 'year' : 'month'; const box = document.querySelector('.lp-plans'); if (box) box.dataset.bill = UI.lpBill; document.querySelectorAll('.seg.bill button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === UI.lpBill))); },
  // the home page's calculator (features/public/landing.view.js)
  /** Another dream: its cost slider starts at that dream's own round figure, until the person has moved or typed one. The tool is drawn again (its slider has another far end). */
  'calc-dream'(ds) {
    const c = calcState(), row = obDreams().find(x => x[0] === ds.v); if (!row) return;
    c.dream = ds.v; if (!c.costTouched) c.cost = plain(row[4] * 100);
    calcDraw(); const el = document.querySelector('#calc-tool .ob-dream[aria-pressed="true"]'); if (el) el.focus({ preventScroll: true });
  },
  /** "Try it": the step the tip names is added to what is put aside each month, as far as its slider goes. */
  'calc-try'() {
    const c = calcState(), L = calcLook(); if (L.bad || !L.lever) return;
    c.monthly = plain(L.monthly + L.lever.extra); calcDraw(); const el = $('calc-try') || $('calc-monthly-r'); if (el) el.focus({ preventScroll: true });
  },
  /** The way in: what was chosen is kept on this device for a day, for the first-time setup of the account about to be created (calcCarry). */
  'calc-go'() {
    const c = calcState(); try { localStorage.setItem(CALC_KEY, JSON.stringify({ at: Date.now(), dream: c.dream, cost: c.cost, saved: c.saved })); } catch (e) { /* a browser that keeps nothing: the setup starts empty */ }
    PUBLIC_ACTIONS['pub-go']({ v: 'signup' });
  },
  'pub-scroll'(ds) { const el = $(ds.id); if (el) el.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' }); },
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
/** The calculator's answer follows its fields without the page being drawn again; the whole tool is drawn again only when its parts change. */
function calcShow() { const o = $('calc-out'), m = $('calc-more'); if (!o || !m) return; const [main, more] = calcParts(); o.innerHTML = main; m.innerHTML = more; }
function calcDraw() { const el = $('calc-tool'); if (el) el.innerHTML = calcTool(); }
const PUBLIC_CHANGES = {
  /** A field of the calculator. One that has a slider moves it along, as far as the slider goes (a larger amount stays in the field). */
  calc(el) {
    const c = calcState(); c[el.dataset.k] = el.value; if (el.dataset.k === 'cost') c.costTouched = true;
    const r = el.dataset.range && $(el.dataset.range), n = r ? typedAmount(el.value) : null;
    if (r && n !== null && n >= 0) obRangeShow(r, Math.min(+r.max, Math.round(n / 100)));
    calcShow();
  },
  /** A slider of the calculator: its field takes the amount, written the way amounts are typed here. */
  'calc-range'(el) {
    const c = calcState(), n = +el.value, text = plain(n * 100); c[el.dataset.k] = text; if (el.dataset.k === 'cost') c.costTouched = true;
    const field = $(el.dataset.text); if (field) field.value = text; obRangeShow(el, n); calcShow();
  },
};
