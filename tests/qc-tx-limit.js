// QC of the month's limit in the expense form (owner, 2026-10-08: "is there an input when recording expenses where the user can add a spending
// limit?", then "yes" to the proposal):
//   1. a group with a limit (a line of the plan spent in several purchases): what is left of it this month, then with the amount typed, in words
//      and a bar; going over it is said in red, with how much;
//   2. a group with a fixed bill: nothing (it has its plan); a transfer or an income: nothing;
//   3. a group with no plan: "Set a monthly limit for …" opens a field in the form; a wrong number is said; saved, it is a line of the plan
//      (several purchases), the hint shows at once, the expense typed is kept, and Plan shows it;
//   4. editing an expense does not count it twice; Portuguese; a computer the same.
const { open, ok, eq, done } = require('./pw.js');

(async () => {
  let { browser, page, errors } = await open({ lang: 'es', account: 'example', plan: true, viewport: { width: 390, height: 844 }, touch: true, mobile: true });
  await page.evaluate(() => A['new-tx']()); await page.waitForSelector('#d-amount');
  const left = () => page.evaluate(() => { const p = planProgress(B(), ymOf(S.today), CUR, S.today).find(k => k.name === 'Supermercado'); return p.planned - p.spent; });
  const l0 = await left(), fmtM = v => page.evaluate(v => fmt.money(v, 'BRL'), v);
  // ---------- 1. a group with a limit ----------
  await page.tap('.tx-pick[data-k="casa|supermercado"]'); await page.waitForTimeout(150);
  eq(await page.evaluate(() => document.querySelector('#tx-limit').innerText.trim()), `Supermercado: te quedan ${await fmtM(l0)} de ${await fmtM(120000)} este mes.`, 'a group with a limit: what is left of it this month');
  await page.fill('#d-amount', '150');
  eq(await page.evaluate(() => { const e = document.querySelector('#tx-limit .tx-lim'); return [e.className, e.innerText.trim(), !!e.querySelector('.meter')]; }), ['tx-lim go', `Con este gasto te quedan ${await fmtM(l0 - 15000)} de ${await fmtM(120000)} en Supermercado este mes.`, true], 'with the amount typed: what would be left, and a bar');
  await page.fill('#d-amount', '5000');
  eq(await page.evaluate(() => { const e = document.querySelector('#tx-limit .tx-lim'); return [e.className, /te pasas/.test(e.innerText), getComputedStyle(e.querySelector('p')).color]; }), ['tx-lim crit', true, 'rgb(255, 149, 146)'], 'over it: said in red, with how much');
  // ---------- 2. nothing where it does not belong ----------
  await page.tap('.tx-pick[data-k="casa|alquiler"]'); await page.waitForTimeout(150);
  eq(await page.evaluate(() => document.querySelector('#tx-limit').innerText.trim()), '', 'a group with a fixed bill: nothing');
  await page.tap('.tx-kind [data-v="income"]'); await page.waitForTimeout(150);
  eq(await page.evaluate(() => (document.querySelector('#tx-limit') || { innerText: '' }).innerText.trim()), '', 'an income: nothing');
  await page.tap('.tx-kind [data-v="expense"]'); await page.waitForTimeout(150);
  // ---------- 3. a group with no plan ----------
  await page.tap('.tx-pick[data-k="salidas|"]'); await page.waitForTimeout(150);
  eq(await page.evaluate(() => { const b = document.querySelector('#tx-limit .tx-lim-add'); return [b && b.innerText.trim(), b && b.getBoundingClientRect().height >= 44]; }), ['Poner un límite mensual a Salidas', true], 'a group with no plan: the way to give it a limit, a thumb high');
  await page.tap('.tx-lim-add'); await page.waitForSelector('#d-limit');
  eq(await page.evaluate(() => [document.activeElement.id, document.querySelector('label[for="d-limit"]').innerText]), ['d-limit', 'Límite mensual para Salidas (BRL)'], 'it opens a field in the form, ready to type');
  await page.fill('#d-limit', 'mucho'); await page.tap('[data-a="tx-limit-save"]'); await page.waitForTimeout(150);
  ok(await page.evaluate(() => /Escribe el límite como número/.test(document.querySelector('#tx-limit').innerText) && !B().plan.lines.some(l => l.categoryId === 'salidas')), 'a wrong number is said, and nothing is saved');
  await page.fill('#d-limit', '400'); await page.tap('[data-a="tx-limit-save"]'); await page.waitForTimeout(200);
  eq(await page.evaluate(() => { const l = B().plan.lines.find(k => k.categoryId === 'salidas'); return [!!l && l.pay, l && l.name, l && planValue(B(), l, ymOf(S.today)), document.querySelector('#d-amount').value, /de R\$ 400,00/.test(document.querySelector('#tx-limit').innerText), /Límite guardado/.test(document.querySelector('#toast-root').innerText)]; }),
    ['budget', 'Salidas', 40000, '5000', true, true], 'saved: a line of the plan spent in several purchases, 400 a month; the hint shows at once; the amount typed is kept; it is said');
  await page.fill('#d-amount', '120'); await page.fill('#d-merchant', 'Cine'); await page.tap('[data-a="save-tx"]'); await page.waitForTimeout(300);
  await page.evaluate(() => navigate('plan')); await page.waitForTimeout(300);
  ok(await page.evaluate(() => planProgress(B(), ymOf(S.today), CUR, S.today).some(p => p.name === 'Salidas' && p.planned === 40000 && p.spent >= 12000) && /Salidas/.test(document.querySelector('#view').innerText)), 'Plan shows it, with the expense in it');
  // ---------- 4. editing does not count twice ----------
  const id = await page.evaluate(() => S.transactions.find(x => x.merchant === 'Cine').id);
  await page.evaluate(id => A['open-tx']({ id }), id); await page.waitForSelector('#tx-limit');
  eq(await page.evaluate(() => { const p = planProgress(B(), ymOf(S.today), CUR, S.today).find(k => k.name === 'Salidas'); return [document.querySelector('#tx-limit').innerText.includes(fmt.money(p.planned - p.spent, 'BRL')), p.spent >= 12000]; }), [true, true], 'editing the expense: what is left is counted with it once, not twice');
  eq(errors, [], 'no error in the console'); await browser.close();
  ({ browser, page, errors } = await open({ lang: 'pt', account: 'example', plan: true, viewport: { width: 1280, height: 860 } }));
  await page.evaluate(() => A['new-tx']()); await page.waitForSelector('#d-amount');
  await page.click('.tx-pick[data-k="casa|supermercado"]'); await page.fill('#d-amount', '100');
  ok(await page.evaluate(() => /^Com este gasto restam R\$/.test(document.querySelector('#tx-limit').innerText.trim())), 'a computer, in Portuguese: the same');
  eq(errors, [], 'computer: no error in the console'); await browser.close();
  done('qc-tx-limit');
})();
