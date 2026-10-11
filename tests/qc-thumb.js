// QC of the phone under a thumb (owner, 2026-10-07: "the whole mobile version must be thought out and optimised for the thumb; if something
// does not fit or has limits, the person will have to use a computer; this is for the less important parts").
// On every screen, panel and step a phone shows, at 390 and at 320 px, in Spanish and Portuguese (the longest words), this suite measures:
//   1. nothing pressable under 44 px either way. Measured as a finger meets it: the point 21 px above, below, left and right of its centre
//      must still land on it (so an enlarged hit area counts, and a neighbour lying over it does not);
//   2. no text under 12 px. The exceptions, on purpose: the four names in the bar at the foot (10 to 10.5 px, as phones' own bars) and the names under
//      the quick actions' circles (10.5 px, owner, 2026-10-09);
//   3. nothing to drag sideways, except the rows made to be swiped (the quick things to do, the month's figures on the dashboard, and the month
//      itself, features/phone/phone.month.js);
// and that what was left to the computer (features/phone/desk-only.js) is a note on a phone, the real thing on a tablet and a computer.
const { open, ok, eq, done } = require('./pw.js');

const measure = () => {
  const vis = e => { const r = e.getBoundingClientRect(), c = getComputedStyle(e); return r.width > 0 && r.height > 0 && c.visibility !== 'hidden' && c.display !== 'none' && +c.opacity > 0.05; };
  const pick = sel => [...document.querySelectorAll(sel)].filter(vis);
  const scope = pick('.lock').length ? pick('.lock') : pick('.modal').length ? pick('.modal') : pick('.drawer, .sheet').length ? pick('.drawer, .sheet')
    : pick('#public > *').length ? pick('#public') : [document.querySelector('#view'), document.querySelector('#topbar'), document.querySelector('#tabbar'), document.querySelector('#curio-root')].filter(Boolean);
  const name = e => { const cls = String(e.className && e.className.baseVal !== undefined ? e.className.baseVal : e.className || '').trim().split(/\s+/).filter(Boolean).slice(0, 3).join('.'); return e.tagName.toLowerCase() + (e.id ? '#' + e.id.replace(/\d+/g, 'N') : '') + (cls ? '.' + cls : '') + (e.dataset && e.dataset.a ? '[' + e.dataset.a + ']' : '') + (e.dataset && e.dataset.c ? '{' + e.dataset.c + '}' : ''); };
  const small = [], tiny = [], wide = [];
  const own = (el, hit) => !!hit && (hit === el || el.contains(hit) || (hit.tagName === 'LABEL' && hit.contains(el)) || (el.id && hit.closest && !!hit.closest(`label[for="${CSS.escape(el.id)}"]`)) || (hit.closest && !!hit.closest('label') && hit.closest('label').contains(el)));
  for (const root of scope) for (const el of root.querySelectorAll('button, a[href], select, input:not([type=hidden]), textarea, summary, [role=button], [role=switch], [tabindex="0"], tr.click, label.sw, label.btn')) {
    if (!vis(el) || el.disabled || el.closest('[inert]') || (el.type === 'file' && el.classList.contains('sr'))) continue;
    if ((el.tagName === 'A' || el.classList.contains('linkbtn')) && el.closest('p, .note, small, li, .banner, dd, .lead, .auth-alt, .ob-later, .lp-legal, .legal-foot, label.check') && !el.classList.contains('btn')) continue;      // a link inside a sentence is read, then pressed: it follows the text's size
    el.scrollIntoView({ block: 'center', inline: 'center' });
    const r = el.getBoundingClientRect(), cx = Math.min(innerWidth - 2, Math.max(2, r.left + r.width / 2)), cy = r.top + r.height / 2;
    const at = (dx, dy) => own(el, document.elementFromPoint(Math.min(innerWidth - 1, Math.max(1, cx + dx)), cy + dy));
    if (!at(0, 0)) continue;      // not pressable where it stands (a chart's bar on a phone, something under the bar at the foot)
    const tall = at(0, -21) && at(0, 21), broad = r.width >= 44 || (at(-21, 0) && at(21, 0));
    if (!tall || !broad) small.push(`${name(el)} ${Math.round(r.width)}x${Math.round(r.height)}`);
  }
  for (const root of scope) { const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let n;
    while ((n = walk.nextNode())) { if (!n.nodeValue.trim()) continue; const p = n.parentElement; if (!p || !vis(p) || p.closest('.sr, svg, option, [aria-hidden="true"], #tabbar, .quick-row')) continue; const fs = parseFloat(getComputedStyle(p).fontSize); if (fs < 12) tiny.push(`${name(p)} ${fs}px “${n.nodeValue.trim().slice(0, 18)}”`); } }
  for (const root of scope) for (const el of [root, ...root.querySelectorAll('*')]) { const c = getComputedStyle(el); if (/(auto|scroll)/.test(c.overflowX) && el.scrollWidth > el.clientWidth + 6 && vis(el) && !el.matches('.quick-row, .kpis, .lp-shots, .lp-rail, .m-strip, .ins-row')) wide.push(`${name(el)} ${el.scrollWidth}>${el.clientWidth}`); }
  // a panel hides what is wider than itself, so that is looked for directly: nothing in it may reach past its own edges
  for (const root of scope) if (root.matches('.drawer, .sheet, .modal')) { const box = root.getBoundingClientRect(); for (const el of root.querySelectorAll('input, select, textarea, button, a, .seg, .field, .form-grid, table, .banner')) { if (!vis(el)) continue; const r = el.getBoundingClientRect(); if (r.right > box.right + 0.5 || r.left < box.left - 0.5) wide.push(`${name(el)} sticks out of its panel`); } }
  const page = document.documentElement.scrollWidth - innerWidth;
  return { small: [...new Set(small)].slice(0, 8), tiny: [...new Set(tiny)].slice(0, 8), wide: [...new Set(wide)].slice(0, 4), page: page > 0 ? page : 0 };
};

(async () => {
  let states = 0;
  for (const [lang, w, h] of [['es', 390, 844], ['pt', 320, 568]]) {
    const tag = `${lang}, ${w}px`;
    const check = async (page, what) => { await page.waitForTimeout(200); await page.evaluate(() => { const tr = document.querySelector('#toast-root'); if (tr) tr.innerHTML = ''; });      /* a passing message lies over the top of the screen for a few seconds: it is not part of what is measured */
      const m = await page.evaluate(measure); states++; eq([m.small, m.tiny, m.wide, m.page], [[], [], [], 0], `${tag}, ${what}: a thumb can hit everything, no text under 12 px, nothing to drag sideways`); };

    // ---------- before the account: log in, sign up, the first-time setup ----------
    let { browser, page, errors } = await open({ lang, viewport: { width: w, height: h }, touch: true, mobile: true, server: { confirmEmail: false } });
    for (const v of ['login', 'signup', 'forgot']) { await page.evaluate(v => A['pub-go']({ v }), v); await page.waitForSelector('#au-email'); await check(page, `the ${v} screen`); }
    await page.evaluate(() => A['pub-go']({ v: 'signup' })); await page.fill('#au-name', 'Ana'); await page.fill('#au-email', 'ana@example.org'); await page.fill('#au-pass', 'UmaSenha2026'); await page.check('#au-accept'); await page.click('[data-a="auth-signup"]');
    await page.waitForSelector('#ob-name'); await check(page, 'setup, the name'); await page.click('.ob-dream'); await check(page, 'setup, a dream chosen');
    await page.click('[data-a="onboard-save"]'); await page.waitForSelector('#ob-pay0'); await check(page, 'setup, the numbers');
    await page.click('[data-a="ob-next"]'); await page.waitForSelector('[data-a="ob-finish"]'); await check(page, 'setup, the projection');
    eq(await page.evaluate(() => [...document.querySelectorAll('[data-a="ob-finish"]')].some(b => b.dataset.go === 'sheet')), false, `${tag}: the setup does not offer the spreadsheet import on a phone (it is left to the computer)`);
    await page.click('[data-a="ob-finish"]'); await page.waitForFunction(() => !!UI.session); await page.evaluate(() => navigate('dashboard')); await page.waitForSelector('#first-steps'); await check(page, 'a new account’s dashboard, with its first steps');
    eq(await page.evaluate(() => document.querySelectorAll('#first-steps [data-a="sheet-go"]').length), 0, `${tag}: nor do the first steps`);
    eq(errors, [], `${tag}, before the account: no error in the console`); await browser.close();

    // ---------- the app, with the example account ----------
    ({ browser, page, errors } = await open({ lang, account: 'example', plan: true, viewport: { width: w, height: h }, touch: true, mobile: true }));
    const routes = await page.evaluate(() => ROUTES.map(r => r[0]));
    for (const r of routes) { await page.evaluate(r => navigate(r), r); await check(page, `the ${r} screen`); }
    await page.evaluate(() => A.space({ v: 'business' })); await page.waitForTimeout(350);
    for (const r of ['dashboard', 'transactions', 'plan', 'goals', 'reports', 'accounts', 'categories', 'converter', 'imports', 'settings']) { await page.evaluate(r => navigate(r), r); await check(page, `the company’s ${r} screen`); }
    await page.evaluate(() => A.space({ v: 'personal' })); await page.waitForTimeout(350);
    // every panel and sheet
    const panels = { 'a new transaction': () => A['new-tx'](), 'a new transaction, with More options open': () => { A['new-tx'](); A['tx-more'](); }, 'a transaction opened': () => A['open-tx']({ id: S.transactions[0].id }), 'a transfer': () => { A['new-tx'](); A['tx-type']({ v: 'transfer' }); },
      'a split transaction': () => { A['new-tx'](); UI.drawer.draft.amountText = '100'; A['split-on'](); UI.drawer.more = true; renderOverlay(); }, 'a new account': () => A['edit-account']({ id: '' }), 'a new goal': () => A['goal-new']({}), 'a goal opened': () => A['goal-open']({ id: S.goals[0].id }),
      'money into a goal': () => A['goal-move']({ id: S.goals[0].id, dir: 'in' }), 'a new fixed cost': () => A['line-new']({}), 'a fixed cost opened': () => A['line-open']({ id: S.plan.lines[0].id, ym: S.month }), 'paying a bill': () => A['line-pay']({ id: S.plan.lines.find(l => l.pay === 'variable').id }),
      'paying the card': () => A['card-pay']({ id: S.accounts.find(a => a.type === 'credit').id }), 'the reminders': () => A.reminders(), 'the due days': () => A['due-days']({}), 'the transaction filters': () => { navigate('transactions'); A['tx-filters'](); }, 'More': () => A.sheet(), 'the quick things to do': () => A.quick(), 'the quick things to do, all of them': () => { A.quick(); A['quick-all'](); },
      'days of freedom': () => A['runway-edit'](), 'what if': () => A['whatif']({}), 'a fund movement': () => A['fii-move']({ kind: 'buy' }), 'a fund opened': () => A['fii-open']({ id: fiiTickers(S)[0] }), 'an OFX profile': () => A['edit-profile']({ id: '' }), 'the contact form': () => A.contact(), 'the install steps': () => { UI.drawer = { kind: 'install', title: t('Add Dorax to your Home Screen') }; renderOverlay(); } };
    for (const [what, fn] of Object.entries(panels)) {
      await page.evaluate(() => { UI.drawer = null; UI.sheet = false; UI.modal = null; renderOverlay(); renderModal(); navigate('dashboard'); });
      const opened = await page.evaluate(`(() => { try { (${fn.toString()})(); return !!(UI.drawer || UI.sheet) || 'nothing opened'; } catch (e) { return 'threw: ' + e.message; } })()`);
      if (opened !== true) { ok(false, `${tag}, the panel “${what}” opens`, opened); continue; }
      await check(page, `the panel “${what}”`);
    }
    // every date field, wherever it is: drawn as a plain field that takes the width it is given (an iPhone's own date control does not), inside its panel
    for (const [what, fn] of [['a new transaction', () => A['new-tx']()], ['money into a goal', () => A['goal-move']({ id: S.goals[0].id, dir: 'in' })], ['paying a bill', () => A['line-pay']({ id: S.plan.lines.find(l => l.pay === 'variable').id })], ['a fund movement', () => A['fii-move']({ kind: 'buy' })]]) {
      await page.evaluate(() => { UI.drawer = null; UI.sheet = false; renderOverlay(); navigate('dashboard'); }); await page.evaluate(`(${fn.toString()})()`);
      eq(await page.evaluate(() => { const ds = [...document.querySelectorAll('.drawer input[type=date]')], body = document.querySelector('.drawer .body'), pad = parseFloat(getComputedStyle(body).paddingRight), edge = body.getBoundingClientRect().right - pad;
        return [ds.length > 0, ds.every(d => { const c = getComputedStyle(d), r = d.getBoundingClientRect(); return (c.appearance || c.webkitAppearance) === 'none' && c.minWidth === '0px' && c.maxWidth === '100%' && c.display === 'block' && r.right <= edge + 0.5 && r.height >= 44 && parseFloat(c.fontSize) >= 16; }), getComputedStyle(body).overflowX, body.scrollWidth <= body.clientWidth]; }),
        [true, true, 'hidden', true], `${tag}, ${what}: its date field is a plain field no wider than its place, and the panel cannot be dragged sideways`);
    }
    await page.evaluate(() => { UI.drawer = null; UI.sheet = false; renderOverlay(); });
    // a question asked in the middle of the screen, a filter chip, the notice of a curiosity, the closed screen
    await page.evaluate(() => { navigate('transactions'); A['open-tx']({ id: S.transactions[0].id }); A['ask-delete'](); }); await check(page, 'a question before deleting');
    await page.evaluate(() => { A['modal-cancel'](); A.close(); UI.tx.category = S.categories[0].id; render(); }); await check(page, 'transactions with a filter on');
    await page.evaluate(() => { navigate('profile'); }); await page.click('[data-a="guard-pin-open"][data-v="new"]'); await check(page, 'the profile, choosing a PIN');
    await page.fill('#gp-new', '2580'); await page.fill('#gp-again', '2580'); await page.click('[data-a="guard-pin-save"]'); await page.waitForSelector('#guard-after'); await check(page, 'the profile, with the lock on');
    await page.evaluate(() => lockNow()); await check(page, 'the closed screen'); await page.evaluate(() => A['lock-forgot']()); await check(page, 'the closed screen, a forgotten PIN'); await page.evaluate(() => { A['lock-back'](); unlock(); });

    // ---------- what is left to the computer ----------
    const notes = await page.evaluate(() => { const out = {}; for (const [r, key] of [['plan', 'plan-year'], ['goals', 'goal-year'], ['categories', 'rules'], ['converter', 'converter'], ['openfinance', 'openfinance']]) { navigate(r); const n = document.querySelector('#desk-' + key);
        out[key] = [!!n, n ? n.querySelector('h2').innerText.trim().length > 10 && n.querySelector('p').innerText.trim().length > 30 : false, document.querySelectorAll('#view .tbl.plan, #view #rules-tbl, #view input[type=file], #view [data-a="conv-start"], #view [data-a="bank-start"]').length]; } return out; });
    eq(notes, { 'plan-year': [true, true, 0], 'goal-year': [true, true, 0], 'rules': [true, true, 0], 'converter': [true, true, 0], 'openfinance': [true, true, 0] }, `${tag}: each part left to the computer is a note that says so and why, and the part itself is not drawn (imports came back to phones, 2026-10-10)`);
    eq(await page.evaluate(() => { navigate('plan'); const a = [!!document.querySelector('#paylist'), !!document.querySelector('.payrow, [data-a="add-pay"]')]; navigate('goals'); a.push(document.querySelectorAll('#view [data-a="goal-move"], #view [data-a="goal-pick"]').length > 0, !!document.querySelector('#goal-money')); navigate('categories'); a.push(document.querySelectorAll('.cat-card').length > 0); return a; }), [true, true, true, true, true],
      `${tag}: what those screens are for stays on the phone: the month’s bills and income, the goals and where the money is, the categories`);
    await page.evaluate(() => A.sheet());
    eq(await page.evaluate(() => { const links = [...document.querySelectorAll('.sheet .nav a')].map(a => a.getAttribute('href').slice(1)), n = document.querySelector('#sheet-desk'); return [links.some(l => ['converter', 'openfinance'].includes(l)), links.includes('imports'), !!n && n.innerText.includes(routeLabel('openfinance')) && !n.innerText.includes(routeLabel('imports')) && !n.innerText.includes(routeLabel('converter'))]; }), [false, true, true], `${tag}: More lists only where a phone can go, Imports among them (2026-10-10); one line names what is on the computer (the converter is the company’s)`);
    await page.evaluate(() => { A.close(); A.quick(); A['quick-all'](); });
    eq(await page.evaluate(() => [...document.querySelectorAll('.sheet.quick [data-v]')].map(b => b.dataset.v).includes('import')), true, `${tag}: the quick things to do offer a statement import again (imports came back to phones, 2026-10-10)`);
    await page.evaluate(() => A.close());
    eq(errors, [], `${tag}, the app: no error in the console`); await browser.close();
  }

  // ---------- a tablet and a computer keep everything ----------
  for (const [w, h, mobile] of [[820, 1100, true], [1280, 900, false]]) {
    const { browser, page, errors } = await open({ lang: 'en', account: 'example', plan: true, viewport: { width: w, height: h }, touch: mobile, mobile });
    eq(await page.evaluate(() => { const out = []; navigate('plan'); out.push(!!document.querySelector('#plan-year .tbl.plan') || (A['plan-year-open'](), !!document.querySelector('#overlay #plan-year .tbl.plan'))); A.close(); navigate('goals'); out.push(!!document.querySelector('#goal-year .tbl.plan')); navigate('categories'); out.push(!!document.querySelector('#rules-tbl')); navigate('imports'); out.push(!!document.querySelector('#imp-file-csv')); navigate('converter'); out.push(!!document.querySelector('[data-a="conv-start"]'));
      navigate('dashboard'); out.push(document.querySelectorAll('.desk-note').length, smallPhone(), deskOnly('imports')); return out; }), [true, true, true, true, true, 0, false, false], `${w}px: the year’s grids, the rules, the imports and the converter are all there, and nothing says “on the computer”`);
    eq(errors, [], `${w}px: no error in the console`); await browser.close();
  }
  // a phone turned into a wide window, and back: the screen is drawn again as the other version
  { const { browser, page, errors } = await open({ lang: 'en', account: 'example', plan: true, viewport: { width: 390, height: 844 }, touch: true, mobile: true });
    await page.evaluate(() => navigate('plan')); const a = await page.evaluate(() => [!!document.querySelector('#desk-plan-year'), !!document.querySelector('#plan-year')]);
    await page.setViewportSize({ width: 1100, height: 844 }); await page.waitForFunction(() => !!document.querySelector('[data-a="plan-year-open"]')); const b = await page.evaluate(() => [!!document.querySelector('#desk-plan-year'), !!document.querySelector('[data-a="plan-year-open"]')]);      // a computer: the year one click away (2026-10-11)
    await page.setViewportSize({ width: 390, height: 844 }); await page.waitForFunction(() => !!document.querySelector('#desk-plan-year'));
    eq([a, b], [[true, false], [false, true]], 'made wide, the note gives way to the year (one click away); made narrow again, the note is back');
    eq(await page.evaluate(() => [Array.isArray(DESK_ONLY), DESK_ONLY.slice().sort()]), [true, ['converter', 'goal-year', 'openfinance', 'plan-year', 'rules', 'sheet']], 'what goes to the computer is one list, in one file (statements came back to phones, 2026-10-10; spreadsheets stay)');
    eq(errors, [], 'resizing: no error in the console'); await browser.close(); }
  ok(states >= 120, `${states} screens, panels and steps were measured`, states);
  done('qc-thumb');
})();
