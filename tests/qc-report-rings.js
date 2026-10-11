// QC: Reports' rings and coloured bars (owner, 2026-10-09: "in Reports add colour to the bars of 'Largest expense lines' and 'Where you spent the
// most', and add more data with pie charts too, that detail things for the most demanding users").
//   1. what the spending was made of: a ring with six parts at most, each arc the colour of its row in the legend, the shares adding up to 100,
//      the total in the middle; no two neighbours (the ring closing too) in colours that are hard to tell apart;
//   2. a category opens into its subcategories, in shades of its colour, each with its payments and average; a subcategory opens its transactions;
//      the way back is there, and the keyboard lands on it;
//   3. what it was paid with: debit, a card's credit, savings, cash, adding up to the month's spending; under each, the accounts, each opening its
//      transactions; the share on credit in the middle;
//   4. where the money came in from; one source alone is said, not drawn as a ring;
//   5. "Largest expense lines" and "Where you spent the most": each bar in its category's colour;
//   6. a phone: the categories' ring in place of the dashboard's bar, and how it was paid; where the income came from, as a ring.
const { open, ok, eq, done } = require('./pw.js');
(async () => {
  let { browser, page, errors } = await open({ lang: 'en', account: 'example', plan: true, beta: true, viewport: { width: 1440, height: 900 } });
  await page.evaluate(() => { S.user.greeted = true; S.settings.locale = 'en-US'; S.month = '2026-09'; navigate('reports'); }); await page.waitForSelector('#rep-ring-cat');
  // ---------- 1. the categories ----------
  const ring = sel => page.evaluate(sel => { const c = document.querySelector(sel); if (!c) return null; const arcs = [...c.querySelectorAll('.rg-seg')], rows = [...c.querySelectorAll('.rg-row')];
    return { arcs: arcs.map(a => a.style.stroke), dots: rows.map(r => r.querySelector('.dot').style.background), pcts: rows.map(r => parseFloat(r.querySelector('.pct').textContent.replace(',', '.'))), names: rows.map(r => r.querySelector('.rg-name').textContent.trim()), mid: (c.querySelector('.rg-mid') || {}).innerText }; }, sel);
  const r1 = await ring('#rep-ring-cat');
  const exp = await page.evaluate(() => monthSummary(B(), S.month, BCUR()).expenses);
  ok(r1.arcs.length >= 2 && r1.arcs.length <= 6 && r1.arcs.length === r1.dots.length && r1.arcs.every((c, i) => c === r1.dots[i]), 'the categories: a ring of six parts at most, each arc the colour of its row', r1);
  ok(Math.abs(r1.pcts.reduce((s, x) => s + x, 0) - 100) <= 0.3, 'the shares add up to 100', r1.pcts);
  eq(await page.evaluate(exp => document.querySelector('#rep-ring-cat .rg-mid b').textContent.trim() === fmt.money(exp, BCUR(), { round: true }), exp), true, 'the month’s spending in the middle');
  eq(await page.evaluate(() => { const ks = [...document.querySelectorAll('#rep-ring-cat .rg-seg')].map(a => ringKey(a.style.stroke)); return ks.filter((k, i) => { const n = ks[(i + 1) % ks.length]; return ks.length > 2 || i === 0 ? (k === n || RING_CLASH.has([k, n].sort().join('|'))) : false; }); }), [], 'no two neighbours around the ring in colours that are hard to tell apart');
  eq(await page.evaluate(() => { const parts = [{ v: 9, col: 'var(--s3)' }, { v: 8, col: 'var(--s5)' }, { v: 7, col: 'var(--s1)' }, { v: 6, col: 'var(--s2)' }]; return ringOrder(parts).map(p => ringKey(p.col)); }), ['s3', 's1', 's5', 's2'], 'the order: a colour hard to tell from its neighbour waits for the next place');
  // ---------- 2. a category opened ----------
  const casa = await page.evaluate(() => document.querySelector('#rep-ring-cat .rg-row[data-a="rep-drill"]').dataset.cat);
  await page.click(`#rep-ring-cat .rg-row[data-cat="${casa}"]`); await page.waitForTimeout(150);
  const r2 = await ring('#rep-ring-cat');
  eq(await page.evaluate(() => [document.activeElement.classList.contains('rg-back'), UI.repDrill]), [true, casa], 'a category opened: the keyboard on the way back');
  ok(r2.arcs.length >= 2 && r2.arcs.every(c => /color-mix|var\(--s3\)|col-muted/.test(c)) && /Home/.test(r2.mid), 'its subcategories, in shades of its colour, its name in the middle', r2);
  ok(await page.evaluate(() => [...document.querySelectorAll('#rep-ring-cat .rg-row .rg-more')].every(m => /payment/.test(m.textContent)) && [...document.querySelectorAll('#rep-ring-cat button.rg-row')].every(b => b.dataset.a === 'filter-cat' && catOf(b.dataset.cat))), 'each with its payments (and average); a subcategory opens its transactions');
  await page.click('#rep-ring-cat .rg-back'); await page.waitForTimeout(150);
  eq(await page.evaluate(() => [UI.repDrill, document.querySelectorAll('#rep-ring-cat .rg-row[data-a="rep-drill"]').length > 0]), [null, true], 'and back to every category');
  // ---------- 3. how it was paid ----------
  const r3 = await ring('#rep-ring-pay');
  ok(r3 && r3.names.length >= 2 && r3.names.every(n => /^(Debit|Credit \(invoice\)|Savings|Cash)$/.test(n)), 'how it was paid: debit, credit, savings, cash', r3);
  eq(await page.evaluate(exp => { const by = {}; repExpenses(B(), S.month, BCUR()).forEach(x => { const k = payKind(acct(x.accountId)); by[k] = (by[k] || 0) - x.amount; }); const shown = [...document.querySelectorAll('#rep-ring-pay .rg-row')].map(r => r.querySelector(':scope > .num').textContent.trim());
    return [Object.values(by).reduce((s, v) => s + v, 0) === exp, shown.join('|') === PAY_KINDS().filter(([k]) => by[k] > 0).map(([k]) => fmt.money(by[k], BCUR())).join('|')]; }, exp), [true, true], 'the ways add up to the month’s spending, each with its own sum');
  eq(await page.evaluate(() => [[...document.querySelectorAll('#rep-ring-pay button.rg-acct')].every(b => b.dataset.a === 'view-account' && acct(b.dataset.id)) && document.querySelectorAll('#rep-ring-pay button.rg-acct').length > 0, /on credit/.test(document.querySelector('#rep-ring-pay .rg-mid').innerText)]), [true, true], 'under each way its accounts, each opening its transactions; the share on credit in the middle');
  // ---------- 4. where the income came from ----------
  eq(await page.evaluate(() => { const c = document.querySelector('#rep-in-from'); return c ? [!!c.querySelector('.rg-wrap'), c.querySelectorAll('.rg-row').length === c.querySelectorAll('.rg-seg').length || (!c.querySelector('.rg svg') && c.querySelectorAll('.rg-row').length === 1)] : null; }), [true, true], 'where the income came from: a ring, or one source said without a ring');
  await page.evaluate(() => { S.transactions.push({ id: 'qa-in2', accountId: 'nu-conta', date: '2026-09-20', description: 'X', merchant: 'Freelance client', amount: 120000, currency: 'BRL', type: 'income', status: 'cleared', categoryId: null }); render(); });
  eq(await page.evaluate(() => { const c = document.querySelector('#rep-in-from'); return [c.querySelectorAll('.rg-seg').length, [...c.querySelectorAll('.rg-row .rg-name')].map(n => n.textContent.trim()).includes('Freelance client')]; }), [2, true], 'two sources: a ring, the one without a category named by who paid');
  await page.evaluate(() => { S.transactions = S.transactions.filter(x => x.id !== 'qa-in2'); render(); });
  // ---------- 5. the bars ----------
  eq(await page.evaluate(() => { const bad = []; document.querySelectorAll('.hbar .track i').forEach(i => { if (!i.style.background) bad.push(i.closest('.hbar').innerText.slice(0, 30)); }); return bad; }), [], 'every bar of the largest lines and of the merchants has its colour');
  ok(await page.evaluate(() => { const row = [...document.querySelectorAll('.hbar')].find(h => /^Rent/.test(h.innerText.trim())); return !!row && row.querySelector('.track i').style.background === catColor(S.categories.find(c => catName(c.id) === 'Home').id) && /Home/.test(row.dataset.tip); }), 'a line wears its category’s colour (Rent: Home), and says the category');
  eq(errors, [], 'no error in the console'); await browser.close();
  // ---------- 6. a phone ----------
  ({ browser, page, errors } = await open({ lang: 'es', account: 'example', plan: true, beta: true, viewport: { width: 390, height: 844 }, touch: true, mobile: true }));
  await page.evaluate(() => { S.user.greeted = true; S.month = '2026-09'; UI.repView = 'out'; navigate('reports'); }); await page.waitForSelector('#rep-ring-cat');
  eq(await page.evaluate(() => [!!document.querySelector('#rep-ring-cat .rg svg'), !document.querySelector('#cat-card'), !!document.querySelector('#rep-ring-pay'), document.documentElement.scrollWidth - innerWidth]), [true, true, true, 0], 'a phone, Gastos: the categories as a ring in place of the bar, and how it was paid; nothing wider than the screen');
  await page.evaluate(() => A['rep-view']({ v: 'in' })); await page.waitForTimeout(150);
  ok(await page.evaluate(() => !!document.querySelector('#rep-in-from .rg-wrap') && !document.querySelector('#rep-in-from .hbar')), 'Ingresos: where it came from, with the ring’s legend in place of the bars');
  eq(errors, [], 'no error in the console (phone)'); await browser.close();
  done('qc-report-rings');
})();
