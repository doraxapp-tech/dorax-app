// QC of the blog (v210; owner, 2026-10-13: "me gusta el blog, publica todo… los blogs TIENEN que ser escritos de la forma más simple posible, como
// para un niño pequeño"; features/blog/, css/screens/blog.css).
//   1. the posts: every one in the three languages, complete, its address safe, its sources real links; written simply (short sentences);
//   2. before login: the home page's footer links to it; the page is made of the home page's parts (its bar with Blog marked, the centred title,
//      its footer); the featured post and the others as cards (a last card alone in its row takes the room left); the categories filter, the
//      pressed one keeping the focus; a post: its title (also the tab's), when and by whom, its figure, its text, where Dorax helps (with the way
//      in), its sources, three more; back to the list; a phone: nothing wider than the screen, the categories in one row, thumb-high;
//   3. from the app: the website's footer there opens the blog over the app, with "Back to Dorax", without the way in; a post; back to the app.
//   (Its addresses, /blog and /blog/<post>, and the browser's Back: qc-pages.js.)
const { open, ok, eq, done } = require('./pw.js');
(async () => {
  // ---------- 1. the posts ----------
  let { browser, page, errors } = await open({ lang: 'es', viewport: { width: 1280, height: 900 } });
  await page.waitForTimeout(300);
  const report = await page.evaluate(() => {
    const bad = [], words = [];
    for (const p of BLOG_POSTS) {
      if (!/^[a-z0-9-]+$/.test(p.id) || !BLOG_CATS.includes(p.cat) || !/^\d{4}-\d{2}-\d{2}$/.test(p.date) || !(p.mins > 0)) bad.push(p.id + ': id, category, date or minutes');
      if (!p.sources.every(([n, u]) => n && /^https:\/\//.test(u))) bad.push(p.id + ': a source');
      for (const l of ['es', 'pt', 'en']) {
        const x = p[l]; if (!x || !x.title || !x.excerpt || !x.fig || !x.figSay || !x.body || !x.body.length) { bad.push(p.id + ' ' + l + ': missing'); continue; }
        if (x.body.length !== p.es.body.length || x.body.some((b, i) => b[0] !== p.es.body[i][0])) bad.push(p.id + ' ' + l + ': not the same parts as in Spanish');
        x.body.flatMap(b => b[0] === 'ul' ? b[1] : b[0] === 'note' ? [b[2]] : [b[1]]).forEach(tx => tx.split(/(?<=[.?!:])\s+/).forEach(s => words.push(s.split(/\s+/).filter(Boolean).length)));
      }
    }
    return [BLOG_POSTS.length, BLOG_POSTS.filter(p => p.featured).length, new Set(BLOG_POSTS.map(p => p.id)).size, bad, Math.round(words.reduce((a, b) => a + b, 0) / words.length * 10) / 10, Math.max(...words)];
  });
  eq(report.slice(0, 4), [6, 1, 6, []], 'six posts, one featured, each in Spanish, Portuguese and English with the same parts, its address safe, its sources real links');
  ok(report[4] <= 12 && report[5] <= 25, 'written simply: short sentences (on average ' + report[4] + ' words, the longest ' + report[5] + ')');

  // ---------- 2. before login ----------
  eq(await page.evaluate(() => { const a = document.querySelector('.l2-foot a[data-v="blog"]'); return a && [a.textContent.trim(), a.closest('div').querySelector('h3').textContent.trim()]; }), ['Blog', 'Ayuda'], 'the home page’s footer: “Blog”, under Ayuda');
  await page.click('.l2-foot a[data-v="blog"]'); await page.waitForSelector('.bl-page');
  eq(await page.evaluate(() => [UI.pub.screen, document.title, document.activeElement.id, document.querySelector('#bl-title').textContent, document.querySelector('.l2-links [aria-current]').textContent, !!document.querySelector('.bl-page.lp2 .l2-top .l2-nav') && !!document.querySelector('.bl-page .l2-foot'), getComputedStyle(document.querySelector('#bl-title')).textAlign, getComputedStyle(document.body).backgroundColor]),
    ['blog', 'Blog · Dorax Finance', 'bl-title', 'Tu dinero, explicado claro.', 'Blog', true, 'center', 'rgb(242, 244, 238)'], 'the blog: the home page’s look (its bar with Blog marked, the centred title in focus, its footer), its title in the tab');
  eq(await page.evaluate(() => [document.querySelector('.bl-feat').dataset.v, document.querySelectorAll('.bl-grid .bl-card').length, document.querySelectorAll('.bl-seg button').length, [...document.querySelectorAll('.bl-card')].map(c => c.classList[1]), getComputedStyle(document.querySelector('.bl-grid .bl-card:last-child')).gridColumnStart, !!document.querySelector('.bl-page .l2-end a[data-v="signup"]')]),
    ['isencao-imposto-de-renda-5-mil', 5, 4, ['tips', 'curiosities', 'news', 'tips', 'curiosities'], 'span 2', true], 'the featured post, five more as cards (their category as their class), a last card alone taking the room left, the way in at the end');
  ok(await page.evaluate(() => { const c = document.querySelector('.bl-card.news'), h = c.querySelector('h3'); return getComputedStyle(h).color === 'rgb(255, 255, 255)' && getComputedStyle(c.querySelector('.bl-fig')).color === 'rgb(159, 209, 130)'; }), 'a news card: its title white and its figure lime on the forest');
  await page.click('.bl-seg [data-v="news"]'); await page.waitForTimeout(150);
  eq(await page.evaluate(() => [!document.querySelector('.bl-feat'), [...document.querySelectorAll('.bl-card')].map(c => c.dataset.v), document.activeElement.dataset.v, document.querySelector('.bl-posts .l2-h2').textContent]),
    [true, ['isencao-imposto-de-renda-5-mil', 'selic-cai-para-13-75'], 'news', 'Lo que cambia en tu bolsillo.'], 'News: only the news (the featured one among them), the pressed category keeps the focus');
  await page.click('.bl-seg [data-v=""]'); await page.waitForTimeout(150);
  eq(await page.evaluate(() => document.querySelectorAll('.bl-grid .bl-card').length), 5, '“Todo”: every post again');
  await page.evaluate(() => scrollTo(0, 900)); await page.click('.bl-card[data-v="pix-automatico-limite"]'); await page.waitForTimeout(300);
  eq(await page.evaluate(() => [UI.blogPost, window.scrollY, document.activeElement.id, document.title, document.querySelector('.bl-band .bl-fig').textContent, document.querySelectorAll('.bl-body h2').length >= 2, document.querySelectorAll('.bl-src a[target="_blank"][rel="noopener"]').length, !!document.querySelector('.bl-note a[data-v="signup"]'), document.querySelectorAll('.bl-more .bl-card').length, !document.querySelector('.bl-more [data-v="pix-automatico-limite"]')]),
    ['pix-automatico-limite', 0, 'bl-title', 'Pix Automático: tus cuentas se pagan solas, pero ponles un tope · Dorax Finance', 'Pix', true, 2, true, 3, true], 'a post: from the top, its title in focus and in the tab, its figure, its text, its sources (opened apart), the way in, three other posts');
  ok(await page.evaluate(() => /Por Dorax Finance · 13 oct 2026 · 2 min de lectura/.test(document.querySelector('.bl-byline').textContent.replace(/\s+/g, ' ').replace('13 oct. 2026', '13 oct 2026'))), 'by whom, when, how long to read');
  await page.click('.bl-art-top [data-a="blog-home"]'); await page.waitForTimeout(200);
  eq(await page.evaluate(() => [UI.blogPost, !!document.querySelector('.bl-feat')]), ['', true], '“Blog” at the top of a post: the list');
  eq(errors, [], 'before login: no error'); await browser.close();

  ({ browser, page, errors } = await open({ lang: 'pt', viewport: { width: 390, height: 844 }, touch: true, mobile: true }));
  await page.evaluate(() => A['pub-go']({ v: 'blog' })); await page.waitForSelector('.bl-page');
  eq(await page.evaluate(() => { const seg = document.querySelector('.bl-seg'), b = [...seg.querySelectorAll('button')].map(x => x.getBoundingClientRect()); return [document.querySelector('#bl-title').textContent, document.documentElement.scrollWidth <= innerWidth, b.every(r => Math.abs(r.top - b[0].top) < 2), seg.scrollWidth <= seg.clientWidth + 1, [...document.querySelectorAll('.bl-seg button, .bl-card, .bl-feat .l2-btn')].every(e => e.getBoundingClientRect().height >= 44), [...document.querySelectorAll('.bl-tag')].map(x => x.textContent).slice(0, 2)]; }),
    ['Seu dinheiro, sem complicação.', true, true, true, true, ['Notícias', 'Dicas']], 'a phone, in Portuguese: nothing wider than the screen, the four categories in one row, every control a thumb high');
  await page.evaluate(() => A['blog-post']({ v: 'nascimento-do-real-1994' })); await page.waitForTimeout(200);
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.querySelector('#bl-title').textContent === 'O real nasceu em 1º de julho de 1994' && !document.querySelector('.bl-note')), 'a post on a phone: nothing wider than the screen; a curiosity with no “In Dorax” note has none');
  eq(errors, [], 'phone: no error'); await browser.close();

  // ---------- 3. from the app ----------
  ({ browser, page, errors } = await open({ lang: 'es', account: 'example', plan: true, viewport: { width: 1440, height: 900 } }));
  await page.evaluate(() => { S.user.greeted = true; navigate('goals'); render(); A.help(); }); await page.waitForSelector('#public .hc-pub');
  await page.click('.l2-foot [data-a="blog"]'); await page.waitForSelector('#public .bl-page');
  eq(await page.evaluate(() => [UI.webBlog, UI.webHelp, document.querySelector('.app').hidden, document.querySelector('[data-a="blog-close"]').textContent.trim(), !document.querySelector('.bl-page [data-v="signup"]'), !document.querySelector('.bl-page .l2-end'), !!document.querySelector('.l2-foot [data-a="help"]')]),
    [true, false, true, 'Volver a Dorax', true, true, true], 'from the Help center’s footer in the app: the blog over the app, with “Volver a Dorax”, without the way in');
  await page.evaluate(() => A['blog-post']({ v: 'salario-em-duas-datas' })); await page.waitForTimeout(200);
  eq(await page.evaluate(() => [UI.blogPost, !!document.querySelector('.bl-note'), !document.querySelector('.bl-note .l2-btn')]), ['salario-em-duas-datas', true, true], 'a post over the app: “En Dorax” says where, without the way in');
  await page.click('[data-a="blog-close"]'); await page.waitForTimeout(300);
  eq(await page.evaluate(() => [UI.webBlog, UI.route, document.querySelector('.app').hidden]), [false, 'goals', false], '“Volver a Dorax”: the app again, on the screen it was on');
  await page.evaluate(() => A.blog({ v: 'fgc-garantia-250-mil' })); await page.waitForSelector('#public .bl-body');
  eq(await page.evaluate(() => [UI.blogPost, document.title]), ['fgc-garantia-250-mil', 'Tu dinero en el banco está protegido hasta R$ 250 mil · Dorax Finance'], 'a post’s address opened while logged in: that post, over the app');
  eq(errors, [], 'app: no error'); await browser.close();
  done('qc-blog');
})();
