// QC of the login and of keeping an account on the server: sign-up, the links in the emails, Google, a forgotten password,
// saving, a reload, two tabs, a lost connection, deleting the account. The server is the stand-in (tools/preview-backend.js),
// which answers the way Supabase does where the app depends on it.
const { open, ok, eq, done, openMail, visit, PAGE, FILE, TARGET } = require('./pw.js');
const fs = require('fs'), path = require('path');
let LIVE = null;
(async () => {
  let { browser, ctx, page, errors } = await open({ lang: 'en' }); LIVE = page;
  const txt = sel => page.locator(sel).first().innerText();
  const vis = sel => page.evaluate(sel => { const e = document.querySelector(sel); return !!e && !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length); }, sel);
  const db = () => page.evaluate(() => DORAX_PREVIEW.db());
  const raw = () => page.evaluate(() => Object.keys(localStorage).map(k => localStorage.getItem(k)).join('\n'));
  const outbox = type => page.evaluate(k => DORAX_PREVIEW.outbox().filter(m => !k || m.type === k), type);
  const focusId = () => page.evaluate(() => document.activeElement && (document.activeElement.id || document.activeElement.dataset.a || document.activeElement.tagName));
  const go = async v => { await page.evaluate(v => A['pub-go']({ v }), v); };
  const errOf = id => page.evaluate(id => { const e = document.getElementById(id + '-err'); return e ? e.innerText : null; }, id);
  const toastText = () => page.evaluate(() => document.getElementById('toast-root').innerText);
  const idle = () => page.waitForFunction(() => !(UI.pub && UI.pub.busy) && !SYNC.busy && !SYNC.timer);
  const inApp = () => page.waitForFunction(() => typeof UI !== 'undefined' && !!UI.session);
  const saved = async () => { await page.evaluate(() => saveNow()); await idle(); };
  const login = async (email, pw) => { await go('login'); await page.fill('#au-email', email); await page.fill('#au-pass', pw); await page.click('[data-a="auth-login"]'); await idle(); };
  const logout = async () => { await page.evaluate(() => A.logout()); await page.waitForFunction(() => !UI.session && !WHO && UI.pub.screen === 'landing'); };

  // 0. the rules for a new password; nothing of the example account or the prototype is in the app
  eq(await page.evaluate(() => [sameDoc({ a: 1, b: [{ x: 1, y: [2, 3] }], c: null }, { c: null, b: [{ y: [2, 3], x: 1 }], a: 1 }), sameDoc({ a: 1, b: [1, 2] }, { a: 1, b: [2, 1] }), sameDoc({ a: 1 }, { a: 1, b: 0 })]), [true, false, false], 'two documents are compared by what they hold, not by the order of their parts');
  eq(await page.evaluate(() => [pwOk('abcdefg1'), pwOk('abcdefgh'), pwOk('12345678'), pwOk('abc1'), pwOk('ñandú2026'), pwOk('a1' + 'x'.repeat(71))]), [true, false, false, false, true, false], 'password rules');
  eq(await page.evaluate(() => ['buildDemoState', 'DEMO_EMAIL', 'USERS', 'AUTH', 'sampleStatement', 'SAMPLE_CSV', 'sampleWorkbook', 'protoBox'].filter(n => { try { return eval('typeof ' + n) !== 'undefined'; } catch (e) { return true; } })), [], 'no example account, no sample files, no device accounts in the app');
  eq(await page.evaluate(() => [S.accounts.length, S.transactions.length, S.goals.length, S.plan.lines.length, S.user.email]), [0, 0, 0, 0, ''], 'before login the app holds an empty account');
  ok(await vis('.lp-actions'), 'nobody logged in: the home page');
  eq(await page.evaluate(() => location.hash), '', 'the address is left alone before login');

  // 1. the form: every field says what is wrong
  await page.click('.lp-actions [data-v="signup"]');
  ok(await vis('#au-name') && await vis('#au-email') && await vis('#au-pass') && await vis('#au-accept') && await vis('[data-a="auth-google"]'), 'sign-up has name, email, password, terms, Google');
  eq(await page.locator('.g-mark, .gbtn.g-dark').count(), 0, 'on the stand-in server Google is only simulated: the button carries no Google mark');
  eq(await page.locator('.proto, .chip.warn').count(), 0, 'sign-up: no prototype box');
  eq(await page.getAttribute('#au-pass', 'type'), 'password', 'password hidden by default');
  eq([await page.getAttribute('#au-name', 'autocomplete'), await page.getAttribute('#au-email', 'autocomplete'), await page.getAttribute('#au-pass', 'autocomplete')], ['name', 'username', 'new-password'], 'autocomplete names for password managers');
  eq(await focusId(), 'au-name', 'focus starts on the name');
  await page.click('[data-a="auth-signup"]');
  ok(await errOf('au-name') && await errOf('au-email') && await errOf('au-pass') && await errOf('au-accept'), 'empty form: four errors');
  eq(await focusId(), 'au-name', 'focus on first field with an error');
  eq([await page.getAttribute('#au-name', 'aria-invalid'), await page.getAttribute('#au-name', 'aria-describedby')], ['true', 'au-name-err'], 'error tied to its field');
  await page.fill('#au-name', 'Marta');
  eq(await errOf('au-name'), null, 'typing clears that field’s error'); ok(await errOf('au-email'), 'other errors stay');
  await page.fill('#au-email', 'not-an-email'); await page.fill('#au-pass', 'short1'); await page.check('#au-accept');
  eq(await page.locator('#pw-rules li.ok').count(), 2, 'rules tick as typed (letter, number)');
  await page.click('[data-a="auth-signup"]');
  ok(/does not look right/.test(await errOf('au-email')), 'bad email refused'); ok(/at least 8/.test(await errOf('au-pass')), 'short password refused');
  eq([await page.inputValue('#au-pass'), await page.isChecked('#au-accept')], ['short1', true], 'a refused form keeps what was typed');
  await page.fill('#au-email', 'Marta@Example.org'); await page.fill('#au-pass', 'marta@example.org'); await page.click('[data-a="auth-signup"]');
  ok(await errOf('au-pass'), 'password equal to the email refused');
  await page.fill('#au-pass', 'abcdefgh'); await page.click('[data-a="auth-signup"]');
  ok(/letter and a number/.test(await errOf('au-pass')), 'password without a number refused');
  await page.fill('#au-pass', 'a1' + 'x'.repeat(80)); await page.click('[data-a="auth-signup"]');
  ok(/too long/.test(await errOf('au-pass')), 'password over 72 refused');
  eq((await outbox()).length, 0, 'a refused form asks the server for nothing');
  await page.fill('#au-pass', 'Segredo2026'); await page.click('.pw-eye');
  eq([await page.getAttribute('#au-pass', 'type'), await page.inputValue('#au-pass'), await page.getAttribute('.pw-eye', 'aria-pressed')], ['text', 'Segredo2026', 'true'], 'show password');
  await page.click('.pw-eye'); eq(await page.getAttribute('#au-pass', 'type'), 'password', 'hide password');
  // the terms, read in the middle: what was typed is still there
  await page.click('.accept [data-v="terms"]'); ok(/Terms of use/.test(await txt('#legal-title')), 'terms open from the form');
  await page.click('.legal-top .auth-back');
  eq([await page.inputValue('#au-name'), await page.inputValue('#au-email'), await page.inputValue('#au-pass'), await page.isChecked('#au-accept')], ['Marta', 'Marta@Example.org', 'Segredo2026', true], 'form intact after reading the terms');
  await page.uncheck('#au-accept'); await page.click('[data-a="auth-signup"]'); ok(await errOf('au-accept'), 'terms required'); await page.check('#au-accept');

  // 2. Enter sends it: the server makes the account and "sends" the link
  await page.focus('#au-pass'); await page.keyboard.press('Enter'); await idle();
  ok(/Confirm your email/.test(await txt('.auth-card h1')), 'Enter submits; confirm screen');
  ok((await txt('.auth-card')).includes('marta@example.org'), 'email lower-cased and shown');
  eq(await page.locator('.auth-card .proto, .auth-card .chip.warn, [data-a="auth-open"], [data-a="auth-expired"]').count(), 0, 'confirm screen: no prototype box, no pretend buttons');
  eq(await page.evaluate(() => UI.pub.password), '', 'password dropped from memory once sent');
  eq((await outbox('signup')).map(m => m.to), ['marta@example.org'], 'one confirmation email, to that address');
  ok(!(await raw()).includes('Segredo2026'), 'the password itself is nowhere in this browser’s storage');
  eq(Object.keys((await db()).rows).length, 0, 'no account data exists before the email is confirmed');
  // logging in before confirming leads back to "confirm your email"
  await login('marta@example.org', 'Segredo2026');
  ok(/Confirm your email/.test(await txt('.auth-card h1')) && /Confirm your email first/.test(await txt('.auth-card')), 'unconfirmed login is sent to confirm');
  await page.click('[data-a="auth-resend"]'); await idle();
  ok(/Sent again/.test(await txt('.auth-card')), 'send again says so'); eq((await outbox('signup')).length, 2, 'send again really sends');
  ok(await page.locator('[data-a="auth-resend"]').isDisabled(), 'send again cannot be pressed twice in a row');
  // a link that is too old: back on the login, which says so
  const first = (await outbox('signup'))[0]; await page.evaluate(t => DORAX_PREVIEW.expire(t), first.token);
  await visit(page, first.link);
  ok(/no longer works/.test(await txt('.banner.crit')) && await vis('#au-pass'), 'an expired link lands on the login and says so');
  eq(await page.evaluate(() => location.hash), '', 'the failed link is taken out of the address');
  // the good link: the first-time setup, with the name given at sign-up
  await openMail(page, 'signup'); await page.waitForSelector('#ob-name');
  eq(await page.inputValue('#ob-name'), 'Marta', 'confirmed: first-time setup opens with the name from sign-up');
  eq(await page.evaluate(() => location.hash), '', 'the link is taken out of the address');
  ok(await vis('.onb [data-a="logout"], .auth-card [data-a="logout"], [data-a="logout"]'), 'the setup can be left (log out)');
  eq(Object.keys((await db()).rows).length, 0, 'nothing is saved while the setup is open');
  await page.reload(); await page.waitForSelector('#ob-name'); ok(true, 'a reload in the middle of the setup comes back to it');
  await page.click('[data-a="onboard-save"]'); await page.click('[data-a="ob-finish"]'); await inApp(); await idle();
  ok(await vis('.hello') && (await txt('.hello')).includes('Marta'), 'dashboard opens; greeting uses the name');
  let d = await db(), me = Object.keys(d.rows)[0];
  eq([Object.keys(d.rows).length, d.rows[me].rev, d.rows[me].data.user.name, d.rows[me].data.user.email], [1, 1, 'Marta', 'marta@example.org'], 'the new account is written to the server once');
  eq(['today' in d.rows[me].data, 'month' in d.rows[me].data], [false, false], 'the day and the month being looked at are not part of the saved account');
  eq(await page.evaluate(() => [S.accounts.length, S.transactions.length, S.goals.length, S.plan.lines.length, S.rules.length]), [0, 0, 0, 0, 0], 'a new account is blank');
  eq(await page.evaluate(() => location.hash), '#dashboard', 'in the app the address carries the screen');

  // 3. a change is saved by itself, and survives a reload
  await page.evaluate(() => navigate('profile')); await page.fill('#pf-name', 'Marta Lima'); await page.locator('#pf-name').blur(); await saved();
  d = await db(); eq([d.rows[me].rev, d.rows[me].data.user.name], [2, 'Marta Lima'], 'a change reaches the server (rev 2)');
  await page.evaluate(() => A.month && navigate('plan')); await saved();
  eq((await db()).rows[me].rev, 2, 'moving between screens is not a change');
  await page.reload(); await inApp();
  eq(await page.evaluate(() => [S.user.name, UI.route, SYNC.rev]), ['Marta Lima', 'plan', 2], 'reload: still logged in, same data, same screen');
  await idle(); eq((await db()).rows[me].rev, 2, 'opening the account writes nothing');

  // profile: how you log in + change password
  await page.evaluate(() => navigate('profile'));
  ok(/Email and password/.test(await txt('#view')) && !(await page.locator('#view .chip:has-text("Google")').count()), 'profile shows password login only');
  eq(await page.locator('#view .chip.warn:has-text("Prototype"), #proto-tools').count(), 0, 'profile: no prototype mark');
  await page.click('[data-a="pw-open"]'); eq(await focusId(), 'pf-pw-cur', 'focus on current password');
  await page.fill('#pf-pw-cur', 'wrong-pass-1'); await page.fill('#pf-pw-new', 'NovaSenha77'); await page.click('[data-a="pw-save"]');
  await page.waitForSelector('#view .pw-form .banner.crit'); ok(/current password is not right/.test(await txt('#view .pw-form .banner.crit')), 'wrong current password refused (the server checks it)');
  eq(await page.inputValue('#pf-pw-new'), 'NovaSenha77', 'typed new password kept');
  await page.fill('#pf-pw-cur', 'Segredo2026'); await page.fill('#pf-pw-new', 'Segredo2026'); await page.click('[data-a="pw-save"]');
  ok(/same as the current/.test(await txt('#view .pw-form .banner.crit')), 'same password refused');
  await page.fill('#pf-pw-new', 'weak'); await page.click('[data-a="pw-save"]'); ok(/at least 8/.test(await txt('#view .pw-form .banner.crit')), 'weak new password refused');
  await page.fill('#pf-pw-new', 'NovaSenha77'); await page.keyboard.press('Enter'); await page.waitForFunction(() => !UI.pw);
  ok(/Password changed/.test(await toastText()), 'password changed (Enter)'); ok(!(await raw()).includes('NovaSenha77'), 'new password not in storage');
  ok(await page.evaluate(() => !!UI.session), 'still logged in after changing the password');

  // 4. log out, log in
  await page.click('#view [data-a="logout"]'); await page.waitForSelector('.lp-actions');
  ok(/Logged out/.test(await toastText()), 'logged out to the home page');
  eq(await page.evaluate(() => [location.hash, S.user.email, S.user.name, SYNC.rev]), ['', '', '', null], 'after logout nothing of the account is left in the page, and the address is clean');
  await page.reload(); await page.waitForSelector('.lp-actions'); ok(true, 'reload after logout: still logged out');
  await page.click('.lp-actions [data-v="login"]');
  eq([await page.getAttribute('#au-pass', 'autocomplete'), await vis('#au-name'), await vis('#au-accept')], ['current-password', false, false], 'login form: email + password only');
  eq(await page.locator('.auth-card .proto, [data-a="auth-demo"], [data-a="proto-onboard"]').count(), 0, 'login: no prototype box, no example account button');
  await page.click('[data-a="auth-login"]'); ok(await errOf('au-email') && await errOf('au-pass'), 'empty login: both fields flagged');
  await page.fill('#au-email', 'marta@example.org'); await page.fill('#au-pass', 'Segredo2026'); await page.click('[data-a="auth-login"]'); await idle();
  const wrong = await txt('.banner.crit'); ok(/Email or password is not right/.test(wrong), 'the old password no longer works');
  eq(await page.inputValue('#au-pass'), '', 'wrong password field is emptied'); eq(await focusId(), 'au-pass', 'focus back on the password');
  await page.fill('#au-email', 'nobody@example.org'); await page.fill('#au-pass', 'Whatever123'); await page.click('[data-a="auth-login"]'); await idle();
  eq(await txt('.banner.crit'), wrong, 'unknown email gets the same answer as a wrong password');
  await page.fill('#au-email', 'marta@example.org'); await page.fill('#au-pass', 'NovaSenha77'); await page.keyboard.press('Enter'); await inApp();
  ok(/Good to see you again, Marta Lima/.test(await toastText()), 'login with the new password (Enter): welcome back');
  eq(await page.evaluate(() => S.user.name), 'Marta Lima', 'the account comes back as it was left');

  // the same email cannot sign up twice
  await logout(); await go('signup');
  await page.fill('#au-name', 'Other'); await page.fill('#au-email', 'marta@example.org'); await page.fill('#au-pass', 'Another2026'); await page.check('#au-accept'); await page.click('[data-a="auth-signup"]'); await idle();
  ok(/already has an account/.test(await errOf('au-email')), 'an email that has an account is refused at sign-up');
  eq((await outbox('signup')).length, 2, 'and no email goes out for it');

  // 5. forgotten password
  await go('login'); await page.click('.lbl-row [data-v="forgot"]');
  ok(/Choose a new password/.test(await txt('.auth-card h1')), 'forgot screen'); eq(await page.inputValue('#au-email'), 'marta@example.org', 'email carried over');
  await page.fill('#au-email', 'x'); await page.click('[data-a="auth-forgot-send"]'); ok(await errOf('au-email'), 'bad email refused');
  await page.fill('#au-email', 'ghost@example.org'); await page.keyboard.press('Enter'); await idle();
  const ghost = await txt('.auth-card');
  ok(/If ghost@example.org has an account/.test(ghost), 'unknown email: the same neutral answer'); eq((await outbox('recovery')).length, 0, 'unknown email: nothing is sent');
  await go('forgot'); await page.fill('#au-email', 'marta@example.org'); await page.click('[data-a="auth-forgot-send"]'); await idle();
  ok(/Check your email/.test(await txt('.auth-card h1')), 'check your email'); eq((await outbox('recovery')).length, 1, 'known email: the link is sent');
  eq(await page.locator('.auth-card .proto, [data-a="auth-open"]').count(), 0, 'reset: no prototype box');
  await openMail(page, 'recovery'); await page.waitForSelector('#au-pass');
  ok(/Choose a new password/.test(await txt('.auth-card h1')) && (await txt('.auth-card')).includes('marta@example.org'), 'the link opens "choose a new password" for that account');
  ok(!(await page.evaluate(() => !!UI.session)), 'the account does not open before a password is chosen');
  await page.fill('#au-pass', 'abc'); await page.click('[data-a="auth-reset-save"]'); ok(await errOf('au-pass'), 'weak reset password refused');
  await page.fill('#au-pass', 'NovaSenha77'); await page.click('[data-a="auth-reset-save"]'); await idle();
  ok(/same as the current/.test(await errOf('au-pass') || ''), 'the server refuses the password it already has');
  await page.fill('#au-pass', 'Terceira2026'); await page.keyboard.press('Enter'); await inApp();
  ok(/Password saved/.test(await toastText()), 'reset logs in'); eq(await page.evaluate(() => S.user.name), 'Marta Lima', 'same account');
  await logout(); await login('marta@example.org', 'NovaSenha77'); ok(/not right/.test(await txt('.banner.crit')), 'old password gone after reset');
  await login('marta@example.org', 'Terceira2026'); await inApp(); ok(true, 'new password works');
  // a reset link used twice does not work again; cancelling a reset changes nothing
  const used = (await outbox('recovery')).pop(); await logout();
  await visit(page, used.link);
  ok(/no longer works/.test(await txt('.banner.crit')), 'a link already used does not work again');
  await go('forgot'); await page.fill('#au-email', 'marta@example.org'); await page.click('[data-a="auth-forgot-send"]'); await idle();
  await openMail(page, 'recovery'); await page.waitForSelector('#au-pass'); await page.click('[data-a="auth-reset-cancel"]'); await page.waitForSelector('.lp-actions');
  ok(/Nothing was changed/.test(await toastText()), 'cancelling a reset: logged out, nothing changed');
  await login('marta@example.org', 'Terceira2026'); await inApp(); ok(true, 'the password is still the one before the cancelled reset');

  // 6. email change: a link to each address (the Supabase default), the login changes when both were opened
  await page.evaluate(() => navigate('profile')); await page.fill('#pf-email', 'marta.lima@example.org'); await page.click('[data-a="email-change"]');
  await page.waitForFunction(() => S.user.pendingEmail); ok(/We sent a link to marta.lima@example.org/.test(await txt('#view')), 'email change: says a link was sent');
  eq(await page.locator('#view [data-a="email-confirm"], #view .chip:has-text("Prototype")').count(), 0, 'email change: no pretend "open the link" button');
  eq([(await outbox('email_change')).map(m => m.to), (await outbox('email_change_current')).map(m => m.to)], [['marta.lima@example.org'], ['marta@example.org']], 'one link to each address');
  await saved(); await openMail(page, 'email_change_current'); await inApp();
  ok(/Now open the link sent to your other address/.test(await toastText()), 'first link: the other one is still to be opened');
  eq(await page.evaluate(() => [S.user.email, S.user.pendingEmail]), ['marta@example.org', 'marta.lima@example.org'], 'nothing changes after only one link');
  await openMail(page, 'email_change'); await inApp(); await idle();
  eq(await page.evaluate(() => [S.user.email, S.user.pendingEmail, UI.session.email]), ['marta.lima@example.org', null, 'marta.lima@example.org'], 'second link: the login is the new address');
  await saved(); eq((await db()).rows[me].data.user.email, 'marta.lima@example.org', 'and the account is saved with it');
  await logout(); await login('marta@example.org', 'Terceira2026'); ok(/not right/.test(await txt('.banner.crit')), 'the old address no longer logs in');
  await login('marta.lima@example.org', 'Terceira2026'); await inApp();
  await page.evaluate(() => navigate('profile')); await page.fill('#pf-email', 'marta.lima@example.org'); await page.click('[data-a="email-change"]'); ok(/already your email/.test(await toastText()), 'changing to the same address refused');

  // 7. the same account in two tabs
  const two = await open({ lang: 'en', browser, ctx }); const p2 = two.page; await p2.waitForFunction(() => !!UI.session);
  eq(await p2.evaluate(() => S.user.name), 'Marta Lima', 'second tab: already logged in, same account');
  // one tab saves; the other, still holding the older version, tries to save after it: the server refuses, and the tab takes the newer version
  await page.fill('#pf-name', 'Marta L.'); await page.locator('#pf-name').blur(); await saved();
  await p2.evaluate(() => { S.user.tone = 'plain'; save(); return saveNow(); }); await p2.waitForFunction(() => S.user.name === 'Marta L.');
  ok(/changed on another device/.test(await p2.locator('#toast-root').innerText()), 'second tab: told that the account changed elsewhere');
  eq(await p2.evaluate(() => [S.user.name, S.user.tone, SYNC.rev]), ['Marta L.', 'friend', await page.evaluate(() => SYNC.rev)], 'second tab: now on the newer version, its own late change not written over it');
  // coming back to a tab that was left open: it shows what the other one saved since
  await page.fill('#pf-name', 'Marta Lima'); await page.locator('#pf-name').blur(); await saved();
  await p2.evaluate(() => document.dispatchEvent(new Event('visibilitychange'))); await p2.waitForFunction(() => S.user.name === 'Marta Lima');
  ok(true, 'second tab: catches up when it is looked at again');
  // logging out in one tab logs the other out
  await page.click('#view [data-a="logout"]'); await page.waitForSelector('.lp-actions');
  await p2.waitForFunction(() => !UI.session && !WHO && UI.pub.screen === 'landing'); ok(/logged out/i.test(await p2.locator('#toast-root').innerText()), 'second tab: logged out with the first');
  eq(await p2.evaluate(() => S.user.name), '', 'second tab: the account left the page');
  // and logging in in one tab opens the account in the other
  await login('marta.lima@example.org', 'Terceira2026'); await inApp(); await p2.waitForFunction(() => !!UI.session);
  ok(true, 'second tab: logged in with the first'); await p2.close();

  // 8. a lost connection: nothing is lost, the top bar says so, and it is sent when the connection is back
  await page.evaluate(() => navigate('profile')); await page.evaluate(() => DORAX_PREVIEW.failNext('network', 50));
  await page.fill('#pf-name', 'Marta sem rede'); await page.locator('#pf-name').blur(); await page.evaluate(() => saveNow());
  await page.waitForSelector('.save-badge.warn'); ok(/not saved yet/.test(await txt('.save-badge')), 'top bar: not saved yet');
  await page.evaluate(() => navigate('settings')); ok(/Not saved yet/.test(await txt('#your-data')) && /have not reached the server/.test(await txt('#your-data')), 'Settings says the same');
  eq((await db()).rows[me].data.user.name, 'Marta Lima', 'the server still has the last saved version');
  // logging out now would lose the change: the person is asked
  await page.click('#rail-foot [data-a="logout"]'); await page.waitForSelector('#modal-root .modal');
  ok(/Log out without saving/.test(await txt('#modal-root .modal')), 'logging out with unsaved changes asks first'); await page.click('#modal-root button[data-a="modal-cancel"]');
  await page.evaluate(() => DORAX_PREVIEW.works()); await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await page.waitForFunction(() => savedState() === 'saved'); await idle();
  ok(/connection is back/.test(await toastText()), 'back online: saved, and said so'); eq(await page.locator('.save-badge').count(), 0, 'the warning is gone');
  eq((await db()).rows[me].data.user.name, 'Marta sem rede', 'the change made offline reached the server');
  ok(/Saved on the server/.test(await txt('#your-data .card-h')) && /On the server, in your account/.test(await txt('#your-data')), 'Settings: saved, on the server');
  eq(await page.locator('#proto-tools, [data-a="restore-demo"], [data-a="start-clean"], [data-a="proto-onboard"]').count(), 0, 'Settings: no prototype card, no example account tools');

  // the account cannot be read when it is opened: a screen that says so, and trying again works
  await page.evaluate(() => DORAX_PREVIEW.failNext('network', 1)); await page.reload(); await page.waitForSelector('[data-a="gate-retry"]');
  ok(/could not be opened/.test(await txt('.auth-card h1')) && /could not be reached/.test(await txt('.auth-card')), 'no connection while opening: says so');
  await page.click('[data-a="gate-retry"]'); await page.waitForFunction(() => typeof STARTED !== 'undefined' && STARTED && !!UI.session); eq(await page.evaluate(() => S.user.name), 'Marta sem rede', 'try again opens the account');
  // the same when the person is known but their account cannot be read
  await page.evaluate(() => { DORAX_PREVIEW.failNext('network', 1); WHO = null; openAccount(); }); await page.waitForSelector('[data-a="gate-retry"]');
  ok(/could not be reached/.test(await txt('.auth-card')) && !(await page.evaluate(() => !!UI.session)), 'the account cannot be read: nothing of it is shown');
  await page.click('[data-a="gate-retry"]'); await inApp(); eq(await page.evaluate(() => [S.user.name, UI.route]), ['Marta sem rede', 'settings'], 'try again opens it, on the screen it was on');
  // an account this version cannot read is never drawn, and never written over
  await page.evaluate(() => DORAX_PREVIEW.touch(data => { delete data.transactions; })); await page.reload(); await page.waitForSelector('.auth-card h1');
  ok(/could not be opened/.test(await txt('.auth-card h1')) && /cannot be read by this version/.test(await txt('.auth-card')) && !(await vis('[data-a="gate-retry"]')), 'unreadable account: says so, offers the contact form');
  const revBefore = (await db()).rows[me].rev; await page.click('.auth-card [data-a="logout"]'); await page.waitForSelector('.lp-actions'); eq((await db()).rows[me].rev, revBefore, 'and nothing was written to it');
  await page.evaluate(id => { const k = 'dorax.preview.db', d = JSON.parse(localStorage.getItem(k)); d.rows[id].data.transactions = []; localStorage.setItem(k, JSON.stringify(d)); }, me);

  // 9. a slow server: the button waits, and a second press sends nothing more
  { const slow = await open({ lang: 'en', browser, ctx, server: { delay: 250 } }); const p = slow.page; await p.waitForSelector('.lp-actions');
    await p.evaluate(() => A['pub-go']({ v: 'login' })); await p.fill('#au-email', 'marta.lima@example.org'); await p.fill('#au-pass', 'Terceira2026');
    await p.click('[data-a="auth-login"]');
    eq(await p.evaluate(() => { const b = document.querySelector('[data-a="auth-login"]'), g = document.querySelector('[data-a="auth-google"]'); return [b.disabled, b.getAttribute('aria-busy'), /One moment/.test(b.textContent), g.disabled]; }), [true, 'true', true, true], 'while the server is asked the button waits and says so; Google waits too');
    await p.evaluate(() => A['auth-login']()); await p.waitForFunction(() => !!UI.session); ok(true, 'a second press while waiting does nothing wrong');
    await p.evaluate(() => A.logout()); await p.waitForFunction(() => !UI.session && !WHO && UI.pub.screen === 'landing'); await p.close(); }

  // 10. Google. A new person: the setup opens with the name Google has
  await page.reload(); await page.waitForSelector('.lp-actions');
  await page.evaluate(() => DORAX_PREVIEW.set({ google: { email: 'Ana.G@example.org', name: 'Ana Google' } }));
  await go('signup'); await page.click('[data-a="auth-google"]'); await page.waitForSelector('#ob-name');
  eq(await page.locator('#g-email, [data-a="google-ok"], .proto').count(), 0, 'Google: no stand-in form in the app');
  eq(await page.inputValue('#ob-name'), 'Ana Google', 'Google sign-up: setup opens with the name from Google');
  await page.click('[data-a="onboard-save"]'); await page.click('[data-a="ob-finish"]'); await inApp(); await idle();
  eq(await page.evaluate(() => S.user.email), 'ana.g@example.org', 'account email comes from Google');
  await page.evaluate(() => navigate('profile'));
  ok(await page.locator('#view .chip:has-text("Google")').count() === 1 && !/Email and password/.test(await txt('#view')), 'profile: Google only');
  ok(/Choose a password/.test(await txt('[data-a="pw-open"]')), 'offers to choose a password');
  await page.click('[data-a="pw-open"]'); ok(!(await vis('#pf-pw-cur')), 'no current password asked when there is none');
  await page.fill('#pf-pw-new', 'AnaSenha2026'); await page.click('[data-a="pw-save"]'); await page.waitForFunction(() => !UI.pw);
  ok(/Email and password/.test(await txt('#view')), 'now both ways in'); ok(/Password saved/.test(await toastText()), 'password added');
  await logout(); await login('ana.g@example.org', 'AnaSenha2026'); await inApp(); ok(true, 'a Google account logs in with the password it added');
  await logout(); await go('login'); await page.click('[data-a="auth-google"]'); await inApp(); ok(/Good to see you again, Ana Google/.test(await toastText()), 'Google again: straight into the same account');
  await logout();
  // Google meets an email that already has a password account: one account, two ways in
  await page.evaluate(() => DORAX_PREVIEW.set({ google: { email: 'marta.lima@example.org', name: 'Marta via Google' } }));
  await go('login'); await page.click('[data-a="auth-google"]'); await inApp();
  eq(await page.evaluate(() => [S.user.name, S.user.email]), ['Marta sem rede', 'marta.lima@example.org'], 'Google with a known email opens the existing account, data and name intact');
  await page.evaluate(() => navigate('profile')); ok(/Email and password/.test(await txt('#view')) && await page.locator('#view .chip:has-text("Google")').count() === 1, 'profile shows both ways in');
  await logout(); await login('marta.lima@example.org', 'Terceira2026'); await inApp(); ok(true, 'the password still works after Google was added');
  eq(Object.keys((await db()).users).length, 2, 'two people, two accounts: Google made no duplicate');
  // Google cancelled: back on the login, which says so
  await logout(); await visit(page, FILE + '#error=access_denied&error_code=access_denied&error_description=The+user+denied+access');
  ok(/Google was cancelled/.test(await txt('.banner')) && await vis('#au-pass') && !(await vis('.banner.crit')), 'Google cancelled: the login, with a calm notice');
  eq(await page.evaluate(() => location.hash), '', 'and a clean address');
  // Google (or the server) could not complete the login: said as what it is, not as an old link (found on the live site: a wrong client secret read "that link no longer works")
  await visit(page, FILE + '?error=server_error&error_code=unexpected_failure&error_description=Unable+to+exchange+external+code#error=server_error&error_code=unexpected_failure&error_description=Unable+to+exchange+external+code');
  ok(/login could not be completed/.test(await txt('.banner.crit')) && !/link no longer works/.test(await txt('.auth-card')) && await vis('#au-pass'), 'a login Google could not complete: the login says so, and does not talk about a link');
  eq(await page.evaluate(() => location.hash + location.search), '', 'and the address is clean');
  // a sign-up never confirmed, then Google with the same email: Google proves the address; the unproven password does not become a way in
  await page.evaluate(() => DORAX_PREVIEW.set({ google: { email: 'pend@example.org', name: 'Pend G' } }));
  await go('signup'); await page.fill('#au-name', 'Pend'); await page.fill('#au-email', 'pend@example.org'); await page.fill('#au-pass', 'Pendente2026'); await page.check('#au-accept'); await page.click('[data-a="auth-signup"]'); await idle();
  await go('login'); await page.click('[data-a="auth-google"]'); await page.waitForSelector('#ob-name'); await page.click('[data-a="onboard-save"]'); await page.click('[data-a="ob-finish"]'); await inApp();
  await page.evaluate(() => navigate('profile')); ok(!/Email and password/.test(await txt('#view')) && await page.locator('#view .chip:has-text("Google")').count() === 1, 'the unconfirmed password was dropped: Google only');
  await logout(); await login('pend@example.org', 'Pendente2026'); ok(/not right/.test(await txt('.banner.crit')), 'the unconfirmed password does not log in');

  // 11. delete account: the person and everything kept for them are gone
  await login('marta.lima@example.org', 'Terceira2026'); await inApp(); await page.evaluate(() => navigate('profile'));
  await page.click('[data-a="user-delete"]'); await page.fill('#modal-word', 'delete'); await page.click('#modal-ok'); await page.waitForSelector('.lp-actions');
  ok(/Account deleted/.test(await toastText()), 'account deleted');
  d = await db(); eq([Object.values(d.users).some(u => u.email === 'marta.lima@example.org'), !!d.rows[me]], [false, false], 'the login and the data are both gone from the server');
  await login('marta.lima@example.org', 'Terceira2026'); ok(/not right/.test(await txt('.banner.crit')), 'the deleted account cannot log in');
  await page.reload(); await page.waitForSelector('.lp-actions'); ok(true, 'reload after deleting: logged out');
  // if the server cannot delete it, nothing is removed and the person stays in
  await page.evaluate(() => DORAX_PREVIEW.set({ google: { email: 'ana.g@example.org', name: 'Ana Google' } }));
  await login('ana.g@example.org', 'AnaSenha2026'); await inApp(); await page.evaluate(() => navigate('profile'));
  await page.evaluate(() => DORAX_PREVIEW.failNext('network', 1)); await page.click('[data-a="user-delete"]'); await page.fill('#modal-word', 'delete'); await page.click('#modal-ok');
  await page.waitForFunction(() => /could not be reached/.test(document.getElementById('toast-root').innerText)); ok(await page.evaluate(() => !!UI.session), 'delete that fails: still logged in, nothing removed');

  // 12. the contact form really sends: before login (a page) and inside the app (a panel)
  await page.evaluate(() => A.contact()); await page.waitForSelector('#ct-message');
  eq(await page.inputValue('#ct-email'), 'ana.g@example.org', 'contact in the app: the email is filled in');
  await page.fill('#ct-message', 'short'); await page.click('#overlay [data-a="contact-send"]'); ok(/few words/.test(await txt('#overlay .banner.crit')), 'a too-short message is refused');
  await page.fill('#ct-message', 'Olá, tenho uma dúvida sobre o plano.'); await page.evaluate(() => DORAX_PREVIEW.failNext('network', 1)); await page.click('#overlay [data-a="contact-send"]');
  await page.waitForSelector('#overlay .banner.crit'); ok(/could not be reached/.test(await txt('#overlay .banner.crit')), 'a message that cannot be sent says so'); eq(await page.inputValue('#ct-message'), 'Olá, tenho uma dúvida sobre o plano.', 'and what was written is kept');
  await page.click('#overlay [data-a="contact-send"]'); await page.waitForSelector('#contact-done');
  ok(/Message sent/.test(await txt('#contact-done')), 'contact: sent'); eq(await page.locator('#overlay .proto, #overlay .chip.warn').count(), 0, 'contact: no prototype box');
  d = await db(); eq(d.contact.map(m => [m.email, m.topic, m.message, m.lang, !!m.user_id]), [['ana.g@example.org', 'question', 'Olá, tenho uma dúvida sobre o plano.', 'en', true]], 'the message is on the server, with who wrote it');
  await page.click('[data-a="close"]'); await logout(); await page.click('.lp-foot [data-v="contact"], footer [data-v="contact"]');
  await page.fill('#ct-email', 'visitor@example.org'); await page.selectOption('#ct-topic', 'data'); await page.fill('#ct-message', 'Quero apagar os meus dados, por favor.'); await page.click('[data-a="contact-send"]'); await page.waitForSelector('#contact-done');
  d = await db(); eq([d.contact.length, d.contact[1].email, d.contact[1].topic, d.contact[1].user_id], [2, 'visitor@example.org', 'data', null], 'contact before login: sent without an account');

  // 12b. the hard cases (found by a review of the code before going live)
  await login('ana.g@example.org', 'AnaSenha2026'); await inApp(); await page.evaluate(() => navigate('profile'));
  const ana = await page.evaluate(() => UI.session.id), row = async () => (await db()).rows[ana];
  // a save that DID arrive, but whose answer was lost: what is typed afterwards is kept, and nothing is called a conflict
  await page.fill('#pf-name', 'Ana Um'); await page.locator('#pf-name').blur(); await page.evaluate(() => DORAX_PREVIEW.failNext('lost', 1)); await page.evaluate(() => saveNow());
  await page.waitForSelector('.save-badge.warn'); eq((await row()).data.user.name, 'Ana Um', 'the save reached the server although its answer never came');
  await page.fill('#pf-name', 'Ana Dois'); await page.locator('#pf-name').blur(); await page.evaluate(() => { S.user.tone = 'plain'; });
  await page.evaluate(() => window.dispatchEvent(new Event('online'))); await page.waitForFunction(() => savedState() === 'saved' && !SYNC.dirty && !SYNC.timer); await idle();
  eq([await page.evaluate(() => [S.user.name, S.user.tone]), [(await row()).data.user.name, (await row()).data.user.tone]], [['Ana Dois', 'plain'], ['Ana Dois', 'plain']], 'what was typed while it was "not saved" is kept, and saved on top');
  ok(!/another device/.test(await toastText()) && /connection is back/.test(await toastText()), 'and it is not mistaken for a change on another device');
  eq(await page.evaluate(() => SYNC.rev), (await row()).rev, 'the page and the server agree on the revision again');
  // an address that merely says "recovery" asks nobody for a new password
  for (const u of [FILE + '#type=recovery', FILE + '?type=recovery', FILE + '#type=recovery&access_token=made.up.token']) { await visit(page, u); await inApp(); ok(await page.evaluate(() => !RECOVERING && UI.pub.screen !== 'reset'), 'a made-up recovery address opens the account as usual: ' + u.slice(FILE.length)); }
  ok(!/access_token/.test(await page.evaluate(() => location.href)), 'and what was in the address does not stay there');
  // a recovery link that no longer works, opened where somebody is logged in: their account opens, and the page says the link failed
  await page.evaluate(() => A.logout()); await page.waitForFunction(() => !UI.session && !WHO && UI.pub.screen === 'landing'); await go('forgot'); await page.fill('#au-email', 'pend@example.org'); await page.click('[data-a="auth-forgot-send"]'); await idle();
  const pendLink = (await outbox('recovery')).pop(); await page.evaluate(t => DORAX_PREVIEW.expire(t), pendLink.token);
  await login('ana.g@example.org', 'AnaSenha2026'); await inApp();
  await page.evaluate(u => { history.replaceState(null, '', u); }, FILE + '#access_token=' + pendLink.token + '&type=recovery&expires_in=3600&refresh_token=x&token_type=bearer'); await page.reload(); await inApp();
  ok(await page.evaluate(() => !RECOVERING && S.user.email === 'ana.g@example.org'), 'somebody else’s dead recovery link never asks the person logged in here for a new password');
  // a recovery link opened in ANOTHER tab does not push this tab out of the app
  await page.evaluate(() => onServerNews('PASSWORD_RECOVERY', { user: SERVER.user })); ok(await page.evaluate(() => !!UI.session && !RECOVERING), 'a recovery link opened in another tab leaves this tab in the app');
  // deleting the account fails (no connection): saving goes on as before
  await page.evaluate(() => navigate('profile')); await page.evaluate(() => DORAX_PREVIEW.failNext('network', 1)); await page.click('[data-a="user-delete"]'); await page.fill('#modal-word', 'delete'); await page.click('#modal-ok');
  await page.waitForFunction(() => /could not be reached/.test(document.getElementById('toast-root').innerText));
  await page.fill('#pf-name', 'Ana Tres'); await page.locator('#pf-name').blur(); await page.waitForFunction(() => !SYNC.timer && !SYNC.busy && savedState() === 'saved', null, { timeout: 5000 });
  eq((await row()).data.user.name, 'Ana Tres', 'after a delete that failed, changes are still saved by themselves');
  // a backup edited to carry markup where the app writes its own ids is refused; typed text with any characters is not
  await page.evaluate(() => navigate('settings'));
  const backupOf = edit => page.evaluate(e => { const st = JSON.parse(JSON.stringify(S)); st.accounts.push({ id: e === 'id' ? 'a1" onmouseover="x' : 'a1', name: e === 'name' ? '<b>"Zé" & filhos</b>' : 'Conta', institution: '', type: 'checking', currency: 'BRL', scope: 'personal', purpose: '', opening: 0 }); return JSON.stringify({ app: 'dorax-finance', version: BACKUP_VERSION, exportedAt: S.today, state: st }); }, edit);
  await page.setInputFiles('#backup-file', { name: 'edited.json', mimeType: 'application/json', buffer: Buffer.from(await backupOf('id')) }); await page.waitForFunction(() => UI.backupError);
  ok(/never writes in a backup/.test(await txt('#your-data')) && !(await page.evaluate(() => !!UI.modal)), 'a backup with markup in an id is refused before anything is asked');
  await page.setInputFiles('#backup-file', { name: 'typed.json', mimeType: 'application/json', buffer: Buffer.from(await backupOf('name')) }); await page.waitForSelector('#modal-word');
  await page.fill('#modal-word', 'delete'); await page.click('#modal-ok'); await page.waitForFunction(() => S.accounts.length === 1); await page.evaluate(() => navigate('accounts'));
  eq(await page.evaluate(() => [document.querySelectorAll('#view b b, #view [onmouseover]').length, /<b>"Zé" & filhos<\/b>/.test(document.getElementById('view').innerText)]), [0, true], 'a name with any characters is restored and shown as the text it is');
  await page.evaluate(() => { S.accounts = []; render(); }); await saved();
  // another person logs in in a second tab of this browser: this tab moves to their account, and nothing of the first is written into it
  { const two = await open({ lang: 'en', browser, ctx }); const p2 = two.page; await p2.waitForFunction(() => typeof UI !== 'undefined' && !!UI.session);
    await page.evaluate(() => navigate('profile')); await page.fill('#pf-name', 'Ana a meio'); await page.locator('#pf-name').blur();       // not saved yet: the save is still waiting
    await p2.evaluate(() => A.logout()); await p2.waitForFunction(() => !UI.session && !WHO && UI.pub.screen === 'landing'); await page.waitForFunction(() => !UI.session);
    await p2.evaluate(() => A['pub-go']({ v: 'signup' })); await p2.fill('#au-name', 'Beto'); await p2.fill('#au-email', 'beto@example.org'); await p2.fill('#au-pass', 'BetoSenha2026'); await p2.check('#au-accept'); await p2.click('[data-a="auth-signup"]');
    await p2.waitForFunction(() => UI.pub.screen === 'sent'); const m = await p2.evaluate(() => DORAX_PREVIEW.outbox().filter(x => x.type === 'signup').pop());
    await p2.evaluate(u => { history.replaceState(null, '', u); }, m.link); await p2.reload(); await p2.waitForSelector('#ob-name'); await p2.click('[data-a="onboard-save"]'); await p2.click('[data-a="ob-finish"]'); await p2.waitForFunction(() => !!UI.session);
    // (this tab followed the login while the other was still in the first-time setup, so it shows the setup too; finishing it here finds the row the other tab made)
    await page.waitForSelector('#ob-name'); await page.click('[data-a="onboard-save"]'); await page.click('[data-a="ob-finish"]'); await page.waitForFunction(() => !!UI.session && S.user.name === 'Beto' && !SYNC.busy && !SYNC.timer && !SYNC.failed); const d2 = await db(), beto = Object.values(d2.users).find(u => u.email === 'beto@example.org').id;
    eq([d2.rows[beto].data.user.name, d2.rows[beto].data.user.email, d2.rows[ana].data.user.email, d2.rows[ana].data.user.name === 'Beto', await page.evaluate(() => UI.session.email), Object.keys(d2.rows).filter(k => d2.rows[k].data.user.email === 'beto@example.org').length], ['Beto', 'beto@example.org', 'ana.g@example.org', false, 'beto@example.org', 1], 'each row holds its own person’s account after the login changed under an open tab');
    // the account is deleted from the other tab: this one is logged out, login included
    await p2.evaluate(() => navigate('profile')); await p2.click('[data-a="user-delete"]'); await p2.fill('#modal-word', 'delete'); await p2.click('#modal-ok'); await p2.waitForSelector('.lp-actions');
    await page.waitForFunction(() => !UI.session && !WHO && UI.pub.screen === 'landing'); eq(await page.evaluate(() => localStorage.getItem('sb-preview-auth-token')), null, 'an account deleted elsewhere: this tab is logged out and the browser forgets the login');
    await p2.close(); }
  // deleted on another DEVICE (this browser still holds the login): the next save finds no row, and the login is dropped
  await login('ana.g@example.org', 'AnaSenha2026'); await inApp();
  await page.evaluate(id => { const k = 'dorax.preview.db', d = JSON.parse(localStorage.getItem(k)); delete d.rows[id]; localStorage.setItem(k, JSON.stringify(d)); }, ana);
  await page.evaluate(() => { S.user.tone = 'friend'; save(); return saveNow(); }); await page.waitForFunction(() => !UI.session && !WHO && UI.pub.screen === 'landing');
  ok(/no longer exists/.test(await toastText()), 'the account is gone on the server: this device says so'); eq(await page.evaluate(() => localStorage.getItem('sb-preview-auth-token')), null, 'and forgets the login, instead of offering the first-time setup to a deleted person');
  // after the "cannot be read" screen, logging in again is not stuck
  await login('ana.g@example.org', 'AnaSenha2026'); await page.waitForSelector('#ob-name'); await page.click('[data-a="onboard-save"]'); await page.click('[data-a="ob-finish"]'); await inApp(); await saved();
  await page.evaluate(() => DORAX_PREVIEW.touch(data => { delete data.goals; })); await page.reload(); await page.waitForSelector('.auth-card [data-v="contact"]');
  await page.click('.auth-card [data-v="contact"]'); await page.waitForSelector('#contact-title'); await page.evaluate(() => A['pub-go']({ v: 'login' })); await page.waitForSelector('#au-pass');
  await page.fill('#au-email', 'ana.g@example.org'); await page.fill('#au-pass', 'AnaSenha2026'); await page.click('[data-a="auth-login"]'); await page.waitForSelector('.auth-card [data-v="contact"]');
  ok(/could not be opened/.test(await txt('.auth-card h1')) && !(await page.evaluate(() => UI.pub.busy)), 'logging in again after the "cannot be read" screen shows it again; no button is left waiting');
  await page.click('.auth-card [data-a="logout"]'); await page.waitForSelector('.lp-actions');
  // the very first save of a new account, its answer lost: the account is kept, not replaced and not doubled
  { const fresh = await open({ lang: 'en', browser, ctx, server: { confirmEmail: false } }); const p = fresh.page; await p.waitForSelector('.lp-actions');
    await p.evaluate(() => A['pub-go']({ v: 'signup' })); await p.fill('#au-name', 'Caio'); await p.fill('#au-email', 'caio@example.org'); await p.fill('#au-pass', 'CaioSenha2026'); await p.check('#au-accept'); await p.click('[data-a="auth-signup"]');
    await p.waitForSelector('#ob-name'); await p.click('[data-a="onboard-save"]'); await p.evaluate(() => DORAX_PREVIEW.failNext('lost', 1)); await p.click('[data-a="ob-finish"]'); await p.waitForFunction(() => !!UI.session);
    await p.waitForSelector('.save-badge.warn'); await p.evaluate(() => { S.user.tone = 'plain'; window.dispatchEvent(new Event('online')); }); await p.waitForFunction(() => savedState() === 'saved' && !SYNC.dirty && !SYNC.timer && !SYNC.busy);
    const d3 = await p.evaluate(() => DORAX_PREVIEW.db()), caio = Object.values(d3.users).find(u => u.email === 'caio@example.org').id;
    eq([d3.rows[caio].data.user.name, d3.rows[caio].data.user.tone, d3.rows[caio].rev, await p.evaluate(() => [S.user.name, SYNC.rev])], ['Caio', 'plain', 2, ['Caio', 2]], 'first save with a lost answer: one row, the account intact, the later change saved on top');
    await p.evaluate(() => A.logout()); await p.waitForFunction(() => !UI.session && !WHO && UI.pub.screen === 'landing'); await p.close(); }

  eq(errors, [], 'no console errors in the whole run');
  await browser.close();

  // 13. a copy that is not connected to a server yet: the pages before login work, and the login says what is missing
  if (TARGET === 'app') {
    const bare = await open({ lang: 'en', noServer: true }); const p = bare.page; await p.waitForSelector('.lp-actions');
    eq(await p.evaluate(() => [SERVER.ready, STARTED]), [false, true], 'no config: the app starts without a server');
    await p.click('.lp-actions [data-v="signup"]'); ok(/not connected to its server yet/.test(await p.locator('.banner.warn').innerText()), 'the login says the copy is not connected');
    await p.fill('#au-name', 'X'); await p.fill('#au-email', 'x@example.org'); await p.fill('#au-pass', 'Abcdefg12'); await p.check('#au-accept'); await p.click('[data-a="auth-signup"]');
    ok(/not connected/.test(await p.locator('.banner.crit').innerText()), 'and trying anyway says so, instead of failing silently');
    eq(bare.errors, [], 'not connected: no console errors'); await bare.browser.close();
  }

  // 14. Spanish and Portuguese: nothing left in English on the login screens
  for (const lang of ['es', 'pt']) {
    const o = await open({ lang }); const p = o.page; await p.waitForSelector('.lp-actions');
    const english = /\b(password|Log in|Create account|Continue with|Check your email|Confirm your email|Choose a|Send it again|Use another|Forgot|Welcome|Already have|New here|One moment|Back to|could not|Try again|Log out)\b/;
    const texts = [];
    await p.evaluate(() => A['pub-go']({ v: 'signup' })); texts.push(await p.locator('.auth-card').innerText());
    await p.click('[data-a="auth-signup"]'); texts.push(await p.locator('.auth-card').innerText());
    await p.fill('#au-name', 'Luz'); await p.fill('#au-email', 'luz@example.org'); await p.fill('#au-pass', 'LuzSenha2026'); await p.check('#au-accept'); await p.click('[data-a="auth-signup"]');
    await p.waitForFunction(() => UI.pub.screen === 'sent'); texts.push(await p.locator('.auth-card').innerText());
    await p.click('[data-a="auth-resend"]'); await p.waitForFunction(() => UI.pub.resent); texts.push(await p.locator('.auth-card').innerText());
    await p.evaluate(() => A['pub-go']({ v: 'login' })); texts.push(await p.locator('.auth-card').innerText());
    await p.fill('#au-email', 'luz@example.org'); await p.fill('#au-pass', 'errada12345'); await p.click('[data-a="auth-login"]'); await p.waitForSelector('.banner.crit'); texts.push(await p.locator('.auth-card').innerText());
    await p.evaluate(() => A['pub-go']({ v: 'forgot' })); texts.push(await p.locator('.auth-card').innerText());
    await p.fill('#au-email', 'luz@example.org'); await p.click('[data-a="auth-forgot-send"]'); await p.waitForFunction(() => UI.pub.screen === 'sent'); texts.push(await p.locator('.auth-card').innerText());
    await openMail(p, 'recovery'); await p.waitForSelector('#au-pass'); texts.push(await p.locator('.auth-card').innerText());
    await p.evaluate(() => { for (const c of ['network', 'over_request_rate_limit', 'over_email_send_rate_limit', 'weak_password', 'signup_disabled', 'provider_disabled', 'otp_expired', 'access_denied', 'session_not_found', 'anything_else']) window.__s = (window.__s || '') + '\n' + serverSays(c); }); texts.push(await p.evaluate(() => window.__s));
    await p.evaluate(() => showGate('offline', { error: serverSays('network') })); texts.push(await p.locator('.auth-card').innerText());
    const left = texts.join('\n').split('\n').filter(l => english.test(l));
    eq(left, [], `${lang}: login screens fully translated`);
    eq(o.errors, [], `${lang}: no console errors`); await o.browser.close();
  }

  // 14b. a first visit opens in the browser's language (v42); a language picked by hand is remembered; the account's language wins once logged in
  {
    const br = await require('playwright').chromium.launch();
    const visit1 = async (locale) => { const ctx = await br.newContext({ locale, viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' }); const o = await open({ browser: br, ctx, lang: 'auto' }); await o.page.waitForSelector('.lp-actions'); return o; };
    const seen = p => p.evaluate(() => [S.settings.lang, document.documentElement.lang, document.querySelector('[data-a="pub-go"][data-v="login"]').textContent.trim()]);
    for (const [locale, lang, word] of [['pt-BR', 'pt', 'Entrar'], ['pt-PT', 'pt', 'Entrar'], ['es-MX', 'es', 'Entrar'], ['es-419', 'es', 'Entrar'], ['en-GB', 'en', 'Log in'], ['en-US', 'en', 'Log in'], ['fr-FR', 'pt', 'Entrar'], ['de-DE', 'pt', 'Entrar'], ['ja-JP', 'pt', 'Entrar']]) {
      const o = await visit1(locale); eq(await seen(o.page), [lang, lang, word], `a browser in ${locale} opens the home page in ${lang}`); eq(o.errors, [], `${locale}: no console errors`); await o.ctx.close();
    }
    // the person's own order of preference: the first language the app speaks
    { const ctx = await br.newContext({ locale: 'fr-FR', reducedMotion: 'reduce' }); await ctx.addInitScript(() => Object.defineProperty(navigator, 'languages', { get: () => ['fr-FR', 'fr', 'es-AR', 'en'] }));
      const o = await open({ browser: br, ctx, lang: 'auto' }); await o.page.waitForSelector('.lp-actions'); eq((await seen(o.page))[0], 'es', 'several languages in the browser: the first one the app speaks'); await ctx.close(); }
    // picked by hand: kept on the next visit, whatever the browser says
    { const o = await visit1('pt-BR'); const p = o.page; await p.selectOption('#lp-lang', 'en'); await p.waitForFunction(() => S.settings.lang === 'en'); await p.reload(); await p.waitForSelector('.lp-actions');
      eq(await seen(p), ['en', 'en', 'Log in'], 'a language picked by hand is the one the next visit opens in');
      // sign-up carries it, and a new account starts in it
      await p.evaluate(() => A['pub-go']({ v: 'signup' })); await p.fill('#au-name', 'Kim'); await p.fill('#au-email', 'kim@example.org'); await p.fill('#au-pass', 'KimSenha2026'); await p.check('#au-accept'); await p.click('[data-a="auth-signup"]');
      await p.waitForFunction(() => UI.pub.screen === 'sent'); await openMail(p, 'signup'); await p.waitForSelector('#ob-name'); eq(await p.evaluate(() => S.settings.lang), 'en', 'a new account starts in the language of the visit');
      await p.click('[data-a="onboard-save"]'); await p.click('[data-a="ob-finish"]'); await p.waitForFunction(() => !!UI.session);
      // the account's language wins over the device's once logged in
      await p.evaluate(() => { S.settings.lang = 'es'; return saveNow(); }); await p.evaluate(() => localStorage.setItem('dorax.lang', 'pt')); await p.reload(); await p.waitForFunction(() => !!UI.session);
      eq(await p.evaluate(() => [S.settings.lang, document.documentElement.lang, localStorage.getItem('dorax.lang')]), ['es', 'es', 'es'], 'logged in: the language kept with the account wins, and the device remembers it');
      eq(o.errors, [], 'languages: no console errors'); await o.ctx.close(); }
    await br.close();
  }

  // 15. phones: fits, 16px fields, large enough targets
  for (const w of [320, 390]) {
    const o = await open({ lang: 'pt', viewport: { width: w, height: 760 }, touch: true, mobile: true, dpr: 2 }); const p = o.page; await p.waitForSelector('.lp-actions');
    for (const v of ['signup', 'login', 'forgot']) {
      await p.evaluate(v => A['pub-go']({ v }), v);
      const m = await p.evaluate(() => {
        const out = { overflow: document.documentElement.scrollWidth - window.innerWidth, fonts: [], small: [] };
        document.querySelectorAll('.auth-card input:not([type=checkbox]):not(.sr)').forEach(i => { const f = parseFloat(getComputedStyle(i).fontSize); if (f < 16) out.fonts.push(i.id + ':' + f); if (i.getBoundingClientRect().height < 44) out.small.push(i.id); });
        document.querySelectorAll('.auth-card .btn.lg, .auth-card .pw-eye').forEach(b => { const r = b.getBoundingClientRect(); if (r.height < 40 || r.width < 40) out.small.push((b.dataset.a || b.className) + ':' + Math.round(r.width) + 'x' + Math.round(r.height)); });
        const card = document.querySelector('.auth-card').getBoundingClientRect(); out.cardFits = card.left >= 0 && card.right <= window.innerWidth + .5;
        return out;
      });
      eq([m.overflow <= 0, m.fonts, m.small, m.cardFits], [true, [], [], true], `phone ${w}px ${v}: fits, 16px fields, targets`);
      eq(await p.evaluate(() => [document.querySelectorAll('.auth-side').length, [...document.querySelectorAll('.auth .logo')].filter(l => l.getClientRects().length).length]), [0, 1], `phone ${w}px ${v}: one block under one logo, no side panel`);
    }
    await p.evaluate(() => showGate('offline', { error: serverSays('network') })); eq(await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth <= 0), true, `phone ${w}px "could not be opened" fits`);
    eq(o.errors, [], `phone ${w}: no console errors`); await o.browser.close();
  }

  // 15b. wide screens: one block, centred, no panel beside it (owner, 2026-10-05: "remove the 2 block design of the sign-up and login")
  for (const [w, h] of [[1440, 900], [1000, 760], [921, 700]]) {
    const o = await open({ lang: 'pt', viewport: { width: w, height: h } }); const p = o.page; await p.waitForSelector('.lp-actions');
    const look = () => p.evaluate(() => {
      const card = document.querySelector('.auth-card').getBoundingClientRect(), cs = getComputedStyle(document.querySelector('.auth-card')), h1 = document.querySelector('.auth h1').getBoundingClientRect(), b = document.querySelector('.auth-back');
      return { panel: document.querySelectorAll('.auth-side, .as-steps').length, centred: Math.abs((card.left + card.right) / 2 - document.documentElement.clientWidth / 2) <= 1, wide: Math.round(card.width), noBox: cs.borderTopWidth === '0px' && cs.backgroundColor === 'rgba(0, 0, 0, 0)',
        logos: [...document.querySelectorAll('.auth .logo')].filter(l => l.getClientRects().length).length, logoAbove: document.querySelector('.auth .logo').getBoundingClientRect().bottom <= h1.top, pattern: document.querySelectorAll('.auth .weave').length,
        overflow: document.documentElement.scrollWidth - innerWidth, back: !b || (b.getBoundingClientRect().bottom <= h1.top && b.getBoundingClientRect().left < card.left) };
    });
    const want = { panel: 0, centred: true, wide: 400, noBox: true, logos: 1, logoAbove: true, pattern: 0, overflow: 0, back: true };
    await p.evaluate(() => A['pub-go']({ v: 'signup' })); eq(await look(), want, `${w}px sign-up: one block, centred, the logo over the form, no panel and no box`);
    await p.evaluate(() => A['pub-go']({ v: 'login' })); eq(await look(), want, `${w}px login: the same block`);
    await p.evaluate(() => A['pub-go']({ v: 'forgot' })); eq(await look(), want, `${w}px forgot password: the same block`);
    await p.evaluate(() => { UI.pub = { ...freshPub(), screen: 'sent', sent: 'signup', email: 'a@example.org' }; renderNow(); }); eq(await look(), want, `${w}px confirm your email: the same block`);
    await p.evaluate(() => showGate('offline', { error: serverSays('network') })); eq(await look(), want, `${w}px "could not be opened": the same block`);
    eq(o.errors, [], `one block ${w}: no console errors`); await o.browser.close();
  }

  // 16. the one-file preview inside a frame that allows scripts only (how a published preview runs): no storage, and it still works in memory
  if (TARGET === 'bundle') {
    const b = await require('playwright').chromium.launch(); const c = await b.newContext({ viewport: { width: 1200, height: 900 }, reducedMotion: 'reduce' });
    await c.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
    const wrap = path.join(path.dirname(PAGE), '_frame.html');
    fs.writeFileSync(wrap, `<!doctype html><meta charset="utf-8"><iframe id="f" sandbox="allow-scripts" src="${encodeURI(path.basename(PAGE))}" style="width:1180px;height:860px;border:0"></iframe>`);
    const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto('file://' + wrap); const f = p.frameLocator('#f');
    await f.locator('.lp-actions [data-v="signup"]').click();
    await f.locator('#au-name').fill('Quadro'); await f.locator('#au-email').fill('quadro@example.org'); await f.locator('#au-pass').fill('Quadro2026'); await f.locator('#au-accept').check();
    await f.locator('#au-pass').press('Enter');
    await f.locator('#ob-name').waitFor(); ok(true, 'framed preview: sign-up goes straight to the setup (the preview asks for no email confirmation)');
    await f.locator('[data-a="onboard-save"]').click(); await f.locator('[data-a="ob-finish"]').click();
    ok(await f.locator('.hello').isVisible(), 'framed preview: account opens');
    await f.locator('#rail-foot [data-a="logout"]').click(); await f.locator('.lp-actions [data-v="login"]').click();
    await f.locator('#au-email').fill('quadro@example.org'); await f.locator('#au-pass').fill('Quadro2026'); await f.locator('[data-a="auth-login"]').click();
    await f.locator('.hello').waitFor(); ok(true, 'framed preview: login with the password works in memory');
    eq(errs, [], 'framed preview: no page errors'); fs.unlinkSync(wrap); await b.close();
  }
  done('flows-auth');
})().catch(async e => { console.error(e); try { console.error('STATE', await LIVE.evaluate(() => JSON.stringify({ screen: UI.pub && UI.pub.screen, pub: UI.pub, session: UI.session, who: WHO, rec: RECOVERING, toast: document.getElementById('toast-root').innerText, modal: !!UI.modal, sync: { ...SYNC, last: undefined }, hash: location.hash }))); } catch (x) { console.error('no state', x.message); } process.exit(1); });
