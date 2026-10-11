// QC (owner, 2026-10-10): "how do you put a limit on a category? I can't find that option, and if I can't find it, it is because it is hard to find".
//   1. Categories & rules: each expense category shows its limit (filling up this month) or "Set a limit"; nothing on Income, nor on a category
//      whose subcategories are all fixed bills;
//   2. the panel: one amount, the average as a starting point, what is left for the rest of the month as it is typed; refuses an empty or wrong
//      amount at the field; saving makes a line of the Plan spent in several purchases, from this month on (earlier months untouched); Enter saves;
//   3. a category with fixed bills takes its limits by subcategory (no "whole category" there); a whole-category limit and a subcategory limit never
//      live together in one category;
//   4. removing: a limit set this month goes, an older one ends last month (its history stays); Undo puts it back; setting it again runs it again;
//   5. the list of limits, and every way to it: a phone's +, the search, Help, the Plan (computer), the profile's reminders; from the list, saving
//      goes back to the list;
//   6. a renamed category keeps its limit's name; the alerts sentence follows the profile's switch; the company's side has its own; Portuguese and
//      Spanish say it; no overflow at 320px and every tap target 44px on a phone; no error in the console.
const { open, ok, eq, done } = require('./pw.js');
(async () => {
  const phone = { viewport: { width: 390, height: 844 }, touch: true, mobile: true };
  let { browser, page, errors } = await open({ lang: 'en', account: 'example', plan: true, ...phone });
  await page.evaluate(() => { S.user.greeted = true; navigate('categories'); });
  const card = id => page.evaluate(i => { const c = document.querySelector(`[data-a="cat-toggle"][data-id="${i}"]`).closest('.cat-card'); const l = c.querySelector('.cat-lim'), a = c.querySelector('.cat-lim-add'); return l ? 'limit: ' + l.innerText.trim() : a ? 'add' : 'none'; }, id);
  // ---------- 1. on Categories & rules ----------
  eq([await card('casa'), await card('suscripciones'), await card('salidas'), await card('other'), await card('income')],
    ['limit: 2 limits · R$ 214,80 of R$ 1.500 this month', 'none', 'add', 'add', 'none'], 'Home shows its two limits together; Subscriptions (all fixed bills) and Income nothing; the others “Set a limit”');
  // ---------- 2. the panel, for a category with no subcategories ----------
  await page.click('.cat-lim-add[data-cat="salidas"]'); await page.waitForSelector('#lm-amount');
  const avg = await page.evaluate(() => { const c = S.categories.find(k => k.id === 'salidas'); return limitAverage(S, { cat: c, sub: null }, ymOf(S.today), CUR); });
  eq(await page.evaluate(() => [UI.drawer.kind, !document.querySelector('#lm-for'), document.querySelector('#lm-amount').value, document.activeElement.id, !document.querySelector('[data-a="limit-remove"]')]), ['limit', true, '', 'lm-amount', true], 'Going out: one field, empty, with the cursor in it; no “For” (no subcategories), no Remove (no limit yet)');
  ok(avg && avg.n >= 1, 'the example has spending in Going out in the last months: an average is offered');
  eq(await page.evaluate(() => (document.querySelector('.lim-avg') || {}).dataset.v), String(avg.amount), 'the button offers that average');
  await page.click('[data-a="limit-avg"]'); eq(await page.evaluate(() => document.querySelector('#lm-amount').value), await page.evaluate(v => plain(v), avg.amount), '“Use” puts the average in the field');
  await page.fill('#lm-amount', ''); await page.click('[data-a="limit-save"]');
  eq(await page.evaluate(() => [UI.drawer.kind, UI.drawer.invalid, document.activeElement.id, /Enter the monthly limit/.test(document.querySelector('#overlay').innerText)]), ['limit', 'lm-amount', 'lm-amount', true], 'an empty amount: refused, said at the field');
  await page.fill('#lm-amount', '0'); await page.click('[data-a="limit-save"]');
  ok(await page.evaluate(() => /for example 800/.test(document.querySelector('#overlay').innerText)), 'zero: refused, with an example of a number');
  await page.fill('#lm-amount', '600');
  const spent = await page.evaluate(() => categoryTotals(S, ymOf(S.today), CUR).byCat.salidas || 0), days = await page.evaluate(() => daysInMonth(ymOf(S.today)) - +S.today.slice(8) + 1);
  eq(await page.evaluate(() => document.querySelector('#lm-left').innerText), await page.evaluate(([s, d]) => `This month so far: ${fmt.money(s, CUR, { trim: true })}. With this limit, ${fmt.money(60000 - s, CUR, { trim: true })} left for ${d} days: about ${fmt.money(Math.floor((60000 - s) / d / 100) * 100, CUR, { trim: true })} a day.`, [spent, days]), 'as it is typed: what was spent, what is left and about how much a day');
  await page.keyboard.press('Enter');
  const line = () => page.evaluate(() => { const l = S.plan.lines.find(k => k.categoryId === 'salidas' && k.pay === 'budget'); return l && [l.subcategoryId || null, l.name, planValue(S, l, ymOf(S.today)), planValue(S, l, '2026-12'), planValue(S, l, '2026-09'), l.end]; });
  eq(await line(), [null, 'Going out', 60000, 60000, 0, null], 'Enter saves: a line of the Plan for the whole category, from this month to December; September untouched');
  eq([await page.evaluate(() => [!UI.drawer, UI.toast && UI.toast.msg]), await card('salidas')], [[true, 'Limit saved: R$ 600 a month for Going out.'], `limit: ${await page.evaluate(s => fmt.money(s, CUR, { trim: true }), spent)} of R$ 600 this month`], 'closed, said, and the category shows it');
  // the expense form sees the same limit
  await page.evaluate(() => { A['new-tx'](); UI.drawer.draft.catKey = 'salidas|'; renderOverlay(); });
  ok(await page.evaluate(() => /of R\$ 600/.test((document.querySelector('.tx-lim') || {}).innerText || '')), 'the expense form shows what is left of it');
  await page.evaluate(() => { UI.drawer = null; renderOverlay(); });
  // a renamed category keeps its limit's name
  await page.evaluate(() => { A['edit-cat']({ id: 'salidas' }); }); await page.fill('#cat-rename', 'Nights out'); await page.click('[data-a="save-cat"][data-id="salidas"]');
  eq((await line())[1], 'Nights out', 'renamed: the limit takes the new name');
  // ---------- 3. a category with fixed bills: by subcategory ----------
  await page.click('.cat-lim[data-cat="casa"]'); await page.waitForSelector('#lm-for');
  eq(await page.evaluate(() => [[...document.querySelectorAll('#lm-for option')].map(o => o.textContent), document.querySelector('#lm-for').value, document.querySelector('#lm-amount').value, !!document.querySelector('[data-a="limit-remove"]')]),
    [['Everything else in Home', 'Electricity · now a bill', 'Groceries', 'Transport'], 'supermercado', '1.200', true], 'Home: everything else in it (outside its own lines), its bill of variable amount that can become a limit, and its two limits; Groceries first, with its R$ 1.200; Remove is there (no fixed bill like rent)');
  await page.selectOption('#lm-for', 'transporte');
  eq(await page.evaluate(() => document.querySelector('#lm-amount').value), '300', 'Transport chosen: its own R$ 300 in the field');
  await page.fill('#lm-amount', '350'); await page.click('[data-a="limit-save"]');
  eq(await page.evaluate(() => { const l = S.plan.lines.find(k => k.id === 'pl-transporte'); return [S.plan.lines.filter(k => k.subcategoryId === 'transporte').length, planValue(S, l, ymOf(S.today)), planValue(S, l, '2026-09')]; }), [1, 35000, 30000], 'the same line, R$ 350 from this month; September keeps R$ 300');
  // a subcategory limit in a category that had none: then the whole category is no longer offered
  await page.evaluate(() => { const c = S.categories.find(k => k.id === 'other'); c.subs.push({ id: 's-bars', name: 'Bars' }); render(); A['limit-open']({ cat: 'other' }); });
  eq(await page.evaluate(() => [...document.querySelectorAll('#lm-for option')].map(o => [o.value, o.textContent])), [['', 'The whole category'], ['s-bars', 'Bars']], 'Other, with one subcategory and no limit: the whole category or Bars');
  await page.selectOption('#lm-for', 's-bars'); await page.fill('#lm-amount', '200'); await page.click('[data-a="limit-save"]');
  await page.evaluate(() => A['limit-open']({ cat: 'other' }));
  eq(await page.evaluate(() => [[...document.querySelectorAll('#lm-for option')].map(o => o.textContent), document.querySelector('#lm-for').value, document.querySelector('#lm-amount').value]), [['Everything else in Other', 'Bars'], 's-bars', '200'], 'with a limit on Bars, the rest of Other can still have its own (it counts what Bars does not: nothing twice); Bars opens first');
  await page.evaluate(() => { UI.drawer = null; renderOverlay(); });
  // ---------- 4. removing ----------
  await page.click('.cat-lim[data-cat="salidas"]'); await page.waitForSelector('[data-a="limit-remove"]'); await page.click('[data-a="limit-remove"]');
  eq([await line(), await card('salidas'), await page.evaluate(() => UI.toast && UI.toast.action && UI.toast.action.a)], [undefined, 'add', 'limit-undo'], 'a limit set this month: removed whole, the category offers one again, with Undo');
  await page.evaluate(() => A['limit-undo']());
  eq((await line()).slice(0, 3), [null, 'Nights out', 60000], 'Undo: back as it was');
  await page.click('.cat-lim[data-cat="casa"]'); await page.selectOption('#lm-for', 'transporte'); await page.click('[data-a="limit-remove"]');
  const tr = () => page.evaluate(() => { const l = S.plan.lines.find(k => k.id === 'pl-transporte'); return [l.end, planValue(S, l, '2026-09'), planValue(S, l, ymOf(S.today))]; });
  eq([await tr(), await card('casa')], [['2026-09', 30000, 0], 'limit: 1 limit · R$ 214,80 of R$ 1.200 this month · faster than the month'], 'an older limit: it ends in September (its history stays), Home shows one limit');
  await page.evaluate(() => A['limit-open']({ cat: 'casa', sub: 'transporte' }));
  eq(await page.evaluate(() => [document.querySelector('#lm-amount').value, !document.querySelector('[data-a="limit-remove"]')]), ['', true], 'Transport again: an empty field, nothing to remove');
  await page.fill('#lm-amount', '320'); await page.click('[data-a="limit-save"]');
  eq(await tr(), [null, 30000, 32000], 'set again: the same line runs again from this month');
  // ---------- 5. the list, and every way to it ----------
  await page.evaluate(() => A.quick()); await page.click('.sheet.quick [data-v="limit"]'); await page.waitForSelector('.lim-list');
  eq(await page.evaluate(() => [UI.drawer.kind, document.querySelector('#overlay h2').innerText, [...document.querySelectorAll('.lim-list > li')].length]), ['limits', 'Spending limits', 4], 'a phone’s +: “Set a spending limit” opens the list, one row per expense category');
  eq(await page.evaluate(() => [...document.querySelectorAll('.lim-list .lim-c')].map(b => b.innerText.replace(/\s+/g, ' ').trim())),
    ['Groceries R$ 214,80 of R$ 1.200 this month · faster than the month', 'Transport R$ 0 of R$ 320 this month', 'Another limit in Home', 'Subscriptions Its costs are fixed bills in the Plan.', await page.evaluate(s => `Nights out ${fmt.money(s, CUR, { trim: true })} of R$ 600 this month`, spent), 'Bars R$ 0 of R$ 200 this month', 'Another limit in Other'],
    'the list: each limit and what is spent of it; a category that can have none says why');
  await page.click('#overlay .lim-list [data-a="limit-open"][data-sub="supermercado"]'); await page.waitForSelector('#lm-amount');
  ok(await page.evaluate(() => !!document.querySelector('#overlay .dr-back')), 'opened from the list: a way back to it');
  await page.fill('#lm-amount', '1100'); await page.click('[data-a="limit-save"]'); await page.waitForSelector('.lim-list');
  eq(await page.evaluate(() => [UI.drawer.kind, /R\$ 214,80 of R\$ 1\.100/.test(document.querySelector('.lim-list').innerText)]), ['limits', true], 'saved from the list: back to the list, which shows the new amount');
  await page.evaluate(() => { UI.drawer = null; renderOverlay(); A.find(); }); await page.fill('#find-q', 'limit');
  eq(await page.evaluate(() => (UI.find.items || findResults(UI.find.q))[0].title), 'Spending limits', 'the search: “limit” finds Spending limits first');
  await page.fill('#find-q', 'budget'); eq(await page.evaluate(() => findResults('budget')[0].title), 'Spending limits', 'and so does “budget”');
  await page.evaluate(() => { A['find-close'](); A.help(); }); await page.click('#overlay [data-a="help-go"][data-v="limit"]'); await page.waitForSelector('.lim-list');
  ok(await page.evaluate(() => /How do I set a spending limit\?/.test(helpQuestions().map(q => q[1]).join('|')) && UI.drawer.kind === 'limits'), 'Help: “How do I set a spending limit?” opens the list');
  await page.evaluate(() => { UI.drawer = null; renderOverlay(); navigate('profile'); }); await page.click('#nf-limits'); await page.waitForSelector('.lim-list');
  ok(true, 'the profile’s reminders: “See my limits” opens the list');
  await page.evaluate(() => { UI.drawer = null; S.user.notify.budgets = false; A['limit-open']({ cat: 'salidas' }); });
  ok(await page.evaluate(() => /Alerts for limits are off in your profile/.test(document.querySelector('#overlay').innerText)), 'with the alerts switched off, the panel says so instead of promising one');
  await page.evaluate(() => { S.user.notify.budgets = true; UI.drawer = null; renderOverlay(); navigate('categories'); });
  eq(await page.evaluate(() => [...document.querySelectorAll('.cat-lim, .cat-lim-add')].filter(b => b.getBoundingClientRect().height < 44).length), 0, 'a phone: every limit row on Categories is at least 44px tall');
  await page.evaluate(() => A.limits());
  eq(await page.evaluate(() => [...document.querySelectorAll('.lim-list button.lim-c')].filter(b => b.getBoundingClientRect().height < 44).length), 0, 'and every row of the list');
  eq(errors, [], 'no error in the console'); await browser.close();
  // ---------- the Plan on a computer; the company ----------
  ({ browser, page, errors } = await open({ lang: 'en', account: 'example', plan: true, viewport: { width: 1440, height: 900 } }));
  await page.evaluate(() => { S.user.greeted = true; navigate('plan'); });
  eq(await page.evaluate(() => { const c = document.querySelector('#limits-card'), pay = document.querySelector('#paylist'); return [!!c, pay.compareDocumentPosition(c) === Node.DOCUMENT_POSITION_FOLLOWING, c.querySelectorAll('.lim-list .lim-c').length > 0, !!c.querySelector('[data-a="plan-guide"]'), !pay.innerText.includes('Groceries')]; }), [true, true, true, true, true], 'a computer: the Plan has its limits card under the payments, with “Plan again”; the payments list has the bills only');
  await page.evaluate(() => { UI.drawer = null; A.space({ v: 'business' }); navigate('categories'); });
  const co = await page.evaluate(() => { const c = B().categories.find(k => !k.income && !B().plan.lines.some(l => l.categoryId === k.id)); return c && c.id; });
  ok(!!co, 'the company has a category with no costs planned');
  await page.click(`.cat-lim-add[data-cat="${co}"]`); await page.fill('#lm-amount', '900'); await page.click('[data-a="limit-save"]');
  eq(await page.evaluate(c => { const l = B().plan.lines.find(k => k.categoryId === c && k.pay === 'budget'); return [!!l, l && planValue(B(), l, ymOf(B().today)), S.plan.lines.some(k => k.categoryId === c)]; }, co), [true, 90000, false], 'the company’s limit goes in the company’s book, not the household’s');
  eq(errors, [], 'computer: no error in the console'); await browser.close();
  // ---------- Portuguese and Spanish; the narrowest phone ----------
  for (const [lang, w, words] of [['pt', 320, ['Definir limite', 'Limites de gasto', 'Por mês']], ['es', 390, ['Poner límite', 'Límites de gasto', 'Cada mes']]]) {
    ({ browser, page, errors } = await open({ lang, account: 'example', plan: true, viewport: { width: w, height: 700 }, touch: true, mobile: true }));
    await page.evaluate(() => { S.user.greeted = true; navigate('categories'); });
    ok(await page.evaluate(x => document.querySelector('.cat-lim-add').innerText.trim() === x, words[0]), `${lang}: “${words[0]}” on Categories`);
    eq(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${lang}, ${w}px: nothing wider than the screen`);
    await page.evaluate(() => A.limits()); ok(await page.evaluate(x => document.querySelector('#overlay h2').innerText === x, words[1]), `${lang}: the list is “${words[1]}”`);
    await page.click('#overlay [data-a="limit-open"][data-cat="salidas"]'); await page.waitForSelector('#lm-amount');
    ok(await page.evaluate(x => document.querySelector('label[for="lm-amount"]').innerText.startsWith(x), words[2]), `${lang}: the amount is “${words[2]} (R$)”`);
    eq(await page.evaluate(() => { const d = document.querySelector('#overlay .drawer'); return d.scrollWidth <= d.clientWidth + 1; }), true, `${lang}, ${w}px: the panel fits`);
    eq(errors, [], `${lang}: no error in the console`); await browser.close();
  }
  done('qc-limits');
})().catch(e => { console.error('qc-limits: Error', e); process.exit(1); });
