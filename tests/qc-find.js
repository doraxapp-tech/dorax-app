// QC of the search (owner, 2026-10-06: "add search bar under the logo in the sidebar (activate using (F)) user can search anything
// there", with a picture of a find panel as the example).
//   1. the field is under the logo; F opens the panel from anywhere, but never while something is being typed, and Ctrl+F stays the browser's;
//   2. everything of the side on screen can be found: pages, actions, accounts, fixed costs and goals, categories, investments, transactions
//      (by merchant, note or amount), with or without accents; nothing of the other side (owner, 2026-10-09: "the accounts do not mix");
//   3. choosing a result goes there;
//   4. it works with the keyboard alone and says so to a screen reader; Escape gives the focus back;
//   5. nothing typed by the person is ever read as markup; a phone gets in through More.
const { open, ok, eq, done, TARGET } = require('./pw.js');

(async () => {
  const tag = TARGET + ': ';
  const quiet = p => p.waitForFunction(() => !document.querySelector('#toast-root').innerText.trim(), null, { timeout: 15000 }).catch(() => {});
  {
    const o = await open({ lang: 'en', account: 'example', plan: true, viewport: { width: 1440, height: 900 } }), p = o.page;
    const titles = () => p.evaluate(() => [...document.querySelectorAll('#find-list .find-o')].map(b => b.querySelector('b').innerText.trim()));
    const rows = () => p.evaluate(() => [...document.querySelectorAll('#find-list .find-o')].map(b => [b.querySelector('b').innerText.trim(), b.querySelector('small').innerText.trim()]));
    const type = async q => { await p.fill('#find-q', q); };
    // ---------------------------------------------------------------- 1. the field and the key
    eq(await p.evaluate(() => { const b = document.querySelector('#rail-find .findbtn'), r = b.getBoundingClientRect(), logo = document.querySelector('.rail .brand').getBoundingClientRect(), nav = document.querySelector('#nav').getBoundingClientRect(), rail = document.querySelector('.rail').getBoundingClientRect();
      return [b.tagName, b.innerText.replace(/\s+/g, ' ').trim(), b.getAttribute('aria-keyshortcuts'), b.getAttribute('aria-haspopup'), !!b.querySelector('svg'), b.querySelector('kbd').innerText, r.top >= logo.bottom - 1 && r.bottom <= nav.top + 1, r.left >= rail.left + 8 && r.right <= rail.right - 8, r.height >= 32, !!document.querySelector('#find-q')]; }),
      ['BUTTON', 'Search F', 'F', 'dialog', true, 'F', true, true, true, false], tag + 'the search field is under the logo and over the menu, inside the side bar, and shows the key that opens it: F');
    await p.evaluate(() => { document.activeElement.blur(); }); await p.keyboard.press('f'); await p.waitForSelector('#find-q');
    eq(await p.evaluate(() => { const d = document.querySelector('.find'), q = document.querySelector('#find-q'), r = d.getBoundingClientRect(); return [document.activeElement.id, q.value, d.getAttribute('role'), d.getAttribute('aria-modal'), q.getAttribute('role'), q.getAttribute('aria-controls'), document.querySelector('#find-list').getAttribute('role'), q.getAttribute('aria-activedescendant'), document.querySelector('.app').inert, Math.abs((r.left + r.right) / 2 - (a => (a.left + a.right) / 2)(document.querySelector('.app').getBoundingClientRect())) <= 2, r.top >= 40 && r.bottom <= innerHeight - 20, getComputedStyle(d).boxShadow]; }),
      ['find-q', '', 'dialog', 'true', 'combobox', 'find-list', 'listbox', 'find-o-0', true, true, true, 'none'], tag + 'F opens a panel in the middle, near the top, with the field focused and empty (the F itself is not typed); the page behind cannot be reached; no shadow');
    const first = await rows();
    eq([first.slice(0, 8).map(r => r[0]), first.slice(0, 8).every(r => r[1] === 'Action'), first.slice(8).map(r => r[0]), first.slice(8).every(r => r[1] === 'Page')],
      [['Add transaction', 'New fixed cost', 'New goal', 'Add account', 'Reminders', 'Due days', 'Spending limits', 'Help'], true, ['Dashboard', 'Transactions', 'Plan', 'Goals', 'Investments', 'Reports', 'Accounts & savings', 'Imports', 'Open Finance', 'Recurring', 'Categories & rules', 'Settings', 'Profile'], true],
      tag + 'before anything is typed it offers what is done most and every page of the side, each saying what it is');
    await p.keyboard.press('Escape');
    eq(await p.evaluate(() => [UI.find, !!document.querySelector('#find-q'), document.querySelector('.app').inert]), [null, false, false], tag + 'Escape closes it and the page is back');
    // F does nothing while typing, with Ctrl, or under another panel
    await p.evaluate(() => { navigate('profile'); document.querySelector('#pf-name').focus(); }); await p.keyboard.type('f');
    eq(await p.evaluate(() => [UI.find, document.querySelector('#pf-name').value.replace(S.user.name, '')]), [null, 'f'], tag + 'in a field, F is just the letter f');
    await p.evaluate(() => { const el = document.querySelector('#pf-name'); el.value = S.user.name; el.blur(); navigate('dashboard'); });
    await p.keyboard.press('Control+f'); eq(await p.evaluate(() => UI.find), null, tag + 'Ctrl+F is left to the browser');
    await p.evaluate(() => A.reminders()); await p.keyboard.press('f'); eq(await p.evaluate(() => [UI.find, UI.drawer.kind]), [null, 'reminders'], tag + 'under an open panel F does nothing'); await p.evaluate(() => A.close());
    await p.click('#rail-find .findbtn'); await p.waitForSelector('#find-q');
    eq(await p.evaluate(() => document.activeElement.id), 'find-q', tag + 'a click on the field opens it too');

    // ---------------------------------------------------------------- 2. what can be found
    await type('plan'); eq((await rows())[0], ['Plan', 'Page'], tag + 'a page, by its name');
    await type('GOAL'); ok((await titles()).slice(0, 2).join('|') === 'New goal|Savings & goals' || (await titles())[0] === 'New goal' || (await titles()).slice(0, 2).join('|') === 'Goals|New goal', tag + 'capitals do not matter', await titles());
    const acc = await p.evaluate(() => S.accounts.map(a => [a.name, a.institution, a.currency, a.scope]));
    await type('wise usd'); ok(!(await titles()).includes('Wise USD'), tag + 'on the household’s side a company account is not found', await titles());
    const line = await p.evaluate(() => S.plan.lines[0].name), goal = await p.evaluate(() => S.goals[0].name), cat = await p.evaluate(() => S.categories[0].name);
    await type(line); ok((await rows()).some(r => r[0] === line && r[1] === 'Fixed cost · Household'), tag + 'a household fixed cost', await rows());
    await type(goal); ok((await rows()).some(r => r[0] === goal && /^(Goal|Fund) · Household$/.test(r[1])), tag + 'a household goal or fund', await rows());
    await type(cat); ok((await rows()).some(r => r[0] === cat && r[1] === 'Category'), tag + 'a category', await rows());
    // the company's side, an investment, and an accent
    await p.keyboard.press('Escape');
    await p.evaluate(() => { navigate('plan'); A.space({ v: 'business' }); A['line-new'](); Object.assign(UI.drawer.draft, { name: 'Contador Pérez', catId: 'co-services', amountText: '189', due: '10' }); A['line-save'](); A.close(); A['space-cur']({ v: 'USD' }); S.accounts.push({ id: 'qa-usd-save', name: 'Wise USD reserve', institution: 'Wise', type: 'savings', currency: 'USD', scope: 'business', monthly: false, purpose: '', opening: 0 }); navigate('goals'); A['goal-new'](); Object.assign(UI.drawer.draft, { name: 'Laptop fund', kind: 'fund', monthlyText: '100' }); A['goal-save'](); A.close(); A.space({ v: 'personal' }); navigate('dashboard');
      S.fii.assets.MXRF11 = S.fii.assets.MXRF11 || { price: 1000 }; S.transactions.unshift({ id: 'tfind', accountId: personal()[0].id, date: S.today, description: 'PADARIA SÃO JOÃO 0042', merchant: 'Padaria São João', amount: -4321, currency: 'BRL', type: 'expense', categoryId: 'other', subcategoryId: null, status: 'confirmed', notes: 'café da manhã', source: 'manual', splits: null, fingerprint: 'x' }); render(); }); await quiet(p);
    await p.evaluate(() => A.space({ v: 'business' })); await p.waitForTimeout(200);      // the company's side: its own things
    await p.keyboard.press('f'); await p.waitForSelector('#find-q');
    await type('perez'); eq((await rows())[0], ['Contador Pérez', 'Fixed cost · Company BRL'], tag + 'a company fixed cost, found without its accent, saying its side and currency');
    await type('laptop'); eq((await rows())[0], ['Laptop fund', 'Fund · Company USD'], tag + 'a company fund in dollars');
    await type('wise usd'); eq((await rows())[0], ['Wise USD', 'Account · Wise · USD'], tag + 'a company account, by two words in any order of what it is called');
    await type('usd wise'); eq((await titles())[0], 'Wise USD', tag + 'the words can come in any order');
    await type('padaria'); ok(!(await titles()).includes('Padaria São João'), tag + 'on the company’s side a household transaction is not found');
    await p.keyboard.press('Escape'); await p.evaluate(() => A.space({ v: 'personal' })); await p.waitForTimeout(200);
    await p.keyboard.press('f'); await p.waitForSelector('#find-q');
    await type('perez'); ok(!(await titles()).includes('Contador Pérez'), tag + 'on the household’s side a company fixed cost is not found');
    await type('mxrf'); eq((await rows())[0], ['MXRF11', 'Investment'], tag + 'an investment, by its ticker');
    await type('sao joao'); eq((await rows()).filter(r => r[1].startsWith('Transaction'))[0], ['Padaria São João', 'Transaction · ' + (await p.evaluate(() => fmt.date(S.today, true))) + ' · ' + acc.find(a => a[3] !== 'business')[0] + ' · −R$ 43,21'], tag + 'a transaction by its merchant, without accents, with its day, account and amount');
    await type('cafe manha'); eq((await titles()).includes('Padaria São João'), true, tag + 'a transaction by its note');
    await type('43,21'); eq((await titles())[0], 'Padaria São João', tag + 'a transaction by its amount');
    await type('0042'); eq((await titles()).includes('Padaria São João'), true, tag + 'a transaction by the bank’s own description');
    ok((await p.evaluate(() => { UI.find.q = 'a'; return findResults('a').filter(x => x.kind === 7).length; })) <= 8, tag + 'transactions never crowd the list: eight at most, the newest');
    // nothing found
    await type('zzzzqq');
    eq(await p.evaluate(() => [document.querySelectorAll('#find-list .find-o').length, document.querySelector('.find-none b').innerText.trim(), document.querySelector('.find-none span').innerText.trim(), document.querySelector('#find-q').getAttribute('aria-activedescendant')]), [0, 'Nothing matches “zzzzqq”', 'Try a name, a merchant or an amount.', null], tag + 'when nothing matches it says so, and what to try');
    // what the person types is text, never markup
    await type('<img src=x onerror="window.__x=1"><b>hi');
    eq(await p.evaluate(() => [document.querySelectorAll('#find-root img, #find-root .find-none b b').length, window.__x === undefined, document.querySelector('.find-none b').innerText.includes('<img')]), [0, true, true], tag + 'markup typed into the search is shown as text');
    await p.evaluate(() => { S.accounts[0].k = undefined; const was = S.accounts[0].name; S.accounts[0].name = '<i id="inj">x</i> Bank'; window.__was = was; }); await type('bank');
    eq(await p.evaluate(() => { const r = [!!document.querySelector('#inj'), [...document.querySelectorAll('#find-list b')].some(b => b.innerText.includes('<i id="inj">'))]; S.accounts[0].name = window.__was; return r; }), [false, true], tag + 'so is markup in a name of the account');

    // ---------------------------------------------------------------- 3. the keyboard, and going there
    await type('');
    await p.keyboard.press('ArrowDown'); await p.keyboard.press('ArrowDown');
    eq(await p.evaluate(() => [UI.find.i, document.querySelector('#find-q').getAttribute('aria-activedescendant'), [...document.querySelectorAll('.find-o[aria-selected="true"]')].map(b => b.id), document.activeElement.id]), [2, 'find-o-2', ['find-o-2'], 'find-q'], tag + 'the arrows move through the results; the field keeps the focus and names the result it is on');
    await p.keyboard.press('ArrowUp'); await p.keyboard.press('ArrowUp'); await p.keyboard.press('ArrowUp');
    eq(await p.evaluate(() => [UI.find.i === UI.find.items.length - 1, (r => { const l = document.querySelector('#find-list').getBoundingClientRect(); return r.top >= l.top - 1 && r.bottom <= l.bottom + 1; })(document.querySelector('.find-o[aria-selected="true"]').getBoundingClientRect())]), [true, true], tag + 'going up from the first lands on the last, scrolled into view');
    await p.keyboard.press('Tab'); eq(await p.evaluate(() => [UI.find.i, document.activeElement.id]), [0, 'find-q'], tag + 'Tab moves through the results too and never leaves the panel');
    await type('reports'); await p.keyboard.press('Enter');
    eq(await p.evaluate(() => [UI.route, UI.find, document.querySelector('.app').inert]), ['reports', null, false], tag + 'Enter on a page opens it and closes the search');
    const go = async q => { await p.keyboard.press('f'); await p.waitForSelector('#find-q'); await type(q); await p.keyboard.press('Enter'); };
    await go('new goal'); eq(await p.evaluate(() => [UI.route, UI.drawer && UI.drawer.kind, UI.drawer && UI.drawer.isNew]), ['goals', 'goal-form', true], tag + 'an action starts: “New goal” opens the form on the goals page'); await p.evaluate(() => A.close());
    await p.evaluate(() => A.space({ v: 'business' })); await p.waitForTimeout(200);
    await go('wise usd'); eq(await p.evaluate(() => [UI.route, acct(UI.tx.account).name]), ['transactions', 'Wise USD'], tag + 'an account opens its transactions');
    await go('perez'); eq(await p.evaluate(() => [UI.route, pageBookKey(), UI.drawer && UI.drawer.kind, UI.drawer && UI.drawer.title]), ['plan', 'business:BRL', 'line-view', 'Contador Pérez'], tag + 'a company fixed cost opens on the plan, on the company’s side in its currency'); await p.evaluate(() => A.close());
    await go('laptop fund'); eq(await p.evaluate(() => [UI.route, pageBookKey(), UI.drawer && UI.drawer.kind, UI.drawer && UI.drawer.title]), ['goals', 'business:USD', 'goal-view', 'Laptop fund'], tag + 'a company fund opens on Savings & goals, in dollars'); await p.evaluate(() => A.close());
    await p.evaluate(() => A.space({ v: 'personal' })); await p.waitForTimeout(200);
    await go(goal); eq(await p.evaluate(() => [UI.route, pageBookKey(), UI.drawer && UI.drawer.kind]), ['goals', 'personal', 'goal-view'], tag + 'a household goal switches back to the household and opens'); await p.evaluate(() => A.close());
    await go('sao joao'); eq(await p.evaluate(() => [UI.drawer && UI.drawer.kind, UI.drawer && UI.drawer.draft.id]), ['tx', 'tfind'], tag + 'a transaction opens to be read or edited'); await p.evaluate(() => A.close());
    await go(cat); eq(await p.evaluate(() => [UI.route, UI.tx.category === S.categories[0].id]), ['transactions', true], tag + 'a category shows its transactions');
    await go('mxrf'); eq(await p.evaluate(() => [UI.route, UI.fii.ticker]), ['investments', 'MXRF11'], tag + 'an investment opens Investments on that ticker'); await p.evaluate(() => { UI.fii.ticker = ''; });
    // a click works like Enter; closing gives the focus back to where it was
    await p.evaluate(() => navigate('dashboard')); await p.click('#rail-find .findbtn'); await type('settings'); await p.click('#find-list .find-o');
    eq(await p.evaluate(() => UI.route), 'settings', tag + 'a click on a result goes there');
    await p.focus('#rail-find .findbtn'); await p.keyboard.press('Enter'); await p.waitForSelector('#find-q'); await p.click('#find-root .scrim', { position: { x: 20, y: 600 } });
    eq(await p.evaluate(() => [UI.find, document.activeElement.className]), [null, 'findbtn'], tag + 'a click outside closes it and the focus goes back to the field it was opened from');
    // both themes, three languages: it reads well and fits
    for (const theme of ['dark', 'light']) for (const lang of ['en', 'es', 'pt']) eq(await p.evaluate(([th, l]) => { S.settings.theme = th; S.settings.lang = l; render(); A.find(); const q = document.querySelector('#find-q'); q.value = 'a'; C['find-q'](q);
      const lum = c => { const [r, g, b] = c.match(/[\d.]+/g).map(Number).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return .2126 * r + .7152 * g + .0722 * b; }, d = document.querySelector('.find'), bg = getComputedStyle(d).backgroundColor, sel = getComputedStyle(document.querySelector('.find-o[aria-selected="true"]')).backgroundColor;
      const ratio = (el, back) => { const a = lum(getComputedStyle(el).color), b = lum(back); return (Math.max(a, b) + .05) / (Math.min(a, b) + .05); };
      const r = [[...d.querySelectorAll('.find-o:not([aria-selected="true"]) b, .find-o:not([aria-selected="true"]) small, .find-foot span')].every(el => ratio(el, bg) >= 4.5), [...d.querySelectorAll('.find-o[aria-selected="true"] b, .find-o[aria-selected="true"] small')].every(el => ratio(el, sel) >= 4.5), ratio(q, bg) >= 4.5, [...d.querySelectorAll('.find-o')].every(o => o.getBoundingClientRect().height >= 44 && o.scrollWidth <= o.clientWidth), q.placeholder.length > 10 && q.placeholder === t('Search pages, accounts, bills, transactions'), document.documentElement.scrollWidth - innerWidth <= 0, document.querySelector('#rail-find .findbtn span').innerText.trim() === t('Search')];
      A['find-close'](); return r; }, [theme, lang]), [true, true, true, true, true, true, true], tag + `${theme} ${lang}: names, descriptions and hints have a contrast of 4.5 or more, also on the row the arrows are on; rows are 44px or taller and nothing is cut`);
    await p.evaluate(() => { S.settings.theme = 'dark'; S.settings.lang = 'en'; render(); });
    eq(o.errors, [], tag + 'no errors'); await o.browser.close();
  }
  // ---------------------------------------------------------------- 5. a phone
  for (const lang of ['en', 'pt']) {
    const o = await open({ lang, account: 'example', plan: true, viewport: { width: 390, height: 800 }, mobile: true, touch: true }), p = o.page, where = `${tag}${lang} 390: `, T = k => p.evaluate(k => t(k), k);
    await p.click('.navbar [data-a="sheet"]'); await p.waitForSelector('.sheet .sheet-find');
    eq(await p.evaluate(() => { const b = document.querySelector('.sheet .sheet-find'), r = b.getBoundingClientRect(), nav = document.querySelector('.sheet .nav').getBoundingClientRect(); return [b.innerText.trim(), r.bottom <= nav.top + 1, r.height >= 44, r.width >= innerWidth - 40]; }), [await T('Search'), true, true, true], where + 'the search is the first row of More, a full row a thumb can hit');
    await p.click('.sheet .sheet-find'); await p.waitForSelector('#find-q');
    eq(await p.evaluate(() => { const d = document.querySelector('.find').getBoundingClientRect(), q = document.querySelector('#find-q'); return [UI.sheet, document.activeElement.id, d.left >= 8 && d.right <= innerWidth - 8 && d.top >= 0 && d.bottom <= innerHeight, parseFloat(getComputedStyle(q).fontSize) >= 16, getComputedStyle(document.querySelector('.find-foot')).display, document.documentElement.scrollWidth - innerWidth <= 0]; }), [false, 'find-q', true, true, 'none', true], where + 'it closes More and opens the panel across the screen, the field focused, in a size that does not make the phone zoom; no hints about keys');
    await p.fill('#find-q', 'nubank');
    eq(await p.evaluate(() => [...document.querySelectorAll('#find-list .find-o')].every(o => { const r = o.getBoundingClientRect(); return r.height >= 48 && o.scrollWidth <= o.clientWidth && r.right <= innerWidth; }) && document.querySelectorAll('#find-list .find-o').length > 2), true, where + 'results are rows 48px or taller, none wider than the screen');
    await p.evaluate(() => document.querySelector('#find-list .find-o').click());
    eq(await p.evaluate(() => [UI.find, document.querySelector('#find-q') === null]), [null, true], where + 'a tap on a result goes there and closes the search');
    eq(o.errors, [], where + 'no errors'); await o.browser.close();
  }
  done('qc-find');
})().catch(e => { console.error('qc-find: Error', e); process.exit(1); });
