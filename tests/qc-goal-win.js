// QC of a contribution slid into its goal and its success screen (v198, owner, 2026-10-12: "quiero agregar pantallas interactivas de éxito… si el
// usuario va a guardar dinero en una meta no quiero que solo le dé guardar y ya, quiero que exista una interacción… que sienta que está haciendo algo
// con su dinero"; features/goals/goal-win.js).
//   1. the slide takes the place of "Record contribution" on the summary's look; a withdrawal, a starting balance and the previous look keep the button;
//   2. nothing moves until the amount is right; let go before the end, the coin slides back and nothing is recorded;
//   3. dragged to the end: recorded once, and the success screen says what changed (the ring, what is left, a milestone passed);
//   4. a tap or Enter sends the coin by itself; "See goal" opens the goal; "Done" goes back; a fund shows its total; the goal reached says so once;
//   5. with motion: the screen opens out of the goal's flag, the ring fills and its figure counts up to where it is now.
const { open, ok, eq, done } = require('./pw.js');

(async () => {
  const phone = { lang: 'en', account: 'example', plan: true, mobile: true, touch: true, viewport: { width: 390, height: 844 } };
  let { browser, page, errors } = await open(phone);
  await page.evaluate(() => { S.user.greeted = true; S.settings.theme = S.settings.themePhone = 'light'; navigate('dashboard'); render(); });
  // the goal with the least saved: a contribution of 25% of its target passes a quarter
  const G = await page.evaluate(() => { const g = B().goals.filter(g => g.status === 'active' && g.kind === 'goal' && g.target > 0).map(g => ({ id: g.id, name: g.name, target: g.target, pct: goalStatus(B(), g, B().today).pct })).sort((a, b) => a.pct - b.pct)[0]; return g; });
  const openMove = (dir = 'in', extra = {}) => page.evaluate(([id, dir, extra]) => { A.close(); A['goal-move']({ id, dir, ...extra }); }, [G.id, dir, extra]);
  const moves = () => page.evaluate(id => B().goalMoves.filter(m => m.goalId === id).length, G.id);
  const knob = () => page.evaluate(() => { const k = document.getElementById('gw-knob'), s = document.getElementById('gw-slide'), r = k.getBoundingClientRect(), t = s.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, end: t.right - r.width / 2 - 6, w: r.width, h: r.height }; });

  // ---------- 1. where the slide is ----------
  await openMove(); await page.waitForTimeout(200);
  eq(await page.evaluate(() => [!!document.getElementById('gw-slide'), !document.querySelector('#overlay [data-a="move-save"]'), document.getElementById('gw-say').textContent, Math.round(document.getElementById('gw-knob').getBoundingClientRect().width), getComputedStyle(document.getElementById('gw-knob')).touchAction]),
    [true, true, 'Slide to save', 52, 'none'], 'a contribution on the summary’s look ends in the slide: the coin (52 px), the words on the track; no “Record contribution” button');
  await page.fill('#m-amount', '15');
  eq(await page.evaluate(n => { const m = fmt.money(1500, BCUR()); return [document.getElementById('gw-say').textContent === `Slide to save ${m}`, document.getElementById('gw-knob').getAttribute('aria-label') === `Save ${m} in ${n}`]; }, G.name), [true, true], 'the amount as it is typed: in the track’s words and in the coin’s name for a screen reader');
  for (const [dir, extra, name] of [['out', {}, 'a withdrawal'], ['in', { initial: '1' }, 'a starting balance']]) {
    await openMove(dir, extra); await page.waitForTimeout(150);
    eq(await page.evaluate(() => [!!document.getElementById('gw-slide'), !!document.querySelector('#overlay [data-a="move-save"]')]), [false, true], `${name} keeps its plain button`);
  }

  // ---------- 2. nothing moves until it is right; let go early, it slides back ----------
  await openMove(); await page.waitForTimeout(200);
  let k = await knob(); await page.mouse.click(k.x, k.y); await page.waitForTimeout(150);
  eq(await page.evaluate(() => [UI.drawer && UI.drawer.kind, UI.drawer && UI.drawer.invalid, UI.sheet, document.getElementById('gw-knob').style.transform || 'none']), ['goal-move', 'm-amount', false, 'none'], 'no amount: the coin does not move, the reason is at the amount');
  await page.fill('#m-amount', String(G.target / 400)); k = await knob();      // a quarter of its target, in reais
  const n0 = await moves();
  await page.mouse.move(k.x, k.y); await page.mouse.down(); await page.mouse.move(k.x + 60, k.y, { steps: 4 });
  const mid = await page.evaluate(() => [document.getElementById('gw-slide').classList.contains('held'), document.getElementById('gw-knob').style.transform]);
  await page.mouse.up(); await page.waitForTimeout(400);
  eq([mid, await page.evaluate(() => document.getElementById('gw-knob').style.transform), await moves(), await page.evaluate(() => UI.sheet)], [[true, 'translateX(60px)'], 'translateX(0px)', n0, false], 'the coin follows the finger; let go before the end, it slides back and nothing is recorded');

  // ---------- 3. dragged to the end ----------
  await page.mouse.move(k.x, k.y); await page.mouse.down();
  for (let i = 1; i <= 8; i++) await page.mouse.move(k.x + (k.end - k.x) * i / 8, k.y);
  const ready = await page.evaluate(() => document.getElementById('gw-slide').classList.contains('ready'));
  await page.mouse.up(); await page.waitForSelector('#overlay .gw-win'); await page.waitForTimeout(100);
  const w = await page.evaluate(() => { const el = document.querySelector('#overlay .gw-win'), r = el.getBoundingClientRect(), tx = s => (el.querySelector(s) || {}).textContent;
    return [UI.sheet, UI.drawer, tx('.gw-kick'), tx('.gw-amt') === '+' + fmt.money(UI.win.amt, BCUR()), tx('#gw-num'), tx('.gw-h') + (el.querySelector('.gw-h .gw-conf svg.obj') ? ' +confetti' : ''), /^R\$ [\d,.]+ to go/.test(tx('.gw-say2') || ''), el.getAttribute('role'), el.getAttribute('aria-modal'), document.activeElement.dataset.a, r.width >= innerWidth - 1 && r.height >= innerHeight - 1, getComputedStyle(el).backgroundColor]; });
  eq([ready, await moves() - n0, w], [true, 1, ['goal-win', null, `Saved in ${G.name}`, true, '25%', 'A quarter of the way +confetti', true, 'dialog', 'true', 'gw-done', true, 'rgb(17, 38, 34)']],
    'dragged to the end: recorded once; the success screen fills the phone: what was put in, the ring at 25%, “A quarter of the way” with Dorax’s confetti beside it (v214: no emoji), what is left; the focus on Done');
  eq(await page.evaluate(() => { const el = document.querySelector('#overlay .gw-win'); return [getComputedStyle(el).backgroundColor === 'rgb(17, 38, 34)', [...el.querySelectorAll('.gw-acts .btn')].map(b => [b.textContent, getComputedStyle(b).backgroundColor, Math.round(b.getBoundingClientRect().height) >= 44])]; }),
    [true, [['Done', 'rgb(182, 221, 98)', true], ['See goal', 'rgba(255, 255, 255, 0.1)', true]]], 'on the forest; Done lime, See goal light on the forest, both 44 px or taller');
  await page.click('#overlay [data-a="gw-see"]'); await page.waitForTimeout(300);
  eq(await page.evaluate(id => [UI.sheet, UI.drawer && UI.drawer.kind, UI.drawer && UI.drawer.id === id, UI.win], G.id), [false, 'goal-view', true, null], '“See goal” opens the goal');

  // ---------- 4. a tap, Enter; Done; a fund; the goal reached ----------
  await openMove(); await page.waitForTimeout(200); await page.fill('#m-amount', '10'); k = await knob();
  await page.mouse.click(k.x, k.y); await page.waitForSelector('#overlay .gw-win');
  ok(await page.evaluate(() => UI.sheet === 'goal-win'), 'a tap on the coin sends it across by itself');
  await page.click('#overlay [data-a="gw-done"]'); await page.waitForTimeout(350);
  eq(await page.evaluate(() => [UI.sheet, UI.drawer, document.querySelector('#overlay').children.length]), [false, null, 0], 'Done: back to the page, nothing left open');
  await openMove(); await page.waitForTimeout(200); await page.fill('#m-amount', '10'); await page.focus('#gw-knob'); await page.keyboard.press('Enter'); await page.waitForSelector('#overlay .gw-win');
  ok(await page.evaluate(() => UI.sheet === 'goal-win'), 'Enter on the coin (a keyboard, a screen reader): the same');
  await page.keyboard.press('Escape'); await page.waitForTimeout(350);
  eq(await page.evaluate(() => UI.sheet), false, 'Escape closes the success screen');
  await page.evaluate(() => { A.close(); A['goal-move']({ id: 'emergencia', dir: 'in' }); }); await page.waitForTimeout(150); await page.fill('#m-amount', '50'); await page.focus('#gw-knob'); await page.keyboard.press('Enter'); await page.waitForSelector('#overlay .gw-win');
  eq(await page.evaluate(() => [document.querySelector('.gw-h').textContent, !!document.querySelector('.gw-ring'), !!document.querySelector('.gw-total .gw-pig-top'), /^You now have R\$ [\d,.]+ set aside\.$/.test(document.querySelector('.gw-say2').textContent)]), ['Money set aside', false, true, true], 'a fund (no target): no ring; the piggy bank alone and its total in the sentence (v217: "demasiados números aquí")');
  await page.evaluate(() => A.close()); await page.waitForTimeout(300);
  const left = await page.evaluate(id => { const g = B().goals.find(x => x.id === id); return g.target - goalSaved(B(), id); }, G.id);
  await page.evaluate(() => { S.user.cheer = S.user.cheer || { marks: {}, goals: [] }; });      // what the app has seen reached so far (features/ahead/curios.view.js)
  await openMove(); await page.waitForTimeout(200); await page.fill('#m-amount', (left / 100).toFixed(2).replace('.', ',')); await page.focus('#gw-knob'); await page.keyboard.press('Enter'); await page.waitForSelector('#overlay .gw-win'); await page.waitForTimeout(300);
  eq(await page.evaluate(id => [document.querySelector('.gw-h').textContent, !!document.querySelector('.gw-reached .fig img[src$="shadow/win.svg"]') && !document.getElementById('gw-num'), /^100% of R\$ [\d.,]+$/.test(document.querySelector('.gw-reached').getAttribute('aria-label')), (S.user.cheer && S.user.cheer.goals || []).includes(id), !(UI.curio && UI.curio.cheer === 'goal')], G.id), ['Goal reached!', true, true, true, true], 'the goal reached: said on this screen with the person who made it, holding its flag (v214), and not said again by the note that would have followed');
  await page.evaluate(() => A.close());
  eq(errors, [], 'phone: no error in the console'); await browser.close();

  // ---------- the previous look keeps its button ----------
  ({ browser, page, errors } = await open({ ...phone, oldLook: true }));
  await page.evaluate(id => { A['goal-move']({ id, dir: 'in' }); }, G.id); await page.waitForTimeout(150);
  eq(await page.evaluate(() => [!!document.getElementById('gw-slide'), !!document.querySelector('#overlay [data-a="move-save"]')]), [false, true], 'the previous look (the company’s side, a computer) keeps “Record contribution”');
  await browser.close();

  // ---------- 5. with motion ----------
  ({ browser, page, errors } = await open({ ...phone, motion: true }));
  await page.evaluate(() => { S.user.greeted = true; S.settings.theme = S.settings.themePhone = 'dark'; navigate('dashboard'); render(); });
  await page.evaluate(id => { A['goal-move']({ id, dir: 'in' }); }, G.id); await page.waitForTimeout(500); await page.fill('#m-amount', String(G.target / 200));
  await page.evaluate(() => { window.__gw = []; const o = Element.prototype.animate; Element.prototype.animate = function (k, opt) { window.__gw.push([this.className && this.className.baseVal !== undefined ? this.className.baseVal : this.className, JSON.stringify(k[0]).slice(0, 40)]); return o.call(this, k, opt); }; });
  k = await knob(); await page.mouse.move(k.x, k.y); await page.mouse.down();
  for (let i = 1; i <= 8; i++) await page.mouse.move(k.x + (k.end - k.x) * i / 8, k.y);
  await page.mouse.up(); await page.waitForSelector('#overlay .gw-win');
  const first = await page.evaluate(() => [__gw.some(([c, k]) => c === 'gw-win' && /clipPath.*circle/.test(k)), __gw.some(([c, k]) => c === 'gw-arc' && /strokeDashoffset/.test(k)), document.getElementById('gw-num').textContent]);
  await page.waitForTimeout(1700);
  eq([first, await page.evaluate(() => document.getElementById('gw-num').textContent)], [[true, true, '0%'], '50%'], 'with motion: it opens out of the flag, the ring fills, its figure counts from where it was (0%) to where it is (50%)');
  eq(errors, [], 'with motion: no error in the console'); await browser.close();
  done('qc-goal-win');
})();
