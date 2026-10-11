// QC of the BETA cards and wallet (owner, 2026-10-08: "on the phone, this is beta, I'm testing it, don't delete the current design: swap Transactions for
// Accounts in the menu; on Accounts change the cards for a realistic debit/credit card design, on the computer too; on the phone's dashboard stack them
// like a wallet; a tap opens them and sideways the person sees each one's information").
//   1. the phone's bar: Dashboard, Reports, +, Plan, Goals (owner, 2026-10-08: "change Accounts for Reports"); Transactions is the first thing in More, Accounts in it;
//   2. Accounts: each account a card of a real card's shape, in its bank's colour, with its mark, the rest of its name, its balance (what is owed on a
//      credit card), the holder and the kind; no card number is made up; its details and buttons under it; on the computer too;
//   3. the dashboard's wallet on a phone: open in a row from the start (owner, 2026-10-08), the first card chosen on the left and the next ones
//      coming in from the right, so a swipe to the left goes on; Choose and View all above it; five cards at most, the person choosing which and
//      in what order; a swipe moves the dots; a re-render keeps the card; the eye hides the amounts; the company's side has its own;
//      the computer's dashboard: the chosen cards small, five in one row under the month's figures, a click opens one large in a panel (owner,
//      2026-10-08: "on the computer the cards look huge ... find another bento format so everything looks right");
//   2c. (owner, 2026-10-08) on the computer the cards are grouped by kind, a faint line with faded ends between the groups;
//   2b. (owner, 2026-10-08: "on the phone, in Accounts, a tap on the card opens transactions; remove the KPI cards of the household's net balance,
//       it is in the bar on top, and the number of accounts, it is irrelevant; remove the notice that the design is a test, it is approved")
//       a tap on a card opens that account's transactions; no figures on top on a phone (a computer keeps them); no word of a test anywhere;
//   4. the previous design comes back with one switch in Settings ("Accounts as cards"), and the suites keep testing it;
//   5. Spanish and Portuguese.
const { open, ok, eq, done } = require('./pw.js');

(async () => {
  let { browser, page, errors } = await open({ lang: 'en', account: 'example', plan: true, beta: true, viewport: { width: 390, height: 844 }, touch: true, mobile: true });
  // ---------- 1. the bar ----------
  eq(await page.evaluate(() => [...document.querySelectorAll('#tabbar a')].map(a => a.getAttribute('href'))), ['#dashboard', '#reports', '#plan', '#goals'], 'the bar: Dashboard, Reports, (+), Plan, Goals');
  await page.click('.navbar [data-a="sheet"]'); await page.waitForSelector('.sheet .nav');
  eq(await page.evaluate(() => [document.querySelector('.sheet .nav a').getAttribute('href'), !!document.querySelector('.sheet .nav a[href="#accounts"]')]), ['#transactions', true], 'Transactions is the first thing in More; Accounts is in it');
  await page.evaluate(() => A.close()); await page.waitForTimeout(250);
  // ---------- 2. Accounts ----------
  await page.evaluate(() => navigate('accounts')); await page.waitForFunction(() => UI.route === 'accounts');
  const cards = await page.evaluate(() => { const items = [...document.querySelectorAll('.cc-grid .cc-item')], list = cardsOf(personal());      // one card per account, its credit inside it (2026-10-09)
    return { n: items.length === list.length, each: items.every(it => { const a = acct(it.dataset.id), c = it.querySelector('.ccard'), r = c.getBoundingClientRect(), b = BANK_MARKS[a.institution], bal = accountBalance(S, a.id, S.today);
      return Math.abs(r.width / r.height - 1.586) < .02 && (!b || c.style.getPropertyValue('--cc') === b.bg) && c.querySelector('.cc-amt b').textContent.trim() === fmt.money(a.type === 'credit' ? -bal : bal, a.currency)
        && c.querySelector('.cc-holder').textContent.trim() === S.user.name.toLocaleUpperCase() && c.querySelector('.cc-kind').textContent.trim().length > 0 && !/\d{4}\s?\d{4}/.test(c.textContent) && !!(c.querySelector('.cc-logo .inst') && c.querySelector('.cc-chip'))
        && it.querySelector('.cc-meta [data-a="card-tx"], .cc-meta [data-a="view-account"]') && it.querySelector('.cc-meta [data-a="edit-account"]'); }),
      credit: [...document.querySelectorAll('.ccard.credit .cc-amt small')].every(s => s.textContent.trim() === 'Owed'), old: document.querySelectorAll('#view .card.acct').length, beta: !document.querySelector('.beta-note, [data-a="wallet-beta"]') && !/beta|being tried/i.test(document.querySelector('#view').innerText) }; });
  eq([cards.n, cards.each, cards.credit, cards.old, cards.beta], [true, true, true, 0, true], 'Accounts: every account a card of a real card’s shape, in its bank’s colour, its balance (owed on a card), the holder, the kind, the chip; no number made up; its buttons under it; no notice that it is being tried');
  // ---------- 2b. the card opens its panel (its transactions a tap further); no figures on top ----------
  eq(await page.evaluate(() => { const v = document.querySelector('#view'); return [!!v.querySelector('.tiles, .tile'), /Household net balance|Each currency is totalled/.test(v.innerText), v.firstElementChild.matches('.acc-acts') && v.firstElementChild.nextElementSibling.matches('.acc-head')]; }), [false, false, true], 'a phone: no figures on top of Accounts (the household’s net balance is in the bar above, the number of accounts said nothing); add and delete, the side’s name (with the view switch) and the cards come first');
  const tap = await page.evaluate(() => { const b = document.querySelectorAll('.cc-grid .cc-tap')[1]; const r = b.getBoundingClientRect(); return { id: b.dataset.id, label: b.getAttribute('aria-label'), h: r.height, a: b.dataset.a, tag: b.tagName, name: acct(b.dataset.id).name }; });
  // since 2026-10-09 (owner: "when I tap a card in Accounts it takes me to transactions; I want it to open the menu as in the summary tab")
  eq([tap.tag, tap.a, tap.h >= 44, tap.label.startsWith(tap.name + ': ') && !/View transactions$/.test(tap.label)], ['BUTTON', 'card-view', true, true], 'each card is one button, its name and balance said');
  await page.tap(`.cc-grid .cc-tap[data-id="${tap.id}"]`); await page.waitForSelector('#overlay .cv');
  const acts = await page.evaluate(id => acct(id).type === 'credit' ? ['expense', 'edit'] : ['expense', 'income', 'edit'], tap.id);      // a credit card takes no income; the transactions are under the actions
  eq(await page.evaluate(() => [UI.route, UI.drawer.kind, UI.drawer.id, [...document.querySelectorAll('#overlay .cv-acts button')].map(b => b.dataset.v)]), ['accounts', 'card-view', tap.id, acts], 'a tap on the card: its panel opens, with its details and what can be done with it, as on the summary');
  await page.keyboard.press('Escape'); await page.waitForTimeout(350);
  eq(await page.evaluate(() => document.activeElement.classList.contains('cc-tap') && document.activeElement.dataset.id), tap.id, 'closed: the focus is back on that card');
  await page.tap(`.cc-grid .cc-tap[data-id="${tap.id}"]`); await page.waitForSelector('#overlay .cv-ops');
  await page.tap('#overlay .op-head .linkbtn'); await page.waitForFunction(() => UI.route === 'transactions');
  eq(await page.evaluate(() => [UI.tx.account, !UI.drawer]), [tap.id, true], 'its transactions come up in the panel, and all of them are one tap further, the panel closed');
  await page.evaluate(() => navigate('accounts')); await page.waitForFunction(() => UI.route === 'accounts');
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'phone: nothing wider than the screen');
  // ---------- 3. the wallet ----------
  await page.click('#tabbar a[href="#dashboard"]'); await page.waitForFunction(() => UI.route === 'dashboard'); await page.waitForTimeout(300);
  // open from the start (owner, 2026-10-08: "on the phone leave the summary's cards open by default, they look better, and keep Choose and View all")
  const op = await page.evaluate(() => { const row = document.querySelector('#wallet-row'), ss = [...row.querySelectorAll('.w-slide')], a = ss[0].getBoundingClientRect(), b = ss[1].getBoundingClientRect(), head = document.querySelector('#ac-card .w-head');
    return [ss.map(x => x.dataset.id).join() === walletChosen().map(x => x.id).join(), Math.abs(a.left - 16) < 3, b.left < innerWidth && b.right > innerWidth, [...document.querySelectorAll('#ac-card .w-dots i')].findIndex(i => i.classList.contains('on')), !ss[0].querySelector('.w-info, .cc-meta, .btn'),
      !!head.querySelector('#wallet-pick-btn') && !!head.querySelector('a[href="#accounts"]'), !document.querySelector('#wallet-close, #ac-card .wallet, #ac-card .w-card')]; });
  eq(op, [true, true, true, 0, true, true, true], 'the dashboard: the cards open in a row from the start, in the order chosen, the first lined up on the left and the next peeking in on the right; nothing under them (owner, 2026-10-08: "remove under the cards the limit, transactions, buttons; that is seen when the user taps"); Choose and View all above; no stack and no Close');
  await page.evaluate(() => walletGo(document.querySelector('#wallet-row'), 2));
  await page.waitForTimeout(300);
  eq(await page.evaluate(() => [UI.walletAt, [...document.querySelectorAll('#ac-card .w-dots i')].findIndex(i => i.classList.contains('on'))]), [2, 2], 'a swipe to the left: the next cards, and the dots follow');
  await page.evaluate(() => render()); await page.waitForTimeout(100);
  eq(await page.evaluate(() => Math.abs(document.querySelectorAll('#wallet-row .w-slide')[2].getBoundingClientRect().left - 16) < 3), true, 'drawn again (a payment, the eye), the row keeps its card');
  await page.click('.bar-bal .bb-eye');
  ok(await page.evaluate(() => [...document.querySelectorAll('#ac-card .cc-amt b')].every(b => /•••••/.test(b.textContent))), 'the eye hides what is on the cards');
  await page.click('.bar-bal .bb-eye');
  await page.evaluate(() => navigate('plan')); await page.evaluate(() => navigate('dashboard')); await page.waitForTimeout(200);
  eq(await page.evaluate(() => [UI.walletAt, Math.abs(document.querySelectorAll('#wallet-row .w-slide')[0].getBoundingClientRect().left - 16) < 3]), [0, true], 'back on the dashboard, the row starts again at the first card');
  // which cards, and their order: five at most, one at least
  await page.evaluate(() => { S.accounts.push({ id: 'cx', name: 'Itaú Personnalité', institution: 'Itaú', type: 'checking', currency: 'BRL', opening: 250000, scope: 'personal' }, { id: 'cy', name: 'Caixa', institution: 'Caixa', type: 'savings', currency: 'BRL', opening: 90000, scope: 'personal' }); render(); });
  eq(await page.evaluate(() => [walletList().length, document.querySelectorAll('#ac-card .w-slide').length]), [6, 5], 'six cards: the wallet shows five');
  await page.click('#wallet-pick-btn'); await page.waitForSelector('.drawer .wp-list');
  const pk = await page.evaluate(() => { const rows = [...document.querySelectorAll('.drawer .wp-row')]; return [rows.length, rows.filter(r => r.classList.contains('on')).length, rows.filter(r => !r.classList.contains('on')).every(r => r.querySelector('input').disabled), rows[0].querySelector('[data-d="-1"]').disabled, rows[4].querySelector('[data-d="1"]').disabled, /5/.test(document.querySelector('.drawer .body').innerText)]; });
  eq(pk, [6, 5, true, true, true, true], 'Choose: every account, the five shown first with their arrows; with five shown the others cannot be switched on, and it says why');
  await page.click('.drawer .wp-row.on:nth-child(2) label.switch');
  await page.waitForFunction(() => document.querySelectorAll('#ac-card .w-slide').length === 4);      // a field's change is drawn once the tap is over (app/shell.js)
  eq(await page.evaluate(() => [S.user.walletPick.home.length, document.querySelectorAll('#ac-card .w-slide').length, [...document.querySelectorAll('.drawer .wp-row:not(.on) input')].every(i => !i.disabled)]), [4, 4, true], 'one switched off: four cards, and the others can be switched on');
  const cr = await page.evaluate(() => walletList()[5].id);      // the sixth card, left out at first
  await page.click(`.drawer .wp-row:not(.on) label.switch:has(input[data-id="${cr}"])`);
  await page.waitForFunction(() => document.querySelectorAll('#ac-card .w-slide').length === 5);
  eq(await page.evaluate(() => [S.user.walletPick.home[S.user.walletPick.home.length - 1], document.querySelectorAll('#ac-card .w-slide')[4].dataset.id]), [cr, cr], 'one switched on: it goes last');
  await page.click(`.drawer [data-a="wallet-pick-move"][data-id="${cr}"][data-d="-1"]`);
  eq(await page.evaluate(id => [S.user.walletPick.home.indexOf(id), document.querySelectorAll('#ac-card .w-slide')[3].dataset.id, document.activeElement.dataset.id], cr), [3, cr, cr], 'its up arrow moves it up, in the wallet too, and the focus stays on it');
  await page.click('.drawer [data-a="wallet-pick-reset"]');
  eq(await page.evaluate(() => [!!(S.user.walletPick || {}).home, [...document.querySelectorAll('#ac-card .w-slide')].map(w => w.dataset.id).join() === walletList().slice(0, 5).map(a => a.id).join()]), [false, true], 'Original order: the first five again');
  await page.evaluate(() => { A.close(); S.accounts = S.accounts.filter(a => a.id !== 'cx' && a.id !== 'cy'); render(); }); await page.waitForTimeout(250);
  await page.evaluate(() => A.space({ v: 'business' })); await page.waitForTimeout(300);
  eq(await page.evaluate(() => [...document.querySelectorAll('#ac-card .w-slide')].map(w => w.dataset.id).join() === [...cardsOf(business()).filter(a => a.type !== 'credit'), ...cardsOf(business()).filter(a => a.type === 'credit')].map(a => a.id).join()), true, 'the company’s side: its own wallet');
  await page.evaluate(() => A.space({ v: 'personal' }));
  // ---------- 4. back to the previous design ----------
  await page.evaluate(() => { window.DORAX_BETA = undefined; navigate('settings'); });
  eq(await page.evaluate(() => { const b = document.querySelector('#set-beta'); return [b.querySelector('b').innerText.trim(), !!b.querySelector('.chip'), /beta/i.test(b.innerText)]; }), ['Accounts as cards', false, false], 'Settings: “Accounts as cards”, no word of a beta');
  await page.click('label.switch:has(#set-wallet)'); await page.waitForFunction(() => S.settings.wallet === false);
  await page.evaluate(() => navigate('accounts'));
  eq(await page.evaluate(() => [S.settings.wallet, document.querySelectorAll('#view .card.acct').length > 0, !!document.querySelector('.cc-grid'), [...document.querySelectorAll('#tabbar a')].map(a => a.getAttribute('href'))]), [false, true, false, ['#dashboard', '#transactions', '#plan', '#goals']],
    'switched off: the previous cards and the previous bar');
  await page.evaluate(() => navigate('dashboard'));
  ok(await page.evaluate(() => !!document.querySelector('#ac-card .ac-list') && !document.querySelector('.wallet')), 'and the list of accounts on the dashboard');
  await page.evaluate(() => navigate('settings')); await page.click('label.switch:has(#set-wallet)'); await page.waitForFunction(() => S.settings.wallet === true);
  eq(await page.evaluate(() => [S.settings.wallet, walletOn()]), [true, true], 'switched on again: the cards');
  eq(errors, [], 'phone: no error in the console'); await browser.close();

  // ---------- the computer ----------
  ({ browser, page, errors } = await open({ lang: 'en', account: 'example', plan: true, beta: true, viewport: { width: 1280, height: 900 } }));
  await page.evaluate(() => navigate('accounts'));
  eq(await page.evaluate(() => { const items = [...document.querySelectorAll('.cc-grid .cc-item')], gs = [...document.querySelectorAll('#view .cc-grid')], order = ['checking', 'savings', 'cash', 'credit'];
      const kinds = gs.map(g => g.dataset.kind), divs = [...document.querySelectorAll('#view .cc-div')], d = divs[0], bg = d && getComputedStyle(d).backgroundImage;
      return [items.length === cardsOf(personal()).length, kinds.join() === [...new Set(cardsOf(personal()).map(a => a.type))].sort((a, b) => order.indexOf(a) - order.indexOf(b)).join(), gs.every(g => [...g.querySelectorAll('.cc-item')].every(i => acct(i.dataset.id).type === g.dataset.kind) && g.closest('.cc-group').querySelector('h2.sec').innerText.trim().length > 0 && g.closest('.cc-group').getAttribute('aria-labelledby') === g.closest('.cc-group').querySelector('h2.sec').id),
        divs.length === gs.length - 1 && divs.every(x => x.previousElementSibling.classList.contains('cc-group') && x.nextElementSibling.classList.contains('cc-group')), bg === 'none' && getComputedStyle(d).backgroundColor !== 'rgba(0, 0, 0, 0)', d && d.getBoundingClientRect().height <= 1.5,
        getComputedStyle(gs[0]).gridTemplateColumns.split(' ').length >= 2, items.every(i => i.querySelector('.ccard').getBoundingClientRect().width >= 280)]; }),
    [true, true, true, true, true, true, true, true], 'a computer: the cards in groups by kind (checking, savings, cash, the credit cards last), each group under its own heading where “Household” was, a plain line between them, no faded ends (owner, 2026-10-09); two to a row at least (since v126 they have seven tenths of the width, the column on the right the rest), each at least 280 px wide');
  eq(await page.evaluate(() => [[...document.querySelectorAll('#view .cc-group h2.sec')].map(h => h.textContent.trim()), !/Household/.test([...document.querySelectorAll('#view > h2.sec')].map(h => h.innerText).join()), [...document.querySelectorAll('#view .cc-meta')].every(m => !m.querySelector('button, .meter') && !/transaction/.test(m.innerText))]), [['Checking accounts', 'Your savings'], true, true], 'the groups are named (the savings since v122 “Your savings”), there is no “Household” on top, and under the cards there are no buttons, no count of transactions and no limit bar: the panel has them (owner, 2026-10-09); since v126 no split of the savings either (tests/qc-savings-accounts.js)');
  eq(await page.evaluate(() => { const els = [...document.querySelectorAll('.cc-amt b, .num, .bal, .tile .value, .kpi .value')]; return [els.length > 0, els.every(e => /^"?Inter/.test(getComputedStyle(e).fontFamily) && getComputedStyle(e).fontVariantNumeric === 'normal')]; }), [true, true], 'every figure is in Inter with its own digits, no monospaced or tabular numbers (owner, 2026-10-09: "I don’t like the 1 with a foot")');
  eq(await page.evaluate(() => { const v = document.querySelector('#view'); return [!!v.querySelector('.tiles, .tile'), /Household net balance|Each currency is totalled/.test(v.innerText), !document.querySelector('.beta-note')]; }), [false, false, true], 'a computer: no figures on top of Accounts either (owner, 2026-10-09: "on the computer remove the KPI cards from the Accounts tab"); no notice of a test');
  const pcId = await page.evaluate(() => document.querySelector('.cc-grid .cc-tap').dataset.id);
  await page.click('.cc-grid .cc-tap'); await page.waitForSelector('.drawer .cv-ops');      // 2026-10-09 (owner): its panel, not the Transactions screen
  eq(await page.evaluate(() => [UI.route, UI.drawer.kind, UI.drawer.id]), ['accounts', 'card-view', pcId], 'a click on a card: its panel, with its transactions under it, on a computer too');
  await page.keyboard.press('Escape'); await page.waitForTimeout(350);
  await page.evaluate(() => navigate('dashboard')); await page.mouse.move(5, 5); await page.waitForTimeout(250);      // the pointer off the cards (one under it lifts)
  const dk = await page.evaluate(() => { const w = document.querySelector('#ac-card'), ms = [...w.querySelectorAll('.w-mini')], tops = new Set(ms.map(m => Math.round(m.getBoundingClientRect().top))), r = w.getBoundingClientRect(), tiles = document.querySelector('#view .kpis'), todo = document.querySelector('#todo');
    return [!w.closest('.grid'), ms.length === Math.min(W_MAX, walletList().length), tops.size, ms.map(m => m.dataset.id).join() === walletChosen().map(a => a.id).join(), r.height < 200, !tiles || r.top >= tiles.getBoundingClientRect().bottom, !todo || r.top >= todo.getBoundingClientRect().bottom, ms.every(m => { const c = m.querySelector('.ccard').getBoundingClientRect(); return Math.abs(c.width / c.height - 1.586) < .03 && c.width >= 170; }), w.scrollWidth <= w.clientWidth + 2, !w.querySelector('.w-card')]; });
  eq(dk, [true, true, 1, true, true, true, true, true, true, true], 'the computer’s dashboard: the chosen cards small, five in one row the width of the page, under the month’s figures and under the day-to-day parts (2026-10-11: at a glance), not a column of their own beside Savings and goals');
  await page.click('#ac-card .w-mini:nth-child(2)'); await page.waitForSelector('.drawer .cv');
  const id2 = await page.evaluate(() => walletChosen()[1].id);
  eq(await page.evaluate(id => { const d = document.querySelector('.drawer'), c = d.querySelector('.cv .ccard').getBoundingClientRect(); return [UI.drawer.kind, UI.drawer.id === id, c.width >= 300, !!d.querySelector('.cv .cv-ops'), !!d.querySelector('.cv-acts [data-a="card-do"][data-v="edit"]')]; }, id2),
    ['card-view', true, true, true, true], 'a click on a card: the card large in a panel, with its details, what can be done with it and its latest transactions');
  await page.keyboard.press('Escape'); await page.waitForTimeout(350);
  // (owner, 2026-10-09: "on the computer, in Accounts, when I click a card it takes me straight to transactions instead of opening the side panel")
  await page.evaluate(() => navigate('accounts')); await page.click('.cc-grid .cc-tap'); await page.waitForSelector('.drawer .cv-ops');
  eq(await page.evaluate(() => [UI.route, UI.drawer.kind]), ['accounts', 'card-view'], 'Accounts on a computer: a click on a card opens its panel, with its transactions under it');
  await page.keyboard.press('Escape'); await page.waitForTimeout(350);
  await page.evaluate(() => navigate('dashboard')); await page.waitForTimeout(200); await page.click('#ac-card .w-mini:nth-child(2)'); await page.waitForSelector('.drawer .cv');
  await page.keyboard.press('Escape'); await page.waitForTimeout(350);
  ok(await page.evaluate(id => document.activeElement && document.activeElement.dataset.id === id, id2), 'closed: the focus goes back to the card');
  await page.click('#wallet-pick-btn'); await page.waitForSelector('.drawer .wp-list');
  ok(await page.evaluate(() => document.querySelectorAll('.drawer .wp-row').length === cardsOf(personal()).length), 'Choose is there on the computer too');
  await page.evaluate(() => A.close()); await page.waitForTimeout(250);
  await page.evaluate(() => A.space({ v: 'business' })); await page.waitForTimeout(300);
  eq(await page.evaluate(() => { const w = document.querySelector('#ac-card'); return [!!w && !w.closest('.grid'), document.querySelectorAll('#ac-card .w-mini').length === Math.min(5, business().length)]; }), [true, true], 'the company’s dashboard: the same strip');
  eq(errors, [], 'computer: no error in the console'); await browser.close();

  // ---------- 5. Spanish and Portuguese ----------
  for (const [lang, w, want] of [['es', 390, ['Cuentas', 'Débito · Crédito', 'Factura', 'Débito']], ['pt', 320, ['Contas', 'Débito · Crédito', 'Fatura', 'Débito']]]) {
    ({ browser, page, errors } = await open({ lang, account: 'example', plan: true, beta: true, viewport: { width: w, height: 760 }, touch: true, mobile: true }));
    eq(await page.evaluate(() => { const k = [...document.querySelectorAll('#ac-card .cc-kind')].map(x => x.textContent.trim()); return [document.querySelector('#ac-card #w-h').innerText.trim(), k[0], document.querySelector('#ac-card .ccard.duo .cc-inv').textContent.trim().split(' ')[0], k[1]]; }),
      want, `${lang}: in the language`);
    ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.querySelector('#ac-card .ccard').getBoundingClientRect().right <= innerWidth && getComputedStyle(document.querySelector('#wallet-row')).overflowX === 'auto'), `${lang} at ${w} px: the first card fits, the others wait in the row to the right, and the page never scrolls sideways`);
    eq(errors, [], `${lang}: no error in the console`); await browser.close();
  }
  done('qc-wallet-beta');
})();
