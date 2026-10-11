// QC of what speaks to the person without being asked (owner, 2026-10-07): curiosities shown as a notice inside the app with a rhythm the
// person chooses, the colour that insights and curiosities share, milestones, the moment the side changes, and room between the letters.
// Also the company's side of the things that were pending: its insight, its "What if…?", its reports, its accounts.
//   1. the rhythm of curiosities (core/curios.js), by hand;
//   2. a curiosity on screen: what it says, its source, its colour, another, fewer, the setting; the company's own facts;
//   3. milestones: a mark of days of freedom passed, a goal reached, each cheered once;
//   4. the company's insight, "What if…?", reports and accounts;
//   5. changing sides with motion; the letters.
const { open, ok, eq, done } = require('./pw.js');
const { load } = require('./load.js');
const T = '2026-10-02', MIN = 60000;

// ---------- 1. the rhythm ----------
(() => {
  const E = load(), s = E.buildNewState('a@b', 'en', T), t0 = 1000000000000;
  eq([E.curioRate(s), E.curioDue(s, T, t0), E.curioNext(s, false), E.CURIOS.length, E.CURIOS.filter(c => c[1] === 'company').map(c => c[0])], ['normal', true, 'fgc', 8, ['mei', 'das']], 'a new account: one a day, the first one due, eight facts of which two are the company’s');
  E.curioShown(s, 'fgc', T, t0);
  eq([E.curioDue(s, T, t0 + 600 * MIN), E.curioDue(s, '2026-10-03', t0), E.curioNext(s, false), E.curioNext(s, false, 'card')], [false, true, 'card', 'savings'], 'normal: none again the same day, one the next; the next fact is the first not shown yet, and never the one on screen');
  s.user.curio.rate = 'more';
  eq([E.curioDue(s, T, t0 + 10 * MIN), E.curioDue(s, T, t0 + 31 * MIN)], [false, true], 'more: at least half an hour apart');
  E.curioShown(s, 'card', T, t0 + 31 * MIN); E.curioShown(s, 'savings', T, t0 + 70 * MIN);
  eq([E.curioDue(s, T, t0 + 300 * MIN), E.curioDue(s, '2026-10-03', t0 + 300 * MIN)], [false, true], 'more: three a day at most');
  s.user.curio.rate = 'less';
  eq([E.curioDue(s, '2026-10-08', t0), E.curioDue(s, '2026-10-09', t0)], [false, true], 'fewer: one a week (the last was on the 2nd: the 8th is too soon, the 9th is not)');
  s.user.curio.rate = 'off'; eq(E.curioDue(s, '2027-01-01', t0), false, 'off: none');
  eq([E.curioStep(s, -1), E.curioStep(s, 1), E.curioStep(s, 1), E.curioStep(s, -1), E.curioStep(s, -1), E.curioStep(s, -1), E.curioStep(s, -1)], ['less', 'off', 'off', 'less', 'normal', 'more', 'more'], 'a step fewer or a step more, never past the ends');
  ['overdraft', 'thirteenth', 'forgotten'].forEach((id, i) => E.curioShown(s, id, '2026-10-0' + (3 + i), t0));
  eq([E.curioNext(s, false), E.curioNext(s, true)], ['fgc', 'mei'], 'once every fact was shown, the one shown longest ago comes back; the company’s side still has its own two to show');
  for (let i = 0; i < 60; i++) E.curioShown(s, 'fgc', T, t0); eq(s.user.curio.log.length, 40, 'the log keeps the last forty');
  s.user.curio.rate = 'whatever'; eq(E.curioRate(s), 'normal', 'an unknown choice counts as normal');
})();

(async () => {
  const text = async (p, sel) => (await p.locator(sel).innerText()).replace(/\s+/g, ' ');
  const signup = async (p, name) => { await p.evaluate(() => A['pub-go']({ v: 'signup' })); await p.fill('#au-name', name); await p.fill('#au-email', name.toLowerCase() + '@example.org'); await p.fill('#au-pass', 'UmaSenha2026'); await p.check('#au-accept'); await p.click('[data-a="auth-signup"]'); await p.waitForSelector('#ob-name'); await p.click('[data-a="onboard-save"]'); await p.click('[data-a="ob-finish"]'); await p.waitForFunction(() => !!UI.session); };
  const GREEN = 'rgb(93, 187, 139)', DEEP = 'rgb(0, 98, 57)';      // the brand's accent and its deep green (owner, 2026-10-07: "pink? use the brand's branding")

  // ---------- 2. a curiosity on screen ----------
  let { browser, page, errors } = await open({ lang: 'en', viewport: { width: 1280, height: 900 }, curio: true, server: { confirmEmail: false } });
  await signup(page, 'Ana');
  // first steps: first on the dashboard while one is missing, and a moment of their own when the last is done (owner, 2026-10-07: "the first thing on
  // the dashboard of someone who has not finished all the steps must be that; and create an animation when they finish")
  eq(await page.evaluate(() => { const ids = [...document.querySelectorAll('#view > *')].map(e => e.id || e.className), c = document.querySelector('#first-steps'); return [S.isNew, ids[0], ids[1], c.querySelectorAll('.steps-meter i').length, c.querySelectorAll('.steps-meter i.on').length === firstStepList().filter(s => s[0]).length, c.classList.contains('all')]; }),
    [true, 'hello tools', 'first-steps', 6, true, false], 'a new account: the first steps come before everything but the greeting (its line has “Reorder the dashboard”), with a meter of the six');
  await page.evaluate(() => { const real = firstStepList; window.__steps = real; firstStepList = () => real().map(s => [true, s[1], s[2], s[3]]); stepsMaybe(); });
  eq(await page.evaluate(() => { const c = document.querySelector('#first-steps'); return [S.isNew, !!UI.stepsDone, c.classList.contains('all'), c.classList.contains('cheer'), !!c.querySelector('.steps-ring circle') && !!c.querySelector('.steps-ring path'), /All set\. From here on it is just living your month\./.test(c.innerText), c.querySelectorAll('.step.ok').length, c.querySelector('[data-a="steps-hide"]').innerText.trim()]; }),
    [false, true, true, true, true, true, 6, 'Close'], 'the moment the last step is done the account stops being new and the card celebrates: a ring with its tick, the six steps ticked (spending limits the last, v146), “All set”');
  await page.click('#first-steps [data-a="steps-hide"]'); eq(await page.evaluate(() => [document.querySelectorAll('#first-steps').length, UI.stepsDone, S.isNew]), [0, null, false], 'Close puts it away for good');
  await page.evaluate(() => { firstStepList = window.__steps; S.isNew = true; render(); });
  eq(await page.locator('#curio').count(), 0, 'nothing pops up the instant the dashboard opens');
  await page.waitForTimeout(3400); eq(await page.evaluate(() => [S.isNew, document.querySelectorAll('#curio').length]), [true, 0], 'and none at all while the first steps are still to be done: nothing is more important than those');
  await page.evaluate(() => { S.isNew = false; navigate('dashboard'); });
  await page.waitForSelector('#curio', { timeout: 6000 });
  let card = await text(page, '#curio');
  ok(/Did you know\?/.test(card) && /The FGC covers up to R\$ 250\.000 per person in each bank or financial group, and at most R\$ 1 million every four years\./.test(card) && /Source: FGC, Fundo Garantidor de Créditos/.test(card), 'a curiosity: what it is, the fact, and where it is from', card);
  eq(await page.evaluate(() => { const c = document.querySelector('#curio'), r = c.getBoundingClientRect(), cs = getComputedStyle(c.querySelector('b')), cc = getComputedStyle(c); return [c.getAttribute('role'), cs.color + ' ' + cc.backgroundColor + ' ' + cc.borderTopColor + ' ' + cc.borderTopLeftRadius, getComputedStyle(c.querySelector('.fl-ico')).backgroundColor, getComputedStyle(document.querySelector('#curio-root')).pointerEvents, r.right <= innerWidth && r.bottom <= innerHeight && r.left > innerWidth / 2, [...c.querySelectorAll('button')].map(b => b.dataset.a), S.user.curio.log.map(x => [x.id, x.day]), !!document.querySelector('.scrim')]; }),
    ['status', 'rgb(255, 255, 255) rgba(44, 44, 46, 0.94) rgba(255, 255, 255, 0.14) 22px', 'rgb(72, 72, 74)', 'none', true, ['curio-next', 'curio-less', 'curio-close'], [['fgc', '2026-10-02']], false], 'it is a notice in the corner, an iPhone’s dark notification since 2026-10-10 (owner: “no green; a medium-light black with an iOS border”): white title, #2C2C2E at 94%, a fine light edge, 22 px corners, its mark a grey rounded square; it covers nothing, blocks nothing, and is written down');
  eq(await page.evaluate(() => [S.user.inbox.length, S.user.inbox[0].kind, S.user.inbox[0].id, S.user.inbox[0].read, document.querySelector('.bell .count').textContent === String(activeReminders().length + 1)]), [1, 'curio', 'fgc', false, true], 'and kept for the bell: one update, new, counted on the bell');
  await page.click('#curio [data-a="curio-next"]');
  ok(/Since January 2024, the interest and charges on a credit card’s revolving balance cannot add up to more than the original debt\./.test(await text(page, '#curio')) && await page.evaluate(() => S.user.curio.log.length === 2 && document.activeElement.dataset.a === 'curio-next'), '“Another” shows the next one, writes it down too, and keeps the focus');
  await page.click('#curio [data-a="curio-less"]');
  eq(await page.evaluate(() => [S.user.curio.rate, document.querySelectorAll('#curio').length, document.querySelector('#toast').innerText.trim()]), ['less', 0, 'Done: Fewer: one a week. You can change it in your profile.'], '“Fewer of these”: one step down, said back with where to change it');
  await page.evaluate(() => { navigate('plan'); navigate('dashboard'); }); await page.waitForTimeout(3300);
  eq(await page.locator('#curio').count(), 0, 'with “fewer”, no other one comes this week');
  await page.evaluate(() => navigate('profile'));
  eq(await page.evaluate(() => [document.querySelector('#nf-curio').value, [...document.querySelectorAll('#nf-curio option')].map(o => o.textContent)]), ['less', ['More: up to three a day', 'Normal: one a day', 'Fewer: one a week', 'None']], 'the profile has the setting, on what was chosen, with its four choices');
  await page.selectOption('#nf-curio', 'off'); eq(await page.evaluate(() => S.user.curio.rate), 'off', 'choosing “None” there switches them off');
  // the company's own facts, on the company's side
  await page.evaluate(() => { S.user.curio = { rate: 'more', log: ['fgc', 'card', 'savings', 'overdraft', 'thirteenth', 'forgotten'].map(id => ({ id, day: '2026-09-01', t: 1 })) }; S.user.coLater = true; A.space({ v: 'business' }); navigate('dashboard'); });
  await page.waitForSelector('#curio', { timeout: 6000 });
  ok(/A MEI can invoice up to R\$ 81\.000 a year: R\$ 6\.750 a month on average\. The limit is the same in 2026\./.test(await text(page, '#curio')) && /Source: Lei Complementar 123\/2006/.test(await text(page, '#curio')), 'on the company’s side, a fact about a MEI comes up');
  await page.click('#curio [data-a="curio-close"]'); eq(await page.locator('#curio').count(), 0, 'the x closes it');
  // every fact reads whole, in three languages
  for (const lang of ['en', 'es', 'pt']) eq(await page.evaluate(l => { S.settings.lang = l; const f = curioFacts(); S.settings.lang = 'en'; return [Object.keys(f).length, CURIOS.every(c => f[c[0]] && f[c[0]][0].length > 30 && f[c[0]][1].length > 5 && !/\{|undefined/.test(f[c[0]][0])), l === 'en' || CURIOS.every(c => f[c[0]][0] !== curioFacts()[c[0]][0])]; }, lang), [8, true, true], `${lang}: eight facts, each with its text and its source, each in the language`);
  await page.evaluate(() => { A.space({ v: 'personal' }); S.user.curio = { rate: 'off', log: [] }; render(); });
  eq(await page.evaluate(() => { const h = getComputedStyle(document.querySelector('#insight-card h2')), c = getComputedStyle(document.querySelector('#insight-card')), i = getComputedStyle(document.querySelector('#insight-card .fl-ico')); return [h.color, c.borderTopColor !== getComputedStyle(document.querySelector('#runway-card')).borderTopColor, i.backgroundColor]; }), [GREEN, true, DEEP], 'the insight of the day wears the same green, more of it than a plain card: its title, its own border, its filled mark');

  // ---------- 3. milestones ----------
  eq(await page.evaluate(() => S.user.cheer), { marks: { personal: 0 }, goals: [] }, 'where the account stood when it opened was written down quietly');
  await page.click('#runway-card .empty [data-a="runway-edit"]'); await page.fill('#rw-spend', '1.000'); await page.click('[data-a="runway-save"]');
  eq(await page.locator('#curio').count(), 0, 'an estimate with nothing put aside passes no mark');
  await page.click('#runway-card [data-a="edit-account"]'); await page.fill('#a-name', 'Main'); await page.fill('#a-open', '4.000,00'); await page.click('[data-a="save-account"]');
  card = await text(page, '#curio');
  ok(/You passed 3 months of freedom!/.test(card) && /Next goal: 6 months\./.test(card) && await page.evaluate(() => S.user.cheer.marks.personal === 90 && document.querySelector('#curio').classList.contains('cheer') && !document.getElementById('confetti')), 'an account with 4.000 at 1.000 a month is 120 days: the mark of 3 months is cheered, with the next one named (and no confetti for someone who asked for less motion)', card);
  await page.click('#curio .row [data-a="curio-close"]'); await page.click('#runway-card [data-a="runway-edit"]'); await page.click('[data-a="runway-save"]');
  eq(await page.locator('#curio').count(), 0, 'the same mark is not cheered twice');
  await page.evaluate(() => { S.goals.push({ id: 'g1', name: '<i>Bike</i>', kind: 'goal', target: 100000, deadline: null, accountId: null, status: 'active', note: '', plan: { 2026: Array(12).fill(0) } }); render(); });
  await page.click('.topbar [data-a="new-tx"]'); await page.evaluate(() => A.close()); eq(await page.locator('#curio').count(), 0, 'a goal that is not reached is not cheered');
  await page.evaluate(() => { S.goalMoves.push({ id: 'm1', goalId: 'g1', date: S.today, amount: 100000 }); render(); });
  await page.click('.topbar [data-a="new-tx"]'); await page.evaluate(() => A.close());
  eq(await page.evaluate(() => [document.querySelector('#curio b').innerText.trim(), document.querySelectorAll('#curio b i').length, S.user.cheer.goals]), ['<i>Bike</i>: reached!', 0, ['g1']], 'a goal whose savings reach its target is cheered once, by name, as text');
  await page.click('#curio .x');

  // ---------- 4. the company's side of what was pending ----------
  await page.evaluate(() => { delete S.user.coLater; S.accounts.push({ id: 'co1', name: 'PJ', institution: 'Inter', type: 'savings', currency: 'BRL', scope: 'business', purpose: '', opening: 1800000 });      /* what it keeps: the runway counts savings (2026-10-09) */ A.space({ v: 'business' }); S.company.spend = { BRL: 400000 }; render(); });
  const show = k => page.evaluate(k => { const l = insights(B(), S.today, 'BRL'), bk = bookOf(S, 'business:BRL'), list = insights(bk, S.today, 'BRL'), i = list.findIndex(x => x.kind === k), p = insightOfDay(bk, S.today, 'BRL', 0); UI.insightSkip = ((i - p.index) % list.length + list.length) % list.length; render(); const c = document.querySelector('#insight-card'); return [c.dataset.kind, c.querySelector('.grow b').innerText.replace(/\s+/g, ' '), c.querySelector('.grow small').innerText.replace(/\s+/g, ' ')]; }, k);
  eq(await show('mark'), ['mark', 'R$ 6.000 more kept and the company reaches 6 months of runway.', 'Today it has 4 and a half months.'], 'the company has its insight, in its own words: what is missing to its next mark (18.000 at 4.000 a month: 135 days)');
  eq(await show('day'), ['day', 'One day of the company costs R$ 133.', 'That is what goes out in a day at its pace. Every R$ 133 it keeps buys one more.'], 'and what one of its days costs');
  await page.click('#runway-card [data-a="whatif"]'); await page.waitForSelector('#wi-out');
  eq(await page.evaluate(() => { const b = document.querySelector('#curio b'), r = [b && b.innerText.trim(), S.user.cheer.marks['business:BRL']]; A['curio-close'](); return r; }), ['The company passed 3 months of runway!', 90], 'the company’s runway passing a mark is cheered too, in its own words');
  const rows = () => page.evaluate(() => [...document.querySelectorAll('#wi-out .wi-row')].map(r => r.querySelector('b').innerText.trim()));
  eq(await page.evaluate(() => [UI.drawer.book, [...document.querySelectorAll('.drawer .ob-slide label')].map(l => l.innerText.trim()), [...document.querySelectorAll('#wi-out h3')].map(h => h.innerText.trim())]), ['business:BRL', ['The company costs less each month', 'The company receives more each month', 'The company sets aside once, today'], ['The reserve’s date', 'Company runway a year from now']], 'the company has its “What if…?”, opened on its own book, in its own words');
  await page.fill('#wi-less', '1.000'); eq(await rows(), ['4 and a half months', '10 months'], 'costing 1.000 less a month: a year from now 18.000 + 12.000 at 3.000 a month is 300 days, 10 months');
  await page.evaluate(() => A.close());
  await page.evaluate(() => { const tx = (id, date, amount, type) => ({ id, accountId: 'co1', date, amount, type, status: 'confirmed', categoryId: null, subcategoryId: null, merchant: 'x', description: 'x' }); S.transactions.push(tx('c1', '2026-10-01', 900000, 'income'), tx('c2', '2026-10-01', -250000, 'expense')); navigate('reports'); });
  eq(await page.evaluate(() => [UI.space, [...document.querySelectorAll('#view .tile .label span')].map(x => x.innerText.trim()), [...document.querySelectorAll('#view .tile .value')].map(x => x.innerText.trim()), ['Not filed yet', 'Result'].every(w => document.querySelector('#rep-split').innerText.includes(w)), !!document.querySelector('#nav a[href="#reports"]')]),
    ['business', ['Received', 'Costs', 'Result', 'Result, in %'], ['R$ 9.000,00', 'R$ 2.500,00', 'R$ 6.500,00', '72,2%'], true, true], 'the company has its reports: received, costs and result of its own accounts, and what has no company category yet as its own line');
  await page.evaluate(() => navigate('accounts'));
  eq(await page.evaluate(() => [[...document.querySelectorAll('#view .card.acct b')].map(b => b.innerText.trim()), [...document.querySelectorAll('#view .tile .label span')].map(x => x.innerText.trim()), document.querySelector('#view h2.sec').innerText.trim().toLowerCase().startsWith('company')]), [['PJ'], [], true], 'Accounts, on the company’s side: the company’s accounts only, no figures on top (owner, 2026-10-09)');
  await page.click('.topbar [data-a="edit-account"]'); eq(await page.evaluate(() => UI.drawer.draft.scope), 'business', '“Add account” there starts a company account'); await page.evaluate(() => A.close());
  await page.click('#rail-side [data-a="space"][data-v="personal"]');
  eq(await page.evaluate(() => [[...document.querySelectorAll('#view .card.acct b')].map(b => b.innerText.trim()), [...document.querySelectorAll('#view .tile .label span')].map(x => x.innerText.trim())]), [['Main'], []], 'and on the household’s side, the household’s only');
  eq(errors, [], 'notices and the company’s side: no error in the console');
  await browser.close();

  // ---------- 5. changing sides with motion; the letters ----------
  ({ browser, page, errors } = await open({ lang: 'en', account: 'example', viewport: { width: 1280, height: 900 }, motion: true }));
  await page.waitForTimeout(600);
  await page.click('#rail-side [data-a="space"][data-v="business"]');
  // owner, 2026-10-07: "back to basics: a black screen with background blur, the Dorax logo and a loader under it, 'loading company account, one
  // moment', and the other way round; let it load about two seconds more; the loader is an animation of the logo itself"
  eq(await page.evaluate(() => { const s = document.getElementById('side-shift'), cs = s && getComputedStyle(s); return s ? [s.className, s.getAttribute('role'), cs.pointerEvents, cs.position, /blur\(/.test(cs.backdropFilter || cs.webkitBackdropFilter || ''), s.querySelector('.shift-say b').innerText.trim(), s.querySelector('.shift-say small').innerText.trim(), document.documentElement.classList.contains('side-co'), UI.space, !!document.querySelector('#co-band')] : null; }),
    ['co', 'status', 'auto', 'fixed', true, 'Loading your company account…', 'One moment…', false, 'personal', false], 'changing sides is a short loading screen: a dark, blurred layer over the page that says which account is being loaded; it takes the taps while it is up, and it comes up over the household’s page: the company’s is not shown before it (owner, 2026-10-08)');
  await page.waitForTimeout(420);
  eq(await page.evaluate(() => [document.documentElement.classList.contains('side-co'), UI.space, !!document.querySelector('#co-band'), !!document.getElementById('side-shift'), +getComputedStyle(document.getElementById('side-shift')).opacity > .9]), [true, 'business', true, true, true], 'once the layer covers the page, the company’s side is drawn behind it');
  eq(await page.evaluate(() => { const s = document.getElementById('side-shift'), arc = s.querySelector('.shift-loader path'); return [!s.querySelector('svg.shift-logo'), !!s.querySelector('.shift-loader circle'), arc.getAttribute('d'), getComputedStyle(arc).stroke, getComputedStyle(arc).animationName, getComputedStyle(arc).animationIterationCount]; }), [true, true, 'M7.5 30a22.5 22.5 0 0 1 22.5-22.5', 'rgb(91, 157, 255)', 'shift-spin', 'infinite'], 'no logo on it (owner, 2026-10-09); the loader is the logo’s own ring with its quarter in the company’s blue going round it');
  await page.waitForTimeout(1950); ok(await page.locator('#side-shift').count() === 1, 'it takes its time: two and a half seconds later it is still loading');      // 420 ms already waited above
  await page.waitForFunction(() => !document.getElementById('side-shift'), null, { timeout: 2500 }); ok(true, 'and it is gone by itself a little after three seconds');
  await page.click('#rail-side [data-a="space"][data-v="personal"]'); eq(await page.evaluate(() => { const s = document.getElementById('side-shift'); return s && [s.className, s.querySelector('.shift-say b').innerText.trim(), getComputedStyle(s.querySelector('.shift-loader path')).stroke, !s.querySelector('.shift-logo'), UI.space]; }), ['home', 'Loading your household account…', 'rgb(62, 207, 142)', true, 'business'], 'and back: the household’s account is loaded, the loader’s quarter in its green and no logo, over the company’s page until it covers it');
  await page.waitForTimeout(420);
  await page.evaluate(() => A.space({ v: 'personal' })); await page.waitForTimeout(100); eq(await page.evaluate(() => UI.space), 'personal', 'choosing the side already in use changes nothing');
  eq(errors, [], 'motion: no error in the console'); await browser.close();
  ({ browser, page, errors } = await open({ lang: 'en', account: 'example', viewport: { width: 1280, height: 900 } }));
  await page.click('#rail-side [data-a="space"][data-v="business"]'); eq(await page.locator('#side-shift').count(), 0, 'no layer for someone who asked for less motion: the side just changes');
  await page.click('#rail-side [data-a="space"][data-v="personal"]');
  eq(await page.evaluate(() => { const px = (sel, prop) => parseFloat(getComputedStyle(document.querySelector(sel))[prop]) || 0; return [/^(normal|0px)$/.test(getComputedStyle(document.body).letterSpacing), px('.kpi .delta', 'letterSpacing') > 0, px('.kpi .delta', 'fontSize') >= 12.5, px('.kpi .label', 'letterSpacing') > 0, px('#runway-card .rw-next', 'fontSize') >= 13, px('#runway-card .rw-next', 'letterSpacing') > 0, px('.card-h h2', 'letterSpacing') > -0.2]; }), [true, true, true, true, true, true, true],
    'room between the letters (owner: “the space between letters is very small, the small letters above all”): the text is not tightened, small lines are opened a little and are no smaller than 12,5px');
  eq(errors, [], 'letters: no error in the console'); await browser.close();
  done('qc-notices');
})();
