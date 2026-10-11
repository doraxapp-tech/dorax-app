// QC of Categories on both sides, and of deleting a category (owner, 2026-10-06: "how do I add and remove groups (categories) for the
// company? and also how to remove group categories for Household?").
//   1. Categories & rules has the Household | Company switch, with no currency choice: the company's categories are one list;
//   2. on the household's side a category can be added, renamed and deleted; Other and Income cannot be deleted, and say why;
//   3. deleting a category that holds something asks for the typed word, and loses nothing: its subcategories, fixed costs, transactions
//      and rules are under Other afterwards, and every total of the month is what it was;
//   4. the company's side has its own categories, with add / rename / delete, and no rules; what is done there never touches the
//      household's, and a rename or a delete reaches the company's fixed costs in every currency;
//   5. it reads in three languages and fits a phone.
const { open, ok, eq, done, TARGET } = require('./pw.js');

(async () => {
  const tag = TARGET + ': ';
  const quiet = p => p.waitForFunction(() => !document.querySelector('#toast-root').innerText.trim(), null, { timeout: 15000 }).catch(() => {});
  const names = p => p.evaluate(() => [...document.querySelectorAll('#cat-cats .cat-card .nm')].map(el => el.innerText.trim()));
  const modal = p => p.evaluate(() => { const m = document.querySelector('#modal-root .modal'); if (!m) return null; const r = m.getBoundingClientRect(); return { title: m.querySelector('#modal-title').innerText.trim(), text: m.querySelector('#modal-text').innerText.trim(), word: !!m.querySelector('#modal-word'), ready: !m.querySelector('#modal-ok').disabled, label: m.querySelector('#modal-ok').innerText.trim(), centred: Math.abs((r.left + r.right) / 2 - (a => (a.left + a.right) / 2)(document.querySelector('.app').getBoundingClientRect())) <= 2 }; });
  {
    const o = await open({ lang: 'en', account: 'example', plan: true, viewport: { width: 1440, height: 900 } }), p = o.page;
    await p.evaluate(() => navigate('categories'));
    // ---------------------------------------------------------------- 1. the switch
    eq(await p.evaluate(() => [document.querySelectorAll('#topbar .space, #topbar [data-a="space"]:not(.bar-side *):not(.side-flip)').length, [...document.querySelectorAll('#rail-side [data-a="space"]')].map(b => b.dataset.v), document.querySelectorAll('[data-a="space-cur"]').length, companyCurrencies(S).length]),
      [0, ['business'], 0, 2], tag + 'Categories follows the side chosen in the menu (Household here) and has no switch of its own; no currency is asked, though the company has two');

    // ---------------------------------------------------------------- 2. the household's side
    eq(await p.evaluate(() => [...document.querySelectorAll('#cat-cats .cat-card')].map(c => [c.querySelector('.nm').innerText.trim(), [...c.querySelectorAll('.cat-acts button')].map(b => b.innerText.trim() + (b.disabled ? ':off' : ''))])),
      [['Home', ['Rename', 'Delete']], ['Subscriptions', ['Rename', 'Delete']], ['Going out', ['Rename', 'Delete']], ['Other', ['Rename', 'Delete:off']], ['Income', ['Rename', 'Delete:off']]],
      tag + 'every category can be renamed and deleted, but Other and Income, which can only be renamed');
    eq(await p.evaluate(() => ['other', 'income'].map(id => document.querySelector('#del-' + id).dataset.tip)), ['Anything without a category goes here. It can be renamed, not deleted.', 'Income is kept here. It can be renamed, not deleted.'], tag + 'each of the two says why');
    eq(await p.evaluate(() => [...document.querySelectorAll('#cat-cats .cat-card')].every(c => { const n = c.querySelector('.nm'), h = c.querySelector('.cat-h').getBoundingClientRect(), f = c.querySelector('.cat-f').getBoundingClientRect(); return n.scrollWidth <= n.clientWidth && f.top >= h.bottom - 1 && c.querySelector('.cat-acts').getBoundingClientRect().right <= c.getBoundingClientRect().right; })), true, tag + 'the name has its own line and is not cut; the actions are under it, inside the block');
    await p.evaluate(() => { A['delete-cat']({ id: 'other' }); A['delete-cat']({ id: 'income' }); });
    eq(await modal(p), null, tag + 'asking for either by another way does nothing');

    await p.fill('#newcat', 'Pets'); await p.click('[data-a="add-cat"]'); await quiet(p);
    eq(await names(p), ['Home', 'Subscriptions', 'Going out', 'Other', 'Pets', 'Income'], tag + 'a new category is added before Income');
    const pets = await p.evaluate(() => S.categories.find(c => c.name === 'Pets').id);
    await p.click('#ren-' + pets); await p.fill('#cat-rename', 'Animals'); await p.click('[data-a="save-cat"]');
    eq(await p.evaluate(id => [S.categories.find(c => c.id === id).name, document.activeElement.id], pets), ['Animals', 'ren-' + pets], tag + 'it is renamed, and the focus is back on Rename');
    await p.click('#del-' + pets);
    eq(await modal(p), { title: 'Delete Animals?', text: 'The category is deleted. It is empty.', word: false, ready: true, label: 'Delete category', centred: true }, tag + 'deleting an empty category asks once, in a centred pop-up, with no word to type');
    await p.click('#modal-root .btn[data-a="modal-cancel"]');
    eq((await names(p)).includes('Animals'), true, tag + 'Cancel keeps it');
    await p.click('#del-' + pets); await p.click('#modal-ok'); await quiet(p);
    eq(await names(p), ['Home', 'Subscriptions', 'Going out', 'Other', 'Income'], tag + 'confirming deletes it');

    // income rows on Plan keep their subcategory
    await p.click('[data-a="cat-toggle"][data-id="income"]');
    eq(await p.evaluate(() => [...document.querySelectorAll('#subs-income .sub:not(.add) [data-a="delete-sub"]')].map(b => b.disabled)), [true, true], tag + 'a subcategory of Income that is an income row on Plan, or has transactions, cannot be deleted');
    await p.click('[data-a="cat-toggle"][data-id="income"]');

    // ---------------------------------------------------------------- 3. deleting one that holds something
    const snap = () => p.evaluate(() => { const prog = planProgress(S, S.month, CUR, S.today), sum = monthSummary(S, S.month, CUR), tot = categoryTotals(S, S.month, CUR);
      return { tx: S.transactions.length, sum: S.transactions.reduce((n, x) => n + x.amount, 0), lines: S.plan.lines.length, planned: prog.reduce((n, x) => n + (x.planned || 0), 0), spent: prog.reduce((n, x) => n + (x.spent || 0), 0), subs: S.categories.flatMap(c => c.subs.map(s => s.id)).sort().join(), rules: S.rules.length,
        income: sum.income, expenses: sum.expenses, saved: sum.saved, bySub: JSON.stringify(Object.entries(tot.bySub).sort()), incomeBySub: JSON.stringify(Object.entries(tot.incomeBySub).sort()), spentAll: Object.values(tot.byCat).reduce((a, b) => a + b, 0) }; });
    const before = await snap(), home = await p.evaluate(() => ({ subs: S.categories.find(c => c.id === 'casa').subs.map(s => s.id), lines: S.plan.lines.filter(l => l.categoryId === 'casa').map(l => l.id), tx: S.transactions.filter(x => allocations(x).some(a => a.categoryId === 'casa')).map(x => x.id), n: S.transactions.reduce((n, x) => n + allocations(x).filter(a => a.categoryId === 'casa').length, 0), rules: S.rules.filter(r => r.categoryId === 'casa').map(r => r.id), otherTx: S.transactions.filter(x => x.categoryId === 'other').length }));
    await p.evaluate(() => { UI.tx.category = 'casa'; });
    await p.click('#del-casa');
    eq(await modal(p), { title: 'Delete Home?', text: `Everything in it moves to Other: ${home.subs.length} subcategories, ${home.lines.length} fixed costs, ${home.n} transactions. Nothing is lost, but this can’t be undone.`, word: true, ready: false, label: 'Delete category', centred: true },
      tag + 'deleting a category that holds something says what moves to Other, and waits for the typed word');
    await p.fill('#modal-word', 'delete');
    eq((await modal(p)).ready, true, tag + 'the word opens the button');
    await p.click('#modal-ok'); await quiet(p);
    eq(await names(p), ['Subscriptions', 'Going out', 'Other', 'Income'], tag + 'the category is gone');
    eq(await p.evaluate(h => { const other = S.categories.find(c => c.id === 'other'), ids = new Set(S.categories.map(c => c.id)), subOf = {}; S.categories.forEach(c => c.subs.forEach(s => { subOf[s.id] = c.id; }));
      return [h.subs.every(id => other.subs.some(s => s.id === id)), h.lines.every(id => S.plan.lines.find(l => l.id === id).categoryId === 'other'), h.tx.every(id => allocations(S.transactions.find(x => x.id === id)).every(a => a.categoryId !== 'casa')), S.transactions.filter(x => x.categoryId === 'other').length >= h.otherTx + 1, h.rules.every(id => S.rules.find(r => r.id === id).categoryId === 'other'),
        S.transactions.every(x => allocations(x).every(a => (!a.categoryId || ids.has(a.categoryId) || isBiz(x.accountId)) && (!a.subcategoryId || !subOf[a.subcategoryId] || subOf[a.subcategoryId] === a.categoryId))), S.plan.lines.every(l => ids.has(l.categoryId) && (!l.subcategoryId || subOf[l.subcategoryId] === l.categoryId)), S.rules.every(r => r.transfer || !r.categoryId || ids.has(r.categoryId)), UI.tx.category]; }, home),
      [true, true, true, true, true, true, true, true, ''], tag + 'its subcategories, fixed costs, transactions and rules are under Other; nothing points to a category that is not there; the filter that named it is cleared');
    eq(await snap(), before, tag + 'nothing was lost: the same transactions, fixed costs, subcategories and rules, and the month’s plan, income and spending are what they were');
    eq(await p.evaluate(() => { navigate('plan'); A['plan-year-open'](); const g = [...document.querySelectorAll('#plan-year tr.grp th')].map(th => th.textContent.trim()); A.close(); navigate('dashboard'); const d = document.querySelector('#view').innerText.length > 200; navigate('reports'); const r = document.querySelector('#view').innerText.length > 200; navigate('transactions'); const x = document.querySelector('#view').innerText.length > 200; navigate('categories'); return [g.includes('Other'), g.includes('Home'), d, r, x]; }),
      [true, false, true, true, true], tag + 'Plan lists those fixed costs under Other; the dashboard, the reports and the transactions open');

    // ---------------------------------------------------------------- 4. the company's side
    const house = await p.evaluate(() => JSON.stringify([S.categories, S.plan, S.rules, S.transactions.length]));
    await p.click('[data-a="space"][data-v="business"]');
    eq(await p.evaluate(() => [document.querySelector('#cat-cats h2').innerText.trim(), !!document.querySelector('#cat-rules'), document.querySelector('#cat-co-note').innerText.trim(), document.querySelectorAll('[data-a="space-cur"]').length, [...document.querySelectorAll('#rail-side [data-a="space"]')].map(b => b.dataset.v).join()]),
      ['Company categories', false, 'Rules file the household’s statements only. A company movement is filed by hand, on Transactions.', 0, 'personal'], tag + 'Company shows the company’s categories, says rules are the household’s, and asks for no currency');
    eq(await p.evaluate(() => [...document.querySelectorAll('#cat-cats .cat-card')].map(c => c.querySelector('.nm').innerText.trim() + ([...c.querySelectorAll('.cat-acts button')].some(b => b.disabled) ? ':kept' : ''))),
      ['Taxes', 'Accounting and services', 'Tools and software', 'Pay and people', 'Other:kept', 'Income:kept'], tag + 'its six categories, each with Rename and Delete; Other and Income are kept');
    await p.fill('#newcat', 'Marketing'); await p.click('[data-a="add-cat"]'); await quiet(p);
    eq(await p.evaluate(() => [S.company.categories.map(c => c.name).join(), S.categories.some(c => c.name === 'Marketing')]), ['Taxes,Accounting and services,Tools and software,Pay and people,Other,Marketing,Income', false], tag + 'a category added here is the company’s, before its Income; the household has none of it');
    // a fixed cost in each currency under Taxes, made the way Plan makes them
    const made = await p.evaluate(() => { const mk = (cur, name) => inBook('business:' + cur, () => { const cat = B().categories.find(c => c.id === 'co-tax'), sub = { id: newId('s'), name }; cat.subs.push(sub); const l = { id: newId('pl'), categoryId: cat.id, subcategoryId: sub.id, name, pay: 'fixed', accountId: null, end: null, note: '', plan: {} }; B().plan.lines.push(l); return [sub.id, l.id]; });
      const a = mk('BRL', 'DAS'), b = mk('USD', 'Sales tax'), c = mk('USD', 'State fee'); render(); return { a, b, c }; });
    await p.click('[data-a="cat-toggle"][data-id="co-tax"]');
    await p.click(`#subs-co-tax [data-a="edit-cat"][data-id="${made.b[0]}"]`); await p.fill('#cat-rename', 'US sales tax'); await p.click('[data-a="save-cat"]');
    eq(await p.evaluate(m => [S.company.books.USD.plan.lines.find(l => l.id === m.b[1]).name, S.company.books.BRL.plan.lines.find(l => l.id === m.a[1]).name], made), ['US sales tax', 'DAS'], tag + 'renaming a company subcategory renames its fixed cost, in the dollar book too');
    await p.click(`#subs-co-tax [data-a="delete-sub"][data-id="${made.c[0]}"]`);
    eq((await modal(p)).text, 'The subcategory and the fixed cost with the same name are deleted, with its plan. This can’t be undone.', tag + 'deleting a company subcategory that is a fixed cost says the cost goes with it');
    await p.click('#modal-ok'); await quiet(p);
    eq(await p.evaluate(m => [S.company.books.USD.plan.lines.some(l => l.id === m.c[1]), S.company.categories.some(c => c.subs.some(s => s.id === m.c[0])), S.company.books.USD.plan.lines.length, S.company.books.BRL.plan.lines.length], made), [false, false, 1, 1], tag + 'and it does, from the dollar book, leaving the rest');
    await p.click('#del-co-tax');
    eq(await modal(p), { title: 'Delete Taxes?', text: 'Everything in it moves to Other: 2 subcategories, 2 fixed costs. Nothing is lost, but this can’t be undone.', word: true, ready: false, label: 'Delete category', centred: true }, tag + 'deleting a company category counts its fixed costs in every currency, and waits for the typed word');
    await p.fill('#modal-word', 'delete'); await p.click('#modal-ok'); await quiet(p);
    eq(await p.evaluate(m => { const co = S.company, other = co.categories.find(c => c.id === 'co-other'); return [co.categories.some(c => c.id === 'co-tax'), other.subs.map(s => s.name).join(), co.books.BRL.plan.lines.map(l => l.categoryId + ':' + l.name).join(), co.books.USD.plan.lines.map(l => l.categoryId + ':' + l.name).join()]; }, made),
      [false, 'DAS,US sales tax', 'co-other:DAS', 'co-other:US sales tax'], tag + 'the category is gone and its fixed costs are under the company’s Other, in reais and in dollars');
    eq(await p.evaluate(() => JSON.stringify([S.categories, S.plan, S.rules, S.transactions.length])), house, tag + 'none of this touched the household’s categories, plan or rules');
    eq(await p.evaluate(() => { navigate('plan'); A['plan-year-open'](); const g = [...document.querySelectorAll('#plan-year tr.grp th')].map(th => th.textContent.trim()), out = [UI.space, g.includes('Other') && !g.includes('Taxes'), document.querySelector('#overlay').innerText.includes('DAS')]; A.close(); navigate('transactions'); out.push(pageBookKey()); navigate('categories'); out.push(pageBookKey().split(':')[0], document.querySelector('#cat-cats h2').innerText.trim()); return out; }),
      ['business', true, true, 'personal', 'business', 'Company categories'], tag + 'the side chosen here is the side Plan opens on, with the cost under Other; a screen with one side (Transactions) stays the household’s; coming back, Categories is still on Company');
    await p.click('[data-a="space"][data-v="personal"]');
    eq(await p.evaluate(() => [document.querySelector('#cat-cats h2').innerText.trim(), !!document.querySelector('#cat-rules'), UI.catEdit]), ['Categories', true, null], tag + 'back on Household: its categories and its rules');
    eq(o.errors, [], tag + 'no errors'); await o.browser.close();
  }
  // ---------------------------------------------------------------- 5. languages and a phone
  for (const lang of ['es', 'pt']) {
    const o = await open({ lang, account: 'example', plan: true, viewport: { width: 390, height: 844 }, mobile: true, touch: true }), p = o.page, where = tag + lang + ', phone: ';
    await p.evaluate(() => navigate('categories'));
    await p.evaluate(() => document.querySelector('[data-a="space"][data-v="business"]').click());
    eq(await p.evaluate(() => [document.querySelector('#cat-cats h2').innerText.trim() === t('Company categories') && t('Company categories') !== 'Company categories', document.documentElement.scrollWidth <= innerWidth, [...document.querySelectorAll('#cat-cats .cat-acts button, #cat-cats .cat-more')].every(b => b.getBoundingClientRect().height >= 36), [...document.querySelectorAll('#cat-cats .cat-card')].every(c => { const r = c.getBoundingClientRect(), n = c.querySelector('.nm'); return r.right <= innerWidth && n.scrollWidth <= n.clientWidth && c.querySelector('.cat-acts').getBoundingClientRect().right <= r.right; })]),
      [true, true, true, true], where + 'the company’s categories are in the language, nothing runs off the screen, the names are whole and the buttons are a thumb high');
    await p.evaluate(() => document.querySelector('#del-co-people').click());
    const m = await modal(p);
    eq([m.title === await p.evaluate(() => t('Delete {name}?', { name: S.company.categories.find(c => c.id === 'co-people').name })), m.text === await p.evaluate(() => t('The category is deleted. It is empty.')), /^(The|Delete)/.test(m.text + m.label), m.centred, m.word], [true, true, false, true, false], where + 'the pop-up is in the language and centred');
    await p.evaluate(() => document.querySelector('#modal-ok').click()); await quiet(p);
    eq(await p.evaluate(() => [S.company.categories.some(c => c.id === 'co-people'), S.categories.length]), [false, 5], where + 'the company’s category is deleted; the household keeps its five');
    eq(o.errors, [], where + 'no errors'); await o.browser.close();
  }
  done('qc-cats');
})().catch(e => { console.error('qc-cats: Error', e); process.exit(1); });
