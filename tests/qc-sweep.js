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
      const bad = m.text.match(BAD); ok(!bad, `${lang} ${w}px public ${v}: no broken value`, bad && m.text.slice(Math.max(0, bad.index - 60), bad.index + 40));
      ok(!m.light, `${lang} ${w}px public ${v}: stays dark`);
      if (v === 'landing') { ok(!/emailed link|link sent to your email|enlace que llega|link enviado/i.test(m.text), `${lang} ${w}px: the home page no longer promises a login by link`); ok(/Google/.test(m.text), `${lang} ${w}px: the home page mentions Google login`); }
    }
    eq(errors, [], `${lang} ${w}px public: no console errors`);
    await browser.close();
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
        const did = await page.evaluate(i => { const el = [...document.querySelectorAll('#view [data-a], #topbar [data-a], #view tr.click')][i]; if (!el || el.disabled || /logout|delete|wipe|export|calendar|theme|copy|download|lang/.test(el.dataset.a || '')) return false; el.click(); return true; }, i);
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
  done('qc-sweep');
})().catch(e => { console.error(e); process.exit(1); });
