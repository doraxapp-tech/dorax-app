// QC of the money named in the words (v230, owner, 2026-10-17: "asegúrate que en los textos del dashboard las monedas escritas en los textos
// (reales) cambien también dependiendo de la cuenta principal del usuario"):
//   1. with the account's money in pesos cubanos, in dollars or in euros, no screen and no panel still writes "R$" or "reais": the runway's
//      estimate and what-if say the main currency's sign; the funds' fields say it; the computer's funds name it in their spoken labels; the
//      Transactions tour's heading names the money ("Cada peso, en su lugar.");
//   2. the curiosities that quote an amount a Brazilian law sets in reais (the FGC, the MEI) come only where money is counted in reais, in the app
//      and by notification: changed to another currency they would be false;
//   3. in the app's code, every text that writes "R$" goes through tcur or tcurIn, which put in the currency in use.
const fs = require('fs'), path = require('path');
const { open, ok, eq, done } = require('./pw.js');
const BAD = /R\$|\breais\b|\breales\b|every real\b|cada real\b/i;

(async () => {
  const { browser, page: p, errors } = await open({ lang: 'es', account: 'example', plan: true, viewport: { width: 1280, height: 900 } });
  // the whole account in a currency: every record that says reais says that one (as an account whose main account is in it)
  const to = c => p.evaluate(c => { const walk = o => { if (Array.isArray(o)) return o.forEach(walk); if (o && typeof o === 'object') for (const k of Object.keys(o)) { if ((k === 'currency' || k === 'cur') && ['BRL', 'CUP', 'USD', 'EUR', 'MLC'].includes(o[k]) && o.scope !== 'business') o[k] = c; else walk(o[k]); } };
    UI.drawer = null; walk(S.accounts); walk(S.goals); walk(S.transactions); S.settings.currency = c; syncCurrency(); render(); }, c);
  const words = () => p.evaluate(re => { const R = new RegExp(re, 'i'); return [...document.body.innerText.split('\n'), ...[...document.querySelectorAll('[aria-label],[placeholder]')].map(e => e.getAttribute('aria-label') || e.getAttribute('placeholder'))].map(s => (s || '').trim()).filter(s => R.test(s)); }, BAD.source);

  // ---------- 1. the words follow the main currency ----------
  await to('CUP'); await p.evaluate(() => { S.user.greeted = true; navigate('dashboard'); A['runway-edit']({}); }); await p.waitForTimeout(250);
  eq(await p.evaluate(() => document.querySelector('label[for="rw-spend"]').innerText.trim()), 'Lo que sale en un mes, tu estimación (CUP)', 'the runway’s estimate says the main currency’s sign');
  await p.evaluate(() => { A.close(); A.whatif({}); }); await p.waitForTimeout(250);
  ok(!/R\$|US\$/.test(await p.evaluate(() => (document.querySelector('#overlay') || document.body).innerText)) && /CUP/.test(await p.evaluate(() => (document.querySelector('#overlay') || document.body).innerText)), 'what-if: its amounts in the main currency’s sign, never R$ or US$');
  const fund = {};
  for (const kind of ['buy', 'income']) { await p.evaluate(k => { A.close(); navigate('investments'); A['fii-move']({ kind: k }); }, kind); await p.waitForTimeout(250);
    fund[kind] = await p.evaluate(() => [...document.querySelectorAll('#overlay label')].map(l => l.innerText.replace('*', '').trim()).filter(s => /\((CUP|R\$|US\$)/.test(s))); }
  eq([fund.buy.length > 0 && fund.buy.every(s => /\(CUP/.test(s)), fund.income], [true, ['Total recibido (CUP)']], 'a fund’s buy and income: their fields in the main currency', fund);
  await p.evaluate(() => A.close()); await p.waitForTimeout(150);
  ok(await p.evaluate(() => [...document.querySelectorAll('.dk-price, .dk-amt')].every(i => /pesos cubanos/.test(i.getAttribute('aria-label'))) && document.querySelectorAll('.dk-price').length > 0), 'the computer’s funds: their spoken labels name the main currency');
  eq(await p.evaluate(() => [tourText('transactions').title]), ['Cada peso, en su lugar.'], 'the Transactions tour names the money: pesos');
  const seen = [];
  for (const r of ['dashboard', 'transactions', 'plan', 'goals', 'investments', 'reports', 'accounts']) { await p.evaluate(r => navigate(r), r); await p.waitForTimeout(200); seen.push(...(await words()).map(w => r + ': ' + w)); }
  eq(seen, [], 'in pesos cubanos, no screen writes R$ or reais');
  const tour = {};
  for (const c of ['USD', 'EUR', 'MLC', 'BRL']) { await to(c); tour[c] = await p.evaluate(() => tourText('transactions').title); }
  eq(tour, { USD: 'Cada dólar, en su lugar.', EUR: 'Cada euro, en su lugar.', MLC: 'Cada centavo, en su lugar.', BRL: 'Cada real, en su lugar.' }, 'dollars, euros, MLC and reais: each its own words');
  await to('USD'); await p.evaluate(() => { A['runway-edit']({}); }); await p.waitForTimeout(200);
  eq(await p.evaluate(() => document.querySelector('label[for="rw-spend"]').innerText.trim()), 'Lo que sale en un mes, tu estimación (US$)', 'and in dollars, US$');
  await p.evaluate(() => A.close());

  // ---------- 2. the facts a Brazilian law sets in reais ----------
  const facts = c => p.evaluate(c => { S.settings.currency = c; syncCurrency(); const seen = new Set(), st = JSON.parse(JSON.stringify(S)); st.user.curio = { log: [] };
    for (let i = 0; i < 12; i++) { const id = curioNext(st, false); if (!id) break; seen.add(id); curioShown(st, id, st.today, i); } return [...seen].sort(); }, c);
  eq([(await facts('BRL')).includes('fgc'), (await facts('CUP')).includes('fgc'), (await facts('CUP')).length > 0], [true, false, true], 'the FGC’s ceiling (R$ 250.000) comes where money is in reais, not in pesos; the other facts still come');
  eq(await p.evaluate(() => { const st = JSON.parse(JSON.stringify(S)); st.user.company = true; return [curioFits(st, ['mei', 'company', 'BRL'], true), companyCurrencies(st).includes('BRL')]; }).then(([fits, brl]) => fits === brl), true, 'the MEI’s limit only on a company side in reais');
  const logic = await import('file://' + path.join(__dirname, '..', 'supabase', 'functions', 'reminders', 'engine.mjs'));
  ok(/curioFits\(state, c,/.test(fs.readFileSync(path.join(__dirname, '..', 'supabase', 'functions', 'reminders', 'engine.mjs'), 'utf8')) && typeof logic.openAccount === 'function', 'the notification’s curiosities follow the same rule (the server’s copy of the app’s files)');

  // ---------- 3. in the code ----------
  const skip = /features\/(public|site|blog|help|onboarding)\//;
  const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith('.js') ? [path.join(d, e.name)] : []);
  const plain = walk(path.join(__dirname, '..', 'app', 'js', 'features')).filter(f => !skip.test(f.replace(/\\/g, '/'))).flatMap(f => [...fs.readFileSync(f, 'utf8').matchAll(/(^|[^a-zA-Z_.])t\('([^']*R\$[^']*)'/g)].map(m => path.basename(f) + ': ' + m[2]))
    .filter(s => !/FGC|MEI/.test(s));      // the facts a law sets in reais: kept as they are, and only shown where money is in reais (2)
  eq(plain, [], 'every text in the app that writes R$ goes through tcur or tcurIn');

  eq(errors, [], 'no error in the console'); await browser.close();
  done('qc-currency-words');
})().catch(e => { console.error('qc-currency-words: Error', e); process.exit(1); });
