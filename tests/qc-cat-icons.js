// QC (owner, 2026-10-10): "add icons to the categories".
//   1. every category and subcategory has an icon: the one its name points to (Portuguese, Spanish, English, and the default ids), else its
//      category's, else a tag; drawn in the category's colour;
//   2. Categories & rules: a tap on an icon opens the picker (every drawing, the current one marked); a choice is kept, shown, said, and the focus
//      goes back to it; a subcategory's too;
//   3. the icons where categories show: the transactions, the expense form's quick choices, the limits, the Plan's payments, a phone's movements;
//   4. thumbs' sizes on a phone, Portuguese, no error in the console.
const { open, ok, eq, done } = require('./pw.js');
(async () => {
  let { browser, page, errors } = await open({ lang: 'en', account: 'example', plan: true, viewport: { width: 390, height: 844 }, touch: true, mobile: true });
  await page.evaluate(() => { S.user.greeted = true; navigate('categories'); });
  // ---------- 1. what names point to ----------
  eq(await page.evaluate(() => S.categories.map(c => c.id + ':' + catIconKey(c))), ['casa:home', 'suscripciones:repeat', 'salidas:ticket', 'other:more', 'income:coins'], 'the example’s categories: a house, a loop, a ticket, “other”, coins');
  eq(await page.evaluate(() => { const c = S.categories.find(k => k.id === 'casa'), s = id => catIconKey(c, c.subs.find(x => x.id === id)); return ['supermercado', 'transporte', 'alquiler', 'electricidad', 'internet', 'movil', 'condominio'].map(s); }),
    ['cart', 'car', 'home', 'bolt', 'wifi', 'phone', 'home'], 'Home’s subcategories: groceries a cart, transport a car, rent a house, electricity a bolt, internet the waves, mobile a phone; the condominium its category’s house');
  eq(await page.evaluate(() => [['Supermercado'], ['Restaurantes'], ['Comida (Delivery)'], ['iFood'], ['Viajes'], ['Ropa'], ['Celulares'], ['Internet (Claro)'], ['Meli+'], ['Placer'], ['Saúde'], ['Farmácia'], ['Educação'], ['Pets'], ['Impostos'], ['Assinaturas'], ['Investimentos'], ['Combustível'], ['Academia'], ['Presentes'], ['Diversos'], ['Algo raro']].map(([n]) => catIconKey({ id: 'x', name: n }))),
    ['cart', 'food', 'food', 'food', 'plane', 'shirt', 'phone', 'wifi', 'play', 'ticket', 'health', 'pill', 'book', 'paw', 'receipt', 'repeat', 'trend', 'fuel', 'dumbbell', 'gift', 'more', 'tag'], 'names in Portuguese and Spanish (his own among them) point to their drawing; a name that points nowhere gets a tag');
  eq(await page.evaluate(() => [['co-tax', 'Taxes'], ['co-services', 'Accounting and services'], ['co-tools', 'Tools and software'], ['co-people', 'Pay and people'], ['co-other', 'Other']].map(([id, name]) => catIconKey({ id, name }))), ['receipt', 'briefcase', 'laptop', 'users', 'more'], 'the company’s groups: taxes a receipt, services a briefcase, tools a laptop, people, other');
  ok(await page.evaluate(() => Object.keys(CAT_ICONS).every(k => typeof CAT_ICONS[k] === 'string' && CAT_ICONS[k].length > 10 && catIconName(k) !== k)), 'every drawing exists and has a name');
  // ---------- 2. Categories & rules: the picker ----------
  eq(await page.evaluate(() => [document.querySelectorAll('.cat-card > .cat-h .cat-ic .cg svg').length, S.categories.length]).then(([a, b]) => a === b), true, 'every category on the screen wears its icon, as a button');
  eq(await page.evaluate(() => { const g = document.querySelector('#cat-ic-casa .cg'); return [g.style.getPropertyValue('--c'), g.querySelector('svg').innerHTML === (d => (d.innerHTML = catIconSvg('home'), d.querySelector('svg').innerHTML))(document.createElement('div')), document.querySelector('#cat-ic-casa').getBoundingClientRect().height >= 44]; }),
    [await page.evaluate(() => catColor('casa')), true, true], 'Home: the house in Home’s colour; 44 px to tap on a phone');
  await page.click('#cat-ic-salidas'); await page.waitForSelector('.cgi-grid');
  eq(await page.evaluate(() => [UI.drawer.kind, document.querySelector('#overlay h2').innerText, document.querySelectorAll('.cgi-b').length, document.querySelector('.cgi-b.on').dataset.v, document.activeElement.dataset.v, [...document.querySelectorAll('.cgi-b')].every(b => b.getBoundingClientRect().height >= 44)]),
    ['cat-icon', 'Icon for Going out', Object.keys(await page.evaluate(() => CAT_ICONS)).length, 'ticket', 'ticket', true], 'the picker: every drawing, the current one marked and focused, each 44 px');
  await page.click('.cgi-b[data-v="gift"]');
  eq(await page.evaluate(() => [S.categories.find(c => c.id === 'salidas').icon, !UI.drawer, document.querySelector('#cat-ic-salidas .cg svg').innerHTML === (d => (d.innerHTML = catIconSvg('gift'), d.querySelector('svg').innerHTML))(document.createElement('div')), UI.toast && UI.toast.msg, document.activeElement.id]),
    ['gift', true, true, 'Going out has its new icon.', 'cat-ic-salidas'], 'a choice is kept and shown, said, and the focus is back on it');
  await page.evaluate(() => { UI.catOpen.casa = true; render(); }); await page.click('#cat-ic-supermercado'); await page.waitForSelector('.cgi-grid');
  eq(await page.evaluate(() => [document.querySelector('#overlay h2').innerText, document.querySelector('.cgi-b.on').dataset.v]), ['Icon for Groceries', 'cart'], 'a subcategory has its picker too, its own icon marked');
  await page.click('.cgi-b[data-v="bag"]');
  eq(await page.evaluate(() => [S.categories.find(c => c.id === 'casa').subs.find(s => s.id === 'supermercado').icon, document.querySelector('#cat-ic-supermercado .cg svg').innerHTML === (d => (d.innerHTML = catIconSvg('bag'), d.querySelector('svg').innerHTML))(document.createElement('div')), !!document.querySelector('#subs-casa')]), ['bag', true, true], 'kept on the subcategory; its category stays open');
  // ---------- 3. where categories show ----------
  await page.evaluate(() => navigate('transactions'));
  eq(await page.evaluate(() => { const rows = [...document.querySelectorAll('#tx-list .cat')].filter(c => !c.classList.contains('muted')); return [rows.length > 0, rows.every(r => !!r.querySelector('.cg svg')), !document.querySelector('#tx-list .cat .dot')]; }), [true, true, true], 'Transactions: each category wears its icon (no dot left)');
  ok(await page.evaluate(() => { const x = S.transactions.find(k => k.subcategoryId === 'supermercado'); return !x || catLabel(x).includes(CAT_ICONS.bag); }), 'a groceries transaction shows the bag just chosen');
  await page.evaluate(() => A['new-tx']());
  eq(await page.evaluate(() => [...document.querySelectorAll('.tx-pick[data-k]')].every(b => !!b.querySelector('.cg svg'))), true, 'the expense form’s quick choices wear their icons');
  await page.evaluate(() => { UI.drawer = null; renderOverlay(); navigate('plan'); });
  eq(await page.evaluate(() => [!!document.querySelector('#paylist .pl-tog .cg svg'), [...document.querySelectorAll('#limits-card .lim-c:not(.more)')].filter(b => !b.querySelector('.cg')).length]), [true, 0], 'the Plan: each group of payments, and every row of the limits (but “Another limit in…”), with its icon');
  await page.evaluate(() => A['card-view']({ id: 'nu-card' })); await page.waitForTimeout(150);
  eq(await page.evaluate(() => { const i = [...document.querySelectorAll('#overlay .op-ico.cat')]; return [i.length > 0, i.every(x => !!x.querySelector('svg') && !!x.style.getPropertyValue('--c'))]; }), [true, true], 'a phone’s movements of an account: the category’s icon in its colour, in place of the first letter');
  eq(errors, [], 'phone: no error in the console'); await browser.close();
  // ---------- 4. a computer; Portuguese ----------
  ({ browser, page, errors } = await open({ lang: 'pt', account: 'example', plan: true, viewport: { width: 1440, height: 900 } }));
  await page.evaluate(() => { S.user.greeted = true; navigate('categories'); }); await page.click('#cat-ic-casa');
  eq(await page.evaluate(() => [document.querySelector('#overlay h2').innerText.startsWith('Ícone de'), document.querySelector('.cgi-b[data-v="cart"]').getAttribute('aria-label'), document.querySelector('#overlay .drawer').classList.contains('pop')]), [true, 'Supermercado', true], 'pt: “Ícone de …”, each drawing named; a card in the middle of a computer');
  await page.keyboard.press('Escape'); eq(await page.evaluate(() => !UI.drawer), true, 'Escape closes it');
  eq(errors, [], 'computer: no error in the console'); await browser.close();
  done('qc-cat-icons');
})().catch(e => { console.error('qc-cat-icons: Error', e); process.exit(1); });
