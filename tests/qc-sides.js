// QC of the two sides of the app (owner, 2026-10-07: "let's separate the company's view; if the person answers yes a setup for the company opens
// when it is needed; I don't want a switch on every tab, I want two separate dashboards, and the company's a bit different in its design"), and
// of the household's summary made direct the same day ("the most important figures first; To do when a date is near; no Plan vs actual").
//   1. the company's own estimate of what goes out in a month (core/runway.js), by hand;
//   2. the side is chosen in the menu; the company's side is blue, has its own menu and its own dashboard;
//   3. the company's setup in three screens, and what its answers become; leaving it for later;
//   4. the household's summary: five figures first, To do only when a date is near, the goal's date on two lines, buttons that can be found;
//   5. a phone, in three languages.
const { open, ok, eq, done } = require('./pw.js');
const { load } = require('./load.js');
const T = '2026-10-02';

// ---------- 1. the company's estimate ----------
(() => {
  const E = load(), s = E.buildNewState('a@b', 'en', T), acct = (id, cur, opening) => ({ id, name: id, institution: 'Nubank', type: 'savings', currency: cur, scope: 'business', purpose: '', opening });      // what it keeps: the runway counts savings only (2026-10-09)
  s.accounts.push(acct('b1', 'BRL', 1800000)); s.user.spend = 250000;
  const co = E.bookOf(s, 'business:BRL');
  eq([E.monthlyBurn(co, T, 'BRL'), E.runway(co, T, 'BRL').days], [{ amount: 0, basis: null, months: 0 }, null], 'a company with an account and nothing else has no pace: the household’s estimate is not borrowed');
  s.company.spend = { BRL: 400000 };
  eq([E.monthlyBurn(co, T, 'BRL'), E.runway(co, T, 'BRL').days, E.runwayMonths(135), E.monthlyBurn(s, T, 'BRL').amount], [{ amount: 400000, basis: 'estimate', months: 0 }, 135, 4.5, 250000], 'the company’s own estimate is its pace: 18.000 at 4.000 a month is 135 days, 4 and a half months; the household keeps its own');
  s.accounts.push(acct('b2', 'USD', 500000));
  eq(E.monthlyBurn(E.bookOf(s, 'business:USD'), T, 'USD').basis, null, 'an estimate in reais says nothing about the company’s dollars');
})();

(async () => {
  const text = async (p, sel) => (await p.locator(sel).innerText()).replace(/\s+/g, ' ');
  const wide = p => p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  const signup = async (p, name) => { await p.evaluate(() => A['pub-go']({ v: 'signup' })); await p.fill('#au-name', name); await p.fill('#au-email', name.toLowerCase() + '@example.org'); await p.fill('#au-pass', 'UmaSenha2026'); await p.check('#au-accept'); await p.click('[data-a="auth-signup"]'); await p.waitForSelector('#ob-name'); await p.click('[data-a="onboard-save"]'); await p.click('[data-a="ob-finish"]'); await p.waitForFunction(() => !!UI.session); };
  const look = p => p.evaluate(() => { const cs = getComputedStyle(document.documentElement); return [document.documentElement.classList.contains('side-co'), cs.getPropertyValue('--brand').trim(), cs.getPropertyValue('--primary').trim(), cs.getPropertyValue('--cur').trim()]; });

  // ---------- 2. the side is chosen in the menu ----------
  let { browser, page, errors } = await open({ lang: 'en', viewport: { width: 1280, height: 900 }, server: { confirmEmail: false } });
  await signup(page, 'Ana');
  eq(await page.evaluate(() => [document.querySelector('#rail-side').innerHTML, getComputedStyle(document.querySelector('#rail-side')).display, !!document.querySelector('#co-ask'), hasCompany()]), ['', 'none', true, false], 'a new account has no Household | Company choice: the app is the household’s alone and the dashboard asks first (owner: "by default the switch is not shown until they answer")');
  await page.evaluate(() => { S.user.company = true; render(); });      // the answer was yes; the setup is followed below from the menu's choice
  eq(await page.evaluate(() => { const b = document.querySelector('#rail-side .rail-flip'); return [[...document.querySelectorAll('#rail-side [data-a="space"]')].map(x => [x.getAttribute('aria-label'), x.dataset.v, !!x.querySelector('svg')]), !!b.closest('.brand') && b.closest('.rail-tools').contains(document.querySelector('#rail-eye')), document.querySelectorAll('.topbar .space, .topbar .side-tag, .side-seg').length, getComputedStyle(document.querySelector('.bar-bal')).display]; }),
    [[['Switch to Company', 'business', true]], true, 0, 'none'], 'the menu: the two arrows beside the eye, at the top, saying where they go (owner, 2026-10-08: no Household | Company switch any more); nothing about the side in the top bar');
  eq(await look(page), [false, '#3ECF8E', '#006239', 'rgba(0, 98, 57, .47)'], 'the household’s side is green: the brand’s accent, and the current month’s column in its deep green');
  eq(await page.evaluate(() => { const main = getComputedStyle(document.querySelector('.topbar .btn.primary')); return [main.backgroundColor, main.color]; }), ['rgb(0, 98, 57)', 'rgb(250, 250, 250)'], 'the main button is the brand’s deep green with light words (owner, 2026-10-07, after trying the bright one: "in general I like the deep one"; the bright green is kept for what is due now, tests/qc-tidy.js)');

  // ---------- 3. the company's setup ----------
  await page.click('#rail-side [data-a="space"][data-v="business"]'); await page.waitForSelector('#co-setup');
  eq(await look(page), [true, '#5B9DFF', '#006239', 'rgba(31, 78, 158, .5)'], 'the company’s side is blue; the main buttons stay the brand’s green');
  eq(await page.evaluate(() => { const lum = c => { const [r, g, b] = c.match(/[\d.]+/g).map(Number).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return .2126 * r + .7152 * g + .0722 * b; }, tag = getComputedStyle(document.querySelector('.side-tag')), ratio = (a, b) => (Math.max(lum(a), lum(b)) + .05) / (Math.min(lum(a), lum(b)) + .05);
    return [document.querySelector('#rail-side .rail-flip').getAttribute('aria-label'), true, document.querySelector('.side-tag').innerText.trim(), ratio(tag.color, 'rgb(0, 0, 0)') >= 4.5, [...document.querySelectorAll('#nav a')].map(a => a.getAttribute('href').slice(1))]; }),
    ['Switch to Household', true, 'Company', true, ['dashboard', 'transactions', 'plan', 'goals', 'reports', 'accounts', 'imports', 'converter', 'categories', 'settings']], 'Company chosen: the two arrows now lead back to the household, the word “Company” beside the logo, readable, and a menu without the household’s own screens');
  eq(await page.evaluate(() => [UI.route, UI.space, UI.coSetup.step, UI.space, document.querySelector('#co-setup h1').innerText.trim(), document.querySelectorAll('#co-setup .ob-dots i').length, document.querySelectorAll('#co-setup .ob-dots i.now').length, document.querySelector('#co-setup .ob-dots').getAttribute('aria-label'), 'company' in S.user, S.company === undefined || !S.company.name]),
    ['dashboard', 'business', 0, 'business', 'First, what is your company called?', 3, 1, 'Step 1 of 3', true, true], 'a company with nothing yet: its setup opens in the dashboard’s place, three dots, and nothing is written until it is finished');
  await page.fill('#cos-name', 'Studio <b>Lima</b>'); await page.click('[data-a="co-setup-kind"][data-v="mei"]');
  eq(await page.evaluate(() => [document.querySelector('#cos-name').value, [...document.querySelectorAll('[data-a="co-setup-kind"]')].map(b => b.getAttribute('aria-pressed'))]), ['Studio <b>Lima</b>', ['true', 'false']], 'screen 1: the name stays in its field when the kind is chosen');
  await page.click('[data-a="co-setup-next"]'); await page.waitForSelector('#cos-balance');
  await page.click('[data-a="co-setup-cur"][data-v="USD"]');
  eq(await page.evaluate(() => [document.querySelector('.ob-val span').innerText, document.querySelector('#cos-balance-r').dataset.cur]), ['US$', 'USD'], 'screen 2: choosing dollars changes the sign beside the amount');
  await page.click('[data-a="co-setup-cur"][data-v="BRL"]'); await page.selectOption('#cos-bank', 'Inter');
  await page.fill('#cos-balance', '1,8,0'); await page.click('[data-a="co-setup-next"]');
  ok(/1500 or 9,90/.test(await text(page, '#co-setup .banner')) && await page.evaluate(() => UI.coSetup.step) === 1, 'screen 2: an amount that cannot be read is said, and the screen stays');
  await page.fill('#cos-balance', '18.000');
  eq(await page.evaluate(() => [document.querySelector('#cos-balance-r').value, document.querySelector('#cos-balance-r').getAttribute('aria-valuetext')]), ['18000', 'R$ 18.000'], 'screen 2: the slider follows the amount typed');
  await page.click('[data-a="co-setup-next"]'); await page.waitForSelector('#cos-income');
  await page.evaluate(() => { const r = document.querySelector('#cos-income-r'); r.value = 12000; r.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.fill('#cos-costs', '4.000');
  eq([await page.inputValue('#cos-income'), /a transfer to your home’s side/.test(await text(page, '#co-setup')), await page.evaluate(() => S.accounts.filter(a => a.scope === 'business').length)], ['12.000', true, 0], 'screen 3: the slider writes its field; it says what you pay yourself is a transfer, not a cost; still nothing written');
  await page.click('[data-a="co-setup-back"]'); eq(await page.inputValue('#cos-balance'), '18.000', 'Back keeps what was answered'); await page.click('[data-a="co-setup-next"]');
  await page.click('[data-a="co-setup-next"]'); await page.waitForSelector('#co-band');
  eq(await page.evaluate(() => [S.user.company, UI.coSetup, S.company.name, S.company.kind, S.company.spend, S.accounts.filter(a => a.scope === 'business').map(a => [a.name, a.institution, a.currency, a.type, a.opening]), S.company.books.BRL.pay[2026].map(r => [r.name, r.sub, r.to, r.values[8], r.values[9], r.values[11]]), S.user.spend === undefined, pageBookKey(), document.querySelector('#toast').innerText.trim()]),
    [true, null, 'Studio <b>Lima</b>', 'mei', { BRL: 400000 }, [['Inter MEI', 'Inter', 'BRL', 'checking', 1800000]], [['Client payments', 'co-clients', 'fixed', 0, 1200000, 1200000]], true, 'business:BRL', 'Done. This is Studio <b>Lima</b>’s side.'],
    'finishing: the company has its name and kind, an account with its balance, income planned from this month on, and its own estimate of costs; the household’s estimate is untouched');
  // the company's dashboard
  let band = await text(page, '#co-band');
  ok(/Studio <b>Lima<\/b>/.test(band) && /MEI/.test(band) && /BRL/.test(band) && /1 account, R\$ 18\.000,00/.test(band) && await page.locator('#co-band h2 b').count() === 0, 'the band: the company by name (as text, never as markup), its kind, its currency, and what its account holds', band);
  let card = await text(page, '#runway-card');
  ok(/Company runway/.test(card) && /The company’s runway starts with the first amount it keeps/.test(card) && /With R\$ 4\.000 going out a month, R\$ 4\.000 put aside is 30 days/.test(card), 'the dashboard opens with the company’s runway: the 18.000 of its checking account are the month’s money (2026-10-09: counted from savings), so it starts with what it keeps; 4.000 a month', card);
  eq(await page.evaluate(() => [document.querySelectorAll('.hello, #co-ask, #first-steps').length, !!document.querySelector('#insight-card'), !!document.querySelector('#todo'), !document.querySelector('#plan-card') && document.querySelector('.dash-more').innerText.includes(partName('plan')), !!document.querySelector('#planned-month')]), [0, true, true, true, true], 'the company’s page is its own: no greeting and no first steps; its own insight, its To do and its planned month; its plan against actual one click away (2026-10-11: at a glance)');
  await page.click('#runway-card [data-a="runway-edit"]');
  eq(await page.evaluate(() => [UI.drawer.title, UI.drawer.book, document.querySelector('#rw-spend').value, /What you pay yourself is a transfer/.test(document.querySelector('.drawer').innerText)]), ['Company runway', 'business:BRL', '4.000', true], 'Adjust, on the company’s side: its own estimate');
  await page.fill('#rw-spend', '6.000'); await page.click('[data-a="runway-save"]');
  ok(/With R\$ 6\.000 going out a month, R\$ 6\.000 put aside is 30 days/.test(await text(page, '#runway-card')) && await page.evaluate(() => S.company.spend.BRL === 600000 && !('spend' in S.user)), 'the company’s estimate is saved for the company: 6.000 a month; the household’s is not touched');
  await page.click('#co-band [data-a="company-edit"]'); await page.fill('#co-name', 'Lima Co'); await page.selectOption('#co-kind', 'pj'); await page.click('[data-a="company-save"]');
  band = await text(page, '#co-band'); ok(/Lima Co/.test(band) && /PJ/.test(band) && !/MEI/.test(band), 'the band’s button renames the company and changes its kind', band);
  // the month as a sum, once there is something to add up
  await page.evaluate(() => { const a = S.accounts.find(x => x.scope === 'business').id, tx = (id, date, amount, type) => ({ id, accountId: a, date, amount, type, status: 'confirmed', categoryId: null, subcategoryId: null, merchant: 'x', description: 'x' }); S.transactions.push(tx('c1', '2026-10-01', 900000, 'income'), tx('c2', '2026-10-01', -250000, 'expense')); render(); });
  eq(await page.evaluate(() => { const k = document.querySelector('.kpis.eq'); return [[...k.children].map(c => c.classList.contains('op') ? c.innerText.trim() : c.querySelector('.label span').innerText.trim() + ' ' + c.querySelector('.value').innerText.trim()), getComputedStyle(k.querySelector('.kpi')).borderTopWidth, k.querySelectorAll('.card, .kpis').length]; }),
    [['Received R$ 9.000,00', '−', 'Costs R$ 2.500,00', '=', 'Result R$ 6.500,00', 'Transfers out R$ 0,00'], '0px', 0], 'the company’s month reads as a sum on one surface: received, less costs, is the result; what was moved out stands apart');
  // the side stays while moving through the app; a household-only screen goes back to the household
  await page.evaluate(() => navigate('plan'));
  eq(await page.evaluate(() => [pageBookKey(), document.querySelectorAll('.topbar .space, .topbar [data-a="space"]:not(.bar-side *):not(.side-flip)').length, document.querySelector('.side-tag').innerText.trim(), !!document.querySelector('.rail .brand > #brand-tag'), document.querySelectorAll('#topbar .side-tag').length]), ['business:BRL', 0, 'Company', true, 0], 'Plan, on the company’s side: the company’s book, no switch in the top bar; the word “Company” is beside the logo in the side bar, not in the top bar');
  await page.evaluate(() => navigate('transactions')); eq(await page.evaluate(() => [UI.space, filteredTx().length, filteredTx().every(x => isBiz(x.accountId))]), ['business', 2, true], 'Transactions follow the side: the company’s movements');
  await page.click('#rail-side [data-a="space"][data-v="personal"]');
  eq([await look(page), await page.evaluate(() => [UI.route, UI.space, filteredTx().length, document.querySelectorAll('.side-tag:not([hidden])').length])], [[false, '#3ECF8E', '#006239', 'rgba(0, 98, 57, .47)'], ['transactions', 'personal', 0, 0]], 'back to Household from the menu: green again, the same screen, the household’s movements');
  await page.evaluate(() => navigate('dashboard')); eq(await page.locator('#co-ask').count(), 0, 'the dashboard’s question is not asked again: the company was set up');
  await page.evaluate(() => { A.space({ v: 'business' }); navigate('investments'); }); eq(await page.evaluate(() => [UI.space, UI.route, document.documentElement.classList.contains('side-co')]), ['personal', 'investments', false], 'a screen the company does not have opens on the household’s side');
  // a company with two currencies is asked which, on its own side only
  await page.evaluate(() => { S.accounts.push({ id: 'usd1', name: 'Wise USD', institution: 'Wise', type: 'checking', currency: 'USD', scope: 'business', purpose: '', opening: 100000 }); navigate('plan'); A.space({ v: 'business' }); });
  eq(await page.evaluate(() => { const r = [[...document.querySelectorAll('.topbar .space [data-a="space-cur"]')].map(b => b.innerText.trim() + ':' + b.getAttribute('aria-pressed')), !!document.querySelector('.topbar .space .hint')]; A['space-cur']({ v: 'USD' }); r.push(pageBookKey()); navigate('categories'); r.push(document.querySelectorAll('.topbar .space').length); A.space({ v: 'personal' }); navigate('plan'); r.push(document.querySelectorAll('.topbar .space').length); return r; }),
    [['BRL:true', 'USD:false'], true, 'business:USD', 0, 0], 'two company currencies: the top bar asks which, with an (i), on the screens that read a book; not on Categories, and not on the household’s side');
  eq(errors, [], 'two sides and the setup: no error in the console');
  await browser.close();

  // leaving the setup for later
  ({ browser, page, errors } = await open({ lang: 'en', viewport: { width: 1280, height: 900 }, server: { confirmEmail: false } }));
  await signup(page, 'Bo');
  await page.click('#co-ask [data-a="co-answer"][data-v="yes"]'); await page.waitForSelector('#co-setup');
  await page.fill('#cos-name', 'Not yet'); await page.click('[data-a="co-setup-later"]');
  eq(await page.evaluate(() => [UI.coSetup, S.user.coLater, 'company' in S.user, S.accounts.length, !!(S.company && S.company.name), !!document.querySelector('#co-empty'), document.querySelector('#co-band h2').innerText.trim(), document.querySelector('#co-band [data-a="company-edit"]').innerText.trim()]),
    [null, true, true, 0, false, true, 'Your company', 'Name it'], '“Do it later”: only the answer is kept; the company’s side opens empty, unnamed, with the way to name it');
  await page.click('#rail-side [data-a="space"][data-v="personal"]'); await page.click('#rail-side [data-a="space"][data-v="business"]');
  eq(await page.evaluate(() => [!!UI.coSetup, !!document.querySelector('#co-empty')]), [false, true], 'choosing Company again does not start the setup by itself');
  await page.click('#rail-side [data-a="space"][data-v="personal"]'); eq(await page.evaluate(() => [document.querySelectorAll('#co-ask').length, document.querySelectorAll('#rail-side [data-a="space"]').length]), [0, 1], 'back at home the dashboard no longer asks: the answer was yes, and the choice of side stays');

  await page.evaluate(() => A.space({ v: 'personal' }));      // already the household's (the two arrows only lead to the other side)

  // ---------- 4. the household's summary ----------
  eq(await page.evaluate(() => [[...document.querySelectorAll('#view > *')].filter(e => getComputedStyle(e).display !== 'none').map(e => e.id || e.className.split(' ')[0]).slice(0, 4), [...document.querySelectorAll('.kpis .kpi .label span')].map(x => x.innerText.trim()), [...document.querySelectorAll('.kpis .kpi .value')].map(x => x.innerText.trim()), document.querySelectorAll('#plan-card, #todo').length]),
    [['hello', 'first-steps', 'kpis', 'dash-grid'], ['Household net balance', 'Income', 'Spending', 'Left over', 'Still to pay'], ['R$ 0,00', 'R$ 0,00', 'R$ 0,00', '—', '—'], 0], 'the summary of someone still setting up opens with the first steps, then the five figures (the net balance first) and the days of freedom beside the insight; no Plan vs actual, and no To do while nothing has a date');
  const setDue = (due, extra) => page.evaluate(([due, extra]) => { const c3 = S.categories.filter(c => !c.income)[2].id;
    if (!S.accounts.some(a => a.id === 'a1')) S.accounts.push({ id: 'a1', name: 'Main', institution: 'Nubank', type: 'checking', currency: 'BRL', scope: 'personal', purpose: '', opening: 500000 });
    S.plan.lines = [{ id: 'l1', categoryId: c3, subcategoryId: null, name: 'Rent', pay: 'fixed', accountId: 'a1', end: null, note: '', due, plan: { 2026: Array(12).fill(150000) } }]; if (extra) extra.forEach(k => { S.plan.lines[0][k] = undefined; }); render();
    const k = [...document.querySelectorAll('.kpis .kpi')][4]; return [!!document.querySelector('#todo'), k.querySelector('.value').innerText.trim(), k.querySelector('.delta').innerText.trim()]; }, [due, extra]);
  eq(await setDue(8), [true, 'R$ 1.500,00', '1 bill · next on ' + await page.evaluate(() => fmt.date('2026-10-08'))], 'a bill due in 6 days: To do is shown, and “Still to pay” says how much, how many and when the next one is');
  eq(await setDue(25), [false, 'R$ 1.500,00', '1 bill · next on ' + await page.evaluate(() => fmt.date('2026-10-25'))], 'a bill due in 23 days: To do stays away (the figure above still says what is left to pay)');
  eq(await setDue(1), [true, 'R$ 1.500,00', '1 bill'], 'a bill whose day has passed: To do is shown');
  eq(await setDue(null, ['due']), [false, 'R$ 1.500,00', '1 bill'], 'a bill with no due day does not bring To do up by itself');
  eq(await page.evaluate(() => { const c3 = S.categories.filter(c => !c.income)[2].id; S.transactions.push({ id: 'p1', accountId: 'a1', date: S.today, amount: -150000, type: 'expense', status: 'confirmed', categoryId: c3, subcategoryId: null, merchant: 'x', description: 'x' }); render(); const k = [...document.querySelectorAll('.kpis .kpi')][4]; return [k.querySelector('.value').innerText.trim(), k.querySelector('.delta').innerText.trim()]; }), ['—', 'Every bill of the month is paid'], 'once it is paid, nothing is left to pay');
  // a goal's card: under its line only Contribute and Details; the date it is reached is said once, in the details (owner, 2026-10-08)
  await page.evaluate(() => { S.goals.push({ id: 'g1', name: 'Trip', kind: 'goal', target: 600000, deadline: null, accountId: null, status: 'active', note: '', plan: { 2026: [0, 0, 0, 0, 0, 0, 0, 0, 0, 40000, 40000, 40000] } }); S.goalMoves.push({ id: 'm1', goalId: 'g1', date: S.today, amount: 120000, start: true }); navigate('goals'); });
  eq(await page.evaluate(() => { const c = document.querySelector('.card.goal'); return [!!c.querySelector('.arrive'), [...c.querySelectorAll('.g-foot button')].map(b => b.innerText.trim()), getComputedStyle(c.querySelector('.g-foot')).borderTopStyle]; }), [false, ['Contribute', 'Details'], 'solid'], 'a goal’s card: no date line, and under its dividing line only Contribute and Details');
  await page.click('.card.goal [data-a="goal-open"]');
  eq(await page.evaluate(() => { const d = document.querySelector('.drawer'); return [(d.innerText.match(/September 2027/g) || []).length, /You get there in/.test(d.innerText), ['out', 'in'].every(k => !!d.querySelector(`[data-a="goal-move"][data-dir="${k}"]`)), !!d.querySelector('[data-a="whatif"]')]; }), [1, false, true, true], 'its details say once when it is reached, and have Withdraw and What if…?');
  await page.evaluate(() => A.close());
  eq(await page.evaluate(() => getComputedStyle(document.querySelector('.plan td.cur')).backgroundColor), 'rgba(0, 98, 57, 0.47)', 'tables: the current month’s column is the brand’s deep green, not a faint grey');
  await page.evaluate(() => navigate('dashboard'));
  eq(await page.evaluate(() => [...document.querySelectorAll('#goals-card .card-h a, #recent-card .card-h a, #runway-card .card-h button, #insight-card .card-h button')].map(b => [b.classList.contains('ghost'), getComputedStyle(b).borderTopColor !== 'rgba(0, 0, 0, 0)', b.classList.contains('go') ? !!b.querySelector('svg') : true])), Array(await page.locator('#goals-card .card-h a, #recent-card .card-h a, #runway-card .card-h button, #insight-card .card-h button').count()).fill([false, true, true]),
    'the buttons at the top of the summary’s cards are outlined, and the ones that lead to a page carry an arrow');
  ok(await page.locator('#goals-card .card-h a.go').count() === 1 && await page.evaluate(() => !document.querySelector('#recent-card') && document.querySelector('.dash-more').innerText.includes(partName('recent'))), 'the summary has its way to Goals; the latest transactions one click away (2026-10-11: at a glance)');
  eq(errors, [], 'the summary: no error in the console');
  await browser.close();

  // ---------- 5. a phone, three languages ----------
  for (const [lang, width, home, co] of [['en', 390, 'Household', 'Company'], ['es', 390, 'Hogar', 'Empresa'], ['pt', 320, 'Casa', 'Empresa']]) {
    ({ browser, page, errors } = await open({ lang, account: 'example', viewport: { width, height: 720 }, touch: true, mobile: true }));
    const where = `${lang}, ${width}px: `;
    eq(await page.evaluate(() => { const b = document.querySelector('.navbar .side-flip'), r = b.getBoundingClientRect(), bell = document.querySelector('.navbar .bell').getBoundingClientRect(); return [getComputedStyle(document.querySelector('.rail')).display, b.dataset.v, b.getAttribute('aria-label') === t('Switch to Company'), r.height >= 40 && r.width >= 40, r.right <= bell.left && Math.abs(r.top - bell.top) <= 2 && r.left >= 0, !!b.querySelector('svg'), document.querySelectorAll('.bar-side').length]; }), ['none', 'business', true, true, true, true, 0], where + 'no side menu: the button with two arrows beside the bell goes to the other side, a thumb high (the old switch row is gone)');
    eq(await page.evaluate(() => [document.querySelectorAll('#view .kpis').length, document.documentElement.scrollWidth - innerWidth]), [0, 0], where + 'the household’s dashboard on a phone has no row of figures (owner, 2026-10-08: qc-summary-simple) and is no wider than the phone');
    await page.click('.navbar .side-flip'); await page.waitForSelector('#co-band');
    eq(await page.evaluate(() => { const b = document.querySelector('.bar-bal small'), k = document.querySelector('.kpis.eq'), band = document.querySelector('#co-band'); return [b.innerText.trim() === t('Company net balance'), document.querySelector('.navbar .side-flip').dataset.v, document.documentElement.classList.contains('side-co'), !k, band.getBoundingClientRect().right <= innerWidth, band.querySelector('.btn').getBoundingClientRect().height >= 44, document.documentElement.scrollWidth - innerWidth]; }),
      [true, 'personal', true, true, true, true, 0], where + 'the company’s side on a phone: the panel says so (the company’s net balance), the page is blue, its band fits, no row of figures, and nothing is wider than the phone');
    ok(!/NaN|undefined|null|\{[a-z]+\}/.test(await text(page, '#view')), where + 'the company’s dashboard reads whole');
    await page.click('.navbar [data-a="sheet"]'); await page.waitForSelector('.sheet .nav');
    eq(await page.evaluate(() => [...document.querySelectorAll('.sheet .nav a')].map(a => a.getAttribute('href').slice(1)).filter(x => ['investments', 'recurring', 'openfinance'].includes(x)).length), 0, where + 'More, on the company’s side, leaves out the household’s own screens');
    await page.evaluate(() => A.close()); await page.click('.navbar .side-flip');
    eq(await page.evaluate(() => [UI.space, document.querySelector('.bar-bal small').innerText.trim() === t('Household net balance')]), ['personal', true], where + 'the same button goes back');
    // the setup on a phone
    await page.evaluate(() => { S.accounts = S.accounts.filter(a => a.scope !== 'business'); S.transactions = S.transactions.filter(x => S.accounts.some(a => a.id === x.accountId)); delete S.company; render(); });
    eq(await page.evaluate(() => [document.querySelectorAll('.navbar .side-flip').length, !!document.querySelector('.bar-bal .bb-link'), !!document.querySelector('#co-ask')]), [0, true, true], where + 'with no company the panel at the top has no button to change side (the balance stays), and the dashboard asks');
    await page.click('#co-ask [data-a="co-answer"][data-v="yes"]'); await page.waitForSelector('#co-setup');
    for (let i = 0; i < 3; i++) {
      eq(await page.evaluate(() => { const c = document.querySelector('#co-setup'); return [document.documentElement.scrollWidth - innerWidth, [...c.querySelectorAll('.btn, .seg button, input[type=range]')].every(b => b.getBoundingClientRect().height >= 44), !/NaN|undefined|null|\{[a-z]+\}/.test(c.innerText)]; }), [0, true, true], where + `setup, screen ${i + 1}: fits the phone, everything a thumb high, reads whole`);
      if (i < 2) await page.click('[data-a="co-setup-next"]');
    }
    await page.fill('#cos-costs', '2.000'); await page.click('[data-a="co-setup-next"]'); await page.waitForSelector('#co-band');
    eq(await page.evaluate(() => [S.accounts.filter(a => a.scope === 'business').length, S.company.spend.BRL, document.documentElement.scrollWidth - innerWidth]), [1, 200000, 0], where + 'finishing the setup with only the costs answered: an account at zero and the estimate');
    eq(errors, [], where + 'no error in the console');
    await browser.close();
  }
  done('qc-sides');
})();
