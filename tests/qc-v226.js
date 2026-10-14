// QC of v226 (owner, 2026-10-14: "haz el 2, 6 y 7 y dime antes que todo cómo agrego dinero aquí en jornada, no sé", with the sprint at R$ 0 of R$ 100):
//   1. the Journey's sprint says what fills it and has the way to record a payment: with one debt, its payment; with several, the list of them, the
//      first Pay button ready; with none, a new debt; the button fits a phone;
//   2. subscriptions that hold a goal back ("Netflix + Spotify = R$ 85 al mes. Sin ellos, Viaje llega 2 meses antes"): the figure, the goal and the
//      months, the same as "What if…?" spending that less; among the day's facts, on a phone, in Recurring and in a tip; the company's side has none,
//      nor an account without subscriptions. (The weekly summary, item 7, is tested in qc-tips.js.)
const { open, ok, eq, done } = require('./pw.js');
(async () => {
  const { browser, page: p, errors } = await open({ lang: 'es', account: 'example', plan: true, viewport: { width: 390, height: 844 }, touch: true, mobile: true });

  // ---------- 1. the sprint's way to record a payment ----------
  const sprint = () => p.evaluate(() => { A.close(); S.user.greeted = true; S.journey = S.journey || journeyEmpty(); S.journey.sprint = { id: 'sp1', start: S.today, days: 14, target: 10000 }; A['journey-open'](); });
  const owed = () => p.evaluate(() => journeyDebts(B(), S.today, BCUR()).filter(x => x.left > 0).map(x => [x.kind, x.id]));
  await p.evaluate(() => { S.journey = journeyEmpty(); }); await sprint(); await p.waitForSelector('.jr-sprint-pay');
  eq(await p.evaluate(() => { const b = document.querySelector('.jr-sprint-pay'), r = b.getBoundingClientRect(), n = document.querySelector('.jr-sprint-how'); return [b.innerText.trim(), r.height >= 44, r.left >= 0 && r.right <= innerWidth, n.innerText.trim(), parseFloat(getComputedStyle(n).fontSize) >= 12]; }),
    ['Registrar un pago', true, true, 'El sprint se llena con lo que pagas de tus deudas y facturas de tarjeta.', true], 'a running sprint: “Record a payment”, 44px or more, inside the phone, and a line saying what fills it');
  const cards = await owed();
  await p.click('.jr-sprint-pay'); await p.waitForTimeout(200);
  if (!cards.length) eq(await p.evaluate(() => UI.drawer && UI.drawer.kind), 'debt-form', 'nothing owed: it opens a new debt');
  else if (cards.length === 1) eq(await p.evaluate(() => UI.drawer && UI.drawer.kind), cards[0][0] === 'card' ? 'card-pay' : 'debt-pay', 'one thing owed: its payment opens');
  else eq(await p.evaluate(() => [UI.drawer && UI.drawer.kind, !!document.activeElement.closest('#jr-debts'), /^(debt-pay|card-pay)$/.test(document.activeElement.dataset.a || '')]), ['journey', true, true], 'several owed: the list of them, its first Pay button ready');
  // one debt of its own and no card balance: its payment
  await p.evaluate(() => { S.journey = journeyEmpty(); S.journey.debts.push({ id: 'd1', name: 'Préstamo', owed: 50000, rate: 0, min: 10000, due: 10, start: S.today }); S.accounts.filter(a => a.type === 'credit').forEach(a => { a.qaType = a.type; a.type = 'checking'; }); });
  await sprint(); const one = await owed();
  if (one.length === 1) { await p.click('.jr-sprint-pay'); await p.waitForTimeout(200); eq(await p.evaluate(() => UI.drawer && UI.drawer.kind), 'debt-pay', 'one debt: its payment opens'); }
  else ok(false, 'one debt only, for the check', one);
  // nothing owed: a new debt
  await p.evaluate(() => { S.journey = journeyEmpty(); }); await sprint();
  if (!(await owed()).length) { await p.click('.jr-sprint-pay'); await p.waitForTimeout(200); eq(await p.evaluate(() => UI.drawer && UI.drawer.kind), 'debt-form', 'nothing owed: a new debt opens'); }
  await p.evaluate(() => { S.accounts.filter(a => a.qaType).forEach(a => { a.type = a.qaType; delete a.qaType; }); A.close(); });

  // ---------- 2. subscriptions that hold a goal back ----------
  const sd = await p.evaluate(() => subsDelay(S, S.today, CUR));
  ok(sd && sd.amount >= 1000 && sd.sooner >= 1 && sd.names.length >= 1 && sd.month === '2026-09', 'the example account: last month’s subscriptions, a goal and its months sooner', sd);
  eq(await p.evaluate(x => { const w = whatIf(S, S.today, CUR, x.id, { less: x.amount }).goal; return [w.sooner, w.from, w.to]; }, sd), [sd.sooner, sd.from, sd.to], 'the months are “What if…?” spending that less each month');
  eq(await p.evaluate(() => insights(S, S.today, CUR).map(x => x.kind).indexOf('subs') > insights(S, S.today, CUR).map(x => x.kind).indexOf('goal')), true, 'among the day’s facts, after the goal');
  const sooner = `${sd.sooner} ${sd.sooner === 1 ? 'mes' : 'meses'} antes`;
  // the phone's line of facts, and its tap
  await p.evaluate(() => navigate('dashboard')); await p.waitForTimeout(200);
  const line = await p.evaluate(() => { const c = document.querySelector('.ins-row .ins-c[data-k="subs"]'); return c && c.innerText; });
  ok(line && line.includes('Sin tus suscripciones') && line.includes(sd.name) && line.includes(sooner), 'the phone: “Without your subscriptions, the goal arrives n months sooner”', line);
  await p.evaluate(() => document.querySelector('.ins-row .ins-c[data-k="subs"]').click()); await p.waitForTimeout(200);
  eq(await p.evaluate(() => [UI.route, subsCats(B()).includes(UI.tx.category)]), ['transactions', true], 'a tap: the subscriptions’ own movements');
  // Recurring
  await p.evaluate(() => navigate('recurring')); await p.waitForTimeout(200);
  const rec = await p.evaluate(() => { const b = document.querySelector('#view .banner'); return b && [b.innerText, b.getBoundingClientRect().right <= innerWidth]; });
  ok(rec && /Tus suscripciones costaron R\$/.test(rec[0]) && rec[0].includes(sd.name) && rec[0].includes(sooner) && rec[0].includes(sd.names[0]) && /lo decides tú/.test(rec[0]) && rec[1], 'Recurring: what they cost, the goal, the months, their names, and the choice left to the person', rec);
  // the tip by notification, the same sentence
  const tip = await p.evaluate(x => tipInsight({ kind: 'subs', ...x }), sd);
  ok(tip && /^Tus suscripciones costaron R\$/.test(tip[0]) && tip[0].includes(sooner) && /lo decides tú\.$/.test(tip[1]) && !/<|&/.test(tip.join(' ')), 'the tip: the same words, as plain text', tip);
  // the company's side: none
  eq(await p.evaluate(() => { A.space({ v: 'business' }); const out = [subsDelay(B(), S.today, BCUR()), insights(B(), S.today, BCUR()).some(x => x.kind === 'subs')]; A.space({ v: 'personal' }); return out; }), [null, false], 'the company’s side: none');
  // no subscriptions: none
  eq(await p.evaluate(() => { const ids = subsCats(S), keep = S.transactions; S.transactions = keep.filter(x => !ids.includes(x.categoryId)); const out = [subsDelay(S, S.today, CUR), insights(S, S.today, CUR).some(x => x.kind === 'subs')]; S.transactions = keep; return out; }), [null, false], 'no subscriptions recorded: nothing said');

  eq(errors, [], 'no error in the console'); await browser.close();
  done('qc-v226');
})().catch(e => { console.error('qc-v226: Error', e); process.exit(1); });
