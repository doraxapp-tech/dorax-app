// QC of recording a transaction (owner, 2026-10-07: build "7. recording a transaction on a phone" and "8. quick entry in a sentence").
//   1. the reader (core/say.js): one sentence in Spanish, Portuguese or English -> amount, kind, day, account, group, name. Rules, no model;
//   2. the panel: the sentence first, then the kind as three buttons, the amount large, the groups at a touch, the rest under "More options";
//   3. the sentence fills the form while it is typed, never writes over what the person set by hand, and saves nothing by itself;
//   4. Enter saves; a sentence with no amount says so; what is typed never becomes markup;
//   5. an existing transaction opens in the same form, without the sentence;
//   6. phones at 390 and 320 px, in Spanish and Portuguese.
// The suites' day is 2026-10-02, a Friday.
const { open, ok, eq, done } = require('./pw.js');

(async () => {
  const read = (p, q, accountId) => p.evaluate(([q, accountId]) => { const o = readSay(q, { today: S.today, accounts: S.accounts, categories: S.categories, companyCategories: companyCats(), rules: S.rules, transactions: S.transactions, accountId: accountId || 'nu-conta' });
    return [o.amount, o.type, o.date, o.accountId, o.toAccountId, (o.categoryId || '') + '|' + (o.subcategoryId || ''), o.merchant]; }, [q, accountId]);
  const draft = p => p.evaluate(() => { const x = UI.drawer.draft; return [x.type, x.dir, x.amountText, x.merchant, x.catKey, x.date, x.accountId, x.transferAccountId || null]; });

  // ---------- 1. the reader ----------
  let { browser, page, errors } = await open({ lang: 'en', account: 'example', plan: true, viewport: { width: 1280, height: 900 } });
  const cases = [
    // sentence, [amount, kind, day, account, other account, group|part, name]
    ['taxi 15', [1500, null, null, null, null, 'casa|transporte', 'Taxi'], 'the shortest sentence: what it was and how much'],
    ['gasté 15 en taxi', [1500, 'expense', null, null, null, 'casa|transporte', 'Taxi'], 'a verb says the kind and is not part of the name'],
    ['mercado 214,80 ayer nubank', [21480, null, '2026-10-01', 'nu-conta', null, 'casa|supermercado', 'Mercado'], 'cents, yesterday, and the bank’s name alone means the everyday account of the side the form is on ("mercado" is not Mercado Pago)'],
    ['recebi 3000 salário', [300000, 'income', null, null, null, 'income|sueldo', 'Salário'], 'Portuguese, an income'],
    ['paguei 120 de luz no cartão', [12000, 'expense', null, 'nu-card', null, 'casa|electricidad', 'Luz'], '"the card" is the only card there is'],
    ['Uber R$ 23,50 anteontem', [2350, null, '2026-09-30', null, null, 'casa|transporte', 'Uber'], 'a currency mark apart from its number; the day before yesterday'],
    ['pasé 200 de nubank a santander', [20000, 'transfer', null, 'nu-conta', 'sant', '|', ''], 'a transfer between two accounts, in the order said'],
    ['transferi 300 para santander', [30000, 'transfer', null, null, 'sant', '|', ''], 'a transfer to one account: it leaves the account the form is on'],
    ['netflix 55,90 el 5', [5590, null, '2026-09-05', null, null, 'suscripciones|video', 'Netflix'], '"el 5" is a day when another number is the amount; a day still to come this month is last month’s'],
    ['pagué el 15', [1500, 'expense', null, null, null, '|', ''], 'the only number of a sentence is the amount, never a day'],
    ['1.500 alquiler dia 1', [150000, null, '2026-10-01', null, null, 'casa|alquiler', 'Alquiler'], 'a dot before three digits is thousands, as written in Brazil'],
    ['rent 1800 on the 1st', [180000, null, '2026-10-01', null, null, 'casa|alquiler', 'Rent'], 'English, a day with its ending'],
    ['aluguel 1800 03/10', [180000, null, '2026-10-03', null, null, 'casa|alquiler', 'Rent'], 'a day and a month; the person’s own rule gives the group and the name'],
    ['cena con amigos 80 el viernes', [8000, null, '2026-09-25', null, null, 'salidas|', 'Cena con amigos'], 'a weekday is the last one that passed; small words stay inside a name'],
    ['farmacia 45 na segunda', [4500, null, '2026-09-28', null, null, 'other|', 'Pharmacy'], 'Portuguese "segunda" is Monday after "na"'],
    ['veinte y cinco reais de cerveza', [2500, null, null, null, null, 'salidas|', 'Cerveza'], 'a number said in words, as dictation writes small ones'],
    ['dos mil quinientos alquiler', [250000, null, null, null, null, 'casa|alquiler', 'Alquiler'], 'thousands in words'],
    ['un café 8', [800, null, null, null, null, 'salidas|', 'Café'], '"un" is an article, not one real'],
    ['spent 12.5 on coffee yesterday', [1250, 'expense', '2026-10-01', null, null, 'salidas|', 'Coffee'], 'English, a decimal point'],
    ['groceries $45.90 card', [4590, null, null, 'nu-card', null, 'casa|supermercado', 'Groceries'], 'a group’s own name names it'],
    ['gasolina 2k', [200000, null, null, null, null, 'casa|transporte', 'Gasolina'], '"k" is a thousand'],
    ['sueldo 3700', [370000, 'income', null, null, null, 'income|sueldo', 'Sueldo'], 'a group of income makes it an income without a verb'],
    ['got paid 5000', [500000, 'income', null, null, null, '|', ''], 'two words that say one thing'],
    ['uber 2 personas 30', [3000, null, null, null, null, 'casa|transporte', 'Uber 2 personas'], 'of two bare numbers the last is the amount'],
    ['hola', [null, null, null, null, null, '|', ''], 'a greeting is nothing'],
    ['', [null, null, null, null, null, '|', ''], 'nothing is nothing'],
  ];
  for (const [q, want, what] of cases) eq(await read(page, q), want, `“${q}”: ${what}`);
  eq(await page.evaluate(() => ['15', '15,5', '15.50', '1.234,56', '1,234.56', '1.500', '2k', '1.2.3', '12.3456', 'abc', '15,'].map(sayNumber)), [1500, 1550, 1550, 123456, 123456, 150000, 200000, null, null, null, null], 'numbers: both ways of writing cents and thousands; what is not a number is not guessed');
  eq(await read(page, 'notion 58,40', 'nu-pj'), [5840, null, null, null, null, '|', 'Notion'], 'on a company account the household’s groups and rules are not used');
  eq(await page.evaluate(() => { S.transactions.push({ id: 'h1', accountId: 'nu-conta', date: '2026-09-20', amount: -4200, type: 'expense', categoryId: 'salidas', subcategoryId: null, status: 'confirmed', merchant: 'Padaria Real', description: 'x' }); const o = readSay('padaria real 18', { today: S.today, accounts: S.accounts, categories: S.categories, rules: S.rules, transactions: S.transactions, accountId: 'nu-conta' }); S.transactions = S.transactions.filter(x => x.id !== 'h1'); return [o.categoryId, o.merchant, o.why]; }), ['salidas', 'Padaria Real', 'before'], 'a name recorded before brings the group it had then, and is written the way it was');

  // ---------- 2. the panel ----------
  const n0 = await page.evaluate(() => S.transactions.length);
  await page.evaluate(() => { navigate('transactions'); A['new-tx'](); }); await page.waitForSelector('#d-say');
  eq(await page.evaluate(() => { const top = s => Math.round(document.querySelector(s).getBoundingClientRect().top), kinds = [...document.querySelectorAll('.tx-kind button')];
    return [document.activeElement.id, top('#d-say') < top('.tx-kind') && top('.tx-kind') < top('#d-amount') && top('#d-amount') < top('#d-merchant') && top('#d-merchant') < top('.tx-picks') && top('.tx-picks') < top('#d-account') && top('#d-account') < top('.tx-more'),
      kinds.map(b => b.innerText.trim() + ':' + b.getAttribute('aria-pressed')), parseFloat(getComputedStyle(document.querySelector('#d-amount')).fontSize) >= 30, document.querySelector('#d-amount').getAttribute('inputmode'),
      document.querySelector('.tx-more').getAttribute('aria-expanded'), document.querySelector('#tx-more-box').hidden, !!document.querySelector('#tx-more-box #d-status') && !!document.querySelector('#tx-more-box #d-notes') && !!document.querySelector('#tx-more-box [data-a="split-on"]') && !!document.querySelector('#tx-more-box #d-recurring'),
      document.querySelector('#d-say').placeholder, /The amount and what it was\./.test(document.querySelector('.tx-say-h .hint').dataset.tip) && !document.querySelector('#d-say-read').innerText.trim(), document.querySelectorAll('.tx-pick[data-k]').length, document.querySelectorAll('.drawer .btn.primary').length]; }),
    ['d-say', true, ['Expense:true', 'Income:false', 'Transfer:false'], true, 'decimal', 'false', true, true, 'taxi 15 yesterday', true, 6, 1],
    'a new transaction: the sentence first and focused (its help behind an (i)), then the kind as three buttons, the amount large with the number keys, the name, six groups at a touch, the account; status, split, recurring and notes wait under More options on every screen (owner, 2026-10-09: “the form is super long”); one bright button');
  eq(await page.evaluate(() => [...document.querySelectorAll('.tx-pick[data-k]')].map(b => b.innerText.trim()).slice(0, 2).every(n => S.categories.some(c => c.name === n || c.subs.some(s => s.name === n)))), true, 'the groups offered are the person’s own, the most used first');

  // ---------- 3. the sentence fills the form ----------
  await page.fill('#d-say', 'taxi 15 yesterday');
  eq([await draft(page), await page.evaluate(() => [document.activeElement.id, document.querySelector('#d-amount').value, document.querySelector('#d-merchant').value, document.querySelector('#d-date').value, document.querySelector('.tx-pick[aria-pressed="true"]').innerText.trim(), document.querySelector('#d-say-read').innerText.replace(/\s+/g, ' ').trim(), S.transactions.length])],
    [['expense', 'out', '15', 'Taxi', 'casa|transporte', '2026-10-01', 'nu-conta', null], ['d-say', '15', 'Taxi', '2026-10-01', 'Transport', 'Expense · R$ 15,00 · Taxi · Transport · yesterday', n0]],
    'typed in the sentence: the amount, the name, the group and the day appear in the form underneath, a line says what was understood, the sentence keeps the focus, nothing is saved');
  await page.fill('#d-amount', '18'); await page.fill('#d-say', 'taxi 15 yesterday santander');
  eq([await draft(page), await page.evaluate(() => document.querySelector('#d-account').value)], [['expense', 'out', '18', 'Taxi', 'casa|transporte', '2026-10-01', 'sant', null], 'sant'], 'an amount corrected by hand is not written over when the sentence goes on; what the sentence adds (the account) still arrives');
  await page.fill('#d-say', '');
  eq([await draft(page), await page.evaluate(() => !document.querySelector('#d-say-read').innerText.trim())], [['expense', 'out', '18', '', '|', '2026-10-02', 'nu-conta', null], true], 'the sentence erased: every field it had filled goes back to how the panel opened; the one set by hand stays');
  await page.fill('#d-say', 'recibí 3000');
  eq(await draft(page), ['income', 'in', '18', 'Income', '|', '2026-10-02', 'nu-conta', null], 'an income with no name is called by its kind, so it can be saved as it is');
  await page.evaluate(() => A.close());

  // ---------- 4. Enter, a missing amount, and what is typed ----------
  await page.evaluate(() => A['new-tx']()); await page.fill('#d-say', 'coffee 8'); await page.press('#d-say', 'Enter'); await page.waitForFunction(() => !UI.drawer);
  eq(await page.evaluate(() => { const x = S.transactions.find(k => k.merchant === 'Coffee' && k.date === '2026-10-02'); return [S.transactions.length, x.amount, x.type, x.categoryId, x.accountId, x.source, x.status, document.querySelector('#toast').innerText.trim()]; }), [n0 + 1, -800, 'expense', 'salidas', 'nu-conta', 'say', 'confirmed', 'Added. One more on the record.'],
    'a sentence and Enter: one transaction, as the form showed it, marked as written in a sentence');
  await page.evaluate(() => { const x = S.transactions.find(k => k.source === 'say'); A['open-tx']({ id: x.id }); }); await page.waitForSelector('#d-amount');
  eq(await page.evaluate(() => [document.querySelectorAll('#d-say, .tx-or').length, document.querySelector('#d-amount').value, document.querySelector('.tx-kind [aria-pressed="true"]').innerText.trim(), document.querySelector('.tx-more').getAttribute('aria-expanded'), /Written as a sentence/.test(document.querySelector('#tx-more-box').textContent)]), [0, '8.00', 'Expense', 'false', true],
    'opened again it is the same form without the sentence; its details say how it was entered');
  await page.evaluate(() => A.close());
  await page.evaluate(() => A['new-tx']()); await page.fill('#d-say', 'taxi'); await page.press('#d-say', 'Enter');
  eq(await page.evaluate(() => [!!UI.drawer, document.querySelector('.drawer .banner.crit').innerText.trim(), /The amount is missing\./.test(document.querySelector('#d-say-read').innerText), S.transactions.length]), [true, 'That amount does not work. Try something above zero, like 185,42.', true, n0 + 1], 'a sentence with no amount is not saved: the line under it says the amount is missing, and Save says what to enter');
  await page.fill('#d-say', 'taxi 12'); eq(await page.evaluate(() => document.querySelectorAll('.drawer .banner.crit').length), 0, 'going on typing takes the message away');
  await page.fill('#d-say', '<img src=x onerror="window.__x=1"> <b>bold</b> 15');
  eq(await page.evaluate(() => [document.querySelectorAll('.drawer img, .drawer #d-say-read b:not(.num)').length, window.__x, /<img/.test(document.querySelector('#d-merchant').value)]), [0, undefined, true], 'what is typed stays text: in the line that reads it back and in the name');
  await page.evaluate(() => A.close());

  // ---------- 2b. the kind, the groups, More options ----------
  await page.evaluate(() => A['new-tx']()); await page.click('.tx-pick[data-k]');
  const first = await page.evaluate(() => UI.drawer.draft.catKey); ok(first !== '|' && await page.evaluate(() => document.activeElement.getAttribute('aria-pressed') === 'true'), 'a group is chosen at a touch, and the button keeps the focus');
  await page.click('.tx-pick[aria-pressed="true"]'); eq(await page.evaluate(() => UI.drawer.draft.catKey), '|', 'a second touch takes it off');
  await page.click('.tx-pick[data-k]'); await page.click('.tx-kind [data-v="income"]');
  eq(await page.evaluate(() => { const x = UI.drawer.draft; return [x.type, x.dir, x.catKey, [...document.querySelectorAll('.tx-pick[data-k]')].map(b => b.innerText.trim()), document.querySelector('label[for="d-merchant"]').innerText.replace('*', '').trim(), document.querySelector('.tx-kind [aria-pressed="true"]').dataset.v, document.activeElement.dataset.v]; }), ['income', 'in', '|', ['Salary', 'Second income'], 'Where it came from', 'income', 'income'],
    'Income: it comes in, the expense group is let go, the groups offered are the income’s, the name asks where it came from');
  await page.click('.tx-kind [data-v="transfer"]');
  eq(await page.evaluate(() => [UI.drawer.draft.type, !!document.querySelector('#d-xfer'), document.querySelectorAll('.tx-pick').length, /not counted as income or spending/.test(document.querySelector('.drawer .tx-note').innerText)]), ['transfer', true, 0, true], 'Transfer: where it leaves from and where it goes take the place of the groups, and a line says it is not counted as spending');
  await page.click('.tx-kind [data-v="expense"]'); await page.click('[data-a="tx-cats-all"]');
  eq(await page.evaluate(() => [document.activeElement.id, document.querySelectorAll('#d-cat optgroup').length === S.categories.length, document.querySelectorAll('.tx-picks').length]), ['d-cat', true, 0], '“Another” opens the whole list of groups');
  await page.click('.tx-more'); await page.selectOption('#d-status', 'pending'); await page.waitForTimeout(200);
  eq(await page.evaluate(() => [document.querySelector('.tx-more').hidden, document.querySelector('#tx-more-box').hidden, UI.drawer.draft.status, document.querySelector('.tx-more .note').innerText.trim()]), [false, false, 'pending', 'Pending'], 'a computer: “More options” opens its fields, and says what is set there');
  await page.evaluate(() => A.close());
  // an existing transaction that has something under More options opens with it open
  await page.evaluate(() => { const x = S.transactions.find(k => k.type === 'expense' && !k.splits && k.status === 'confirmed' && !k.recurring && !isBiz(k.accountId)); x.notes = 'kept the receipt'; A['open-tx']({ id: x.id }); }); await page.waitForSelector('#d-amount');
  eq(await page.evaluate(() => [document.querySelector('.tx-more').getAttribute('aria-expanded'), document.querySelector('.tx-more .note').innerText.trim(), document.querySelector('#d-notes').value, !!document.querySelector('#tx-more-box dl.kv')]), ['true', 'Notes', 'kept the receipt', true], 'an existing transaction with a note: its note and the bank’s details are there');
  await page.evaluate(() => { A.close(); });
  eq(errors, [], 'computer: no error in the console'); await browser.close();

  // ---------- 6. phones ----------
  for (const [lang, w, want] of [['es', 390, ['taxi 15 ayer', 'Escríbelo en una frase', 'Gasto · R$ 15,00 · Taxi · Transporte · ayer', 'Qué fue', 'Más opciones']], ['pt', 320, ['táxi 15 ontem', 'Escreva em uma frase', 'Despesa · R$ 15,00 · Taxi · Transporte · ontem', 'O que foi', 'Mais opções']]]) {
    ({ browser, page, errors } = await open({ lang, account: 'example', plan: true, viewport: { width: w, height: w === 320 ? 568 : 844 }, touch: true, mobile: true }));
    await page.click('#tabbar .fab'); await page.click('.sheet.quick [data-v="expense"]'); await page.waitForSelector('#d-say');
    await page.fill('#d-say', lang === 'es' ? 'taxi 15 ayer' : 'taxi 15 ontem');
    const got = await page.evaluate(() => { const box = e => e.getBoundingClientRect(), body = document.querySelector('.drawer .body'), h = s => Math.round(box(document.querySelector(s)).height);
      return { ph: document.querySelector('#d-say').placeholder, label: document.querySelector('label[for="d-say"]').innerText.trim(), read: document.querySelector('#d-say-read').innerText.replace(/\s+/g, ' ').trim(), name: document.querySelector('label[for="d-merchant"]').innerText.replace('*', '').trim(), more: document.querySelector('.tx-more span').innerText.trim(),
        focus: document.activeElement.id, fits: body.scrollWidth <= body.clientWidth, inside: [...document.querySelectorAll('.drawer .body *')].every(e => !e.getClientRects().length || box(e).right <= innerWidth + 0.5),
        thumb: [h('.tx-kind button'), h('.tx-pick'), h('.tx-more'), h('#d-say'), h('.drawer footer .btn.primary')].every(v => v >= 44), zoom: [...document.querySelectorAll('#d-say, #d-amount, #d-merchant, #d-account, #d-date')].every(e => parseFloat(getComputedStyle(e).fontSize) >= 16), kinds: [...document.querySelectorAll('.tx-kind button')].every(b => b.scrollWidth <= b.clientWidth + 1) }; });
    eq([got.ph, got.label, got.read, got.name, got.more], want, `${lang}, ${w}px: the panel and what it read, in the language`);
    eq([got.focus, got.fits, got.inside, got.thumb, got.zoom, got.kinds], ['d-say', true, true, true, true, true], `${lang}, ${w}px: “record an expense” opens on the sentence; nothing is wider than the phone; the buttons are a thumb high; no field is small enough to make an iPhone zoom; the three kinds fit their buttons`);
    await page.press('#d-say', 'Enter'); await page.waitForFunction(() => !UI.drawer);
    eq(await page.evaluate(() => { const x = S.transactions.find(k => k.source === 'say'); return [x.amount, x.merchant, x.date, x.categoryId + '|' + x.subcategoryId]; }), [-1500, 'Taxi', '2026-10-01', 'casa|transporte'], `${lang}, ${w}px: saved from the phone’s keyboard`);
    eq(errors, [], `${lang}: no error in the console`); await browser.close();
  }
  done('qc-say');
})();
