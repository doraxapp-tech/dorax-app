// QC of two marks the dark theme hid (owner, 2026-10-12, on his phone: "modo oscuro tiene estos dos pequeños errores: el texto «Te faltan [valor]»
// el valor no se ve, está de color blanco; la racha: el círculo no se ve el check mark"):
//   1. the summary's lime strip when the money is short: the amount in the strip's deep green, as its words, in both themes;
//   2. the Journey's week: a marked day's check in deep green on the lime in the dark theme (white on the forest in the light one); the count on
//      the filters' button the same.
const { open, ok, eq, done } = require('./pw.js');
const parse = c => c.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number);
(async () => {
  for (const [theme, check, dayBg] of [['dark', 'rgb(17, 38, 34)', 'rgb(182, 221, 98)'], ['light', 'rgb(255, 255, 255)', 'rgb(17, 38, 34)']]) {
    const { browser, page, errors } = await open({ lang: 'es', account: 'example', plan: true, viewport: { width: 390, height: 844 }, touch: true, mobile: true });
    await page.evaluate(th => { S.user.greeted = true; S.settings.themePhone = th; const j = B().journey = journeyEmpty(); j.sprint = { start: S.today, days: 7, target: 10000 }; j.checks[S.today] = true;
      const f = window.freeUntil; window.freeUntil = (...a) => { const r = f(...a); return r && { ...r, free: -18600 }; }; navigate('dashboard'); render(); }, theme);
    await page.waitForTimeout(400);
    eq(await page.evaluate(() => { const b = document.querySelector('#free-card .bq-say b'), say = b.closest('.bq-say'); return [b.textContent, getComputedStyle(b).color === getComputedStyle(say).color, getComputedStyle(say).color]; }), ['R$ 186', true, 'rgb(17, 38, 34)'], `${theme}: “Te faltan R$ 186…”: the amount in the strip’s deep green, as its words`);
    await page.evaluate(() => A['journey-open']()); await page.waitForTimeout(350);
    eq(await page.evaluate(() => { const d = document.querySelector('.jr-day.on'), s = d && d.querySelector('svg'); return [getComputedStyle(d).backgroundColor, getComputedStyle(s).stroke]; }), [dayBg, check], `${theme}: the Journey’s marked day shows its check (${theme === 'dark' ? 'deep green on lime' : 'white on the forest'})`);
    ok(await page.evaluate(() => getComputedStyle(document.getElementById('overlay')).getPropertyValue('--on-brand').trim() !== getComputedStyle(document.getElementById('overlay')).getPropertyValue('--brand').trim()), `${theme}: in the panels, what sits on the accent is never the accent itself`);
    eq(errors, [], `${theme}: no error`); await browser.close();
  }
  done('qc-dark-marks');
})();
