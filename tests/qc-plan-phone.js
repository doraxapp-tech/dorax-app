// QC of the month's payments on a phone (owner, 2026-10-08: "remove all the buttons from the 'Payments, October 2026' table, they are repetitive;
// move those actions to a window that opens after a tap on one of them. Leave only the bulk buttons like 'Mark 7 as paid'").
//   1. no button on any bill's row; each row is one thing to tap, with its name, its amount and how it stands; every bill of the month, no pages;
//   2. each group keeps its one bulk button, and it still records them all;
//   3. a tap opens the details, which have "Mark as paid" (fixed amount still to pay), "Record payment" and "Edit"; marking from there records the
//      planned amount, closes the details and the row says it is paid; a cost spent during the month offers "Add expense";
//   3c. under the figures, "Pay bills" and "Record payment" (owner, 2026-10-08, like Goals' two buttons; "Mark as paid" renamed "Pay bills"): each
//       asks which cost from a list; Pay bills lists the unpaid fixed bills and records the chosen one's planned amount; Record payment opens the
//       chosen cost's payment, straight away when there is only one; nothing left to pay says so;
//   4. a computer keeps its table and its buttons;
//   5. Spanish and Portuguese on the narrowest phone; rows a thumb high, nothing wider than the screen.
const { open, ok, eq, done } = require('./pw.js');

(async () => {
  let { browser, page, errors } = await open({ lang: 'en', account: 'example', plan: true, viewport: { width: 390, height: 844 }, touch: true, mobile: true });
  await page.evaluate(() => navigate('plan'));
  // ---------- 1. the rows ----------
  // the list keeps 24 px from what is above it in the card: the title, its chips, the due-days button (owner, 2026-10-08: "the list sat on the title")
  eq(await page.evaluate(() => { const c = document.querySelector('#paylist'), l = c.querySelector('.pl-list'), above = c.querySelector('.pl-due') || c.querySelector('.card-h'); return [getComputedStyle(l).marginTop, Math.round(l.getBoundingClientRect().top - above.getBoundingClientRect().bottom) >= 24]; }), ['24px', true], 'the list of payments starts 24 px under the card’s title');
  eq(await page.evaluate(() => { const L = document.querySelector('#paylist'), rows = [...L.querySelectorAll('.pl-row')], prog = planProgress(B(), B().month, BCUR(), B().today).filter(p => p.bill && (p.planned || p.spent));      // the limits have their own card (v146)
      return [rows.length === prog.length, rows.every(r => r.tagName === 'BUTTON' && r.dataset.a === 'line-open' && !r.querySelector('button')), L.querySelectorAll('[data-a="line-pay-now"], [data-a="line-pay"]').length, !!L.querySelector('.pager, [data-a="pg"]'), rows.every(r => !!r.querySelector('b') && !!r.querySelector('small') && !!r.querySelector('.chip')), /Nubank/.test(L.innerText), !!L.querySelector('.toolbar')]; }),
    [true, true, 0, false, true, false, false], 'every bill of the month is a row to tap with its name, amount and status; no button on any row, no pages, no account names, no footnote');
  ok(await page.evaluate(() => [...document.querySelectorAll('.pl-rows:not([hidden]) .pl-row')].every(r => r.getBoundingClientRect().height >= 56)), 'each row is a thumb high');
  // ---------- 1b. the groups fold (owner, 2026-10-08: "leave the first category (Home) open; if there are more, close them and put a down arrow that
  // says they open, so someone with many does not scroll the whole screen") ----------
  const fold = () => page.evaluate(() => [...document.querySelectorAll('#paylist .pl-grp')].map(g => { const b = g.querySelector('.pl-tog'), r = document.getElementById(b.getAttribute('aria-controls'));
    return [b.getAttribute('aria-expanded'), r.hidden, r.previousElementSibling === g, getComputedStyle(b.querySelector('svg')).transform !== 'none', b.getBoundingClientRect().height >= 44]; }));
  const f0 = await fold();
  eq([f0.length > 1, f0[0], f0.slice(1).every(x => x.join() === 'false,true,true,false,true')], [true, ['true', false, true, true, true], true], 'the first group open, its arrow turned up; the others closed, their arrow pointing down; each name a button a thumb high that says if it is open');
  eq(await page.evaluate(() => [...document.querySelectorAll('#paylist .pl-grp')].every(g => { const b = g.querySelector('.cat b'); return b.scrollWidth <= b.clientWidth + 1 && g.getBoundingClientRect().right <= innerWidth; })), true, 'each group’s name whole, its bulk button inside the screen');
  const cat2 = await page.evaluate(() => document.querySelectorAll('#paylist .pl-tog')[1].dataset.cat);
  await page.tap(`.pl-tog[data-cat="${cat2}"]`);
  eq(await page.evaluate(c => { const b = document.querySelector(`.pl-tog[data-cat="${c}"]`); return [b.getAttribute('aria-expanded'), document.getElementById('plg-' + c).hidden, document.activeElement === b, [...document.querySelectorAll(`#plg-${c} .pl-row`)].every(r => r.getBoundingClientRect().height >= 56)]; }, cat2), ['true', false, true, true], 'a tap on a closed group opens it, its rows a thumb high, the focus staying on its name');
  await page.evaluate(() => render());
  eq(await page.evaluate(c => document.querySelector(`.pl-tog[data-cat="${c}"]`).getAttribute('aria-expanded'), cat2), 'true', 'drawn again, it stays open');
  await page.tap(`.pl-tog[data-cat="${cat2}"]`);
  eq(await page.evaluate(c => document.getElementById('plg-' + c).hidden, cat2), true, 'a second tap closes it');
  const lateCat = await page.evaluate(() => { const c = document.querySelectorAll('#paylist .pl-tog')[1].dataset.cat, p = planProgress(B(), B().month, BCUR(), B().today).find(x => x.categoryId === c && x.bill && !x.spent && x.planned); if (p) { const l = lineById(p.id); l.due = 1; } render(); return [c, !!p]; });
  if (lateCat[1]) eq(await page.evaluate(c => { const ch = document.querySelector(`.pl-tog[data-cat="${c}"] .chip.warn`); return ch && ch.innerText.trim(); }, lateCat[0]), '1 late', 'a closed group with a late bill says so in amber, so nothing late hides');
  await page.evaluate(() => { UI.plOpen = Object.fromEntries(B().categories.map(c => [c.id, true])); render(); });      // the rest of the suite reads every row
  // ---------- 2. the bulk buttons ----------
  const bulk = await page.evaluate(() => [...document.querySelectorAll('#paylist [data-a="group-pay-now"]')].map(b => b.innerText.trim()));
  ok(bulk.length > 0 && bulk.every(x => /^Mark \d+ as paid$/.test(x)), 'each group with more than one fixed bill keeps its “Mark n as paid”', bulk);
  const cat = await page.evaluate(() => document.querySelector('#paylist [data-a="group-pay-now"]').dataset.cat);
  const before = await page.evaluate(c => planProgress(B(), B().month, BCUR(), B().today).filter(p => p.categoryId === c && p.pay === 'fixed' && !p.spent && p.planned).length, cat);
  await page.click(`#paylist [data-a="group-pay-now"][data-cat="${cat}"]`);
  eq(await page.evaluate(c => planProgress(B(), B().month, BCUR(), B().today).filter(p => p.categoryId === c && p.pay === 'fixed' && !p.spent && p.planned).length, cat), 0, `the bulk button records all ${before} at once`);
  await page.evaluate(() => A['undo-pay']());
  // ---------- 3. the details ----------
  const fixed = await page.evaluate(() => planProgress(B(), B().month, BCUR(), B().today).find(p => p.pay === 'fixed' && p.bill && !p.spent && p.planned).id);
  await page.click(`.pl-row[data-id="${fixed}"]`);
  eq(await page.evaluate(() => { const d = document.querySelector('.drawer'), b = [...d.querySelectorAll('.body [data-a="line-pay-now"], .body [data-a="line-pay"], .body [data-a="line-edit"]')].map(x => x.dataset.a); return [UI.drawer.kind, b, d.querySelector('[data-a="line-pay-now"]').classList.contains('primary'), /records the planned amount/.test(d.innerText), /Nubank|account/i.test(d.querySelector('.note').innerText)]; }),
    ['line-view', ['line-pay-now', 'line-pay', 'line-edit'], true, true, true], 'a tap opens the details: “Mark as paid” first, then “Record payment” and “Edit”, with what marking records and the account');
  const planned = await page.evaluate(id => planProgress(B(), B().month, BCUR(), B().today).find(p => p.id === id).planned, fixed);
  await page.click('.drawer [data-a="line-pay-now"]');
  eq(await page.evaluate(id => { const p = planProgress(B(), B().month, BCUR(), B().today).find(x => x.id === id); return [p.spent, !!UI.drawer, document.querySelector(`.pl-row[data-id="${id}"]`).classList.contains('done'), /Undo/.test(document.querySelector('#toast').innerText)]; }, fixed), [planned, false, true, true], 'marking it records the planned amount, closes the details, the row says it is paid, and the message offers Undo');
  const budget = await page.evaluate(() => { const p = planProgress(B(), B().month, BCUR(), B().today).find(x => x.pay === 'budget'); return p && p.id; });
  if (budget) { eq(await page.evaluate(id => [!document.querySelector(`.pl-row[data-id="${id}"]`), !!document.querySelector('#limits-card .lim-list [data-a="limit-open"]')], budget), [true, true], 'a cost spent during the month is a limit now: not among the payments, in the limits card (v146)'); }
  // the group's line is only its name and its bulk button; the three small figures each on one line, the row sliding sideways (owner, 2026-10-08)
  eq(await page.evaluate(() => [[...document.querySelectorAll('.pl-grp')].every(g => !g.querySelector('.note') && !/R\$|paid/.test(g.querySelector('.pl-tog').innerText)), [...document.querySelectorAll('.kpis.g-mini .kpi .label')].every(l => l.getBoundingClientRect().height < 24 && l.scrollWidth <= l.clientWidth + 1), getComputedStyle(document.querySelector('.kpis.g-mini')).overflowX, document.querySelector('.kpis.g-mini').scrollWidth > document.querySelector('.kpis.g-mini').clientWidth, [...document.querySelectorAll('.pl-row .chip')].every(c => c.getBoundingClientRect().height < 30)]),
    [true, true, 'auto', true, true], 'a group shows only its name and its bulk button; the three small figures keep their words on one line and the row slides; each status stays on one line');
  // ---------- 3b. the figures and the income (owner: "yes" to "Still to pay" large like in Goals, and the income as a short list that opens) ----------
  eq(await page.evaluate(() => { const v = document.querySelector('#view'), tot = v.querySelector('.g-total'), minis = [...v.querySelectorAll('.kpis.g-mini .kpi')], top = s => v.querySelector(s).getBoundingClientRect().top;
      return [tot.querySelector('.label').innerText.trim(), parseFloat(getComputedStyle(tot.querySelector('.value')).fontSize) >= 34, minis.map(k => k.querySelector('.label').innerText.trim().replace(/,.*/, '')), !v.querySelector('section.tiles'), top('.g-total') < top('.kpis.g-mini') && top('.kpis.g-mini') < top('#paylist')]; }),
    ['Still to pay', true, ['Fixed costs', 'Paid so far', 'Left after bills and limits'], true, true], '“Still to pay” is the large figure on top, the other three small under it, then the payments');
  eq(await page.evaluate(() => { const L = document.querySelector('#income-list'), rows = [...L.querySelectorAll('.pl-row')], y = +B().month.slice(0, 4);
      return [rows.length === payRows(B(), y).length, rows.every(r => r.dataset.a === 'pay-row-open' && !!r.querySelector('.pl-amt')), L.querySelectorAll('input, select').length, [...L.querySelectorAll('.pl-foot .btn')].map(b => b.dataset.a)]; }),
    [true, true, 0, ['add-pay', 'pay-copy']], 'the income is a list of rows to tap, each with its amount; no field in the list; “Add income” and “Use these amounts…” under it');
  const inc = await page.evaluate(() => document.querySelector('#income-list .pl-row').dataset.id);
  await page.click(`#income-list .pl-row[data-id="${inc}"]`);
  eq(await page.evaluate(id => [UI.drawer.kind, ['pn-', 'pv-', 'pt-', 'pd-'].every(k => !!document.getElementById(k + id)), !!document.querySelector('.drawer [data-a="remove-pay"]'), !!document.querySelector('.drawer footer [data-a="close"]')], inc), ['pay-row', true, true, true], 'a tap opens the income to edit: its name, the month’s amount, where it goes and its pay day; Done and Remove');
  await page.fill(`#pv-${inc}`, '3500'); await page.press(`#pv-${inc}`, 'Tab');
  await page.selectOption(`#pd-${inc}`, '7');
  eq(await page.evaluate(id => { const r = payRows(B(), +B().month.slice(0, 4)).find(x => x.id === id), m = +B().month.slice(5) - 1; return [r.values[m], r.day, !!UI.drawer]; }, inc), [350000, 7, true], 'a change is kept as it is made, and the panel stays open');
  await page.click('.drawer footer [data-a="close"]');
  eq(await page.evaluate(id => document.querySelector(`#income-list .pl-row[data-id="${id}"]`).innerText.replace(/\s+/g, ' '), inc), await page.evaluate(id => { const r = payRows(B(), +B().month.slice(0, 4)).find(x => x.id === id); return (r.name + ' ' + (r.to === 'savings' ? 'Goals' : 'Fixed costs') + ' · Pay day 7 R$ 3.500').replace(/\s+/g, ' '); }, inc), 'back on the list, the row shows the new amount and day');
  const n0 = await page.evaluate(() => payRows(B(), +B().month.slice(0, 4)).length);
  await page.click('#income-list [data-a="add-pay"]');
  eq(await page.evaluate(n => [payRows(B(), +B().month.slice(0, 4)).length === n + 1, UI.drawer && UI.drawer.kind, document.activeElement && document.activeElement.id.startsWith('pn-')], n0), [true, 'pay-row', true], '“Add income” adds one and opens it, with the cursor in its name');
  await page.evaluate(() => A.close()); await page.waitForTimeout(250);
  // ---------- 3c. Pay bills, Record payment ----------
  await page.evaluate(() => scrollTo(0, 0));
  eq(await page.evaluate(() => { const g = document.querySelector('#view .g-acts.two'), bs = [...g.querySelectorAll('button')], r = bs.map(b => b.getBoundingClientRect()), top = s => document.querySelector(s).getBoundingClientRect();
      return [bs.map(b => b.innerText.trim()), bs.map(b => b.dataset.v), top('.kpis.g-mini').bottom <= r[0].top, r[0].bottom <= top('#paylist').top, Math.round(r[0].top) === Math.round(r[1].top), r.every(x => x.height >= 44), bs[0].classList.contains('primary')]; }),
    [['Pay bills', 'Record payment'], ['mark', 'record'], true, true, true, true, true], 'under the three small figures, side by side and a thumb high: “Pay bills” (the main one) and “Record payment”');
  await page.click('#view [data-a="pay-pick"][data-v="mark"]'); await page.waitForSelector('.sheet.s-list');
  const unpaid = await page.evaluate(() => planProgress(B(), B().month, BCUR(), B().today).filter(p => p.pay === 'fixed' && !p.spent && p.planned > 0).map(p => p.id).sort().join());
  eq(await page.evaluate(() => { const sh = document.querySelector('.sheet.s-list'), bs = [...sh.querySelectorAll('.g-pick-list button')]; return [sh.querySelector('h2').innerText.trim(), bs.map(b => b.dataset.id).sort().join(), bs.every(b => b.getBoundingClientRect().height >= 56), document.activeElement === bs[0]]; }),
    ['Which bill are you paying?', unpaid, true, true], 'Pay bills: which one, from the month’s fixed bills not yet paid (the one paid above is not there); the first one has the focus');
  const pick = await page.evaluate(() => document.querySelector('.sheet.s-list .g-pick-list button').dataset.id);
  const want = await page.evaluate(id => planProgress(B(), B().month, BCUR(), B().today).find(p => p.id === id).planned, pick);
  await page.click('.sheet.s-list .g-pick-list button'); await page.waitForTimeout(300);
  eq(await page.evaluate(id => [planProgress(B(), B().month, BCUR(), B().today).find(p => p.id === id).spent, !!document.querySelector('.sheet'), !!UI.sheet, document.querySelector(`.pl-row[data-id="${id}"]`).classList.contains('done'), /Undo/.test(document.querySelector('#toast').innerText)], pick),
    [want, false, false, true, true], 'a tap on one: its planned amount is recorded, the list closes, its row says it is paid, and the message offers Undo');
  await page.click('#view [data-a="pay-pick"][data-v="record"]'); await page.waitForSelector('.sheet.s-list');
  const rec = await page.evaluate(() => [...document.querySelectorAll('.sheet.s-list .g-pick-list button')].map(b => b.dataset.id));
  eq(await page.evaluate(n => [document.querySelector('.sheet.s-list h2').innerText.trim(), n === planProgress(B(), B().month, BCUR(), B().today).filter(p => p.planned > 0 && !(p.pay === 'fixed' && p.spent)).length], rec.length), ['Record a payment for which one?', true], 'Record payment: which one, from every cost of the month still open (a paid bill is not there)');
  await page.click(`.sheet.s-list [data-id="${rec[0]}"]`); await page.waitForSelector('.drawer #py-amount');
  eq(await page.evaluate(id => [UI.drawer.kind, UI.drawer.draft.lineId === id, !!document.querySelector('.sheet')], rec[0]), ['line-pay', true, false], 'a tap on one opens its payment, the list gone');
  await page.evaluate(() => A.close()); await page.waitForTimeout(250);
  // one cost open: Record payment goes straight to it; nothing left: a message, no empty list
  const only = await page.evaluate(() => { const xs = payPickList('record', B().month); window.__keep = xs.slice(1).map(p => p.id); const real = planProgress; window.__real = real;
    planProgress = (...a) => real(...a).filter(p => !window.__keep.includes(p.id)); return xs[0].id; });
  await page.click('#view [data-a="pay-pick"][data-v="record"]'); await page.waitForTimeout(250);
  eq(await page.evaluate(id => [!!document.querySelector('.sheet'), UI.drawer && UI.drawer.kind, UI.drawer && UI.drawer.draft.lineId === id], only), [false, 'line-pay', true], 'only one cost open: Record payment opens its payment straight away');
  await page.evaluate(() => A.close()); await page.waitForTimeout(250);
  await page.evaluate(() => { planProgress = (...a) => window.__real(...a).filter(p => !(p.pay === 'fixed' && !p.spent)); });
  await page.click('#view [data-a="pay-pick"][data-v="mark"]'); await page.waitForTimeout(250);
  eq(await page.evaluate(() => [!!document.querySelector('.sheet'), document.querySelector('#toast').innerText.trim()]), [false, 'Every bill of the month is paid.'], 'every bill paid: Pay bills says so, and opens no empty list');
  await page.evaluate(() => { planProgress = window.__real; render(); });

  eq(errors, [], 'phone: no error in the console'); await browser.close();

  // ---------- 4. a computer ----------
  ({ browser, page, errors } = await open({ lang: 'en', account: 'example', plan: true, viewport: { width: 1280, height: 900 } }));
  await page.evaluate(() => navigate('plan'));
  eq(await page.evaluate(() => [!!document.querySelector('#paylist table.paylist'), document.querySelectorAll('#paylist tbody [data-a="line-pay-now"], #paylist tbody [data-a="line-pay"]').length > 0, document.querySelectorAll('.pl-row').length, document.querySelectorAll('section.tiles .tile').length, !document.querySelector('#view .payrows') && !!document.querySelector('#plan-month [data-a="plan-income"]') && (A['plan-income'](), document.querySelectorAll('#overlay .payrows input').length > 0)]), [true, true, 0, 4, true], 'a computer keeps its table with a button on each row and its four figures; the income form is one click away (2026-10-11)');
  eq(errors, [], 'computer: no error in the console'); await browser.close();

  // ---------- 5. languages, the narrowest phone ----------
  for (const [lang, w, want] of [['es', 390, ['Marcar pagado', 'Registrar pago', 'Editar', 'Pagar cuentas', 'Registrar pago']], ['pt', 320, ['Marcar como pago', 'Registrar pagamento', 'Editar', 'Pagar contas', 'Registrar pagamento']]]) {
    ({ browser, page, errors } = await open({ lang, account: 'example', plan: true, viewport: { width: w, height: 700 }, touch: true, mobile: true }));
    await page.evaluate(() => navigate('plan'));
    ok(await page.evaluate(() => [...document.querySelectorAll('.pl-row, .pl-grp')].every(r => r.getBoundingClientRect().right <= innerWidth + 1) && [...document.querySelectorAll('.pl-row b')].every(b => b.scrollWidth <= b.clientWidth + 1) && document.documentElement.scrollWidth <= innerWidth), `${lang}, ${w}px: every row fits the screen and no name is cut`);
    const id = await page.evaluate(() => planProgress(B(), B().month, BCUR(), B().today).find(p => p.pay === 'fixed' && p.bill && !p.spent && p.planned).id);
    await page.evaluate(() => { UI.plOpen = Object.fromEntries(B().categories.map(c => [c.id, true])); render(); });
    ok(await page.evaluate(() => [...document.querySelectorAll('.pl-grp')].every(g => g.getBoundingClientRect().right <= innerWidth + 1 && g.querySelector('.cat b').scrollWidth <= g.querySelector('.cat b').clientWidth + 1)), `${lang}, ${w}px: every group’s name whole and inside the screen (a bulk button that does not fit goes under it)`);
    await page.click(`.pl-row[data-id="${id}"]`);
    const got = await page.evaluate(() => [...document.querySelectorAll('.drawer .body [data-a="line-pay-now"], .drawer .body [data-a="line-pay"], .drawer .body [data-a="line-edit"]')].map(b => b.innerText.trim()));
    eq([got.length, got[2]], [3, want[2]], `${lang}: the details have their three buttons in the language`);
    await page.evaluate(() => A.close()); await page.waitForTimeout(250);
    eq(await page.evaluate(() => { const bs = [...document.querySelectorAll('#view .g-acts.two button')]; return [...bs.map(b => b.innerText.trim()), bs.every(b => b.scrollWidth <= b.clientWidth + 1 && b.getBoundingClientRect().right <= innerWidth)]; }), [...want.slice(3), true], `${lang}, ${w}px: the two buttons in the language, whole, inside the screen`);
    eq(errors, [], `${lang}: no error in the console`); await browser.close();
  }
  done('qc-plan-phone');
})();
