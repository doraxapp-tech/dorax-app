// QC of switches that glide and folds that slide (v202, owner, 2026-10-12: "la mayoría de estos switches, cuando cambio de vista, no hacen una
// transición fluida, ni en computadora ni en la versión móvil; también el botón de más opciones"; app/js/ui/glide.js).
//   1. a switch: the pressed pill slides from the old choice to the new one (a pill of the pressed colour under the words), then the switch is as
//      before (no pill left over, the pressed button with its own colour again); on a phone and a computer, in a panel and on a page;
//   2. what the switch shows after it fades in; a choice for one row or the theme only moves its pill;
//   3. "More options" slides open and shut, a click while it moves is let go; the focus stays on it;
//   4. with less motion asked for, nothing moves; no error.
const { open, ok, eq, done } = require('./pw.js');

(async () => {
  for (const [name, vp, mobile] of [['phone', { width: 390, height: 844 }, true], ['computer', { width: 1440, height: 900 }, false]]) {
    const { browser, page, errors } = await open({ lang: 'en', account: 'example', plan: true, motion: true, viewport: vp, mobile });
    await page.evaluate(() => { S.user.greeted = true; S.settings.theme = S.settings.themePhone = 'light'; navigate('dashboard'); render(); }); await page.waitForTimeout(400);
    // every animation five times slower, so a busy machine still sees them under way (Chrome's own control, as its developer tools do)
    const cdp = await page.context().newCDPSession(page); await cdp.send('Animation.enable'); await cdp.send('Animation.setPlaybackRate', { playbackRate: .2 });

    // ---------- 1. the panel's switch ----------
    await page.evaluate(() => A['new-tx']({})); await page.waitForTimeout(2600);
    const want = await page.evaluate(() => getComputedStyle(document.querySelector('#overlay .tx-kind [aria-pressed="true"]')).backgroundColor);
    await page.click('#overlay .tx-kind [data-v="transfer"]'); await page.waitForTimeout(70);
    const mid = await page.evaluate(() => { const g = document.querySelector('#overlay .tx-kind'), th = g.querySelector('.glide-thumb'), to = g.querySelector('[data-v="transfer"]'), r = el => el.getBoundingClientRect();
      return th ? [getComputedStyle(th).backgroundColor, r(th).left < r(to).left - 4, getComputedStyle(to).backgroundColor, g.classList.contains('glide-on')] : null; });
    eq(mid, [want, true, 'rgba(0, 0, 0, 0)', true], `${name}: the pressed pill slides toward the new choice (its colour, on its way), the new button’s own pill hidden while it moves`);
    await page.waitForTimeout(2600);
    eq(await page.evaluate(() => { const g = document.querySelector('#overlay .tx-kind'); return [!!g.querySelector('.glide-thumb'), g.classList.contains('glide-on'), getComputedStyle(g.querySelector('[aria-pressed="true"]')).backgroundColor, UI.drawer.draft.type]; }),
      [false, false, want, 'transfer'], `${name}: then the switch is as before, the new choice pressed`);
    ok(await page.evaluate(() => document.querySelector('#overlay .tx-amount').getAnimations().length === 0), `${name}: the fade of what follows is over`);
    await page.click('#overlay .tx-kind [data-v="expense"]'); await page.waitForTimeout(40);
    ok(await page.evaluate(() => [...document.querySelectorAll('#overlay .tx-amount, #overlay .tx-grid')].some(el => el.getAnimations().length > 0)), `${name}: what the switch shows after it fades in`);
    await page.waitForTimeout(2600);

    // ---------- 3. More options ----------
    await page.click('#overlay .tx-more'); await page.waitForTimeout(120);
    const opening = await page.evaluate(() => { const b = document.getElementById('tx-more-box'); return [b.hidden, Math.round(b.getBoundingClientRect().height)]; });
    await page.waitForTimeout(2600);
    const open1 = await page.evaluate(() => { const b = document.getElementById('tx-more-box'); return [b.hidden, Math.round(b.getBoundingClientRect().height), b.style.overflow, document.activeElement.classList.contains('tx-more'), document.querySelector('.tx-more').getAttribute('aria-expanded')]; });
    ok(!opening[0] && opening[1] < open1[1], `${name}: “More options” slides open (${opening[1]} px on its way to ${open1[1]})`);
    eq(open1.slice(2), ['', true, 'true'], `${name}: open, the focus stays on it`);
    await page.click('#overlay .tx-more'); await page.waitForTimeout(60);
    await page.click('#overlay .tx-more', { force: true }); await page.waitForTimeout(2600);
    eq(await page.evaluate(() => [document.getElementById('tx-more-box').hidden, UI.drawer.more, document.querySelector('.tx-more').getAttribute('aria-expanded')]), [true, false, 'false'], `${name}: it slides shut; a second click while it moves is let go`);
    await page.evaluate(() => A.close()); await page.waitForTimeout(1500);

    // ---------- 1. a page's switch ----------
    await page.evaluate(() => navigate('transactions')); await page.waitForTimeout(1500);
    await page.click('.bq-kind [data-v="income"]'); await page.waitForTimeout(60);
    ok(await page.evaluate(() => !!document.querySelector('.bq-kind .glide-thumb')), `${name}: Transactions’ switch glides too`);
    await page.waitForTimeout(2600);
    eq(await page.evaluate(() => [UI.tx.type, !document.querySelector('.glide-thumb')]), ['income', true], `${name}: and lands on its choice`);
    eq(errors, [], `${name}: no error in the console`); await browser.close();
  }

  // ---------- 4. less motion ----------
  const { browser, page, errors } = await open({ lang: 'en', account: 'example', plan: true, viewport: { width: 390, height: 844 }, mobile: true });
  await page.evaluate(() => { S.user.greeted = true; navigate('dashboard'); render(); A['new-tx']({}); }); await page.waitForTimeout(400);
  await page.click('#overlay .tx-kind [data-v="income"]'); await page.waitForTimeout(30);
  eq(await page.evaluate(() => [!!document.querySelector('.glide-thumb'), UI.drawer.draft.type]), [false, 'income'], 'less motion: the choice changes at once, no pill moves');
  await page.click('#overlay .tx-more'); await page.waitForTimeout(30);
  eq(await page.evaluate(() => [document.getElementById('tx-more-box').hidden, document.getElementById('tx-more-box').getAnimations().length]), [false, 0], 'less motion: “More options” opens at once');
  eq(errors, [], 'no error in the console'); await browser.close();
  done('qc-glide');
})();
