// QC of the website's pages before launch (v211; owner, 2026-10-13: "crea las páginas necesarias para antes del lanzamiento"; v212: the page about
// Dorax rewritten with its mission and story, the page of how it works, "Sobre nosotros" in the bar in place of "Qué trae", the drawings;
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
  eq(await page.evaluate(() => [...document.querySelectorAll('.l2-foot a[data-a="pub-go"]')].map(a => a.dataset.v).filter(v => ['how', 'pj', 'converter', 'about'].includes(v))), ['how', 'pj', 'converter', 'about'], 'the home page’s footer: How it works, For PJ and MEI, the statement converter (Product), About us (Help)');
  const want = {
    how: ['Cómo funciona · Dorax Finance', 'Tu mes en orden. En cinco pasos.', 'Cómo funciona', 5],
    pj: ['Para PJ y MEI · Dorax Finance', 'La empresa te paga. La casa tiene su plan.', 'Para PJ', 5],
    converter: ['Conversor de extractos · Dorax Finance', 'Del extracto de tu banco al OFX de tu contador.', null, 5],
    about: ['Sobre nosotros · Dorax Finance', 'Nació de una planilla. Hecho para tu mes.', 'Sobre nosotros', 0],      // v221: its own heading, not the home page's
  };
  for (const v of ['how', 'pj', 'converter', 'about']) {
    await page.evaluate(() => scrollTo(0, document.body.scrollHeight)); await page.click(`.l2-foot a[data-v="${v}"]`); await page.waitForSelector('.st-page');
    eq(await page.evaluate(() => [UI.pub.screen, document.title, document.querySelector('#st-title').textContent, document.activeElement.id, window.scrollY, (document.querySelector('.l2-links [aria-current]') || {}).textContent || null, !!document.querySelector('.st-page .l2-top .l2-nav') && !!document.querySelector('.st-page .l2-foot') && !!document.querySelector('.st-page .l2-end a[data-v="signup"]'), getComputedStyle(document.querySelector('#st-title')).textAlign, document.querySelectorAll('.l2-faq details').length, document.querySelectorAll('h1').length]),
      [v, want[v][0], want[v][1], 'st-title', 0, want[v][2], true, 'center', want[v][3], 1], `${v}: its title in the tab, the centred title in focus from the top, the bar, the way in, the footer, its questions, one h1`);
  }
  // ---------- 2. what they say ----------
  await page.evaluate(() => A['pub-go']({ v: 'converter' }));
  eq(await page.evaluate(() => { const txt = document.querySelector('.st-page').innerText; return [/wise/i.test(txt), /en el ordenador/.test(txt), /no se sube/.test(txt), document.querySelectorAll('.l2-steps-r li').length, document.querySelectorAll('.l2-trustsec .l2-tc').length]; }),
    [false, true, true, 3, 3], 'the converter: never named after one bank or platform, on a computer, the file not uploaded; three steps, three reasons to trust it');
  await page.evaluate(() => A['pub-go']({ v: 'pj' }));
  eq(await page.evaluate(() => [document.querySelectorAll('.l2-pj .l2-hc').length, document.querySelectorAll('.l2-pj .l2-hc-side .obj').length >= 6, !document.querySelector('.l2-sides, .l2-pj-list'), document.querySelectorAll('.st-card').length, document.querySelectorAll('.l2-steps-r li').length, !!document.querySelector('.st-more a[data-v="converter"]')]), [1, true, true, 4, 4, true], 'PJ and MEI: the home page’s two sides with Dorax’s things (v219, owner: "en la página PJ aún se ve este bloque con iconos viejos"), not the old block; what the company gets, four steps, the way to the converter');
  await page.click('.st-hero [data-a="pub-scroll"]'); await page.waitForTimeout(900);
  ok(await page.evaluate(() => Math.abs(document.querySelector('#pj-how').getBoundingClientRect().top) < 40), '“How it works” at the top: down to the steps');
  await page.click('.l2-links [aria-current]'); await page.waitForTimeout(900);
  eq(await page.evaluate(() => [window.scrollY < 5, document.activeElement.id]), [true, 'st-title'], 'the page’s own name in the bar: back to its top');
  await page.evaluate(() => A['pub-go']({ v: 'about' }));
  eq(await page.evaluate(() => [document.querySelectorAll('.st-row .fig').length, document.querySelectorAll('#ab-mission .st-qcard .obj').length, document.querySelectorAll('.st-story li').length, document.querySelectorAll('.st-story li .fig img').length, document.querySelectorAll('.st-story .fig-bdg').length, document.querySelector('.st-story li:last-child .st-num').textContent,
      document.querySelectorAll('.l2-trustsec .st-qcard').length, document.querySelectorAll('.st-list li').length, !!document.querySelector('.st-data .obj'), [...document.querySelectorAll('.st-links a')].map(a => a.dataset.v), !!document.querySelector('.st-talk .fig')]),
    [5, 3, 4, 4, 4, '2026', 3, 4, true, ['contact', 'help', 'blog'], true], 'about (owner: "no dice nada de misión, nada de historia"): the people it is for, the mission’s three questions, the story in four moments up to 2026, what guides it, your data with its key, who answers');
  ok(await page.evaluate(() => /Nuestra misión/.test(document.querySelector('#ab-mission').innerText) && /Empezó en una planilla/.test(document.querySelector('#ab-story').innerText) && !/Albert/.test(document.querySelector('.st-page').innerText)), 'about: its mission and its story, told without the maker’s name (the website is never about him)');
  await page.click('.st-hero [data-a="pub-scroll"]'); await page.waitForTimeout(900);
  ok(await page.evaluate(() => Math.abs(document.querySelector('#ab-story').getBoundingClientRect().top) < 40), '“Our story” at the top: down to the story');
  await page.evaluate(() => A['pub-go']({ v: 'how' }));
  eq(await page.evaluate(() => [[...document.querySelectorAll('.st-step')].map(s => [s.querySelector('.st-no').textContent, !!s.querySelector('.fig img'), !!s.querySelector('.fig-bdg .obj')]), document.querySelectorAll('.st-step:nth-child(even) .st-step-pic').length, [...document.querySelectorAll('.st-qcards.white .st-qcard h3')].map(h => h.textContent), !!document.querySelector('.l2-pj .st-pair') && document.querySelector('.l2-pj .st-more a').dataset.v, document.querySelectorAll('.l2-faq details').length]),
    [[1, 2, 3, 4, 5].map(n => ['Paso ' + n, true, true]), 2, ['Escríbelo', 'Tu hoja de cálculo', 'Un extracto del banco'], 'pj', 5], 'how it works: five steps, each with its person and its thing; the three ways to bring your data; the company’s side and its page; the questions');
  ok(await page.evaluate(() => [...document.querySelectorAll('.st-page .obj, .st-page .fig')].every(e => e.getAttribute('aria-hidden') === 'true' || e.closest('[aria-hidden="true"]')) && [...document.querySelectorAll('.st-page .fig img')].every(i => i.getAttribute('alt') === '')), 'the drawings are pictures for the eyes only: hidden from screen readers, the words beside them say the same');
  await page.evaluate(() => A['pub-go']({ v: 'landing' }));
  eq(await page.evaluate(() => { const a = document.querySelector('#lp-pj .l2-pj-go a[data-v="pj"]'); return a && a.textContent.trim(); }), 'Ver el lado de la empresa', 'the home page’s PJ section leads to the PJ page');
  await page.evaluate(() => A['pub-go']({ v: 'blog' })); await page.click('.l2-links a[data-v="pj"]'); await page.waitForSelector('.st-page');
  eq(await page.evaluate(() => UI.pub.screen), 'pj', 'the bar of the blog (and of help) leads to the PJ page');
  eq(errors, [], 'no error'); await browser.close();

  // ---------- the home page's bar: the website's (owner, 2026-10-13: "el menú principal es el viejo, no me lleva a ningún lugar") ----------
  ({ browser, page, errors } = await open({ lang: 'es', viewport: { width: 1440, height: 900 } }));
  await page.waitForTimeout(300);
  eq(await page.evaluate(() => [[...document.querySelectorAll('.l2-top .l2-links > *')].map(x => [x.textContent.trim(), x.tagName]), getComputedStyle(document.querySelector('.web-menu-btn')).display]),
    [[['Cómo funciona', 'A'], ['Sobre nosotros', 'A'], ['Para PJ', 'A'], ['Blog', 'A'], ['Ayuda', 'A']], 'none'], 'the home page: the website’s bar, its pages (Cómo funciona, Sobre nosotros in place of Qué trae, Para PJ, Blog, Ayuda); no menu button on a computer');
  eq(await page.evaluate(() => [...document.querySelectorAll('.lp2 .fig')].map(f => [(f.closest('.l2-hero, main > section[id]') || { id: 'end' }).id || 'top', f.querySelector('img').getAttribute('src').split('/').slice(3).join('/'), (f.querySelector('.fig-bdg') ? 1 : 0)])),
    [['top', 'shadow/coffee.svg', 0], ['top', 'shadow/phone.svg', 0], ['top', 'shadow/laptop.svg', 0], ['top', 'shadow/win.svg', 0], ['top', 'shadow/idea.svg', 0],
     ['lp-who', 'shadow/paper.svg', 1], ['lp-who', 'shadow/idea.svg', 1], ['lp-who', 'shadow/laptop.svg', 1], ['lp-how', 'coffee.svg', 1], ['lp-how', 'phone.svg', 1], ['lp-how', 'win.svg', 1],
     ['lp-pj', 'laptop.svg', 1], ['lp-calc', 'win.svg', 1], ['lp-blog', 'idea.svg', 1], ['lp-faq', 'explain.svg', 1], ['end', 'hi.svg', 1]],
    'the home page drawn around its people (v213, the canvas the owner approved): five with a lime shadow at the top ("reduce … a 5", "cambia el estilo a sombra lima"), three with a lime shadow in who it is for, one in each step, the one with the company, the one who got there, the one who reads, the one who answers, the one who waves (v219: the one who holds the key is off the home page, owner: "quita esto del home page")');
  await page.click('.l2-top .l2-links a[data-v="about"]'); await page.waitForSelector('.st-page');
  eq(await page.evaluate(() => [UI.pub.screen, (document.querySelector('.l2-links [aria-current]') || {}).textContent]), ['about', 'Sobre nosotros'], '“Sobre nosotros”: the page about Dorax, marked in the bar');
  await page.click('.l2-top .l2-links a[data-v="how"]'); await page.waitForSelector('.st-steps');
  eq(await page.evaluate(() => UI.pub.screen), 'how', '“Cómo funciona”: its page');
  await page.evaluate(() => scrollTo(0, 0)); await page.click('.l2-top .l2-links a[data-v="help"]'); await page.waitForSelector('.hc-pub');
  eq(await page.evaluate(() => UI.pub.screen), 'help', '“Ayuda”: the Help center');
  eq(errors, [], 'the bar: no error'); await browser.close();
  ({ browser, page, errors } = await open({ lang: 'es', viewport: { width: 390, height: 844 }, touch: true, mobile: true }));
  await page.waitForTimeout(300);
  eq(await page.evaluate(() => { const b = document.querySelector('.web-menu-btn').getBoundingClientRect(); return [getComputedStyle(document.querySelector('.l2-top .l2-links')).display, getComputedStyle(document.querySelector('.l2-top .l2-in')).display, b.width >= 44 && b.height >= 44, b.right <= innerWidth, document.querySelector('#web-menu').hidden]; }),
    ['none', 'none', true, true, true], 'a phone: the menu button (a thumb high, inside the screen) instead of the capsule and the login');
  await page.tap('.web-menu-btn'); await page.waitForTimeout(150);
  eq(await page.evaluate(() => [document.querySelector('#web-menu').hidden, document.querySelector('.web-menu-btn').getAttribute('aria-expanded'), [...document.querySelectorAll('#web-menu .l2-link')].map(x => x.textContent.trim()), [...document.querySelectorAll('#web-menu .l2-link, #web-menu .l2-btn')].every(x => x.getBoundingClientRect().height >= 44), !!document.querySelector('#web-menu a[data-v="login"]') && !!document.querySelector('#web-menu-lang'), document.documentElement.scrollWidth <= innerWidth]),
    [false, 'true', ['Cómo funciona', 'Sobre nosotros', 'Para PJ', 'Blog', 'Ayuda', 'Preguntas'], true, true, true], 'its menu: the pages and the questions, the login and the language, every row a thumb high');
  await page.tap('#web-menu [data-id="lp-faq"]'); await page.waitForTimeout(900);
  eq(await page.evaluate(() => [document.querySelector('#web-menu').hidden, Math.abs(document.querySelector('#lp-faq').getBoundingClientRect().top) < 80]), [true, true], '“Preguntas” in the menu: down to the questions, the menu closed');
  await page.evaluate(() => scrollTo(0, 0)); await page.tap('.web-menu-btn'); await page.keyboard.press('Escape');
  eq(await page.evaluate(() => [document.querySelector('#web-menu').hidden, document.activeElement.classList.contains('web-menu-btn')]), [true, true], 'Escape closes it, the focus back on its button');
  await page.tap('.web-menu-btn'); await page.tap('#web-menu a[data-v="blog"]'); await page.waitForSelector('.bl-page');
  eq(await page.evaluate(() => [UI.pub.screen, !!document.querySelector('.bl-page .web-menu-btn')]), ['blog', true], '“Blog” in the menu: the blog, with the same bar');
  eq(errors, [], 'the phone’s menu: no error'); await browser.close();

  // ---------- 3. a phone, in Portuguese ----------
  ({ browser, page, errors } = await open({ lang: 'pt', viewport: { width: 390, height: 844 }, touch: true, mobile: true }));
  for (const v of ['how', 'pj', 'converter', 'about']) {
    await page.evaluate(v => A['pub-go']({ v }), v); await page.waitForSelector('.st-page');
    eq(await page.evaluate(() => { const cards = [...document.querySelectorAll('.st-card, .st-cards .l2-tc, .st-qcard, .st-step, .st-story li')].map(c => c.getBoundingClientRect()); return [document.documentElement.scrollWidth <= innerWidth, [...document.querySelectorAll('.st-page main .l2-btn, .l2-faq summary')].every(e => e.getBoundingClientRect().height >= 44), cards.every((r, i) => i === 0 || r.top >= cards[i - 1].bottom - 1 || r.left === cards[i - 1].left)]; }),
      [true, true, true], `${v}, a phone, in Portuguese: nothing wider than the screen, every button a thumb high, the cards one under the other`);
  }
  eq(await page.evaluate(() => [document.querySelector('#st-title').textContent, (document.querySelector('.l2-links [aria-current]') || document.querySelector('#web-menu [data-v="about"]')).textContent]), ['Nasceu de uma planilha. Feito para o seu mês.', 'Sobre nós'], 'in Portuguese');
  eq(errors, [], 'phone: no error'); await browser.close();
  done('qc-site-pages');
})();
