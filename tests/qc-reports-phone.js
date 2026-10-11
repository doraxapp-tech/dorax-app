// QC of a phone's Reports and of To do (owner, 2026-10-08: "in the mobile menu change Accounts for Reports. In Reports should go the monthly spending
// chart and spending by category. Under the date selector put a switch of three views: general, income, expenses"; "the To do card looks broken").
//   1. the bar: Summary, Reports, +, Plan, Goals; Accounts is in More, and the balance on top still opens it;
//   2. Reports: the month, then Income | Expenses, the whole width, a thumb high (owner, later the same day: "remove General and share its information
//      between Income and Expenses"); Expenses opens first: what went out, month by month, by category, by line, what stands out and the comparison;
//      Income: what came in, what was left and its share, month by month and where from; the summary no longer carries the two charts; a computer's
//      Reports is its one page, with no switch;
//   3. To do: a late one keeps its date in the column (in the warning colour) and says "Late" at the start of its line; nothing runs over its name;
//   4. Portuguese, and the company's side.
const { open, ok, eq, done } = require('./pw.js');

(async () => {
  let { browser, page, errors } = await open({ lang: 'es', account: 'example', plan: true, beta: true, today: '2026-10-08', viewport: { width: 390, height: 844 }, touch: true, mobile: true });
  // ---------- 1. the bar ----------
  eq(await page.evaluate(() => [...document.querySelectorAll('#tabbar a')].map(a => [a.getAttribute('href'), a.innerText.trim()])), [['#dashboard', 'Resumen'], ['#reports', 'Informes'], ['#plan', 'Plan'], ['#goals', 'Metas']], 'the bar: Resumen, Informes, Plan, Metas');
  await page.tap('.more-btn'); await page.waitForSelector('.sheet .nav');
  ok(await page.evaluate(() => !!document.querySelector('.sheet .nav a[href="#accounts"]') && !document.querySelector('.sheet .nav a[href="#reports"]')), 'Accounts is in More; Reports is not repeated there');
  await page.evaluate(() => A.close()); await page.waitForTimeout(250);
  eq(await page.evaluate(() => { navigate('reports'); return !document.querySelector('.bar-bal'); }), true, 'Reports has no balance on top: it is on the summary only (owner, 2026-10-09)');
  ok(await page.evaluate(() => { navigate('dashboard'); return !document.querySelector('#view #cat-card, #view #trend-card'); }), 'the summary no longer carries the two charts');
  // ---------- 2. Reports ----------
  await page.tap('#tabbar a[href="#reports"]'); await page.waitForFunction(() => UI.route === 'reports');
  const sw = () => page.evaluate(() => { const s = document.querySelector('.rep-view'), m = document.querySelector('.pagehead .m-row').getBoundingClientRect(), r = s.getBoundingClientRect();
    return [[...s.querySelectorAll('button')].map(b => b.innerText.trim() + (b.getAttribute('aria-pressed') === 'true' ? '*' : '')), r.top >= m.bottom, Math.round(r.width) >= Math.round(m.width) - 1, [...s.querySelectorAll('button')].every(b => b.getBoundingClientRect().height >= 44), s.parentElement.id === 'view' && s === document.querySelector('#view').firstElementChild]; });
  eq(await sw(), [['Ingresos', 'Gastos*'], true, true, true, true], 'under the month, the two views the whole width, a thumb high; Expenses open first');
  const out = () => page.evaluate(() => [[...document.querySelectorAll('#view .tiles .tile .label span:first-child')].map(e => e.innerText.trim()), !!document.querySelector('#view #trend-card'), !!document.querySelector('#view #rep-ring-cat .legend-row'), /Mayores líneas de gasto/.test(document.querySelector('#view').innerText), /Observaciones/.test(document.querySelector('#view').innerText), !!document.querySelector('#rep-compare')]);
  eq(await out(), [['Gastos'], true, true, true, true, true], 'Expenses: what went out, month by month, by category, by line, what stands out and the comparison with the month before');
  await page.tap('.rep-view [data-v="in"]');
  eq(await page.evaluate(() => [document.querySelector('.rep-view [aria-pressed="true"]').dataset.v, document.activeElement.dataset.v, [...document.querySelectorAll('#view .tiles .tile .label span:first-child')].map(e => e.innerText.trim()), !!document.querySelector('#rep-in-trend .cols, #rep-in-trend .colbtn'), !!document.querySelector('#rep-in-from'), !document.querySelector('#view #trend-card, #view #rep-compare')]),
    ['in', 'in', ['Ingresos', 'Queda', 'Sobrante, en %'], true, true, true], 'Income: what came in, what was left and its share, month by month, and where from');
  await page.tap('.rep-view [data-v="out"]');
  await page.evaluate(() => monthGo(addMonths(S.month, -1))); await page.waitForTimeout(200);
  eq(await page.evaluate(() => document.querySelector('.rep-view [aria-pressed="true"]').dataset.v), 'out', 'another month keeps the view chosen');
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'nothing runs off the side');
  // ---------- 3. To do ----------
  await page.evaluate(() => { monthGo(ymOf(S.today)); navigate('dashboard'); }); await page.waitForTimeout(300);
  const late = await page.evaluate(() => { const li = [...document.querySelectorAll('#todo .li.todo')].find(l => l.querySelector('.when-late')); if (!li) return null; const w = li.querySelector('.when').getBoundingClientRect(), b = li.querySelector('.grow b').getBoundingClientRect(), d = li.querySelector('.when-late');
    return [/^\d{2}\/\d{2}$/.test(d.innerText.trim()), (() => { const x = document.createElement('i'); x.style.color = 'var(--warn)'; document.body.appendChild(x); const c = getComputedStyle(x).color; x.remove(); return getComputedStyle(d).color === c; })(), li.querySelector('small').innerText.startsWith('Atrasado ·'), d.getBoundingClientRect().right <= b.left, w.right <= b.left + 1]; });
  eq(late, [true, true, true, true, true], 'a late one: its date in the column, “Atrasado” at the start of its line, nothing over its name');
  eq(errors, [], 'no error in the console'); await browser.close();
  // ---------- 4. Portuguese; the company; a computer ----------
  ({ browser, page, errors } = await open({ lang: 'pt', account: 'example', plan: true, beta: true, viewport: { width: 320, height: 640 }, touch: true, mobile: true }));
  await page.evaluate(() => navigate('reports'));
  eq(await page.evaluate(() => [...document.querySelectorAll('.rep-view button')].map(b => b.innerText.trim())), ['Receita', 'Despesas'], 'pt: Receita, Despesas');
  await page.evaluate(() => A.space({ v: 'business' })); await page.waitForTimeout(3800);
  await page.evaluate(() => navigate('reports'));
  eq(await page.evaluate(() => [...document.querySelectorAll('.rep-view button')].map(b => b.innerText.trim())), ['Recebido', 'Gastos'], 'the company: Recebido, Gastos');
  await page.evaluate(() => { UI.repView = 'in'; render(); });
  ok(await page.evaluate(() => !!document.querySelector('#rep-year') || !S.transactions.some(x => isBiz(x.accountId))), 'the company’s year, month by month, is with what it received');
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), '320 px: nothing runs off the side');
  eq(errors, [], 'pt: no error in the console'); await browser.close();
  ({ browser, page, errors } = await open({ lang: 'es', account: 'example', plan: true, beta: true, viewport: { width: 1280, height: 860 } }));
  await page.evaluate(() => navigate('reports'));
  eq(await page.evaluate(() => [!document.querySelector('.rep-view'), !!document.querySelector('#rep-compare'), /Mayores líneas de gasto/.test(document.querySelector('#view').innerText)]), [true, true, true], 'a computer: its one page, no switch');
  eq(errors, [], 'computer: no error in the console'); await browser.close();
  done('qc-reports-phone');
})();
