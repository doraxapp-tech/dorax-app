// QC of the round +'s list on a phone. Owner, 2026-10-11 (v149): "on the phone the middle button is out of control, it has too many buttons;
// filter them by tab". Then, the same day (v167): "the + button still has too many actions, leave only three: EXPENSE, INCOME, TRANSFER".
//   1. on every screen the same title and the same three big buttons, side by side, in the same place: an expense, an income, a transfer; nothing
//      else in the list (no screen's own part, no "All actions");
//   2. said in full to a screen reader, the focus on the expense; each does what it says;
//   3. the company's words; with no account the expense asks for one;
//   4. Spanish at 320 px with every word whole, the list short enough not to scroll; no error in the console.
// The summary's row of round buttons keeps every action: qc-phone.js. Thumbs and type sizes: qc-thumb.js.
const { open, ok, eq, done } = require('./pw.js');
(async () => {
  let { browser, page, errors } = await open({ lang: 'en', account: 'example', plan: true, viewport: { width: 390, height: 844 }, touch: true, mobile: true });
  await page.evaluate(() => { S.user.greeted = true; });
  const at = route => page.evaluate(r => { A.close(); navigate(r); A.quick(); const s = document.querySelector('.sheet.quick');
    return { all: [...s.querySelectorAll('button[data-v]')].map(b => b.dataset.v), base: [...s.querySelectorAll('.quick-base button')].map(b => b.dataset.v), extra: s.querySelectorAll('.quick-h, .quick-all, .quick-grid, #quick-rest').length, y: Math.round(s.querySelector('.quick-base').getBoundingClientRect().top), h: s.querySelector('h2').innerText.trim() }; }, route);
  // ---------- 1. the three, on every screen, in the same place, and nothing else ----------
  const routes = await page.evaluate(() => ROUTES.map(r => r[0]).filter(r => typeof routeMain === 'function'));
  const seen = {};
  for (const r of routes) seen[r] = await at(r);
  ok(Object.values(seen).every(x => x.all.join() === 'expense,income,transfer' && x.base.join() === 'expense,income,transfer' && x.extra === 0), 'every screen: an expense, an income, a transfer, and nothing else', Object.entries(seen).filter(([, x]) => x.all.join() !== 'expense,income,transfer' || x.extra).map(([r, x]) => r + ':' + x.all.join('/')));
  ok(new Set(Object.values(seen).map(x => x.y)).size === 1, 'in the same place on every screen, so the thumb learns it: + then “Expense” is always the same two taps');
  eq(seen.dashboard.h, 'What do you want to do?', 'the title stays');
  // ---------- 2. a screen reader, the focus, and what each does ----------
  eq(await page.evaluate(() => { A.close(); navigate('dashboard'); A.quick(); const s = document.querySelector('.sheet.quick'), bs = [...s.querySelectorAll('.quick-base button')];
    return [s.getAttribute('role'), bs.map(b => b.getAttribute('aria-label')), bs.map(b => b.innerText.trim()), document.activeElement.dataset.v, bs.every(b => b.getBoundingClientRect().height >= 88 && b.getBoundingClientRect().width >= 88 && b.querySelector('svg')), s.getBoundingClientRect().bottom <= innerHeight + 1, s.scrollHeight <= s.clientHeight + 1]; }),
    ['dialog', ['Record an expense', 'Record an income', 'Transfer money'], ['Expense', 'Income', 'Transfer'], 'expense', true, true, true], 'short words beside their icons, said in full to a screen reader; the focus on the expense; three big buttons; the list fits, nothing scrolls');
  for (const [v, want] of [['expense', 'expense'], ['income', 'income'], ['transfer', 'transfer']]) {
    await page.evaluate(() => { A.close(); A.quick(); }); await page.click(`.sheet.quick [data-v="${v}"]`);
    eq(await page.evaluate(() => [UI.sheet, UI.drawer && UI.drawer.kind, UI.drawer && UI.drawer.draft.type]), [false, 'tx', want], `“${v}” opens a new transaction already set as ${want}`);
  }
  await page.evaluate(() => A.close());
  // ---------- 3. the company, and no account ----------
  await page.evaluate(() => { A.space({ v: 'business' }); navigate('plan'); A.quick(); }); await page.waitForTimeout(200);
  eq(await page.evaluate(() => [...document.querySelectorAll('.quick-base button')].map(b => b.innerText.trim() + '|' + b.getAttribute('aria-label'))), ['Cost|Record a cost', 'Received|Record money received', 'Transfer|Transfer money'], 'the company: a cost, money received, a transfer');
  eq(await page.evaluate(() => { const keep = S.accounts; S.accounts = keep.filter(a => a.scope !== 'business'); A.close(); A.quick(); const v = [...document.querySelectorAll('.sheet.quick button[data-v]')].map(b => b.dataset.v); A['quick-go']({ v: 'expense' }); const r = [v, !!UI.drawer, (document.querySelector('#toast') || {}).innerText || '']; S.accounts = keep; A.close(); render(); return [r[0], r[1], /account/i.test(r[2])]; }),
    [['expense', 'income', 'transfer'], false, true], 'a side with no account: the same three, and its “Cost” asks for an account instead of opening an empty panel');
  await page.evaluate(() => { A.close(); A.space({ v: 'personal' }); });
  // what rises from the foot of a phone is round only at the top, in both themes (owner, 2026-10-11: "the menus that come up have a radius at the
  // bottom and it looks odd"; the light theme had given them four round corners in v164)
  for (const theme of ['light', 'dark']) {
    eq(await page.evaluate(th => { S.settings.theme = S.settings.themePhone = th; render(); const r = []; for (const open of [() => A.quick(), () => A.sheet(), () => A['new-tx']()]) { A.close(); open(); const el = document.querySelector('#overlay .sheet, #overlay .drawer'), cs = getComputedStyle(el); r.push([cs.borderTopLeftRadius, cs.borderTopRightRadius, cs.borderBottomLeftRadius, cs.borderBottomRightRadius, Math.round(el.getBoundingClientRect().bottom) === innerHeight]); } A.close(); return r; }, theme),
      [['24px', '24px', '0px', '0px', true], ['24px', '24px', '0px', '0px', true], ['24px', '24px', '0px', '0px', true]], `${theme}: the + list, More and a panel rise from the foot round only at the top`);
  }
  await page.evaluate(() => { S.settings.theme = S.settings.themePhone = 'dark'; render(); });
  eq(errors, [], 'phone: no error in the console'); await browser.close();
  // ---------- 4. Spanish, 320 px ----------
  ({ browser, page, errors } = await open({ lang: 'es', account: 'example', plan: true, viewport: { width: 320, height: 640 }, touch: true, mobile: true }));
  await page.evaluate(() => { S.user.greeted = true; navigate('plan'); A.quick(); });
  eq(await page.evaluate(() => { const s = document.querySelector('.sheet.quick'), whole = el => el.getBoundingClientRect().left >= 0 && el.getBoundingClientRect().right <= innerWidth && el.scrollWidth <= el.clientWidth + 1;
    return [s.querySelector('h2').innerText.trim(), [...s.querySelectorAll('.quick-base button')].map(b => b.innerText.trim()), [...s.querySelectorAll('.quick-base span:last-child')].every(whole), document.documentElement.scrollWidth - innerWidth, s.scrollHeight <= s.clientHeight + 1, Math.round(s.querySelector('.quick-base').getBoundingClientRect().bottom) <= innerHeight]; }),
    ['¿Qué quieres hacer?', ['Gasto', 'Ingresos', 'Transferencia'], true, 0, true, true], 'es, 320 px: “Gasto”, “Ingresos”, “Transferencia” whole; nothing scrolls; nothing wider than the phone');
  eq(errors, [], 'es: no error in the console'); await browser.close();
  done('qc-quick-sheet');
})().catch(e => { console.error('qc-quick-sheet: Error', e); process.exit(1); });
