// QC of the tenth pass of 2026-10-07 (owner: "do 11 ... and all the polish: 13, 14, 15").
//   1. "I no longer have a company": the company's side is put away, with its reminders, here and on the server; nothing is deleted; it comes back;
//   2. the company's own report: its year, month by month;
//   3. the main button is the brand's deep green; the bright green is kept for "now" (a bill that is late or due within a week) and the phone's round +;
//   4. More, on a phone, in groups;
//   5. the app's icon is declared maskable, and is one.
const { open, ok, eq, done } = require('./pw.js');
const fs = require('fs'), path = require('path');

(async () => {
  const DEEP = 'rgb(0, 98, 57)', BRIGHT = 'rgb(93, 187, 139)';
  const toast = p => p.evaluate(() => document.querySelector('#toast').innerText.trim());

  // ---------- 1. the company's side, put away ----------
  let { browser, page, errors } = await open({ lang: 'en', account: 'example', plan: true, viewport: { width: 1280, height: 900 } });
  // the company gets a fixed cost of its own, due tomorrow, the way a person adds one
  await page.evaluate(() => { S.today = '2026-10-12'; S.month = '2026-10'; A.space({ v: 'business' }); navigate('plan'); A['line-new']({}); Object.assign(UI.drawer.draft, { name: 'Contador', amountText: '300', due: '13' }); A['line-save'](); A.space({ v: 'personal' }); });
  const before = await page.evaluate(() => { const rs = allReminders().filter(r => !snoozedNow(r)), doc = JSON.parse(JSON.stringify(S)); delete doc.today;
    return { coKeys: rs.filter(r => r.book || r.kind === 'close').map(reminderKey), has: hasCompany(), co: rs.filter(r => r.book).length, close: rs.filter(r => r.kind === 'close').length, home: rs.filter(r => !r.book && r.kind !== 'close').map(r => r.id), owed: needStatements('2026-09').length, books: companyBooks(S).length, accounts: S.accounts.filter(a => a.scope === 'business').length, tx: S.transactions.filter(x => isBiz(x.accountId)).length, lines: companyCurrencies(S).map(c => companyBook(S, c, false)).filter(Boolean).reduce((n, b) => n + b.plan.lines.length, 0), doc }; });
  ok(before.has && before.co > 0 && before.close > 0 && before.owed > 0 && before.books > 0 && before.accounts > 0, 'to start with: a company with accounts, bills of its own in the bell and statements owed', { co: before.co, close: before.close, owed: before.owed });
  await page.evaluate(() => { render(); navigate('settings'); });
  eq(await page.evaluate(() => { const row = document.querySelector('#set-company'); return [!!row && !!row.closest('#your-data'), row.querySelector('b').innerText.trim(), document.querySelector('#set-co-off').innerText.trim(), /Nothing is deleted\./.test(row.innerText), document.querySelectorAll('#user-menu [data-a="co-close"]').length]; }), [true, 'The company’s side', 'I no longer have a company', true, 0],
    'someone with a company finds “I no longer have a company” in Settings, under “Your data”; it is not one more row of the menu everybody opens every day');
  await page.click('#set-co-off'); await page.waitForSelector('.modal');
  eq(await page.evaluate(() => { const m = document.querySelector('.modal'); return [m.querySelector('h2').innerText.trim(), /Nothing is deleted/.test(m.innerText), /brings it all back/.test(m.innerText), [...m.querySelectorAll('button')].map(b => b.innerText.trim()).includes('Put it away'), !!m.querySelector('input'), S.user.company, getComputedStyle(document.querySelector('#modal-ok')).backgroundColor]; }),
    ['Put the company’s side away?', true, true, true, false, undefined, 'rgb(0, 98, 57)'], 'it asks first, says nothing is deleted and how to bring it back, and needs no word typed: nothing is lost by it');
  await page.evaluate(() => A['modal-cancel']()); eq(await page.evaluate(() => [S.user.company, hasCompany()]), [undefined, true], 'Cancel changes nothing');
  await page.evaluate(() => { A.space({ v: 'business' }); navigate('plan'); A['co-close'](); }); await page.click('[data-a="modal-confirm"]');
  const after = await page.evaluate(() => { const rs = allReminders().filter(r => !snoozedNow(r)); return { flag: S.user.company, has: hasCompany(), space: UI.space, route: UI.route, scope: UI.space, blue: document.documentElement.classList.contains('side-co'), sw: document.querySelectorAll('#rail-side button, .side-seg button').length, tag: document.querySelectorAll('.side-tag:not([hidden])').length,
      co: rs.filter(r => r.book).length, close: rs.filter(r => r.kind === 'close').length, home: rs.filter(r => !r.book && r.kind !== 'close').map(r => r.id), owed: needStatements('2026-09').length, books: companyBooks(S).length, next: reminderScheduleAll(S, S.today, 3, 45).filter(x => x.book).length,
      accounts: S.accounts.filter(a => a.scope === 'business').length, tx: S.transactions.filter(x => isBiz(x.accountId)).length, lines: companyCurrencies(S).map(c => companyBook(S, c, false)).filter(Boolean).reduce((n, b) => n + b.plan.lines.length, 0), name: (S.company || {}).name || null }; });
  eq([after.flag, after.has, after.space, after.route, after.scope, after.blue, after.sw, after.tag, await toast(page)], [false, false, 'personal', 'dashboard', 'personal', false, 0, 0, 'Done. The company’s side is put away. It is in your menu if you need it again.'],
    'confirmed from the company’s own side: the app is the household’s again, on its dashboard, in green, with no Household | Company choice and no “Company” tag, and it says so');
  eq([after.co, after.close, after.owed, after.books, after.next, after.home], [0, 0, 0, 0, 0, before.home], 'the company’s bills, the statements its accounts owe and its coming reminders are gone from the bell; the household’s are exactly as before');
  eq([after.accounts, after.tx, after.lines], [before.accounts, before.tx, before.lines], 'nothing was deleted: the company’s accounts, movements and fixed costs are all still in the account');
  // the server says the same (supabase/functions/reminders, built from the same code)
  { const logic = await import('file://' + path.join(__dirname, '..', 'supabase', 'functions', 'reminders', 'logic.mjs')), copy = d => JSON.parse(JSON.stringify(d)), off = copy(before.doc); off.user.company = false;
    const was = logic.messageFor(copy(before.doc), '2026-10-12', new Set()), now = logic.messageFor(off, '2026-10-12', new Set()), mine = k => before.coKeys.includes(k);
    ok(!!was && was.keys.filter(mine).length > 0, 'the server’s morning message had the company’s things in it before', was && was.keys);
    ok(!now || now.keys.filter(mine).length === 0, 'and has none once the company is put away: no company bill, no statement owed', now && now.keys);
    eq(now ? now.keys.slice().sort() : [], (was ? was.keys : []).filter(k => !mine(k)).sort(), 'what the household is told stays exactly the same'); }
  // around the app: no company to choose, anywhere
  await page.evaluate(() => { navigate('transactions'); A['tx-filters'](); });
  eq(await page.evaluate(() => [document.querySelectorAll('#tx-scope').length, document.querySelectorAll('#tx-month').length]), [0, 1], 'the transaction filters no longer offer a company to filter by');
  await page.evaluate(() => { A.close(); navigate('settings'); }); eq(await page.evaluate(() => document.querySelectorAll('#set-company').length), 0, 'Settings no longer has the row: there is no company to put away');
  await page.click('#user-menu-btn');
  eq(await page.evaluate(() => document.querySelector('#umenu-co').innerText.trim()), 'Open a company account', 'the menu offers the way back');
  await page.click('#umenu-co'); await page.waitForFunction(() => UI.space === 'business');
  eq(await page.evaluate(() => { const rs = allReminders().filter(r => !snoozedNow(r)); return [S.user.company, hasCompany(), UI.coSetup, UI.route, document.querySelectorAll('#rail-side button').length, rs.filter(r => r.book).length > 0, rs.some(r => r.kind === 'close'), S.accounts.filter(a => a.scope === 'business').length]; }), [true, true, null, 'settings', 1, true, true, before.accounts],
    '“Open a company account” brings it back as it was: no setup to go through again, its side open, its bills and statements back in the bell');
  // the same button in the company's own panel; and adding a company account says there is one
  await page.evaluate(() => A['company-edit']()); await page.waitForSelector('#co-off');
  eq(await page.evaluate(() => [document.querySelector('#co-off').innerText.trim(), /Nothing is deleted\./.test(document.querySelector('.drawer').innerText)]), ['I no longer have a company', true], 'the company’s own panel has it too');
  await page.click('#co-off'); await page.waitForSelector('.modal'); await page.click('[data-a="modal-confirm"]'); await page.waitForFunction(() => S.user.company === false && !UI.drawer);
  await page.evaluate(() => { A['edit-account']({ id: '' }); const d = UI.drawer.draft; Object.assign(d, { name: 'Inter PJ', institution: 'Inter', scope: 'business', type: 'checking', currency: 'BRL', openingText: '0' }); A['save-account'](); });
  eq(await page.evaluate(() => [S.user.company, hasCompany(), S.accounts.some(a => a.name === 'Inter PJ')]), [true, true, true], 'put away, then a company account added: that says there is a company again');
  eq(errors, [], 'putting the company away: no error in the console');

  // ---------- 2. the company's year ----------
  await page.evaluate(() => { S.today = '2026-10-02'; A.space({ v: 'business' }); S.month = '2026-09'; navigate('reports'); }); await page.waitForSelector('#rep-year');
  const yr = await page.evaluate(() => { const bk = B(), cur = BCUR(), rows = [...document.querySelectorAll('#rep-year-tbl tbody tr')], num = s => s === '—' ? null : +s.replace(/\./g, '').replace('−', '-'), cells = r => [...r.querySelectorAll('td.amt')].map(c => num(c.innerText.trim()));
    const months = rows.slice(0, -1).map(r => [r.querySelector('button').dataset.ym, cells(r)]), want = months.map(([m]) => { const v = monthSummary(bk, m, cur); return v.count ? [Math.round(v.income / 100), Math.round(v.expenses / 100)] : [null, null]; });
    const withData = months.filter(([, c]) => c[0] !== null), tot = cells(rows[rows.length - 1]), all = withData.map(([m]) => monthSummary(bk, m, cur));
    return { head: [...document.querySelectorAll('#rep-year-tbl thead th')].map(h => h.textContent.trim()), sub: document.querySelector('#rep-year .sub').innerText.trim(), n: months.length, first: months[0][0], last: months[months.length - 1][0], match: months.every(([, c], i) => c[0] === want[i][0] && c[1] === want[i][1]),
      adds: withData.every(([, c]) => c[2] === c[0] - c[1]), tot, totWant: [Math.round(all.reduce((s, v) => s + v.income, 0) / 100), Math.round(all.reduce((s, v) => s + v.expenses, 0) / 100)], label: rows[rows.length - 1].querySelector('th').innerText.trim(), now: document.querySelector('#rep-year-tbl tr.now button').dataset.ym, some: withData.length,
      neg: [...document.querySelectorAll('#rep-year-tbl td.amt .neg')].length > 0, wide: document.documentElement.scrollWidth <= innerWidth }; });
  eq([yr.head, yr.sub, yr.n, yr.first, yr.last, yr.label, yr.now], [['Month', 'Received', 'Costs', 'Result'], '2026 · BRL', 7, '2026-04', '2026-10', 'Total 2026', '2026-09'], 'the company’s report has its year: one row a month from the first with movements (2026-10-09: no empty months before it) up to the month in progress (none still to come), in the currency shown, the month on screen marked, and a total');
  ok(yr.some >= 3 && yr.match && yr.adds && yr.tot[0] === yr.totWant[0] && yr.tot[1] === yr.totWant[1] && yr.tot[2] === yr.tot[0] - yr.tot[1], 'every month’s received and costs are that month’s own figures, each result is what the two shown figures leave, and the total is the year’s', yr);
  await page.click('#rep-year-tbl button[data-ym="2026-08"]');
  eq(await page.evaluate(() => [S.month, document.querySelector('#rep-year-tbl tr.now button').dataset.ym]), ['2026-08', '2026-08'], 'a month’s name opens that month');
  await page.evaluate(() => { S.month = '2026-10'; render(); });
  eq(await page.evaluate(() => [!!document.querySelector('#view .empty'), !!document.querySelector('#rep-year-tbl'), document.querySelectorAll('#rep-compare').length]), [true, true, 0], 'a month with nothing in it still shows the year under “No data”');
  await page.evaluate(() => { A.space({ v: 'personal' }); S.month = '2026-09'; navigate('reports'); });
  eq(await page.evaluate(() => [document.querySelectorAll('#rep-year').length, document.querySelectorAll('#rep-compare').length]), [1, 1], 'the household’s report has its year too (owner, 2026-10-09: “the Reports tab on the computer is very basic”), and keeps its comparison');

  // ---------- 3. the main button ----------
  await page.evaluate(() => { S.month = '2026-10'; navigate('plan'); });
  eq(await page.evaluate(() => { const c = s => { const e = document.querySelector(s); return e ? getComputedStyle(e).backgroundColor : null; }, soon = [...document.querySelectorAll('#paylist .btn.primary.now')], later = [...document.querySelectorAll('#paylist .btn.later')];
    return [c('.topbar .btn.primary'), getComputedStyle(document.querySelector('.topbar .btn.primary')).color, soon.length, soon.every(b => getComputedStyle(b).backgroundColor === 'rgb(93, 187, 139)'), later.length > 0, document.querySelectorAll('#paylist .btn.primary:not(.now)').length]; }), [DEEP, 'rgb(250, 250, 250)', 1, true, true, 0],
    'the Plan: the screen’s main button is the deep green with light words; the one bill due within a week is the bright green, and no other row is filled');
  await page.evaluate(() => A['new-tx']());
  eq(await page.evaluate(() => [getComputedStyle(document.querySelector('.drawer footer .btn.primary')).backgroundColor, document.querySelectorAll('.drawer .btn.primary.now').length]), [DEEP, 0], 'a panel’s Save is the deep green');
  await page.evaluate(() => { A.close(); navigate('dashboard'); });
  eq(await page.evaluate(() => { const now = [...document.querySelectorAll('#todo .btn.primary.now')], all = [...document.querySelectorAll('#view .btn.primary')]; return [now.length > 0, now.every(b => getComputedStyle(b).backgroundColor === 'rgb(93, 187, 139)'), all.filter(b => !b.classList.contains('now')).every(b => getComputedStyle(b).backgroundColor === 'rgb(0, 98, 57)')]; }), [true, true, true], 'the dashboard: what is due now in the to-do list is bright; any other filled button is deep green');
  await page.evaluate(() => A.reminders()); await page.waitForSelector('.drawer .rem');
  eq(await page.evaluate(() => { const pay = [...document.querySelectorAll('.drawer .rem [data-a="line-pay-now"]')], rest = [...document.querySelectorAll('.drawer .btn.primary:not(.now)')]; return [pay.length > 0, pay.every(x => x.classList.contains('now') && getComputedStyle(x).backgroundColor === 'rgb(93, 187, 139)'), rest.every(x => getComputedStyle(x).backgroundColor === 'rgb(0, 98, 57)')]; }), [true, true, true], 'the bell: a bill to mark as paid is bright, because the bell only holds what is due; any other filled button there is deep green');
  await page.evaluate(() => { A.close(); A.space({ v: 'business' }); navigate('plan'); });
  eq(await page.evaluate(() => getComputedStyle(document.querySelector('.topbar .btn.primary')).backgroundColor), DEEP, 'on the company’s side the main button stays the brand’s deep green');
  await page.evaluate(() => { A.space({ v: 'personal' }); S.settings.theme = 'light'; render(); navigate('plan'); });
  eq(await page.evaluate(() => [getComputedStyle(document.querySelector('.topbar .btn.primary')).backgroundColor, [...document.querySelectorAll('#paylist .btn.primary.now')].map(b => getComputedStyle(b).backgroundColor)]), [DEEP, [DEEP]], 'in the light look both are the deep green: on white the bright one is too faint to be a button');
  eq(errors, [], 'the year and the buttons: no error in the console'); await browser.close();

  // ---------- 4. More on a phone, and the buttons there ----------
  for (const [lang, w] of [['es', 390], ['pt', 320]]) {
    ({ browser, page, errors } = await open({ lang, account: 'example', plan: true, viewport: { width: w, height: w === 320 ? 568 : 844 }, touch: true, mobile: true }));
    eq(await page.evaluate(() => [getComputedStyle(document.querySelector('#tabbar .fab')).backgroundColor, getComputedStyle(document.querySelector('#tabbar .fab')).color]), ['rgb(0, 98, 57)', 'rgb(255, 255, 255)'], `${lang}, ${w}px: the round + is the phone’s main action, #006239 with a white + (owner, 2026-10-10)`);
    await page.evaluate(() => A.sheet());
    eq(await page.evaluate(() => { const gs = [...document.querySelectorAll('.sheet .mr-nav .nav-group')].map(g => [...g.querySelectorAll('a')].map(a => a.getAttribute('href').slice(1))), second = document.querySelectorAll('.sheet .mr-nav .nav-group')[1], off = document.querySelector('#sheet-co-off');
      return [gs, getComputedStyle(second).borderTopWidth, parseFloat(getComputedStyle(second).paddingTop) >= 6, document.querySelectorAll('.sheet [data-a="co-close"]').length, document.querySelector('.sheet').scrollWidth <= document.querySelector('.sheet').clientWidth]; }),
      [[['accounts', 'reports', 'investments', 'recurring', 'imports'], ['categories', 'settings']], '1px', true, 0, true], `${lang}, ${w}px: More is two groups with a line between them, the money first and the preferences after; the profile is the person at the top (owner, 2026-10-10)`);
    await page.evaluate(() => { A.close(); navigate('settings'); }); await page.click('#set-co-off'); await page.waitForSelector('.modal');
    eq(await page.evaluate(() => { const bs = [...document.querySelectorAll('.modal button')]; return [bs.every(b => b.getBoundingClientRect().height >= 44), document.querySelector('.modal').getBoundingClientRect().right <= innerWidth]; }), [true, true], `${lang}, ${w}px: “I no longer have a company” is in Settings on a phone too, and asks first, in a box that fits the phone`);
    await page.click('[data-a="modal-confirm"]'); await page.waitForFunction(() => S.user.company === false);
    eq(await page.evaluate(() => [document.querySelectorAll('.navbar .side-flip').length, !!document.querySelector('.bar-bal .bb-link')]), [0, true], `${lang}, ${w}px: the top of the phone loses its button to change side, and keeps the balance`);
    eq(errors, [], `${lang}: no error in the console`); await browser.close();
  }
  // a tablet keeps the files, as a group of their own between the two
  ({ browser, page, errors } = await open({ lang: 'en', account: 'example', plan: true, viewport: { width: 820, height: 1100 }, touch: true, mobile: true }));
  await page.evaluate(() => A.sheet());
  eq(await page.evaluate(() => [...document.querySelectorAll('.sheet .mr-nav .nav-group')].map(g => [...g.querySelectorAll('a')].map(a => a.getAttribute('href').slice(1)))), [['accounts', 'reports', 'investments', 'recurring', 'imports'], ['openfinance'], ['categories', 'settings']], 'a tablet’s More has a third group between the two, the bank connection (the converter is the company’s); Imports is with the money, as on a phone');
  await browser.close();

  // ---------- 5. the icon ----------
  { const app = path.join(__dirname, '..', 'app'), m = JSON.parse(fs.readFileSync(path.join(app, 'manifest.webmanifest'), 'utf8')), by = p => m.icons.filter(i => i.purpose === p).map(i => i.sizes).sort();
    eq([by('any'), by('maskable'), m.icons.every(i => fs.existsSync(path.join(app, i.src)) && i.type === 'image/png')], [['192x192', '512x512'], ['192x192', '512x512'], true], 'the manifest names the icon twice in each size: as it is, and as one a phone may cut to its own shape');
    // a PNG's first chunk says its size and whether it has transparency: a maskable icon is a full, opaque square
    const head = f => { const b = fs.readFileSync(path.join(app, f)); return [b.readUInt32BE(16), b.readUInt32BE(20), b[25]]; };      // width, height, colour type (2 = RGB, 6 = RGBA)
    const big = head('assets/icons/icon-512.png'), small = head('assets/icons/icon-192.png');
    eq([big.slice(0, 2), small.slice(0, 2)], [[512, 512], [192, 192]], 'the files are the sizes the manifest says'); }
  { // drawn in a page, the way a phone would: every corner is the background (nothing is cut off) and the mark sits inside the middle 80%
    ({ browser, page, errors } = await open({ lang: 'en', viewport: { width: 600, height: 600 } }));
    const b64 = fs.readFileSync(path.join(__dirname, '..', 'app', 'assets', 'icons', 'icon-512.png')).toString('base64');
    const px = await page.evaluate(async b64 => { const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode(); const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d'); g.drawImage(img, 0, 0); const d = g.getImageData(0, 0, 512, 512).data, at = (x, y) => [d[(y * 512 + x) * 4], d[(y * 512 + x) * 4 + 1], d[(y * 512 + x) * 4 + 2], d[(y * 512 + x) * 4 + 3]];
      const bg = at(2, 2); let far = 0, clear = 0; for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) { const p = at(x, y); if (p[3] < 255) clear++; if (Math.abs(p[0] - bg[0]) + Math.abs(p[1] - bg[1]) + Math.abs(p[2] - bg[2]) > 40) far = Math.max(far, Math.hypot(x - 256, y - 256)); }
      return { clear, corners: [at(2, 2), at(509, 2), at(2, 509), at(509, 509)].every(p => p.join() === bg.join()), reach: Math.round(far / 256 * 100) }; }, b64);
    ok(px.clear === 0 && px.corners && px.reach > 30 && px.reach <= 80, 'the icon is a full square with no see-through corner, and its mark stays inside the circle a phone keeps (80% of the width)', px);
    await browser.close(); }
  // ---------- the app's font on every device (owner, 2026-10-08: "on my Mac the characters are very close together") ----------
  // The tests cannot draw SF Pro or load Inter (no fonts here), so what is checked is what is asked for: Inter first, for the app's text, its large
  // figures and the pieces of the app on the home page; the system font only after it, for when Inter cannot load.
  { const { browser, page, errors } = await open({ lang: 'en', account: 'example', plan: true, viewport: { width: 1280, height: 900 } });
    const first = sel => page.evaluate(s => { const el = document.querySelector(s); return el ? getComputedStyle(el).fontFamily.split(',')[0].trim().replace(/"/g, '') : null; }, sel);
    eq([await first('body'), await first('.card-h h2'), await first('.kpi .value, .rw-n'), await page.evaluate(() => /apple-system/.test(getComputedStyle(document.body).fontFamily))], ['Inter', 'Inter', 'Inter', true], 'the app asks for Inter first on every device, a Mac included; the system font stays only as what is left when Inter cannot load');
    eq(await page.evaluate(() => [...document.querySelectorAll('link[rel="stylesheet"]')].some(l => /fonts\.googleapis\.com\/css2\?family=Inter/.test(l.href))), true, 'and Inter is loaded by the page');
    await page.evaluate(() => logOut()); await page.waitForFunction(() => !UI.session);
    const piece = await page.evaluate(() => { const el = document.querySelector('#public .lp [style*="--font"], #public .lp .duo-pane, #public .lp .app-piece, #public .lp .shot'); return el ? getComputedStyle(el).fontFamily.split(',')[0].trim().replace(/"/g, '') : 'none'; });
    ok(piece === 'none' || /Inter/.test(piece), 'the pieces of the app shown on the home page are in Inter too', piece);
    eq(errors, [], 'fonts: no error in the console'); await browser.close(); }
  done('qc-tidy');
})();
