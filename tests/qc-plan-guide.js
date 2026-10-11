// QC (owner, 2026-10-10, after looking at Mobills and Organizze): "yes, do it, and check why the category Home cannot take a limit"; and, on Mobills:
// "first they have to put a spending limit on the categories; it teaches that this can be done ... it needs an income, and asks what percentage of
// your salary you want to save each month".
//   1. Home with every subcategory a bill (his account: the supermarket saved as a bill of variable amount) can take a limit: on the supermarket
//      (the bill becomes the limit, from this month) or on everything else in Home; nothing is ever counted twice;
//   2. the "today" mark on every limit bar, the bar of all the limits with "Today", "faster than the month";
//   3. the month as planned: what comes in, fixed bills, savings, limits, not assigned yet;
//   4. the Plan in two: payments without limits, the limits card, the year grid with limits apart, a new fixed cost without "several purchases";
//   5. "Plan your month": income (made when there is none), the share to keep, a figure per category with what is left worked out as typed, the end;
//      offered at the first fixed cost (with "Only add the fixed cost"), in the Plan's first visit, the first steps, the account's first setup, Help;
//   6. the whole screen on a phone, thumbs' sizes, Portuguese and Spanish, no error in the console.
const { open, ok, eq, done } = require('./pw.js');
(async () => {
  const phone = { viewport: { width: 390, height: 844 }, touch: true, mobile: true };
  let { browser, page, errors } = await open({ lang: 'en', account: 'example', plan: true, ...phone });
  // ---------- 1. Home made like his: every subcategory a bill, the supermarket a bill of variable amount ----------
  await page.evaluate(() => { S.user.greeted = true; const g = S.plan.lines.find(l => l.id === 'pl-supermercado'); g.pay = 'variable'; g.due = 30; const tr = S.plan.lines.find(l => l.id === 'pl-transporte'); tr.pay = 'fixed'; tr.due = 30; navigate('categories'); });
  const home = () => page.evaluate(() => { const c = S.categories.find(k => k.id === 'casa'); return limitTargets(S, c, ymOf(S.today)).map(x => [x.sub ? x.sub.id : '', !!x.bill, !!x.line, !!x.empty]); });
  eq(await home(), [['', false, false, true], ['electricidad', true, false, false], ['supermercado', true, false, false]], 'his Home: everything else (empty: every part has its line), and the two bills of variable amount that can become limits; never the fixed bills');
  ok(await page.evaluate(() => !!document.querySelector('[data-a="cat-toggle"][data-id="casa"]').closest('.cat-card').querySelector('.cat-lim-add')), 'Categories: Home now says “Set a limit” (before: nothing)');
  await page.click('.cat-lim-add[data-cat="casa"]'); await page.waitForSelector('#lm-for');
  eq(await page.evaluate(() => [document.querySelector('#lm-for').value, document.querySelector('#lm-amount').value, /Groceries is a bill of variable amount in your Plan \(R\$ 1\.200\)/.test(document.querySelector('.lim-covers').innerText)]),
    ['supermercado', '1.200', true], 'it opens on Groceries (everyday spending, by its name), with its own amount, and says the bill becomes a limit');
  await page.fill('#lm-amount', '1000'); await page.click('[data-a="limit-save"]');
  eq(await page.evaluate(() => { const l = S.plan.lines.find(k => k.id === 'pl-supermercado'); return [l.pay, l.due, planValue(S, l, ymOf(S.today)), planValue(S, l, '2026-09'), S.plan.lines.filter(k => k.subcategoryId === 'supermercado').length]; }),
    ['budget', undefined, 100000, 120000, 1], 'saved: the same line is now a limit, without a due day, R$ 1.000 from this month; September keeps the bill’s R$ 1.200');
  // the rest of Home
  await page.evaluate(() => { const c = S.categories.find(k => k.id === 'casa'); c.subs.push({ id: 's-deco', name: 'Decor' }); A['limit-open']({ cat: 'casa', sub: '' }); });
  ok(await page.evaluate(() => /outside its own lines in the Plan: Rent, Electricity, Internet and \d+ more/.test(document.querySelector('.lim-covers').innerText)), 'everything else in Home says what it leaves out');
  await page.fill('#lm-amount', '300'); await page.click('[data-a="limit-save"]');
  await page.evaluate(() => { const add = (id, cat, sub, amt) => S.transactions.push({ id, accountId: 'nu-conta', date: S.today, type: 'expense', amount: -amt, currency: 'BRL', categoryId: cat, subcategoryId: sub, status: 'confirmed', merchant: id }); add('x-deco', 'casa', 's-deco', 5000); add('x-loose', 'casa', null, 2000); add('x-rent', 'casa', 'alquiler', 7000); add('x-gro', 'casa', 'supermercado', 3000); });
  eq(await page.evaluate(() => { const ym = ymOf(S.today), p = planProgress(S, ym, CUR, S.today), rest = S.plan.lines.find(l => l.categoryId === 'casa' && !l.subcategoryId && l.pay === 'budget'), mp = monthPlan(S, ym);
      return [p.find(k => k.id === rest.id).spent, mp.bills + mp.limits === planTotals(S, ym).expenses, sum(p.map(k => k.planned)) === planTotals(S, ym).expenses]; }),
    [7000, true, true], 'the rest of Home counts Decor and the loose purchase (R$ 70), not the rent nor the groceries; the plan’s total counts each line once');
  await page.evaluate(() => { UI.drawer = null; A['new-tx'](); UI.drawer.draft.catKey = 'casa|s-deco'; renderOverlay(); });
  ok(await page.evaluate(() => /^Home: R\$ 230,00 left of R\$ 300,00 this month\.$/.test(((document.querySelector('.tx-lim') || {}).innerText || '').trim())), 'the expense form: Decor, with no line of its own, shows what is left of Home’s limit (R$ 300 less the R$ 70 spent)');
  await page.evaluate(() => { UI.drawer = null; renderOverlay(); navigate('categories'); });
  eq(await page.evaluate(() => document.querySelector('[data-a="cat-toggle"][data-id="casa"]').closest('.cat-card').querySelector('.cat-lim').innerText.trim()), await page.evaluate(() => { const i = limNow().casa; return tn(i.set.length, '{n} limit · {say}', '{n} limits · {say}', { say: limSay({ planned: i.planned, spent: i.spent, left: i.planned - i.spent, pct: Math.round(i.spent * 100 / i.planned) }) }); }), 'Home on Categories: its two limits together');
  // ---------- 2. today across the bars ----------
  await page.evaluate(() => A.limits());
  const pace = await page.evaluate(() => monthPace(S.today));
  eq(await page.evaluate(p => { const marks = [...document.querySelectorAll('#overlay .lim-bar .lim-today')]; return [marks.length > 2, marks.every(m => m.style.left === p + '%'), document.querySelector('#overlay .lim-total .lim-today span').innerText]; }, pace), [true, true, 'Today'], 'every bar has today across it, at the share of the month gone; the bar of all the limits says “Today”');
  eq(await page.evaluate(p => { const x = { planned: 10000, spent: Math.round((p + 12) * 100), left: 10000 - Math.round((p + 12) * 100), pct: Math.round(p + 12) }, y = { ...x, spent: Math.round(p * 100), left: 10000 - Math.round(p * 100), pct: Math.round(p) }; return [/faster than the month/.test(limSay(x)), limLevel(x), /faster/.test(limSay(y))]; }, pace), [true, 'warn', false], 'past today by more than ten points: “faster than the month”, in amber; at the pace of the month, nothing');
  // ---------- 3. the month as planned ----------
  eq(await page.evaluate(() => { const ym = ymOf(S.today), mp = monthPlan(S, ym), rows = [...document.querySelectorAll('#overlay .lim-legend .legend-row')].map(r => r.children[1].innerText + ' ' + r.children[2].innerText);
      return [mp.income === payTotal(S, ym), mp.free === mp.income - mp.bills - mp.saving - mp.limits, rows[0] === 'Fixed bills ' + limMoney(mp.bills), rows.some(r => r === 'Limits ' + limMoney(mp.limits)), document.querySelector('#overlay .lim-mh b').innerText === limMoney(mp.income)]; }),
    [true, true, true, true, true], 'the month as planned: what comes in (the Plan’s income), fixed bills, savings, limits, and what is left; the figures add up');
  // ---------- 4. the Plan in two ----------
  await page.evaluate(() => { UI.drawer = null; renderOverlay(); navigate('plan'); });
  eq(await page.evaluate(() => { const pay = document.querySelector('#paylist').innerText; return [/Groceries/.test(pay), !!document.querySelector('#limits-card .lim-list'), document.querySelector('.g-mini .kpi:last-child .label').innerText.trim()]; }), [false, true, 'Left after bills and limits'], 'a phone’s Plan: the payments are the bills; the limits have their own card; the last tile says what is left after both');
  await page.evaluate(() => A['line-new']());
  eq(await page.evaluate(() => [UI.drawer.kind, [...document.querySelectorAll('#l-pay option')].map(o => o.value), !!document.querySelector('[data-a="limit-from-line"]')]), ['line-form', ['fixed', 'variable'], true], 'a new fixed cost: one payment (same or changing amount); “several purchases” is a limit now, one tap away');
  await page.click('[data-a="limit-from-line"]'); eq(await page.evaluate(() => [UI.drawer.kind, UI.drawer.catId]), ['limit', 'casa'], 'that tap opens the limit of the group chosen in the form');
  eq(errors, [], 'phone: no error in the console'); await browser.close();
  // the year grid, on a computer
  ({ browser, page, errors } = await open({ lang: 'en', account: 'example', plan: true, viewport: { width: 1440, height: 900 } }));
  await page.evaluate(() => { S.user.greeted = true; navigate('plan'); });
  eq(await page.evaluate(() => { A['plan-year-open'](); const rows = [...document.querySelectorAll('.tbl.plan tbody tr')].map(r => r.querySelector('th') && r.querySelector('th').textContent.trim()), i = rows.indexOf('Spending limits'); return [i > rows.indexOf('Total Subscriptions'), rows.slice(i + 1, i + 4), rows.includes('Total bills and limits'), rows.includes('Left after bills and limits'), document.querySelector('.tiles .tile .value').innerText]; }),
    [true, ['Groceries', 'Transport', 'Total limits'], true, true, await page.evaluate(() => fmt.money(sum(planProgress(S, ymOf(S.today), CUR, S.today).filter(p => p.bill).map(p => p.planned)), CUR))], 'the year grid: bills by group, then the limits as a group of their own; the first tile counts the bills');
  eq(errors, [], 'computer: no error in the console'); await browser.close();
  // ---------- 5. "Plan your month", from a side with nothing planned yet ----------
  ({ browser, page, errors } = await open({ lang: 'en', account: 'example', plan: true, ...phone }));
  await page.evaluate(() => { S.user.greeted = true; S.pay = {}; S.plan.lines = S.plan.lines.filter(l => l.pay !== 'budget'); S.goals = []; delete S.plan.guideSeen; delete S.plan.savePct; navigate('plan'); });
  ok(await page.evaluate(() => !!document.querySelector('#limits-card .lim-invite [data-a="plan-guide"]')), 'with no limit, the Plan’s card invites to plan the month');
  await page.evaluate(() => A['line-new']()); await page.waitForSelector('.pg');
  eq(await page.evaluate(() => [UI.drawer.kind, !!document.querySelector('[data-a="pg-only-line"]'), S.plan.guideSeen, !!document.querySelector('#pg-income')]), ['plan-guide', true, true, true], 'the first “New fixed cost” of a side with no limit opens the guide, with “Only add the fixed cost”; no income yet: a field');
  eq(await page.evaluate(() => { const d = document.querySelector('#overlay .drawer'); return [d.classList.contains('full'), Math.round(d.getBoundingClientRect().height) === innerHeight]; }), [true, true], 'on a phone it takes the whole screen');
  await page.click('[data-a="pg-next"]'); eq(await page.evaluate(() => [UI.drawer.step, UI.drawer.invalid, document.activeElement.id]), [0, 'pg-income', 'pg-income'], 'no income typed: it says so at the field');
  await page.fill('#pg-income', '4500'); await page.keyboard.press('Enter'); await page.waitForSelector('#pg-pct');
  eq(await page.evaluate(() => { const r = payRows(S, 2026)[0]; return [r.to, r.values[8], r.values[9], r.values[11], monthPlan(S, ymOf(S.today)).income]; }), ['fixed', 0, 450000, 450000, 450000], 'Enter: an income row of the Plan, R$ 4.500 from this month to December');
  await page.click('.pg-chips [data-v="20"]');
  eq(await page.evaluate(() => [document.querySelector('#pg-pct').value, document.querySelector('#pg-save-say').innerText, document.querySelector('.pg-chips [data-v="20"]').getAttribute('aria-pressed')]), ['20', '20% is R$ 900 a month.', 'true'], 'step 2: 20% at a tap, R$ 900 a month');
  await page.fill('#pg-pct', '95'); await page.click('[data-a="pg-next"]'); ok(await page.evaluate(() => UI.drawer.invalid === 'pg-pct'), '95%: refused');
  await page.fill('#pg-pct', '15'); await page.click('[data-a="pg-next"]'); await page.waitForSelector('.pg-rows');
  const f0 = await page.evaluate(() => { const mp = monthPlan(S, ymOf(S.today)); return [S.plan.savePct, mp.target, mp.income - mp.bills - mp.saving]; });
  eq(f0.slice(0, 2), [15, 67500], 'saved: the share is 15%, R$ 675 a month');
  eq(await page.evaluate(() => document.querySelector('#pg-to-spend').innerText), await page.evaluate(v => limMoney(v), f0[2]), 'step 3: to spend = what comes in, less the bills, less what is kept');
  const rows = await page.evaluate(() => [...document.querySelectorAll('.pg-row b')].map(b => b.innerText));
  ok(rows.length >= 3 && rows.includes('Going out') && !rows.some(r => /Subscriptions/.test(r)), 'one field per category that can take a limit; Subscriptions (every part a fixed bill, nothing loose) is not offered');
  await page.fill('#pg-r-0', '500');
  eq(await page.evaluate(() => document.querySelector('#pg-free').innerText), await page.evaluate(v => `Not assigned yet: ${limMoney(v - 50000)}`, f0[2]), 'as it is typed: what has no job yet');
  if (await page.evaluate(() => !!document.querySelector('[data-a="pg-avg"]'))) { await page.click('[data-a="pg-avg"]'); ok(await page.evaluate(() => [...document.querySelectorAll('.pg-row input[data-avg]')].every(i => i.value !== '')), '“Use my averages” fills the empty fields with each average'); }
  await page.fill('#pg-r-0', '999999'); await page.dispatchEvent('#pg-r-0', 'input'); ok(await page.evaluate(() => /Over by/.test(document.querySelector('#pg-free').innerText)), 'more than there is: “Over by”, in red');
  await page.fill('#pg-r-0', '500'); await page.dispatchEvent('#pg-r-0', 'input');
  const typed = await page.evaluate(() => [...document.querySelectorAll('.pg-row input')].filter(i => i.value.trim()).length);
  await page.click('[data-a="pg-save"]'); await page.waitForSelector('.pg-end');
  eq(await page.evaluate(() => [S.plan.lines.filter(l => l.pay === 'budget' && planValue(S, l, ymOf(S.today)) > 0).length, UI.toast && UI.toast.msg, !!document.querySelector('.pg-end .lim-month .stackbar')]), [typed, typed === 1 ? '1 limit saved.' : `${typed} limits saved.`, true], 'saved: one limit per figure; the end shows the month as planned');
  await page.click('[data-a="pg-see"]'); eq(await page.evaluate(() => [UI.route, !UI.drawer, !document.querySelector('#limits-card .lim-invite')]), ['plan', true, true], '“See my limits”: the Plan’s limits card');
  await page.evaluate(() => A['line-new']()); eq(await page.evaluate(() => UI.drawer.kind), 'line-form', 'after that, “New fixed cost” opens its form straight away');
  // the ways to the guide
  eq(await page.evaluate(() => [tourText('plan').go[0], firstStepList().some(r => r[1] === 'Set your spending limits'), helpQuestions().some(q => q[0] === 'limit')]), ['plan-guide', true, true], 'the Plan’s first visit, the first steps and Help lead to it');
  await page.evaluate(() => { UI.drawer = null; S.plan.lines = S.plan.lines.filter(l => l.pay !== 'budget'); A.help(); }); await page.click('#overlay [data-a="help-go"][data-v="limit"]');
  eq(await page.evaluate(() => UI.drawer.kind), 'plan-guide', 'Help with no limit yet: the guide');
  await page.evaluate(() => { UI.drawer = null; A['plan-guide']({}); }); await page.evaluate(() => A['pg-next']()); await page.waitForSelector('#pg-pct');
  eq(await page.evaluate(() => [document.querySelector('#pg-pct').value, [...document.querySelectorAll('.pg-chips button')].every(b => b.getBoundingClientRect().height >= 44)]), ['15', true], 'again: the share saved before; every chip 44px tall');
  await page.evaluate(() => A['pg-next']()); await page.waitForSelector('.pg-rows');
  eq(await page.evaluate(() => [...document.querySelectorAll('.pg-row input')].filter(i => i.getBoundingClientRect().height < 44).length), 0, 'every field of step 3 is 44px tall');
  eq(errors, [], 'guide: no error in the console'); await browser.close();
  // ---------- 6. Portuguese and Spanish; the narrowest phone ----------
  for (const [lang, w, words] of [['pt', 320, ['Planeje seu mês', 'Passo 1 de 3', 'Limites de gasto']], ['es', 390, ['Planea tu mes', 'Paso 1 de 3', 'Límites de gasto']]]) {
    ({ browser, page, errors } = await open({ lang, account: 'example', plan: true, viewport: { width: w, height: 700 }, touch: true, mobile: true }));
    await page.evaluate(() => { S.user.greeted = true; navigate('plan'); });
    eq(await page.evaluate(() => [document.querySelector('#limits-card h2').innerText, document.documentElement.scrollWidth <= innerWidth]), [words[2], true], `${lang}, ${w}px: the limits card, nothing wider than the screen`);
    await page.evaluate(() => A['plan-guide']({}));
    eq(await page.evaluate(() => [document.querySelector('#overlay h2').innerText, document.querySelector('.pg-step').innerText.toLowerCase()]), [words[0], words[1].toLowerCase()], `${lang}: the guide speaks it`);
    for (let i = 0; i < 2; i++) await page.evaluate(() => A['pg-next']());
    eq(await page.evaluate(() => { const d = document.querySelector('#overlay .drawer'); return [d.scrollWidth <= d.clientWidth + 1, [...document.querySelectorAll('.pg-row label b')].every(b => b.getBoundingClientRect().width > 40)]; }), [true, true], `${lang}, ${w}px: step 3 fits, every name readable`);
    eq(errors, [], `${lang}: no error in the console`); await browser.close();
  }
  done('qc-plan-guide');
})().catch(e => { console.error('qc-plan-guide: Error', e); process.exit(1); });
