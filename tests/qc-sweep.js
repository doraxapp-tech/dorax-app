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
      await page.evaluate(th => { S.settings.theme = S.settings.themePhone = th; render(); }, theme);
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
      if (v === 'landing') { const [n, n2] = await page.evaluate(() => ['.l2-end h2', '#lp-pj h2'].map(sel => { const h = document.querySelector(sel); return Math.round(h.getBoundingClientRect().height / parseFloat(getComputedStyle(h).lineHeight)); })); ok(n <= 2, `${lang} ${w}px home page: the closing heading is two lines at most (owner, 2026-10-05)`, n); ok(n2 <= 2, `${lang} ${w}px home page: the "for entrepreneurs" heading is two lines at most (owner, 2026-10-05: "too long")`, n2); }
      const bad = m.text.match(BAD); ok(!bad, `${lang} ${w}px public ${v}: no broken value`, bad && m.text.slice(Math.max(0, bad.index - 60), bad.index + 40));
      ok(!m.light, `${lang} ${w}px public ${v}: not in the app's light theme (its light/dark switch is for the app only)`);
      if (v === 'landing') { ok(!/emailed link|link sent to your email|enlace que llega|link enviado/i.test(m.text), `${lang} ${w}px: the home page no longer promises a login by link`); ok(/Google/.test(await page.evaluate(() => document.querySelector('#lp-faq').textContent)), `${lang} ${w}px: the home page mentions Google login (in its questions, since the "your data" section was removed)`); }
      // free for now (owner, 2026-10-05): no plans section, no prices, no paid tier named, and no link left pointing at a section that is not there
      if (v === 'landing' || v === 'terms') ok(!/R\$\s?7,99|R\$\s?14,99|R\$\s?79,90|R\$\s?149,90|\bPremium\b|\bPlus\b|Stripe/.test(m.text), `${lang} ${w}px public ${v}: no prices and no paid plan named`, (m.text.match(/.{0,40}(R\$\s?7,99|R\$\s?14,99|Premium|Plus\b|Stripe).{0,40}/) || [])[0]);
      // the hero (owner, 2026-10-07; second look approved 2026-10-11): who it is for, a two-part heading, one line, the main button with "How it works" beside it,
      // and what trying costs right under them; nine questions, the first one about the price
      if (v === 'landing') { const hero = await page.evaluate(() => { const c = document.querySelector('.l2-hero .l2-copy'), trust = c.querySelector('.l2-trust'), row = c.querySelector('.l2-cta').getBoundingClientRect(), tr = trust.getBoundingClientRect(), lead = c.querySelector('.l2-lead');
          return { parts: [c.querySelectorAll('.l2-eyebrow').length, c.querySelectorAll('h1').length, c.querySelectorAll('h1 .hl').length, c.querySelectorAll('.l2-lead').length, c.querySelectorAll('.l2-btn').length, c.querySelectorAll('.l2-btn.lime').length, c.querySelectorAll('.l2-trust').length], under: tr.top >= row.bottom && tr.top - row.bottom <= 32, bits: trust.textContent.split(' · ').length,
            leadLines: Math.round(lead.getBoundingClientRect().height / parseFloat(getComputedStyle(lead).lineHeight)), h1Lines: Math.round(c.querySelector('h1').getBoundingClientRect().height / parseFloat(getComputedStyle(c.querySelector('h1')).lineHeight)), faq: document.querySelectorAll('.l2-faq details').length, first: document.querySelector('.l2-faq summary').textContent }; });
        eq(hero.parts, [1, 1, 1, 1, 2, 1, 1], `${lang} ${w}px home page: the hero is a label, one heading in two parts, one line, the main button and "How it works", and the line under them`);
        ok(hero.under && hero.bits === 3, `${lang} ${w}px home page: "free, no card, no bank password" sits right under the buttons`, [hero.under, hero.bits]);
        ok(hero.h1Lines <= 2 && hero.leadLines <= 4, `${lang} ${w}px home page: a short heading (two lines at most) and a short line under it (four at most)`, [hero.h1Lines, hero.leadLines]);
        eq(hero.faq, 9, `${lang} ${w}px home page: nine questions`); ok(/free|gratis|grátis/i.test(hero.first), `${lang} ${w}px home page: the first question is about the price`, hero.first); }
      if (v === 'landing') { const d = await page.evaluate(() => ({ plans: document.querySelectorAll('#lp-plans, .lp-plans, .tier, [data-a="lp-bill"]').length, dead: [...document.querySelectorAll('[data-a="pub-scroll"]')].filter(b => !document.getElementById(b.dataset.id)).map(b => b.dataset.id), empty: [...document.querySelectorAll('.l2-cta, .l2-pj-go, .l2-end-r')].filter(r => !r.children.length).length }));
        eq([d.plans, d.dead, d.empty], [0, [], 0], `${lang} ${w}px home page: no plans section, every link in the page has its section, no empty button row`);
        ok(/free|gratis|gratuito/i.test(await page.evaluate(() => document.querySelector('#lp-faq').textContent)), `${lang} ${w}px home page: the questions say it is free for now`); }
    }
    eq(errors, [], `${lang} ${w}px public: no console errors`);
    await browser.close();
  }
  // C2. the questions on the home page open and close with a slide; with reduced motion they snap, as the browser does it
  {
    const o = await open({ lang: 'pt', motion: 'no-preference' }); const p = o.page; await p.waitForSelector('.l2-faq details');
    const q = p.locator('.l2-faq details').nth(1), sum = q.locator('summary'); await sum.scrollIntoViewIfNeeded();
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
    const r = await open({ lang: 'pt' }); await r.page.waitForSelector('.l2-faq details'); const rq = r.page.locator('.l2-faq details').nth(1); await rq.locator('summary').click();
    eq(await rq.evaluate(d => [d.open, d.getAnimations({ subtree: true }).length]), [true, 0], 'reduced motion: the question opens at once, with no animation'); await r.browser.close();
  }

  // C3. the home page's second look (owner, 2026-10-11, on the design canvas built from Wise's landing and his references: "La amé, push it"):
  // light and warm, the app's forest and lime, Inter as in the app, Dorax's own pieces as pictures. Login and sign-up keep the dark system of
  // DESIGN 1.md with the green main button (not asked to change); the legal pages keep their own look.
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    const o = await open({ lang: 'pt', viewport: { width: w, height: h }, mobile: w < 500, touch: w < 500 }); const p = o.page; await p.waitForSelector('.lp-actions');
    const m = await p.evaluate(() => {
      const cs = (sel, prop) => { const e = document.querySelector(sel); return e ? getComputedStyle(e)[prop] : 'missing ' + sel; };
      return {
        canvas: [cs('.lp2', 'backgroundColor'), getComputedStyle(document.body).backgroundColor],
        main: [cs('.l2-copy .l2-btn.lime', 'backgroundColor'), cs('.l2-copy .l2-btn.lime', 'color'), cs('.l2-copy .l2-btn.lime', 'borderTopLeftRadius'), cs('.l2-copy .l2-btn.white', 'backgroundColor')],
        h1: [cs('.l2-h1', 'fontWeight'), cs('.l2-h1', 'color'), cs('.l2-h1 .hl', 'color'), cs('.l2-h2', 'fontWeight')],
        font: cs('.lp2', 'fontFamily').split(',')[0].trim(),
        logo: [getComputedStyle(document.querySelector('.l2-nav .logo')).color, getComputedStyle(document.querySelector('.l2-nav .logo .ac')).stroke],
        old: document.querySelectorAll('.lp2 .lp, .lp2 .lp-hero, .lp2 .lp-sec, .lp2 .bento, .lp2 .phone, .lp2 .shot, .lp2 .weave').length,
        ids: [...document.querySelectorAll('.lp2 main > section[id]')].map(e => e.id).join(' '),
      };
    });
    eq(m.canvas, ['rgb(242, 244, 238)', 'rgb(242, 244, 238)'], `${w}px home page: the page is the warm sage-white #F2F4EE, to the edges of the window`);
    eq(m.main, ['rgb(159, 209, 130)', 'rgb(22, 51, 0)', '999px', 'rgb(255, 255, 255)'], `${w}px home page: the main action is a lime pill with forest words; the second one is white`);
    eq(m.h1, ['600', 'rgb(14, 15, 12)', 'rgb(22, 51, 0)', '500'], `${w}px home page: the heading in ink with its second part in forest; section headings at weight 500`);
    ok(/Inter/.test(m.font), `${w}px home page: set in Inter, as the app`, m.font);
    eq(m.logo, ['rgb(22, 51, 0)', 'rgb(159, 209, 130)'], `${w}px home page: the logo in forest with its lit quarter in lime`);
    eq(m.old, 0, `${w}px home page: none of the first look's pieces is left in the page`);
    eq(m.ids, 'lp-calc lp-days lp-what lp-pj lp-how lp-data lp-faq', `${w}px home page: the sections in the approved order`);
    // the phone of the hero: one picture for a screen reader, nothing in it to press, nothing spills out of it; the choice over it changes its side
    eq(await p.evaluate(() => { const st = document.querySelector('.l2-stage'), ph = st.querySelector('#l2-phone');
      return { hidden: [st.getAttribute('role'), !!st.getAttribute('aria-label'), ph.getAttribute('aria-hidden'), st.querySelectorAll('button, a, input, select, [data-a], [tabindex], h1, h2, h3').length],
        seg: [...document.querySelectorAll('.l2-sg')].map(b => b.getAttribute('aria-pressed')), co: ph.classList.contains('co'), fig: ph.querySelector('.l2-pbig b').textContent,
        fits: [...ph.querySelectorAll('.l2-phead, .l2-pc, .l2-kds, .l2-tabs')].every(x => { const a = x.getBoundingClientRect(), b = ph.getBoundingClientRect(); return a.left >= b.left - .5 && a.right <= b.right + .5 && a.bottom <= b.bottom + .5; }) }; }),
      { hidden: ['img', true, 'true', 0], seg: ['true', 'false'], co: false, fig: '3', fits: true }, `${w}px home page: the phone shows the household's side (3 and a half months of freedom); it is one picture for a screen reader and nothing in it can be pressed or spills out`);
    await p.click('.l2-sg.co');
    eq(await p.evaluate(() => { const ph = document.querySelector('#l2-phone'); return [ph.classList.contains('co'), [...document.querySelectorAll('.l2-sg')].map(b => b.getAttribute('aria-pressed')), ph.querySelector('.l2-pbig b').textContent, getComputedStyle(ph.querySelector('.rw-seg .bar > i')).backgroundColor, document.activeElement.dataset.v]; }),
      [true, ['false', 'true'], '5', 'rgb(91, 157, 255)', 'co'], `${w}px home page: "Company" turns the phone to the company's side, in its blue (5 months of runway); the button keeps the focus`);
    // the moments of the month: the one pressed opens and shows a piece of the app; only one is open
    await p.click('.l2-mo[data-v="2"]');
    eq(await p.evaluate(() => [[...document.querySelectorAll('.l2-mo')].map(b => b.getAttribute('aria-pressed')).join(' '), document.querySelectorAll('.l2-mo-ui').length, document.activeElement.dataset.v, getComputedStyle(document.querySelector('.l2-mo.on')).backgroundColor]),
      ['false false true false', 1, '2', 'rgb(22, 51, 0)'], `${w}px home page: a moment of the month opens in forest with how it looks in Dorax; the others close; the focus stays on it`);
    // small text is not tightened (owner: tight letter spacing on small text is hard to read); words can be read on what is behind them
    eq(await p.evaluate(() => { const ls = sel => { const e = document.querySelector(sel); if (!e) return 'missing ' + sel; const v = getComputedStyle(e).letterSpacing; return v === 'normal' ? 0 : parseFloat(v); };
      return ['.l2-link', '.l2-eyebrow', '.l2-trust', '.l2-mo-p', '.l2-st-p span', '.l2-faq details summary', '.l2-ft-cols h3', '.l2-fl > small', '.l2-tc p', '.lp2 .calc .ob-slide-h label'].map(ls).filter(v => !(v >= 0)); }),
      [], `${w}px home page: no small text with negative letter spacing`);
    const low = await p.evaluate(() => {
      const rgb = c => { const m = /rgba?\(([\d.]+), ([\d.]+), ([\d.]+)(?:, ([\d.]+))?/.exec(c); return m ? [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]] : null; };
      const lum = ([r, g, b]) => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };
      const bgOf = e => { for (let x = e; x; x = x.parentElement) { const c = rgb(getComputedStyle(x).backgroundColor); if (c && c[3] > .9) return c; } return [242, 244, 238, 1]; };
      const out = [];
      for (const e of document.querySelectorAll('.lp2 *')) {
        if (e.closest('[aria-hidden="true"], .sr, select, option') || !e.getClientRects().length) continue;
        if (![...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue;
        const s = getComputedStyle(e); if (s.visibility === 'hidden' || +s.opacity === 0) continue;
        const fg = rgb(s.color), bg = bgOf(e), a = lum(fg), b = lum(bg), r = (Math.max(a, b) + .05) / (Math.min(a, b) + .05), big = parseFloat(s.fontSize) >= 24 || (parseFloat(s.fontSize) >= 18.6 && +s.fontWeight >= 700);
        if (r < (big ? 3 : 4.5)) out.push(`${e.tagName}.${e.className} ${r.toFixed(2)} "${e.textContent.trim().slice(0, 30)}"`);
      }
      return out.slice(0, 8);
    });
    eq(low, [], `${w}px home page: every word that can be read has enough contrast with what is behind it (4.5:1, 3:1 for large text)`);
    // login and sign-up: light as the home page since 2026-10-11 (owner: "en todas las páginas de la webapp"; css/look/look-public.css)
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
          colour: all.filter(e => !e.matches('.btn.primary, .gbtn.g-dark, .gbtn.g-dark *, .linkbtn, .linkbtn *, .brand, .brand *, input:focus') && (chroma(getComputedStyle(e).color) > 24 || chroma(getComputedStyle(e).backgroundColor) > 24 || chroma(getComputedStyle(e).borderTopColor) > 24)).map(e => e.tagName + '.' + e.className).slice(0, 5) }; });
      eq(a.canvas, ['rgb(242, 244, 238)', 'rgb(242, 244, 238)'], `${w}px ${v}: the same sage-white page as the home page`);
      eq(a.main, ['rgb(159, 209, 130)', 'rgb(22, 51, 0)', '999px'], `${w}px ${v}: the main button is the home page's lime pill with forest words`);
      eq(a.title, ['600', '30px', 'rgb(14, 15, 12)'], `${w}px ${v}: the title at 30px, weight 600, in ink`);
      eq(a.field, ['rgb(255, 255, 255)', 'rgb(195, 201, 189)', '14px'], `${w}px ${v}: a field is white with an edge that can be seen, 14px corners`);
      eq(a.link, ['rgb(22, 51, 0)', '600'], `${w}px ${v}: links are forest at weight 600`); ok(/Inter/.test(a.font), `${w}px ${v}: set in Inter`, a.font);
      eq(a.side, 0, `${w}px ${v}: one block, no panel beside the form`);
      eq([a.gradients, a.pattern, a.colour], [[], 0, []], `${w}px ${v}: no gradient, no pattern, no colour but the logo, the links and the main button`);
    }
    // the legal pages: light too since 2026-10-11
    await p.evaluate(() => A['pub-go']({ v: 'terms' })); await p.waitForSelector('#legal-title'); eq(await p.evaluate(() => [getComputedStyle(document.body).backgroundColor, getComputedStyle(document.querySelector('#legal-title')).color]), ['rgb(242, 244, 238)', 'rgb(14, 15, 12)'], `${w}px: the legal pages are light as the home page`);
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
    // layout (second look, 2026-10-11): one card split in two; on a computer the heading, the dreams, the amounts and the way in on the left and the answer
    // with its tip on the right, in mint; on a phone the answer right under the dreams, above the sliders, and the way in last
    eq(await p.evaluate(() => { const r = sel => document.querySelector(sel).getBoundingClientRect(), card = r('.l2-calc'), dreams = r('.calc-dreams'), inn = r('.calc-in'), out = r('#calc-out'), more = r('#calc-more'), go = r('.calc-go'), h2 = document.querySelector('#lp-calc h2');
        const inside = [...document.querySelectorAll('.l2-calc *')].every(e => { const a = e.getBoundingClientRect(); return !a.width || (a.left >= card.left - .5 && a.right <= card.right + .5); });
        return [dreams.bottom <= inn.top + 1, innerWidth > 900 ? inn.right <= out.left + 1 && out.bottom <= more.top + 1 && inn.bottom <= go.top + 1 && go.right <= more.left + 1 : dreams.bottom <= out.top + 1 && out.bottom <= inn.top + 1 && inn.bottom <= more.top + 1 && more.bottom <= go.top + 1, inside,
          Math.round(h2.getBoundingClientRect().height / parseFloat(getComputedStyle(h2).lineHeight)) <= 2, document.documentElement.scrollWidth - innerWidth, [getComputedStyle(document.querySelector('#calc-out')).backgroundColor, getComputedStyle(document.querySelector('.l2-calc')).backgroundColor],
          [...document.querySelectorAll('#calc-tool button, #calc-tool input[type=range]')].every(e => innerWidth > 900 || e.getBoundingClientRect().height >= 44)]; }),
      [true, true, true, true, 0, ['rgb(226, 246, 213)', 'rgb(255, 255, 255)'], true], `${w}px calculator: ${w > 900 ? 'the dreams over the amounts and the way in on the left, the answer on the right with the tip under it' : 'the answer right under the dreams and above the sliders, so it is in sight while one is dragged, then the tip, then the way in'}; nothing spills out of the card (white, the answer in mint), the heading is two lines at most${w > 900 ? '' : ', and everything to press is 44px tall'}`);
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
      // v199: in the summary's look the page's column is its parts' (each with the bar's margins), the forest tops running the full width with their content on it
      const m = await page.evaluate(() => { const b = e => e.getBoundingClientRect(), wk = b(document.querySelector('.work')), c = document.querySelector('.content'), cs = getComputedStyle(c), land = document.documentElement.classList.contains('land');
        const top = document.querySelector('#view > .bq-dhero, #view > .bq-hero, #view > .bq-tx > .bq-txtop'), ts = top && getComputedStyle(top), first = [...c.children].find(e => !e.matches('.bq-dhero, .bq-hero, .bq-tx'));
        const [l, rt] = land ? (top ? [b(top).left + parseFloat(ts.paddingLeft), b(top).right - parseFloat(ts.paddingRight)] : [b(first).left, b(first).right]) : [b(c).left + parseFloat(cs.paddingLeft), b(c).right - parseFloat(cs.paddingRight)];
        return { left: Math.round(l - wk.left), right: Math.round(wk.right - rt), wide: Math.round(rt - l), h1: Math.round(b(document.querySelector('.topbar h1')).left - l), btn: Math.round(rt - b(document.querySelector('.topbar .btn.primary')).right), bar: Math.round(b(document.querySelector('.topbar')).width - wk.width), over: Math.max(0, document.documentElement.scrollWidth - innerWidth) }; });      // nothing wider than the window (the page itself stops short of the room kept for its scroll bar)
      if (r === 'dashboard') eq(await page.evaluate(() => getComputedStyle(document.querySelector('.topbar h1')).fontSize), '20px', `${w}px: the page title in the bar is 20px (owner, 2026-10-05)`);
      eq([Math.abs(m.left - m.right) <= 1, m.wide <= 1336, m.left >= 32, m.h1, m.btn, m.bar, m.over], [true, true, true, 0, 0, 0, 0], `${w}px ${r}: the page is centred beside the menu, 1336px wide at most; the bar's title and main button stand over its edges; the bar itself runs the full width`, m); }
    await browser.close();
  }
  // the menu (owner, 2026-10-05): no names over its two groups, one faint line between them; each icon moves once when its row is pointed at
  { const { browser, page } = await open({ lang: 'pt', plan: true, account: 'example', viewport: { width: 1440, height: 900 }, motion: 'no-preference' });
    eq(await page.evaluate(() => { const n = document.querySelector('#nav'), kids = [...n.children], r = n.querySelector('.nav-rule'), cs = getComputedStyle(r), probe = document.createElement('i');
      probe.style.cssText = 'position:absolute;background:var(--line)'; document.querySelector('.rail').appendChild(probe); const line = getComputedStyle(probe).backgroundColor; probe.remove();      // the side bar's border colour (v199: on the forest)
      return [document.querySelectorAll('.nav-group').length, kids.map(e => e.tagName[0]).join(''), r.getAttribute('role'), cs.height, cs.backgroundColor === line, n.innerText.includes('CASA') || n.innerText.includes('DADOS')]; }),
      [0, 'AAAAAAADAAAAA', 'separator', '1px', true, false], 'menu: seven links, one hairline in the border colour, five links (Open Finance among them; the converter is the company’s); no group names');
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
