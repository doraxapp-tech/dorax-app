/* Dorax Finance — clicks: connecting a bank (trial). Joined into A in app/actions.js. The view is bank.view.js. */
const BANK_SAYS = () => ({
  bad_cpf: t('That CPF is not valid. Check the 11 digits.'), bad_name: t('Type your full name, first and last.'), too_many: t('You already have 5 banks connected. Disconnect one first.'),
  not_set_up: t('Connecting a bank is not set up on the server yet.'),
  not_yours: t('That connection is not yours, so it was not added.'), gone: t('The bank no longer shares this connection. Disconnect it and connect again.'),
});
const bankSays = r => BANK_SAYS()[r.code] || t('The bank connection did not answer. Try again in a minute.');

/** What the server says about this person: is the server's side there, which banks are connected. Asked once per visit and after every change. */
async function bankRefresh() {
  const r = await SERVER.bank('status');
  UI.bank = { ...(UI.bank || {}), known: true, asked: true, enabled: !!(r.ok && r.enabled), why: r.ok ? '' : r.code || '', links: r.ok ? r.links || [] : [], busy: false };
  if (UI.bank.got && !UI.bank.links.some(l => l.id === UI.bank.got.link)) UI.bank.got = null;
  if (UI.session && UI.route === 'openfinance' && !UI.drawer) render();
}
/** Back from the bank. Belvo adds what happened to the app's own address; it is read whatever way it was glued on, acted on, and tidied away.
    A connection is only added after the server has asked Belvo whose it is. */
async function bankArrival() {
  let href = ''; try { href = location.href; } catch (e) { return; }
  const what = (/[?&#]bank=(done|left|failed)\b/.exec(href) || [])[1]; if (!what) return;
  const link = (/[?&]link=([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\b/i.exec(href) || [])[1];
  try { history.replaceState(null, '', location.pathname); } catch (e) { /* a sandboxed frame keeps its address */ }
  if (!UI.session) return;
  navigate('openfinance');
  if (what === 'left') return toast(t('No bank was connected.'));
  if (what === 'failed' || !link) return toast(t('The bank could not be connected. Nothing was shared.'));
  const r = await SERVER.bank('finish', { link });
  toast(r.ok ? t('{name} is connected. Bring its transactions when you are ready.', { name: (r.link && r.link.institution) || t('Bank') }) : bankSays(r));
  await bankRefresh();
}

const BANK_ACTIONS = {
  'bank-open'() { if (!personal().length) return toast(t('Add an account first.')); UI.sheet = false; UI.drawer = { kind: 'bank-start', title: t('Connect a bank'), draft: { cpf: '', name: S.user.name || '' } }; renderOverlay(); const el = $('bk-cpf'); if (el) el.focus(); },
  async 'bank-start'() {
    const d = UI.drawer, m = d.draft; if (d.busy) return;
    if (String(m.cpf || '').replace(/\D/g, '').length !== 11) return fail(BANK_SAYS().bad_cpf);
    if (!/\S\s+\S/.test(String(m.name || '').trim())) return fail(BANK_SAYS().bad_name);
    d.busy = true; d.error = null; renderOverlay();
    const r = await SERVER.bank('start', { cpf: m.cpf, name: m.name });
    if (UI.drawer !== d) return;                                    // the panel was closed meanwhile: nobody is sent anywhere
    d.busy = false;
    // only ever Belvo's own page (or, in the preview, this very page): an address from anywhere else is not followed
    const here = location.href.split(/[?#]/)[0], good = r.ok && typeof r.url === 'string' && (r.url.startsWith('https://widget.belvo.io/') || (SERVER.preview && r.url.startsWith(here + '?')));
    if (!good) return fail(r.ok ? bankSays({}) : bankSays(r));
    m.cpf = ''; UI.drawer = null; location.assign(r.url);
  },
  async 'bank-fetch'(ds) {
    UI.bank = { ...UI.bank, busy: ds.id }; render();
    const r = await SERVER.bank('fetch', { link: ds.id });
    UI.bank = { ...UI.bank, busy: false, got: r.ok ? { link: ds.id, institution: r.institution || '', accounts: r.accounts || [], transactions: r.transactions || [], left: r.left || 0, more: !!r.more } : UI.bank.got };
    if (!r.ok) toast(bankSays(r)); render();
  },
  /** One of the bank's accounts goes to the review table, like an OFX file: the bank's own ids catch what was already imported. */
  'bank-review'(ds) {
    const g = UI.bank && UI.bank.got, a = g && g.accounts.find(x => x.id === ds.acc), mine = personal(); if (!a) return; if (!mine.length) return toast(t('Add an account first.'));
    const raw = g.transactions.filter(x => x.account === a.id).map(x => ({ date: x.date, description: x.description, amount: x.amount, sourceTxnId: 'bank:' + x.id, confidence: 100 }));
    const fit = mine.find(m => m.currency === a.currency && m.type === a.kind) || mine.find(m => m.currency === a.currency) || mine[0];
    UI.impError = null; UI.imp = { source: 'bank', file: [g.institution, a.name].filter(Boolean).join(' · '), accountId: fit.id, step: 'review', raw, real: true,
      note: fit.currency !== a.currency ? t('The bank account is in {cur} and no household account uses that currency. Check the account before importing.', { cur: a.currency }) : '' };
    UI.imp.rows = buildRows(raw, fit.id); render(); const el = $('imp-panel'); if (el) el.scrollIntoView({ block: 'start' });
  },
  'bank-disconnect'(ds) {
    const l = ((UI.bank || {}).links || []).find(x => x.id === ds.id); if (!l) return;
    confirmBox({ title: t('Disconnect {name}?', { name: l.institution || t('Bank') }), text: t('The bank stops sharing with Dorax and the consent is withdrawn. Transactions you already imported stay in your accounts.'), label: t('Disconnect'),
      async run() { UI.bank = { ...UI.bank, busy: ds.id }; render(); const r = await SERVER.bank('disconnect', { link: ds.id }); toast(r.ok ? t('The bank is disconnected.') : bankSays(r)); await bankRefresh(); } });
  },
};
