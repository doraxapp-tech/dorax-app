// QC of "looking ahead" (2026-10-07): the calculations of core/runway.js, the 60-second setup, the days-of-freedom card of the dashboard
// and its panel, and the date a goal is reached. The first part needs no browser; the rest runs on the stand-in server (see pw.js).
const { open, ok, eq, done } = require('./pw.js');
const { load } = require('./load.js');

// ---------- 1. the calculations ----------
(() => {
  const E = load();
  eq([E.monthsToTarget(600000, 120000, 40000), E.monthsToTarget(100, 100, 0), E.monthsToTarget(100, 0, 0), E.monthsToTarget(100001, 0, 50000)], [12, 0, null, 3], 'months to a target: 4.800 at 400 is 12; reached is 0; nothing set aside is never; a cent over rounds up');
  eq([E.arrivalMonth(600000, 120000, 40000, '2026-10'), E.arrivalMonth(100, 200, 0, '2026-10'), E.arrivalMonth(100, 0, 0, '2026-10'), E.arrivalMonth(40000, 0, 40000, '2026-12')], ['2027-09', '2026-10', null, '2026-12'], 'arrival: the n-th contribution lands n-1 months on; already there is this month; never is null');
  eq([E.lever(600000, 120000, 40000), E.lever(600000, 120000, 0), E.lever(100, 100, 50), E.lever(10000, 0, 10000)], [{ extra: 5000, sooner: 1 }, null, null, null], 'the step that brings a goal closer: the smallest one that saves a month; none without a pace, when reached, or when one month is all it takes');
  eq([59, 60, 74, 75, 100, 105, 119, 120, 262, 365].map(E.runwayMonths), [1.5, 2, 2, 2.5, 3, 3.5, 3.5, 4, 8.5, 12], 'months of freedom are said in halves, rounded down: 100 days is 3, 105 is 3 and a half, 119 is still 3 and a half');
  eq([E.runwayDays(120000, 80000), E.runwayDays(0, 80000), E.runwayDays(100, 0), E.runwayDays(79999, 80000), E.runwayDays(-5, 10)], [45, 0, null, 29, 0], 'days of freedom: 1.200 at 800 a month is 45; nothing put aside is 0; nothing going out has no pace; days are rounded down');
  const L = E.firstLook(120000, 80000, 120000, 600000, '2026-10');
  eq([L.free, L.days, L.months, L.arrival, L.covered, L.far, L.to30], [40000, 45, 12, '2027-09', false, false, null], 'first look: the four figures of the setup give what is left, the days and the date');
  const Z = E.firstLook(80000, 80000, 0, 600000, '2026-10');
  eq([Z.free, Z.days, Z.months, Z.arrival, Z.in12, Z.lever], [0, 0, null, null, 50000, null], 'first look: as much out as in gives no date, and says what 12 months would take');
  eq(E.firstLook(100000, 80000, 20000, 0, '2026-10').to30, 3, 'first look: 30 days of freedom is one month of spending put aside (600 missing at 200 a month: 3 months)');
  eq([E.firstLook(100000, 90000, 0, 99999900, '2026-10').far, E.firstLook(1, 2, 700, 500, '2026-10').covered], [true, true], 'first look: more than ten years is far; a dream already paid for is covered');
  // an account: burn, cushion, runway, and a goal's date
  const s = E.buildNewState('a@b', 'en', '2026-10-07');
  eq(E.runway(s, s.today, 'BRL').days, null, 'a blank account has no days of freedom to show');
  s.user.spend = 80000;
  eq([E.monthlyBurn(s, s.today, 'BRL'), E.runway(s, s.today, 'BRL').days, E.runway(s, s.today, 'BRL').next], [{ amount: 80000, basis: 'estimate', months: 0 }, 0, { days: 30, missing: 80000 }], 'with an estimate and nothing put aside: 0 days, and one month of spending is the first mark');
  const g = { id: 'g1', name: 'Trip', kind: 'goal', target: 600000, deadline: null, accountId: null, status: 'active', note: '', plan: { 2026: [0, 0, 0, 0, 0, 0, 0, 0, 0, 40000, 40000, 40000] } };
  s.goals.push(g); s.goalMoves.push({ id: 'm1', goalId: 'g1', date: '2026-10-07', amount: 120000, start: true });
  let r = E.runway(s, s.today, 'BRL');
  eq([r.days, r.cushion, r.delta, r.next], [45, { amount: 120000, basis: 'goals' }, null, { days: 90, missing: 120000 }], 'what is saved in goals counts when the accounts hold less; no change is shown when nothing was put aside the month before');
  eq(E.goalArrival(s, g, s.today), { ym: '2027-09', by: 'pace', pace: 40000, months: 12, late: null }, 'a goal planned to December carries on at that pace: the date is the one the setup showed');
  g.deadline = '2027-06'; eq(E.goalArrival(s, g, s.today).late, 3, 'a goal reached after its own date says by how many months');
  g.plan[2027] = Array(12).fill(80000); eq([E.goalArrival(s, g, s.today).ym, E.goalArrival(s, g, s.today).by, E.goalArrival(s, g, s.today).late], ['2027-05', 'plan', -1], 'when the plan itself gets there, the date is the plan’s, and it can be early');
  g.status = 'paused'; eq(E.goalArrival(s, g, s.today), null, 'a paused goal has no date'); g.status = 'active';
  g.plan = { 2026: Array(12).fill(0) }; eq(E.goalArrival(s, g, s.today), null, 'a goal with nothing planned ahead has no date');
  g.plan = { 2026: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1] }; eq(E.goalArrival(s, g, s.today), null, 'a date more than fifty years away is not shown');
  // accounts, the plan and real months
  s.accounts.push({ id: 'a1', name: 'Savings', institution: 'Nubank', type: 'savings', currency: 'BRL', scope: 'personal', purpose: '', opening: 300000 }, { id: 'c1', name: 'Card', institution: 'Nubank', type: 'credit', currency: 'BRL', scope: 'personal', purpose: '', opening: -90000 },
    { id: 'k1', name: 'Main', institution: 'Nubank', type: 'checking', currency: 'BRL', scope: 'personal', purpose: '', opening: 500000 }, { id: 'b1', name: 'Co', institution: 'Wise', type: 'savings', currency: 'BRL', scope: 'business', purpose: '', opening: 900000 });
  eq(E.cushion(s, 'BRL'), { amount: 300000, basis: 'accounts' }, 'the savings accounts count when they hold more than the goals: a checking account (the month’s money; owner, 2026-10-09: “counted from the savings”), cards and company accounts are left out');
  s.plan.lines.push({ id: 'l1', categoryId: 'home', subcategoryId: null, name: 'Rent', pay: 'fixed', accountId: 'a1', end: null, note: '', plan: { 2026: Array(12).fill(150000) } });
  eq(E.monthlyBurn(s, s.today, 'BRL').basis, 'plan', 'planned fixed costs above the estimate become the pace');
  const tx = (id, date, amount) => ({ id, accountId: 'a1', date, amount, type: amount < 0 ? 'expense' : 'income', status: 'confirmed', categoryId: 'home', subcategoryId: null, merchant: 'x', description: 'x' });
  s.transactions.push(tx('t1', '2026-09-10', -200000), tx('t2', '2026-08-10', -100000), tx('t3', '2026-10-03', -30000), tx('t4', '2026-10-05', 50000));
  r = E.runway(s, s.today, 'BRL');
  eq([E.monthlyBurn(s, s.today, 'BRL'), r.cushion.amount, r.days], [{ amount: 150000, basis: 'actual', months: 2 }, 120000, 24], 'two real months averaging 1.500 become the pace; the account is down to 200 (3.000 - 3.000 - 300 + 500), so the 1.200 in the goal is what counts');
  s.transactions.push(tx('t5', '2026-07-15', -330000));
  eq([E.monthlyBurn(s, s.today, 'BRL'), E.runway(s, s.today, 'BRL').delta], [{ amount: 210000, basis: 'actual', months: 3 }, null], 'three real months averaging 2.100 become the pace; no change is shown while nothing was put aside at the end of the month before');
  s.goalMoves.push({ id: 'm2', goalId: 'g1', date: '2026-10-06', amount: 420000 }, { id: 'm3', goalId: 'g1', date: '2026-09-20', amount: 210000 });
  r = E.runway(s, s.today, 'BRL'); eq([r.cushion, r.days, r.delta], [{ amount: 750000, basis: 'goals' }, 107, 77], 'a contribution this month moves the days: 7.500 at 2.100 a month is 107 days, 77 more than at the end of September (2.100 then: 30 days)');
  // the company's book reads its own accounts and never the household's estimate
  const co = E.bookOf(s, E.bookKeyOf('BRL'));
  eq([E.cushion(co, 'BRL'), E.monthlyBurn(co, s.today, 'BRL').basis, E.runway(co, s.today, 'BRL').days], [{ amount: 900000, basis: 'accounts' }, null, null], 'the company’s side counts its own savings, and has no pace until it has costs: the household’s estimate is not borrowed');
})();

(async () => {
  // ---------- 2. the setup, screen by screen ----------
  let { browser, page, errors } = await open({ lang: 'en', server: { confirmEmail: false } });
  const signup = async (p, name, mail) => { await p.evaluate(() => A['pub-go']({ v: 'signup' })); await p.fill('#au-name', name); await p.fill('#au-email', mail); await p.fill('#au-pass', 'UmaSenha2026'); await p.check('#au-accept'); await p.click('[data-a="auth-signup"]'); await p.waitForSelector('#ob-name'); };
  const text = async (p, sel) => (await p.locator(sel).innerText()).replace(/\s+/g, ' ');
  await signup(page, 'Ana Lima Souza', 'ana@example.org');
  eq(await page.evaluate(() => [document.querySelectorAll('.weave').length, getComputedStyle(document.querySelector('.auth')).backgroundImage]), [0, 'none'], 'setup: no pattern behind it (owner: "remove the pattern from the background")');
  ok(/^Hi, welcome!/.test(await text(page, '.onb h1')), 'setup: the greeting');
  // since 2026-10-10 (owner: "make the web app's onboarding like the Journey's"; "minimalist"): a page over the whole screen, no card; the dots are a
  // bar in four parts over the large button, the part of the step green
  const dots = () => page.evaluate(() => { const d = document.querySelector('.ob-dots'), now = [...d.children].map(i => i.classList.contains('now')); const r = d.getBoundingClientRect(), b = document.querySelector('.ob-foot .js-go').getBoundingClientRect(), pg = document.querySelector('#obpage').getBoundingClientRect();
    return [d.children.length, now.indexOf(true), now.filter(Boolean).length, getComputedStyle(d.children[now.indexOf(true)]).backgroundColor, d.getAttribute('aria-label'), r.bottom <= b.top, pg.width >= innerWidth - 1 && pg.height >= innerHeight - 1 && !document.querySelector('.auth-card.onb'), document.querySelectorAll('.ob-prog, .ob-count').length]; });
  eq(await dots(), [4, 0, 1, 'rgb(62, 207, 142)', 'Step 1 of 4', true, true, 0], 'setup: a page over the whole screen with no card; a bar in four parts over the large button, the first part green; no step counter');
  eq(await page.locator('.ob-dream').count(), 4, 'setup: four dreams to choose from');
  eq(await page.evaluate(() => [document.querySelectorAll('.ob-dream .fl-ico svg[aria-hidden="true"]').length, [...document.querySelectorAll('.onb .e')].map(e => [e.textContent, e.getAttribute('aria-hidden')]), /\p{Extended_Pictographic}/u.test(document.querySelector('.ob-dreams').textContent), ['car', 'plane', 'shield', 'spark', 'bulb', 'target'].every(n => ICONS[n])]),
    [4, [['👋', 'true']], false, true], 'setup: each dream has an icon drawn in the app’s set; the only emoji is the waving hand of the greeting, hidden from screen readers');
  await page.fill('#ob-name', ''); await page.click('[data-a="onboard-save"]');
  ok(/something to call you/.test(await text(page, '.onb .banner')), 'setup: a name is asked for');
  await page.fill('#ob-name', 'Ana Lima Souza'); await page.click('[data-a="ob-dream"][data-v="car"]');
  eq(await page.evaluate(() => [ob().cost, $('ob-cost').value, $('ob-cost-r').value, $('ob-cost-r').max, $('ob-cost-r').getAttribute('aria-valuetext'), document.activeElement.tagName]), ['50.000', '50.000', '50000', '300000', 'R$ 50.000', 'BUTTON'], 'setup: a dream brings its slider, at a round starting figure; the keyboard is not called');
  await page.click('[data-a="ob-dream"][data-v="trip"]'); eq(await page.evaluate(() => [ob().cost, $('ob-cost-r').max]), ['6.000', '60000'], 'setup: another dream starts at its own figure while the cost was not touched');
  await page.evaluate(() => { const r = $('ob-cost-r'); r.value = 12500; r.dispatchEvent(new Event('input', { bubbles: true })); });
  eq(await page.evaluate(() => [ob().cost, $('ob-cost').value, $('ob-cost-r').style.getPropertyValue('--p'), ob().costTouched]), ['12.500', '12.500', '20.8%', true], 'slider: dragging writes the amount in its field and fills the track');
  await page.fill('#ob-cost', '90.000'); eq(await page.evaluate(() => [ob().cost, $('ob-cost-r').value, $('ob-cost-r').style.getPropertyValue('--p')]), ['90.000', '60000', '100%'], 'slider: an amount typed past its far end stays in the field; the slider stops at the end');
  await page.click('[data-a="ob-dream"][data-v="car"]'); eq(await page.evaluate(() => ob().cost), '90.000', 'setup: a cost the person set is kept when the dream changes');
  await page.fill('#ob-cost', '0'); await page.click('[data-a="onboard-save"]');
  ok(/how much it costs/.test(await text(page, '.onb .banner')), 'setup: a dream needs its cost, said without blame');
  await page.fill('#ob-cost', 'abc'); eq(await page.inputValue('#ob-cost'), '', 'setup: letters cannot be typed in a cost (owner, 2026-10-09)');
  await page.fill('#ob-cost', '1.2.3'); await page.click('[data-a="onboard-save"]');
  ok(/1500 or 9,90/.test(await text(page, '.onb .banner')), 'setup: a cost that cannot be read is refused');
  await page.click('[data-a="ob-dream"][data-v="other"]'); await page.fill('#ob-cost', '6.000'); await page.click('[data-a="onboard-save"]');
  ok(/Give your dream a name/.test(await text(page, '.onb .banner')), 'setup: another dream needs a name');
  await page.fill('#ob-dream-name', '<img src=x onerror=window.HIT=1>'); await page.fill('#ob-name', '<b>Ana Lima');
  eq(await text(page, '.ob-cheer'), 'Great goal, <b>Ana! Let’s put a date on it.', 'setup: the cheer follows the name as it is typed, as text, and uses the first name only');
  eq(await page.evaluate(() => { const c = document.querySelector('.ob-cheer'), b = document.querySelector('.ob-foot [data-a="onboard-save"]'), r = c.getBoundingClientRect(), k = b.getBoundingClientRect(); return [c.parentElement.classList.contains('ob-foot'), r.bottom <= k.top, getComputedStyle(document.querySelector('.ob-dream:not([aria-pressed="true"])')).backgroundColor, getComputedStyle(document.querySelector('.ob-val')).backgroundColor]; }), [true, true, 'rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0)'], 'setup (since 2026-10-10, a page of its own, minimal): the cheer is over the large Next button; the dreams have no fill, only their edge; the dreams are #171717 (owner, 2026-10-07); the cost is a figure with no box around it');
  await page.fill('#ob-name', 'Ana Lima Souza'); await page.click('[data-a="ob-dream"][data-v="trip"]'); await page.focus('#ob-cost'); await page.keyboard.press('Enter'); await page.waitForSelector('#ob-pay0');
  eq(await page.evaluate(() => [ob().step, document.activeElement.tagName, document.querySelectorAll('[data-a="ob-pays"], #ob-pay1').length]), [1, 'H1', 0], 'setup: Enter goes on; no field takes the focus (the numbers are sliders); no "two payments" switch');
  eq(await text(page, '.onb h1'), 'How do your numbers look today, Ana?', 'numbers: the heading, with the first name only (owner, 2026-10-07)');
  // the amount beside each slider is a figure, not a second box: no frame, no fill, a dashed line that says it can be typed over (owner, 2026-10-07:
  // "leave only the slider but still give the person the option to type the amount, so the screen looks cleaner without hurting the UX")
  eq(await page.evaluate(() => { const v = document.querySelector('.ob-val'), c = getComputedStyle(v), i = v.querySelector('input'), k = getComputedStyle(i); return [c.backgroundColor, c.borderTopWidth, c.borderLeftWidth, c.borderBottomStyle, k.borderTopWidth, k.backgroundColor, parseFloat(k.fontSize) >= 20, +k.fontWeight >= 600, i.readOnly, i.getBoundingClientRect().height >= 34, document.querySelectorAll('.onb .ob-cheer').length]; }),
    ['rgba(0, 0, 0, 0)', '0px', '0px', 'dashed', '0px', 'rgba(0, 0, 0, 0)', true, true, false, true, 0], 'numbers: each amount is a bold figure with no box, on a dashed line, and it is still a field; the cheer belongs to the first screen');
  eq(await page.evaluate(() => { const i = document.querySelector('#ob-pay0'), r = document.querySelector('#' + i.dataset.range), was = [i.value, r.value]; i.focus(); const line = getComputedStyle(i.closest('.ob-val')).borderBottomStyle; i.value = '5.200'; i.dispatchEvent(new Event('input', { bubbles: true })); const now = [document.querySelector('#ob-pay0').value, +document.querySelector('#' + i.dataset.range).value];
    const j = document.querySelector('#ob-pay0'); j.value = was[0]; j.dispatchEvent(new Event('input', { bubbles: true })); j.blur(); return [line, now, +document.querySelector('#' + j.dataset.range).value === +was[1]]; }), ['solid', ['5.200', 5200], true], 'tapped, the line turns solid; an amount typed there moves the slider with it');

  eq(await page.evaluate(() => [ob().pay, ob().spend, ob().saved, $('ob-pay0-r').value, $('ob-spend-r').value, $('ob-saved-r').value]), ['3.700', '3.200', '3.200', '3700', '3200', '3200'], 'numbers: the three sliders start at Brazil’s averages (IBGE income, 86% of it spent, one month put aside)');
  ok(/They start at Brazil’s averages/.test(await text(page, '.onb')) && /IBGE, PNAD Contínua, 2nd quarter of 2026/.test(await page.locator('.ob-avg .hint').getAttribute('data-tip')), 'numbers: the screen says where the starting values come from');
  await page.fill('#ob-pay0', ''); await page.click('[data-a="ob-next"]');
  ok(/what comes in and what goes out/.test(await text(page, '.onb .banner')), 'setup: the look ahead needs what comes in and what goes out');
  await page.fill('#ob-pay0', '1.200'); await page.fill('#ob-spend', '800'); await page.fill('#ob-saved', '1.200');
  eq(await dots().then(d => d.slice(1, 3).concat(d[4], d[5])), [1, 1, 'Step 2 of 4', true], 'numbers: the second dot is the green one');
  ok(await page.locator('.onb [data-a="ob-company"], #ob-co-l').count() === 0 && !/company|PJ|MEI/i.test(await text(page, '.onb')) && !/What goes out is everything/.test(await text(page, '.onb')), 'numbers: three sliders and where they start; the company question and the note about what goes out are gone (owner, 2026-10-07)');
  await page.click('[data-a="ob-next"]'); await page.waitForSelector('.ob-facts');
  let rv = await text(page, '.onb');
  eq(await page.locator('#confetti').count(), 0, 'reveal: no confetti for someone who asked for less motion');
  ok(/Ana, this is what your money can already do/.test(rv) && /45 days of freedom/.test(rv) && /R\$ 400 left each month/.test(rv) && /Trip: September 2027/.test(rv) && /in 12 months/.test(rv) && /With R\$ 50 more a month, you get there 1 month sooner/.test(rv), 'reveal: 45 days of freedom, 400 left, the trip in September 2027, and the step that brings it closer', rv.slice(0, 500));
  eq(await page.evaluate(() => [...document.querySelectorAll('.onb .rw-seg .bar > i')].map(e => e.style.width)), ['100%', '25%'], 'reveal: the track is full to 30 days and a quarter of the way to 3 months');
  ok(/no investment returns/.test(rv), 'reveal: it says the sum assumes no investment return');
  ok(await page.locator('.onb .ob-meter, .onb .ob-fact .meter').count() === 0 && !/R\$ 1\.200 of R\$ 6\.000 saved/.test(rv), 'reveal: no bar and no "saved of cost" line under the dream (owner, 2026-10-07)');
  ok(!/\p{Extended_Pictographic}/u.test(rv) && await page.locator('.ob-fact .fl-ico svg').count() === 3, 'reveal: no emoji; each fact has one of the app’s own icons (owner: "no emoji, icons in our style")');
  // the same screen for the hard cases, each reached by going back and changing a number
  const again = async (pay, spend, saved) => { await page.click('[data-a="ob-back"]'); await page.fill('#ob-pay0', pay); await page.fill('#ob-spend', spend); await page.fill('#ob-saved', saved); await page.click('[data-a="ob-next"]'); await page.waitForSelector('.ob-facts'); return text(page, '.onb'); };
  rv = await again('800', '800', '0');
  ok(/Your days of freedom start today/.test(rv) && /Today as much goes out as comes in/.test(rv) && /No drama/.test(rv) && /Trip: no date yet/.test(rv) && /you need R\$ 500 free each month/.test(rv) && !/sooner/.test(rv), 'reveal: nothing left over and nothing saved is said without blame, with what 12 months would take', rv.slice(0, 500));
  rv = await again('700', '800', '0'); ok(/Today R\$ 100 more goes out than comes in each month/.test(rv), 'reveal: more out than in is said plainly', rv.slice(0, 300));
  rv = await again('1.000', '800', '0'); ok(/Putting aside what is left each month, you have 30 days of freedom in 4 months/.test(rv), 'reveal: with nothing saved, it says when 30 days are reached (800 at 200 a month)', rv.slice(0, 300));
  rv = await again('1.200', '800', '7.000'); ok(/Trip: you already have it covered/.test(rv) && /8 and a half months of freedom/.test(rv) && !/8,[0-9]/.test(rv), 'reveal: a dream already paid for, and days said in months from two months on, in halves and never with a decimal (262 days: 8 and a half)', rv.slice(0, 300));
  rv = await again('801', '800', '0'); ok(/more than 10 years away/.test(rv), 'reveal: a date more than ten years away is not printed', rv.slice(0, 300));
  ok(!/NaN|undefined|null/.test(rv), 'reveal: no broken value in any case');
  await again('1.200', '800', '1.200');
  await page.click('[data-a="ob-next"]'); await page.waitForSelector('.ob-ways');
  eq(await page.evaluate(() => [...document.querySelectorAll('.ob-way')].map(e => e.dataset.go)), ['limits', 'plan', 'sheet'], 'last screen: plan the month (limits), fixed costs or the spreadsheet; the company is asked about on the dashboard');
  eq(await dots().then(d => [d[1], d[4], d[5]]), [3, 'Step 4 of 4', true], 'last screen: the fourth dot');
  await page.click('.ob-foot [data-a="ob-finish"]'); await page.waitForFunction(() => !!UI.session);
  eq(await page.evaluate(() => [UI.route, S.user.name, S.user.spend, 'company' in S.user, S.isNew]), ['dashboard', 'Ana', 80000, false, true], 'finishing opens the dashboard with the answers kept; nothing was said about a company yet');
  // the dashboard asks about the company (owner, 2026-10-07: "ask this on the dashboard")
  let ask = await text(page, '#co-ask');
  ok(/Do you also run a company \(PJ or MEI\)\?/.test(ask) && /Company and home in one place, never mixed\./.test(ask) && /“Open a company account” is in your menu/.test(await page.locator('#co-ask .hint').getAttribute('data-tip')), 'dashboard: the question, what it is for, and an (i) that says what each answer does', ask);
  eq(await page.evaluate(() => { const ids = [...document.querySelectorAll('#view > *')].map(e => e.id || e.className.split(' ')[0]); return [ids.indexOf('co-ask') === ids.indexOf('kpis') + 1 && ids.indexOf('co-ask') < ids.findIndex(x => /^(dash-)?grid/.test(x)) && document.querySelector('#runway-card').parentElement === document.querySelector('#insight-card').parentElement, ids.indexOf('first-steps') === ids.indexOf('hello') + 1 && ids.indexOf('first-steps') < ids.indexOf('kpis'), [...document.querySelectorAll('#co-ask [data-a="co-answer"]')].map(b => b.dataset.v + ':' + b.innerText.trim()), !!document.querySelector('#co-ask .card .card, #co-ask .card')]; }), [true, true, ['yes:Yes', 'no:No'], false], 'dashboard: it sits under the month’s figures, above the parts (the notices stay above the parts, as on a phone; owner, 2026-10-08: the days of freedom and the insight of the day share a row), with Yes and No, and no card inside the card; the first steps, still to be done, come before everything but the greeting (owner: "nothing is more important than that")');
  eq(await page.evaluate(() => [document.querySelectorAll('[data-a="space"]').length, document.querySelector('#rail-side').innerHTML, hasCompany()]), [0, '', false], 'until the question is answered the app is the household’s alone: no Household | Company choice anywhere (owner: "by default the switch is not shown until they answer")');
  await page.click('#co-ask [data-a="co-answer"][data-v="yes"]'); await page.waitForSelector('#co-setup');
  eq(await page.evaluate(() => [UI.space, UI.route, S.user.company, document.querySelectorAll('#co-ask').length, UI.coSetup.step, document.documentElement.classList.contains('side-co')]), ['business', 'dashboard', true, 0, 0, true], 'Yes: the answer is kept, the company’s side opens (in blue) and, as it has nothing yet, its setup starts (tests/qc-sides.js follows it through)');
  eq(await page.evaluate(() => [...document.querySelectorAll('#rail-side [data-a="space"]')].map(b => b.dataset.v + ':' + b.getAttribute('aria-label'))), ['personal:Switch to Household'], 'and from then on the menu has the way to the other side (owner, 2026-10-08: the two arrows beside the eye replaced the switch)');
  await page.evaluate(() => { A.space({ v: 'personal' }); S.accounts.push({ id: 'pj1', name: 'PJ', institution: 'Nubank', type: 'checking', currency: 'BRL', scope: 'business', purpose: '', opening: 0 }); render(); });
  // an account that was never asked but already holds a company account is not asked: it has a company, and its choice of side
  await page.evaluate(() => { delete S.user.company; render(); }); eq(await page.evaluate(() => [document.querySelectorAll('#co-ask').length, hasCompany(), document.querySelectorAll('#rail-side [data-a="space"]').length]), [0, true, 1], 'an account never asked that already holds a company account is not asked: the choice of side is simply there');
  await page.click('#rail-side [data-a="space"][data-v="business"]'); eq(await page.evaluate(() => [pageBookKey(), !!UI.drawer, !!UI.coSetup]), ['business:BRL', false, false], 'and its company side opens with no setup');
  // No: put away, no choice of side, and the way back is in the person's menu
  await page.evaluate(() => { A.space({ v: 'personal' }); S.accounts = S.accounts.filter(a => a.scope !== 'business'); delete S.company; delete S.user.company; render(); });
  await page.click('#co-ask [data-a="co-answer"][data-v="no"]');
  eq(await page.evaluate(() => [S.user.company, document.querySelectorAll('#co-ask').length, document.querySelector('#toast').innerText.trim(), document.querySelectorAll('[data-a="space"]').length]), [false, 0, 'Got it. If that changes, “Open a company account” is in your menu.', 0], 'No: kept, the question goes, and no choice of side is shown');
  await page.click('#user-menu-btn');
  eq(await page.evaluate(() => { const b = document.querySelector('#umenu-co'); return b && [b.innerText.trim(), b.dataset.a, !!b.querySelector('svg')]; }), ['Open a company account', 'co-open', true], 'the person’s menu keeps the door open: “Open a company account”');
  await page.click('#umenu-co'); await page.waitForSelector('#co-setup');
  eq(await page.evaluate(() => [S.user.company, UI.space, UI.menu, document.querySelectorAll('#rail-side [data-a="space"]').length]), [true, 'business', false, 1], 'choosing it is saying yes: the company’s setup opens and the choice of side appears');
  await page.click('#user-menu-btn'); eq(await page.locator('#umenu-co').count(), 0, 'someone with a company no longer has that row in the menu'); await page.click('#user-menu-btn');
  await page.evaluate(() => { A['co-setup-later'](); A.space({ v: 'personal' }); delete S.user.company; delete S.user.coLater; render(); });
  await page.evaluate(() => { S.accounts = S.accounts.filter(a => a.scope !== 'business'); delete S.company; render(); });
  eq(await page.evaluate(() => [S.user.fullName, document.querySelector('#rail-foot').innerText.includes('Ana')]), ['Ana Lima Souza', true], 'the app calls the person by their first name; the name as typed is kept beside it');
  eq(await page.evaluate(() => [S.pay[2026].map(r => [r.name, r.to, r.half, r.values[8], r.values[9]]), S.goals.map(g => [g.name, g.kind, g.target, g.plan[2026].slice(8), g.k && g.k.name]), S.goalMoves.map(m => [m.amount, !!m.start])]),
    [[['Salary', 'fixed', 0, 0, 80000], ['Salary · savings part', 'savings', 0, 0, 40000]], [['Trip', 'goal', 600000, [0, 40000, 40000, 40000], 'Trip']], [[120000, true]]], 'the answers became income rows (800 for costs, 400 for savings), a goal planned from this month, and a starting balance');
  // the dashboard opens with the same numbers
  await page.evaluate(() => { A.close(); navigate('dashboard'); });
  let card = await text(page, '#runway-card');
  ok(/45 days of freedom/.test(card) && /You passed the 30 days goal! You built that\./.test(card) && /Next goal: 3 months\. R\$ 1\.200 more and you are there\./.test(card) && !/going out a month/.test(card), 'dashboard: the days of freedom of the setup, the goal passed celebrated (owner, 2026-10-08: “I want Dorax to celebrate what people achieve”) in one line, and what reaches the next one; what it rests on is behind Adjust (owner: “too much information”)', card);
  await page.click('#runway-card [data-a="runway-edit"]'); const adj = await text(page, '.drawer');
  ok(/R\$ 1\.200/.test(adj) && /saved in goals and funds/.test(adj) && /R\$ 800/.test(adj) && /Your estimate/.test(adj), 'Adjust says what the figure rests on: 1.200 saved in goals and funds, 800 going out a month by your estimate', adj);
  await page.evaluate(() => A.close()); await page.waitForTimeout(250);
  eq(await page.evaluate(() => { const e = document.querySelector('#runway-card .rw-fig .rw-e'); return e && [e.textContent, e.getAttribute('aria-hidden'), e.previousElementSibling.className]; }), ['🎉', 'true', 'rw-u'], 'a goal passed: a 🎉 right after the figure’s words, hidden from screen readers');
  eq(await page.evaluate(() => [rwParty(12), /^With what you have put aside you could already live 12 days even if nothing came in\. Everything you keep adds days\.$/.test(rwSay(12, '12 days', false)), rwNext({ next: null }, false, x => x), rwNext({ next: null }, true, x => x)]),
    ['', true, 'More than a year put aside. You passed every goal!', 'More than a year kept. The company passed every goal!'], 'before the first goal: no 🎉, a word of encouragement instead; past the last one: every goal passed');
  ok(/reached in Sep 2027 keeping R\$ 400 a month/.test(await text(page, '#goals-card')), 'dashboard: the goal says when it is reached');
  await page.evaluate(() => navigate('goals'));
  eq(await page.evaluate(() => [!!document.querySelector('.card.goal .arrive'), [...document.querySelectorAll('.card.goal .g-foot button')].map(b => b.dataset.a)]), [false, ['goal-move', 'goal-open']], 'goals: the card has no date line; under its line only Contribute and Details (owner, 2026-10-08)');
  await page.click('.card.goal [data-a="goal-open"]');
  ok(/Keeping R\$ 400 a month after the plan ends, it is reached in September 2027\./.test(await text(page, '.drawer')) && !/You get there in/.test(await text(page, '.drawer')), 'goals: the details say once when it is reached and how', await text(page, '.drawer'));
  await page.evaluate(() => { S.settings.lang = 'es'; render(); });
  eq(await page.evaluate(() => S.goals[0].name), 'Viaje', 'a goal the setup named follows the language');
  ok(/Septiembre 2027/.test(await text(page, '.drawer')), 'goals: the date in Spanish');
  await page.evaluate(() => { S.settings.lang = 'en'; S.goals[0].deadline = '2027-06'; render(); });
  ok(/To arrive by June 2027: R\$ [\d.,]+ a month\./.test(await text(page, '.drawer')), 'goals: the person’s own date is said as a fact: what it takes a month to arrive by it');
  await page.evaluate(() => { S.goals[0].plan = { 2026: Array(12).fill(0) }; render(); });
  ok(/is not planned yet/.test(await text(page, '.drawer')) && await page.locator('.drawer footer [data-a="goal-edit"]').count() === 1, 'goals: nothing planned ahead says so, and Edit is there to plan it');
  await page.evaluate(() => A.close());
  eq(errors, [], 'setup and first dashboard: no error in the console');
  await browser.close();

  // ---------- 3. other ways through the setup ----------
  ({ browser, page, errors } = await open({ lang: 'en', server: { confirmEmail: false } }));
  await signup(page, 'Bo', 'bo@example.org');
  await page.click('[data-a="onboard-save"]'); await page.click('[data-a="ob-finish"]'); await page.waitForFunction(() => !!UI.session);
  eq(await page.evaluate(() => [S.user.name, S.goals.length, S.pay[2026].length, S.user.spend === undefined, S.user.company === undefined, S.isNew, document.querySelectorAll('#co-ask').length]), ['Bo', 0, 0, true, true, true, 1], 'a setup left at once creates nothing: the account is blank, with its first steps and the question about a company');
  card = await text(page, '#runway-card');
  ok(/How long could you live on what you have\?/.test(card) && await page.locator('#runway-card [data-a="runway-edit"]').count() === 2, 'dashboard, blank account: the card invites, with "Set my numbers" and "Adjust"', card);
  await page.click('#runway-card .empty [data-a="runway-edit"]');
  eq(await page.evaluate(() => [UI.drawer.kind, document.activeElement.id]), ['runway', 'rw-spend'], 'the panel opens on the estimate');
  await page.fill('#rw-spend', '1,5,0'); await page.click('[data-a="runway-save"]');
  ok(/1500 or 9,90/.test(await text(page, '.drawer .banner')) && await page.evaluate(() => !('spend' in S.user)), 'panel: an amount that cannot be read is refused, and nothing changes');
  await page.fill('#rw-spend', '1.000'); await page.click('[data-a="runway-save"]');
  card = await text(page, '#runway-card');
  ok(/Your days of freedom start with the first amount you put aside/.test(card) && /With R\$ 1\.000 going out a month, R\$ 1\.000 put aside is 30 days/.test(card), 'dashboard: an estimate and nothing put aside says where the days start', card);
  eq(await page.evaluate(() => [S.user.spend, document.querySelectorAll('#runway-card .rw-seg .bar > i').length]), [100000, 0], 'the estimate is kept, and the track is empty');
  await page.click('#runway-card [data-a="edit-account"]'); await page.fill('#a-name', 'Main'); await page.fill('#a-open', '4.000,00'); await page.click('[data-a="save-account"]'); await page.evaluate(() => { A.close(); navigate('dashboard'); });
  card = await text(page, '#runway-card');
  ok(/4 months of freedom/.test(card) && /You passed the 3 months goal!/.test(card) && /Next goal: 6 months\. R\$ 2\.000 more and you are there\./.test(card) , 'dashboard: an account with 4.000 at 1.000 a month is 4 months (120 days), the 3 months goal passed', card);
  eq(await page.evaluate(() => [...document.querySelectorAll('#runway-card .rw-seg .bar > i')].map(e => e.style.width)), ['100%', '100%', '33.3%'], 'the track: two marks passed, a third of the way to the next');
  await page.click('#runway-card [data-a="runway-edit"]'); await page.fill('#rw-spend', ''); await page.click('[data-a="runway-save"]');
  eq(await page.evaluate(() => ['spend' in S.user, /How long could you live/.test(document.querySelector('#runway-card').innerText)]), [false, true], 'an emptied estimate is removed, and the card goes back to its invitation');
  await page.evaluate(() => { S.user.spend = 100000; UI.space = 'business'; navigate('dashboard'); });
  ok(/No pace to measure yet/.test(await text(page, '#runway-card')) && await page.locator('#runway-card [data-a="runway-edit"]').count() === 2 && await page.locator('#co-empty').count() === 1, 'company side with nothing in it: its own empty state, and a runway card that asks for its numbers');
  await page.evaluate(() => { S.accounts.push({ id: 'co1', name: 'Co', institution: 'Wise', type: 'savings', currency: 'BRL', scope: 'business', purpose: '', opening: 900000 }); const b = bookOf(S, bookKeyOf('BRL')); b.plan.lines.push({ id: 'cl1', categoryId: 'co-tax', subcategoryId: null, name: 'DAS', pay: 'fixed', accountId: 'co1', end: null, note: '', plan: { 2026: Array(12).fill(300000) } }); navigate('dashboard'); });
  card = await text(page, '#runway-card');
  ok(/Company runway/.test(card) && /3 months of runway/.test(card) && /The company passed the 3 months goal! Well done\./.test(card) && /Adjust/.test(card), 'company side: its own runway from its own account and costs, with its own estimate to adjust', card);
  await page.evaluate(() => { UI.space = 'personal'; S.plan.lines.push({ id: 'pl9', categoryId: 'home', subcategoryId: null, name: 'Rent', pay: 'fixed', accountId: null, end: null, note: '', plan: { 2026: Array(12).fill(100000) } }); navigate('dashboard'); });
  ok(await page.locator('#runway-card').count() === 1, 'the current month shows the days of freedom');
  await page.evaluate(() => { S.month = '2026-09'; navigate('dashboard'); });
  ok(await page.locator('#runway-card').count() === 0, 'a past month does not show today’s days of freedom');
  eq(errors, [], 'other ways: no error in the console');
  await browser.close();

  // ---------- 4. two payments, Portuguese, a phone ----------
  for (const width of [390, 320]) {
    ({ browser, page, errors } = await open({ lang: 'pt', viewport: { width, height: 800 }, mobile: true, touch: true, server: { confirmEmail: false } }));
    await signup(page, 'Rui', 'rui@example.org');
    const wide = () => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    await page.click('[data-a="ob-dream"][data-v="safety"]'); eq(await page.evaluate(() => ob().cost), '10.000', `pt, ${width}px: the emergency fund starts at 10.000`);
    ok(/Quanto você quer ter guardado/.test(await text(page, '.onb')), `pt, ${width}px: the emergency fund asks how much to have put aside`);
    eq(await wide(), 0, `pt, ${width}px: screen 1 is not wider than the phone`);
    eq(await page.evaluate(() => { const c = document.querySelector('.ob-foot .ob-cheer').getBoundingClientRect(), b = document.querySelector('.ob-foot .btn.primary').getBoundingClientRect(); return [c.bottom <= b.top, /Ótima meta/.test(document.querySelector('.ob-cheer').innerText)]; }), [true, true], `pt, ${width}px: the cheer sits over the Next button, which keeps the full width`);
    eq(await page.evaluate(() => Math.min(...[...document.querySelectorAll('.ob-dream, .ob-foot .btn')].map(e => e.getBoundingClientRect().height)) >= 44), true, `pt, ${width}px: every button is at least 44px tall`);
    eq(await page.evaluate(() => { const b = [...document.querySelectorAll('.ob-dream')].map(e => e.getBoundingClientRect()); return [b[0].top === b[1].top, b[2].top === b[3].top, b[2].top > b[0].top]; }), [true, true, true], `pt, ${width}px: the dreams stay two by two`);
    await page.click('[data-a="onboard-save"]'); await page.waitForSelector('#ob-pay0');
    eq(await page.evaluate(() => Math.min(...[...document.querySelectorAll('.ob-slide input[type=range]')].map(e => e.getBoundingClientRect().height)) >= 44), true, `pt, ${width}px: every slider is at least 44px tall to the finger`);
    await page.fill('#ob-pay0', '3.000'); await page.fill('#ob-spend', '1.500'); await page.fill('#ob-saved', '0'); eq(await wide(), 0, `pt, ${width}px: screen 2 is not wider than the phone`);
    await page.click('[data-a="ob-next"]'); await page.waitForSelector('.ob-facts'); eq(await wide(), 0, `pt, ${width}px: the reveal is not wider than the phone`);
    const rv = await text(page, '.onb');
    ok(/Seus dias de liberdade começam hoje/.test(rv) && /Sobram R\$ 1\.500 por mês/.test(rv) && /Reserva de emergência: Abril 2027/.test(rv), `pt, ${width}px: the reveal in Portuguese (10.000 at 1.500 a month from October: 7 months)`, rv.slice(0, 400));
    await page.click('[data-a="ob-next"]'); await page.waitForSelector('.ob-ways'); eq(await wide(), 0, `pt, ${width}px: the last screen is not wider than the phone`);
    eq(await page.locator('.ob-way').count(), 2, `pt, ${width}px: two ways on, plan the month and fixed costs (bringing a spreadsheet is left to the computer on a phone)`);
    eq(await page.evaluate(() => { const d = document.querySelector('.ob-dots').getBoundingClientRect(), c = document.querySelector('.onb').getBoundingClientRect(); return Math.abs((d.left + d.right) / 2 - (c.left + c.right) / 2) <= 1; }), true, `pt, ${width}px: the dots are in the middle of the card`);
    await page.click('.ob-way[data-go="plan"]'); await page.waitForFunction(() => !!UI.session && !!UI.drawer);
    eq(await page.evaluate(() => [UI.route, UI.drawer.kind, S.pay[2026].map(r => [r.to, r.half, r.values[9]]), 'company' in S.user]), ['plan', 'line-form', [['fixed', 0, 150000], ['savings', 0, 150000]], false],
      `pt, ${width}px: "fixed costs" opens a new fixed cost; what goes out is routed to fixed costs and the 1.500 left over to savings`);
    await page.evaluate(() => { A.close(); navigate('dashboard'); }); eq(await wide(), 0, `pt, ${width}px: the dashboard with its days card is not wider than the phone`);
    eq(await page.evaluate(() => { const c = document.querySelector('#co-ask'), bs = [...c.querySelectorAll('[data-a="co-answer"]')].map(b => b.getBoundingClientRect()), q = c.querySelector('b').getBoundingClientRect(); return [/Você também tem uma empresa \(PJ ou MEI\)\?/.test(c.innerText), bs.every(r => r.height >= 44), bs[0].top >= q.bottom, c.scrollWidth <= c.clientWidth]; }), [true, true, true, true], `pt, ${width}px: the company question in Portuguese, its two buttons under it and a thumb high`);
    eq(errors, [], `pt, ${width}px: no error in the console`);
    await browser.close();
  }

  // ---------- 4b. with motion: confetti when the reveal holds good news, and only then ----------
  ({ browser, page, errors } = await open({ lang: 'en', motion: true, server: { confirmEmail: false } }));
  await signup(page, 'Lia', 'lia@example.org'); await page.click('[data-a="ob-dream"][data-v="trip"]'); await page.click('[data-a="onboard-save"]'); await page.waitForSelector('#ob-pay0');
  await page.click('[data-a="ob-next"]'); await page.waitForSelector('.ob-facts');
  eq(await page.evaluate(() => { const c = document.getElementById('confetti'), cs = c && getComputedStyle(c); return c ? [c.children.length >= 70, c.getAttribute('aria-hidden'), cs.pointerEvents, cs.position] : null; }), [true, 'true', 'none', 'fixed'], 'reveal, with the averages left as they are (500 left over, 30 days): confetti, hidden from screen readers and never in the way of a click');
  await page.waitForTimeout(1300);      // the figure counts up
  ok(/30 days of freedom/.test(await text(page, '.onb')) && /R\$ 500 left each month/.test(await text(page, '.onb')), 'reveal: the averages give 30 days of freedom and 500 left each month');
  await page.click('[data-a="ob-next"]'); await page.waitForSelector('.ob-ways'); await page.waitForFunction(() => !document.getElementById('confetti'), null, { timeout: 8000 });
  ok(true, 'confetti: gone by itself after a few seconds');
  await page.click('[data-a="ob-back"]'); await page.waitForSelector('.ob-facts'); eq(await page.locator('#confetti').count(), 0, 'confetti: not played again on the way back');
  await page.click('[data-a="ob-back"]'); await page.fill('#ob-pay0', '3.000'); await page.fill('#ob-saved', '0'); await page.click('[data-a="ob-next"]'); await page.waitForSelector('.ob-facts');
  eq(await page.locator('#confetti').count(), 0, 'confetti: none over "more goes out than comes in" with nothing put aside');
  eq(errors, [], 'with motion: no error in the console');
  await browser.close();

  // ---------- 5. an account with history: the example account ----------
  ({ browser, page, errors } = await open({ lang: 'en', account: 'example' }));
  const r = await page.evaluate(() => { const x = runway(S, S.today, CUR); return [x.days, x.burn.basis, x.cushion.basis, x.days === runwayDays(x.cushion.amount, x.burn.amount)]; });
  ok(r[0] > 0 && r[1] === 'actual' && r[3], 'example account: days of freedom from real months of spending', r);
  const shown = await page.evaluate(() => { const x = runway(S, S.today, CUR), f = rwFigure(x.days, false); return [document.querySelector('#runway-card .rw-n').textContent, fmt.num(f.n), document.querySelector('#runway-card .rw-n').dataset.count, String(f.n)]; });
  ok(shown[0] === shown[1] && shown[2] === shown[3], 'example account: the card prints the figure the engine gives', shown);
  await page.evaluate(() => navigate('goals'));
  const cards = await page.evaluate(() => [...document.querySelectorAll('.card.goal')].map(c => [c.querySelector('b').textContent, !!c.querySelector('.arrive')]));
  const want = await page.evaluate(() => S.goals.filter(g => g.status === 'active' || g.status === 'paused').map(g => { const st = goalStatus(S, g, S.today); return [g.name, g.status === 'active' && st.target !== null && st.state !== 'reached']; }));
  eq([cards.length, cards.some(c => c[1])], [want.length, false], 'example account: no goal card carries a date line any more; the date is said in the details (owner, 2026-10-08)');
  eq(errors, [], 'example account: no error in the console');
  await browser.close();
  done('qc-ahead');
})().catch(e => { console.error(e); process.exit(1); });
