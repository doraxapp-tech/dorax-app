// QC of the insight of the day and of "What if…?" (2026-10-07): the eight kinds of rule of core/insights.js and the sums of core/whatif.js,
// worked out here by hand; then the dashboard's card and the panel, in three languages and on a phone. The first two parts need no browser.
const { open, ok, eq, done } = require('./pw.js');
const { load } = require('./load.js');
const T = '2026-10-07';

// ---------- 1. the insights, by hand ----------
(() => {
  const E = load(), s = E.buildNewState('a@b', 'en', T), kinds = () => E.insights(s, T, 'BRL').map(x => x.kind), one = k => E.insights(s, T, 'BRL').find(x => x.kind === k);
  eq([E.insights(s, T, 'BRL'), E.insightOfDay(s, T, 'BRL', 0)], [[], { insight: null, index: 0, count: 0 }], 'a blank account has no insight: nothing is made up');
  s.user.spend = 300000;
  const g = { id: 'g1', name: 'Trip', kind: 'goal', target: 600000, deadline: null, accountId: null, status: 'active', note: '', plan: { 2026: [0, 0, 0, 0, 0, 0, 0, 0, 0, 40000, 40000, 40000] } };
  s.goals.push(g); s.goalMoves.push({ id: 'm1', goalId: 'g1', date: T, amount: 120000, start: true });
  eq(kinds(), ['goal', 'mark', 'day'], 'an estimate and a goal with 1.200 in it: the goal, the next mark and the cost of a day');
  eq(one('goal'), { kind: 'goal', id: 'g1', name: 'Trip', remaining: 480000, ym: '2027-09', months: 12, lever: { extra: 5000, sooner: 1 } }, 'goal: 4.800 to go, September 2027 at 400 a month, and 50 more saves a month');
  eq([one('mark'), one('day')], [{ kind: 'mark', days: 12, mark: 30, missing: 180000 }, { kind: 'day', amount: 10000, days: 12 }], 'mark: 1.200 at 3.000 a month is 12 days, 1.800 short of 30; a day costs 100');
  // real months: spending by this day, and the category that moved
  const [c1, c2, c3] = s.categories.filter(c => !c.income).map(c => c.id);
  s.accounts.push({ id: 'a1', name: 'Main', institution: 'Nubank', type: 'checking', currency: 'BRL', scope: 'personal', purpose: '', opening: 1000000 });
  const tx = (id, date, amount, cat) => ({ id, accountId: 'a1', date, amount, type: amount < 0 ? 'expense' : 'income', status: 'confirmed', categoryId: cat || null, subcategoryId: null, merchant: 'x', description: 'x' });
  s.transactions.push(tx('t1', '2026-09-03', -50000, c1), tx('t2', '2026-09-05', -30000, c2), tx('t3', '2026-09-20', -100000, c1), tx('t4', '2026-09-05', 500000), tx('t5', '2026-10-02', -40000, c1), tx('t6', '2026-10-06', -70000, c2));
  eq(one('pace'), { kind: 'pace', spent: 110000, diff: 30000, month: '2026-09' }, 'pace: 1.100 by the 7th against 800 by the 7th of September (the 1.000 of the 20th is not counted)');
  eq(one('mover'), { kind: 'mover', id: c2, diff: 40000, pct: 133, month: '2026-09' }, 'mover: the category that went from 300 to 700 (400 and 133%), not the one that fell by 100');
  eq(one('mark'), { kind: 'mark', days: 12, mark: 30, missing: 180000 }, 'mark: the checking account’s 12.100 is the month’s money and is not counted (owner, 2026-10-09: “counted from the savings”): still the goals’ 1.200, 12 days');
  s.accounts.push({ id: 'a-res', name: 'Reserve', institution: 'Nubank', type: 'savings', currency: 'BRL', scope: 'personal', purpose: '', opening: 1210000 });
  eq(one('mark'), { kind: 'mark', days: 121, mark: 180, missing: 590000 }, 'mark: 12.100 in a savings account, 121 days at 3.000 a month, 5.900 short of 6 months');
  eq(kinds(), ['pace', 'mover', 'goal', 'mark', 'day'], 'no rate yet: money came in last month but none went to goals');
  eq(E.insights(s, '2026-10-02', 'BRL').some(x => x.kind === 'pace' || x.kind === 'mover'), false, 'the first two days of a month are too few to compare');
  // putting aside: the run of months, and the share of what came in
  s.goalMoves.push({ id: 'm2', goalId: 'g1', date: '2026-09-10', amount: 50000 }, { id: 'm3', goalId: 'g1', date: '2026-08-12', amount: 50000 });
  eq([one('streak'), one('rate')], [{ kind: 'streak', n: 2, open: true, month: '2026-10' }, { kind: 'rate', per100: 10, aside: 50000, income: 500000, month: '2026-09' }], 'streak: August and September, October still open; rate: 500 of the 5.000 that came in is 10 in every 100');
  eq(one('goal'), { kind: 'goal', id: 'g1', name: 'Trip', remaining: 380000, ym: '2027-07', months: 10, lever: { extra: 5000, sooner: 1 } }, 'goal: with 1.000 more in it, July 2027');
  s.goalMoves.push({ id: 'm4', goalId: 'g1', date: '2026-10-05', amount: 20000 });
  eq(one('streak'), { kind: 'streak', n: 3, open: false, month: '2026-10' }, 'streak: October counts once something was put aside in it');
  s.goalMoves.push({ id: 'm5', goalId: 'g1', date: '2026-08-20', amount: -60000 });
  eq(one('streak'), { kind: 'streak', n: 2, open: false, month: '2026-10' }, 'streak: a month where more was taken out than put in ends the run');
  // bills of the coming week
  const line = (id, name, due, v) => ({ id, categoryId: c3,      // a category with no spending this month: a payment in its category is what marks a bill as paid
     subcategoryId: null, name, pay: 'fixed', accountId: 'a1', end: null, note: '', due, plan: { 2026: Array(12).fill(v) } });
  s.plan.lines.push(line('l1', 'Rent', 10, 150000), line('l2', 'Gym', 3, 20000), line('l3', 'Net', 20, 9000));
  eq(one('bills'), { kind: 'bills', n: 1, total: 150000, first: { id: 'l1', name: 'Rent', date: '2026-10-10', days: 3 } }, 'bills: the one due on the 10th; the one that was due on the 3rd is the To do list’s to say, the one of the 20th is too far');
  eq(kinds(), ['pace', 'mover', 'bills', 'goal', 'mark', 'day', 'streak', 'rate'], 'all eight kinds, in their fixed order');
  eq(E.INSIGHT_KINDS, ['pace', 'mover', 'bills', 'goal', 'mark', 'day', 'streak', 'rate'], 'eight kinds of rule');
  // the day picks one; "Another" moves on and comes round
  const p0 = E.insightOfDay(s, T, 'BRL', 0), p1 = E.insightOfDay(s, T, 'BRL', 1), p8 = E.insightOfDay(s, T, 'BRL', 8), next = E.insightOfDay(s, '2026-10-08', 'BRL', 0);
  eq([p0.count, p0.index, p1.index, p8.index, p0.insight.kind], [8, 7, 0, 7, 'rate'], 'the day picks its place in the list (279 days after 1 January: place 7 of 0 to 7); "Another" moves on and comes round');
  ok(next.insight.kind !== p0.insight.kind, 'tomorrow’s insight is another one', [p0.insight.kind, next.insight.kind]);
  eq(E.insightOfDay(s, T, 'BRL', -3).index, 4, 'a step back is as safe as a step on');
})();

// ---------- 2. "what if…?", by hand ----------
(() => {
  const E = load(), s = E.buildNewState('a@b', 'en', T), w = (ch, id) => E.whatIf(s, T, 'BRL', id === undefined ? 'g1' : id, ch);
  s.user.spend = 300000;
  const g = { id: 'g1', name: 'Trip', kind: 'goal', target: 600000, deadline: null, accountId: null, status: 'active', note: '', plan: { 2026: [0, 0, 0, 0, 0, 0, 0, 0, 0, 40000, 40000, 40000] } };
  s.goals.push(g, { id: 'f1', name: 'Fund', kind: 'fund', target: null, deadline: null, accountId: null, status: 'active', note: '', plan: { 2026: Array(12).fill(0) } });
  s.goalMoves.push({ id: 'm1', goalId: 'g1', date: T, amount: 120000, start: true });
  const before = JSON.stringify(s);
  eq(w({}), { extra: 0, once: 0, aside: 40000, burn: 300000, burnTo: 300000, goal: { id: 'g1', name: 'Trip', target: 600000, remaining: 480000, from: '2027-09', to: '2027-09', reached: false, sooner: 0 }, year: { from: 60, to: 60 } },
    'no change: September 2027 both ways, and 60 days a year from now (1.200 + 12 × 400 = 6.000 at 3.000 a month)');
  let r = w({ less: 20000, more: 20000 });
  eq([r.extra, r.burnTo, r.goal.to, r.goal.sooner, r.year], [40000, 280000, '2027-03', 6, { from: 60, to: 115 }], '200 less out and 200 more in: 800 a month reaches it in March 2027, 6 months sooner; a year from now 10.800 at 2.800 a month is 115 days');
  r = w({ once: 100000 }); eq([r.goal.to, r.goal.sooner, r.year.to], ['2027-07', 2, 70], '1.000 put aside once: July 2027, 2 months sooner; 7.000 at 3.000 a month is 70 days');
  r = w({ once: 480000 }); eq([r.goal.to, r.goal.reached, r.goal.sooner, r.year.to], ['2026-10', true, 11, 108], 'the whole of what is missing, once: reached today');
  r = w({ less: 300000 }); eq([r.burnTo, r.year.to], [0, null], 'spending nothing leaves no pace to measure: no figure is invented');
  r = w({ less: -5, more: 'x', once: null }); eq([r.extra, r.once, r.goal.to], [0, 0, '2027-09'], 'a negative or unreadable change counts as nothing');
  eq([w({ more: 10000 }, 'f1').goal, w({ more: 10000 }, 'nope').goal, E.whatIfGoals(s, T).map(x => x.id)], [null, null, ['g1']], 'only an active goal with a target that is not reached can have its date moved');
  eq(JSON.stringify(s) === before, true, 'trying changes on changes nothing in the account');
  // a goal with nothing planned ahead gets a date from the change
  const keep = g.plan; g.plan = { 2026: Array(12).fill(0) };
  r = w({ more: 50000 }); eq([w({}).goal.from, r.goal.from, r.goal.to, r.goal.sooner], [null, null, '2027-07', null], 'nothing planned: no date; with 500 a month it is July 2027 (4.800 at 500: ten months from October)');
  g.plan = keep;
  delete s.user.spend; eq([w({ more: 10000 }).year, w({ more: 10000 }).goal.to], [null, '2027-07'], 'nothing says what goes out: no days of freedom to show, the goal still answers (4.800 at 500 a month: ten months, July 2027)');
  // keeping the change
  const a = JSON.parse(JSON.stringify(g)); eq([E.raiseGoalPlan(a, '2026-10', 10000), a.plan[2026].slice(8)], ['2026-12', [0, 50000, 50000, 50000]], 'raising a plan: every planned month from this one to the last, and it says which was the last');
  const b = { plan: {} }; eq([E.raiseGoalPlan(b, '2026-10', 10000), b.plan[2026][9], E.sum(b.plan[2026])], [null, 10000, 10000], 'raising an empty plan: this month alone, the year made as needed');
})();

// ---------- 3. on screen ----------
(async () => {
  const text = async (p, sel) => (await p.locator(sel).innerText()).replace(/\s+/g, ' ');
  const wide = p => p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  const signup = async (p, name) => { await p.evaluate(() => A['pub-go']({ v: 'signup' })); await p.fill('#au-name', name); await p.fill('#au-email', name.toLowerCase() + '@example.org'); await p.fill('#au-pass', 'UmaSenha2026'); await p.check('#au-accept'); await p.click('[data-a="auth-signup"]'); await p.waitForSelector('#ob-name'); await p.click('[data-a="onboard-save"]'); await p.click('[data-a="ob-finish"]'); await p.waitForFunction(() => !!UI.session); };

  // a new account
  let { browser, page, errors } = await open({ lang: 'en', today: T, server: { confirmEmail: false } });
  await signup(page, 'Bo');
  let card = await text(page, '#insight-card');
  eq(await page.evaluate(() => { const ids = [...document.querySelectorAll('#view > *')].map(e => e.id), r = document.querySelector('#runway-card'), i = document.querySelector('#insight-card'); return [i.dataset.kind, r.parentElement === i.parentElement && r.getBoundingClientRect().right < i.getBoundingClientRect().left, ids.indexOf('co-ask') >= 0 && ids.indexOf('co-ask') < [...document.querySelectorAll('#view > *')].indexOf(i.parentElement), document.querySelectorAll('#insight-next').length, document.querySelector('#insight-card a.btn').getAttribute('href')]; }),
    ['start', true, true, 0, '#plan'], 'new account: the card is there, beside the days of freedom (owner, 2026-10-08), the question about a company above them, and it says where insights come from; nothing to step through');
  ok(/Insight of the day/.test(card) && /Your insights start with your first numbers/.test(card) && /arithmetic on what you recorded and planned, not advice/.test(await page.locator('#insight-card .hint').getAttribute('data-tip')), 'new account: the title, the line, and an (i) that says it is arithmetic, not advice', card);
  // "What if…?" with nothing to go by
  await page.click('#runway-card [data-a="whatif"]'); await page.waitForSelector('#wi-out');
  let panel = await text(page, '.drawer');
  ok(/What if…\?/.test(panel) && /No goal with a target yet/.test(panel) && /Tell Dorax what goes out each month/.test(panel) && await page.locator('[data-a="whatif-apply"]').count() === 0 && await page.locator('#wi-goal').count() === 0, 'what if, blank account: it says what is missing for each answer and offers nothing to keep', panel);
  eq(await page.evaluate(() => [document.activeElement.id, document.querySelectorAll('.drawer input[type=range]').length]), ['wi-less-r', 3], 'what if: three sliders, the first one in focus');
  await page.evaluate(() => A.close());
  // the same account with a month behind it: every kind, each with the engine's own figures
  await page.evaluate(() => {
    const [c1, c2, c3] = S.categories.filter(c => !c.income).map(c => c.id);
    S.user.spend = 300000;
    S.accounts.push({ id: 'a1', name: 'Main', institution: 'Nubank', type: 'checking', currency: 'BRL', scope: 'personal', purpose: '', opening: 1000000 });
    S.accounts.push({ id: 'a-res', name: 'Reserve', institution: 'Nubank', type: 'savings', currency: 'BRL', scope: 'personal', purpose: '', opening: 1210000 });      // what is put aside: only savings count
    const tx = (id, date, amount, cat) => ({ id, accountId: 'a1', date, amount, type: amount < 0 ? 'expense' : 'income', status: 'confirmed', categoryId: cat || null, subcategoryId: null, merchant: 'x', description: 'x' });
    S.transactions.push(tx('t1', '2026-09-03', -50000, c1), tx('t2', '2026-09-05', -30000, c2), tx('t3', '2026-09-20', -100000, c1), tx('t4', '2026-09-05', 500000), tx('t5', '2026-10-02', -40000, c1), tx('t6', '2026-10-06', -70000, c2));
    S.goals.push({ id: 'g1', name: '<i>Trip</i>', kind: 'goal', target: 600000, deadline: null, accountId: null, status: 'active', note: '', plan: { 2026: [0, 0, 0, 0, 0, 0, 0, 0, 0, 40000, 40000, 40000] } });
    S.goalMoves.push({ id: 'm1', goalId: 'g1', date: S.today, amount: 120000, start: true }, { id: 'm2', goalId: 'g1', date: '2026-09-10', amount: 50000 }, { id: 'm3', goalId: 'g1', date: '2026-08-12', amount: 50000 });
    S.plan.lines.push({ id: 'l1', categoryId: c3, subcategoryId: null, name: '<b>Rent</b>', pay: 'fixed', accountId: 'a1', end: null, note: '', due: 10, plan: { 2026: Array(12).fill(150000) } });
    S.categories.find(c => c.id === c2).name = 'Food & <u>fun</u>'; UI.insightSkip = 0; render();
  });
  const show = k => page.evaluate(k => { const l = insights(S, S.today, CUR), i = l.findIndex(x => x.kind === k), p = insightOfDay(S, S.today, CUR, 0); UI.insightSkip = ((i - p.index) % l.length + l.length) % l.length; render(); const c = document.querySelector('#insight-card'); return [c.dataset.kind, c.querySelector('.grow b').innerText.replace(/\s+/g, ' '), c.querySelector('.grow small').innerText.replace(/\s+/g, ' '), c.querySelectorAll('.card-b > .btn, .card-b > a.btn, .ins-foot > .btn').length, c.querySelectorAll('.grow i, .grow u, .grow b b').length]; }, k);
  eq(await page.evaluate(() => insights(S, S.today, CUR).map(x => x.kind)), ['pace', 'mover', 'bills', 'goal', 'mark', 'day', 'streak', 'rate'], 'the account now has something true to say of every kind');
  eq(await show('pace'), ['pace', 'You have spent R$ 300 more than by this day in September.', 'R$ 1.100 so far this month. Seeing it now is what gives you room.', 1, 0], 'pace: more than last month by this day, said without blame');
  eq(await show('mover'), ['mover', 'Food & <u>fun</u>: R$ 400 more than by this day in September.', 'That is 133% more. Worth a look, no drama.', 1, 0], 'mover: the category by name, shown as text and never as markup');
  await page.click('#insight-card [data-a="filter-cat"]'); eq(await page.evaluate(() => [UI.route, UI.tx.category === S.categories.filter(c => !c.income)[1].id]), ['transactions', true], 'mover: its button opens that category’s transactions'); await page.evaluate(() => navigate('dashboard'));
  eq(await show('bills'), ['bills', '1 bill due in the next 7 days: R$ 1.500.', 'First up: <b>Rent</b>, on ' + await page.evaluate(() => fmt.date('2026-10-10')) + '.', 1, 0], 'bills: how many, how much, and the first one by name and day');
  eq(await show('goal'), ['goal', 'R$ 3.800 to go for <i>Trip</i>. At this pace: July 2027.', 'With R$ 50 more a month, you get there 1 month sooner.', 1, 0], 'goal: what is missing, the date, and the step that brings it closer');
  eq(await show('mark'), ['mark', 'R$ 5.900 more put aside and you reach 6 months of freedom.', 'Today you have 4 months.', 1, 0], 'mark: what is missing to the next mark, and where the person stands (121 days: 4 months)');
  eq(await show('day'), ['day', 'One day of freedom costs R$ 100.', 'That is what goes out in a day at your pace. Every R$ 100 you put aside buys one more.', 1, 0], 'day: what a day costs at the pace money goes out');
  eq(await show('streak'), ['streak', '2 months in a row putting money aside.', 'Put something aside in October and it is 3.', 1, 0], 'streak: the run, and what keeps it going');
  eq(await show('rate'), ['rate', 'Of every R$ 100 that came in in September, R$ 10 went to your goals.', 'R$ 500 put aside of R$ 5.000 that came in.', 1, 0], 'rate: of every 100 that came in');
  // "Another" walks the whole list and comes back; the button keeps the focus
  await page.evaluate(() => { UI.insightSkip = 0; render(); });
  const seen = [await page.evaluate(() => document.querySelector('#insight-card').dataset.kind)];
  for (let i = 0; i < 8; i++) { await page.click('#insight-next'); seen.push(await page.evaluate(() => document.querySelector('#insight-card').dataset.kind)); }
  eq([new Set(seen.slice(0, 8)).size, seen[8] === seen[0], await page.evaluate(() => document.activeElement.id)], [8, true, 'insight-next'], '"Another" shows the eight in turn and comes back to today’s; the button keeps the focus', seen);
  ok(!/\p{Extended_Pictographic}|NaN|undefined|null/u.test(await text(page, '#insight-card')) && await page.locator('#insight-card .fl-ico svg').count() === 1, 'the card has one of the app’s own icons, no emoji and no broken value');
  // a month that has passed, and the company's side, show none
  await page.evaluate(() => { S.month = '2026-09'; render(); }); eq(await page.locator('#insight-card').count(), 0, 'a past month shows no insight of today');
  await page.evaluate(() => { S.month = '2026-10'; A.space({ v: 'business' }); }); eq(await page.locator('#insight-card, #runway-card [data-a="whatif"]').count(), 0, 'the company’s side has no insight and no "What if…?" yet');
  await page.evaluate(() => A.space({ v: 'personal' }));

  // ----- "What if…?" with the same account -----
  await show('goal'); await page.click('#insight-card [data-a="whatif"]'); await page.waitForSelector('#wi-out');
  eq(await page.evaluate(() => [UI.drawer.kind, UI.drawer.draft.goalId, document.querySelectorAll('#wi-goal').length, document.querySelector('.drawer .wi-block h3').innerHTML]), ['whatif', 'g1', 0, '&lt;i&gt;Trip&lt;/i&gt;'], 'what if, from the goal’s insight: that goal, by name and as text; one goal needs no list to choose from');
  const rows = () => page.evaluate(() => [...document.querySelectorAll('#wi-out .wi-row')].map(r => [r.querySelector('b').innerText.trim(), r.classList.contains('to'), (r.querySelector('.chip') || { innerText: '' }).innerText.trim()]));
  eq(await rows(), [['July 2027', false, ''], ['July 2027', false, ''], ['5 and a half months', false, ''], ['5 and a half months', false, '']], 'what if, nothing moved: the two lines say the same (12.100 + 12 × 400 = 16.900 at 3.000 a month: 169 days, 5 and a half months)');
  const goalsBefore = await page.evaluate(() => JSON.stringify([S.goals, S.goalMoves, S.user]));
  await page.evaluate(() => { document.querySelector('#wi-more').mark = 1; });
  await page.fill('#wi-less', '200'); await page.fill('#wi-more', '200');
  eq(await rows(), [['July 2027', false, ''], ['February 2027', true, '5 months sooner'], ['5 and a half months', false, ''], ['7 and a half months', true, '']], 'what if, 200 less out and 200 more in: 800 a month reaches it in February 2027; a year from now 21.700 at 2.800 a month is 232 days, 7 and a half months');
  eq(await page.evaluate(() => [document.querySelector('#wi-more').mark, document.querySelector('#wi-less-r').value, document.querySelector('#wi-more-r').getAttribute('aria-valuetext'), document.querySelector('[data-a="whatif-apply"]').innerText.trim()]), [1, '200', 'R$ 200', 'Add R$ 400 a month to this goal’s plan'], 'what if: the panel is not redrawn under the fingers, each slider follows its field, and the button says exactly what it keeps');
  await page.evaluate(() => { const r = document.querySelector('#wi-once-r'); r.value = 1000; r.dispatchEvent(new Event('input', { bubbles: true })); });
  eq([await page.inputValue('#wi-once'), (await rows())[1], /not added to the plan/.test(await text(page, '#wi-out'))], ['1.000', ['January 2027', true, '6 months sooner'], true], 'what if: the slider writes its field; 1.000 once brings it to January 2027, and the panel says that amount is not kept');
  await page.fill('#wi-once', 'abc'); ok(!/NaN|undefined|null/.test(await text(page, '.drawer')) && (await rows())[1][0] === 'February 2027', 'what if: an amount that cannot be read counts as nothing');
  eq(await page.evaluate(() => JSON.stringify([S.goals, S.goalMoves, S.user])) === goalsBefore, true, 'what if: moving the sliders saves nothing');
  await page.click('[data-a="whatif-apply"]');
  eq(await page.evaluate(() => [!!UI.drawer, S.goals[0].plan[2026].slice(8), goalArrival(S, S.goals[0], S.today).ym, S.goalMoves.length, document.querySelector('#toast').innerText.trim()]), [false, [0, 80000, 80000, 80000], '2027-02', 3, 'Done. <i>Trip</i> now plans R$ 400 more a month.'],
    'keeping it: the plan rises by 400 from this month on, the goal’s date is the one the panel showed, and the amount put aside once is written nowhere');
  // from a goal's card, and with more than one goal
  await page.evaluate(() => { S.goals.push({ id: 'g2', name: 'Car', kind: 'goal', target: 5000000, deadline: null, accountId: null, status: 'active', note: '', plan: { 2026: Array(12).fill(0) } }); navigate('goals'); });
  eq(await page.locator('.card.goal [data-a="whatif"]').count(), 0, 'goals: the cards keep only Contribute and Details (owner, 2026-10-08); “What if…?” is in the details');
  await page.click('.card.goal [data-a="goal-open"]'); await page.click('.drawer [data-a="whatif"]'); await page.waitForSelector('#wi-out');
  eq(await page.evaluate(() => [UI.drawer.draft.goalId, [...document.querySelectorAll('#wi-goal option')].map(o => o.textContent), document.querySelector('#wi-goal').value]), ['g1', ['<i>Trip</i>', 'Car'], 'g1'], 'what if, from a goal’s details: that goal, with the other one to choose');
  await page.selectOption('#wi-goal', 'g2'); await page.fill('#wi-more', '1.000');
  eq([(await rows()).slice(0, 2), await page.evaluate(() => document.querySelector('.drawer .wi-block h3').innerText)], [[['No date yet', false, ''], ['November 2030', true, 'Now it has a date']], 'Car'], 'what if, a goal with nothing planned: 1.000 a month gives it a date (50.000: the fiftieth month from October 2026)');
  await page.click('[data-a="whatif-apply"]');
  eq(await page.evaluate(() => [S.goals[1].plan[2026].slice(8), goalArrival(S, S.goals[1], S.today).ym]), [[0, 100000, 100000, 100000], '2030-11'], 'keeping it on a goal with nothing planned: 1.000 a month from now to the end of the year, and the date holds from there');
  eq(errors, [], 'insight and what if: no error in the console');
  await browser.close();

  // ---------- 4. Spanish and Portuguese, on a phone ----------
  for (const [lang, width, want] of [['es', 390, [/Datos del día/, null, /¿Qué pasa si…\?/, /Al ritmo de hoy/, /Con este cambio/]], ['pt', 320, [/Destaques do dia/, null, /E se…\?/, /No ritmo de hoje/, /Com esta mudança/]]]) {
    ({ browser, page, errors } = await open({ lang, account: 'example', viewport: { width, height: 700 }, touch: true, mobile: true }));
    // (owner, 2026-10-08: "show the insights of the day whole but shorten the message, auto slide infinitely to the left; no What if button, a tap
    // on a card opens it; and not every card with the same action")
    eq(await page.evaluate(() => { const c = document.querySelector('#insight-card'), row = c.querySelector('.ins-row'), cs = [...row.querySelectorAll('.ins-c')];
        return [c.classList.contains('ins-strip'), cs.length === insights(S, S.today, CUR).length, getComputedStyle(row).scrollSnapType, getComputedStyle(cs[1]).scrollSnapAlign, !c.querySelector('[aria-hidden="true"] .ins-c'), cs[0].dataset.k === insightOfDay(S, S.today, CUR, 0).insight.kind,
          cs.every(b => b.getBoundingClientRect().height >= 44 && b.querySelector('.ins-say').scrollHeight <= b.querySelector('.ins-say').clientHeight + 1 && b.querySelector('.ins-say').innerText.length <= 70), !c.querySelector('.btn, [data-a="whatif"], #insight-next'),
          cs.every(b => !b.querySelector('.ins-lbl, .ins-top, .ins-day, .ins-bars, .ins-go') && b.innerText.trim() === b.querySelector('.ins-say').innerText.trim() && b.querySelector('.ins-ar').getBoundingClientRect().left > b.querySelector('.ins-say').getBoundingClientRect().left + 20 && !!b.querySelector('.ins-say > .ins-ar') && getComputedStyle(b).textAlign === 'center' && getComputedStyle(b).justifyContent === 'center'
            && getComputedStyle(b.querySelector('.ins-ar')).color === 'rgb(62, 207, 142)' && [...b.querySelectorAll('.ins-m')].every(m => /R\$/.test(m.innerText) && getComputedStyle(m).color === 'rgb(62, 207, 142)') && !/R\$/.test([...b.querySelector('.ins-say').childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join(''))),
          ((st) => [st.backgroundColor, st.backgroundImage, st.borderTopWidth, st.boxShadow, parseFloat(getComputedStyle(cs[0].querySelector('.ins-say')).fontSize) <= 15, getComputedStyle(cs[0]).color].join('|'))(getComputedStyle(cs[0])), !c.querySelector('h2:not(.sr), h3'), c.querySelectorAll('.ins-pg i').length === cs.length && c.querySelectorAll('.ins-pg i.on').length === 1]; }),
      [true, true, 'x mandatory', 'start', true, true, true, true, true, 'rgba(0, 0, 0, 0)|none|0px|none|true|rgb(180, 180, 180)', true, true], `${lang}, ${width}px: on a phone every fact of the day is one quiet line (owner, 2026-10-08: "not as cards, don't name them, just the fact"), today’s first, each one short sentence read whole and centred, its amounts and its small arrow in green (owner, same night), and a dot among the day's; a row to swipe, each card stopping in its place, written once; no buttons, no "What if…?"; each glass in the panel's green: "Insight of the day", what it is about, the arrow, the fact, today's date and its bar among the day's (owner, 2026-10-08)`);
    card = await text(page, '#insight-card');
    ok(want[0].test(await page.evaluate(() => document.querySelector('#insight-card').getAttribute('aria-label'))) && !/NaN|undefined|null|\{[a-z]+\}/.test(card), `${lang}, ${width}px: the facts in the language (their name only for screen readers)`, card);
    eq(await wide(page), 0, `${lang}, ${width}px: the dashboard is not wider than the phone`);
    // a tap opens what each fact is about: they are not all "What if…?"
    const kinds = await page.evaluate(() => [...document.querySelectorAll('.ins-row .ins-c')].map(c => c.dataset.k));
    const opens = {};
    for (const k of kinds) {
      await page.evaluate(() => { A.close(); navigate('dashboard'); }); await page.waitForTimeout(150);
      await page.evaluate(k => document.querySelector(`.ins-row .ins-c[data-k="${k}"]`).click(), k); await page.waitForTimeout(150);
      opens[k] = await page.evaluate(() => UI.drawer ? 'panel:' + UI.drawer.kind : UI.route + (UI.route === 'transactions' ? ':' + (UI.tx.category ? 'cat' : 'month') : UI.route === 'reports' ? ':' + UI.repView : ''));
    }
    const want2 = { pace: 'transactions:month', mover: 'transactions:cat', bills: 'plan', goal: 'panel:goal-view', mark: 'panel:whatif', day: 'panel:runway-view', streak: 'goals', rate: 'reports:in' };
    eq(kinds.map(k => opens[k]), kinds.map(k => want2[k]), `${lang}, ${width}px: each fact opens its own place (${kinds.join(', ')}); only the mark of freedom opens "What if…?"`);
    await page.evaluate(() => { A.close(); UI.repView = 'out'; navigate('dashboard'); }); await page.waitForTimeout(200);
    await page.click('#runway-open'); await page.click('.drawer footer [data-a="whatif"]'); await page.waitForSelector('#wi-out');      // on a phone, What if…? is in the details of the days of freedom
    await page.fill('#wi-more', '300'); panel = await text(page, '.drawer');
    ok(want[2].test(panel) && want[3].test(panel) && want[4].test(panel) && !/NaN|undefined|null|\{[a-z]+\}/.test(panel), `${lang}, ${width}px: "What if…?" in the language`, panel.slice(0, 400));
    eq(await page.evaluate(() => { const d = document.querySelector('.drawer'); return [d.scrollWidth <= d.clientWidth, Math.min(...[...d.querySelectorAll('input[type=range]')].map(e => e.getBoundingClientRect().height)) >= 44, [...d.querySelectorAll('footer .btn')].every(b => b.getBoundingClientRect().height >= 44)]; }), [true, true, true], `${lang}, ${width}px: the panel fits, its sliders and buttons are a thumb high`);
    // shorter (owner, 2026-10-10: "the What if menu is very long, shorten it"): today and the change side by side, no bars, no Close at the bottom;
    // on a 390 × 844 phone it is read whole without scrolling, the button to keep included
    if (width === 390) eq(await page.evaluate(() => { const b = document.querySelector('.drawer .body'), c = [...document.querySelectorAll('#wi-out .wi-cmp')].map(x => [...x.children].map(r => Math.round(r.getBoundingClientRect().top))); return [c.length, c.every(r => r.length < 2 || r[0] === r[1]), document.querySelectorAll('#wi-out .rw-track').length, document.querySelectorAll('.drawer footer [data-a="close"]').length, !!document.querySelector('[data-a="whatif-apply"]'), document.querySelector('.drawer header').offsetHeight + b.scrollHeight + document.querySelector('.drawer footer').offsetHeight + 22 <= 844 - 20]; }),
      [2, true, 0, 0, true, true], `${lang}, ${width}px: "What if…?" is short: today against the change on one line, whole on a 844 px high phone without scrolling`);
    eq(errors, [], `${lang}, ${width}px: no error in the console`);
    await browser.close();
  }
  // ---------- 5. (owner, 2026-10-08: "it is very green, I want it to tend to black, and remove the auto slide") ----------
  ({ browser, page, errors } = await open({ lang: 'es', account: 'example', plan: true, motion: true, viewport: { width: 390, height: 844 }, touch: true, mobile: true }));
  await page.evaluate(() => document.querySelector('#insight-card').scrollIntoView({ block: 'center' })); await page.waitForTimeout(1600);
  eq(await page.evaluate(() => document.querySelector('.ins-row').scrollLeft), 0, 'the row stays where it is: it does not slide by itself');
  await page.evaluate(() => { const row = document.querySelector('.ins-row'); row.scrollLeft = row.firstElementChild.offsetWidth + 32; }); await page.waitForTimeout(300);
  eq(await page.evaluate(() => [...document.querySelectorAll('.ins-pg i')].findIndex(i => i.classList.contains('on'))), 1, 'swiped to the next fact, its dot lights');
  eq(errors, [], 'the row: no error in the console'); await browser.close();
  done('qc-insights');
})();
