// QC of the Help center (v209; owner, 2026-10-13: "Ayuda es un sub menú: crea un help center en su propia página, y a su vez que esté en el footer
// de la landing page y accesible desde el ordenador y el celular"; then "el help center es en la web, no en el dashboard"; and, on its first look, "no me
// gustan": features/help/help-center.js, css/screens/help-center.css).
//   1. before login: the home page's footer links to it; the page is made of the home page's parts: the centred title, the
//      search and the words looked for most; the ten topics and the questions asked most; the way to write and the way in; no "Show me" there; a topic opens its page (the others beside it); a word under the search shows what it finds; the search filters
//      as it is typed, keeping the focus; nothing found says so; the footer's sections lead to the home page; a phone: nothing wider than the screen;
//   2. from the app, on a computer: the menu beside the name opens the same page over the app, with "Back to Dorax"; an answer's "Show me" goes to
//      its place in the app; the company's side has no debts question; the terms open in a panel;
//   3. from the app, on a phone: More opens it; "Back to Dorax" returns to the screen it was opened from.
//   (Its address, /ajuda, a topic as a step of it, and the browser's Back: qc-pages.js.)
const { open, ok, eq, done } = require('./pw.js');
(async () => {
  // ---------- 1. before login ----------
  let { browser, page, errors } = await open({ lang: 'es', viewport: { width: 1280, height: 900 } });
  await page.waitForTimeout(300);
  eq(await page.evaluate(() => { const a = document.querySelector('.l2-foot a[data-v="help"]'); return a && [a.textContent.trim(), a.closest('div').querySelector('h3').textContent.trim()]; }), ['Centro de ayuda', 'Ayuda'], 'the home page’s footer: “Centro de ayuda”, under Ayuda');
  await page.click('.l2-foot a[data-v="help"]'); await page.waitForSelector('.hc-pub');
  eq(await page.evaluate(() => [UI.pub.screen, document.querySelector('#hc-title').textContent, document.activeElement.id, !!document.querySelector('.hc-pub.lp2 .l2-top .l2-nav') && !!document.querySelector('.hc-pub .l2-foot'), document.querySelectorAll('.hc-hint').length, document.querySelectorAll('.hc-bx').length, document.querySelectorAll('.hc-q').length, document.querySelectorAll('[data-a="help-go"]').length]),
    ['help', '¿Una duda? Aquí, la respuesta.', 'hc-title', true, 4, 10, 5, 0], 'its page, the website’s (bar and footer): the question in focus, four words looked for, ten topics, five questions asked most, no “Show me” before login');
  eq(await page.evaluate(() => [getComputedStyle(document.body).backgroundColor, getComputedStyle(document.querySelector('#hc-title')).textAlign, getComputedStyle(document.querySelector('#hc-title .hl')).color, document.querySelector('.l2-links [aria-current]').textContent, !!document.querySelector('.l2-white .hc-bento'), document.querySelector('.hc-bx.dark').dataset.v, !!document.querySelector('.l2-faq-grid .l2-faq-l') && !!document.querySelector('.hc-write.l2-pj')]),
    ['rgb(242, 244, 238)', 'center', 'rgb(22, 51, 0)', 'Ayuda', true, 'company', true], 'the home page’s look: its sage page, the title centred with its second line in forest, Help marked in the bar, the topics as its bento on a white band (the company’s dark), its two-column questions, its forest band');
  ok(await page.evaluate(() => !!document.querySelector('.hc-write a[data-v="contact"]') && !!document.querySelector('.hc-pub .l2-end a[data-v="signup"]') && !!document.querySelector('.hc-nav a[data-v="login"]')), 'the way to write to Dorax, and the way in (create account, log in)');
  eq(await page.evaluate(() => [document.querySelector('.hc-bx[data-v="plan"] .hc-bx-go').textContent.trim(), getComputedStyle(document.querySelector('.hc-bento')).gridTemplateColumns.split(' ').length, [...document.querySelectorAll('.hc-bx.wide')].map(b => b.dataset.v)]), ['4 preguntas', 3, ['start', 'company']], 'the topics in three columns, two of them wide (ten fill four rows); a card says how many questions it has');
  await page.click('.hc-q summary'); await page.waitForTimeout(500); eq(await page.evaluate(() => document.querySelector('.hc-q').open), true, 'a question opens its answer in place');
  await page.click('.hc-bx[data-v="safe"]'); await page.waitForTimeout(300);
  eq(await page.evaluate(() => [UI.hcTopic, document.querySelector('#hc-title').textContent, document.activeElement.id, window.scrollY, document.querySelectorAll('.hc-topic-qs .hc-q').length, document.querySelectorAll('.hc-others button').length, !document.querySelector('.hc-others [data-v="safe"]')]),
    ['safe', 'Seguridad y privacidad.', 'hc-title', 0, 4, 9, true], 'a topic: its own page from the top, its name in focus, its questions, the other nine topics beside them');
  await page.click('.hc-others [data-v="goals"]'); await page.waitForTimeout(250);
  eq(await page.evaluate(() => [UI.hcTopic, document.querySelector('#hc-title').textContent]), ['goals', 'Metas y ahorro.'], 'another topic from beside them');
  await page.click('.hc-back'); await page.waitForTimeout(250);
  eq(await page.evaluate(() => [UI.hcTopic, document.querySelectorAll('.hc-bx').length]), ['', 10], '“Centro de ayuda” at the top: the topics again');
  await page.click('.hc-hint[data-v="PIN"]'); await page.waitForTimeout(150);
  eq(await page.evaluate(() => [document.querySelector('#hc-q').value, document.activeElement.id, document.querySelector('.hc-hint[data-v="PIN"]').getAttribute('aria-pressed'), document.querySelector('#hc-res-h').textContent, [...document.querySelectorAll('.hc-q')].every(d => d.open && /PIN/.test(d.textContent))]),
    ['PIN', 'hc-q', 'true', '2 respuestas para «PIN»', true], 'a word under the search: typed in, marked, and what it finds, open');
  await page.fill('#hc-q', ''); await page.click('#hc-q'); await page.keyboard.type('límite');
  eq(await page.evaluate(() => [document.activeElement.id, document.querySelectorAll('.hc-q').length > 0, [...document.querySelectorAll('.hc-q')].every(d => /l[íi]mite/i.test(d.textContent)), !!document.querySelector('.hc-qt small'), document.querySelector('.hc-hint[data-v="PIN"]').getAttribute('aria-pressed')]),
    ['hc-q', true, true, true, 'false'], 'typing “límite”: only the answers that speak of it, with their topic’s name, and the field keeps the focus');
  await page.fill('#hc-q', 'xyzzy'); await page.dispatchEvent('#hc-q', 'input');
  ok(await page.evaluate(() => /No encontramos nada para «xyzzy»/.test(document.querySelector('#hc-body').textContent) && !!document.querySelector('.hc-none')), 'nothing found: it says so, and how to ask');
  await page.click('.hc-clear'); await page.waitForTimeout(100);
  eq(await page.evaluate(() => [document.querySelector('#hc-q').value, document.activeElement.id, document.querySelector('.hc-clear').hidden, document.querySelectorAll('.hc-bx').length]), ['', 'hc-q', true, 10], 'the × in the search: emptied, the topics again, the field keeps the focus');
  await page.evaluate(() => document.querySelector('.l2-foot [data-a="pub-scroll"][data-id="lp-faq"]').click()); await page.waitForTimeout(900);
  eq(await page.evaluate(() => [UI.pub.screen, Math.abs(document.querySelector('#lp-faq').getBoundingClientRect().top) < 40]), ['landing', true], 'the footer’s “Preguntas”: the home page, at its questions');
  eq(errors, [], 'before login: no error'); await browser.close();

  ({ browser, page, errors } = await open({ lang: 'pt', viewport: { width: 390, height: 844 }, touch: true, mobile: true }));
  await page.evaluate(() => A['pub-go']({ v: 'help' })); await page.waitForSelector('.hc-pub');
  eq(await page.evaluate(() => { const nav = document.querySelector('.hc-nav'), b = nav.querySelector('.brand').getBoundingClientRect(), go = nav.querySelector('.l2-btn').getBoundingClientRect(); return [document.querySelector('#hc-title').textContent, document.documentElement.scrollWidth <= innerWidth, Math.abs((b.top + b.bottom) / 2 - (go.top + go.bottom) / 2) < 8, [...document.querySelectorAll('.hc-bx, .hc-hint, .hc-q summary')].every(e => e.getBoundingClientRect().height >= 44), getComputedStyle(document.querySelector('.hc-bento')).gridTemplateColumns.split(' ').length]; }),
    ['Uma dúvida? Aqui, a resposta.', true, true, true, 1], 'a phone, in Portuguese: nothing wider than the screen, the bar on one row, every row a thumb high, the topics one under the other');
  await page.tap('.hc-hint[data-v="iPhone"]'); await page.waitForTimeout(150);
  ok(await page.evaluate(() => document.activeElement.id !== 'hc-q' && document.querySelectorAll('.hc-q').length >= 1), 'a word under the search on a phone: what it finds, without the keyboard covering it');
  await page.evaluate(() => { document.querySelector('#hc-q').value = ''; UI.helpQ = ''; A['hc-topic']({ v: 'notify' }); });
  ok(await page.evaluate(() => { const h = document.querySelector('.hc-th').getBoundingClientRect(), m = document.querySelector('.hc-topic-qs').getBoundingClientRect(), s = document.querySelector('.hc-to').getBoundingClientRect(); return h.bottom <= m.top && s.top > m.bottom && document.documentElement.scrollWidth <= innerWidth; }), 'a topic on a phone: its title, its questions, then the other topics');
  eq(errors, [], 'phone, before login: no error'); await browser.close();

  // ---------- 2. from the app, on a computer ----------
  ({ browser, page, errors } = await open({ lang: 'es', account: 'example', plan: true, viewport: { width: 1440, height: 900 } }));
  await page.evaluate(() => { S.user.greeted = true; navigate('plan'); UI.menu = true; render(); }); await page.waitForTimeout(200);
  await page.click('#user-menu [data-a="help"]'); await page.waitForSelector('#public .hc-pub');
  eq(await page.evaluate(() => [UI.webHelp, UI.route, document.querySelector('.app').hidden, document.querySelector('#public').hidden, document.documentElement.classList.contains('in-app'), document.querySelector('[data-a="help-close"]').textContent.trim(), !document.querySelector('.hc-nav a[data-v="login"]') && !document.querySelector('.hc-pub .l2-end'), document.querySelectorAll('.hc-a [data-a="help-go"]').length]),
    [true, 'plan', true, false, false, 'Volver a Dorax', true, 4], 'the menu beside the name opens the website’s page over the app, with “Volver a Dorax”; no way in (already in); the questions asked most have their “Llévame ahí”');
  await page.evaluate(() => [...document.querySelectorAll('.l2-foot [data-a="legal"]')].find(b => b.dataset.v === 'terms').click()); await page.waitForTimeout(250);
  eq(await page.evaluate(() => [UI.drawer && UI.drawer.kind, UI.webHelp]), ['legal', true], 'logged in, the footer’s terms open in a panel over the page');
  await page.evaluate(() => A.close()); await page.waitForTimeout(150);
  await page.click('[data-a="help-close"]'); await page.waitForTimeout(300);
  eq(await page.evaluate(() => [UI.webHelp, UI.route, document.querySelector('.app').hidden, !!document.querySelector('#view .dk-hero'), document.documentElement.classList.contains('in-app')]), [false, 'plan', false, true, true], '“Volver a Dorax”: the app again, on the screen it was opened from');
  await page.evaluate(() => { A.help(); A['hc-topic']({ v: 'safe' }); }); await page.waitForSelector('#public .hc-pub .hc-topic-qs');
  await page.evaluate(() => { const d = [...document.querySelectorAll('.hc-q')].find(x => /bloqueo la app/.test(x.textContent)); d.open = true; d.querySelector('[data-a="help-go"]').click(); }); await page.waitForTimeout(300);
  eq(await page.evaluate(() => [UI.webHelp, UI.route, UI.setSec, !!document.querySelector('#guard-card')]), [false, 'settings', 'security', true], '“¿Cómo bloqueo la app?”: “Llévame ahí” opens Settings › Security, in the app');
  await page.evaluate(() => A.help()); await page.waitForSelector('#public .hc-pub');
  eq(await page.evaluate(() => [UI.hcTopic, document.querySelectorAll('.hc-bx').length]), ['', 10], 'opened again from the app: the topics');
  await page.evaluate(() => A['hc-topic']({ v: 'goals' }));
  ok(await page.evaluate(() => /¿Cómo salgo de las deudas\?/.test(document.querySelector('#hc-body').textContent)), 'the household’s side: the question on debts');
  await page.evaluate(() => { helpWebClose(); A.space({ v: 'business' }); A.help(); A['hc-topic']({ v: 'goals' }); }); await page.waitForSelector('#public .hc-pub .hc-topic-qs');
  ok(await page.evaluate(() => !/¿Cómo salgo de las deudas\?/.test(document.querySelector('#hc-body').textContent)), 'the company’s side: no question on debts');
  await page.evaluate(() => A['hc-topic']({ v: 'company' }));
  ok(await page.evaluate(() => /El botón de las dos flechas cambia de lado/.test(document.querySelector('#hc-body').textContent)), 'keeping the company apart says how to switch');
  eq(errors, [], 'computer: no error'); await browser.close();

  // ---------- 3. from the app, on a phone ----------
  ({ browser, page, errors } = await open({ lang: 'es', account: 'example', plan: true, viewport: { width: 390, height: 844 }, touch: true, mobile: true }));
  await page.evaluate(() => { S.user.greeted = true; S.settings.themePhone = 'dark'; navigate('goals'); render(); }); await page.waitForTimeout(250);
  await page.evaluate(() => A.sheet()); await page.waitForSelector('.sheet [data-a="help"]'); await page.click('.sheet [data-a="help"]'); await page.waitForSelector('#public .hc-pub');
  eq(await page.evaluate(() => [UI.webHelp, !UI.sheet, document.querySelector('#tabbar').hidden, document.documentElement.scrollWidth <= innerWidth, [...document.querySelectorAll('.hc-bx, .hc-q summary, [data-a="help-close"]')].every(e => e.getBoundingClientRect().height >= 40)]), [true, true, true, true, true], 'a phone: More opens the website’s page over the app (no bar at the foot), nothing wider than the screen, a thumb high');
  await page.click('[data-a="help-close"]'); await page.waitForTimeout(350);
  eq(await page.evaluate(() => [UI.webHelp, UI.route, document.querySelector('#tabbar').hidden]), [false, 'goals', false], '“Volver a Dorax”: back on Goals');
  eq(errors, [], 'phone: no error'); await browser.close();
  done('qc-help-center');
})();
