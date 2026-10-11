// QC of the minute's notice before the lock (owner, 2026-10-08: "on the computer, before locking the screen, show a message with a one-minute countdown
// so the person knows it is going to lock because nobody is using it, to protect their privacy").
//   1. with the lock on and the page left alone, the last minute is a notice at the foot: "Dorax locks in 0:59", why, and "I'm still here";
//      a screen reader is told once, in a sentence; nothing before the last minute; nothing without a PIN;
//   2. it counts down every second, and at zero the lock closes and the notice goes;
//   3. a key, a click on "I'm still here", a scroll: the notice goes and Dorax stays open, the time starting again;
//   4. a phone: above the tab bar; Spanish and Portuguese.
const { open, ok, eq, done } = require('./pw.js');

(async () => {
  const setPin = async (p, pin) => { await p.click('[data-a="guard-pin-open"][data-v="new"]'); await p.fill('#gp-new', pin); await p.fill('#gp-again', pin); await p.click('[data-a="guard-pin-save"]'); await p.waitForSelector('#guard-after'); };
  const leave = (p, secs) => p.evaluate(secs => { LOCK.touch = Date.now() - secs * 1000; guardWatch(); return !!document.querySelector('#idle-warn'); }, secs);
  let { browser, page, errors } = await open({ lang: 'en', account: 'example', plan: true, viewport: { width: 1280, height: 900 } });
  // ---------- 1. ----------
  eq(await leave(page, 250), false, 'no PIN: no lock, so no notice');
  await page.evaluate(() => navigate('profile')); await page.waitForSelector('#guard-card'); await setPin(page, '2580');
  eq([await leave(page, 200), await page.evaluate(() => !!IDLE.t)], [false, true], 'more than a minute before the lock: no notice yet, and a look planned for when it is due');
  eq(await leave(page, 241), true, 'left alone for four minutes (the lock at five): the notice');
  await page.waitForTimeout(350);      // its entrance
  const n = await page.evaluate(() => { const w = document.querySelector('#idle-warn'), r = w.getBoundingClientRect(), b = w.querySelector('#idle-stay').getBoundingClientRect();
    return [w.querySelector('.iw-t b').innerText.trim(), w.querySelector('small').innerText.trim(), w.querySelector('#idle-stay').innerText.trim(), w.querySelector('[role="alert"]').innerText.trim(), w.querySelector('.iw-t').getAttribute('aria-hidden'), Math.abs((r.left + r.right) / 2 - document.documentElement.clientWidth / 2) <= 12 && innerHeight - r.bottom >= 16 && innerHeight - r.bottom <= 40, b.height >= 30, LOCK.on]; });
  eq(n, ['Dorax locks in 0:59', 'To protect your privacy, since nobody is using it.', 'I’m still here', 'Dorax will lock in one minute to protect your privacy, since nobody is using it. Press any key to keep it open.', 'true', true, true, false],
    'it says when, counting down, and why; “I’m still here”; a screen reader hears one sentence; centred at the foot of the screen; not locked yet');
  // ---------- 2. ----------
  await page.waitForTimeout(1100);
  eq(await page.evaluate(() => document.querySelector('#idle-warn .iw-time').textContent), '0:58', 'a second later it says 0:58');
  await page.keyboard.press('Shift');
  eq(await page.evaluate(() => [!!document.querySelector('#idle-warn'), LOCK.on, Date.now() - LOCK.touch < 2000]), [false, false, true], 'a key: the notice goes, Dorax stays open and the time starts again');
  await leave(page, 250); await page.click('#idle-stay');
  eq(await page.evaluate(() => [!!document.querySelector('#idle-warn'), LOCK.on]), [false, false], '“I’m still here”: the same');
  await leave(page, 250); await page.mouse.move(640, 300); await page.mouse.wheel(0, 200); await page.waitForTimeout(250);
  eq(await page.evaluate(() => [!!document.querySelector('#idle-warn'), LOCK.on]), [false, false], 'a scroll is using it too');
  await leave(page, 298.5);
  eq(await page.evaluate(() => document.querySelector('#idle-warn .iw-time').textContent), '0:02', 'near the end');
  await page.waitForFunction(() => LOCK.on, null, { timeout: 4000 });
  eq(await page.evaluate(() => [LOCK.on, !!document.querySelector('#idle-warn'), !!document.querySelector('.lock')]), [true, false, true], 'at zero the lock closes, and the notice goes with it');
  await page.keyboard.type('2580'); await page.waitForFunction(() => !LOCK.on);
  eq(await page.evaluate(() => [!!document.querySelector('#idle-warn'), Date.now() - LOCK.touch < 3000]), [false, true], 'opened again: no notice, the time starts again');
  await page.evaluate(() => { GUARD.clearPin(guardUser()); render(); });
  eq(await leave(page, 250), false, 'the PIN turned off: no notice');
  eq(errors, [], 'computer: no error in the console'); await browser.close();

  // ---------- 4. a phone, Spanish and Portuguese ----------
  for (const [lang, w, want] of [['es', 390, ['Dorax se bloquea en 0:59', 'Sigo aquí']], ['pt', 320, ['O Dorax bloqueia em 0:59', 'Ainda estou aqui']]]) {
    ({ browser, page, errors } = await open({ lang, account: 'example', plan: true, viewport: { width: w, height: 760 }, touch: true, mobile: true }));
    await page.evaluate(() => { window.DORAX_LOCK_ASK = false; navigate('profile'); }); await page.waitForSelector('#guard-card'); await setPin(page, '2580');
    await leave(page, 241); await page.waitForTimeout(350);
    eq(await page.evaluate(() => { const r = document.querySelector('#idle-warn').getBoundingClientRect(), bar = document.querySelector('#tabbar').getBoundingClientRect(); return [document.querySelector('#idle-warn .iw-t b').innerText.trim(), document.querySelector('#idle-stay').innerText.trim(), r.bottom <= bar.top, r.left >= 15 && r.right <= innerWidth - 15, document.querySelector('#idle-stay').getBoundingClientRect().height >= 44]; }),
      [...want, true, true, true], `${lang} at ${w} px: in the language, above the tab bar, inside the screen, its button a thumb high`);
    await page.tap('#idle-stay'); eq(await page.evaluate(() => !!document.querySelector('#idle-warn')), false, `${lang}: a tap keeps it open`);
    eq(errors, [], `${lang}: no error in the console`); await browser.close();
  }
  done('qc-lock-warn');
})();
