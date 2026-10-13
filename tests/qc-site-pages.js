// QC of the website's pages before launch (v211; owner, 2026-10-13: "crea las páginas necesarias para antes del lanzamiento";
// features/site/site-pages.view.js, css/screens/site-pages.css; the 404 page: app/404.html, qc-pages.js).
//   1. each page (for PJ and MEI, the statement converter, about Dorax): reached from the home page's footer, made of the home page's parts (the
//      bar with the page marked, the centred title in focus, the way in, the footer), its own title in the tab, its sections and its questions;
//   2. what they say: the converter is never named after one bank or accounting platform (no "Wise"), says it is on a computer and that the file
//      is not uploaded; the PJ page leads to the converter; the home page's PJ section leads to the PJ page; the bar of the help and blog pages
//      too;
//   3. a phone, in Portuguese: nothing wider than the screen, every button a thumb high, the cards one under the other.
//   (Their addresses: qc-pages.js.)
const { open, ok, eq, done } = require('./pw.js');
(async () => {
  let { browser, page, errors } = await open({ lang: 'es', viewport: { width: 1440, height: 900 } });
  await page.waitForTimeout(300);
  // ---------- 1. the pages ----------
  eq(await page.evaluate(() => [...document.querySelectorAll('.l2-foot a[data-a="pub-go"]')].map(a => a.dataset.v).filter(v => ['pj', 'converter', 'about'].includes(v))), ['pj', 'converter', 'about'], 'the home page’s footer: For PJ and MEI, the statement converter (Product), About Dorax (Help)');
  const want = {
    pj: ['Para PJ y MEI · Dorax Finance', 'La empresa te paga. La casa tiene su plan.', 'Para PJ', 5],
    converter: ['Conversor de extractos · Dorax Finance', 'Del extracto de tu banco al OFX de tu contador.', null, 5],
    about: ['Sobre Dorax · Dorax Finance', 'Tu dinero, ordenado. Tus decisiones, tuyas.', null, 0],
  };
  for (const v of ['pj', 'converter', 'about']) {
    await page.evaluate(() => scrollTo(0, document.body.scrollHeight)); await page.click(`.l2-foot a[data-v="${v}"]`); await page.waitForSelector('.st-page');
    eq(await page.evaluate(() => [UI.pub.screen, document.title, document.querySelector('#st-title').textContent, document.activeElement.id, window.scrollY, (document.querySelector('.l2-links [aria-current]') || {}).textContent || null, !!document.querySelector('.st-page .l2-top .l2-nav') && !!document.querySelector('.st-page .l2-foot') && !!document.querySelector('.st-page .l2-end a[data-v="signup"]'), getComputedStyle(document.querySelector('#st-title')).textAlign, document.querySelectorAll('.l2-faq details').length, document.querySelectorAll('h1').length]),
      [v, want[v][0], want[v][1], 'st-title', 0, want[v][2], true, 'center', want[v][3], 1], `${v}: its title in the tab, the centred title in focus from the top, the bar, the way in, the footer, its questions, one h1`);
  }
  // ---------- 2. what they say ----------
  await page.evaluate(() => A['pub-go']({ v: 'converter' }));
  eq(await page.evaluate(() => { const txt = document.querySelector('.st-page').innerText; return [/wise/i.test(txt), /en el ordenador/.test(txt), /no se sube/.test(txt), document.querySelectorAll('.l2-steps-r li').length, document.querySelectorAll('.l2-trustsec .l2-tc').length]; }),
    [false, true, true, 3, 3], 'the converter: never named after one bank or platform, on a computer, the file not uploaded; three steps, three reasons to trust it');
  await page.evaluate(() => A['pub-go']({ v: 'pj' }));
  eq(await page.evaluate(() => [document.querySelectorAll('.l2-pj .l2-sides').length, document.querySelectorAll('.st-card').length, document.querySelectorAll('.l2-steps-r li').length, !!document.querySelector('.st-more a[data-v="converter"]')]), [1, 4, 4, true], 'PJ and MEI: the two sides, what the company gets, four steps, the way to the converter');
  await page.click('.st-hero [data-a="pub-scroll"]'); await page.waitForTimeout(900);
  ok(await page.evaluate(() => Math.abs(document.querySelector('#pj-how').getBoundingClientRect().top) < 40), '“How it works” at the top: down to the steps');
  await page.click('.l2-links [aria-current]'); await page.waitForTimeout(900);
  eq(await page.evaluate(() => [window.scrollY < 5, document.activeElement.id]), [true, 'st-title'], 'the page’s own name in the bar: back to its top');
  await page.evaluate(() => A['pub-go']({ v: 'about' }));
  eq(await page.evaluate(() => [document.querySelectorAll('.l2-white .st-card').length, document.querySelectorAll('.l2-trustsec .l2-tc').length, document.querySelectorAll('.st-list li').length, [...document.querySelectorAll('.st-links a')].map(a => a.dataset.v)]), [4, 4, 3, ['contact', 'help', 'blog']], 'about: what it does, what it does not, your data, how to write');
  await page.evaluate(() => A['pub-go']({ v: 'landing' }));
  eq(await page.evaluate(() => { const a = document.querySelector('#lp-pj .l2-pj-go a[data-v="pj"]'); return a && a.textContent.trim(); }), 'Ver el lado de la empresa', 'the home page’s PJ section leads to the PJ page');
  await page.evaluate(() => A['pub-go']({ v: 'blog' })); await page.click('.l2-links a[data-v="pj"]'); await page.waitForSelector('.st-page');
  eq(await page.evaluate(() => UI.pub.screen), 'pj', 'the bar of the blog (and of help) leads to the PJ page');
  eq(errors, [], 'no error'); await browser.close();

  // ---------- 3. a phone, in Portuguese ----------
  ({ browser, page, errors } = await open({ lang: 'pt', viewport: { width: 390, height: 844 }, touch: true, mobile: true }));
  for (const v of ['pj', 'converter', 'about']) {
    await page.evaluate(v => A['pub-go']({ v }), v); await page.waitForSelector('.st-page');
    eq(await page.evaluate(() => { const cards = [...document.querySelectorAll('.st-card, .st-cards .l2-tc')].map(c => c.getBoundingClientRect()); return [document.documentElement.scrollWidth <= innerWidth, [...document.querySelectorAll('.st-page main .l2-btn, .l2-faq summary')].every(e => e.getBoundingClientRect().height >= 44), cards.every((r, i) => i === 0 || r.top >= cards[i - 1].bottom - 1 || r.left === cards[i - 1].left)]; }),
      [true, true, true], `${v}, a phone, in Portuguese: nothing wider than the screen, every button a thumb high, the cards one under the other`);
  }
  eq(await page.evaluate(() => document.querySelector('#st-title').textContent), 'Seu dinheiro, organizado. Suas decisões, suas.', 'in Portuguese');
  eq(errors, [], 'phone: no error'); await browser.close();
  done('qc-site-pages');
})();
