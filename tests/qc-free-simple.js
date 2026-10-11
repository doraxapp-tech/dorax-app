// QC (owner, 2026-10-11): "the free to spend function, I don't understand it, it is confusing, it is not clear; if you cannot always say it as for a
// small child, remove it".
//   1. the card: "You can spend", a day's share as the big figure (not a total competing with the net balance), until when, and why it is safe;
//   2. its details: one bar of today's money ("to pay and save" | "to spend") with its legend; the sum as steps with icons and the names behind them;
//      the steps add up; the division that gives the day's share; what does not count;
//   3. with a pay day: until it, "when you get paid"; with none: the end of the month and the way to set it;
//   4. not enough: "Not enough money", what is missing in red, what for; the steps end in "Missing"; under R$ 10 a day, the cents;
//   5. one word for one thing: in Spanish and Portuguese no bill is called an account ("cuenta" / "conta"); 320 px whole; no error in the console.
const { open, ok, eq, done } = require('./pw.js');
(async () => {
  let { browser, page, errors } = await open({ lang: 'en', account: 'example', plan: true, viewport: { width: 390, height: 844 }, touch: true, mobile: true });
  await page.evaluate(() => { S.user.greeted = true; navigate('dashboard'); });
  const r = await page.evaluate(() => freeUntil(S, S.today, CUR));
  const money = v => page.evaluate(v => fmt.money(Math.abs(v) >= 1000 ? Math.round(v / 100) * 100 : v, CUR, { trim: true }), v);
  const day = await money(r.perDay), total = await money(r.free);
  // ---------- 1. the card ----------
  eq(await page.evaluate(() => { const c = document.querySelector('#free-card'); return [c.querySelector('.rw-h b').innerText, c.querySelector('.fu-big').innerText.trim(), c.querySelector('.fu-say').innerText.trim()]; }),
    ['You can spend', `${day} a day`, 'until October 31, the end of the month. What you have to pay is already taken off.'], 'the card: “You can spend”, the day’s share, until when, and why it is safe');
  ok(await page.evaluate(t => !document.querySelector('#free-card').innerText.includes(t), total), 'the card shows no total: one figure, a day’s, so it does not compete with the net balance');
  // ---------- 2. the details ----------
  await page.click('#free-open'); await page.waitForSelector('.fu-view');
  const held = r.bills + r.cards + r.goals;
  eq(await page.evaluate(() => { const segs = [...document.querySelectorAll('.fu-bar .stackbar span')]; return [segs.map(x => +x.style.flexGrow || parseFloat(x.style.flex)), [...document.querySelectorAll('.fu-legend .legend-row')].map(x => x.children[1].innerText + ' ' + x.querySelector('.num').innerText), !!document.querySelector('.fu-bar .stackbar[role="img"][aria-label]')]; }),
    [[held, r.free], ['To pay and save ' + await money(held), 'To spend ' + total], true], 'one bar of today’s money: the part to pay and save, the part to spend, with a legend and said to a screen reader');
  const names = await page.evaluate(r => r.billList.length > 2 ? `${r.billList[0].name}, ${r.billList[1].name} and ${r.billList.length - 2} more` : r.billList.map(x => x.name).join(' and '), r);
  eq(await page.evaluate(() => [...document.querySelectorAll('.fu-steps li')].map(l => [l.querySelector('.grow b').innerText, (l.querySelector('.grow small') || {}).innerText || '', !!l.querySelector('.fu-ico svg')])),
    [['You have today', 'Checking account and cash', true], ['Payments until October 31', names, true], ['Card', await page.evaluate(r => `${r.cardList[0].name}, due October ${+r.cardList[0].date.slice(8)}`, r), true], ['For your goals', 'What is left to save this month', true], ['Left for you', '', true]],
    'the sum as steps, each with its icon and the names behind it');
  eq(await page.evaluate(() => [...document.querySelectorAll('.fu-steps li > .num')].map(x => x.innerText)), [await money(r.cash), '− ' + await money(r.bills), '− ' + await money(r.cards), '− ' + await money(r.goals), total], 'each step’s amount');
  eq(r.cash - r.bills - r.cards - r.goals, r.free, 'and they add up');
  eq(await page.evaluate(() => [document.querySelector('.fu-div').innerText.trim(), document.querySelector('.fu-note').innerText.trim()]), [`${total} ÷ ${r.days} days = ${day} a day`, 'Savings, investments and money that has not come in yet do not count.'], 'the division that gives the day’s share; what does not count, in one line');
  // ---------- 3. no pay day; a pay day ----------
  eq(await page.evaluate(() => !!document.querySelector('[data-a="free-pay"]')), true, 'with no pay day: the way to set it');
  await page.evaluate(() => { A.close(); const y = +S.today.slice(0, 4); window.__pay = JSON.parse(JSON.stringify(S.pay)); (S.pay[y] || [])[0].day = 20; render(); A['free-view'](); });
  eq(await page.evaluate(() => [document.querySelector('.fu-view .fu-say').innerText.trim().split('.')[0], document.querySelector('.fu-steps li:nth-child(2) .grow b').innerText, !document.querySelector('[data-a="free-pay"]')]), ['until October 20, when you get paid', 'Payments until October 20', true], 'with a pay day on the 20th: until it, “when you get paid”');
  await page.evaluate(() => { A.close(); S.pay = window.__pay; render(); });
  // ---------- 4. not enough; a few reais a day ----------
  await page.evaluate(() => { S.transactions.push({ id: 'big-out', accountId: 'nu-conta', date: S.today, type: 'expense', amount: -5000000, currency: 'BRL', categoryId: 'other', status: 'confirmed', merchant: 'Big' }); render(); });
  const neg = await page.evaluate(() => freeUntil(S, S.today, CUR));
  eq(await page.evaluate(() => { const c = document.querySelector('#free-card'); return [c.querySelector('.rw-h b').innerText, c.querySelector('.fu-big').classList.contains('neg'), getComputedStyle(c.querySelector('.fu-n')).color === getComputedStyle(document.documentElement).getPropertyValue('--neg').trim() || c.querySelector('.fu-big.neg') !== null, c.querySelector('.fu-say').innerText.trim()]; }),
    ['Not enough money', true, true, 'to pay everything until October 31, the end of the month.'], 'not enough: said plainly, what is missing in red, and what for');
  eq(await page.evaluate(() => document.querySelector('#free-card .fu-n').innerText), await money(-neg.free), 'the figure is what is missing');
  await page.click('#free-open');
  eq(await page.evaluate(() => [!document.querySelector('.fu-bar'), [...document.querySelectorAll('.fu-steps li')].pop().querySelector('.grow b').innerText, !!document.querySelector('.fu-steps .fu-total.neg'), !document.querySelector('.fu-div'), UI.drawer.title]), [true, 'Missing', true, true, 'Not enough money'], 'its details: no bar, the steps end in “Missing”, no share a day');
  await page.evaluate(() => { A.close(); const x = S.transactions.find(k => k.id === 'big-out'); const f = freeUntil(S, S.today, CUR); x.amount += -f.free + 10000; render(); });
  const small = await page.evaluate(() => freeUntil(S, S.today, CUR));
  eq([small.free, small.perDay > 0, small.perDay < 1000, await page.evaluate(() => document.querySelector('#free-card .fu-big').innerText.trim())], [10000, true, true, `${await money(small.perDay)} a day`], 'R$ 100 for 29 days: a few reais a day, with the cents, never “R$ 0”');
  await page.evaluate(() => { S.transactions = S.transactions.filter(x => x.id !== 'big-out'); render(); });
  // the summary's order list calls it by its name
  await page.evaluate(() => A['dash-order']());
  ok(await page.evaluate(() => document.querySelector('#overlay').innerText.includes('You can spend')), 'the summary’s order list calls it “You can spend”');
  eq(errors, [], 'phone: no error in the console'); await browser.close();
  // ---------- 5. Spanish and Portuguese: one word for one thing; 320 px ----------
  for (const [lang, width, want] of [['es', 390, ['Puedes gastar', 'por día', 'hasta el 31 de octubre, fin de mes. Ya descontamos lo que tienes que pagar.', /cuenta/i]], ['pt', 320, ['Você pode gastar', 'por dia', 'até 31 de outubro, fim do mês. Já descontamos o que você tem que pagar.', /conta/i]]]) {
    ({ browser, page, errors } = await open({ lang, account: 'example', plan: true, viewport: { width, height: 700 }, touch: true, mobile: true }));
    await page.evaluate(() => { S.user.greeted = true; navigate('dashboard'); });
    eq(await page.evaluate(() => { const c = document.querySelector('#free-card'); return [c.querySelector('.rw-h b').innerText, c.querySelector('.fu-big').innerText.trim().split(' ').slice(-2).join(' '), c.querySelector('.fu-say').innerText.trim()]; }), want.slice(0, 3), `${lang}: in plain words`);
    await page.click('#free-open'); await page.waitForSelector('.fu-view');
    eq(await page.evaluate(re => [...document.querySelectorAll('.fu-steps li.out, .fu-legend .legend-row')].filter(l => new RegExp(re, 'i').test(l.innerText)).map(l => l.innerText), want[3].source), [], `${lang}: what is taken off is never called an account (“${want[3].source}”)`);
    eq(await page.evaluate(() => { const v = document.querySelector('.fu-view'), tiny = [...v.querySelectorAll('*')].filter(e => e.children.length === 0 && e.textContent.trim() && parseFloat(getComputedStyle(e).fontSize) < 12).length; return [v.scrollWidth <= v.clientWidth, tiny, document.documentElement.scrollWidth - innerWidth]; }), [true, 0, 0], `${lang}, ${width} px: nothing to drag sideways, no text under 12 px`);
    eq(errors, [], `${lang}: no error in the console`); await browser.close();
  }
  done('qc-free-simple');
})().catch(e => { console.error('qc-free-simple: Error', e); process.exit(1); });
