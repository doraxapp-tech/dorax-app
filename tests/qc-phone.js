// QC of the phone's own layout (owner, 2026-10-07: "separate the mobile version too: intuitive, easy to use, fun in a way, with the main and
// most important functions in the palm of the person's hand").
//   1. the bar at the foot: two screens, the round + in the middle, two screens; "More" is in the top bar;
//   2b. the panel at the top (who, the bell, More, Household | Company) in the side's colour; nothing moves from one screen to the next;
//   2. the round + opens the short list of things to record, in the words of the side in use, with the screen's own "new" first;
//   3. the dashboard on a phone: days of freedom first, the four things to record as round buttons, the month's figures as a row to swipe;
//   4. none of it shows on a computer; three languages; a curiosity sits above the bar.
const { open, ok, eq, done } = require('./pw.js');

(async () => {
  const text = async (p, sel) => (await p.locator(sel).innerText()).replace(/\s+/g, ' ');
  let { browser, page, errors } = await open({ lang: 'en', account: 'example', viewport: { width: 390, height: 844 }, touch: true, mobile: true });

  // ---------- 1. the bars ----------
  eq(await page.evaluate(() => { const bar = document.querySelector('#tabbar'), kids = [...bar.children], fab = bar.querySelector('.fab'), r = fab.getBoundingClientRect(), b = bar.getBoundingClientRect(), cs = getComputedStyle(fab);
    return [kids.map(k => k.classList.contains('fab') ? '+' : k.getAttribute('href')), Math.abs((r.left + r.right) / 2 - innerWidth / 2) <= 2, r.width >= 56 && r.height >= 56, r.top < b.top + 6, cs.backgroundColor + ' ' + cs.color, cs.borderRadius, fab.getAttribute('aria-label'), fab.getAttribute('aria-haspopup'), kids.filter(k => !k.classList.contains('fab')).every(k => k.getBoundingClientRect().height >= 44)]; }),
    [['#dashboard', '#transactions', '+', '#plan', '#goals'], true, true, true, 'rgb(0, 98, 57) rgb(255, 255, 255)', '50%', 'Add', 'dialog', true], 'the bar at the foot: Dashboard, Transactions, the round + in the exact middle (raised, a full thumb wide, #006239 with a white +: owner, 2026-10-10), Plan, Goals');
  // the screen in use (owner, 2026-10-10: "take the grey hover off the active tab and put a green line on top, #006239; the active tab's icon #00754A")
  eq(await page.evaluate(() => { const a = document.querySelector('#tabbar a[aria-current="page"]'), cs = getComputedStyle(a), line = getComputedStyle(a, '::before'), bar = document.querySelector('#tabbar').getBoundingClientRect(), r = a.getBoundingClientRect();
      return [cs.backgroundColor, line.backgroundColor, Math.round(r.top + parseFloat(line.top)) <= Math.round(bar.top) + 1, parseFloat(line.height), getComputedStyle(a.querySelector('svg')).color]; }),
    ['rgba(0, 0, 0, 0)', 'rgb(0, 98, 57)', true, 3, 'rgb(0, 117, 74)'], 'the tab in use: no grey behind it; a #006239 line along the bar’s top edge over it; its icon #00754A');
  eq(await page.evaluate(() => { const m = document.querySelector('.navbar .more-btn'), r = m.getBoundingClientRect(), old = document.querySelector('.navbar .btn.primary'); return [r.width >= 38 && r.height >= 38, m.getAttribute('aria-label'), r.right <= innerWidth, !old || getComputedStyle(old).display === 'none', !!document.querySelector('.navbar .bell'), !!document.querySelector('.navbar .bar-who'), document.querySelectorAll('.bar-side [data-a="space"]').length + document.querySelectorAll('.navbar .side-flip').length * 10 + document.querySelectorAll('.bar-bal .bb-link').length * 100]; }),
    [true, 'More', true, true, true, true, 110], 'the top panel: who is using it at the left; the button with two arrows, the bell and “More” at the right; the net balance under them (2026-10-08: no Household | Company row); the + is no longer up there');
  await page.click('.navbar [data-a="sheet"]'); await page.waitForSelector('.sheet .nav');
  ok(await page.locator('.sheet .nav a[href="#accounts"]').count() === 1 && await page.locator('.sheet [data-a="logout"]').count() === 1, '“More” opens the rest of the app from the top bar'); await page.keyboard.press('Escape');

  // ---------- 2. the round + ----------
  // v149 (owner, 2026-10-11: "the middle button is out of control, too many buttons; filter them by tab"): the three that are recorded from anywhere,
  // then what this screen is for, then "All actions" folded
  const sheetNow = () => page.evaluate(() => { const s = document.querySelector('.sheet.quick'), h = s.querySelector('.quick-h'), more = s.querySelector('.quick-all');
    return { base: [...s.querySelectorAll('.quick-base button')].map(b => b.dataset.v + ':' + b.innerText.trim()), h: h ? h.textContent.trim() : '', here: [...s.querySelectorAll('.quick-h + .quick-grid button')].map(b => b.dataset.v),
      rest: [...s.querySelectorAll('#quick-rest:not([hidden]) button')].map(b => b.dataset.v), more: more ? [more.innerText.trim(), more.getAttribute('aria-expanded')] : null }; });
  await page.click('#tabbar .fab'); await page.waitForSelector('.sheet.quick');
  eq(await page.evaluate(() => { const s = document.querySelector('.sheet.quick'), bs = [...s.querySelectorAll('button[data-v]')]; return [s.getAttribute('role'), s.querySelector('h2').innerText.trim(), [...s.querySelectorAll('.quick-base button')].map(b => b.getAttribute('aria-label')), bs.every(b => b.getBoundingClientRect().height >= 56 && b.querySelector('svg')), s.getBoundingClientRect().bottom <= innerHeight + 1, document.activeElement.dataset.v, s.lastElementChild.classList.contains('quick-base')]; }),
    ['dialog', 'What do you want to do?', ['Record an expense', 'Record an income', 'Transfer money'], true, true, 'expense', true], 'the round + opens a short list: each a big button with its icon; the three at its foot, said in full to a screen reader, the focus on the expense');
  eq(await sheetNow(), { base: ['expense:Expense', 'income:Income', 'transfer:Transfer'], h: 'In Dashboard', here: ['pay', 'save', 'import'], rest: [], more: ['All actions', 'false'] }, 'on the dashboard: an expense, an income, a transfer side by side; then “In Dashboard”: pay a bill, add to a goal, import; the rest folded under “All actions”');
  await page.click('.quick-all');
  eq(await sheetNow().then(x => [x.rest, x.more]), [['goal', 'cost', 'limit', 'account'], ['Fewer actions', 'true']], '“All actions” unfolds the rest in the same list, so nothing is lost');
  eq(await page.evaluate(() => [document.activeElement.classList.contains('quick-all'), [...document.querySelectorAll('.sheet.quick button')].every(b => b.getBoundingClientRect().height >= 44)]), [true, true], 'the focus stays on it; every button a thumb high');
  await page.click('.quick-all'); eq(await sheetNow().then(x => [x.rest, x.more]), [[], ['All actions', 'false']], 'and folds it again');
  await page.keyboard.press('Escape'); eq(await page.locator('.sheet.quick').count(), 0, 'Escape closes it');
  await page.click('#tabbar .fab'); eq(await sheetNow().then(x => x.rest), [], 'opened again, it starts folded');
  for (const [route, h, here] of [['transactions', 'In Transactions', ['import', 'account']], ['plan', 'In Plan', ['pay', 'cost', 'limit']], ['goals', 'In Goals', ['save', 'goal']], ['reports', 'In Reports', ['limit', 'import']], ['categories', 'In Categories & rules', ['limit']]]) {
    await page.evaluate(r => { A.close(); navigate(r); A.quick(); }, route);
    eq(await sheetNow().then(x => [x.base.length, x.h, x.here]), [3, h, here], `${route}: the three, then what ${route} is for`);
  }
  await page.evaluate(() => { A.close(); navigate('dashboard'); });
  const pick = async v => { await page.click('#tabbar .fab'); if (!(await page.locator(`.sheet.quick [data-v="${v}"]`).count())) await page.click('.quick-all'); await page.click(`.sheet.quick [data-v="${v}"]`); };
  await pick('expense'); eq(await page.evaluate(() => [UI.drawer.kind, UI.drawer.draft.type, UI.sheet, isBiz(UI.drawer.draft.accountId)]), ['tx', 'expense', false, false], '“An expense” opens a new transaction, an expense, in a household account'); await page.evaluate(() => A.close());
  await pick('income'); eq(await page.evaluate(() => [UI.drawer.kind, UI.drawer.draft.type, document.querySelector('.tx-kind [aria-pressed="true"]').dataset.v]), ['tx', 'income', 'income'], '“An income” opens it already set as income'); await page.evaluate(() => A.close());
  await pick('pay'); eq(await page.evaluate(() => [UI.route, !!UI.drawer]), ['plan', false], '“Pay a bill” goes to the plan, where each bill has its button');
  await pick('cost'); eq(await page.evaluate(() => [UI.drawer && UI.drawer.kind, !!document.querySelector('[data-a="pg-only-line"]')]), ['plan-guide', true], '“Add a fixed cost”, the first time, with no limit yet: “Plan your month” first, with “Only add the fixed cost” (v146)');
  await page.click('[data-a="pg-only-line"]'); eq(await page.evaluate(() => UI.drawer && UI.drawer.kind), 'line-form', 'and that opens a new fixed cost'); await page.evaluate(() => A.close());
  await pick('transfer'); eq(await page.evaluate(() => [UI.drawer.kind, UI.drawer.draft.type, !!document.querySelector('#d-xfer')]), ['tx', 'transfer', true], '“Transfer money” opens a transaction already set as a transfer, asking for the other account'); await page.evaluate(() => A.close());
  await pick('goal'); eq(await page.evaluate(() => UI.drawer && UI.drawer.kind), 'goal-form', '“Create a goal” opens a new goal'); await page.evaluate(() => A.close());
  eq(await page.evaluate(() => quickItems().some(q => q[0] === 'import')), true, 'importing a statement is offered on a phone (owner, 2026-10-10: “let phone users import from the phone”)');
  await page.evaluate(() => navigate('accounts')); await page.click('#tabbar .fab');
  eq(await sheetNow().then(x => [x.base.length, x.here]), [3, ['main', 'import']], 'on a screen with a “new” of its own that is not in the list (Accounts), it comes first after the three');
  await page.click('.quick-grid [data-v="main"]'); eq(await page.evaluate(() => UI.drawer && UI.drawer.kind), 'account', 'and opens a new account'); await page.evaluate(() => A.close());
  await pick('save'); eq(await page.evaluate(() => [UI.route, !!UI.drawer, S.goals.filter(g => g.status === 'active').length > 1]), ['goals', false, true], '“Put into a goal”, with several goals: the goals page, to choose one');
  eq(await page.evaluate(() => { const keep = S.goals; S.goals = keep.filter(g => g.status === 'active').slice(0, 1); A['quick-go']({ v: 'save' }); const r = [UI.drawer && UI.drawer.kind, UI.drawer && UI.drawer.draft.goalId === S.goals[0].id, UI.drawer && UI.drawer.draft.dir]; A.close(); S.goals = keep; navigate('dashboard'); return r; }), ['goal-move', true, 'in'], 'with one goal: straight to putting money into it');

  // ---------- 2b. the panel at the top, and nothing moving from one screen to the next ----------
  // owner, 2026-10-07: "the menu bar on the phone changes position depending on the tab that is open, fix that" and "make a top panel, green,
  // with the person's name, their picture, the switch, the bell and the three dots, and everything else below it"
  eq(await page.evaluate(() => { const nav = document.querySelector('.navbar'), cs = getComputedStyle(nav), who = document.querySelector('.bar-who'), side = document.querySelector('.bar-bal'), r = who.getBoundingClientRect(), h1 = document.querySelector('.pagehead h1').getBoundingClientRect();
    return [cs.backgroundImage.includes('rgba(0, 98, 57, 0.26)') && cs.backdropFilter.includes('blur') && cs.backgroundColor === 'rgba(0, 0, 0, 0.78)' ? 'glass' : cs.backgroundImage + ' ' + cs.backgroundColor, getComputedStyle(side).backgroundImage.includes('rgba(0, 98, 57, 0.12)') && getComputedStyle(side).backgroundColor === 'rgba(0, 0, 0, 0)' ? 'fade' : getComputedStyle(side).backgroundImage, cs.position, who.getAttribute('href'), who.querySelector('b').innerText.trim(), !!who.querySelector('.avatar svg'), /^Good (morning|afternoon|evening)$/.test(who.querySelector('small').innerText.trim()), r.top >= 12 && r.height >= 44, side.getBoundingClientRect().bottom <= h1.top, document.querySelector('meta[name="theme-color"]').content]; }),
    ['glass', 'fade', 'sticky', '#profile', 'Alex', true, true, true, true, '#00190F'], 'the panel at the top is glass with a breath of the brand’s green fading into black (owner, 2026-10-09: "take the green off the top menu"): the person’s picture and name (they lead to the profile) with room above them, the net balance under them, the screen’s title below the panel; the browser’s own bar takes the same green');
  eq(await page.evaluate(() => { const bar = document.querySelector('#tabbar'), b = getComputedStyle(bar), r = bar.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.right) === innerWidth, Math.round(r.bottom) === innerHeight, b.backgroundColor, b.backgroundImage, b.borderTopWidth, b.borderRadius]; }),
    [0, true, true, 'rgb(0, 0, 0)', 'none', '1px', '0px'], 'the bar at the foot is fixed on the screen’s bottom edge, full width, black, a subtle line above it (owner, 2026-10-09: "not floating as now")');
  const routes = await page.evaluate(() => ROUTES.map(r => r[0]));
  const places = [];
  await page.evaluate(() => { window.__fab = document.querySelector('#tabbar .fab'); });
  for (const r of routes) {
    await page.evaluate(r => navigate(r), r);
    places.push(await page.evaluate(() => JSON.stringify(['.bar-left', '.navbar .bell', '.more-btn', '.navbar .side-flip', '#tabbar', '#tabbar .fab', ...[...document.querySelectorAll('#tabbar a')].map((a, i) => `#tabbar a:nth-of-type(${i + 1})`)].map(s => { const b = document.querySelector(s).getBoundingClientRect(); return s.startsWith('#tabbar a') ? [Math.round((b.left + b.right) / 2), Math.round(b.top), Math.round(b.height)] : [Math.round(b.left), Math.round(b.top), s === '.pagehead h1' || s === '.bar-left' ? 0 : Math.round(b.width), Math.round(b.height)]; }))));      // a tab is measured by its middle: the mark of the screen in use is a little wider than its column, on purpose
  }
  // (owner, 2026-10-09: "the household's net balance shows on every screen on the phone; it belongs to Resumen")
  eq(await page.evaluate(rs => rs.filter(r => { navigate(r); return !!document.querySelector('.bar-bal'); }), routes), ['dashboard'], 'the side’s net balance, with its eye, is on the summary only');
  eq([routes.length >= 12, new Set(places).size], [true, 1], 'on every screen of the app the panel’s parts and the bar at the foot are at the same place and the same size (the screens of the bar show no title since 2026-10-08, tests/qc-titles below)', places.filter((x, i) => x !== places[0]).length);
  eq(await page.evaluate(() => [window.__fab === document.querySelector('#tabbar .fab'), document.querySelectorAll('#tabbar [aria-current="page"]').length, document.documentElement.scrollWidth - innerWidth]), [true, 0, 0], 'the bar at the foot is not drawn again from one screen to the next (its round + does not play its entrance each time); only the mark moves, and a screen that is not in the bar marks none');
  await page.evaluate(() => navigate('goals'));
  // since v122 the page's name is the bar's: "Goals" (the savings are in Accounts & savings), one name with no short form
  eq(await page.evaluate(() => { const h = document.querySelector('.pagehead h1'), m = document.querySelector('.pagehead .month').getBoundingClientRect(), r = h.getBoundingClientRect(); return [h.innerText.trim(), !h.querySelector('.h-short'), Math.abs((m.top + m.bottom) / 2 - (r.top + r.bottom) / 2) <= 3, document.querySelector('#tabbar [aria-current="page"]').getAttribute('href')]; }), ['Goals', true, true, '#goals'], 'a phone’s title is the name the bar at the foot uses, so the month sits beside it on one row');
  await page.evaluate(() => navigate('dashboard'));

  // the mark of the screen in use follows the bar's own edge (owner, 2026-10-07: "the active border is not consistent with the tab bar's border")
  for (const [route, edge] of [['dashboard', 'left'], ['goals', 'right'], ['transactions', null]]) {
    await page.evaluate(r => navigate(r), route);
    eq(await page.evaluate(edge => { const bar = document.querySelector('#tabbar'), b = bar.getBoundingClientRect(), a = bar.querySelector('[aria-current="page"]'), r = a.getBoundingClientRect();
      return [Math.round(r.top - b.top) >= 5, Math.round(b.bottom - r.bottom) >= 5, edge === 'left' ? Math.round(r.left - b.left) >= 6 : edge === 'right' ? Math.round(b.right - r.right) >= 6 : true, parseFloat(getComputedStyle(a).borderRadius), getComputedStyle(a).marginLeft, getComputedStyle(a).webkitTapHighlightColor]; }, edge),
      [true, true, true, 21, '0px', 'rgba(0, 0, 0, 0)'], `the mark on ${route}: inside the bar, clear of its edges above, below and at the side, no reaching out of its cell, no grey flash on a tap`);
  }
  await page.evaluate(() => navigate('dashboard'));
  // the page itself stays still and the app's column scrolls, so what is pinned to the screen cannot move (owner, 2026-10-07: "the bar still moves in
  // the iOS web app, when I add it to my iPhone's home screen"); and there is more room above the name (iOS draws its clock and a blur up there)
  eq(await page.evaluate(() => { const w = document.querySelector('.work'), cs = s => getComputedStyle(document.querySelector(s)), bar = () => Math.round(document.querySelector('#tabbar').getBoundingClientRect().top), before = bar(); w.scrollTop = 600;
    return [getComputedStyle(document.documentElement).overflowY, getComputedStyle(document.body).overflowY, cs('.work').overflowY, cs('.app').position, w.scrollTop > 300, window.scrollY, bar() === before, Math.round(document.querySelector('.navbar').getBoundingClientRect().top), parseFloat(cs('.navbar').paddingTop) >= 22, document.documentElement.scrollHeight <= innerHeight]; }),
    ['hidden', 'hidden', 'auto', 'fixed', true, 0, true, 0, true, true], 'the page is exactly as tall as the screen and does not scroll; the app’s column does; scrolled, the bar at the foot and the panel’s row are where they were; the panel has room above the name');
  await page.waitForFunction(() => document.documentElement.classList.contains('scrolled')); await page.evaluate(() => navigate('plan'));
  eq(await page.evaluate(() => [document.querySelector('.work').scrollTop, UI.route]), [0, 'plan'], 'another screen opens at its top'); await page.evaluate(() => navigate('dashboard'));
  // someone with no company: no choice of side in the panel, and the way to open one is in More
  eq(await page.evaluate(() => { const keep = [S.accounts, S.company, S.user.company]; S.accounts = keep[0].filter(a => a.scope !== 'business'); delete S.company; S.user.company = false; render(); A.sheet();
    const b = document.querySelector('.sheet [data-a="co-open"]'), r = [document.querySelectorAll('.navbar .side-flip, #co-ask').length, !!document.querySelector('.bar-bal .bb-link'), b && b.innerText.trim(), b && b.getBoundingClientRect().height >= 44];
    A.close(); S.accounts = keep[0]; S.company = keep[1]; if (keep[2] === undefined) delete S.user.company; else S.user.company = keep[2]; render(); return r.concat(document.querySelectorAll('.navbar .side-flip').length); }),
    [0, true, 'Open a company account', true, 1], 'someone who said they have no company: no button to change side and no question, the balance stays; “Open a company account” is in More; with a company the button is back');

  // ---------- 3. the dashboard on a phone ----------
  eq(await page.evaluate(() => { const top = s => document.querySelector(s).getBoundingClientRect().top + scrollY, q = document.querySelector('.quick-row'), bs = [...q.querySelectorAll('button')];
    return [!document.querySelector('.hello'), top('#runway-card') < top('.quick-row'), !document.querySelector('#view .kpis'), top('.quick-row') < top('#insight-card'), bs.map(b => b.dataset.v), bs.every(b => b.getBoundingClientRect().height >= 60 && b.getBoundingClientRect().width >= 60), q.getAttribute('aria-label'),
      parseFloat(getComputedStyle(document.querySelector('#runway-card .rw-n')).fontSize) >= 38, document.documentElement.scrollWidth - innerWidth]; }),
    [true, true, true, true, ['expense', 'income', 'pay', 'save', 'transfer', 'goal', 'cost', 'limit', 'import', 'account'], true, 'Add', true, 0], 'the dashboard on a phone: the panel greets, so the page’s own greeting is not drawn; the days of freedom lead, in a large figure; under them the things to do as round buttons, in a row; then the insight (the month’s figures left the phone, 2026-10-08); nothing is wider than the phone');
  await page.click('.quick-row [data-v="expense"]'); eq(await page.evaluate(() => UI.drawer && UI.drawer.draft.type), 'expense', 'the round buttons do what the list does'); await page.evaluate(() => A.close());
  // the company's side
  await page.click('.navbar .side-flip'); await page.waitForSelector('#co-band');
  eq(await page.evaluate(() => [getComputedStyle(document.querySelector('#tabbar .fab')).backgroundColor, getComputedStyle(document.querySelector('.navbar')).backgroundImage.includes('rgba(31, 78, 158, 0.26)'), getComputedStyle(document.querySelector('.bar-bal')).backgroundImage.includes('rgba(31, 78, 158, 0.12)'), getComputedStyle(document.querySelector('.bar-bal .bb-link b')).color, document.querySelector('meta[name="theme-color"]').content, getComputedStyle(document.querySelector('#tabbar')).backgroundColor]), ['rgb(91, 157, 255)', true, true, 'rgb(255, 255, 255)', '#081429', 'rgb(0, 0, 0)'], 'on the company’s side the glass at the top and the bar at the foot take a breath of the company’s blue, the balance stays white, and the round + is its bright blue');
  await page.click('#tabbar .fab'); await page.click('.quick-all');
  eq(await page.evaluate(() => [[...document.querySelectorAll('.quick-base button')].map(b => b.innerText.trim() + '|' + b.getAttribute('aria-label')), [...document.querySelectorAll('.quick-grid button')].map(b => b.innerText.trim())]),
    [['Cost|Record a cost', 'Received|Record money received', 'Transfer|Transfer money'], ['Pay a bill', 'Set aside in a reserve', 'Import a statement', 'Create a reserve', 'Add a fixed cost', 'Set a spending limit', 'Add company account']], 'and its list is in the company’s words');
  await page.click('.quick-base [data-v="expense"]'); eq(await page.evaluate(() => [UI.drawer.kind, isBiz(UI.drawer.draft.accountId)]), ['tx', true], '“A cost” opens a transaction in one of the company’s accounts'); await page.evaluate(() => A.close());
  eq(await page.evaluate(() => { const top = s => document.querySelector(s).getBoundingClientRect().top + scrollY; return [top('#co-band') < top('#runway-card'), top('#runway-card') < top('.quick-row'), document.documentElement.scrollWidth - innerWidth]; }), [true, true, 0], 'the company’s dashboard on a phone: its band, its runway, its round buttons');
  await page.click('.navbar .side-flip');
  eq(errors, [], 'phone: no error in the console');
  await browser.close();

  // ---------- 4. a computer shows none of it; languages; a curiosity above the bar ----------
  ({ browser, page, errors } = await open({ lang: 'en', account: 'example', viewport: { width: 1280, height: 900 } }));
  eq(await page.evaluate(() => [['#tabbar', '.more-btn', '.bar-who', '.bar-bal'].map(s => getComputedStyle(document.querySelector(s)).display), document.querySelectorAll('.quick-row, .ins-strip').length, isPhone(), getComputedStyle(document.documentElement).overflowY, getComputedStyle(document.querySelector('.work')).overflowY]), [['none', 'none', 'none', 'none'], 0, false, 'visible', 'visible'], 'a computer: no bar at the foot, no “More” button, no panel at the top; its dashboard is its own page, with no round buttons and no signal; and its page scrolls the usual way');
  eq(await page.evaluate(() => { const top = s => document.querySelector(s).getBoundingClientRect().top; return [top('.kpis') < top('#runway-card'), getComputedStyle(document.querySelector('.kpis')).display]; }), [true, 'grid'], 'and its dashboard keeps its own order: the figures first, in a grid');
  eq(errors, [], 'computer: no error in the console'); await browser.close();
  for (const [lang, width, want] of [['es', 390, ['Registrar un gasto', 'Registrar un ingreso', 'Pagar una cuenta', 'Aportar a una meta', 'Transferir dinero', 'Crear una meta', 'Agregar un costo fijo', 'Poner un límite de gasto', 'Importar un extracto', 'Agregar cuenta', '¿Qué quieres hacer?']], ['pt', 320, ['Registrar um gasto', 'Registrar uma receita', 'Pagar uma conta', 'Guardar em uma meta', 'Transferir dinheiro', 'Criar uma meta', 'Adicionar um custo fixo', 'Definir um limite de gasto', 'Importar um extrato', 'Adicionar conta', 'O que você quer fazer?']]]) {
    ({ browser, page, errors } = await open({ lang, account: 'example', viewport: { width, height: 700 }, touch: true, mobile: true, curio: true }));
    const where = `${lang}, ${width}px: `;
    eq(await page.evaluate(() => { const row = document.querySelector('.quick-row'), bs = [...row.querySelectorAll('button')], r = bs.map(b => b.getBoundingClientRect()); return [bs.map(b => b.innerText.trim()), document.documentElement.scrollWidth - innerWidth, r.slice(0, 4).every(x => x.left >= 0 && x.right <= innerWidth), r[4].left < innerWidth && r[4].right > innerWidth, row.scrollWidth > row.clientWidth, bs.every(b => b.scrollWidth <= b.clientWidth + 1)]; }), [want.slice(0, 10), 0, true, true, true, true], where + 'the round buttons in the language, each saying what it does: four whole, the fifth peeking in so the row is seen to go on, the rest a swipe away, no word cut, and the page itself no wider than the phone');
    await page.click('#tabbar .fab'); await page.waitForSelector('.sheet.quick');
    await page.click('.quick-all');
    eq(await page.evaluate(() => { const s = document.querySelector('.sheet.quick'), whole = el => el.getBoundingClientRect().right <= innerWidth && el.scrollWidth <= el.clientWidth + 1; return [s.querySelector('h2').innerText.trim(), [...s.querySelectorAll('.quick-grid button')].every(whole), [...s.querySelectorAll('.quick-base button span:last-child')].every(whole), [...s.querySelectorAll('.quick-base button')].map(b => b.getAttribute('aria-label')), document.documentElement.scrollWidth - innerWidth]; }), [want[10], true, true, [want[0], want[1], want[4]], 0], where + 'the list in the language, every button whole, the three short words too (“Transferência” at 320 px)');
    await page.keyboard.press('Escape');
    await page.waitForSelector('#curio', { timeout: 6000 });
    eq(await page.evaluate(() => { const c = document.querySelector('#curio').getBoundingClientRect(), bar = document.querySelector('#tabbar').getBoundingClientRect(), fab = document.querySelector('#tabbar .fab').getBoundingClientRect(); return [document.querySelector('#curio').classList.contains('sig'), c.height <= 60, c.bottom <= Math.min(bar.top, fab.top) + 1 && c.top > innerHeight / 2, c.left >= 0 && c.right <= innerWidth, [...document.querySelectorAll('#curio button')].every(b => b.getBoundingClientRect().height >= 40), document.querySelector('#curio .cu-open').getAttribute('aria-expanded'), !!document.querySelector('#curio p')]; }), [true, true, true, true, true, 'false', false], where + 'a curiosity arrives as a small signal just above the bar at the foot: clear of the bar and its round +, the panel at the top left alone, a thumb high, and the fact itself not shown yet (owner: "only give a sign")');
    await page.click('#curio .cu-open');
    eq(await page.evaluate(() => { const el = document.querySelector('#curio'), c = el.getBoundingClientRect(), bar = document.querySelector('#tabbar').getBoundingClientRect(), fab = document.querySelector('#tabbar .fab').getBoundingClientRect(); return [el.classList.contains('sig'), !!el.querySelector('p') && el.querySelector('p').innerText.length > 20, !!el.querySelector('small'), c.bottom <= Math.min(bar.top, fab.top) + 1 && c.top >= 0, c.left >= 0 && c.right <= innerWidth, [...el.querySelectorAll('button')].every(b => b.getBoundingClientRect().height >= 40)]; }), [false, true, true, true, true, true], where + 'touched, it opens into the notice: the fact and its source, inside the screen, above the bar');
    eq(errors, [], where + 'no error in the console');
    await browser.close();
  }
  // ---------- the bar on an iPhone, and the side change's logo (owner, 2026-10-08) ----------
  // "move the main menu a little lower on iOS": an iPhone keeps 34px at the foot for its home indicator. The bar used to float 10px above all of it;
  // now it comes down to 22px from the foot, and what sits above it (a notice, the end of the page) comes down with it. With no inset nothing moves.
  ({ browser, page, errors } = await open({ lang: 'en', account: 'example', viewport: { width: 390, height: 844 }, touch: true, mobile: true, motion: true }));
  const foot = () => page.evaluate(() => { const b = document.querySelector('#tabbar').getBoundingClientRect(), cu = document.querySelector('#curio-root'), c = document.querySelector('.content'); return [Math.round(innerHeight - b.bottom), Math.round(parseFloat(getComputedStyle(cu).bottom) - (innerHeight - b.top)), Math.round(parseFloat(getComputedStyle(c).paddingBottom) - (innerHeight - b.top))]; });
  // since 2026-10-09 the bar sits on the foot (owner: "fixed at the bottom, not floating"): the inset is inside it, under its buttons
  eq(await foot(), [0, 20, 26], 'no inset at the foot (Android, a browser tab): the bar on the foot, a notice 20px above it, the page’s end clear of it');
  await page.evaluate(() => document.documentElement.style.setProperty('--safe-b', '34px'));
  eq([...await foot(), await page.evaluate(() => Math.round(innerHeight - document.querySelector('#tabbar a').getBoundingClientRect().bottom) >= 34)], [0, 20, 26, true], 'an iPhone’s 34px inset: the bar still on the foot, its buttons above the home indicator, and a notice and the page’s end keep their distance from it');
  await page.evaluate(() => document.documentElement.style.removeProperty('--safe-b'));
  // "the logo on the Household / Company screen looks gigantic on the phone, make it much smaller"
  await page.click('.navbar .side-flip'); await page.waitForSelector('#side-shift');
  // (owner, 2026-10-09: "remove the logo from the loading screen when I switch from household to company")
  eq(await page.evaluate(() => { const s = document.getElementById('side-shift'), l = Math.round(parseFloat(getComputedStyle(s.querySelector('.shift-loader')).width)), fs = sel => parseFloat(getComputedStyle(s.querySelector(sel)).fontSize); return [!s.querySelector('.shift-logo'), l, fs('.shift-say b') >= 12, fs('.shift-say small') >= 12, s.querySelector('.shift-say b').innerText.trim()]; }),
    [true, 34, true, true, 'Loading your company account…'], 'on a phone the loading screen has no logo: the loader and the words');
  eq(errors, [], 'the bar on an iPhone and the loading screen: no error in the console'); await browser.close();
  ({ browser, page, errors } = await open({ lang: 'en', account: 'example', viewport: { width: 1280, height: 900 }, motion: true }));
  await page.click('#rail-side [data-a="space"][data-v="business"]'); await page.waitForSelector('#side-shift');
  eq(await page.evaluate(() => [!document.querySelector('#side-shift .shift-logo'), !!document.querySelector('#side-shift .shift-loader')]), [true, true], 'on a computer too: the loader, no logo');
  await browser.close();
  done('qc-phone');
})();
