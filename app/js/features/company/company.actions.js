/* Dorax Finance — clicks and field changes: the company's side (its setup and its name). Joined into A in app/actions.js and into C in app/changes.js. */
function coSetupShow(focusId) { render(); toTop(); const el = (focusId && $(focusId)) || document.querySelector('#co-setup h1'); if (el) { if (el.tagName === 'H1') el.tabIndex = -1; el.focus({ preventScroll: true }); } }
const COMPANY_ACTIONS = {
  'co-setup-kind'(ds) { UI.coSetup.kind = UI.coSetup.kind === ds.v ? '' : ds.v; render(); },
  'co-setup-cur'(ds) { UI.coSetup.cur = ds.v === 'USD' ? 'USD' : 'BRL'; render(); },
  'co-setup-back'() { const o = UI.coSetup; o.error = null; o.step = Math.max(0, o.step - 1); coSetupShow(o.step === 0 ? 'cos-name' : ''); },
  'co-setup-next'() {
    const o = UI.coSetup, d = coSetupRead();
    if (d.errors[o.step]) { o.error = d.errors[o.step]; return render(); }
    o.error = null; if (o.step < CO_STEPS - 1) { o.step++; return coSetupShow(''); }
    // the answers become the company's first data, with the same pieces the rest of the app uses
    const year = +S.today.slice(0, 4), m0 = +S.today.slice(5, 7) - 1, own = companyData(S, d.cur, true), kind = companyKind(d.kind) || 'PJ';
    S.user.company = true; delete S.user.coLater;
    if (d.name) S.company.name = d.name; if (d.kind) S.company.kind = d.kind;
    S.accounts.push({ id: newId('a'), name: d.bank + ' ' + kind, institution: d.bank, type: 'checking', currency: d.cur, scope: 'business', monthly: false, purpose: '', opening: d.balance });
    if (d.income > 0) { own.pay[year] = own.pay[year] || []; own.pay[year].push({ id: newId('pay'), ...appName('Client payments'), sub: 'co-clients', half: 0, to: 'fixed', values: Array.from({ length: 12 }, (_, i) => i >= m0 ? d.income : 0) }); }
    if (d.costs > 0) S.company.spend = { ...(S.company.spend || {}), [d.cur]: d.costs };      // the pace its runway is counted with until real months say more (core/runway.js)
    UI.coSetup = null; setPageBook(bookKeyOf(d.cur));
    navigate('dashboard'); toast(d.name ? t('Done. This is {name}’s side.', { name: d.name }) : t('Done. This is your company’s side.')); sideTipShow();      // and where to switch (phone.view.js)
    document.querySelectorAll('#runway-card [data-count]').forEach(countUp);
  },
  /** Leaves the setup for another day: the company's side opens as it is, and choosing Company does not start the setup again by itself. */
  'co-setup-later'() { UI.coSetup = null; S.user.coLater = true; render(); sideTipShow(); },
  /** "I no longer have a company" (owner, 2026-10-07). The company's side leaves the app: the Household | Company choice, its bills in the bell and
      in the reminders the server sends, the statements its accounts owe. Nothing is deleted: its accounts, movements, plan and reserves stay in the
      account, and "Open a company account" (the menu) brings the side back as it was. */
  'co-close'() {
    UI.menu = false; UI.sheet = false; UI.drawer = null; renderOverlay(); renderShell();
    confirmBox({ tone: 'neutral', title: t('Put the company’s side away?'), text: t('Household | Company leaves the app, and so do the company’s reminders. Nothing is deleted: its accounts, movements, plan and reserves are kept, and “Open a company account” in your menu brings it all back.'), label: t('Put it away'),
      run() {
        S.user.company = false; delete S.user.coLater; UI.coSetup = null;
        setPageBook('personal'); Object.assign(UI.tx, TX_RESET, { month: 'current' });
        navigate('dashboard'); toast(t('Done. The company’s side is put away. It is in your menu if you need it again.'));
      } });
  },
  'company-edit'() { const co = S.company || {}; UI.drawer = { kind: 'company', title: t('Your company'), draft: { name: co.name || '', kind: co.kind || '' } }; renderOverlay(); const el = $('co-name'); if (el) el.focus(); },
  'company-save'() {
    const d = UI.drawer.draft, name = String(d.name || '').trim();
    companyData(S, BCUR(), true);
    if (name) S.company.name = name; else delete S.company.name;
    if (d.kind) S.company.kind = d.kind; else delete S.company.kind;
    UI.drawer = null; toast(t('Saved.')); render();
  },
};
const COMPANY_CHANGES = {
  /** A field of the company's setup. One that has a slider moves it along. */
  cos(el) {
    UI.coSetup[el.dataset.k] = el.value;
    const r = el.dataset.range && $(el.dataset.range), c = r ? typedAmount(el.value) : null;
    if (r && c !== null && c >= 0) obRangeShow(r, Math.min(+r.max, Math.round(c / 100)));
  },
  'cos-range'(el) { const n = +el.value, text = plain(n * 100); UI.coSetup[el.dataset.k] = text; const f = $(el.dataset.text); if (f) f.value = text; obRangeShow(el, n); },
};
