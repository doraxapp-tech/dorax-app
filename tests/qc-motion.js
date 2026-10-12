// QC of the motion added and trimmed on 2026-10-08 (owner: "run find-animation-opportunities", then "do them all"). Run with motion on.
//   1. a bill marked paid on a phone washes its row; several at once, the wash runs down them (40 ms apart);
//   2. a figure that changed ticks, the phone's too (what is still to pay, the balance in the bar on top), in 240 ms;
//   3. the month arrows: the next month comes in from the right, the previous one from the left;
//   4. reordering the dashboard (and the wallet's cards) slides what moved instead of jumping;
//   5. a panel that turns into its next step moves its content forward, and back again;
//   6. a transaction saved washes its row where it landed;
//   7. every screen plays its whole entrance, the days of freedom count up each time, the search panel has its entrance (owner, 2026-10-08: the
//      trims tried the same day were taken back, "bring them back, I liked them");
//   7b. "Another" on the insight of the day moves its fact in;
//   8. someone who asked for less motion gets none of it.
// v194: the household's phone has the summary "Bosque" in both themes (tests/qc-summary-phone.js tests it); this suite tests the parts of the
// previous phone look that the company's side and a computer still share, so it opens the app in that look (tests/pw.js: oldLook)
const { open, ok, eq, done } = require('./pw.js');
// every animation started is written down (its element and first frame), so a busy machine that finishes one before it is read does not hide it
const spy = () => { window.__an = []; const orig = Element.prototype.animate; Element.prototype.animate = function (k, o) { window.__an.push({ el: this, k: JSON.stringify(k) }); return orig.call(this, k, o); }; };

(async () => {
  // ---------- a phone ----------
  let { browser, page, errors } = await open({ oldLook: true, lang: 'en', account: 'example', plan: true, motion: true, viewport: { width: 390, height: 844 }, touch: true, mobile: true });
  await page.evaluate(spy);
  await page.evaluate(() => navigate('plan')); await page.waitForTimeout(500);
  await page.evaluate(() => { UI.plOpen = Object.fromEntries(B().categories.map(c => [c.id, true])); render(); });
  // ---------- 1 and 2. a bill marked paid ----------
  const before = await page.evaluate(() => [document.querySelector('.g-total .value').textContent, !!document.querySelector('.bar-bal')]);
  const one = await page.evaluate(() => planProgress(B(), B().month, BCUR(), B().today).find(p => p.pay === 'fixed' && p.bill && !p.spent && p.planned).id);
  await page.click(`.pl-row[data-id="${one}"]`); await page.waitForSelector('.drawer [data-a="line-pay-now"]');
  await page.click('.drawer [data-a="line-pay-now"]'); await page.waitForTimeout(60);
  eq(await page.evaluate(([id, b]) => { const r = document.querySelector(`.pl-row[data-id="${id}"]`), g = document.querySelector('.g-total .value');
      return [r.classList.contains('flash'), getComputedStyle(r).animationName, g.textContent !== b[0] && g.classList.contains('v-tick'), b[1], getComputedStyle(g).animationDuration]; }, [one, before]),
    [true, 'wash', true, false, '0.24s'], 'marked paid on a phone: its row washes; what is still to pay ticks, in 240 ms (the balance on top is only on the summary since 2026-10-09)');
  const cat = await page.evaluate(() => document.querySelector('#paylist [data-a="group-pay-now"]').dataset.cat);
  await page.click(`#paylist [data-a="group-pay-now"][data-cat="${cat}"]`); await page.waitForTimeout(60);
  eq(await page.evaluate(() => { const rs = [...document.querySelectorAll('.pl-row.flash')]; return [rs.length > 1, rs.map(r => getComputedStyle(r).animationDelay).slice(0, 3)]; }), [true, ['0s', '0.04s', '0.08s']], 'several marked at once: the wash runs down them, 40 ms apart');
  // ---------- 3. the month arrows ----------
  // the class is written down as it is put on: a busy machine may have taken it off again by the time it is read
  await page.evaluate(() => { window.__cls = []; new MutationObserver(() => { const v = document.querySelector('#view'), m = v.className.match(/from-\w+/); if (m) __cls.push([m[0], getComputedStyle(v).animationName]); }).observe(document.querySelector('#view'), { attributes: true, attributeFilter: ['class'] }); });
  const slid = () => page.evaluate(() => { const x = __cls[0] || [false, 'none']; window.__cls = []; return x; });
  await page.click('.pagehead [data-a="month"][data-d="-1"], .topbar [data-a="month"][data-d="-1"]');
  eq(await slid(), ['from-prev', 'from-prev'], 'the previous month comes in from the left');
  await page.waitForTimeout(450);
  await page.click('.pagehead [data-a="month"][data-d="1"], .topbar [data-a="month"][data-d="1"]');
  eq(await slid(), ['from-next', 'from-next'], 'the next one from the right');
  await page.waitForTimeout(450);
  ok(await page.evaluate(() => !/from-(next|prev)/.test(document.querySelector('#view').className)), 'and the class goes once it has played');
  // ---------- 4. reordering the dashboard ----------
  await page.evaluate(() => navigate('dashboard')); await page.waitForTimeout(400);
  await page.click('#dash-order-btn'); await page.waitForSelector('.sheet .ord-list');
  const first = await page.evaluate(() => { window.__an = []; return UI.dashShown[0]; });
  await page.click(`.sheet .ord-btn[data-id="${first}"][data-d="1"]`);
  eq(await page.evaluate(id => { const li = __an.find(x => x.el.matches(`.ord-list li[data-id="${id}"]`)); return [!!li, !!li && /translate/.test(li.k), __an.some(x => x.el.matches('#view > [id], #view > .grid > [id]'))]; }, first),
    [true, true, true], 'moving a part: its row in the list and the parts on the page slide to their places');
  await page.evaluate(() => { A.close(); S.user.dashOrder = {}; render(); }); await page.waitForTimeout(300);
  // ---------- 5. a panel's next step ----------
  await page.evaluate(() => navigate('goals')); await page.waitForTimeout(300);
  await page.evaluate(() => A['goal-open']({ id: B().goals.find(g => g.status === 'active').id })); await page.waitForSelector('.drawer');
  await page.waitForTimeout(400);
  // every animation started is written down, so a busy machine that finishes one before it is read does not hide it
  await page.evaluate(() => { window.__anims = []; const orig = Element.prototype.animate; Element.prototype.animate = function (k, o) { window.__anims.push([this.className, k[0] && k[0].transform]); return orig.call(this, k, o); }; });
  const stepOf = () => page.evaluate(() => { const x = window.__anims.find(a => a[0] === 'body'); window.__anims = []; return x && x[1]; });
  await page.click('.drawer [data-a="goal-move"]');
  const fwd = await stepOf();
  await page.waitForTimeout(300);
  await page.click('.drawer footer .btn.ghost');
  const back = [await page.evaluate(() => UI.drawer && UI.drawer.kind), await stepOf()];
  eq([fwd, back], ['translateX(16px)', ['goal-view', 'translateX(-16px)']], 'details → Contribute moves the panel’s content forward; back to the details, from the left');
  await page.evaluate(() => A.close());
  eq(errors, [], 'phone: no error in the console'); await browser.close();

  // ---------- v197: the summary "Bosque" on a phone (owner, 2026-10-12: "asegúrate que las transiciones al abrir menús sean smooth… los menús que
  // abren de los botones de acceso rápido no abren de manera fluida"; and "el teclado numérico sigue visible… necesito esconderlo") ----------
  ({ browser, page, errors } = await open({ lang: 'en', account: 'example', plan: true, motion: true, viewport: { width: 390, height: 844 }, touch: true, mobile: true }));
  await page.evaluate(() => { S.user.greeted = true; S.settings.theme = S.settings.themePhone = 'light'; navigate('dashboard'); render(); }); await page.waitForTimeout(500);
  // each panel's entrance, read on the frame after the tap: the panel and the dimmed page behind it are moving in
  const entrance = () => page.evaluate(() => new Promise(res => requestAnimationFrame(() => { const root = document.getElementById('overlay'), on = el => el ? el.getAnimations().filter(a => a.playState === 'running').map(a => a.animationName).join() : '';
    res([root.classList.contains('in'), on(root.querySelector('.drawer, .sheet')), on(root.querySelector('.scrim'))]); })));
  for (const [sel, name, kind] of [['#quick-acts [data-v="expense"]', 'an expense', 'expense'], ['#quick-acts [data-v="income"]', 'an income', 'income'], ['#quick-acts [data-v="transfer"]', 'a transfer', 'transfer'], ['#quick-acts [data-a="quick-more"]', 'More', null]]) {
    await page.tap(sel);
    eq(await entrance(), [true, 'sheet-in', 'fade-in'], `the summary’s quick button for ${name}: its panel slides up whole, the page behind dims (it used to appear at once)`);
    if (kind) eq(await page.evaluate(() => UI.drawer.draft.type), kind, `and it is set as ${name} from its first drawing`);
    await page.waitForTimeout(450); await page.evaluate(() => A.close()); await page.waitForTimeout(300);
  }
    await page.tap('#quick-acts [data-v="expense"]'); await page.waitForTimeout(500);
  eq(await page.evaluate(() => getComputedStyle(document.querySelector('#overlay .scrim')).backdropFilter), 'none', 'on a phone the page behind a panel is dimmed, not blurred: the blur of the whole screen while a panel slid in cost frames');
  // drawn again while it comes in, it goes on from where it was: the second drawing of a panel does not start its entrance over
  await page.evaluate(() => A.close()); await page.waitForTimeout(300);
  eq(await page.evaluate(() => new Promise(res => { A['new-tx'](); setTimeout(() => { renderOverlay(); const d = document.querySelector('#overlay .drawer'), a = d.getAnimations()[0];
    res([document.getElementById('overlay').classList.contains('in'), !!a && a.animationName, !!a && a.effect.getComputedTiming().progress >= .2]); }, 150); })), [true, 'sheet-in', true], 'a panel drawn again 150 ms into its entrance goes on from there, it does not jump back to the start');
  await page.waitForTimeout(450);
  // the keypad folds away and back
  const folds = () => page.evaluate(() => new Promise(res => requestAnimationFrame(() => { const w = document.querySelector('#overlay .bq-pad-wrap'); res(w.getAnimations().map(a => a.animationName).join()); })));
  await page.tap('#bq-pad-btn');
  const padOut = await folds(); await page.waitForTimeout(400);
  const down = await page.evaluate(() => Math.round(document.querySelector('#overlay .bq-pad-wrap').getBoundingClientRect().height));
  await page.tap('#d-amount');
  const padIn = await folds(); await page.waitForTimeout(450);
  eq([padOut, down, padIn, await page.evaluate(() => Math.round(document.querySelector('#overlay .bq-pad-wrap').getBoundingClientRect().height) > 150)], ['bq-pad-out', 0, 'bq-pad-in', true], 'the keypad folds away (to nothing) and unfolds again, each a short slide');
  await page.evaluate(() => A.close());
  eq(errors, [], 'the summary on a phone: no error in the console'); await browser.close();

  // ---------- a computer ----------
  ({ browser, page, errors } = await open({ oldLook: true, lang: 'en', account: 'example', plan: true, beta: true, motion: true, viewport: { width: 1280, height: 900 } }));
  await page.evaluate(spy); await page.waitForTimeout(300);
  // ---------- 7. screen to screen ----------
  await page.evaluate(() => navigate('plan'));
  eq(await page.evaluate(() => { const v = document.querySelector('#view'); return [v.classList.contains('enter'), getComputedStyle(v.firstElementChild).animationName, document.querySelector('#topbar').classList.contains('enter')]; }), [true, 'rise', true], 'another screen: its whole entrance, the cards rising');
  await page.evaluate(() => navigate('dashboard'));
  eq(await page.evaluate(() => { const n = document.querySelector('#runway-card .rw-n'); return +n.dataset.count > 0 && n.textContent !== fmt.num(+n.dataset.count); }), true, 'back on the dashboard, the days of freedom count up again');
  await page.waitForTimeout(1100);
  ok(await page.evaluate(() => { const n = document.querySelector('#runway-card .rw-n'); return n.textContent === fmt.num(+n.dataset.count); }), 'and land on their figure');
  await page.click('.findbtn'); await page.waitForSelector('.find');
  eq(await page.evaluate(() => [getComputedStyle(document.querySelector('.find')).animationName, getComputedStyle(document.querySelector('#find-root .scrim')).animationName]), ['find-in', 'fade-in'], 'the search panel (F) has its entrance');
  await page.keyboard.press('Escape'); await page.waitForTimeout(200);
  // ---------- 7b. "Another" on the insight of the day: the next fact comes in ----------
  await page.evaluate(() => { window.__an = []; });
  await page.click('#insight-next'); await page.waitForTimeout(30);
  eq(await page.evaluate(() => { const a = q => __an.find(x => x.el.isConnected && x.el.matches(q)), g = a('#insight-card .grow'); return [!!g, !!g && g.k.includes('translateX(18px)'), !!a('#insight-card .ins-mark'), !!a('#insight-card .card-h .fl-ico svg')]; }), [true, true, true, true], '“Another”: the next fact comes in from the right, its icon turns in and the picture settles (owner, 2026-10-08)');
  await page.evaluate(() => { UI.insightSkip = 0; render(); });
  // ---------- 4. the computer's order and the wallet ----------
  await page.click('#dash-order-btn'); await page.waitForSelector('.drawer .ord-list');
  await page.evaluate(() => { window.__an = []; });
  await page.click('.drawer .ord-btn[data-id="insight"][data-d="-1"]');      // a part on the page (the latest transactions wait one click away since 2026-10-11)
  ok(await page.evaluate(() => __an.some(x => x.el.matches('#view > .dash-grid > [id], #view > .grid > [id], #view > [id]') && /translate/.test(x.k))), 'the computer: the parts slide to their places');
  await page.evaluate(() => { A.close(); S.user.dashOrder = {}; render(); }); await page.waitForTimeout(300);
  await page.click('#wallet-pick-btn'); await page.waitForSelector('.drawer .wp-list');
  const w2 = await page.evaluate(() => { window.__an = []; return walletChosen()[1].id; });
  await page.click(`.drawer [data-a="wallet-pick-move"][data-id="${w2}"][data-d="-1"]`);
  eq(await page.evaluate(id => [__an.some(x => x.el.matches(`.drawer .wp-row[data-id="${id}"]`)), __an.some(x => x.el.matches(`#ac-card .w-mini[data-id="${id}"]`)), walletChosen()[0].id === id], w2), [true, true, true], 'the wallet: the row and the card slide to their new places');
  await page.evaluate(() => { A.close(); delete S.user.walletPick; render(); }); await page.waitForTimeout(300);
  // ---------- 6. a transaction saved ----------
  await page.evaluate(() => { S.user.dashHidden = Object.assign({}, S.user.dashHidden, { 'home-pc': [] }); render(); });      // the latest transactions, shown on the summary
  await page.click('.topbar [data-a="new-tx"]'); await page.waitForSelector('#d-merchant');
  await page.fill('#d-merchant', 'Padaria'); await page.fill('#d-amount', '12,50'); await page.click('[data-a="save-tx"]'); await page.waitForTimeout(80);
  eq(await page.evaluate(() => { const x = S.transactions.find(q => q.merchant === 'Padaria'), r = x && document.querySelector(`#recent-card tr[data-id="${x.id}"]`); return [!!r, r && r.classList.contains('flash'), r && getComputedStyle(r.querySelector('td')).animationName]; }), [true, true, 'wash'], 'a transaction saved: its row washes where it landed');
  eq(errors, [], 'computer: no error in the console'); await browser.close();

  // ---------- 8. less motion ----------
  ({ browser, page, errors } = await open({ oldLook: true, lang: 'en', account: 'example', plan: true, viewport: { width: 1280, height: 900 } }));
  await page.click('.topbar [data-a="month"][data-d="-1"]');
  await page.click('#dash-order-btn'); await page.waitForSelector('.drawer .ord-list');
  await page.click('.drawer .ord-btn[data-id="recent"][data-d="-1"]');
  eq(await page.evaluate(() => [/from-(next|prev)/.test(document.querySelector('#view').className), document.getAnimations().filter(a => a.playState === 'running').length]), [false, 0], 'less motion asked for: no slide, no fade, nothing moving');
  eq(errors, [], 'less motion: no error in the console'); await browser.close();
  done('qc-motion');
})();
