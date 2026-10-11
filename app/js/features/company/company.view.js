/* Dorax Finance — the company's side: the band that opens its dashboard, its first-time setup, and the panel that names it.
   2026-10-07 (owner: "let's separate the company's view; if the person answers yes, a setup for the company opens when it is needed. I don't want a
   switch on every tab: two separate dashboards, and the company's a bit different in its design"). The side is chosen once, in the menu
   (app/shell.js); everything on it wears blue where the household wears green (css/screens/company.css); and a company with nothing yet is set up
   in three short screens: its name, where its money is, and what a normal month looks like. */
const CO_STEPS = 3;
const CO_MAX = { balance: 200000, income: 100000, costs: 50000 };      // the sliders' far end, in reais or dollars; a larger amount can still be typed
const freshCoSetup = () => ({ step: 0, error: null, name: (S.company && S.company.name) || '', kind: (S.company && S.company.kind) || '', bank: BANKS[0], cur: BASE_CURRENCY, balance: '0', income: '0', costs: '0' });
/** Nothing of a company in the account yet: no company account, no name, nothing planned on its side. Choosing Company then starts its setup. */
function companyBlank() {
  if (S.accounts.some(a => a.scope === 'business')) return false;
  const co = S.company || {}; if ((co.name || '').trim()) return false;
  return !Object.values(co.books || {}).some(b => (b.goals || []).length || ((b.plan || {}).lines || []).length || Object.values(b.pay || {}).some(rows => (rows || []).length));
}
const companyKind = k => k === 'mei' ? 'MEI' : k === 'pj' ? 'PJ' : '';
/** The band that opens the company's dashboard: whose side this is, what kind of company, which currency, and what its accounts hold. */
function companyBand(tools) {
  const co = S.company || {}, cur = BCUR(), accts = bookAccounts(), name = (co.name || '').trim(), kind = companyKind(co.kind);
  return `<header class="co-band" id="co-band"><span class="fl-ico">${icon('briefcase')}</span><div class="grow"><h2>${esc(name || t('Your company'))}</h2>
      <p>${kind ? `<span class="chip">${kind}</span>` : ''}<span class="chip">${cur}</span><span>${accts.length ? tn(accts.length, '{n} account', '{n} accounts') + ', ' + fmt.money(sum(accts.map(a => accountBalance(S, a.id, S.today))), cur) : t('No account yet')}</span></p></div>
    ${tools || ''}<button class="btn sm" data-a="company-edit">${name ? t('Edit') : t('Name it')}</button></header>`;
}
/** The panel behind the band's button: the company's name and kind. */
function companyDrawer(d) {
  const v = d.draft;
  return `<div class="body">${d.error ? banner('crit', esc(d.error)) : ''}
    ${fld('co-name', t('Company name'), inp('co-name', 'name', v.name, `maxlength="60" placeholder="${t('e.g. Studio Lima')}"`))}
    ${fld('co-kind', t('Kind of company'), `<select id="co-kind" data-c="draft" data-k="kind">${options([['', t('I’d rather not say')], ['mei', 'MEI'], ['pj', t('Another company (PJ)')]], v.kind)}</select>`)}
    <p class="note">${t('It is only how this side is called in Dorax. Nothing is sent anywhere.')}</p>
    <div class="setting" style="border-top:1px solid var(--line);border-bottom:0;margin-top:6px"><div><b style="font-weight:500">${t('No longer have a company?')}</b><p>${t('Its side leaves the app and its reminders stop. Nothing is deleted.')}</p></div><button type="button" class="btn sm" id="co-off" data-a="co-close">${t('I no longer have a company')}</button></div></div>
  <footer><button class="btn primary" data-a="company-save">${t('Save')}</button><button class="btn ghost spacer" data-a="close">${t('Cancel')}</button></footer>`;
}
/** What the setup's answers add up to, in cents. errors[step] says what cannot be read on a screen. */
function coSetupRead() {
  const o = UI.coSetup, errors = {}, amt = v => String(v || '').trim() === '' ? 0 : typedAmount(v), bad = t('Enter the amount as a number, for example 1500 or 9,90.');
  const balance = amt(o.balance), income = amt(o.income), costs = amt(o.costs);
  if (balance === null) errors[1] = bad;
  if ([income, costs].some(v => v === null || v < 0)) errors[2] = bad;
  return { name: (o.name || '').trim(), kind: o.kind, bank: o.bank, cur: o.cur, balance: balance || 0, income: errors[2] ? 0 : income, costs: errors[2] ? 0 : costs, errors };
}
/** The company's first-time setup: three screens in the page's own place, with the menu still there to leave by. */
function viewCompanySetup() {
  const o = UI.coSetup, step = Math.min(o.step, CO_STEPS - 1), err = o.error ? banner('crit', esc(o.error)) : '', sym = o.cur === 'USD' ? 'US$' : 'R$';
  const dots = `<div class="ob-dots" role="img" aria-label="${t('Step {a} of {b}', { a: step + 1, b: CO_STEPS })}">${Array.from({ length: CO_STEPS }, (_, i) => `<i${i === step ? ' class="now"' : ''}></i>`).join('')}</div>`;
  const foot = label => `<div class="ob-foot">${step ? `<button class="btn ghost" data-a="co-setup-back">${icon('left')}${t('Back')}</button>` : ''}<span class="spacer"></span><button class="btn primary" data-a="co-setup-next">${label}${icon('right')}</button></div>`;
  let body;
  if (step === 0) body = `<h1>${t('First, what is your company called?')}</h1><p>${t('Its money gets a side of its own here, apart from your home’s.')}</p>${err}
      <div class="field"><label for="cos-name">${t('Company name')}</label><input type="text" id="cos-name" maxlength="60" value="${esc(o.name)}" placeholder="${t('e.g. Studio Lima')}" data-c="cos" data-k="name" data-live="1"></div>
      <div class="field"><span id="cos-kind-l">${t('Kind of company')}</span>${seg('co-setup-kind', [['mei', 'MEI'], ['pj', t('Another company (PJ)')]], o.kind, t('Kind of company'))}</div>
      ${foot(t('Next'))}`;
  else if (step === 1) body = `<h1>${t('Where does the company keep its money?')}</h1><p>${t('One account is enough to start. You add the others later.')}</p>${err}
      <div class="form-grid"><div class="field"><label for="cos-bank">${t('Bank')}</label><select id="cos-bank" data-c="cos" data-k="bank">${options(bankChoices().map(b => [b, b]), o.bank)}</select></div>
        <div class="field"><span>${t('Currency')}</span>${seg('co-setup-cur', [['BRL', 'BRL'], ['USD', 'USD']], o.cur, t('Currency'))}</div></div>
      ${obSlide('cos-balance', t('In that account today'), 'balance', o.balance, CO_MAX.balance, 500, 'cos', sym)}
      ${foot(t('Next'))}`;
  else body = `<h1>${t('And in a normal month?')}</h1><p>${t('Your best guess is enough. Real months correct it as they come.')}</p>${err}
      ${obSlide('cos-income', t('Comes into the company'), 'income', o.income, CO_MAX.income, 500, 'cos', sym)}
      ${obSlide('cos-costs', t('Costs: taxes, accountant, tools'), 'costs', o.costs, CO_MAX.costs, 100, 'cos', sym)}
      <p class="note">${t('What you pay yourself is not a cost of the company here: it is a transfer to your home’s side.')}</p>
      ${foot(t('See my company’s runway'))}`;
  return `<section class="card co-setup" id="co-setup" data-step="${step}"><div class="card-b">${body}${dots}</div></section>
    <p class="ob-later"><button class="linkbtn" data-a="co-setup-later">${t('Do it later and open the company’s side')}</button></p>`;
}
