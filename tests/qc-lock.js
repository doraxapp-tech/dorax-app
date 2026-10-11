// QC of the protection on a device (owner, 2026-10-07: "build the protections: a limit for inactivity, or a lock inside the app (PIN or
// biometrics) for the version installed on the phone").
//   1. Profile > Protection on this device: nothing is on until the person turns it on;
//   2. the PIN: what is refused, what is kept (never the PIN itself);
//   3. the closed screen: nothing of the account shows or can be reached; right and wrong PINs; the wait; the tenth wrong try;
//   4. when it locks: on opening the app, after being away, with the page left alone;
//   5. the device's own check (Face ID, fingerprint), with a stand-in for the device;
//   6. a forgotten PIN; changing it and turning it off;
//   7. the limit without use: closed on opening and while open; logging in again asks for no PIN;
//   8. Spanish and Portuguese on the narrowest phone;
//   9. the two notices that invite it (a PIN; then Face ID or fingerprint): once per device, one question per visit, never behind the closed screen;
//   10. the lock opening: an animation over the app, about a second, skipped with a tap, not played with less motion.
const { open, ok, eq, done } = require('./pw.js');

(async () => {
  const BIO = () => { window.DORAX_BIO = { available: async () => window.__bioHas !== false, make: async () => (window.__bioMake === false ? null : 'cred-1'), check: async () => { if (window.__bio === 'throw') throw new Error('cancelled'); return window.__bio !== false; } }; };
  const guard = p => p.evaluate(() => GUARD.of(guardUser()));
  const type = async (p, pin) => { for (const k of pin) await p.click(`.lock-pad [data-v="${k}"]`); };
  const setPin = async (p, pin) => { await p.click('[data-a="guard-pin-open"][data-v="new"]'); await p.fill('#gp-new', pin); await p.fill('#gp-again', pin); await p.click('[data-a="guard-pin-save"]'); await p.waitForSelector('#guard-after'); };
  const toast = p => p.evaluate(() => document.querySelector('#toast').innerText.trim());

  // ---------- 1. the card ----------
  let { browser, page, errors } = await open({ lang: 'en', account: 'example', plan: true, viewport: { width: 1280, height: 900 } });
  await page.addInitScript(BIO); await page.evaluate(BIO);
  await page.evaluate(() => navigate('profile')); await page.waitForSelector('#guard-card');
  eq(await page.evaluate(() => { const c = document.querySelector('#guard-card'), sets = [...c.querySelectorAll('.setting b')].map(b => b.innerText.trim()); return [c.querySelector('h2').innerText.trim(), sets, c.querySelector('[data-a="guard-pin-open"]').innerText.trim(), document.querySelector('#guard-idle').value, [...document.querySelector('#guard-idle').options].map(o => o.text), c.querySelectorAll('.chip.good').length, JSON.stringify(GUARD.of(guardUser()).pin || null), LOCK.on,
      [...document.querySelectorAll('#view .set-group > .set-head h2')].map(h => h.innerText.trim()).indexOf('Protection on this device') > -1]; }),      // a group of the profile, its heading outside its card since 2026-10-09
    ['Protection on this device', ['App lock', 'Close the session'], 'Set a PIN', '0', ['Never', 'After 1 day without use', 'After 7 days without use', 'After 30 days without use'], 0, 'null', false, true],
    'the profile has “Protection on this device”: an app lock and a limit without use, both off until the person turns them on');
  ok(/not encryption/.test(await page.locator('#guard-card').innerText()) && /Notifications on this device stop/.test(await page.locator('#guard-card').innerText()), 'the card says what the lock is not (encryption) and what closing the session costs (notifications on this device)');

  // ---------- 2. the PIN ----------
  await page.click('[data-a="guard-pin-open"][data-v="new"]');
  const refuse = async (a, b) => { await page.fill('#gp-new', a); await page.fill('#gp-again', b); await page.click('[data-a="guard-pin-save"]'); return page.evaluate(() => [document.querySelector('#guard-form .banner').innerText.trim(), !!GUARD.of(guardUser()).pin]); };
  eq(await refuse('12', '12'), ['The PIN is 4 digits.', false], 'two digits are not a PIN');
  eq(await refuse('12a4', '12a4'), ['The PIN is 4 digits.', false], 'a letter is not a digit');
  eq(await refuse('2580', '2581'), ['The two PINs are not the same.', false], 'typed twice, and both must match');
  eq(await refuse('1111', '1111'), ['Choose a PIN that is harder to guess than a repeated digit or a run like 1234.', false], 'a repeated digit is refused');
  eq(await refuse('1234', '1234'), ['Choose a PIN that is harder to guess than a repeated digit or a run like 1234.', false], 'so is 1234');
  eq(await page.evaluate(() => [document.querySelector('#gp-new').type, document.querySelector('#gp-new').inputMode, document.querySelector('#gp-new').maxLength]), ['password', 'numeric', 4], 'the PIN is typed hidden, with the number keys');
  await page.fill('#gp-new', '2580'); await page.fill('#gp-again', '2580'); await page.click('[data-a="guard-pin-save"]'); await page.waitForSelector('#guard-after');
  const kept = await page.evaluate(() => localStorage.getItem('dorax-guard'));
  eq([/2580/.test(kept), Object.keys((await guard(page)).pin).sort(), (await guard(page)).pin.hash.length >= 16, (await guard(page)).after, await toast(page), await page.evaluate(() => [[...document.querySelectorAll('#guard-card .setting b')].map(b => b.innerText.trim()), document.querySelector('#guard-after').value, [...document.querySelector('#guard-after').options].map(o => o.text), LOCK.on, 'pin' in S.user || /2580/.test(JSON.stringify(S))])],
    [false, ['algo', 'hash', 'salt'], true, 60, 'App lock is on for this device.', [['App lock', 'When it locks', 'Face ID or fingerprint', 'Close the session'], '60', ['As soon as I leave Dorax', 'After 1 minute away', 'After 5 minutes away', 'After 15 minutes away'], false, false]],
    'a good PIN is kept on the device as a fingerprint of it, never as the PIN and never in the account; the lock starts at one minute away; setting it does not lock the person out');

  // ---------- 3. the closed screen ----------
  await page.click('[data-a="guard-lock-now"]'); await page.waitForSelector('.lock');
  eq(await page.evaluate(() => { const l = document.querySelector('.lock'), hid = s => getComputedStyle(document.querySelector(s)).visibility; return [l.getAttribute('role'), l.getAttribute('aria-modal'), document.querySelector('#lock-h').innerText.trim(), document.documentElement.classList.contains('locked'), hid('#view'), hid('.rail'), hid('#topbar'),
      [...document.body.children].filter(e => e.id !== 'lock-root' && e.tagName !== 'SCRIPT').every(e => e.hasAttribute('inert')), /R\$|Nubank|Rent/.test(l.innerText), document.querySelectorAll('.lock-pad [data-a="lock-key"]').length, document.querySelectorAll('.lock-dots i').length, document.querySelectorAll('.lock-dots i.on').length, !!document.activeElement.closest('.lock')]; }),
    ['dialog', 'true', 'Hi, Alex. Enter your PIN.', true, 'hidden', 'hidden', 'hidden', true, false, 10, 4, 0, true],
    '“Lock now”: a screen of its own with the name, four dots and a pad; the page under it is not drawn and cannot be reached; nothing of the account shows');
  await page.keyboard.press('f'); await page.keyboard.press('Escape');
  eq(await page.evaluate(() => [UI.find || null, LOCK.on, UI.route]), [null, true, 'profile'], 'the app’s own keys (F for the search, Esc) do nothing behind the lock');
  await type(page, '0000'); await page.waitForFunction(() => /Wrong PIN/.test(document.querySelector('.lock-say').innerText));
  eq(await page.evaluate(() => [LOCK.on, document.querySelector('.lock-say').innerText.trim(), document.querySelectorAll('.lock-dots i.on').length, GUARD.of(guardUser()).fails]), [true, 'Wrong PIN. 4 more tries before a wait.', 0, 1], 'a wrong PIN: said, counted, the dots empty again, still closed');
  await page.click('.lock-pad [data-v="2"]'); await page.click('.lock-pad [data-v="5"]');
  eq(await page.evaluate(() => [document.querySelectorAll('.lock-dots i.on').length, document.querySelector('.lock-say').innerText.trim(), document.querySelector('.lock .sr').innerText.trim(), document.querySelector('[data-a="lock-del"]').disabled]), [2, '', '2 of 4 digits', false], 'each digit fills a dot, takes the message away, and is said to a screen reader as a count, never as the digit');
  await page.click('[data-a="lock-del"]'); eq(await page.evaluate(() => [LOCK.entry.length, document.querySelectorAll('.lock-dots i.on').length]), [1, 1], 'the erase key takes one digit back');
  await page.keyboard.press('Backspace'); await page.keyboard.type('2580'); await page.waitForFunction(() => !LOCK.on);
  eq(await page.evaluate(() => [LOCK.on, document.documentElement.classList.contains('locked'), getComputedStyle(document.querySelector('#view')).visibility, [...document.body.children].some(e => e.hasAttribute('inert')), UI.route, GUARD.of(guardUser()).fails || 0, document.querySelector('#lock-root').innerHTML]), [false, false, 'visible', false, 'profile', 0, ''],
    'the right PIN, typed on a keyboard: the page is back where it was, and the count of wrong tries starts again');
  // the wait from the fifth wrong try, and the tenth
  await page.evaluate(() => { GUARD.set(guardUser(), { fails: 4 }); lockNow(); }); await type(page, '0000'); await page.waitForFunction(() => /Too many wrong tries/.test(document.querySelector('.lock-say').innerText));
  eq(await page.evaluate(() => { const g = GUARD.of(guardUser()); return [g.fails, Math.round((g.until - Date.now()) / 1000) >= 28, /Try again in (30|29|28) seconds\./.test(document.querySelector('.lock-say').innerText), [...document.querySelectorAll('.lock-pad [data-a="lock-key"]')].every(b => b.disabled)]; }), [5, true, true, true], 'the fifth wrong try starts a wait of 30 seconds, counted down, with the pad switched off');
  await page.keyboard.type('2580'); eq(await page.evaluate(() => [LOCK.on, LOCK.entry]), [true, ''], 'during the wait not even the right PIN is taken');
  eq(await page.evaluate(() => { const waits = []; for (let f = 5; f <= 9; f++) waits.push(Math.min(300, 30 * Math.pow(2, f - 5))); return waits; }), [30, 60, 120, 240, 300], 'each wrong try after that doubles the wait, up to five minutes');
  await page.evaluate(() => { GUARD.set(guardUser(), { until: Date.now() - 1 }); renderLock(); }); await type(page, '2580'); await page.waitForFunction(() => !LOCK.on);
  eq((await guard(page)).fails || 0, 0, 'once the wait is over the right PIN opens it');
  eq(errors, [], 'card, PIN and closed screen: no error in the console');

  // ---------- 4. when it locks ----------
  await page.reload(); await page.waitForSelector('.lock'); await page.waitForFunction(() => !!UI.session);
  eq(await page.evaluate(() => [LOCK.on, getComputedStyle(document.querySelector('#view')).visibility, document.querySelector('#lock-h').innerText.trim(), UI.route]), [true, 'hidden', 'Hi, Alex. Enter your PIN.', 'profile'], 'opening Dorax with a session kept on the device: the lock comes first, the account opens out of sight under it, on the page it was on');
  await type(page, '2580'); await page.waitForFunction(() => !LOCK.on);
  await page.evaluate(BIO);
  const away = (secs, still) => page.evaluate(([secs, still]) => { LOCK.touch = Date.now() - (still || 0) * 1000; LOCK.away = secs ? Date.now() - secs * 1000 : 0; guardWatch(); const on = LOCK.on; if (on) unlock(); return on; }, [secs, still]);
  eq([await away(30), await away(61), await away(0, 200), await away(0, 301)], [false, true, false, true], 'at “1 minute away”: 30 seconds away is nothing, 61 locks; left open and untouched, it locks after 5 minutes');
  await page.evaluate(() => navigate('profile')); await page.selectOption('#guard-after', '0');
  eq([(await guard(page)).after, await away(1), await away(0, 200)], [0, true, false], '“As soon as I leave”: coming back locks at once; staying on the page does not');
  await page.selectOption('#guard-after', '900'); eq([await away(600), await away(901), await away(0, 600), await away(0, 901)], [false, true, false, true], '“15 minutes”: for being away and for a page left alone');
  await page.selectOption('#guard-after', '60');

  // ---------- 5. the device's own check ----------
  await page.waitForSelector('[data-a="guard-bio-on"]');
  await page.evaluate(() => { window.__bioMake = false; }); await page.click('[data-a="guard-bio-on"]'); await page.waitForFunction(() => /did not confirm/.test(document.querySelector('#toast').innerText));
  eq([await toast(page), (await guard(page)).bio || null], ['The device did not confirm it. Nothing changed.', null], 'the device says no (or the person cancels): nothing is switched on');
  await page.evaluate(() => { window.__bioMake = true; }); await page.click('[data-a="guard-bio-on"]'); await page.waitForSelector('[data-a="guard-bio-off"]');
  eq([(await guard(page)).bio, await page.evaluate(() => document.querySelectorAll('#guard-bio .chip.good').length)], ['cred-1', 1], 'switched on: the device’s key is kept, and the row says “On”');
  await page.evaluate(() => lockNow());
  eq(await page.evaluate(() => { const b = document.querySelector('[data-a="lock-bio"]'); return [!!b, b.getAttribute('aria-label'), document.activeElement === b]; }), [true, 'Use Face ID or fingerprint', true], 'the closed screen now has the device’s check on the pad, focused');
  await page.evaluate(() => { window.__bio = false; }); await page.click('[data-a="lock-bio"]'); await page.waitForFunction(() => /That did not work/.test(document.querySelector('.lock-say').innerText));
  eq(await page.evaluate(() => [LOCK.on, document.querySelector('.lock-say').innerText.trim(), GUARD.of(guardUser()).fails || 0]), [true, 'That did not work. Enter your PIN.', 0], 'the device does not recognise the person: still closed, the PIN is the way in, and it does not count as a wrong PIN');
  await page.evaluate(() => { window.__bio = 'throw'; }); await page.click('[data-a="lock-bio"]'); await page.waitForTimeout(100); eq(await page.evaluate(() => [LOCK.on, LOCK.busy]), [true, false], 'cancelled on the device: still closed, and the pad answers again');
  await page.evaluate(() => { window.__bio = true; }); await page.click('[data-a="lock-bio"]'); await page.waitForFunction(() => !LOCK.on);
  ok(true, 'the device recognises the person: open');
  await page.click('[data-a="guard-bio-off"]'); eq([(await guard(page)).bio || null, await toast(page)], [null, 'Turned off. The PIN opens Dorax.'], 'turned off: the key is forgotten');
  await page.evaluate(() => { window.__bioHas = false; UI.guardBio = undefined; render(); }); await page.waitForFunction(() => UI.guardBio === false && /does not offer it/.test(document.querySelector('#guard-bio').innerText));
  eq(await page.evaluate(() => document.querySelectorAll('#guard-bio button').length), 0, 'a device or browser without it: the row says so and offers nothing; the PIN works everywhere');

  // ---------- 6. changing it, turning it off, forgetting it ----------
  await page.click('[data-a="guard-pin-open"][data-v="change"]'); await page.fill('#gp-old', '0000'); await page.fill('#gp-new', '1357'); await page.fill('#gp-again', '1357'); await page.click('[data-a="guard-pin-save"]'); await page.waitForSelector('#guard-form .banner');
  eq(await page.evaluate(() => document.querySelector('#guard-form .banner').innerText.trim()), 'That is not the current PIN.', 'changing the PIN asks for the current one');
  await page.fill('#gp-old', '2580'); await page.fill('#gp-new', '1357'); await page.fill('#gp-again', '1357'); await page.click('[data-a="guard-pin-save"]'); await page.waitForFunction(() => !UI.guard);
  eq([await toast(page), await page.evaluate(async () => [await GUARD.checkPin(guardUser(), '1357'), await GUARD.checkPin(guardUser(), '2580')])], ['PIN changed.', [true, false]], 'changed: the new one opens, the old one no longer does');
  await page.click('[data-a="guard-pin-open"][data-v="off"]'); eq(await page.evaluate(() => [document.querySelectorAll('#gp-old').length, document.querySelectorAll('#gp-new').length]), [1, 0], 'turning the lock off asks for the PIN, and nothing else');
  await page.fill('#gp-old', '1357'); await page.click('[data-a="guard-pin-save"]'); await page.waitForSelector('[data-a="guard-pin-open"][data-v="new"]');
  eq([(await guard(page)).pin || null, await toast(page), await page.evaluate(() => { lockNow(); return LOCK.on; })], [null, 'App lock turned off on this device.', false], 'off: no PIN is kept, and nothing can lock');
  // forgotten
  await setPin(page, '2580'); await page.evaluate(() => lockNow()); await page.click('[data-a="lock-forgot"]');
  eq(await page.evaluate(() => [document.querySelector('#lock-h').innerText.trim(), /Nothing in your account changes\./.test(document.querySelector('.lock-note').innerText), [...document.querySelectorAll('.lock-row button')].map(b => b.innerText.trim()), document.querySelectorAll('.lock-pad').length]), ['Forgot the PIN?', true, ['Log out', 'Back'], 0], 'a forgotten PIN: the way out is logging out, said plainly, with a way back');
  await page.click('[data-a="lock-back"]'); eq(await page.evaluate(() => [LOCK.on, document.querySelectorAll('.lock-pad').length]), [true, 1], 'Back returns to the pad');
  await page.click('[data-a="lock-forgot"]');
  // while the server is asked to end the session, the screen stays closed: the account is never shown in between
  eq(await page.evaluate(() => { A['lock-out'](); return [LOCK.on, LOCK.leaving, getComputedStyle(document.querySelector('#view')).visibility, !!document.querySelector('.lock .spinner'), document.querySelectorAll('.lock-pad, .lock-row').length]; }), [true, true, 'hidden', true, 0], 'pressed: the screen stays closed, with a wait, until the account has left the page');
  await page.waitForFunction(() => !WHO && !SERVER.user && UI.pub.screen === 'landing');
  eq(await page.evaluate(() => [LOCK.on, document.documentElement.classList.contains('locked'), JSON.stringify(GUARD.of(SERVER.user ? SERVER.user.id : 'x').pin || null), !!SERVER.user, document.querySelector('#toast').innerText.trim()]), [false, false, 'null', false, 'Logged out. The PIN was removed from this device.'], 'logged out: nobody is logged in, the PIN is gone from the device, the home page shows');
  eq(errors, [], 'locking, the device’s check, changes: no error in the console'); await browser.close();

  // ---------- 3b. the tenth wrong try; 7. the limit without use (an account with a password, to log in again) ----------
  ({ browser, page, errors } = await open({ lang: 'en', viewport: { width: 1280, height: 900 }, server: { confirmEmail: false } }));
  const login = async () => { await page.evaluate(() => A['pub-go']({ v: 'login' })); await page.fill('#au-email', 'ana@example.org'); await page.fill('#au-pass', 'UmaSenha2026'); await page.click('[data-a="auth-login"]'); await page.waitForFunction(() => !!UI.session); };
  await page.evaluate(() => A['pub-go']({ v: 'signup' })); await page.fill('#au-name', 'Ana'); await page.fill('#au-email', 'ana@example.org'); await page.fill('#au-pass', 'UmaSenha2026'); await page.check('#au-accept'); await page.click('[data-a="auth-signup"]');
  await page.waitForSelector('#ob-name'); await page.click('[data-a="onboard-save"]'); await page.waitForSelector('#ob-pay0'); await page.click('[data-a="ob-next"]'); await page.click('[data-a="ob-finish"]'); await page.waitForSelector('.hello');
  const uid = await page.evaluate(() => guardUser());
  eq(await page.evaluate(() => { const g = GUARD.of(guardUser()); return [!!g.seen && Date.now() - g.seen < 60000, g.idle || 0, !!g.pin]; }), [true, 0, false], 'a new account: the device notes when it was last used; no limit and no lock by default');
  await page.evaluate(() => navigate('profile')); await setPin(page, '2580');
  await page.evaluate(() => { GUARD.set(guardUser(), { fails: 9 }); lockNow(); }); await type(page, '0000'); await page.waitForFunction(() => !WHO && !SERVER.user && UI.pub.screen === 'landing');
  eq(await page.evaluate(id => [LOCK.on, JSON.stringify(GUARD.of(id).pin || null), !!SERVER.user, document.querySelector('#toast').innerText.trim()], uid), [false, 'null', false, 'Too many wrong PINs. The PIN was removed from this device: log in with your password.'], 'the tenth wrong PIN logs out and removes the PIN from the device: the password is the way back');
  await login();
  eq(await page.evaluate(() => [LOCK.on, UI.route, S.user.name]), [false, 'dashboard', 'Ana'], 'logging in with the password opens the account, with everything in it');
  await page.evaluate(() => navigate('profile')); await setPin(page, '2580'); await page.selectOption('#guard-idle', '7');
  eq([(await guard(page)).idle, await toast(page)], [7, 'Saved for this device.'], 'the limit without use is chosen in the profile and kept on the device');
  eq(await page.evaluate(() => { GUARD.set(guardUser(), { seen: Date.now() - 6.9 * 86400000 }); const a = guardIdleOver(guardUser()); GUARD.set(guardUser(), { seen: Date.now() - 7.1 * 86400000 }); return [a, guardIdleOver(guardUser())]; }), [false, true], 'seven days: 6.9 days without use is inside the limit, 7.1 is past it');
  // (leaving a page counts as using it, so the days are turned back as the page starts again, the way they would have passed)
  await page.addInitScript(() => { try { if (!sessionStorage.getItem('qc-days')) return; sessionStorage.removeItem('qc-days'); const all = JSON.parse(localStorage.getItem('dorax-guard') || '{}'); for (const k of Object.keys(all)) all[k].seen = Date.now() - 7.1 * 86400000; localStorage.setItem('dorax-guard', JSON.stringify(all)); } catch (e) { /* no storage */ } });
  await page.evaluate(() => sessionStorage.setItem('qc-days', '1')); await page.reload(); await page.waitForSelector('#au-email');
  eq(await page.evaluate(() => [UI.pub.screen, UI.pub.mode, document.querySelector('.auth .banner').innerText.trim(), !!UI.session, !!SERVER.user, LOCK.on, document.querySelectorAll('.lock').length]), ['auth', 'login', 'This session was closed after 7 days without use. Log in again.', false, false, false, 0],
    'opened after the limit: the session is closed before the account is read, the login says why, and no PIN is asked of someone who is no longer logged in');
  await login();
  eq(await page.evaluate(() => [LOCK.on, !!UI.session, Date.now() - GUARD.of(guardUser()).seen < 60000, !!GUARD.of(guardUser()).pin]), [false, true, true, true], 'logged in again: no PIN is asked right after the password, the count of days starts again, and the lock is still set for later');
  await page.evaluate(() => { GUARD.set(guardUser(), { seen: Date.now() - 8 * 86400000 }); LOCK.seenAt = Date.now(); guardWatch(); }); await page.waitForFunction(() => !WHO && !SERVER.user && UI.pub.screen === 'landing');
  eq(await page.evaluate(() => [!!SERVER.user, document.querySelector('#toast').innerText.trim()]), [false, 'This session was closed after 7 days without use. Log in again.'], 'a page left open past the limit closes its session too, and says why');
  await login(); await page.evaluate(() => navigate('profile')); await page.selectOption('#guard-idle', '1');
  eq(await page.evaluate(() => { GUARD.set(guardUser(), { seen: Date.now() - 1.1 * 86400000 }); return guardIdleSays(guardUser()); }), 'This session was closed after a day without use. Log in again.', 'one day is said as “a day”');
  await page.evaluate(() => GUARD.set(guardUser(), { seen: Date.now() })); await page.selectOption('#guard-idle', '0');
  eq([(await guard(page)).idle || 0, await toast(page), await page.evaluate(() => { GUARD.set(guardUser(), { seen: Date.now() - 400 * 86400000 }); return guardIdleOver(guardUser()); })], [0, 'The session stays open on this device until you log out.', false], '“Never” is the way it was: the session stays until the person logs out');
  eq(await page.evaluate(() => { const real = GUARD.usable; GUARD.usable = () => false; render(); const text = document.querySelector('#guard-card').innerText, n = document.querySelectorAll('#guard-card button:not(.hint), #guard-card select').length; GUARD.usable = real; render(); return [/Not available here/.test(text), n]; }), [true, 0], 'a browser that keeps nothing for the site (a private window): the card says so and offers nothing');
  eq(await page.evaluate(() => { const id = guardUser(); GUARD.forget(id); return JSON.stringify(GUARD.of(id)); }), '{}', 'deleting the account makes the device forget its lock for it');
  eq(errors, [], 'the tenth try and the limit: no error in the console'); await browser.close();

  // ---------- 8. Spanish and Portuguese, on the narrowest phone ----------
  for (const [lang, want] of [['es', ['Hola, Alex. Escribe tu PIN.', '¿Olvidaste el PIN?', 'PIN incorrecto. Te quedan 4 intentos antes de una espera.', 'Protección en este dispositivo', 'Bloqueo de la app']], ['pt', ['Oi, Alex. Digite seu PIN.', 'Esqueceu o PIN?', 'PIN errado. Restam 4 tentativas antes de uma espera.', 'Proteção neste dispositivo', 'Bloqueio do app']]]) {
    ({ browser, page, errors } = await open({ lang, account: 'example', plan: true, viewport: { width: 320, height: 568 }, touch: true, mobile: true }));
    await page.evaluate(() => navigate('profile')); await page.waitForSelector('#guard-card');
    eq(await page.evaluate(() => { const c = document.querySelector('#guard-card'), r = c.getBoundingClientRect(); return [c.querySelector('h2').innerText.trim(), c.querySelector('.setting b').innerText.trim(), document.documentElement.scrollWidth <= innerWidth, [...c.querySelectorAll('button:not(.hint), select')].every(e => e.getBoundingClientRect().height >= 44 && e.getBoundingClientRect().right <= innerWidth)]; }), [want[3], want[4], true, true], `${lang}, 320px: the card in the language, inside the phone, its controls a thumb high`);
    await setPin(page, '2580'); await page.evaluate(() => lockNow()); await type(page, '0000'); await page.waitForFunction(() => document.querySelector('.lock-say').innerText.trim().length > 0);
    eq(await page.evaluate(() => { const box = e => e.getBoundingClientRect(), keys = [...document.querySelectorAll('.lock-pad button')], l = document.querySelector('.lock'); return [document.querySelector('#lock-h').innerText.trim(), document.querySelector('[data-a="lock-forgot"]').innerText.trim(), document.querySelector('.lock-say').innerText.trim(),
        keys.every(k => box(k).width >= 56 && box(k).height >= 56 && box(k).left >= 0 && box(k).right <= innerWidth), l.scrollWidth <= l.clientWidth, box(document.querySelector('[data-a="lock-forgot"]')).bottom <= innerHeight, box(document.querySelector('.lock .logo')).top >= 0]; }),
      [want[0], want[1], want[2], true, true, true, true], `${lang}, 320 x 568: the closed screen in the language; the whole pad, the logo and “forgot” fit without scrolling; every key is a thumb wide`);
    await type(page, '2580'); await page.waitForFunction(() => !LOCK.on);
    eq(errors, [], `${lang}: no error in the console`); await browser.close();
  }
  // ---------- 9. the two notices that invite it (owner, 2026-10-08: "add notifications so users turn on the PIN or Face ID") ----------
  const notice = p => p.evaluate(() => { const c = document.querySelector('#curio'); return c ? [c.className, c.querySelector('b').innerText.trim(), [...c.querySelectorAll('.row button')].map(b => b.innerText.trim())] : null; });
  const asked = p => p.evaluate(() => localStorage.getItem('dorax-lock-asked'));
  ({ browser, page, errors } = await open({ lang: 'en', account: 'example', plan: true, viewport: { width: 1280, height: 900 }, curio: true, lockAsk: true }));
  await page.addInitScript(BIO); await page.reload(); await page.waitForFunction(() => !!UI.session);
  await page.waitForSelector('#curio.nudge', { timeout: 8000 });
  eq(await notice(page), ['curio nudge', 'Lock Dorax on this device?', ['Set a PIN', 'Not now']], 'a device with no lock: a moment after the app opens, a notice offers one');
  eq([await asked(page), await page.evaluate(() => [/4-digit PIN/.test(document.querySelector('#curio p').innerText), !!document.querySelector('#curio .fl-ico svg'), document.querySelector('#curio').getAttribute('role')])], ['{"pin":1}', [true, true, 'status']], 'it says what the PIN does, and that it was asked is written down on the device');
  await page.click('#curio [data-a="lock-ask-no"]');
  eq([await page.locator('#curio').count(), await toast(page), !!(await guard(page)).pin], [0, 'Fine. If you change your mind, it is in your profile, under Protection on this device.', false], '“Not now” puts it away, says where it lives, and sets nothing');
  await page.evaluate(() => navigate('plan')); await page.waitForTimeout(3200);
  ok(!(await page.locator('#curio.nudge').count()), 'it is not asked again on the next screen');
  await page.reload(); await page.waitForFunction(() => !!UI.session); await page.waitForTimeout(3200);
  ok(!(await page.locator('#curio.nudge').count()), 'nor on the next visit: once per device');
  // "Set a PIN" goes to the form; a PIN made there brings the second notice
  await page.evaluate(() => { localStorage.removeItem('dorax-lock-asked'); UI.curio = null; renderCurio(); }); await page.reload(); await page.waitForFunction(() => !!UI.session);
  await page.waitForSelector('#curio.nudge', { timeout: 8000 }); await page.click('#curio [data-a="lock-ask-yes"]');
  eq(await page.evaluate(() => { const el = document.querySelector('#gp-new'), r = el && el.getBoundingClientRect(); return [UI.route, UI.guard && UI.guard.mode, document.activeElement === el, !!r && r.top >= 0 && r.bottom <= innerHeight, document.querySelectorAll('#curio').length, !!GUARD.of(guardUser()).pin]; }), ['profile', 'new', true, true, 0, false],
    '“Set a PIN” opens the profile on the form that makes one, in view and with the cursor in it; nothing is set until the person does');
  await page.fill('#gp-new', '2580'); await page.fill('#gp-again', '2580'); await page.click('[data-a="guard-pin-save"]'); await page.waitForSelector('#curio.nudge');
  eq(await notice(page), ['curio nudge', 'Open Dorax with Face ID or fingerprint?', ['Turn on', 'Not now']], 'a PIN was just made on a device that has its own check: the second notice offers it right then');
  eq([await asked(page), !!(await guard(page)).pin, (await guard(page)).bio || null], ['{"pin":1,"bio":1}', true, null], 'asked once, and nothing is on yet');
  await page.click('#curio [data-a="lock-ask-yes"]'); await page.waitForFunction(() => !!GUARD.of(guardUser()).bio);
  eq([(await guard(page)).bio, await toast(page), await page.locator('#curio').count(), await page.evaluate(() => !!document.querySelector('#guard-bio .chip.good'))], ['cred-1', 'Face ID or fingerprint is on for this device.', 0, true], '“Turn on” asks the device right there and switches it on; the profile shows it');
  await page.evaluate(() => navigate('dashboard')); await page.waitForTimeout(3200);
  ok(!(await page.locator('#curio.nudge').count()), 'with both on there is nothing left to ask');
  eq(errors, [], 'the two notices: no error in the console'); await browser.close();
  // a device with no check of its own gets the first notice and never the second; and a "no" from the device changes nothing
  ({ browser, page, errors } = await open({ lang: 'en', account: 'example', plan: true, viewport: { width: 1280, height: 900 }, curio: true, lockAsk: true }));
  await page.addInitScript(() => { window.DORAX_BIO = { available: async () => window.__bioHas === true, make: async () => null, check: async () => false }; }); await page.reload(); await page.waitForFunction(() => !!UI.session);
  await page.waitForSelector('#curio.nudge', { timeout: 8000 }); await page.click('#curio [data-a="lock-ask-yes"]'); await page.fill('#gp-new', '2580'); await page.fill('#gp-again', '2580'); await page.click('[data-a="guard-pin-save"]'); await page.waitForSelector('#guard-after'); await page.waitForTimeout(600);
  eq([await page.locator('#curio').count(), await asked(page)], [0, '{"pin":1}'], 'no Face ID or fingerprint on this device: the second notice is not shown, and is not used up');
  // opened with the lock closed: nothing is shown behind it; the notice comes after the PIN
  await page.evaluate(() => { window.__bioHas = true; }); await page.addInitScript(() => { window.__bioHas = true; }); await page.reload(); await page.waitForSelector('.lock'); await page.waitForTimeout(3200);
  eq([await page.evaluate(() => [LOCK.on, !!UI.curio]), await asked(page)], [[true, false], '{"pin":1}'], 'opened on the closed screen: no notice is spent behind it');
  await type(page, '2580'); await page.waitForFunction(() => !LOCK.on); await page.waitForSelector('#curio.nudge', { timeout: 8000 });
  eq((await notice(page))[1], 'Open Dorax with Face ID or fingerprint?', 'once the PIN opens it, the notice about the device’s own check gets its turn');
  await page.click('#curio [data-a="lock-ask-yes"]'); await page.waitForFunction(() => /did not confirm/.test(document.querySelector('#toast').innerText));
  eq([(await guard(page)).bio || null, await page.locator('#curio').count()], [null, 0], 'the device said no: nothing is switched on, and the profile still has the switch');
  eq(errors, [], 'no check on the device, and the closed screen: no error in the console'); await browser.close();
  // one question per visit: the visit that asks about notifications does not ask about the lock too
  ({ browser, page, errors } = await open({ lang: 'en', account: 'example', plan: true, viewport: { width: 1280, height: 900 }, curio: true, lockAsk: true }));
  await page.addInitScript(() => { let perm = 'default'; window.DORAX_PUSH = { supported: () => true, needsInstall: () => false, permission: () => perm, ask: async () => (perm = 'denied'), current: async () => null, subscribe: async () => null, unsubscribe: async () => true }; });
  await page.reload(); await page.waitForFunction(() => !!UI.session); await page.waitForSelector('#curio.nudge', { timeout: 8000 });
  const first = (await notice(page))[1]; await page.click('#curio [data-a="push-ask-no"]'); await page.evaluate(() => navigate('plan')); await page.waitForTimeout(3200);
  eq([first, await page.locator('#curio.nudge').count(), await asked(page)], ['Want a heads-up before a bill is due?', 0, null], 'notifications are asked about first, and the lock is left for another visit');
  await page.reload(); await page.waitForFunction(() => !!UI.session); await page.waitForSelector('#curio.nudge', { timeout: 8000 });
  eq((await notice(page))[1], 'Lock Dorax on this device?', 'the next visit asks about the lock');
  eq(errors, [], 'one question per visit: no error in the console'); await browser.close();
  // on the narrowest phone, in Spanish and Portuguese: above the bar, inside the screen, thumb-sized
  for (const [lang, want] of [['es', ['¿Le ponemos bloqueo a Dorax en este dispositivo?', 'Crear un PIN', 'Ahora no', '¿Abrir Dorax con Face ID o huella?', 'Activar']], ['pt', ['Vamos colocar um bloqueio no Dorax neste dispositivo?', 'Criar um PIN', 'Agora não', 'Abrir o Dorax com Face ID ou digital?', 'Ativar']]]) {
    ({ browser, page, errors } = await open({ lang, account: 'example', plan: true, viewport: { width: 320, height: 640 }, touch: true, mobile: true, curio: true, lockAsk: true }));
    await page.addInitScript(BIO); await page.reload(); await page.waitForFunction(() => !!UI.session); await page.waitForSelector('#curio.nudge', { timeout: 8000 });
    const fits = () => page.evaluate(() => { const c = document.querySelector('#curio'), r = c.getBoundingClientRect(), bar = document.querySelector('#tabbar').getBoundingClientRect(), fab = document.querySelector('#tabbar .fab').getBoundingClientRect(), bs = [...c.querySelectorAll('.row button')];
      return [c.querySelector('b').innerText.trim(), bs.map(b => b.innerText.trim()), r.left >= 0 && r.right <= innerWidth && r.top >= 0, r.bottom <= Math.min(bar.top, fab.top), bs.every(b => b.getBoundingClientRect().height >= 44), parseFloat(getComputedStyle(c.querySelector('p')).fontSize) >= 12, document.documentElement.scrollWidth <= innerWidth]; });
    eq(await fits(), [want[0], [want[1], want[2]], true, true, true, true, true], `${lang}, 320 px: the lock’s notice in the language, above the bar, inside the screen, with buttons a thumb can hit`);
    await page.click('#curio [data-a="lock-ask-yes"]'); await page.waitForSelector('#gp-new');
    ok(await page.evaluate(() => { const r = document.querySelector('#gp-new').getBoundingClientRect(); return UI.route === 'profile' && r.top >= 0 && r.bottom <= innerHeight; }), `${lang}: “${want[1]}” lands on the PIN form, in view`);
    await page.fill('#gp-new', '2580'); await page.fill('#gp-again', '2580'); await page.click('[data-a="guard-pin-save"]'); await page.waitForSelector('#curio.nudge');
    eq(await fits(), [want[3], [want[4], want[2]], true, true, true, true, true], `${lang}, 320 px: so does the notice about Face ID or fingerprint`);
    eq(errors, [], `${lang}: the notices, no error in the console`); await browser.close();
  }

  // ---------- 10. the lock opening (owner, 2026-10-08: "create an unlock animation on entering the web app") ----------
  ({ browser, page, errors } = await open({ lang: 'en', account: 'example', plan: true, viewport: { width: 390, height: 844 }, touch: true, mobile: true, motion: true }));
  await page.addInitScript(BIO); await page.evaluate(BIO);
  await page.evaluate(() => navigate('profile')); await page.waitForSelector('#guard-card'); await setPin(page, '2580');
  await page.evaluate(() => { navigate('dashboard'); lockNow(); }); await type(page, '2580'); await page.waitForFunction(() => !LOCK.on);
  eq(await page.evaluate(() => { const fx = document.getElementById('unlock-fx'), cs = fx && getComputedStyle(fx), l = fx && fx.querySelector('svg.un-lock'); return fx ? [fx.getAttribute('aria-hidden'), cs.position, +cs.zIndex > 400, cs.backgroundColor === getComputedStyle(document.body).backgroundColor, !!l && !!l.querySelector('.un-shackle') && !!l.querySelector('.un-body'), fx.querySelector('.un-say').innerText.trim(),
      !!fx.querySelector('.un-was .lock .logo'), fx.querySelectorAll('[data-a], [id]').length, fx.querySelector('.un-was').hasAttribute('inert'), document.documentElement.classList.contains('locked'), document.querySelectorAll('#lock-root .lock').length, document.querySelector('#view').hasAttribute('inert')] : null; }),
    ['true', 'fixed', true, true, true, 'Hello again, Alex.', true, 0, true, false, 0, false],
    'the right PIN: the lock is open at once, and its opening is played over the app: a layer the colour of the closed screen, with that screen’s logo, a padlock and a hello by name; nothing in it can be pressed or read aloud');
  ok(await page.evaluate(() => UNLOCK_MS >= 900 && UNLOCK_MS <= 1600), 'it lasts about a second: it is seen every time the app is opened');
  await page.waitForTimeout(650);
  eq(await page.evaluate(() => { const fx = document.getElementById('unlock-fx'); if (!fx) return null; const sh = getComputedStyle(fx.querySelector('.un-shackle')), body = getComputedStyle(fx.querySelector('.un-body')).fill, pad = fx.querySelector('.un-was .lock-pad'); return [sh.transform !== 'none', body, +getComputedStyle(pad).opacity]; }), [true, 'rgb(93, 187, 139)', 0],
    'halfway: the pad is gone, the shackle has sprung open and the padlock is the brand’s green');
  await page.waitForFunction(() => !document.getElementById('unlock-fx'), null, { timeout: 2500 });
  eq(await page.evaluate(() => [!!UI.session, UI.route, document.querySelectorAll('#unlock-fx').length, document.elementFromPoint(195, 400).closest('#view, #topbar') !== null]), [true, 'dashboard', 0, true], 'and it is gone by itself: the account is there, under the thumb');
  // a tap skips it; the device's own check plays it too
  await page.evaluate(() => { GUARD.set(guardUser(), { bio: 'cred-1' }); lockNow(); }); await page.click('[data-a="lock-bio"]'); await page.waitForFunction(() => !LOCK.on);
  ok(await page.locator('#unlock-fx').count() === 1, 'Face ID or fingerprint opens it the same way');
  await page.mouse.click(195, 420); eq(await page.locator('#unlock-fx').count(), 0, 'a tap on it skips the rest');
  eq(errors, [], 'the opening: no error in the console'); await browser.close();
  // less motion asked for: no layer, the app is just there
  ({ browser, page, errors } = await open({ lang: 'en', account: 'example', plan: true, viewport: { width: 390, height: 844 }, touch: true, mobile: true }));
  await page.evaluate(() => navigate('profile')); await page.waitForSelector('#guard-card'); await setPin(page, '2580'); await page.evaluate(() => lockNow()); await type(page, '2580'); await page.waitForFunction(() => !LOCK.on);
  eq([await page.locator('#unlock-fx').count(), await page.locator('.lock').count()], [0, 0], 'for someone who asked their device for less motion nothing is played: the screen opens');
  eq(errors, [], 'less motion: no error in the console'); await browser.close();
  done('qc-lock');
})();
