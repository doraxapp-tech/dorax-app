// QC of bank logos in place of bank names, and of the profile photo (owner, 2026-10-08: "10 - across the web app, wherever you can and think it adds
// to the experience, put the bank's logo instead of its name: the person scans better and reads less"; "add the option to upload a profile photo").
//   1. an account in a line of text is the bank's small mark and the rest of its name; the full name is the tooltip; the mark carries the bank's
//      name for a screen reader; a bank the app does not know keeps its name in words; the bank's name is only taken out as a word of its own;
//   2. where: the transactions (computer and phone), the dashboard's To do, the goals (cards, hand-out, details, movements, where the money is), the
//      plan (table and details); text that is not drawn (a select's options, a toast) keeps the name as it is;
//   3. the photo: chosen on the profile (the picture or its button), made a 192 px square JPEG of a few KB, shown in the profile's head, the menu's card
//      on a computer and the phone's top panel; a picture that cannot be read is said so and changes nothing; removing it brings the drawn figure back;
//      anything in the field that this app did not make is never drawn;
//   4. Spanish and Portuguese.
const { open, ok, eq, done } = require('./pw.js');

const makePng = (page, w, h) => page.evaluate(([w, h]) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.fillStyle = '#1F4E9E'; x.fillRect(0, 0, w, h); x.fillStyle = '#F4D7B5'; x.fillRect(w / 2 - 20, h / 2 - 20, 40, 40); return c.toDataURL('image/png').split(',')[1]; }, [w, h]);

(async () => {
  let { browser, page, errors } = await open({ lang: 'en', account: 'example', plan: true, viewport: { width: 1280, height: 900 } });
  // ---------- 1. the rule ----------
  eq(await page.evaluate(() => [['Tarjeta Nubank', 'Nubank'], ['Mercado Pago - Dylan', 'Mercado Pago'], ['Santander', 'Santander'], ['Conta Itau', 'Itaú'], ['Internacional', 'Inter'], ['Conta principal', 'Itaú'], ['Nubank PJ', 'Nubank']].map(([n, i]) => acctRest(n, i))),
    ['Tarjeta', 'Dylan', '', 'Conta', 'Internacional', 'Conta principal', 'PJ'], 'the bank’s name is taken out of the account’s, with what joined them; accents do not matter; only as a word of its own');
  eq(await page.evaluate(() => { const a = { id: 'x', name: 'Tarjeta Nubank', institution: 'Nubank' }, b = { id: 'y', name: 'Caixinha', institution: 'Other' }, el = document.createElement('div'); el.innerHTML = acctTag(a); const tag = el.firstElementChild, mark = tag.querySelector('.inst.sm');
      const said = mark.getAttribute('aria-label') || (mark.querySelector('img') || {}).alt; return [tag.className, tag.getAttribute('title'), said, tag.querySelector('.atag-n').textContent, acctTag(b), acctTag(a, true).includes('>Tarjeta Nubank<')]; }),
    ['atag', 'Tarjeta Nubank', 'Nubank', 'Tarjeta', 'Caixinha', true], 'the mark says the bank to a screen reader, the full name is the tooltip; a bank the app does not know keeps its name in words; where the name is a title it stays whole beside the mark');
  // ---------- 2. where ----------
  await page.evaluate(() => navigate('transactions'));
  eq(await page.evaluate(() => { const cells = [...document.querySelectorAll('#tx-list tbody tr td:nth-child(4)')]; return [cells.length > 0, cells.every(c => !!c.querySelector('.atag .inst.sm')), cells.every(c => { const a = acct(S.transactions.find(x => x.id === c.closest('tr').dataset.id).accountId), pc = c.querySelector('.acct-pc .atag'); return pc.title === acctLabel(a) && pc.querySelector('.atag-n').textContent === acctLabel(a); })]; }),
    [true, true, true], 'transactions: each account is its bank’s mark with its whole name beside it on a computer (owner, 2026-10-09), the name as the tooltip');
  eq(await page.evaluate(() => Math.round(document.querySelector('#tx-list .atag .inst.sm').getBoundingClientRect().width)), 20, 'the mark is 20 px');
  ok(await page.evaluate(() => [...document.querySelectorAll('select option')].every(o => !o.innerHTML.includes('<'))), 'a select’s options keep plain names');
  await page.evaluate(() => navigate('goals'));
  eq(await page.evaluate(() => { const g = S.goals.find(x => x.accountId && acct(x.accountId) && BANK_MARKS[acct(x.accountId).institution] && x.status === 'active'); const card = [...document.querySelectorAll('.card.goal')].find(c => c.querySelector('[data-id="' + g.id + '"]'));
      const bank = acct(g.accountId).institution; return [!card.querySelector('.note .atag') && card.querySelector('.note').textContent.includes(bank), !!document.querySelector('#dist .note') && !document.querySelector('#dist .note .atag'), !document.querySelector('#goal-where')]; }),
    [true, true, true], 'goals: the cards and the hand-out say the bank in words, without its mark (owner, 2026-10-09); where the money is moved to Accounts & savings (v122)');
  await page.evaluate(() => { const g = S.goals.find(x => x.accountId && S.goalMoves.some(m => m.goalId === x.id && m.accountId)); A['goal-open']({ id: g.id }); });
  eq(await page.evaluate(() => [!document.querySelector('.drawer .body > .row .note .atag') && /·/.test(document.querySelector('.drawer .body > .row .note').textContent), !document.querySelector('.drawer .mv .atag') && /·/.test(document.querySelector('.drawer .mv .grow').textContent)]), [true, true], 'a goal’s details: its account and each movement’s, in words');
  await page.evaluate(() => { A.close(); navigate('plan'); });
  ok(await page.evaluate(() => [...document.querySelectorAll('#view .paylist td.first .note')].some(n => !!n.querySelector('.atag'))), 'plan: the table says each cost’s account with its mark');
  await page.evaluate(() => { const l = S.plan.lines.find(x => x.accountId); A['line-open']({ id: l.id }); });
  ok(await page.evaluate(() => !!document.querySelector('.drawer .body .note .atag')), 'a fixed cost’s details: its account with its mark');
  await page.evaluate(() => { A.close(); navigate('dashboard'); });
  ok(await page.evaluate(() => [...document.querySelectorAll('#todo .li.todo small')].some(s => !!s.querySelector('.atag'))), 'dashboard: To do says where each bill is paid from with the mark');
  // a toast keeps the name in words
  await page.evaluate(() => { const b = document.querySelector('#todo [data-a="line-pay-now"]'); if (b) b.click(); });
  ok(await page.evaluate(() => { const m = document.querySelector('#toast .t-msg') || document.querySelector('#toast'); return !m || !m.querySelector('.atag'); }), 'a toast keeps the account’s name in words');
  // ---------- 3. the photo ----------
  await page.evaluate(() => navigate('profile'));
  eq(await page.evaluate(() => [!!document.querySelector('.pf-head .avatar svg'), document.querySelector('#pf-photo-add').innerText.trim(), document.querySelector('#pf-photo').getAttribute('accept'), document.querySelector('.pf-photo').getAttribute('for'), !!document.querySelector('[data-a="photo-remove"]')]),
    [true, 'Add a photo', 'image/*', 'pf-photo', false], 'the profile: the drawn figure, “Add a photo”, the picture itself opens the choice too; nothing to remove yet');
  const wide = await makePng(page, 600, 300);
  await page.setInputFiles('#pf-photo', { name: 'me.png', mimeType: 'image/png', buffer: Buffer.from(wide, 'base64') });
  await page.waitForFunction(() => !!S.user.photo);
  const ph = await page.evaluate(async () => { const p = S.user.photo, i = new Image(); i.src = p; await i.decode(); return [p.slice(0, 23), p.length < 60000, i.naturalWidth, i.naturalHeight]; });
  eq(ph, ['data:image/jpeg;base64,', true, 192, 192], 'a wide picture becomes a 192 px square JPEG of a few KB, kept in the profile');
  eq(await page.evaluate(() => [!!document.querySelector('.pf-head .avatar img'), !!document.querySelector('#rail-foot .avatar img'), document.querySelector('#pf-photo-add').innerText.trim(), !!document.querySelector('[data-a="photo-remove"]'), document.querySelector('#toast').innerText.trim(), document.activeElement.id]),
    [true, true, 'Change photo', true, 'Photo updated.', 'pf-photo'], 'it shows in the profile’s head and the menu’s card; the button says Change photo, Remove photo appears; the person is told; the keyboard is back on the photo’s control');
  await page.setInputFiles('#pf-photo', { name: 'nope.png', mimeType: 'image/png', buffer: Buffer.from('not an image at all') });
  await page.waitForFunction(() => /couldn’t read/.test(document.querySelector('#toast').innerText));
  ok(await page.evaluate(() => S.user.photo.startsWith('data:image/jpeg')), 'a file that is not a picture is said so and changes nothing');
  await page.click('[data-a="photo-remove"]');
  eq(await page.evaluate(() => [S.user.photo, !!document.querySelector('.pf-head .avatar svg'), document.querySelector('#toast').innerText.trim(), document.activeElement.id]), [undefined, true, 'Photo removed.', 'pf-photo'], 'Remove photo brings the drawn figure back');
  eq(await page.evaluate(() => ['javascript:alert(1)', 'data:image/svg+xml;base64,PHN2Zz4=', '"><img src=x onerror=alert(1)>', 'data:image/png;base64,AAAA"onload="x'].map(v => { S.user.photo = v; render(); return !!document.querySelector('.avatar img'); })), [false, false, false, false], 'anything in the field that this app did not make is never drawn');
  await page.evaluate(() => { delete S.user.photo; render(); });
  eq(errors, [], 'computer: no error in the console'); await browser.close();

  // ---------- the phone ----------
  ({ browser, page, errors } = await open({ lang: 'es', account: 'example', plan: true, viewport: { width: 390, height: 844 }, touch: true, mobile: true }));
  await page.evaluate(() => navigate('transactions'));
  ok(await page.evaluate(() => [...document.querySelectorAll('#tx-list tbody tr')].every(r => !!r.querySelector('.atag .inst.sm'))), 'phone: each transaction’s line shows its bank’s mark');
  await page.evaluate(() => navigate('profile'));
  const sq = await makePng(page, 300, 300);
  await page.setInputFiles('#pf-photo', { name: 'yo.png', mimeType: 'image/png', buffer: Buffer.from(sq, 'base64') });
  await page.waitForFunction(() => !!S.user.photo);
  eq(await page.evaluate(() => [(() => { navigate('dashboard'); const x = !!document.querySelector('.bar-who .avatar img'); navigate('profile'); return x; })(), document.querySelector('#pf-photo-add').innerText.trim(), document.querySelector('#toast').innerText.trim(), [...document.querySelectorAll('.pf-head .btn, .pf-photo')].every(b => b.getBoundingClientRect().height >= 44), document.documentElement.scrollWidth - innerWidth]),
    [true, 'Cambiar foto', 'Foto actualizada.', true, 0], 'phone, in Spanish: the photo in the top panel of Resumen (since v128 the other screens have their name there); Cambiar foto; the buttons a thumb high; nothing wider than the phone');
  eq(errors, [], 'phone: no error in the console'); await browser.close();
  ({ browser, page, errors } = await open({ lang: 'pt', account: 'example', plan: true, viewport: { width: 320, height: 700 }, touch: true, mobile: true }));
  await page.evaluate(() => navigate('profile'));
  eq(await page.evaluate(() => [document.querySelector('#pf-photo-add').innerText.trim(), document.querySelector('#pf-photo').getAttribute('aria-label'), document.documentElement.scrollWidth - innerWidth]), ['Enviar foto', 'Foto de perfil', 0], 'Portuguese, 320 px');
  eq(errors, [], 'pt: no error in the console'); await browser.close();
  done('qc-logos-photo');
})();
