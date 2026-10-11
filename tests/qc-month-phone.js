// QC of the month on a phone (owner, 2026-10-08: "on the phone make the date selector use 100% of the space, background #000000 and border
// #1A1A1A, put the date in green, and let it be swiped to move between months. If the user goes far back, make a button 'back to present' appear
// with a push animation: it comes in from right to left and pushes the date, which shrinks. Remove the divider under the date too.").
//   1. the month takes the whole row, black with a #1A1A1A edge, the month in green; no line under it; the strip rests on the month on screen,
//      the next and previous ones just showing at its edges; a screen reader hears the month once, and the arrows;
//   2. a finger swipes it: to the right, the month before (the page comes in from the left); to the left, the month after; a quick flick moves
//      one month, however fast (what is under the finger follows it, so a drag across two months' width moves two); nothing past the present;
//      a short, slow drag springs back;
//   3. "Back to present" only three months or more back; it pushes in (its box grows from nothing, the month shrinks to make room) and, tapped,
//      opens the present month and leaves the way it came; the focus goes to the month;
//   4. someone who asked for less motion: the button is there or gone, nothing slides;
//   5. the narrowest phones: the month's name stays whole beside the button; nothing runs off the page;
//   6. a computer keeps its compact month; Spanish and Portuguese. From three months back (owner, 2026-10-09: "add a button to go back to the
//      present month in case the user goes far back in time") "Back to present" sits on the month's left, a plain button (the green one stays
//      "Add transaction"), the arrows do not move when it comes; clicked, it opens the present month and the focus goes to the month.
const { open, ok, eq, done } = require('./pw.js');

const PHONE = { viewport: { width: 390, height: 844 }, touch: true, mobile: true };
/** A finger on the strip, moved dx pixels (positive: to the right) in a few steps, then lifted. */
async function swipe(page, dx, steps = 6, gap = 16) {
  const cdp = await page.context().newCDPSession(page);
  const [x, y, w] = await page.evaluate(() => { const r = document.querySelector('.pagehead .m-strip').getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2, r.width]; });
  const at = k => ({ x: x - Math.sign(dx) * Math.min(60, w * .3) + dx * k, y });      // the finger lands on the strip, and may leave it as it moves
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [at(0)] });
  for (let i = 1; i <= steps; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [at(i / steps)] }); await page.waitForTimeout(gap); }
  if (gap > 16) await page.waitForTimeout(250);      // a slow drag rests before the finger lifts: no fling
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(900); await cdp.detach();
}
const state = page => page.evaluate(() => { const s = document.querySelector('.pagehead .m-strip'), on = s && s.querySelector('.m-slide.on'), b = document.querySelector('.pagehead .m-back');
  const mid = s && s.getBoundingClientRect().left + s.clientWidth / 2, o = on && on.getBoundingClientRect();
  return { month: S.month, centred: !!o && Math.abs(o.left + o.width / 2 - mid) <= 1.5, back: !!b, label: b ? b.innerText.trim() : null }; });

(async () => {
  let { browser, page, errors } = await open({ lang: 'es', account: 'example', plan: true, motion: true, ...PHONE });
  await page.evaluate(() => navigate('dashboard')); await page.waitForTimeout(900);
  const now = await page.evaluate(() => ymOf(S.today)), back = n => page.evaluate(n => addMonths(ymOf(S.today), -n), n);
  // ---------- 1. the row ----------
  eq(await page.evaluate(() => { const ph = document.querySelector('.pagehead'), row = ph.querySelector('.m-row'), m = ph.querySelector('.month'), s = m.querySelector('.m-strip'), cs = getComputedStyle(m);
      const sl = [...s.querySelectorAll('.m-slide')], on = s.querySelector('.m-slide.on'), prev = on.previousElementSibling.getBoundingClientRect(), sr = s.getBoundingClientRect();
      const jb = ph.querySelector('.jr-btn').getBoundingClientRect(), mr = m.getBoundingClientRect(), pr = ph.getBoundingClientRect();      // since v130 the summary's row ends with the Journey button
      return [Math.round(mr.left) === Math.round(pr.left + 16) && Math.round(jb.right) === Math.round(pr.right - 16) && mr.right <= jb.left - 6, cs.backgroundColor, cs.borderTopColor, getComputedStyle(on).color, getComputedStyle(ph).borderBottomWidth,
        on.dataset.ym === S.month, sl[0].dataset.ym === minMonth() && sl[sl.length - 1].dataset.ym === ymOf(S.today), prev.right > sr.left + 4 && prev.left < sr.left,
        s.getAttribute('aria-hidden'), s.tabIndex, m.querySelector('.sr').textContent === fmt.month(S.month, true), [...m.querySelectorAll('button')].map(b => b.getAttribute('aria-label')), !!row.querySelector('.m-back')]; }),
    [true, 'rgb(0, 0, 0)', 'rgb(26, 26, 26)', 'rgb(62, 207, 142)', '0px', true, true, true, 'true', -1, true, ['Mes anterior', 'Mes siguiente'], false],
    'the month takes the row up to the Journey button (v130), black with a #1A1A1A edge, in green, no line under it; the strip holds every month from the first to the present and rests on this one, the month before just showing at its edge; a screen reader hears the month once and the two arrows; no button at the present');
  ok((await state(page)).centred, 'the month on screen sits in the middle of the strip');
  // ---------- 2. a finger ----------
  await page.evaluate(() => { window.__cls = []; new MutationObserver(() => { const c = document.querySelector('#view').className; if (/from-/.test(c)) __cls.push(c.match(/from-\w+/)[0]); }).observe(document.querySelector('#view'), { attributes: true, attributeFilter: ['class'] }); });
  // only the month in the middle is green, the others white; it follows the finger before the strip comes to rest (owner, 2026-10-08)
  eq(await page.evaluate(() => { const sl = [...document.querySelectorAll('.pagehead .m-slide')]; return [sl.filter(e => e.classList.contains('mid')).map(e => e.dataset.ym), getComputedStyle(sl.find(e => e.classList.contains('mid'))).color, sl.filter(e => !e.classList.contains('mid')).every(e => getComputedStyle(e).color === 'rgb(255, 255, 255)')]; }),
    [[now], 'rgb(62, 207, 142)', true], 'only the month on screen is green, the others white');
  {
    const cdp = await page.context().newCDPSession(page), [x, y] = await page.evaluate(() => { const r = document.querySelector('.pagehead .m-strip').getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x - 40, y }] });
    for (let i = 1; i <= 8; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x - 40 + i * 12, y }] }); await page.waitForTimeout(30); }
    await page.waitForTimeout(150);
    eq(await page.evaluate(() => [[...document.querySelectorAll('.pagehead .m-slide.mid')].map(e => e.dataset.ym), S.month]), [[await back(1)], now], 'as the finger brings the month before to the middle, it turns green (before the strip comes to rest)');
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await page.waitForTimeout(900); await cdp.detach();
    await page.evaluate(() => monthGo(ymOf(S.today))); await page.waitForTimeout(500);
  }
  await page.evaluate(() => { window.__cls = []; });
  await swipe(page, 150);
  eq([await state(page), await page.evaluate(() => [...new Set(__cls)].join())], [{ month: await back(1), centred: true, back: false, label: null }, 'from-prev'], 'a swipe to the right: the month before, in the middle of the strip, its page coming in from the left');
  await swipe(page, 120, 2);
  eq([await state(page), await page.evaluate(() => [getComputedStyle(document.querySelector('.pagehead .m-strip')).scrollSnapType, getComputedStyle(document.querySelector('.pagehead .m-slide')).scrollSnapStop])],
    [{ month: await back(2), centred: true, back: false, label: null }, ['x mandatory', 'always']], 'a quick flick moves one month, not several: the strip comes to rest on a month, and stops at each one');
  await swipe(page, -150);
  eq(await state(page), { month: await back(1), centred: true, back: false, label: null }, 'to the left: the month after');
  await swipe(page, -150); await swipe(page, -150);
  eq((await state(page)).month, now, 'and nothing past the present');
  await swipe(page, 30, 10, 40);
  eq(await state(page), { month: now, centred: true, back: false, label: null }, 'a short, slow drag springs back: nothing changes');
  // ---------- 3. back to the present ----------
  await page.click('.pagehead .m-ph [data-d="-1"]'); await page.waitForTimeout(250); await page.click('.pagehead .m-ph [data-d="-1"]'); await page.waitForTimeout(250);
  eq((await state(page)).back, false, 'two months back: no button yet');
  // every animation started is written down, so a busy machine that finishes one before it is read does not hide it
  await page.evaluate(() => { window.__anims = []; const orig = Element.prototype.animate; Element.prototype.animate = function (k, o) { window.__anims.push([this.className, JSON.stringify(k), this.hasAttribute('inert')]); return orig.call(this, k, o); }; });
  await page.click('.pagehead .m-ph [data-d="-1"]'); await page.waitForTimeout(20);
  eq(await page.evaluate(() => { const b = document.querySelector('.pagehead .m-back'), a = window.__anims.find(x => x[0] === 'm-back'), lbl = window.__anims.find(x => /m-slide/.test(x[0]));
      return [!!b, !!a && /"width":"0px"/.test(a[1]), !!lbl && /translateX\(-24px\)/.test(lbl[1])]; }), [true, true, true],
    'three months back: “Volver al presente” pushes in, its box growing from nothing, and the month’s name comes in from the left');
  await page.waitForTimeout(500);
  eq(await page.evaluate(() => { const row = document.querySelector('.pagehead .m-row').getBoundingClientRect(), m = document.querySelector('.pagehead .m-ph').getBoundingClientRect(), b = document.querySelector('.pagehead .m-back .btn').getBoundingClientRect(), on = document.querySelector('.pagehead .m-slide.on'), s = on.parentElement;
      const tw = (() => { const r = document.createRange(); r.selectNodeContents(on); return r.getBoundingClientRect(); })(), sr = s.getBoundingClientRect();
      return [Math.round(m.left) === Math.round(row.left), b.right <= row.right + 0.5 && b.left >= m.right + 7, m.width < row.width - 150, tw.left >= sr.left && tw.right <= sr.right, b.height >= 44, document.querySelector('.pagehead .m-back .btn').innerText.trim(), getComputedStyle(document.querySelector('.pagehead .jr-btn')).display, Math.round(row.right) === Math.round(document.querySelector('.pagehead').getBoundingClientRect().right - 16)]; }),
    [true, true, true, true, true, 'Volver al presente', 'none', true], 'once in: the month shrank to make room and keeps its name whole; the button a thumb high, at the row’s end; the Journey steps out meanwhile (no room for three)');
  await page.evaluate(() => { window.__anims = []; });
  await page.click('.pagehead .m-back .btn'); await page.waitForTimeout(20);
  eq(await page.evaluate(() => { const a = window.__anims.find(x => x[0] === 'm-back leaving'); return [S.month === ymOf(S.today), !!a && a[2], !!a && /"width":"0px"\}\]$/.test(a[1])]; }),
    [true, true, true], 'tapped: the present month, and the button leaves the way it came, out of reach while it goes');
  await page.waitForTimeout(400);
  eq(await page.evaluate(() => [!!document.querySelector('.pagehead .m-back'), document.activeElement.getAttribute('aria-label'), (() => { const m = document.querySelector('.pagehead .m-ph').getBoundingClientRect(), jb = document.querySelector('.pagehead .jr-btn').getBoundingClientRect(), pr = document.querySelector('.pagehead').getBoundingClientRect(); return Math.round(m.left) === Math.round(pr.left + 16) && Math.round(jb.right) === Math.round(pr.right - 16) && m.right <= jb.left - 6; })()]),
    [false, 'Mes anterior', true], 'then it is gone, the month and the Journey share the row again, and the focus is on the month');
  await page.evaluate(() => { S.month = addMonths(ymOf(S.today), -5); navigate('plan'); }); await page.waitForTimeout(500);
  await swipe(page, -150); await swipe(page, -150);
  eq(await state(page), { month: await back(3), centred: true, back: true, label: 'Volver al presente' }, 'swiping forward, the button stays while still three months back');
  await swipe(page, -150); await page.waitForTimeout(300);
  eq(await state(page), { month: await back(2), centred: true, back: false, label: null }, 'and goes once within reach');
  eq(errors, [], 'no error in the console'); await browser.close();

  // ---------- 4. less motion ----------
  ({ browser, page, errors } = await open({ lang: 'pt', account: 'example', plan: true, ...PHONE }));
  await page.evaluate(() => { S.month = addMonths(ymOf(S.today), -2); navigate('dashboard'); }); await page.waitForTimeout(300);
  await page.click('.pagehead .m-ph [data-d="-1"]');
  eq(await page.evaluate(() => [!!document.querySelector('.pagehead .m-back'), document.querySelector('.pagehead .m-back .btn').innerText.trim(), document.getAnimations().filter(a => a.playState === 'running').length]), [true, 'Voltar ao presente', 0], 'less motion asked for: the button is simply there (in Portuguese), nothing slides');
  await page.click('.pagehead .m-back .btn');
  eq(await page.evaluate(() => [S.month === ymOf(S.today), !!document.querySelector('.pagehead .m-back'), document.getAnimations().filter(a => a.playState === 'running').length]), [true, false, 0], 'and simply gone');
  eq(errors, [], 'less motion: no error in the console'); await browser.close();

  // ---------- 5. the narrowest phones ----------
  for (const [lang, w] of [['pt', 320], ['es', 360]]) {
    ({ browser, page, errors } = await open({ lang, account: 'example', plan: true, viewport: { width: w, height: 640 }, touch: true, mobile: true }));
    await page.evaluate(() => { S.month = addMonths(ymOf(S.today), -4); navigate('goals'); }); await page.waitForTimeout(300);
    eq(await page.evaluate(() => { const on = document.querySelector('.pagehead .m-slide.on'), s = on.parentElement, r = document.createRange(); r.selectNodeContents(on); const t = r.getBoundingClientRect(), sr = s.getBoundingClientRect(), b = document.querySelector('.pagehead .m-back .btn').getBoundingClientRect();
        return [t.left >= sr.left && t.right <= sr.right, b.right <= innerWidth - 15, document.documentElement.scrollWidth - innerWidth <= 0]; }), [true, true, true], `${w} px: the month’s name stays whole beside the button; nothing runs off the page`);
    eq(errors, [], `${w} px: no error in the console`); await browser.close();
  }

  // ---------- 6. a computer ----------
  ({ browser, page, errors } = await open({ lang: 'es', account: 'example', plan: true, viewport: { width: 1280, height: 860 } }));
  await page.evaluate(() => { S.month = addMonths(ymOf(S.today), -5); navigate('dashboard'); }); await page.waitForTimeout(300);
  eq(await page.evaluate(() => { const m = document.querySelector('.topbar .month'); return [!!m, !document.querySelector('.m-strip, .m-back'), m.querySelector('span').textContent === fmt.month(S.month, true)]; }), [true, true, true], 'a computer keeps its compact month in the top bar, with no strip and no button');
  // the way back on a computer
  await page.evaluate(() => { S.month = ymOf(S.today); render(); }); await page.waitForTimeout(200);
  const arrow = '.topbar .month [data-d="-1"]', x0 = (await page.locator(arrow).boundingBox()).x, seen = [];
  for (let i = 0; i < 4; i++) { seen.push(await page.locator('.topbar .m-now').count()); await page.click(arrow); await page.waitForTimeout(120); }
  seen.push(await page.locator('.topbar .m-now').count());
  eq(seen, [0, 0, 0, 1, 1], 'computer: "Back to present" from three months back, not before');
  eq(await page.evaluate(() => { const b = document.querySelector('.topbar .m-now'), m = document.querySelector('.topbar .month'); return [b.textContent.trim(), b.className, b.getBoundingClientRect().right <= m.getBoundingClientRect().left, Math.abs(b.getBoundingClientRect().height - m.getBoundingClientRect().height) <= 2]; }),
    ['Volver al presente', 'btn m-now', true, true], 'computer: a plain button on the month’s left, as tall as the month');
  eq((await page.locator(arrow).boundingBox()).x, x0, 'computer: the arrow under the pointer did not move');
  ok(await page.evaluate(() => document.activeElement && document.activeElement.matches('.topbar .month [data-d="-1"]')), 'computer: the focus stays on the arrow while the month moves');
  await page.click('.topbar .m-now'); await page.waitForTimeout(250);
  eq(await page.evaluate(() => [S.month === ymOf(S.today), document.querySelectorAll('.m-now').length, !!(document.activeElement && document.activeElement.matches('.topbar .month [data-d="-1"]'))]), [true, 0, true], 'computer: clicked, the present month opens, the button goes, the focus is on the month');
  await page.evaluate(() => { S.month = addMonths(ymOf(S.today), -6); navigate('reports'); }); await page.waitForTimeout(200);
  ok(await page.locator('.topbar .m-now').count() === 1, 'computer: the same on Reports');
  eq(errors, [], 'computer: no error in the console'); await browser.close();
  done('qc-month-phone');
})();
