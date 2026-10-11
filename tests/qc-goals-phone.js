// QC of Savings & goals on a phone (owner, 2026-10-08: "of the 4 KPIs, the total bigger, 100% wide, with a bigger number; the other 3 smaller under
// it, with horizontal scroll if needed. Under them 3 buttons, Create, Contribute, Withdraw: with one of them a goal is chosen from the list. The goal
// cards under the buttons, with only the goal's name, the 'on plan' text and its figures, without 'You get there in…' and without the buttons. A tap
// opens the details with everything. Remove the savings hand-out from the phone. Goal: simplicity").
//   1. the order and the sizes: the total as wide as the screen with the largest number; three smaller figures in a row that can be swiped; three buttons;
//   2. the cards: name, how the goal stands against the plan, its figures; no date, no buttons, no account; a tap opens the details, which keep
//      everything (the date it is reached, the facts, Contribute, Withdraw, Edit, the movements);
//   3. Create opens a new goal; Contribute and Withdraw ask which goal (only goals with money for a withdrawal) and open its panel;
//   4. no hand-out of the savings payment on a phone; a computer keeps everything as it was;
//   5. the company's side, and Spanish and Portuguese on the narrowest phone.
const { open, ok, eq, done } = require('./pw.js');

(async () => {
  let { browser, page, errors } = await open({ lang: 'en', account: 'example', plan: true, viewport: { width: 390, height: 844 }, touch: true, mobile: true });
  await page.evaluate(() => navigate('goals'));
  // ---------- 1. order and sizes ----------
  eq(await page.evaluate(() => { const v = document.querySelector('#view'), top = s => { const el = v.querySelector(s); return el ? Math.round(el.getBoundingClientRect().top) : null; };
      const tot = v.querySelector('.g-total'), r = tot.getBoundingClientRect(), w = v.getBoundingClientRect(), big = parseFloat(getComputedStyle(tot.querySelector('.value')).fontSize), minis = [...v.querySelectorAll('.kpis.g-mini .kpi')];
      return [tot.querySelector('.label').innerText.trim(), Math.abs(r.width - (w.width - 32)) <= 2, big >= 34, minis.length, minis.every(k => parseFloat(getComputedStyle(k.querySelector('.value')).fontSize) < big / 1.8), getComputedStyle(v.querySelector('.kpis.g-mini')).overflowX,
        [...v.querySelectorAll('.g-acts button')].map(b => b.innerText.trim()), top('.g-total') < top('.kpis.g-mini') && top('.kpis.g-mini') < top('.g-acts') && top('.g-acts') < top('.g-list'), document.documentElement.scrollWidth - innerWidth]; }),
    ['Set aside in goals and funds', true, true, 3, true, 'auto', ['Create', 'Contribute', 'Withdraw'], true, 0],
    'the total is a card as wide as the screen with the largest number; the other three are smaller, in a row that can be swiped; then Create, Contribute, Withdraw; then the goals');
  ok(await page.evaluate(() => [...document.querySelectorAll('.g-acts button')].every(b => b.getBoundingClientRect().height >= 44)), 'the three buttons are a thumb high');
  ok(await page.evaluate(() => [...document.querySelectorAll('.kpis.g-mini .kpi .label, .kpis.g-mini .kpi .label > span')].every(l => l.scrollWidth <= l.clientWidth + 1 && getComputedStyle(l).textOverflow !== 'ellipsis')), 'no figure’s label is cut short');
  // ---------- 2. the cards ----------
  const card = await page.evaluate(() => { const c = document.querySelector('.g-item'); return { tag: c.tagName, a: c.dataset.a, txt: c.innerText, chip: !!c.querySelector('.chip'), btns: c.querySelectorAll('button').length, arrive: !!c.querySelector('.arrive'), name: c.querySelector('b').innerText.trim() }; });
  eq([card.tag, card.a, card.chip, card.btns, card.arrive, /You get there in|On your date|at the planned pace/i.test(card.txt), /Mercado Pago|Nubank|Goal ·|Fund ·/.test(card.txt)], ['BUTTON', 'goal-open', true, 0, false, false, false],
    'a card is one thing to tap: the name and how it stands against the plan, its figures; no date it is reached, no buttons, no account');
  eq(await page.evaluate(() => [...document.querySelectorAll('.g-item')].filter(c => c.querySelector('.meter')).map(c => /\d+% · .+ to go/.test(c.innerText)).every(Boolean)), true, 'a goal with a target shows what is saved of it, the bar and how much is left');
  eq(await page.evaluate(() => document.querySelector('#view').innerText.includes('Hand out the savings payment') || !!document.querySelector('#dist')), false, 'the hand-out of the savings payment is not on a phone');
  const withDate = await page.evaluate(() => { const g = B().goals.find(x => x.status === 'active' && x.kind === 'goal' && goalStatus(B(), x, B().today).state !== 'reached' && goalArrival(B(), x, B().today)); return g && g.id; });
  await page.click(`.g-item[data-id="${withDate}"]`);
  eq(await page.evaluate(() => { const d = document.querySelector('.drawer'); return [UI.drawer.kind, !d.querySelector('.arrive') && /reached in/.test(d.innerText), !!d.querySelector('[data-a="goal-move"][data-dir="in"]'), !!d.querySelector('[data-a="goal-move"][data-dir="out"]'), !!d.querySelector('[data-a="goal-edit"]'), !!d.querySelector('[data-a="whatif"]'), /Movements/.test(d.innerText)]; }),
    ['goal-view', true, true, true, true, true, true], 'a tap opens the details with everything: the date it is reached (said once, in its facts), Contribute, Withdraw, Edit, What if…?, the movements');
  // the movements: the date on its own line, then the movement with its amount and its x, a line between them (owner, 2026-10-08)
  eq(await page.evaluate(() => { const xs = [...document.querySelectorAll('.drawer .mv')]; return [xs.length > 1, xs.every(m => { const d = m.querySelector('.mv-date').getBoundingClientRect(), r = m.querySelector('.mv-row'), g = r.querySelector('.grow').getBoundingClientRect(), a = r.querySelector('.mv-amt').getBoundingClientRect(), x = r.querySelector('[data-a="move-delete"]').getBoundingClientRect(); return d.bottom <= g.top + 1 && g.right <= a.left && a.right <= x.left && /^\d\d\/\d\d\/\d{4}$/.test(m.querySelector('.mv-date').innerText.trim()); }), xs.slice(0, -1).every(m => getComputedStyle(m).borderBottomStyle === 'solid'), getComputedStyle(xs[xs.length - 1]).borderBottomStyle]; }),
    [true, true, true, 'none'], 'each movement: its date on a line of its own, then what it was, its amount and its x in that order; a line between movements');
  await page.evaluate(() => A.close());
  // ---------- 3. the three buttons ----------
  await page.click('.g-acts [data-a="goal-new"]'); eq(await page.evaluate(() => UI.drawer && UI.drawer.kind), 'goal-form', 'Create opens a new goal'); await page.evaluate(() => A.close());
  await page.click('.g-acts [data-a="goal-pick"][data-dir="in"]');
  const inList = await page.evaluate(() => { const s = document.querySelector('.sheet.g-pick'); return [s.querySelector('h2').innerText.trim(), [...s.querySelectorAll('button')].map(b => b.querySelector('b').innerText.trim()), [...s.querySelectorAll('button')].every(b => b.getBoundingClientRect().height >= 56), document.activeElement === s.querySelector('button'), s.getBoundingClientRect().bottom <= innerHeight + 1]; });
  eq([inList[0], inList[1].length === (await page.evaluate(() => B().goals.filter(g => g.status === 'active').length)), inList[2], inList[3], inList[4]], ['Contribute to which one?', true, true, true, true], 'Contribute asks which goal: every active one, each a big row, the first one focused');
  const pick = inList[1][1];
  await page.click(`.sheet.g-pick button:nth-child(2)`);
  eq(await page.evaluate(() => [UI.sheet, UI.drawer && UI.drawer.kind, UI.drawer && UI.drawer.draft.dir, UI.drawer && goalById(UI.drawer.draft.goalId).name, document.activeElement && document.activeElement.id]), [false, 'goal-move', 'in', pick, 'm-amount'], 'choosing one opens its contribution, with the cursor in the amount');
  await page.evaluate(() => A.close());
  await page.evaluate(() => { const g = B().goals.find(x => x.status === 'active'); B().goalMoves = B().goalMoves.filter(m => m.goalId === g.id); render(); });
  await page.click('.g-acts [data-a="goal-pick"][data-dir="out"]');
  eq(await page.evaluate(() => [UI.sheet, UI.drawer && UI.drawer.kind, UI.drawer && UI.drawer.draft.dir]), [false, 'goal-move', 'out'], 'only one goal has money: Withdraw goes straight to it');
  await page.evaluate(() => { A.close(); B().goalMoves = []; render(); UI.toast = null; renderToast(); });
  await page.click('.g-acts [data-a="goal-pick"][data-dir="out"]');
  eq([await page.evaluate(() => [UI.sheet, !!UI.drawer]), await page.evaluate(() => document.querySelector('#toast') && document.querySelector('#toast').innerText.trim())], [[false, false], 'No goal has money to withdraw yet.'], 'no goal has money: Withdraw says so and opens nothing');
  eq(errors, [], 'phone: no error in the console'); await browser.close();

  // ---------- 4. a computer keeps everything ----------
  ({ browser, page, errors } = await open({ lang: 'en', account: 'example', plan: true, viewport: { width: 1280, height: 900 } }));
  await page.evaluate(() => navigate('goals'));
  eq(await page.evaluate(() => [document.querySelectorAll('.tiles .tile').length, !!document.querySelector('#dist'), document.querySelectorAll('.goal [data-a="goal-move"]').length > 0, !!document.querySelector('.g-total, .g-acts, .g-item')]), [4, true, true, false], 'a computer keeps its four figures, the hand-out and the buttons on each card');
  eq(errors, [], 'computer: no error in the console'); await browser.close();

  // ---------- 5. the company's side; Spanish and Portuguese ----------
  for (const [lang, w, want] of [['es', 390, ['Apartado en metas y fondos', ['Crear', 'Aportar', 'Retirar'], '¿A cuál aportas?']], ['pt', 320, ['Reservado em metas e fundos', ['Criar', 'Aportar', 'Retirar'], 'Para qual você aporta?']]]) {
    ({ browser, page, errors } = await open({ lang, account: 'example', plan: true, viewport: { width: w, height: 700 }, touch: true, mobile: true }));
    await page.evaluate(() => navigate('goals'));
    eq(await page.evaluate(() => [document.querySelector('.g-total .label').innerText.trim(), [...document.querySelectorAll('.g-acts button')].map(b => b.innerText.trim()), [...document.querySelectorAll('.g-acts button, .g-item')].every(b => b.getBoundingClientRect().right <= innerWidth && b.scrollWidth <= b.clientWidth + 1), document.documentElement.scrollWidth - innerWidth]), [want[0], want[1], true, 0], `${lang}, ${w}px: in the language, nothing cut or wider than the screen`);
    await page.click('.g-acts [data-a="goal-pick"][data-dir="in"]'); eq(await page.evaluate(() => document.querySelector('.sheet.g-pick h2').innerText.trim()), want[2], `${lang}: the question in the language`); await page.evaluate(() => A.close());
    await page.evaluate(() => { A.space({ v: 'business' }); navigate('goals'); });
    ok(await page.evaluate(() => B().goals.length ? !!document.querySelector('.g-total') && !!document.querySelector('.g-acts') && !document.querySelector('#dist') : !!document.querySelector('#view .empty [data-a="goal-new"]')), `${lang}: the company’s side has the same simple screen (or, with no reserve yet, the button to create one)`);
    await page.evaluate(() => { B().goals.push({ id: 'g-co', name: 'Reserva', kind: 'fund', target: null, deadline: null, accountId: null, status: 'active', plan: {}, note: '' }); render(); });
    ok(await page.evaluate(() => !!document.querySelector('.g-total') && !!document.querySelector('.g-acts') && !document.querySelector('#dist') && !!document.querySelector('.g-item[data-id="g-co"]')), `${lang}: with a reserve, the company’s side has the same simple screen`);
    eq(errors, [], `${lang}: no error in the console`); await browser.close();
  }
  done('qc-goals-phone');
})();
