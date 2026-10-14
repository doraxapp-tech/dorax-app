// QC of the saving challenges in the Journey (v227, owner, 2026-10-14: "sigue con el 8": claude/open-gaps-funcionalidades-2026-10-10.md, item 8,
// "Desafíos de ahorro: '52 semanas' y 'días sin gastar', con la racha de la Jornada. Juego para quien no tiene deudas". He chose: in the Journey; the
// classic 52 weeks with a multiplier and the reverse order; the days without spending marked by the person):
//   1. someone who owes nothing opens the Journey straight on its panel, the challenges right under the streak and no sprint; someone who owes still
//      gets the first page about debts, and the challenges come after what is owed; the company's Journey has none;
//   2. the 52 weeks: R$ 1, 2, 5 or 10 a step, smallest or largest first, the totals; a savings account and notifications needed; started, a goal of its
//      own whose plan is the weeks; "Put aside" is the goal's contribution of what is due, and back; the week's sums; its weekly reminder in the bell
//      and in the server's words, and none once it is put aside; done and closed, the goal stays; left, the goal stays; the goal says whose it is;
//   3. the days without spending: the day's question becomes "I spent nothing today"; a purchase today outside the fixed costs is said, the person
//      decides; the mark is the streak's; the morning question in the bell and the server's words; ended, its count and "Close it";
//   4. a phone: nothing wider than the screen, every button 44 px.
const path = require('path');
const { open, ok, eq, done } = require('./pw.js');
const PUSH_ON = () => { const sub = { endpoint: 'https://push.example/this-device', keys: { p256dh: 'BPk', auth: 'YXV0aA' } }; window.DORAX_PUSH = { supported: () => true, needsInstall: () => false, permission: () => 'granted', ask: async () => 'granted', current: async () => sub, subscribe: async () => sub, unsubscribe: async () => {} }; };
(async () => {
  const logic = await import('file://' + path.join(__dirname, '..', 'supabase', 'functions', 'reminders', 'logic.mjs'));
  let { browser, page: p, errors } = await open({ oldLook: true, lang: 'es', account: 'example', plan: true, viewport: { width: 1280, height: 900 } });
  await p.addInitScript(PUSH_ON); await p.reload(); await p.waitForFunction(() => typeof UI !== 'undefined' && !!UI.session); await p.evaluate(() => pushRefresh());
  const kind = () => p.evaluate(() => UI.drawer && UI.drawer.kind);
  const order = () => p.evaluate(() => [...document.querySelectorAll('.drawer .jr > section')].map(s => s.id || s.className.split(' ')[0]));

  // ---------- 1. who sees them first ----------
  await p.evaluate(() => { S.user.greeted = true; S.journey = journeyEmpty(); A['journey-open'](); });
  eq(await p.evaluate(() => !!UI.jstart), true, 'someone who owes (the example’s cards) still gets the first page about debts');
  await p.evaluate(() => { A['jstart-close'](); S.journey.sprints.push({ id: 'old', start: addDays(S.today, -40), days: 30, target: 10000, paid: 10000 }); A['journey-open'](); });
  const o1 = await order();
  ok(o1.indexOf('jr-chal') > o1.indexOf('jr-debts') && o1.indexOf('jr-debts') > 0, 'with something owed, the challenges come after what is owed', o1);
  await p.evaluate(() => { A.close(); S.journey = journeyEmpty(); S.accounts.filter(a => a.type === 'credit').forEach(a => { a.qaCard = 1; a.type = 'checking'; }); A['journey-open'](); });
  eq([await kind(), await p.evaluate(() => !!UI.jstart)], ['journey', false], 'someone who owes nothing: straight to the panel, no page about debts');
  const o2 = await order();
  eq([o2[0], o2[1], await p.evaluate(() => !!document.querySelector('.drawer #jr-sprint, .drawer .jr-sprint'))], ['jr-card', 'jr-chal', false], 'the challenges right under the streak, and no sprint in the way');
  eq(await p.evaluate(() => [...document.querySelectorAll('#jr-chal h4')].map(h => h.innerText)), ['52 semanas', 'Días sin gastar'], 'two challenges: 52 weeks, days without spending');
  ok(await p.evaluate(() => /R\$ 1\.378/.test(document.querySelector('#jr-s52').innerText)), 'the 52 weeks say where they end: R$ 1.378');
  eq(await p.evaluate(() => { A.close(); A.space({ v: 'business' }); A['journey-open'](); const out = !!document.querySelector('#jr-chal'); A['jstart-close'](); A.close(); A.space({ v: 'personal' }); return out; }), false, 'the company’s Journey has no challenges');

  // ---------- 2. the 52 weeks ----------
  await p.evaluate(() => A['journey-open']()); await p.click('[data-a="s52-new"]'); await p.waitForSelector('.drawer [data-a="s52-step"]');
  eq(await p.evaluate(() => [...document.querySelectorAll('[data-a="s52-step"]')].map(b => b.innerText)), ['R$ 1', 'R$ 2', 'R$ 5', 'R$ 10'], 'how much it goes up: R$ 1, 2, 5 or 10');
  await p.click('[data-a="s52-step"][data-v="500"]');
  ok(await p.evaluate(() => /Semana 1: R\$ 5 · semana 52: R\$ 260 · al final: R\$ 6\.890/.test(document.querySelector('.jr-pre').innerText)), 'R$ 5: week 1 R$ 5, week 52 R$ 260, R$ 6.890 at the end');
  await p.click('[data-a="s52-order"][data-v="1"]');
  ok(await p.evaluate(() => /Semana 1: R\$ 260 · semana 52: R\$ 5 · al final: R\$ 6\.890/.test(document.querySelector('.jr-pre').innerText)), 'largest first: week 1 R$ 260, the same total');
  await p.click('[data-a="s52-order"][data-v="0"]');
  await p.evaluate(() => A['s52-save']());
  eq(await p.evaluate(() => [UI.drawer.invalid, S.journey.save52]), ['s52-acct', null], 'no savings account chosen: not started, and the field says so');
  // notifications off: the main button is the step that turns them on
  eq(await p.evaluate(() => { const keep = UI.push; UI.push = { ...keep, status: 'off' }; renderOverlay(); const a = document.querySelector('.drawer footer .btn.primary').dataset.a; UI.push = keep; renderOverlay(); return a; }), 'ch-push', 'with notifications off, the button turns them on first');
  const acc = await p.evaluate(() => goalSavings(null, BCUR())[0].id);
  await p.selectOption('#s52-acct', acc); await p.click('[data-a="s52-save"]'); await p.waitForTimeout(200);
  const g = await p.evaluate(() => { const c = S.journey.save52, g = S.goals.find(x => x.id === c.goalId); return { c, target: g.target, deadline: g.deadline, acct: g.accountId, plan: Object.values(g.plan).flat().reduce((a, b) => a + b, 0), challenge: g.challenge, name: g.name }; });
  eq([await kind(), g.c.step, g.c.reverse, g.c.start, g.target, g.plan, g.acct, g.challenge, g.name], ['journey', 500, false, '2026-10-02', 689000, 689000, acc, 's52', 'Desafío 52 semanas'], 'started: a goal of its own, R$ 6.890, its plan the 52 weeks, in the account chosen');
  eq(g.deadline, '2027-09', 'its goal’s month: the one of week 52');
  // the sums
  eq(await p.evaluate(() => { const c = { step: 100, reverse: false }, r = { step: 100, reverse: true }; return [s52Upto(c, 52), s52Upto(r, 52), s52Upto(c, 3), s52Upto(r, 2), s52Amount(r, 1), s52Amount(r, 52)]; }), [137800, 137800, 600, 10300, 5200, 100], 'the sums: R$ 1.378 either way; weeks 1 to 3 R$ 6; largest first R$ 52 + R$ 51');
  ok(await p.evaluate(() => /Esta semana: R\$ 5\./.test(document.querySelector('#jr-s52').innerText) && /Guardar R\$ 5/.test(document.querySelector('#jr-s52 [data-a="s52-put"]').innerText)), 'running: this week R$ 5, and “Put aside R$ 5”');
  // its reminder, in the bell and in the server's words
  const rem = await p.evaluate(() => journeyReminders(S, S.today, CUR, 3).filter(r => r.kind === 's52'));
  eq(rem.map(r => [r.week, r.amount, r.behind]), [[1, 500, false]], 'its reminder: week 1, R$ 5');
  const doc = await p.evaluate(() => { const d = JSON.parse(JSON.stringify(S)); d.user.notify = { journey: true }; return d; });
  const msg = logic.messageFor(JSON.parse(JSON.stringify(doc)), '2026-10-02', new Set());
  ok(msg && msg.lines.some(l => l === '52 semanas, semana 1: guarda R$ 5.'), 'the server says it in the same words', msg && msg.lines);
  // put aside
  await p.click('[data-a="s52-put"]'); await p.waitForSelector('#m-amount');
  eq([await kind(), await p.evaluate(() => $('m-amount').value.replace(/[.,]00$/, ''))], ['goal-move', '5'], '“Put aside” opens the goal’s contribution with R$ 5');
  await p.click('[data-a="move-save"]'); await p.waitForTimeout(250);
  eq([await kind(), await p.evaluate(() => s52Now(B(), S.today).saved)], ['journey', 500], 'saved: back to the Journey, R$ 5 in');
  ok(await p.evaluate(() => /La semana 1 está lista\. La próxima: R\$ 10, desde el/.test(document.querySelector('#jr-s52').innerText) && !document.querySelector('#jr-s52 [data-a="s52-put"]')), 'week 1 is done; the next, R$ 10, and from when');
  eq(await p.evaluate(() => journeyReminders(S, S.today, CUR, 3).some(r => r.kind === 's52')), false, 'put aside: no reminder');
  eq(await p.evaluate(() => { const c = s52Now(B(), addDays(S.today, 15)); return [c.week, c.toGo, c.covered]; }), [3, 2500, 1], 'two weeks later, in week 3: R$ 25 to be up to date');
  eq(await p.evaluate(() => { const r = journeyReminders(S, addDays(S.today, 15), CUR, 3).find(x => x.kind === 's52'); return r && [r.week, r.amount, r.behind]; }), [3, 2500, true], 'its reminder then: up to date, R$ 25');
  // the goal says whose it is
  await p.evaluate(() => A['goal-open']({ id: S.journey.save52.goalId }));
  ok(await p.evaluate(() => /desafío de 52 semanas de tu Jornada/.test(document.querySelector('.drawer .g-ch').innerText) && !!document.querySelector('.drawer .g-ch [data-a="journey-open"]')), 'its goal says it is the Journey’s challenge, with the way back');
  // done and closed: the goal stays
  await p.evaluate(() => { const c = S.journey.save52; S.goalMoves.push({ id: 'qa-all', goalId: c.goalId, date: S.today, amount: 689000 - 500, accountId: null }); A['journey-open'](); });
  ok(await p.evaluate(() => /Desafío cumplido/.test(document.querySelector('#jr-s52').innerText) && !!document.querySelector('#jr-s52 [data-a="s52-close"]')), 'all put aside: “Challenge done”, and “Close the challenge”');
  await p.click('[data-a="s52-close"]'); await p.waitForTimeout(200);
  eq(await p.evaluate(gid => [S.journey.save52, S.journey.ended.map(x => [x.kind, x.saved, x.total]), !!S.goals.find(x => x.id === gid), /El último: R\$ 6\.890 de R\$ 6\.890/.test(document.querySelector('#jr-s52').innerText)], g.c.goalId),
    [null, [['s52', 689000, 689000]], true, true], 'closed: kept among the ended ones, its goal stays, and “Last one” says how it went');
  // left: the goal stays
  await p.evaluate(() => { A['s52-new'](); UI.drawer.draft.accountId = goalSavings(null, BCUR())[0].id; A['s52-save'](); });
  await p.click('#jr-s52 [data-a="s52-end"]'); await p.waitForSelector('#modal-ok'); await p.click('#modal-ok'); await p.waitForTimeout(200);
  eq(await p.evaluate(() => [S.journey.save52, S.journey.ended.length, S.goals.filter(x => x.challenge === 's52').length]), [null, 2, 2], 'left: no challenge running, the goal with its money stays');

  // ---------- 3. the days without spending ----------
  await p.click('[data-a="ns-new"]'); await p.waitForSelector('[data-a="ns-days"]');
  await p.click('[data-a="ns-days"][data-v="7"]'); await p.click('[data-a="ns-save"]'); await p.waitForTimeout(200);
  eq(await p.evaluate(() => [S.journey.nospend && S.journey.nospend.length, S.journey.nospend && S.journey.nospend.start]), [7, '2026-10-02'], 'started: 7 days from today');
  ok(await p.evaluate(() => /Un día sin gastar/.test(document.querySelector('.jr-ask').innerText) && /Hoy no gasté/.test(document.querySelector('.jr-ask [data-a="journey-mark"]').innerText)), 'the day’s question becomes “I spent nothing today”');
  await p.evaluate(() => { S.transactions.push({ id: 'qa-ns', accountId: 'nu-conta', date: S.today, type: 'expense', amount: -4590, currency: 'BRL', categoryId: 'other', subcategoryId: null, status: 'confirmed', merchant: 'Sorvete', description: 'Sorvete', splits: null }); A['journey-open'](); });
  ok(await p.evaluate(() => { const n = document.querySelector('.jr-seen'); return !!n && /Dorax ve 1 compra de hoy fuera de lo fijo: Sorvete R\$ 45,90\. Tú decides si el día cuenta\./.test(n.innerText); }), 'a purchase today outside the fixed costs is said; the person decides');
  eq(await p.evaluate(() => nsSpent(S, S.today, CUR).some(x => x.name === 'Aluguel' || x.name === 'Alquiler')), false, 'the fixed costs (the plan’s bills) are not counted');
  await p.click('.jr-ask [data-a="journey-mark"]'); await p.waitForTimeout(150);
  eq(await p.evaluate(() => [S.journey.checks[S.today], nsNow(S.journey, S.today).marked, UI.toast && UI.toast.msg, journeyStreak(S.journey, S.today)]), [true, 1, 'Marcado: 1 día sin gastar.', 1], 'marked: one day without spending, and the streak is 1');
  const tomorrow = await p.evaluate(() => { const r = journeyReminders(S, addDays(S.today, 2), CUR, 3).find(x => x.kind === 'jmark'); return r && [r.ns, r.date]; });
  eq(tomorrow, [true, '2026-10-03'], 'two days later, the bell asks about the day before as a day without spending');
  const doc2 = await p.evaluate(() => { const d = JSON.parse(JSON.stringify(S)); d.user.notify = { journey: true }; return d; });
  const m2 = logic.messageFor(JSON.parse(JSON.stringify(doc2)), '2026-10-04', new Set());
  ok(m2 && m2.lines.some(l => /^Días sin gastar: si ayer no gastaste, márcalo/.test(l)), 'and the server asks in the same words', m2 && m2.lines);
  eq(await p.evaluate(() => { const r = journeyReminders(S, addDays(S.today, 7), CUR, 3).find(x => x.kind === 'ns'); return r && [r.marked, r.length]; }), [1, 7], 'when it ends: its reminder, 1 of 7');
  eq(await p.evaluate(() => { const keep = S.today; S.today = addDays(keep, 7); A['journey-open'](); const b = document.querySelector('#jr-ns'), out = [/Terminó: 1 de 7 días sin gastar\./.test(b.innerText), !!b.querySelector('[data-a="ns-close"]')]; A['ns-close'](); out.push(S.journey.nospend, S.journey.ended.filter(x => x.kind === 'ns').map(x => x.marked)); S.today = keep; A.close(); return out; }),
    [true, true, null, [1]], 'ended: its count, “Close it”, kept among the ended ones');
  eq(errors, [], 'no error in the console'); await browser.close();

  // ---------- 4. a phone ----------
  ({ browser, page: p, errors } = await open({ lang: 'pt', account: 'example', plan: true, viewport: { width: 360, height: 780 }, touch: true, mobile: true }));
  await p.addInitScript(PUSH_ON); await p.reload(); await p.waitForFunction(() => typeof UI !== 'undefined' && !!UI.session); await p.evaluate(() => pushRefresh());
  await p.evaluate(() => { S.user.greeted = true; S.journey = journeyEmpty(); S.accounts.filter(a => a.type === 'credit').forEach(a => { a.type = 'checking'; }); A['journey-open'](); });
  const fit = () => p.evaluate(() => { const vw = innerWidth, bad = [...document.querySelectorAll('.drawer button, .drawer select, .drawer .btn')].filter(b => b.offsetParent && !b.closest('.jr-week') && b.getBoundingClientRect().height < 44).map(b => b.dataset.a || b.innerText.trim()); return [document.documentElement.scrollWidth <= vw, [...document.querySelectorAll('.drawer *')].every(e => e.getBoundingClientRect().right <= vw + 1), bad]; });
  eq(await fit(), [true, true, []], 'pt, 360 px: the challenges fit, every button 44 px');
  ok(await p.evaluate(() => /Desafios de economia/.test(document.querySelector('#jr-chal').innerText) && /Dias sem gastar/.test(document.querySelector('#jr-chal').innerText)), 'pt: in Portuguese');
  await p.evaluate(() => A['s52-new']()); await p.waitForSelector('[data-a="s52-step"]');
  eq(await fit(), [true, true, []], 'pt, 360 px: the 52 weeks’ form fits, every button 44 px');
  await p.evaluate(() => { UI.drawer.draft.accountId = goalSavings(null, BCUR())[0].id; A['s52-save'](); A['ns-new'](); A['ns-save'](); });
  await p.waitForTimeout(200);
  eq(await fit(), [true, true, []], 'pt, 360 px: both running, the panel fits, every button 44 px');
  eq(errors, [], 'pt: no error in the console'); await browser.close();
  done('qc-challenges');
})().catch(e => { console.error('qc-challenges: Error', e); process.exit(1); });
