// QC: the profile like Settings, and why a notification did not arrive (owner, 2026-10-09: "do in Profile what you did in Settings with the headings";
// "notifications are not reaching my phone, look into it").
//   1. the profile's groups have their headings outside their cards, in one column, as in Settings;
//   2. the device's notification setting says when the next notification is due (a quiet phone is not a broken one);
//   3. a test notification shows, device by device, what each push service answered, and what to check on the device.
const { open, ok, eq, done } = require('./pw.js');
(async () => {
  for (const [w, h, mob] of [[1440, 900, false], [390, 844, true]]) {
    const tag = w + 'px: ';
    let { browser, page, errors } = await open({ lang: 'en', account: 'example', plan: true, beta: true, viewport: { width: w, height: h }, ...(mob ? { touch: true, mobile: true } : {}) });
    await page.evaluate(() => { S.user.greeted = true; navigate('profile'); }); await page.waitForSelector('.pf-page');
    // ---------- 1. the groups ----------
    eq(await page.evaluate(() => [...document.querySelectorAll('.pf-page > .set-group')].map(g => [g.querySelector('.set-head h2').textContent.trim(), !!g.querySelector(':scope > .card > .card-b'), !g.querySelector('.card-h')])),
      [['You', true, true], ['Email and login', true, true], ['Protection on this device', true, true], ['Reminders', true, true], ['Delete account', true, true]], tag + 'each group of the profile has its heading outside its card, as in Settings');
    ok(await page.evaluate(() => { const gs = [...document.querySelectorAll('.pf-page > .set-group')].map(g => g.getBoundingClientRect()); return gs.every((r, i) => !i || r.top >= gs[i - 1].bottom) && gs.every(r => Math.abs(r.left - gs[0].left) < 1); }), tag + 'one column, read from top to bottom');
    eq(await page.evaluate(() => [!!document.querySelector('#reminders-card .set-head [data-a="reminders"]'), !!document.querySelector('#guard-card .card-b .setting'), document.querySelector('.pf-head').getBoundingClientRect().width <= 841]), [true, true, true], tag + 'the reminders’ button sits beside their heading; the protection’s rows stay in their card; the head has the groups’ width');
    // ---------- 2. when the next one is due ----------
    await page.evaluate(() => { UI.push = { status: 'on', known: true, asked: true }; render(); });
    eq(await page.evaluate(() => { const x = reminderScheduleAll(S, S.today, remindCfg().lead, 62)[0]; return [/Reminders go out at 8:00 when something is due\. The next one:/.test(document.querySelector('#push-setting p').textContent), !!x && document.querySelector('#push-setting p').textContent.includes(fmt.date(x.sendDate))]; }), [true, true], tag + 'the device’s setting says when reminders go out and when the next one is (no longer “only”: tips go too, owner 2026-10-10)');
    // ---------- 3. the test, device by device ----------
    await page.evaluate(() => { SERVER.remindTest = async () => ({ ok: true, results: [{ agent: 'Safari, iOS', service: 'apple', status: 201, ok: true }, { agent: 'Chrome, Windows', service: 'google', status: 403, ok: false }, { agent: 'Chrome, Android', service: 'google', status: 410, ok: false, gone: true }] }); });
    await page.click('[data-a="push-test"]'); await page.waitForSelector('#push-test');
    eq(await page.evaluate(() => [...document.querySelectorAll('#push-test li')].map(li => [li.className, li.querySelector('.grow').textContent.trim(), li.lastElementChild.textContent.trim()])),
      [['ok', 'Safari, iOS', 'Delivered to Apple'], ['bad', 'Chrome, Windows', 'Google refused it (error 403)'], ['bad', 'Chrome, Android', 'This device no longer takes notifications: removed from the list']], tag + 'the test says, device by device, what each push service answered');
    ok(await page.evaluate(() => /Focus or Do not disturb/.test(document.querySelector('#push-test .note').textContent)), tag + 'and what to check on the device when it was delivered and does not show');
    eq(errors, [], tag + 'no error in the console'); await browser.close();
  }
  done('qc-profile-groups');
})();
