/* Dorax Finance — clicks: the pages before login: moving between them, the price switch, the contact form, the legal texts. Joined into A in app/actions.js. */
const PUBLIC_ACTIONS = {
  // before login
  'pub-go'(ds) {
    const v = ds.v, legal = v === 'privacy' || v === 'terms' || v === 'contact', p = UI.pub, fromLegal = p.screen === 'privacy' || p.screen === 'terms' || p.screen === 'contact';
    const backToForm = !legal && fromLegal && p.back === v;      // the terms were read in the middle of signing up: what was typed is still there
    if (v === 'contact') UI.contact = null;
    if (legal) p.back = p.screen === 'auth' ? p.mode : fromLegal ? p.back : null;
    else if (!backToForm) Object.assign(p, { password: '', show: false, accept: false });      // anywhere else, a typed password is dropped
    Object.assign(p, { screen: v === 'landing' ? 'landing' : legal ? v : v === 'forgot' ? 'forgot' : 'auth', mode: v === 'landing' || legal ? p.mode : v === 'forgot' ? 'login' : v, error: null, errs: {}, notice: null, resent: false, sent: null });
    if (!legal) p.back = null;
    renderNow(); window.scrollTo(0, 0); enterView(); const el = $('au-name') || $('au-email') || $('legal-title') || $('contact-title'); if (el) el.focus({ preventScroll: true });
  },
  /** Monthly or yearly prices on the home page. Both are in the page; this shows one, without drawing the page again. */
  'lp-bill'(ds) { UI.lpBill = ds.v === 'year' ? 'year' : 'month'; const box = document.querySelector('.lp-plans'); if (box) box.dataset.bill = UI.lpBill; document.querySelectorAll('.seg.bill button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === UI.lpBill))); },
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
