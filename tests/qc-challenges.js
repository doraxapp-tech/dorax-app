// QC of the saving challenges (v227, owner, 2026-10-14: "sigue con el 8": claude/open-gaps-funcionalidades-2026-10-10.md, item 8, "Desafíos de
// ahorro: '52 semanas' y 'días sin gastar'". He chose the classic 52 weeks with a multiplier and the reverse order, and days the person marks. First
// built inside the Journey, then, the same day: "la Jornada es muy larga y tiene varias cosas dentro que no tienen que ver una con otra"; he chose to
// keep them apart: the 52 weeks in Goals, the days without spending on the summary, beside "You can spend"):
//   1. the Journey is the way out of debt alone again: no challenges in it, its first page as before;
//   2. the 52 weeks in Goals: what it is and its start; R$ 1, 2, 5 or 10 a step, smallest or largest first, the totals; a savings account needed;
//      started, a goal of its own whose plan is the weeks, shown as the challenge and not among the goals; "Put aside" is that goal's contribution of
//      what is due; the week's sums; its weekly reminder in the bell and in the server's words; done and closed, or left, the goal stays; a
//      computer's Goals has it as a card;
//   3. the days without spending: started from the details of "You can spend"; a strip under it while they run; "I spent nothing today" marks the
//      day; a purchase that day outside the fixed costs is said first and the person decides; their own count, apart from the Journey's streak; the
//      morning question in the bell and the server's words; ended, its count and "Close it";
//   4. the company's side has neither; an account from v227's first build has its challenges moved out of the Journey;
//   5. a phone: nothing wider than the screen, every button 44 px.
const path = require('path');
const { open, ok, eq, done } = require('./pw.js');
(async () => {
  const logic = await import('file://' + path.join(__dirname, '..', 'supabase', 'functions', 'reminders', 'logic.mjs'));
  let { browser, page: p, errors } = await open({ oldLook: true, lang: 'es', account: 'example', plan: true, viewport: { width: 1280, height: 900 } });
  const kind = () => p.evaluate(() => UI.drawer && UI.drawer.kind);
  await p.evaluate(() => { S.user.greeted = true; });

  // ---------- 1. the Journey, the way out of debt alone ----------
  await p.evaluate(() => { S.journey = journeyEmpty(); S.journey.sprints.push({ id: 'old', start: addDays(S.today, -40), days: 30, target: 10000, paid: 10000 }); A['journey-open'](); });
  eq(await p.evaluate(() => [!!document.querySelector('.drawer .jr'), !!document.querySelector('#jr-chal, [data-a="s52-new"], [data-a="ns-new"]'), /no sumé deuda/.test(document.querySelector('.jr-ask').innerText)]), [true, false, true], 'the Journey has no challenges, and its day is “no new debt” again');
  await p.evaluate(() => { A.close(); S.journey = journeyEmpty(); A['journey-open'](); });
  eq(await p.evaluate(() => !!UI.jstart), true, 'the first time, its page about debts, as before');
  await p.evaluate(() => A['jstart-close']());

  // ---------- 2. the 52 weeks, in Goals ----------
  await p.evaluate(() => navigate('goals')); await p.waitForTimeout(150);
  const secs = await p.evaluate(() => [...document.querySelectorAll('#view h2.sec')].map(h => h.innerText.trim()));
  ok(secs.indexOf('Desafío 52 semanas') > secs.findIndex(s => /^Metas y fondos/.test(s)) && secs.indexOf('Desafío 52 semanas') < secs.indexOf('Gastos del año'), 'Goals: “52-week challenge” under the goals, before the yearly expenses', secs);
  ok(await p.evaluate(() => /R\$ 1\.378/.test(document.querySelector('#s52').innerText) && !!document.querySelector('#s52 [data-a="s52-new"]')), 'not started: what it is, R$ 1.378 at the end, and the way to start');
  await p.click('#s52 [data-a="s52-new"]'); await p.waitForSelector('.drawer [data-a="s52-step"]');
  eq(await p.evaluate(() => [...document.querySelectorAll('[data-a="s52-step"]')].map(b => b.innerText)), ['R$ 1', 'R$ 2', 'R$ 5', 'R$ 10'], 'how much it goes up: R$ 1, 2, 5 or 10');
  await p.click('[data-a="s52-step"][data-v="500"]');
  ok(await p.evaluate(() => /Semana 1: R\$ 5 · semana 52: R\$ 260 · al final: R\$ 6\.890/.test(document.querySelector('.ch-pre').innerText)), 'R$ 5: week 1 R$ 5, week 52 R$ 260, R$ 6.890 at the end');
  await p.click('[data-a="s52-order"][data-v="1"]');
  ok(await p.evaluate(() => /Semana 1: R\$ 260 · semana 52: R\$ 5 · al final: R\$ 6\.890/.test(document.querySelector('.ch-pre').innerText)), 'largest first: week 1 R$ 260, the same total');
  await p.click('[data-a="s52-order"][data-v="0"]');
  await p.evaluate(() => A['s52-save']());
  eq(await p.evaluate(() => [UI.drawer.invalid, challengesOf(S).save52]), ['s52-acct', null], 'no savings account chosen: not started, and the field says so');
  const acc = await p.evaluate(() => goalSavings(null, BCUR())[0].id);
  await p.selectOption('#s52-acct', acc); await p.click('[data-a="s52-save"]'); await p.waitForTimeout(200);
  const g = await p.evaluate(() => { const c = S.challenges.save52, g = S.goals.find(x => x.id === c.goalId); return { c, target: g.target, deadline: g.deadline, acct: g.accountId, plan: Object.values(g.plan).flat().reduce((a, b) => a + b, 0), challenge: g.challenge, name: g.name }; });
  eq([await kind(), await p.evaluate(() => UI.route), g.c.step, g.c.reverse, g.c.start, g.target, g.plan, g.deadline, g.acct, g.challenge, g.name], [null, 'goals', 500, false, '2026-10-02', 689000, 689000, '2027-09', acc, 's52', 'Desafío 52 semanas'], 'started: a goal of its own, R$ 6.890, its plan the 52 weeks, in the account chosen, until September 2027');
  eq(await p.evaluate(gid => [!!document.querySelector(`#view .g-3 [data-id="${gid}"], #view .goal-card[data-id="${gid}"]`), [...document.querySelectorAll('#view .grid.g-3 .card')].some(c => /Desafío 52 semanas/.test(c.innerText)), /Esta semana: R\$ 5\./.test(document.querySelector('#s52').innerText)], g.c.goalId), [false, false, true], 'its goal is the challenge, not one more card among the goals; this week R$ 5');
  eq(await p.evaluate(() => { const c = { step: 100, reverse: false }, r = { step: 100, reverse: true }; return [s52Upto(c, 52), s52Upto(r, 52), s52Upto(c, 3), s52Upto(r, 2), s52Amount(r, 1), s52Amount(r, 52)]; }), [137800, 137800, 600, 10300, 5200, 100], 'the sums: R$ 1.378 either way; weeks 1 to 3 R$ 6; largest first R$ 52 + R$ 51');
  eq((await p.evaluate(() => challengeReminders(S, S.today))).filter(r => r.kind === 's52').map(r => [r.week, r.amount, r.behind]), [[1, 500, false]], 'its reminder: week 1, R$ 5');
  const doc = await p.evaluate(() => { const d = JSON.parse(JSON.stringify(S)); d.user.notify = { challenges: true }; return d; });
  const msg = logic.messageFor(JSON.parse(JSON.stringify(doc)), '2026-10-02', new Set());
  ok(msg && msg.lines.some(l => l === '52 semanas, semana 1: guarda R$ 5.'), 'the server says it in the same words', msg && msg.lines);
  eq(logic.messageFor(JSON.parse(JSON.stringify({ ...doc, user: { ...doc.user, notify: { challenges: false } } })), '2026-10-02', new Set()), null, 'its switch off: nothing');
  await p.click('#s52 [data-a="s52-put"]'); await p.waitForSelector('#m-amount');
  eq([await kind(), await p.evaluate(() => $('m-amount').value.replace(/[.,]00$/, ''))], ['goal-move', '5'], '“Put aside” opens the goal’s contribution with R$ 5');
  await p.click('[data-a="move-save"]'); await p.waitForTimeout(250);
  eq(await p.evaluate(() => s52Now(S, S.today).saved), 500, 'saved: R$ 5 in');
  ok(await p.evaluate(() => /La semana 1 está lista\. La próxima: R\$ 10, desde el/.test(document.querySelector('#s52').innerText) && !document.querySelector('#s52 [data-a="s52-put"]')), 'week 1 is done; the next, R$ 10, and from when');
  eq(await p.evaluate(() => challengeReminders(S, S.today).some(r => r.kind === 's52')), false, 'put aside: no reminder');
  eq(await p.evaluate(() => { const c = s52Now(S, addDays(S.today, 15)), r = challengeReminders(S, addDays(S.today, 15)).find(x => x.kind === 's52'); return [c.week, c.toGo, c.covered, r && r.behind]; }), [3, 2500, 1, true], 'two weeks later, in week 3: R$ 25 to be up to date, and the reminder says so');
  await p.evaluate(gid => A['goal-open']({ id: gid }), g.c.goalId);
  ok(await p.evaluate(() => /Es tu desafío de 52 semanas/.test(document.querySelector('.drawer .g-ch').innerText)), 'its goal says it is the challenge');
  await p.evaluate(gid => { A.close(); S.goalMoves.push({ id: 'qa-all', goalId: gid, date: S.today, amount: 689000 - 500, accountId: null }); render(); }, g.c.goalId);
  ok(await p.evaluate(() => /Desafío cumplido/.test(document.querySelector('#s52').innerText) && !!document.querySelector('#s52 [data-a="s52-close"]')), 'all put aside: “Challenge done”, and “Close the challenge”');
  await p.click('#s52 [data-a="s52-close"]'); await p.waitForTimeout(200);
  eq(await p.evaluate(gid => [S.challenges.save52, S.challenges.ended.map(x => [x.kind, x.saved, x.total]), !!S.goals.find(x => x.id === gid), /El último: R\$ 6\.890 de R\$ 6\.890/.test(document.querySelector('#s52').innerText), [...document.querySelectorAll('#view .grid.g-3 .card')].some(c => /Desafío 52 semanas/.test(c.innerText))], g.c.goalId),
    [null, [['s52', 689000, 689000]], true, true, true], 'closed: kept among the ended ones; its goal stays, now among the goals; “Last one” says how it went');
  await p.evaluate(() => { A['s52-new'](); UI.drawer.draft.accountId = goalSavings(null, BCUR())[0].id; A['s52-save'](); });
  await p.click('#s52 [data-a="s52-end"]'); await p.waitForSelector('#modal-ok'); await p.click('#modal-ok'); await p.waitForTimeout(200);
  eq(await p.evaluate(() => [S.challenges.save52, S.challenges.ended.length, S.goals.filter(x => x.challenge === 's52').length]), [null, 2, 2], 'left: no challenge running, the goal with its money stays');

  // ---------- 3. the days without spending, on the summary ----------
  await p.evaluate(() => navigate('dashboard')); await p.waitForTimeout(150);
  eq(await p.evaluate(() => !!document.querySelector('#ns-strip')), false, 'not started: nothing on the summary');
  await p.evaluate(() => A['free-view']()); await p.waitForSelector('.drawer #ns-invite');
  ok(await p.evaluate(() => /Días sin gastar/.test(document.querySelector('#ns-invite').innerText)), 'they start from the details of “You can spend”');
  await p.click('#ns-invite [data-a="ns-new"]'); await p.waitForSelector('[data-a="ns-days"]');
  await p.click('[data-a="ns-days"][data-v="7"]'); await p.click('[data-a="ns-save"]'); await p.waitForTimeout(200);
  eq(await p.evaluate(() => [S.challenges.nospend.length, S.challenges.nospend.start, UI.route, !!UI.drawer]), [7, '2026-10-02', 'dashboard', false], 'started: 7 days from today, back on the summary');
  const strip = await p.evaluate(() => { const s = document.querySelector('#ns-strip'), f = document.querySelector('#free-card'); return s && [/Días sin gastar/.test(s.innerText), /0 de 7 días/.test(s.innerText), !!s.querySelector('[data-a="ns-mark"]'), !!(f.compareDocumentPosition(s) & Node.DOCUMENT_POSITION_FOLLOWING)]; });
  eq(strip, [true, true, true, true], 'a strip under “You can spend”: 0 of 7 days, and “I spent nothing today”');
  await p.click('#ns-strip [data-a="ns-mark"]'); await p.waitForTimeout(150);
  eq(await p.evaluate(() => [S.challenges.nospend.marks[S.today], nsNow(S, S.today).marked, UI.toast && UI.toast.msg, !!(S.journey && S.journey.checks && S.journey.checks[S.today])]), [true, 1, 'Marcado: 1 de 7 días sin gastar.', false], 'marked: 1 of 7, its own count, not the Journey’s streak');
  ok(await p.evaluate(() => /1 de 7 días/.test(document.querySelector('#ns-strip').innerText) && !document.querySelector('#ns-strip [data-a="ns-mark"]')), 'the strip says 1 of 7, and today is done');
  // yesterday, with a purchase outside the fixed costs: said first, the person decides
  await p.evaluate(() => { S.challenges.nospend.start = addDays(S.today, -1); S.transactions.push({ id: 'qa-ns', accountId: 'nu-conta', date: addDays(S.today, -1), type: 'expense', amount: -4590, currency: 'BRL', categoryId: 'other', subcategoryId: null, status: 'confirmed', merchant: 'Sorvete', description: 'Sorvete', splits: null }); A['ns-view'](); });
  eq(await p.evaluate(() => [...document.querySelectorAll('.ns-days .ns-day')].length), 7, 'its details: every day of it');
  await p.click(`.ns-days button[data-d="2026-10-01"]`); await p.waitForSelector('#modal-ok');
  ok(await p.evaluate(() => /Dorax ve 3 compras de ese día fuera de lo fijo: Assaí Atacadista R\$ 214,80, Restaurante R\$ 92,00 y 1 más\. Tú decides si el día cuenta\./.test(document.querySelector('#modal-root').innerText)), 'a purchase that day outside the fixed costs is said first');
  await p.click('#modal-ok'); await p.waitForTimeout(150);
  eq(await p.evaluate(() => [S.challenges.nospend.marks['2026-10-01'], nsNow(S, S.today).marked]), [true, 2], 'the person decides: marked anyway, 2 days');
  eq(await p.evaluate(() => nsSpent(S, S.today, CUR).some(x => /Aluguel|Alquiler/.test(x.name))), false, 'the fixed costs (the plan’s bills) are not counted as purchases');
  // the morning question, in the bell and the server's words
  const tomorrow = await p.evaluate(() => { const r = challengeReminders(S, addDays(S.today, 2)).find(x => x.kind === 'nsmark'); return r && [r.date, r.marked, r.length]; });
  eq(tomorrow, ['2026-10-03', 2, 7], 'two days later, the bell asks about the day before');
  const doc2 = await p.evaluate(() => { const d = JSON.parse(JSON.stringify(S)); d.user.notify = { challenges: true }; return d; });
  const m2 = logic.messageFor(JSON.parse(JSON.stringify(doc2)), '2026-10-04', new Set());
  ok(m2 && m2.lines.some(l => l === 'Días sin gastar: si ayer no gastaste, márcalo (van 2 de 7 días).'), 'and the server asks in the same words', m2 && m2.lines);
  eq(await p.evaluate(() => { const r = challengeReminders(S, addDays(S.today, 6)).find(x => x.kind === 'ns'); return r && [r.marked, r.length]; }), [2, 7], 'when it ends: its reminder, 2 of 7');
  eq(await p.evaluate(() => { const keep = S.today; S.today = addDays(keep, 6); A.close(); render(); const s = document.querySelector('#ns-strip'), out = [!!s && !!s.querySelector('[data-a="ns-view"].btn')]; A['ns-view'](); const b = document.querySelector('.ns-view'); out.push(/Terminó: 2 de 7 días sin gastar\./.test(b.innerText), !!b.querySelector('[data-a="ns-close"]')); A['ns-close'](); out.push(S.challenges.nospend, S.challenges.ended.filter(x => x.kind === 'ns').map(x => x.marked), !!document.querySelector('#ns-strip')); S.today = keep; render(); return out; }),
    [true, true, true, null, [2], false], 'ended: “See how it went”, its count, “Close it”, kept among the ended ones, the strip goes');

  // ---------- 4. the company's side; an account from v227's first build ----------
  eq(await p.evaluate(() => { A.space({ v: 'business' }); navigate('goals'); const a = !!document.querySelector('#s52'); navigate('dashboard'); A['free-view'](); const b = !!document.querySelector('#ns-invite'); A.close(); A.space({ v: 'personal' }); return [a, b]; }), [false, false], 'the company’s side has neither');
  eq(await p.evaluate(() => { const st = { journey: { debts: [], pays: [], checks: { '2026-10-01': true, '2026-10-02': true }, sprint: null, sprints: [], save52: { id: 'x', goalId: 'g1', start: '2026-10-01', step: 100, reverse: false }, nospend: { id: 'n', start: '2026-10-01', length: 7 }, ended: [] } }; const moved = challengesAdopt(st); return [moved, st.challenges.save52.id, Object.keys(st.challenges.nospend.marks).sort(), 'save52' in st.journey, 'nospend' in st.journey]; }),
    [true, 'x', ['2026-10-01', '2026-10-02'], false, false], 'an account from v227’s first build: its challenges moved out of the Journey, its marks with them');
  eq(errors, [], 'no error in the console'); await browser.close();

  // ---------- 5. a phone, and a computer's Goals ----------
  ({ browser, page: p, errors } = await open({ lang: 'pt', account: 'example', plan: true, viewport: { width: 360, height: 780 }, touch: true, mobile: true }));
  const fit = sel => p.evaluate(sel => { const vw = innerWidth, root = document.querySelector(sel); const bad = [...root.querySelectorAll('button, select, .btn')].filter(b => b.offsetParent && !b.closest('.ns-days') && b.getBoundingClientRect().height < 44).map(b => b.dataset.a || b.innerText.trim()); return [document.documentElement.scrollWidth <= vw, [...root.querySelectorAll('*')].every(e => e.getBoundingClientRect().right <= vw + 1), bad]; }, sel);
  await p.evaluate(() => { S.user.greeted = true; navigate('goals'); }); await p.waitForTimeout(200);
  eq(await fit('#s52'), [true, true, []], 'pt, 360 px: the 52 weeks in Goals fit, every button 44 px');
  await p.evaluate(() => { A['s52-new'](); }); await p.waitForSelector('[data-a="s52-step"]');
  eq(await fit('.drawer'), [true, true, []], 'pt, 360 px: its form fits, every button 44 px');
  await p.evaluate(() => { UI.drawer.draft.accountId = goalSavings(null, BCUR())[0].id; A['s52-save'](); }); await p.waitForTimeout(200);
  eq(await fit('#s52'), [true, true, []], 'pt, 360 px: running, it fits');
  ok(await p.evaluate(() => /Desafio das 52 semanas/.test(document.querySelector('#s52').innerText)), 'pt: in Portuguese');
  await p.evaluate(() => { navigate('dashboard'); A['ns-new'](); A['ns-save'](); }); await p.waitForTimeout(250);
  eq(await fit('#ns-strip'), [true, true, []], 'pt, 360 px: the strip on the summary fits, every button 44 px');
  ok(await p.evaluate(() => { const f = document.querySelector('#free-card'), s = document.querySelector('#ns-strip'); return f.nextElementSibling === s; }), 'pt: right under “You can spend”');
  await p.evaluate(() => A['ns-view']()); await p.waitForSelector('.ns-view');
  eq(await fit('.drawer'), [true, true, []], 'pt, 360 px: its details fit');
  eq(errors, [], 'pt: no error in the console'); await browser.close();
  ({ browser, page: p, errors } = await open({ lang: 'es', account: 'example', plan: true, viewport: { width: 1440, height: 900 } }));
  await p.evaluate(() => { S.user.greeted = true; navigate('goals'); }); await p.waitForTimeout(200);
  ok(await p.evaluate(() => { const c = [...document.querySelectorAll('.dk-tile.ch-tile')]; return c.length === 1 && !!c[0].querySelector('[data-a="s52-new"]'); }), 'a computer’s Goals: the challenge is a card among the goals, with its start');
  await p.evaluate(() => { A['s52-new'](); UI.drawer.draft.accountId = goalSavings(null, BCUR())[0].id; A['s52-save'](); }); await p.waitForTimeout(250);
  ok(await p.evaluate(gid => { const c = document.querySelector('#s52.dk-tile'); return !!c && !!c.querySelector('[data-a="s52-put"]') && ![...document.querySelectorAll('.dk-tile:not(.ch-tile)')].some(x => /Desafío 52 semanas/.test(x.innerText)); }), 'running: its card, with “Put aside”; its goal is not a second card');
  await p.evaluate(() => { S.challenges.nospend = { id: 'n', start: S.today, length: 14, marks: {} }; navigate('dashboard'); }); await p.waitForTimeout(250);
  ok(await p.evaluate(() => !!document.querySelector('.bq-dh-r #ns-strip')), 'a computer’s summary: the strip under “You can spend”, in the block');
  eq(errors, [], 'computer: no error in the console'); await browser.close();
  done('qc-challenges');
})().catch(e => { console.error('qc-challenges: Error', e); process.exit(1); });
