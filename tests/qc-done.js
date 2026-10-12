// QC of what paying a bill and saving a transaction end with on the summary's look (v200, owner, 2026-10-12: "quiero pantallas de éxito para las
// acciones de pagar los gastos también… la notificación de ahora es un pill que sale de encima de la pantalla, no me gusta… lo mismo con un ingreso
// registrado: recibir ingresos es motivo de celebración, no al punto de confetis, pero puedes usar la acción para motivar a ahorrar";
// features/plan/pay-done.js, features/transactions/tx-done.js).
//   1. a bill marked paid: no strip at the top; its receipt: what was paid, how much, from where, the month's bills (paid of all, what is left), Done
//      with the focus, Undo that takes it back; from the bell, Done brings the bell back; several at once; one with its amount typed; a card's invoice;
//      the month all paid says so;
//   2. money in: its screen on the forest: into which account, how much, what it changes, and a way to put part of it aside, which opens that goal's
//      contribution with the amount in; without goals, the way to start one; no confetti;
//   3. an expense saved: no strip; the panel's button says "Recorded" for a moment and the panel goes;
//   4. the previous look keeps its strip with Undo; a computer has the receipt in the middle of the screen's foot; no error in the console.
const { open, ok, eq, done } = require('./pw.js');

(async () => {
  const phone = { lang: 'en', account: 'example', plan: true, viewport: { width: 390, height: 844 }, touch: true, mobile: true };
  let { browser, page, errors } = await open(phone);
  await page.evaluate(() => { S.user.greeted = true; S.settings.theme = S.settings.themePhone = 'light'; navigate('dashboard'); render(); });
  const unpaid = () => page.evaluate(() => planProgress(B(), B().month, BCUR(), B().today).filter(p => p.pay === 'fixed' && !p.spent && p.planned && lineAcct(p)).map(p => ({ id: p.id, name: p.name, cat: p.categoryId, planned: p.planned })));
  const receipt = () => page.evaluate(() => { const s = document.querySelector('#overlay .pd-sheet'); if (!s) return null; const q = c => (s.querySelector(c) || {}).textContent;
    return { sheet: UI.sheet, h: q('#pd-h'), amt: q('.pd-amt'), meta: q('.pd-meta'), month: q('.pd-month-t b'), left: q('.pd-left'), focus: document.activeElement.dataset.a, undo: !!s.querySelector('[data-a="pd-undo"]'), toast: document.getElementById('toast-root').innerText.trim() }; });

  // ---------- 1. a bill ----------
  let bills = await unpaid(); const one = bills[0], n0 = await page.evaluate(() => S.transactions.length);
  await page.evaluate(b => A['line-pay-now']({ id: b.id, ym: B().month }), one); await page.waitForTimeout(150);
  let r = await receipt();
  eq([r.sheet, r.h, r.amt === await page.evaluate(v => fmt.money(v, BCUR()), one.planned), /·/.test(r.meta), /^\d+ of \d+ paid$/.test(r.month), /still to pay this month\.$/.test(r.left), r.focus, r.undo, /paid|Undo/.test(r.toast)], ['paid', `${one.name} paid`, true, true, true, true, 'pd-done', true, false],
    'a bill marked paid: its receipt (what, how much, from where and when, the month’s bills paid of all and what is left), Done with the focus, Undo; no strip at the top');
  eq(await page.evaluate(() => { const s = getComputedStyle(document.querySelector('#overlay .pd-paper')); return [s.backgroundColor, (s.maskImage || s.webkitMaskImage || '').includes('radial-gradient'), getComputedStyle(document.querySelector('#overlay .pd-check circle')).fill]; }), ['rgb(255, 255, 255)', true, 'rgb(182, 221, 98)'], 'white paper with a torn foot, its check on lime');
  await page.click('#overlay .pd-sheet [data-a="pd-undo"]'); await page.waitForTimeout(300);
  eq(await page.evaluate(() => [S.transactions.length, UI.sheet, !!document.querySelector('#overlay .pd-sheet')]), [n0, false, false], 'Undo: the payment is taken back and the receipt goes');
  await page.evaluate(() => { A.reminders(); }); await page.waitForTimeout(200);
  await page.evaluate(b => A['line-pay-now']({ id: b.id, ym: B().month }), one); await page.waitForTimeout(150);
  await page.click('#overlay .pd-sheet [data-a="pd-done"]'); await page.waitForTimeout(300);
  eq(await page.evaluate(() => [UI.sheet, UI.drawer && UI.drawer.kind]), [false, 'reminders'], 'paid from the bell: Done brings the bell back');
  await page.evaluate(() => A.close()); await page.waitForTimeout(250);
  bills = await unpaid(); const cat = bills[0].cat, group = bills.filter(b => b.cat === cat).length;
  await page.evaluate(c => A['group-pay-now']({ cat: c, ym: B().month }), cat); await page.waitForTimeout(150);
  r = await receipt(); eq(r.h, group === 1 ? '1 bill paid' : `${group} bills paid`, 'several at once: one receipt for all of them');
  await page.click('#overlay .pd-sheet [data-a="pd-done"]'); await page.waitForTimeout(300);
  bills = await unpaid();
  await page.evaluate(b => A['line-pay']({ id: b.id, ym: B().month }), bills[0]); await page.waitForTimeout(150); await page.fill('#py-amount', '12,34'); await page.click('#overlay [data-a="pay-save"]'); await page.waitForTimeout(150);
  r = await receipt(); eq([r.h, r.amt], [`${bills[0].name} paid`, await page.evaluate(() => fmt.money(1234, BCUR()))], 'a payment with its amount typed: its receipt with that amount');
  await page.click('#overlay .pd-sheet [data-a="pd-done"]'); await page.waitForTimeout(300);
  const card = await page.evaluate(() => { const c = S.accounts.find(a => a.type === 'credit' && a.scope !== 'business'); return c && c.id; });
  if (card) {
    const t0 = await page.evaluate(() => S.transactions.length);
    await page.evaluate(id => A['card-pay']({ id }), card); await page.waitForTimeout(150); await page.fill('#cp-amount', '100'); await page.click('#overlay [data-a="card-pay-save"]'); await page.waitForTimeout(150);
    r = await receipt(); ok(/invoice paid$/.test(r.h) && r.undo, 'a card’s invoice paid: its receipt, with Undo');
    await page.click('#overlay .pd-sheet [data-a="pd-undo"]'); await page.waitForTimeout(300);
    eq(await page.evaluate(() => S.transactions.length), t0, 'Undo takes back both of its rows');
  }
  for (const b of await unpaid()) await page.evaluate(b => { A['line-pay-now']({ id: b.id, ym: B().month }); A['pd-done'](); }, b);
  await page.evaluate(() => { const l = planProgress(B(), B().month, BCUR(), B().today).find(p => p.bill && p.planned > 0); A['line-pay']({ id: l.id, ym: B().month }); }); await page.waitForTimeout(100);
  await page.fill('#py-amount', '1'); await page.click('#overlay [data-a="pay-save"]'); await page.waitForTimeout(150);
  r = await receipt(); ok(r.left === 'Every bill of the month is paid.' || /still to pay/.test(r.left), 'the month’s line: what is left, or that every bill is paid');
  await page.click('#overlay .pd-sheet [data-a="pd-done"]'); await page.waitForTimeout(300);

  // ---------- 2. money in ----------
  const inc = await page.evaluate(() => (S.categories.find(c => c.income) || {}).id);
  await page.evaluate(c => { A['new-tx']({}, x => { x.type = 'income'; x.dir = 'in'; x.amountText = '5200'; x.merchant = 'Salary'; x.catKey = c + '|'; }); }, inc); await page.waitForTimeout(150);
  await page.evaluate(() => A['save-tx']()); await page.waitForTimeout(200);
  const w = await page.evaluate(() => { const el = document.querySelector('#overlay .iw-win'), q = c => (el.querySelector(c) || {}).textContent; return el && [UI.sheet, /^Into /.test(q('.gw-kick')), q('#iw-amt') === '+' + fmt.money(520000, CUR), q('#iw-h'), !!el.querySelector('.iw-save [data-a="iw-save"]'), getComputedStyle(el).backgroundColor, !document.getElementById('confetti'), /Salary|added/.test(document.getElementById('toast-root').innerText)]; });
  eq(w, ['income-win', true, true, 'Salary', true, 'rgb(17, 38, 34)', true, false], 'money in: its screen on the forest (into which account, how much, what it was), a way to put part of it aside; no confetti, no strip');
  const idea = await page.evaluate(() => UI.iw.idea && { id: UI.iw.idea.g.id, amt: UI.iw.idea.amt });
  await page.click('#overlay [data-a="iw-save"]'); await page.waitForTimeout(250);
  eq(await page.evaluate(() => [UI.sheet, UI.drawer && UI.drawer.kind, UI.drawer && UI.drawer.draft.goalId, UI.drawer && typedAmount(UI.drawer.draft.amountText), !!document.getElementById('gw-slide')]), [false, 'goal-move', idea.id, idea.amt, true], 'its button: that goal’s contribution, the amount already in, to slide into the goal');
  await page.evaluate(() => A.close()); await page.waitForTimeout(250);
  await page.evaluate(() => { B().goals.forEach(g => { g.status = 'archived'; }); });
  await page.evaluate(c => { A['new-tx']({}, x => { x.type = 'income'; x.dir = 'in'; x.amountText = '100'; x.merchant = 'Gift'; x.catKey = c + '|'; }); A['save-tx'](); }, inc); await page.waitForTimeout(200);
  eq(await page.evaluate(() => [!!document.querySelector('#overlay .iw-save [data-a="iw-goal"]'), !document.querySelector('#overlay [data-a="iw-save"]')]), [true, true], 'without a goal: the way to start one');
  await page.click('#overlay [data-a="iw-done"]'); await page.waitForTimeout(250);
  eq(await page.evaluate(() => [UI.sheet, !!document.querySelector('#overlay .iw-win')]), [false, false], 'Not now closes it');
  await page.evaluate(() => { B().goals.forEach(g => { g.status = 'active'; }); });

  // ---------- 3. an expense saved ----------
  await page.click('#quick-acts [data-v="expense"]'); await page.waitForTimeout(200);
  for (const k of ['7', '5']) await page.click(`#overlay .bq-key[data-v="${k}"]`);
  await page.fill('#d-merchant', 'Bakery QC'); await page.evaluate(() => document.getElementById('d-merchant').dispatchEvent(new Event('change', { bubbles: true }))); await page.click('#overlay .tx-pick');
  await page.click('#overlay [data-a="save-tx"]'); await page.waitForTimeout(200);
  eq(await page.evaluate(() => [!!UI.drawer, S.transactions.some(x => x.merchant === 'Bakery QC' && x.amount === -7500), /added|saved/i.test(document.getElementById('toast-root').innerText)]), [false, true, false], 'an expense saved: recorded, the panel gone, no strip at the top');
  eq(errors, [], 'phone: no error in the console'); await browser.close();

  // ---------- with motion: the button says it, then the panel goes ----------
  ({ browser, page, errors } = await open({ ...phone, motion: true }));
  await page.evaluate(() => { S.user.greeted = true; navigate('dashboard'); render(); }); await page.waitForTimeout(400);
  await page.click('#quick-acts [data-v="expense"]'); await page.waitForTimeout(500);
  for (const k of ['7', '5']) await page.click(`#overlay .bq-key[data-v="${k}"]`);
  await page.fill('#d-merchant', 'Bakery QC'); await page.evaluate(() => document.getElementById('d-merchant').dispatchEvent(new Event('change', { bubbles: true }))); await page.click('#overlay .tx-pick');
  await page.click('#overlay [data-a="save-tx"]'); await page.waitForTimeout(260);
  const says = await page.evaluate(() => { const b = document.querySelector('#overlay [data-a="save-tx"]'); return b && [b.classList.contains('td-saved'), b.querySelector('.bq-save-t').textContent, getComputedStyle(b).backgroundColor]; });
  await page.waitForTimeout(800);
  eq([says, await page.evaluate(() => [!!UI.drawer, S.transactions.filter(x => x.merchant === 'Bakery QC').length])], [[true, 'Recorded', 'rgb(182, 221, 98)'], [false, 1]], 'with motion: its button turns lime and says “Recorded”, then the panel goes; saved once');
  eq(errors, [], 'with motion: no error in the console'); await browser.close();

  // ---------- 4. the previous look; a computer ----------
  ({ browser, page, errors } = await open({ ...phone, oldLook: true }));
  bills = await unpaid();
  await page.evaluate(b => A['line-pay-now']({ id: b.id, ym: B().month }), bills[0]); await page.waitForTimeout(150);
  eq(await page.evaluate(() => [UI.sheet, !!document.querySelector('#toast-root [data-a="undo-pay"]')]), [false, true], 'the previous look keeps its strip with Undo');
  await browser.close();
  ({ browser, page, errors } = await open({ lang: 'en', account: 'example', plan: true, viewport: { width: 1440, height: 900 } }));
  bills = await unpaid();
  await page.evaluate(b => A['line-pay-now']({ id: b.id, ym: B().month }), bills[0]); await page.waitForTimeout(500);
  eq(await page.evaluate(() => { const r = document.querySelector('#overlay .pd-sheet').getBoundingClientRect(), v = document.querySelector('#overlay .scrim').getBoundingClientRect(); return [Math.round(r.width), Math.abs((r.left + r.right) / 2 - (v.left + v.right) / 2) < 2, innerHeight - r.bottom >= 20]; }), [440, true, true], 'a computer: the receipt 440 px wide in the middle of the screen’s foot');
  eq(errors, [], 'computer: no error in the console'); await browser.close();
  done('qc-done');
})();
