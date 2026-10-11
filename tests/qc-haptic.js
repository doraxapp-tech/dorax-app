// QC (owner, 2026-10-10): "add small vibrations to the numbers of the lock screen. On the company account put the company's net balance on the left
// and the currency switch on the right" (then: "the company change is on the phone").
//   1. a phone with vibration (Android): each digit and each erase is a short tap, a wrong PIN two; nothing when there is nothing to erase;
//   2. an iPhone (no navigator.vibrate): the hidden switch is flipped on each digit, the key keeps the focus, nobody can see or reach it;
//   3. a computer: nothing at all;
//   4. the company's summary on a phone: the net balance on the left with its eye, the currency on the right, one row; not again under the month;
//      the figure always whole (a long amount on the narrowest phone); the household's balance stays in the middle; a computer is unchanged.
const { open, ok, eq, done } = require('./pw.js');
(async () => {
  const setPin = async p => { await p.evaluate(() => navigate('profile')); await p.waitForSelector('#guard-card'); await p.click('[data-a="guard-pin-open"][data-v="new"]'); await p.fill('#gp-new', '2580'); await p.fill('#gp-again', '2580'); await p.click('[data-a="guard-pin-save"]'); await p.waitForSelector('#guard-after'); await p.evaluate(() => lockNow()); await p.waitForSelector('.lock-pad'); };
  const tap = (p, k) => p.click(`.lock-pad [data-v="${k}"]`);
  const phone = { viewport: { width: 390, height: 844 }, touch: true, mobile: true };
  // ---------- 1. Android ----------
  let { browser, page, errors } = await open({ lang: 'en', account: 'example', plan: true, ...phone });
  await page.evaluate(() => { window.__buzz = []; navigator.vibrate = p => { window.__buzz.push(p); return true; }; });
  await setPin(page);
  await page.click('.lock-pad [data-a="lock-del"]', { force: true });
  eq(await page.evaluate(() => window.__buzz), [], 'nothing to erase: no tap');
  await tap(page, 1); await tap(page, 2); await page.click('.lock-pad [data-a="lock-del"]'); await tap(page, 3);
  eq(await page.evaluate(() => window.__buzz), [8, 8, 6, 8], 'each digit a short tap (8 ms), erasing one a shorter one (6 ms)');
  await tap(page, 9); await tap(page, 6); await page.waitForFunction(() => !!LOCK.shake);
  eq(await page.evaluate(() => [window.__buzz.length, JSON.stringify(window.__buzz[window.__buzz.length - 1]), LOCK.on]), [7, '[28,60,28]', true], 'the fourth digit taps, and a wrong PIN answers with two taps');
  for (const k of "2580") await tap(page, k); await page.waitForFunction(() => !LOCK.on);
  ok(await page.evaluate(() => !document.querySelector('#haptic')), 'with vibration there is no hidden switch');
  eq(errors, [], 'Android: no error in the console'); await browser.close();
  // ---------- 2. iPhone ----------
  ({ browser, page, errors } = await open({ lang: 'en', account: 'example', plan: true, ...phone }));
  await page.evaluate(() => { Object.defineProperty(Navigator.prototype, 'vibrate', { value: undefined, configurable: true }); delete navigator.vibrate; window.__flips = 0; });
  await setPin(page);
  await page.evaluate(() => { document.addEventListener('change', e => { if (e.target.id === 'haptic-sw') window.__flips++; }, true); });
  await page.focus('.lock-pad [data-v="4"]'); await tap(page, 4); await tap(page, 7);
  eq(await page.evaluate(() => { const box = document.querySelector('#haptic'), sw = document.querySelector('#haptic-sw'), r = box.getBoundingClientRect(); return [typeof navigator.vibrate, window.__flips, sw.hasAttribute('switch'), sw.tabIndex, box.getAttribute('aria-hidden'), r.right <= 0 || getComputedStyle(box).opacity === '0', getComputedStyle(box).pointerEvents, document.activeElement.dataset.v]; }),
    ['undefined', 2, true, -1, 'true', true, 'none', '7'], 'no vibrate: the hidden switch is flipped on each digit (iOS 18 gives its own tick), out of sight and reach; the key keeps the focus');
  eq(errors, [], 'iPhone: no error in the console'); await browser.close();
  // ---------- 3. a computer ----------
  ({ browser, page, errors } = await open({ lang: 'en', account: 'example', plan: true, viewport: { width: 1280, height: 900 } }));
  await page.evaluate(() => { Object.defineProperty(Navigator.prototype, 'vibrate', { value: undefined, configurable: true }); delete navigator.vibrate; });
  await setPin(page); await page.keyboard.press('1'); await tap(page, 2);
  eq(await page.evaluate(() => [LOCK.entry.length, !!document.querySelector('#haptic')]), [2, false], 'a computer: the digits count, nothing to feel');
  eq(errors, [], 'computer: no error in the console'); await browser.close();
  // ---------- 4. the company's balance and its currency, on a phone ----------
  for (const [lang, w] of [['es', 390], ['pt', 320]]) {
    ({ browser, page, errors } = await open({ lang, account: 'example', plan: true, viewport: { width: w, height: 700 }, touch: true, mobile: true }));
    await page.evaluate(() => { S.user.greeted = true; navigate('dashboard'); });
    const home = await page.evaluate(() => { const b = document.querySelector('.bar-bal .bb-link').getBoundingClientRect(); return [document.querySelector('.bar-bal').classList.contains('co'), Math.abs((b.left + b.right) / 2 - innerWidth / 2) < 30, !document.querySelector('.bar-bal .space')]; });
    eq(home, [false, true, true], `${lang}, ${w}px: the household’s net balance stays in the middle, with no currency beside it`);
    await page.evaluate(() => { A.space({ v: 'business' }); navigate('dashboard'); }); await page.waitForTimeout(200);
    const row = () => page.evaluate(() => { const r = s => document.querySelector(s).getBoundingClientRect(), bal = r('.bar-bal .bb-link'), eye = r('.bar-bal .bb-eye'), sw = r('.bar-bal .space'), b = document.querySelector('.bar-bal .bb-link b');
      return [bal.left <= 18, eye.left >= bal.right - 1, sw.left >= eye.right, Math.abs(sw.right - (innerWidth - 16)) <= 2, sw.top < bal.bottom && sw.bottom > bal.top, document.querySelectorAll('.pagehead .space').length, b.scrollWidth <= b.clientWidth + 1, document.documentElement.scrollWidth <= innerWidth,
        [...document.querySelectorAll('.bar-bal .space .seg button')].every(x => x.getBoundingClientRect().height >= 44)]; });
    eq(await row(), [true, true, true, true, true, 0, true, true, true], `${lang}, ${w}px: the company’s net balance on the left with its eye, the currency on the right, one row; not again under the month`);
    await page.click('.bar-bal [data-a="space-cur"][data-v="USD"]'); await page.waitForTimeout(150);
    eq(await page.evaluate(() => [pageBookKey(), /US\$/.test(document.querySelector('.bar-bal .bb-link b').innerText), document.querySelector('.bar-bal [aria-pressed="true"]').dataset.v]), ['business:USD', true, 'USD'], `${lang}, ${w}px: USD there: the balance in dollars`);
    await page.evaluate(() => { const a = S.accounts.find(x => x.scope === 'business' && x.currency === 'USD'); S.transactions.push({ id: 'big', accountId: a.id, date: S.today, amount: 9876543210, desc: 'x', cat: '' }); render(); });
    eq((await row())[6], true, `${lang}, ${w}px: a long amount comes down in size and stays whole`);
    await page.evaluate(() => navigate('plan')); eq(await page.evaluate(() => document.querySelectorAll('.pagehead .space').length), 1, `${lang}, ${w}px: Plan has no balance on top, its currency stays under the month`);
    eq(errors, [], `${lang}, ${w}px: no error in the console`); await browser.close();
  }
  ({ browser, page, errors } = await open({ lang: 'es', account: 'example', plan: true, viewport: { width: 1440, height: 900 } }));
  await page.evaluate(() => { A.space({ v: 'business' }); navigate('dashboard'); });
  eq(await page.evaluate(() => [document.querySelectorAll('.pagehead .space').length, getComputedStyle(document.querySelector('.bar-bal')).display]), [1, 'none'], 'a computer: the currency stays in the top bar, and no balance row');
  eq(errors, [], 'computer: no error in the console'); await browser.close();
  done('qc-haptic');
})().catch(e => { console.error('qc-haptic: Error', e); process.exit(1); });
