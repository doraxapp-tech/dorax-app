// QC sweep: every screen, in three languages, two themes and four widths; every button pressed; nothing broken, cut off or left untranslated.
// Sections A and B use the test fixture's full account; D uses a brand-new, blank one, which is what every person starts with.
const { open, ok, eq, done, fixture } = require('./pw.js');
const BAD = /\bundefined\b|\bNaN\b|\[object |\bnull\b|\{[a-z]+\}|Infinity/;
(async () => {
  // A. every screen x language x theme x width
  for (const lang of ['en', 'es', 'pt']) for (const [w, h, mobile] of [[1440, 900, false], [820, 1100, false], [390, 844, true], [320, 640, true]]) {
    const { browser, page, errors } = await open({ lang, plan: true, account: 'example', viewport: { width: w, height: h }, mobile, touch: mobile });
    const routes = await page.evaluate(() => ROUTES.map(r => r[0]));
    for (const theme of ['dark', 'light']) {
      await page.evaluate(th => { S.settings.theme = th; render(); }, theme);
      for (const r of routes) {
        await page.evaluate(r => navigate(r), r);
        const m = await page.evaluate(() => ({ over: document.documentElement.scrollWidth - window.innerWidth, text: document.querySelector('#view').innerText, top: document.querySelector('#topbar').innerText,
          wide: [...document.querySelectorAll('#view *')].filter(e => { const b = e.getBoundingClientRect(); if (!(b.width > 0 && b.right > window.innerWidth + 1) || getComputedStyle(e).position === 'fixed') return false; for (let p = e.parentElement; p && p.id !== 'view'; p = p.parentElement) if (/auto|scroll/.test(getComputedStyle(p).overflowX)) return false; return true; }).slice(0, 3).map(e => e.tagName + '.' + e.className) }));
        // (an element inside a part that scrolls sideways by itself, such as a wide table in its card, is not counted: it can be reached)
        ok(m.over <= 0, `${lang} ${w}px ${theme} ${r}: no sideways scroll`, m.over);
        eq(m.wide, [], `${lang} ${w}px ${theme} ${r}: nothing sticks out of the screen`);
        const bad = (m.text + '\n' + m.top).match(BAD);
        ok(!bad, `${lang} ${w}px ${theme} ${r}: no broken value in the text`, bad && (m.text + m.top).slice(Math.max(0, bad.index - 60), bad.index + 40));
        ok(m.text.trim().length > 40, `${lang} ${w}px ${theme} ${r}: screen is drawn`);
      }
    }
    eq(errors, [], `${lang} ${w}px: no console errors on any screen`);
    await browser.close();
  }

  // B. every button on every screen is pressed once (deletes are cancelled in their dialog); nothing throws, every panel closes
  for (const [w, mobile] of [[1440, false], [390, true]]) {
    const { browser, page, errors } = await open({ lang: 'en', plan: true, account: 'example', viewport: { width: w, height: 900 }, mobile, touch: mobile });
    const routes = await page.evaluate(() => ROUTES.map(r => r[0]));
    let pressed = 0, panels = 0;
    const SKIP = new Set(['logout', 'proto-onboard', 'export-json', 'restore-demo', 'export-ics', 'theme', 'user-delete']);
    for (const r of routes) {
      await page.evaluate(r => navigate(r), r);
      const keys = await page.evaluate(() => [...new Set([...document.querySelectorAll('#view [data-a], #topbar [data-a]')].filter(e => !e.disabled && e.offsetParent !== null).map(e => e.dataset.a))]);
      for (const a of keys) {
        if (SKIP.has(a)) continue;
        await page.evaluate(r => { UI.drawer = UI.modal = null; UI.sheet = false; navigate(r); }, r);
        const el = page.locator(`#view [data-a="${a}"]:visible, #topbar [data-a="${a}"]:visible`).first();
        if (!(await el.count())) continue;
        const before = errors.length;
        await el.click({ timeout: 3000 }).catch(() => {});
        pressed++;
        if (process.env.MOTION) await page.waitForTimeout(420);      // a panel is measured once it has finished sliding in
        const st = await page.evaluate(() => ({ drawer: !!UI.drawer, modal: !!UI.modal, sheet: !!UI.sheet, text: (document.querySelector('#overlay').innerText + document.querySelector('#modal-root').innerText), over: document.documentElement.scrollWidth - window.innerWidth,
          out: [...document.querySelectorAll('#overlay .drawer, #modal-root .modal')].map(e => e.getBoundingClientRect()).filter(b => b.right > window.innerWidth + 1 || b.left < -1).length }));
        ok(errors.length === before, `${w}px ${r}: “${a}” runs without an error`, errors.slice(before));
        if (await page.evaluate(() => !!UI.jstart)) { await page.evaluate(() => A['jstart-close']()); continue; }      // the Journey's first page (a page of its own, over everything): closed again
        if (st.drawer || st.modal || st.sheet) {
          panels++;
          const bad = st.text.match(BAD); ok(!bad, `${w}px ${r}: panel of “${a}” has no broken value`, bad && st.text.slice(Math.max(0, bad.index - 60), bad.index + 40));
          ok(st.out === 0 && st.over <= 0, `${w}px ${r}: panel of “${a}” fits the screen`, st);
          // the main button of an untouched form must refuse or accept without throwing
          if (st.modal) await page.evaluate(() => A['modal-cancel']());
          else { const save = page.locator('#overlay .drawer footer .btn.primary, #overlay .drawer .btn.primary').last(); if (await save.count() && await save.isVisible()) { await save.click({ timeout: 2000 }).catch(() => {}); ok(errors.length === before, `${w}px ${r}: saving the untouched “${a}” form does not throw`, errors.slice(before)); } }
          await page.evaluate(() => { if (UI.modal) A['modal-cancel'](); UI.drawer = null; UI.sheet = false; UI.conv = UI.imp = UI.sheetImp = null; render(); });
        }
      }
    }
    console.log(`  ${w}px: ${pressed} buttons pressed, ${panels} panels opened`);
    ok(pressed > 60, `${w}px: the walk pressed buttons`, pressed);
    eq(errors, [], `${w}px: no console errors while pressing every button`);
    await browser.close();
  }

  // C. the public pages
  for (const lang of ['en', 'es', 'pt']) for (const w of [1440, 1000, 390, 320]) {
    const { browser, page, errors } = await open({ lang, viewport: { width: w, height: 900 }, mobile: w < 500, touch: w < 500 });
    for (const v of ['landing', 'signup', 'login', 'forgot', 'privacy', 'terms', 'contact']) {
      await page.evaluate(v => A['pub-go']({ v }), v);
      const m = await page.evaluate(() => ({ over: document.documentElement.scrollWidth - window.innerWidth, text: document.querySelector('#public').innerText, light: document.documentElement.classList.contains('app-light') }));
      ok(m.over <= 0, `${lang} ${w}px public ${v}: no sideways scroll`, m.over);
      if (v === 'landing') { const [n, n2] = await page.evaluate(() => ['.lp-cta h2', '#lp-pj h2'].map(sel => { const h = document.querySelector(sel); return Math.round(h.getBoundingClientRect().height / parseFloat(getComputedStyle(h).lineHeight)); })); ok(n <= 2, `${lang} ${w}px home page: the closing heading is two lines at most (owner, 2026-10-05)`, n); ok(n2 <= 2, `${lang} ${w}px home page: the "for entrepreneurs" heading is two lines at most (owner, 2026-10-05: "too long")`, n2); }
      const bad = m.text.match(BAD); ok(!bad, `${lang} ${w}px public ${v}: no broken value`, bad && m.text.slice(Math.max(0, bad.index - 60), bad.index + 40));
      ok(!m.light, `${lang} ${w}px public ${v}: stays dark`);
      if (v === 'landing') { ok(!/emailed link|link sent to your email|enlace que llega|link enviado/i.test(m.text), `${lang} ${w}px: the home page no longer promises a login by link`); ok(/Google/.test(await page.evaluate(() => document.querySelector('#lp-faq').textContent)), `${lang} ${w}px: the home page mentions Google login (in its questions, since the "your data" section was removed)`); }
      // free for now (owner, 2026-10-05): no plans section, no prices, no paid tier named, and no link left pointing at a section that is not there
      if (v === 'landing' || v === 'terms') ok(!/R\$\s?7,99|R\$\s?14,99|R\$\s?79,90|R\$\s?149,90|\bPremium\b|\bPlus\b|Stripe/.test(m.text), `${lang} ${w}px public ${v}: no prices and no paid plan named`, (m.text.match(/.{0,40}(R\$\s?7,99|R\$\s?14,99|Premium|Plus\b|Stripe).{0,40}/) || [])[0]);
      // the "home and company" hero (owner, 2026-10-07): who it is for, a two-part heading, one line, ONE button, and what trying costs right under it; nine questions, the first one about the price
      if (v === 'landing') { const hero = await page.evaluate(() => { const c = document.querySelector('.lp-hero .lp-copy'), trust = c.querySelector('.lp-trust'), btn = c.querySelector('.btn.primary').getBoundingClientRect(), tr = trust.getBoundingClientRect(), lead = c.querySelector('.lead');
          return { parts: [c.querySelectorAll('.eyebrow').length, c.querySelectorAll('h1').length, c.querySelectorAll('h1 .hl').length, c.querySelectorAll('.lead').length, c.querySelectorAll('.btn').length, c.querySelectorAll('.lp-trust').length], under: tr.top >= btn.bottom && tr.top - btn.bottom <= 24, bits: trust.textContent.split(' · ').length,
            leadLines: Math.round(lead.getBoundingClientRect().height / parseFloat(getComputedStyle(lead).lineHeight)), h1Lines: Math.round(c.querySelector('h1').getBoundingClientRect().height / parseFloat(getComputedStyle(c.querySelector('h1')).lineHeight)), faq: document.querySelectorAll('.lp-faq details').length, first: document.querySelector('.lp-faq summary').textContent }; });
        eq(hero.parts, [1, 1, 1, 1, 1, 1], `${lang} ${w}px home page: the hero is a label, one heading in two parts, one line, one button and the line under it`);
        ok(hero.under && hero.bits === 3, `${lang} ${w}px home page: "free, no card, no bank password" sits right under the button`, [hero.under, hero.bits]);
        ok(hero.h1Lines <= 2 && hero.leadLines <= 3, `${lang} ${w}px home page: a short heading (two lines at most) and a short line under it (three at most)`, [hero.h1Lines, hero.leadLines]);
        eq(hero.faq, 9, `${lang} ${w}px home page: nine questions`); ok(/free|gratis|grátis/i.test(hero.first), `${lang} ${w}px home page: the first question is about the price`, hero.first); }
      if (v === 'landing') { const d = await page.evaluate(() => ({ plans: document.querySelectorAll('#lp-plans, .lp-plans, .tier, [data-a="lp-bill"]').length, dead: [...document.querySelectorAll('[data-a="pub-scroll"]')].filter(b => !document.getElementById(b.dataset.id)).map(b => b.dataset.id), empty: [...document.querySelectorAll('.lp-go, .lp-sec-h .row')].filter(r => !r.children.length).length }));
        eq([d.plans, d.dead, d.empty], [0, [], 0], `${lang} ${w}px home page: no plans section, every link in the page has its section, no empty button row`);
        ok(/free|gratis|gratuito/i.test(await page.evaluate(() => document.querySelector('#lp-faq').textContent)), `${lang} ${w}px home page: the questions say it is free for now`); }
    }
    eq(errors, [], `${lang} ${w}px public: no console errors`);
    await browser.close();
  }
  // C2. the questions on the home page open and close with a slide; with reduced motion they snap, as the browser does it
  {
    const o = await open({ lang: 'pt', motion: 'no-preference' }); const p = o.page; await p.waitForSelector('.lp-faq details');
    const q = p.locator('.lp-faq details').nth(1), sum = q.locator('summary'); await sum.scrollIntoViewIfNeeded();
    const h = () => q.evaluate(d => Math.round(d.getBoundingClientRect().height)), state = () => q.evaluate(d => [d.open, d.classList.contains('closing'), d.style.overflow, d.getAnimations({ subtree: true }).length]);
    const closed = await h(); await sum.click(); await p.waitForTimeout(60); const mid = await h(), during = await state();
    await p.waitForFunction(d => d.getAnimations({ subtree: true }).length === 0, await q.elementHandle()); const opened = await h();
    ok(during[0] && during[3] > 0 && mid > closed && mid < opened, 'a question opens with a slide: its height is on the way between closed and open', [closed, mid, opened]);
    eq(await state(), [true, false, '', 0], 'open: a plain open <details>, nothing left on it');
    eq(await q.locator('p').evaluate(e => getComputedStyle(e).opacity), '1', 'open: the answer is fully visible');
    await sum.click(); await p.waitForTimeout(60); const back = await h(), closing = await state(); ok(closing[0] && closing[1] && back < opened && back > closed, 'it closes with a slide, still open while it moves', [closed, back, opened]);
    await sum.click(); await p.waitForFunction(d => d.getAnimations({ subtree: true }).length === 0, await q.elementHandle()); eq([await h(), (await state())[0]], [opened, true], 'pressed again while closing: it turns round and ends open');
    await sum.click(); await p.waitForFunction(d => d.getAnimations({ subtree: true }).length === 0, await q.elementHandle()); eq([await h(), ...(await state())], [closed, false, false, '', 0], 'closed: the same height as before, and really closed');
    await sum.focus(); await p.keyboard.press('Enter'); await p.waitForFunction(d => d.open && d.getAnimations({ subtree: true }).length === 0, await q.elementHandle()); ok(true, 'the keyboard opens it too');
    eq(o.errors, [], 'questions with motion: no console errors'); await o.browser.close();
    const r = await open({ lang: 'pt' }); await r.page.waitForSelector('.lp-faq details'); const rq = r.page.locator('.lp-faq details').nth(1); await rq.locator('summary').click();
    eq(await rq.evaluate(d => [d.open, d.getAnimations({ subtree: true }).length]), [true, 0], 'reduced motion: the question opens at once, with no animation'); await r.browser.close();
  }

  // C3. the home page, login and sign-up follow the owner's style reference (DESIGN 1.md, 2026-10-05), with the green main button he asked back; the rest keeps its own look
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    const o = await open({ lang: 'pt', viewport: { width: w, height: h } }); const p = o.page; await p.waitForSelector('.lp-actions');
    const m = await p.evaluate(() => {
      const cs = (sel, prop) => { const e = document.querySelector(sel); return e ? getComputedStyle(e)[prop] : 'missing ' + sel; };
      const all = [...document.querySelectorAll('.lp *')].filter(e => e.getClientRects().length);
      const inMock = e => !!e.closest('.phone, .ill, .lp-float, .pjg, .pj-figs, .shot, .calc, .logo');      // .calc: the calculator is a piece of the app too (its sliders and dream buttons are the first-time setup's)
      const chroma = c => { const m = /rgba?\((\d+), (\d+), (\d+)(?:, ([\d.]+))?/.exec(c); if (!m || m[4] === '0') return 0; return Math.max(+m[1], +m[2], +m[3]) - Math.min(+m[1], +m[2], +m[3]); };
      return {
        canvas: [cs('.lp', 'backgroundColor'), getComputedStyle(document.body).backgroundColor],
        main: [cs('.lp-copy .btn.primary', 'backgroundColor'), cs('.lp-copy .btn.primary', 'borderTopColor'), cs('.lp-copy .btn.primary', 'color'), cs('.lp-copy .btn.primary', 'borderTopLeftRadius'), cs('.lp-copy .btn.primary', 'boxShadow')],
        other: [cs('.lp-cta .btn:not(.primary)', 'backgroundColor'), cs('.lp-cta .btn:not(.primary)', 'borderTopColor'), cs('.lp-cta .btn:not(.primary)', 'color')],       // the hero has one button since 2026-10-07; the closing call to action still has a second one beside the main one
        h1: [cs('.lp h1', 'fontWeight'), cs('.lp h1', 'backgroundImage'), cs('.lp h1', 'color'), cs('.lp h1 .hl', 'color'), cs('.lp h2', 'fontWeight')],
        font: cs('.lp', 'fontFamily').split(',')[0].trim(),
        card: [cs('.bento article', 'borderTopLeftRadius'), cs('.bento article', 'boxShadow'), cs('.bento article', 'backgroundImage'), cs('.bento article', 'backgroundColor'), cs('.bento article', 'borderTopColor')],
        nav: [cs('.lp-link', 'color'), cs('.lp-link', 'fontWeight')],
        shadows: all.filter(e => !inMock(e) && /\d+px \d+px \d+px/.test(getComputedStyle(e).boxShadow) && !/0px 0px 0px/.test(getComputedStyle(e).boxShadow)).map(e => e.className).slice(0, 5),
        gradients: all.filter(e => !inMock(e) && /gradient/.test(getComputedStyle(e).backgroundImage)).map(e => e.className).slice(0, 5),
        round: all.filter(e => !inMock(e) && !e.matches('.btn, .lp-link, .lang-pill, .lang-pill *, .vs-box h3 i') && parseFloat(getComputedStyle(e).borderTopLeftRadius) > 8 && e.getBoundingClientRect().width > 12).map(e => e.className).slice(0, 5),
        colour: all.filter(e => !inMock(e) && !e.matches('.btn.primary') && (chroma(getComputedStyle(e).color) > 24 || chroma(getComputedStyle(e).backgroundColor) > 24 || chroma(getComputedStyle(e).borderTopColor) > 24)).map(e => e.tagName + '.' + e.className).slice(0, 5),
        pattern: [...document.querySelectorAll('.lp .weave')].filter(e => e.getClientRects().length).length,
        logo: getComputedStyle(document.querySelector('.lp .logo .ac')).stroke, wide: Math.round(document.querySelector('.lp-sec').getBoundingClientRect().width),
      };
    });
    eq(m.canvas, ['rgb(8, 9, 10)', 'rgb(8, 9, 10)'], `${w}px home page: the canvas is #08090a, to the edges of the window`);
    eq(m.main, ['rgb(0, 98, 57)', 'rgba(62, 207, 142, 0.45)', 'rgb(247, 248, 248)', '9999px', 'none'], `${w}px home page: the main action is Dorax green, a pill, no shadow`);
    eq(m.other, ['rgb(20, 21, 22)', 'rgb(35, 37, 42)', 'rgb(247, 248, 248)'], `${w}px home page: the second action beside a main one is a dark pill`);
    eq(m.h1, ['510', 'none', 'rgb(247, 248, 248)', 'rgb(138, 143, 152)', '510'], `${w}px home page: headings at weight 510, plain near-white, no metal and no green`);
    ok(/Inter/.test(m.font), `${w}px home page: set in Inter`, m.font);
    eq(m.card, ['8px', 'none', 'none', 'rgb(20, 21, 22)', 'rgb(35, 37, 42)'], `${w}px home page: a card is the first grey, a hairline, 8px, no shadow, no gradient`);
    eq(m.nav, ['rgb(138, 143, 152)', '510'], `${w}px home page: links in the bar are muted, weight 510`);
    eq([m.shadows, m.gradients, m.round, m.colour, m.pattern], [[], [], [], [], 0], `${w}px home page: no drop shadow, no gradient, nothing rounder than 8px but pills, no colour outside the logo, the main button and the product pictures, no pattern`);
    eq(m.logo, 'rgb(62, 207, 142)', `${w}px home page: the logo keeps its green quarter`);
    // headings as in the owner's reference; the links of the bar in its middle; the closing call to action with no box (2026-10-05)
    eq(await p.evaluate(() => { const g = (sel, prop) => getComputedStyle(document.querySelector(sel))[prop], vw = document.documentElement.clientWidth, c = document.querySelector('.lp-cta'), cs = getComputedStyle(c), h = c.querySelector('h2').getBoundingClientRect(), row = c.querySelector('.row').getBoundingClientRect();
      const nav = document.querySelector('.lp-nav nav'), nr = nav.getBoundingClientRect(), lr = document.querySelector('.lp-nav .brand').getBoundingClientRect(), ar = document.querySelector('.lp-actions').getBoundingClientRect(), shown = getComputedStyle(nav).display !== 'none';
      return { h1: [g('.lp h1', 'fontSize'), g('.lp h1', 'fontWeight'), g('.lp h1', 'letterSpacing'), parseFloat(g('.lp h1', 'lineHeight')) / parseFloat(g('.lp h1', 'fontSize')) <= 1.07, g('.lp h1', 'fontOpticalSizing')], h2: [g('.lp-sec h2', 'fontSize'), g('.lp-sec h2', 'fontWeight'), g('.lp-cta h2', 'fontSize'), c.querySelectorAll('h2 span, h2 br').length, g('.lp-cta h2', 'textWrap')], body: getComputedStyle(document.documentElement).fontOpticalSizing,
        nav: !shown || (Math.abs((nr.left + nr.right) / 2 - vw / 2) <= 1 && nr.left > lr.right + 8 && nr.right < ar.left - 8),
        cta: [cs.backgroundColor, cs.backgroundImage, cs.borderTopWidth, cs.boxShadow, c.querySelectorAll('p, .weave').length, c.querySelectorAll('.btn').length, Math.abs((h.left + h.right) / 2 - vw / 2) <= 1, Math.abs((row.left + row.right) / 2 - vw / 2) <= 1, parseFloat(cs.paddingTop) >= 64] }; }),
      { h1: [w > 920 ? '60px' : '34px', '510', w > 920 ? '-1.32px' : '-0.748px', true, 'auto'], h2: [w > 920 ? '60px' : '34px', '510', w > 920 ? '60px' : w > 430 ? '34px' : `${+(w * .084).toFixed(2)}px`, 0, 'balance'], body: 'none', nav: true, cta: ['rgba(0, 0, 0, 0)', 'none', '0px', 'none', 0, 2, true, true, true] },
      `${w}px home page: big headings at ${w > 920 ? 60 : 34}px, weight 510, set solid, in the display cut (the rest of the text keeps its own); the bar's links in its middle, clear of the logo and the buttons; the closing call to action is one short sentence (on a narrow phone its size follows the width, so it stays on two lines) and two buttons, centred, with no box`);
    eq(await p.evaluate(() => { const g = (sel, prop) => { const e = document.querySelector(sel); return e ? getComputedStyle(e)[prop] : 'missing ' + sel; };
      return [g('.ill .ring-fg', 'stroke'), g('.ill .meter.go > i', 'backgroundColor'), g('.ill .mcols i.hot', 'backgroundColor'), g('.f-chart polyline', 'stroke'), g('.ill-flow .fl.a', 'stroke'), g('.phone.duo.home .rw-seg .bar > i', 'backgroundColor'), g('.ill .g-bars b', 'color')]; }),
      ['rgb(62, 207, 142)', 'rgb(62, 207, 142)', 'rgb(62, 207, 142)', 'rgb(62, 207, 142)', 'rgb(62, 207, 142)', 'rgb(62, 207, 142)', 'rgb(247, 248, 248)'], `${w}px home page: the data in the graphs is green (ring, bars, columns, line, flow, the household's track in the hero); the words beside it stay in the text colour`);
    // the hero's picture (owner, 2026-10-07, after choosing the "home and company" hero): the app on two phones, the household's and the company's, built alike
    eq(await p.evaluate(() => { const st = document.querySelector('.lp-hero .lp-stage.duo'), ph = [...st.querySelectorAll('.phone.duo')], r = ph.map(e => e.getBoundingClientRect()), g = (e, sel, prop) => getComputedStyle(e.querySelector(sel))[prop];
      return { two: [ph.length, ph[0].classList.contains('home'), ph[1].classList.contains('co'), document.querySelectorAll('.lp-hero .lp-float').length],
        hidden: [st.getAttribute('role'), !!st.getAttribute('aria-label'), ph.every(e => e.parentElement.getAttribute('aria-hidden') === 'true'), st.querySelectorAll('button, a, input, select, [data-a], [tabindex], h1, h2, h3').length],
        parts: ph.map(e => [e.querySelectorAll('.ph-seg span').length, e.querySelectorAll('.ph-seg span.on').length, e.querySelectorAll('.rw-n').length, e.querySelectorAll('.rw-seg').length, e.querySelectorAll('.ph-goal .meter > i').length, e.querySelectorAll('.ph-pay b').length]),
        on: ph.map(e => [...e.querySelectorAll('.ph-seg span')].findIndex(x => x.classList.contains('on'))), fig: ph.map(e => e.querySelector('.rw-n').textContent),
        side: ph.map(e => [g(e, '.ph-top', 'backgroundColor'), g(e, '.rw-seg .bar > i', 'backgroundColor'), g(e, '.ph-seg span.on', 'color'), g(e, '.ph-screen', 'backgroundColor'), g(e, '.ph-rw', 'backgroundColor')]),
        layout: [r[0].right <= r[1].left, r[1].top > r[0].top, Math.abs(r[0].width - r[1].width) <= 1, r[1].right <= document.documentElement.clientWidth],
        fits: ph.every(e => [...e.querySelectorAll('.ph-top, .ph-rw, .ph-goal, .ph-pay, .ph-tab')].every(x => { const a = x.getBoundingClientRect(), b = e.getBoundingClientRect(); return a.left >= b.left && a.right <= b.right + .5 && a.bottom <= b.bottom + .5; })) }; }),
      { two: [2, true, true, 0], hidden: ['img', true, true, 0], parts: [[2, 1, 1, 4, 1, 1], [2, 1, 1, 4, 1, 1]], on: [0, 1], fig: ['3', '5'],
        side: [['rgb(0, 98, 57)', 'rgb(62, 207, 142)', 'rgb(0, 98, 57)', 'rgb(0, 0, 0)', 'rgb(7, 7, 7)'], ['rgb(31, 78, 158)', 'rgb(91, 157, 255)', 'rgb(31, 78, 158)', 'rgb(0, 0, 0)', 'rgb(7, 7, 7)']], layout: [true, true, true, true], fits: true },
      `${w}px home page: the hero shows the app on two phones side by side, the second one lower: the household's (green panel, "Household" chosen, 3 months of freedom) and the company's (blue panel, "Company" chosen, 5 months of runway), each with its track of four marks, a goal with its month and what is still to pay, on the app's own black; one picture for a screen reader, nothing in it can be pressed, nothing spills out of a phone`);
    // small text is not tightened (owner: tight letter spacing on small text is hard to read), and a piece of the app has a frame that can be seen on the page (2026-10-07)
    eq(await p.evaluate(() => { const ls = sel => { const e = document.querySelector(sel); if (!e) return 'missing ' + sel; const v = getComputedStyle(e).letterSpacing; return v === 'normal' ? 0 : parseFloat(v); };
      return [['.lp-link', '.lp .eyebrow', '.lp-trust', '.bento p', '.lp-plain p', '.lp-flow p', '.lp-note', '.lp .ft-cols h3', '.lp-actions .btn', '.lp .shot .note', '.lp .shot .btn', '.phone.duo small'].map(ls).filter(v => !(v >= 0)),
        ['.lp .duo-pane', '.lp .shot.mini', '.lp .shot-back', '.lp .phone.duo'].map(sel => getComputedStyle(document.querySelector(sel)).borderTopColor)]; }),
      [[], ['rgb(52, 52, 58)', 'rgb(52, 52, 58)', 'rgb(52, 52, 58)', 'rgb(52, 52, 58)']], `${w}px home page: no small text with negative letter spacing; every piece of the app has the same lighter hairline round it`);
    // "how it calculates" shows a piece of the app, as the app looks, and nothing in it can be pressed (owner, 2026-10-05)
    eq(await p.evaluate(() => { const sh = document.querySelector('#lp-method .shot'), g = (sel, prop) => getComputedStyle(sh.querySelector(sel))[prop], sec = document.querySelector('#lp-method');
      const front = sh.querySelector('.shot-front').getBoundingClientRect(), back = sh.querySelector('.shot-back').getBoundingClientRect(), text = sh.querySelector('.shot-back .card-h').getBoundingClientRect(), h = sec.querySelector('.lp-split-h h2').getBoundingClientRect(), lead = sec.querySelector('.lead.big').getBoundingClientRect();
      return { hidden: [sh.getAttribute('aria-hidden'), sh.hasAttribute('inert'), sh.querySelectorAll('button, a, input, select, [data-a], [tabindex], h1, h2, h3').length],
        app: [g('.card', 'backgroundColor'), g('.card', 'borderTopLeftRadius'), g('.chip', 'borderTopLeftRadius'), /mono/i.test(g('.tile .value', 'fontFamily')), g('.chip.good i', 'backgroundColor'), g('.shot-back', 'backgroundColor')],
        parts: [sh.querySelectorAll('.tile').length, sh.querySelectorAll('.paylist tbody tr').length, sh.querySelectorAll('.budget').length, sh.querySelectorAll('.shot-tip').length, sec.querySelectorAll('.lp-plain > div').length, sec.querySelectorAll('.fl-ico, article').length],
        layout: innerWidth > 900 ? [h.right <= lead.left, front.left < back.left && front.right <= text.left + parseFloat(getComputedStyle(sh.querySelector('.shot-back .card-h')).paddingLeft) + 1] : [h.bottom <= lead.top, front.bottom <= back.top] }; }),
      { hidden: ['true', true, 0], app: ['rgb(7, 7, 7)', '16px', '9999px', true, 'rgb(93, 187, 139)', 'rgb(0, 0, 0)'], parts: [4, 5, 2, 1, 6, 0], layout: [true, true] },
      `${w}px home page: "how it calculates" shows the Plan screen and the "Plan vs actual" card as the app draws them (its colours, radii and type), decoration only, nothing in it can be pressed or focused; ${w > 900 ? 'heading left and words right, the card in front without covering the text behind' : 'stacked'}; the six rules are plain text`);
    // "for entrepreneurs" and "how it works" show pieces of the app too (owner, 2026-10-05: "do the same … add parts of the app"; "how it works needs an update")
    eq(await p.evaluate(() => { const sec = document.querySelector('#lp-pj'), sh = sec.querySelector('.shot.duo'), r = sel => sec.querySelector(sel).getBoundingClientRect();
      const head = r('.duo-head'), pic = r('.shot.duo'), list = r('.duo-list'), panes = [...sh.querySelectorAll('.duo-pane')].map(e => e.getBoundingClientRect()), wide = innerWidth > 1140;
      return { hidden: [sh.getAttribute('aria-hidden'), sh.hasAttribute('inert'), sh.querySelectorAll('button, a, input, select, [data-a], [tabindex], h1, h2, h3').length],
        parts: [panes.length, sh.querySelectorAll('.duo-pane.home .acct').length, sh.querySelectorAll('.duo-pane.co tbody tr').length, sh.querySelectorAll('.duo-join span').length, sec.querySelectorAll('.duo-list > li').length, sec.querySelectorAll('.duo-list h3').length],
        // not the pattern of "how it calculates" again: no heading-left-words-right header, no screen behind a card, no row of plain columns, nothing fading out
        other: [sec.querySelectorAll('.lp-split-h, .shot-back, .shot-front, .lp-plain, .lp-note').length, document.querySelectorAll('.pj-figs, .pjg, .shot.pj').length, [...sh.querySelectorAll('.duo-pane')].every(e => /^none/.test(getComputedStyle(e).maskImage || 'none')), panes[0].bottom < panes[1].top],
        look: [getComputedStyle(sh.querySelector('.acct')).backgroundColor, /mono/i.test(getComputedStyle(sh.querySelector('.acct .bal')).fontFamily), getComputedStyle(sh.querySelector('.duo-pane')).backgroundColor],
        layout: wide ? [head.right <= pic.left && list.right <= pic.left, head.bottom <= list.top, head.width >= pic.width && head.width <= pic.width * 1.3] : [head.bottom <= pic.top, pic.bottom <= list.top, true] }; }),
      { hidden: ['true', true, 0], parts: [2, 2, 3, 1, 4, 4], other: [0, 0, true, true], look: ['rgb(7, 7, 7)', true, 'rgb(0, 0, 0)'], layout: [true, true, true] },
      `${w}px home page: "for entrepreneurs" is its own layout, not "how it calculates" again: ${w > 1140 ? 'half and half, the heading, the words and the four points on the left, the picture on the right' : 'the heading and the words, then the picture, then the four points'}; the picture is two whole panes (the household's two accounts over the company's monthly statements) joined by "never mixed", as the app draws them, decoration only`);
    eq(await p.evaluate(() => { const sec = document.querySelector('#lp-how'), lis = [...sec.querySelectorAll('.lp-flow > li')], figs = [...sec.querySelectorAll('.lp-flow .shot.mini')], top = e => Math.round(e.getBoundingClientRect().top);
      return { steps: [lis.length, figs.length, lis.map(li => li.querySelector('.fl-n').textContent).join(' '), lis.every(li => li.querySelectorAll('h3').length === 1 && li.querySelectorAll('.fl-txt p').length === 1)],
        hidden: [figs.every(f => f.getAttribute('aria-hidden') === 'true' && f.hasAttribute('inert')), figs.reduce((n, f) => n + f.querySelectorAll('button, a, input, select, [data-a], [tabindex], h1, h2, h3').length, 0)],
        parts: [figs[0].querySelectorAll('.acct').length, figs[1].querySelectorAll('tbody tr').length, figs[2].querySelectorAll('.li.todo').length, figs[3].querySelectorAll('.budget').length],
        old: sec.querySelectorAll('.lp-steps, .st-node, .st-path, .st-line').length,
        layout: [lis.every(li => li.querySelector('.shot').getBoundingClientRect().bottom <= li.querySelector('.fl-txt').getBoundingClientRect().top + 1), innerWidth > 900 ? top(lis[0]) === top(lis[1]) && top(lis[2]) === top(lis[3]) && top(lis[2]) > top(lis[0]) : lis.every((li, i) => !i || top(li) > top(lis[i - 1]))] }; }),
      { steps: [4, 4, '01 02 03 04', true], hidden: [true, 0], parts: [4, 4, 2, 2], old: 0, layout: [true, true] },
      `${w}px home page: "how it works" is four steps, each a small piece of the app (accounts, the plan, the to-do list, plan vs actual) above its number, title and line, ${w > 900 ? 'two by two' : 'one under the other'}; no numbered path; the pictures are decoration only`);
    // sections and the rules between them (owner, 2026-10-05): room to breathe; a faint rule as wide as the window that fades at both ends
    eq(await p.evaluate(() => { const secs = [...document.querySelectorAll('.lp .lp-sec')], pad = parseFloat(getComputedStyle(secs[1]).paddingTop), vw = document.documentElement.clientWidth;
      const rules = [...secs.slice(1), document.querySelector('.lp-foot')].map(e => { const b = getComputedStyle(e, '::before'), r = e.getBoundingClientRect(); return { own: getComputedStyle(e).borderTopWidth, h: b.height, fade: /linear-gradient\(90deg, rgba\(0, 0, 0, 0\) 0%, rgba\(255, 255, 255, 0\.0\d+\) 22%.*rgba\(0, 0, 0, 0\) 100%\)/.test(b.backgroundImage), from: Math.round(r.left + parseFloat(b.left)), wide: Math.round(parseFloat(b.width)) }; });
      return [document.querySelectorAll('#lp-for, #lp-change, #lp-data, .who-fig, .venn, .who-bento, .vs-box, .lp-rules').length, secs.map(e => e.id).join(' '), pad >= 64 && pad <= 120, rules.length, rules.every(r => r.own === '0px' && r.h === '1px' && r.fade), rules.every(r => r.from <= 0 && r.from + r.wide >= vw), document.documentElement.scrollWidth - innerWidth]; }),
      [0, 'lp-calc lp-pj lp-how lp-what lp-method lp-faq', true, 6, true, true, 0], `${w}px home page: no "who it is for", no comparison and no "your bank login" section; 64 to 120px above each section; six faint rules, each as wide as the window and fading at both ends; nothing scrolls sideways`); ok(m.wide <= 1080, `${w}px home page: the column is 1080px at most`, m.wide);
    // login and sign-up: the same system
    for (const v of ['signup', 'login']) {
      await p.evaluate(v => A['pub-go']({ v }), v); await p.waitForSelector('#au-pass');
      const a = await p.evaluate(() => { const cs = (sel, prop) => { const e = document.querySelector(sel); return e ? getComputedStyle(e)[prop] : 'missing ' + sel; }, btn = '.au-form .btn.primary';
        const all = [...document.querySelectorAll('.auth.single *')].filter(e => e.getClientRects().length && !e.closest('.logo'));
        const chroma = c => { const m = /rgba?\((\d+), (\d+), (\d+)(?:, ([\d.]+))?/.exec(c); if (!m || m[4] === '0') return 0; return Math.max(+m[1], +m[2], +m[3]) - Math.min(+m[1], +m[2], +m[3]); };
        return { canvas: [getComputedStyle(document.body).backgroundColor, cs('.auth.single', 'backgroundColor')], main: [cs(btn, 'backgroundColor'), cs(btn, 'color'), cs(btn, 'borderTopLeftRadius')],
          title: [cs('.auth-card h1', 'fontWeight'), cs('.auth-card h1', 'fontSize'), cs('.auth-card h1', 'color')], field: [cs('#au-pass', 'backgroundColor'), cs('#au-pass', 'borderTopColor'), cs('#au-pass', 'borderTopLeftRadius')],
          link: [cs('.auth-alt .linkbtn', 'color'), cs('.auth-alt .linkbtn', 'fontWeight')], font: cs('.auth.single', 'fontFamily').split(',')[0].trim(),
          side: document.querySelectorAll('.auth-side').length,
          gradients: all.filter(e => /gradient/.test(getComputedStyle(e).backgroundImage)).map(e => e.className).slice(0, 5), pattern: [...document.querySelectorAll('.auth.single .weave')].length,
          colour: all.filter(e => !e.matches('.btn.primary, .gbtn.g-dark, .gbtn.g-dark *') && (chroma(getComputedStyle(e).color) > 24 || chroma(getComputedStyle(e).backgroundColor) > 24 || chroma(getComputedStyle(e).borderTopColor) > 24)).map(e => e.tagName + '.' + e.className).slice(0, 5) }; });
      eq(a.canvas, ['rgb(8, 9, 10)', 'rgb(8, 9, 10)'], `${w}px ${v}: the same canvas as the home page`);
      eq(a.main, ['rgb(0, 98, 57)', 'rgb(247, 248, 248)', '9999px'], `${w}px ${v}: the main button is Dorax green, a pill`);
      eq(a.title, ['510', '24px', 'rgb(247, 248, 248)'], `${w}px ${v}: the title at 24px, weight 510`);
      eq(a.field, ['rgb(20, 21, 22)', 'rgb(98, 102, 109)', '4px'], `${w}px ${v}: a field is the first grey, a border that can be seen, 4px`);
      eq(a.link, ['rgb(247, 248, 248)', '510'], `${w}px ${v}: links are near-white at weight 510, not green`); ok(/Inter/.test(a.font), `${w}px ${v}: set in Inter`, a.font);
      eq(a.side, 0, `${w}px ${v}: one block, no panel beside the form`);
      eq([a.gradients, a.pattern, a.colour], [[], 0, []], `${w}px ${v}: no gradient, no pattern, no colour but the logo and the main button`);
    }
    // the pages that were not asked for keep their own look
    await p.evaluate(() => A['pub-go']({ v: 'terms' })); await p.waitForSelector('#legal-title'); eq(await p.evaluate(() => getComputedStyle(document.body).backgroundColor), 'rgb(0, 0, 0)', `${w}px: the legal pages keep their own look`);
    eq(o.errors, [], `${w}px style reference: no console errors`); await o.browser.close();
  }

  // C4. the home page's calculator, "When do you get there?" (owner, 2026-10-07: "do phase 3"). The tests run on 2026-10-02, so the first contribution is October's.
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    const o = await open({ lang: 'pt', viewport: { width: w, height: h }, mobile: w < 500, touch: w < 500, server: { confirmEmail: false } }); const p = o.page; await p.waitForSelector('#calc-tool');
    const read = () => p.evaluate(() => ({ month: document.querySelector('.calc-month').textContent, line: document.querySelector('.calc-when p').textContent, label: (document.querySelector('.calc-when small') || {}).textContent || '',
      marks: document.querySelectorAll('.calc-line i').length, ends: [...document.querySelectorAll('.calc-ends span')].map(e => e.textContent), tip: (document.querySelector('.calc-tip span') || {}).textContent || '', sum: !!document.querySelector('#calc-more .note'),
      fields: ['calc-cost', 'calc-saved', 'calc-monthly'].map(id => document.getElementById(id).value), ranges: ['calc-cost-r', 'calc-saved-r', 'calc-monthly-r'].map(id => { const r = document.getElementById(id); return [+r.value, +r.max, r.getAttribute('aria-valuetext')]; }), pressed: document.querySelector('#calc-tool .ob-dream[aria-pressed="true"]').dataset.v }));
    const slide = (id, v) => p.evaluate(([id, v]) => { const r = document.getElementById(id); r.value = v; r.dispatchEvent(new Event('input', { bubbles: true })); }, [id, v]);
    const type = async (id, v) => { await p.fill('#' + id, v); };
    const first = await read();
    eq([first.pressed, first.fields, first.label, first.month, first.line, first.marks, first.ends], ['trip', ['6.000', '0', '500'], 'Você chega em', 'Setembro 2027', 'Neste ritmo você chega em 12 meses.', 12, ['Outubro 2026', 'Setembro 2027']],
      `${w}px calculator: it opens on a trip of 6.000 with nothing put aside and 500 a month: twelve contributions from October, so September 2027, with one mark a month`);
    ok(/R\$ 50 a mais por mês/.test(first.tip) && /1 mês antes/.test(first.tip) && first.sum, `${w}px calculator: the tip is the app's own smallest step (50 more a month, one month sooner), and it says no investment return is counted`, first.tip);
    eq(first.ranges.map(r => r[2]), ['R$ 6.000', 'R$ 0', 'R$ 500'], `${w}px calculator: each slider says its amount in reais to a screen reader`);
    eq(await p.evaluate(() => { const g = id => document.getElementById(id), tool = g('calc-tool'); return [g('calc-out').getAttribute('aria-live'), [...tool.querySelectorAll('input[type=range]')].every(r => r.getAttribute('aria-label')), [...tool.querySelectorAll('input[type=text]')].every(i => i.labels.length === 1 || i.getAttribute('aria-label')), tool.querySelectorAll('.ob-dream').length, tool.querySelector('.ob-dreams').getAttribute('role'), document.querySelector('.calc-way').getAttribute('aria-hidden')]; }),
      ['polite', true, true, 4, 'group', 'true'], `${w}px calculator: the answer is announced as it changes, every slider and field has a name, the four dreams are one group, the marks are decoration (the sentence says the same)`);
    // a slider moves: the answer follows, the field beside it takes the amount, and the page is not drawn again (the slider is the same element)
    await p.evaluate(() => { document.getElementById('calc-monthly-r').dataset.mark = 'same'; }); await slide('calc-monthly-r', 1000);
    const moved = await read();
    eq([moved.month, moved.marks, moved.fields[2], moved.ranges[2][2], await p.evaluate(() => document.getElementById('calc-monthly-r').dataset.mark)], ['Março 2027', 6, '1.000', 'R$ 1.000', 'same'], `${w}px calculator: 1.000 a month reaches 6.000 in six months (March 2027); the field shows 1.000 and the slider was not replaced`);
    // an amount typed: the slider follows it
    await type('calc-saved', '3.000'); const typed = await read();
    eq([typed.month, typed.marks, typed.ranges[1][0]], ['Dezembro 2026', 3, 3000], `${w}px calculator: 3.000 already put aside leaves three months (December 2026), and its slider moved to 3.000`);
    // another dream: its own cost, its own slider (the cost was not touched yet, so it starts at the dream's round figure)
    await type('calc-saved', '0'); await slide('calc-monthly-r', 500); await p.click('#calc-tool .ob-dream[data-v="car"]'); const car = await read();
    eq([car.pressed, car.fields[0], car.ranges[0][1], car.month, car.marks, car.ends], ['car', '50.000', 300000, 'Janeiro 2035', 34, ['Outubro 2026', 'Cada marca são 3 meses.', 'Janeiro 2035']],
      `${w}px calculator: the car starts at 50.000 with a slider up to 300.000; at 500 a month that is 100 months (January 2035), drawn as 34 marks of three months each`);
    eq(await p.evaluate(() => document.activeElement && document.activeElement.dataset.v), 'car', `${w}px calculator: the chosen dream keeps the focus after the tool is drawn again`);
    // the cases with no date
    await slide('calc-monthly-r', 100); const far = await read(); eq([far.month, far.marks, far.label, /R\$ 50 a mais/.test(far.tip)], ['Mais de 10 anos', 0, '', true], `${w}px calculator: 100 a month for 50.000 is more than ten years: no date is printed, the tip still shows a step that helps`);
    await slide('calc-monthly-r', 0); const none = await read(); ok(none.month === 'Ainda sem data' && /12 meses: R\$ 4\.167 por mês/.test(none.line) && !none.tip, `${w}px calculator: nothing put aside each month: no date, and what a year would take (50.000 / 12, rounded up)`, [none.month, none.line]);
    await type('calc-saved', '60.000'); const cov = await read(); eq([cov.month, cov.marks, cov.tip, cov.sum], ['Já está coberto', 0, '', false], `${w}px calculator: more put aside than it costs: already covered, nothing else to say`);
    await type('calc-cost', 'abc'); const none2 = await read(); ok(none2.month === 'Ainda sem data' && /quanto custa/.test(none2.line) && (await p.inputValue('#calc-cost')) === '', `${w}px calculator: letters cannot be typed in an amount (owner, 2026-10-09): the field stays empty and asks for the cost`, [none2.month, none2.line]);
    await type('calc-cost', '1.2.3'); const bad = await read(); ok(bad.month === 'Ainda sem data' && /1500 ou 9,90/.test(bad.line), `${w}px calculator: something that is not an amount is said plainly, and nothing breaks`, [bad.month, bad.line]);
    ok(!/NaN|undefined|null|Infinity/.test(await p.locator('#calc-tool').innerText()), `${w}px calculator: no broken value in any of those states`);
    // "Try it" adds the tip's step to what is put aside each month
    await type('calc-cost', '6.000'); await type('calc-saved', '0'); await slide('calc-monthly-r', 500); await p.click('#calc-try'); const tried = await read();
    eq([tried.fields[2], tried.ranges[2][0], tried.month], ['550', 550, 'Agosto 2027'], `${w}px calculator: "Testar" turns 500 a month into 550 (the field and the slider both), and the date comes one month closer`);
    ok(await p.evaluate(() => !!document.activeElement && !!document.activeElement.closest('#calc-tool')), `${w}px calculator: the focus stays in the tool after "Testar"`);
    // layout: one frame; on a computer the amounts on the left and the answer on the right, on a phone the answer above the sliders and the way in last
    eq(await p.evaluate(() => { const r = sel => document.querySelector(sel).getBoundingClientRect(), tool = r('#calc-tool'), dreams = r('.calc-dreams'), inn = r('.calc-in'), out = r('#calc-out'), more = r('#calc-more'), go = r('.calc-go'), h2 = document.querySelector('#lp-calc h2');
        const inside = [...document.querySelectorAll('#calc-tool *')].every(e => { const a = e.getBoundingClientRect(); return !a.width || (a.left >= tool.left - .5 && a.right <= tool.right + .5); });
        return [dreams.bottom <= inn.top + 1 && dreams.bottom <= out.top + 1, innerWidth > 900 ? inn.right <= out.left + 1 && out.bottom <= more.top + 1 && more.bottom <= go.top + 1 : out.bottom <= inn.top + 1 && inn.bottom <= more.top + 1 && more.bottom <= go.top + 1, inside,
          Math.round(h2.getBoundingClientRect().height / parseFloat(getComputedStyle(h2).lineHeight)) <= 2, document.documentElement.scrollWidth - innerWidth, getComputedStyle(document.querySelector('#calc-tool')).borderTopColor,
          [...document.querySelectorAll('#calc-tool button, #calc-tool input[type=range]')].every(e => innerWidth > 900 || e.getBoundingClientRect().height >= 44)]; }),
      [true, true, true, true, 0, 'rgb(52, 52, 58)', true], `${w}px calculator: the dreams across the top; ${w > 900 ? 'the amounts on the left, the answer on the right with the tip and the way in under it' : 'the answer right under the dreams and above the sliders, so it is in sight while one is dragged, then the tip, then the way in'}; nothing spills out of its frame, the heading is two lines at most, the frame is the pieces' own hairline${w > 900 ? '' : ', and everything to press is 44px tall'}`);
    // the way in keeps the dream on this device and opens sign-up; the first-time setup of the new account starts from it
    await p.click('#calc-tool .ob-dream[data-v="safety"]'); await type('calc-cost', '9.500'); await type('calc-saved', '1.200');
    await p.click('[data-a="calc-go"]'); await p.waitForSelector('#au-name');
    eq(await p.evaluate(() => { const c = JSON.parse(localStorage.getItem('dorax.calc')); return [c.dream, c.cost, c.saved, Date.now() - c.at < 5000, Object.keys(c).sort().join(' ')]; }), ['safety', '9.500', '1.200', true, 'at cost dream saved'], `${w}px calculator: the way in keeps the dream, its cost and what is put aside on this device, and nothing else, and opens sign-up`);
    await p.fill('#au-name', 'Rui'); await p.fill('#au-email', `rui${w}@example.org`); await p.fill('#au-pass', 'RuiSenha2026'); await p.check('#au-accept'); await p.click('[data-a="auth-signup"]'); await p.waitForSelector('#ob-name');
    eq(await p.evaluate(() => [document.querySelector('.ob-dream[aria-pressed="true"]').dataset.v, document.getElementById('ob-cost').value, UI.ob.saved, UI.ob.pay]), ['safety', '9.500', '1.200', '3.700'], `${w}px calculator: the new account's setup opens with that dream chosen, its cost and what is put aside; what comes in still starts where it always did`);
    eq(o.errors, [], `${w}px calculator: no console errors`); await o.browser.close();
  }
  // what the calculator kept is used for a day, and anything unreadable is ignored: the setup then starts as it always did
  {
    const o = await open({ lang: 'en', server: { confirmEmail: false } }); const p = o.page; await p.waitForSelector('#calc-tool');
    const carry = v => p.evaluate(v => { if (v === null) localStorage.removeItem('dorax.calc'); else localStorage.setItem('dorax.calc', typeof v === 'string' ? v : JSON.stringify(v)); return calcCarry(); }, v);
    eq(await carry(null), {}, 'calculator: nothing kept, nothing handed on');
    eq(await carry({ at: Date.now() - 25 * 3600 * 1000, dream: 'car', cost: '40.000', saved: '0' }), {}, 'calculator: kept more than a day ago: not used');
    eq(await carry({ at: Date.now(), dream: 'yacht', cost: '40.000', saved: '0' }), {}, 'calculator: a dream the setup does not offer: not used');
    eq(await carry({ at: Date.now(), dream: 'car', cost: 'abc', saved: '0' }), {}, 'calculator: a cost that cannot be read: not used');
    eq(await carry('{not json'), {}, 'calculator: something that is not what the calculator writes: not used');
    eq(await carry({ at: Date.now(), dream: 'car', cost: '40.000', saved: '-5' }), { dream: 'car', cost: '40.000', costTouched: true }, 'calculator: a saved amount that makes no sense is left out; the dream and its cost still come along');
    eq(await carry({ at: Date.now(), dream: 'trip', cost: '6.000', saved: '0' }), { dream: 'trip', cost: '6.000', costTouched: true, saved: '0' }, 'calculator: a dream kept a moment ago comes along, with nothing put aside when that is what was said');
    eq(o.errors, [], 'calculator: no console errors'); await o.browser.close();
  }

  // D. a brand-new account, which is what every person starts with: blank. Every screen is drawn from nothing, in three languages and
  //    on a phone; nothing broken, nothing of an example, no prototype mark anywhere.
  const LEFTOVER = /prototyp|protótipo|prototipo|example account|cuenta de ejemplo|conta de exemplo|demo@|sample|\bdemo\b|Try an example|exemplo de extrato/i;
  for (const lang of ['en', 'es', 'pt']) for (const [w, h, mobile] of [[1440, 900, false], [390, 844, true]]) {
    const { browser, page, errors } = await open({ lang, viewport: { width: w, height: h }, mobile, touch: mobile, server: { confirmEmail: false } });
    await page.evaluate(() => A['pub-go']({ v: 'signup' }));
    await page.fill('#au-name', 'Nova'); await page.fill('#au-email', `nova-${lang}-${w}@example.org`); await page.fill('#au-pass', 'NovaConta2026'); await page.check('#au-accept');
    await page.click('[data-a="auth-signup"]'); await page.waitForSelector('#ob-name');
    { const m = await page.evaluate(() => ({ over: document.documentElement.scrollWidth - window.innerWidth, text: document.querySelector('#public').innerText })); ok(m.over <= 0 && !BAD.test(m.text) && !LEFTOVER.test(m.text), `${lang} ${w}px blank: first-time setup is clean`, (m.text.match(LEFTOVER) || m.text.match(BAD) || [m.over])[0]); }
    await page.click('[data-a="onboard-save"]'); await page.click('[data-a="ob-finish"]'); await page.waitForFunction(() => !!UI.session);
    eq(await page.evaluate(() => [S.accounts.length, S.transactions.length, S.plan.lines.length, S.goals.length, S.goalMoves.length, S.rules.length, S.imports.length, S.exports.length, S.ofxProfiles.length, Object.keys(S.fii.assets).length, S.fii.moves.length, Object.values(S.pay).flat().length]), [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], `${lang} ${w}px blank: the account holds nothing but its categories`);
    const routes = await page.evaluate(() => ROUTES.map(r => r[0]));
    for (const r of routes) {
      await page.evaluate(r => navigate(r), r);
      const m = await page.evaluate(() => ({ over: document.documentElement.scrollWidth - window.innerWidth, text: document.querySelector('#view').innerText + '\n' + document.querySelector('#topbar').innerText + '\n' + document.querySelector('#rail-foot').innerText,
        acts: [...document.querySelectorAll('#view [data-a], #topbar [data-a]')].map(e => e.dataset.a) }));
      ok(m.over <= 0, `${lang} ${w}px blank ${r}: no sideways scroll`, m.over);
      const bad = m.text.match(BAD); ok(!bad, `${lang} ${w}px blank ${r}: no broken value`, bad && m.text.slice(Math.max(0, bad.index - 60), bad.index + 40));
      const left = m.text.match(LEFTOVER); ok(!left, `${lang} ${w}px blank ${r}: nothing of an example or a prototype`, left && m.text.slice(Math.max(0, left.index - 60), left.index + 40));
      ok(m.text.trim().length > 40, `${lang} ${w}px blank ${r}: screen is drawn`);
      eq(m.acts.filter(a => /sample|demo|proto|example|imp-start/.test(a)), [], `${lang} ${w}px blank ${r}: no example or prototype button`);
    }
    // the panels a new person opens first
    for (const [route, act] of [['accounts', 'edit-account'], ['dashboard', 'new-tx'], ['plan', 'line-new'], ['goals', 'goal-new'], ['dashboard', 'reminders'], ['settings', 'contact']]) {
      await page.evaluate(([route, act]) => { navigate(route); A[act]({ id: '' }); }, [route, act]);
      const m = await page.evaluate(() => ({ open: !!UI.drawer, text: document.querySelector('#overlay').innerText, over: document.documentElement.scrollWidth - window.innerWidth }));
      const bad = m.text.match(BAD) || m.text.match(LEFTOVER);
      ok(m.over <= 0 && !bad, `${lang} ${w}px blank: panel "${act}" is clean`, bad ? m.text.slice(Math.max(0, bad.index - 60), bad.index + 40) : m.over);
      await page.evaluate(() => { UI.drawer = null; UI.sheet = false; renderOverlay(); });
    }
    eq(errors, [], `${lang} ${w}px blank: no console errors`);
    await browser.close();
  }
  // E. everything a person can type is written into the page as text, never as markup. Every name, description, note and bank reference
  //    of the fixture account is replaced by a piece of markup; no screen and no panel may turn it into an element or an attribute.
  {
    const { browser, page, errors } = await open({ lang: 'en', plan: true });
    await fixture(page);
    const marked = await page.evaluate(() => {
      const PROBE = 'x" data-xss-probe="1"><i class="xss-probe"></i>\'&<b>', OWN = /^(id|color|type|kind|scope|status|source|pay|to|tone|lang|locale|theme|namesLang|currency|date|today|since|deadline|month|ticker|sub|version|transferMapping|accountType|language|defaultProfile|forAccount|fingerprint|priceDate|ym|half)$|Id$/, TYPED = /^(bankId|branchId|accountId|institutionId)$/;
      const st = buildDemoState('en'); let n = 0;
      (function walk(v, key, holder, hk, inProfile) {
        if (typeof v === 'string') { if (!(OWN.test(key) && key !== 'sourceTxnId' && !(inProfile && TYPED.test(key)))) { holder[hk] = PROBE + ' ' + v.slice(0, 12); n++; } return; }
        if (Array.isArray(v)) return v.forEach((x, i) => walk(x, key, v, i, inProfile));
        if (v && typeof v === 'object') for (const k of Object.keys(v)) { if (k !== 'k') walk(v[k], /^\d+$/.test(k) ? key : k, v, k, inProfile || k === 'ofxProfiles'); }
      })(st, '', null, null, false);
      st.namesLang = 'en'; st.settings.lang = 'en';
      DORAX_PREVIEW.seed({ email: DEMO_EMAIL, name: st.user.name, data: st }); return [n, backupClean(st)];
    });
    ok(marked[0] > 1000 && marked[1], 'markup was put into every typed text of the account (and such an account is still a valid backup: typed text is free)', marked);
    await page.reload(); await page.waitForFunction(() => typeof UI !== 'undefined' && !!UI.session);
    const probe = () => page.evaluate(() => [document.querySelectorAll('.xss-probe').length, document.querySelectorAll('[data-xss-probe]').length]);
    const routes = await page.evaluate(() => ROUTES.map(r => r[0]));
    let shown = 0;
    for (const r of routes) { await page.evaluate(r => navigate(r), r); eq(await probe(), [0, 0], `typed text stays text on ${r}`); shown += await page.evaluate(() => /class="xss-probe"/.test(document.getElementById('view').innerText) ? 1 : 0); }
    ok(shown >= 8, 'and the marked text is really on those screens, readable as text', shown);
    // every panel that opens from a button, and every row that opens a panel
    let opened = 0;
    for (const r of routes) {
      await page.evaluate(r => navigate(r), r);
      const n = await page.evaluate(() => document.querySelectorAll('#view [data-a], #topbar [data-a], #view tr.click').length);
      for (let i = 0; i < Math.min(n, 60); i++) {
        const did = await page.evaluate(i => { const el = [...document.querySelectorAll('#view [data-a], #topbar [data-a], #view tr.click')][i]; if (!el || el.disabled || /logout|delete|wipe|export|calendar|theme|copy|download|lang/.test(el.dataset.a || '')) return false; if (el.click) el.click(); else el.dispatchEvent(new MouseEvent('click', { bubbles: true })); return true; }, i);      // a chart's ring is an SVG shape: no click() of its own
        if (!did) continue;
        const p = await probe(); if (p[0] || p[1]) { eq(p, [0, 0], `typed text stays text after pressing button ${i} on ${r}`); }
        opened += await page.evaluate(() => (UI.drawer || UI.modal) ? 1 : 0);
        await page.evaluate(r => { UI.drawer = UI.modal = null; UI.sheet = false; UI.conv = UI.imp = UI.sheetImp = null; renderModal(); if (UI.session) navigate(r); }, r);
      }
    }
    ok(opened > 30, 'panels were opened with the marked account', opened);
    eq(await probe(), [0, 0], 'typed text stays text in every panel');
    ok(!errors.some(e => /xss|probe/i.test(e)), 'no script error from the marked text', errors.slice(0, 3));
    await browser.close();
  }
  // wide screens (owner, 2026-10-05: "center the content in the tab view"): the column sits in the middle of the space beside the menu, and the
  // title and the buttons of the bar above stand over its two edges
  for (const w of [2750, 2000, 1440]) {
    const { browser, page } = await open({ lang: 'pt', plan: true, account: 'example', viewport: { width: w, height: 900 } });
    for (const r of ['dashboard', 'plan', 'transactions']) { await page.evaluate(r => navigate(r), r); await page.waitForTimeout(300);
      const m = await page.evaluate(() => { const b = e => e.getBoundingClientRect(), wk = b(document.querySelector('.work')), c = document.querySelector('.content'), cs = getComputedStyle(c), l = b(c).left + parseFloat(cs.paddingLeft), rt = b(c).right - parseFloat(cs.paddingRight);
        return { left: Math.round(l - wk.left), right: Math.round(wk.right - rt), wide: Math.round(rt - l), h1: Math.round(b(document.querySelector('.topbar h1')).left - l), btn: Math.round(rt - b(document.querySelector('.topbar .btn.primary')).right), bar: Math.round(b(document.querySelector('.topbar')).width - wk.width), over: Math.max(0, document.documentElement.scrollWidth - innerWidth) }; });      // nothing wider than the window (the page itself stops short of the room kept for its scroll bar)
      if (r === 'dashboard') eq(await page.evaluate(() => getComputedStyle(document.querySelector('.topbar h1')).fontSize), '20px', `${w}px: the page title in the bar is 20px (owner, 2026-10-05)`);
      eq([Math.abs(m.left - m.right) <= 1, m.wide <= 1336, m.left >= 32, m.h1, m.btn, m.bar, m.over], [true, true, true, 0, 0, 0, 0], `${w}px ${r}: the page is centred beside the menu, 1336px wide at most; the bar's title and main button stand over its edges; the bar itself runs the full width`, m); }
    await browser.close();
  }
  // the menu (owner, 2026-10-05): no names over its two groups, one faint line between them; each icon moves once when its row is pointed at
  { const { browser, page } = await open({ lang: 'pt', plan: true, account: 'example', viewport: { width: 1440, height: 900 }, motion: 'no-preference' });
    eq(await page.evaluate(() => { const n = document.querySelector('#nav'), kids = [...n.children], r = n.querySelector('.nav-rule'), cs = getComputedStyle(r);
      return [document.querySelectorAll('.nav-group').length, kids.map(e => e.tagName[0]).join(''), r.getAttribute('role'), cs.height, cs.backgroundColor, n.innerText.includes('CASA') || n.innerText.includes('DADOS')]; }),
      [0, 'AAAAAAADAAAAA', 'separator', '1px', 'rgb(26, 26, 26)', false], 'menu: seven links, one hairline in the border colour, five links (Open Finance among them; the converter is the company’s); no group names');
    const moves = {};
    for (const id of ['dashboard', 'transactions', 'plan', 'goals', 'investments', 'reports', 'accounts', 'imports', 'recurring', 'categories', 'settings']) {
      const sel = `.rail .nav a[href="#${id}"]`, read = () => page.evaluate(sel => { const cs = getComputedStyle(document.querySelector(sel + ' svg')); return [cs.animationName, cs.animationIterationCount, cs.transform]; }, sel);
      const before = await read(); await page.hover(sel); await page.waitForTimeout(150); const during = await read(); await page.waitForTimeout(650); const after = await read();
      moves[id] = [before[0] === 'none', /^nav-/.test(during[0]) && during[1] === '1' && during[2] !== 'none', after[2] === 'none'].every(Boolean) ? during[0] : JSON.stringify([before, during, after]); }
    eq(moves, { dashboard: 'nav-pop', transactions: 'nav-nudge', plan: 'nav-hop', goals: 'nav-wave', investments: 'nav-rise', reports: 'nav-grow', accounts: 'nav-wave', imports: 'nav-hop', recurring: 'nav-turn', categories: 'nav-wave', settings: 'nav-turn' },
      'menu: each of the twelve icons is still until its row is pointed at, then moves once and comes to rest where it was');
    await browser.close(); }
  { const { browser, page } = await open({ lang: 'pt', plan: true, account: 'example', viewport: { width: 1440, height: 900 } });
    await page.hover('.rail .nav a[href="#settings"]'); await page.waitForTimeout(120);
    eq(await page.evaluate(() => getComputedStyle(document.querySelector('.rail .nav a[href="#settings"] svg')).animationName), 'none', 'menu: with "less motion" asked of the system, the icons stay still');
    await browser.close(); }
  done('qc-sweep');
})().catch(e => { console.error(e); process.exit(1); });
