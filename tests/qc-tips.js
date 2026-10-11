// QC of tips by notification (owner, 2026-10-10: "why don't the web app's notifications reach my phone? It says 'it notifies only when something
// is due', but I want the web app to notify about curiosities, tips, advice, etc., to help and motivate the person").
//   1. the profile: "Tips by notification", how often (every day, up to three a week, once a week, none), up to three a week until the person chooses;
//   2. the line about this device no longer says "only when something is due" while tips are on;
//   3. the app and the server pick the same tip, in the same words, for the same account and day (3 languages);
//   4. the curiosities inside the app still show their fact and source (their texts moved to the file the server shares).
const path = require('path');
const { open, ok, eq, done } = require('./pw.js');
(async () => {
  const logic = await import('file://' + path.join(__dirname, '..', 'supabase', 'functions', 'reminders', 'logic.mjs'));
  for (const lang of ['es', 'pt', 'en']) {
    const { browser, page, errors } = await open({ lang, account: 'example', plan: true, viewport: { width: 390, height: 844 }, touch: true, mobile: true });
    await page.evaluate(() => navigate('profile')); await page.waitForSelector('#tips-setting');
    const T = k => page.evaluate(k => t(k), k);
    eq(await page.evaluate(() => { const s = document.querySelector('#nf-tips'), r = s.getBoundingClientRect(); return [[...s.options].map(o => o.value), s.value, document.querySelector('#tips-setting b').innerText.trim(), r.height >= 44, r.right <= innerWidth, document.documentElement.scrollWidth <= innerWidth]; }),
      [['daily', 'three', 'weekly', 'off'], 'three', await T('Tips by notification'), true, true, true], `${lang}: the profile has “Tips by notification”, up to three a week until the person chooses; it fits a phone`);
    ok(await page.evaluate(() => /8:00/.test(document.querySelector('#tips-setting p').innerText) && /23:00/.test(document.querySelector('#tips-setting p').innerText)), `${lang}: it says when: between 8:00 and 23:00, at a different time each day (owner, 2026-10-10)`);
    ok(await page.evaluate(() => { const ids = [...document.querySelectorAll('#reminders-card .setting, #view .setting')].map(x => x.id || (x.querySelector('#nf-curio') ? 'curio' : '')); return ids.indexOf('tips-setting') === ids.indexOf('curio') + 1; }), `${lang}: it sits right after the curiosities inside the app`);
    eq(await page.evaluate(() => { S.user.notify.bills = true; const on = pushWhen(); S.user.notify.tips = 'off'; const off = pushWhen(); S.user.notify.tips = 'three'; return [/^(It notifies only|Solo avisa|Só avisa)/.test(on), /^(It notifies only|Solo avisa|Só avisa)/.test(off)]; }), [false, true], `${lang}: with tips on, this device’s line no longer says “only when something is due”`);
    await page.selectOption('#nf-tips', 'weekly');
    eq(await page.evaluate(() => [S.user.notify.tips, document.querySelector('#nf-tips').value]), ['weekly', 'weekly'], `${lang}: choosing is kept with the account`);
    // the app and the server, the same tip
    const doc = await page.evaluate(() => { const d = JSON.parse(JSON.stringify(S)); d.user.notify = { ...d.user.notify, bills: false, close: false, summary: false, goals: false, pay: false, journey: false, tips: 'daily' }; return d; });
    let same = 0; const diff = [], sent = new Set();
    for (const day of ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09']) {
      const server = logic.tipFor(JSON.parse(JSON.stringify(doc)), day, sent, false);
      const app = await page.evaluate(([d, day, keys]) => { const keep = S; S = JSON.parse(JSON.stringify(d)); S.today = day; try { return tipPick(S, day, new Set(keys)); } finally { S = keep; } }, [doc, day, [...sent]]);
      if (server && app && JSON.stringify([server.kind, server.keys, server.push]) === JSON.stringify([app.kind, app.keys, app.push])) same++; else diff.push([day, server && server.push, app && app.push]);
      if (server) server.keys.forEach(k => sent.add(k));
    }
    eq([same, diff], [5, []], `${lang}: the app and the server pick the same tip in the same words, five mornings in a row`);
    eq(logic.tipFor(JSON.parse(JSON.stringify(doc)), '2026-10-10', sent, true), null, `${lang}: on a morning with a reminder the server sends no tip`);
    // the curiosities inside the app
    await page.evaluate(() => { UI.curio = { id: 'fgc', open: true }; renderCurio(); });
    ok(await page.evaluate(() => /FGC/.test(document.querySelector('#curio').innerText) && /250/.test(document.querySelector('#curio').innerText)), `${lang}: a curiosity inside the app still shows its fact and source`);
    eq(errors, [], `${lang}: no error in the console`); await browser.close();
  }
  // a tap on a tip brings the app to the front; only a reminder opens the bell's panel (app/sw.js)
  const sw = require('fs').readFileSync(path.join(__dirname, '..', 'app', 'sw.js'), 'utf8');
  ok(/reminder = \/\[\?&\]open=reminders/.test(sw) && /if \(reminder\) c\.postMessage\(\{ dorax: 'open-reminders' \}\)/.test(sw), 'a tapped tip brings Dorax to the front; only a reminder opens the bell’s panel');
  done('qc-tips');
})().catch(e => { console.error('qc-tips: Error', e); process.exit(1); });
