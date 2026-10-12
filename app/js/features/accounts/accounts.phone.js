/* Dorax Finance — Accounts on a phone (owner, 2026-10-11: "do you think the cards display as it is now is good UX? I feel Accounts has more to offer
   than just cards"; then "do what you propose"). The cards took a screen each, so two balances were never seen together, and the computer's column of
   what the accounts add up to was not on the phone at all. Now, from the top:
     - one button, "Add account" (deleting an account is in its form, under Edit, where it can be done knowingly; not a button beside adding one);
     - the accounts as rows, by what they are for, each group under its name and its total: day to day (checking accounts and cash), credit cards
       (the next invoice, its due date and how much of the limit is used) and the savings. A row: the bank's mark, the name, what it is for (or its
       kind), and what it holds; a card shows what is owed on it, in red;
     - how long the savings last at the pace of spending (accountsCover, the same block as the computer's column).
   A tap on a row opens the account's panel (cardViewDrawer, features/accounts/wallet.js): the card large, its details, what can be done with it and
   its latest transactions; a credit card opens on its credit. The household's net balance is in the bar on top (owner, 2026-10-08), so it is not
   repeated here; the groups' totals say what it is made of. A computer keeps its cards and its column (accounts.view.js). */
function phoneAccounts(list) {
  const co = UI.space === 'business', cur = co ? ((companyBooks(S)[0] || {}).cur || CUR) : CUR, at = a => accountBalance(S, a.id, S.today);
  const base = cardsOf(list), day = base.filter(a => a.type === 'checking' || a.type === 'cash'), cards = list.filter(a => a.type === 'credit'), saved = base.filter(a => a.type === 'savings');
  const inv = co ? [] : cardInvoices(S, S.today, cur).filter(x => !x.paid);
  const mark = a => a.institution ? bankMark(a.institution) : `<span class="inst" aria-hidden="true">${icon('wallet')}</span>`;      // a bank the app does not know: its two letters (ui/banks.js)
  const kind = a => (ACCT_TYPES().find(x => x[0] === a.type) || [0, a.type])[1];
  const total = xs => { const curs = [...new Set(xs.map(a => a.currency))]; return curs.map(c => ({ c, v: sum(xs.filter(a => a.currency === c).map(at)) })); };
  const money = (v, c, owed) => `<span class="num${owed && v < 0 ? ' neg' : ''}">${fmt.money(v, c)}</span>`;
  const row = (a, sub, amount, extra, fn) => `<li><button class="ac-row" data-a="card-view" data-id="${a.id}"${fn ? ` data-fn="${fn}"` : ''} aria-haspopup="dialog" aria-label="${esc(cardSay(a))}">${mark(a)}<span class="grow"><b>${esc(a.name)}</b><small>${sub}</small>${extra || ''}</span>${amount}${icon('right')}</button></li>`;
  const group = (id, title, xs, rows, owed, foot) => `<section class="card acc-grp" id="${id}" aria-labelledby="${id}-h"><div class="card-h"><h2 id="${id}-h">${title}</h2>${xs.length ? `<span class="acc-grp-total">${total(xs).map(x => money(x.v, x.c, owed)).join(' · ')}</span>` : ''}</div>
    <div class="card-b">${rows ? `<ul class="ac-list">${rows}</ul>` : ''}${foot || ''}</div></section>`;
  const main = a => canBeMain(a) && mainOf(a.scope) === a;
  const sub = a => esc([main(a) ? t('Main account') : '', a.purpose || kind(a), a.currency !== cur ? a.currency : ''].filter(Boolean).join(' · '));
  // the day to day: what is there to spend
  const dayRows = day.map(a => row(a, sub(a), money(at(a), a.currency))).join('');
  // the cards: what is owed, the next invoice and how much of the limit is used (installments still to come hold the limit too, as at the bank)
  const cardRows = cards.map(a => {
    const x = inv.find(i => i.accountId === a.id), owed = at(a), used = a.creditLimit ? Math.round((Math.max(0, -owed) + instAhead(S, a.id, S.today).total) * 100 / a.creditLimit) : null;
    const say = co ? (used !== null ? t('{pct} of the limit used', { pct: fmt.pct(used) }) : kind(a)) : cardInvoiceSay(a, x, a.currency) + (used !== null ? ' · ' + t('{pct} of the limit used', { pct: fmt.pct(used) }) : '');
    return row(a, esc(say), money(owed, a.currency, true), used !== null ? meter(used, used > 80 ? 'warn' : 'go') : '', 'credit');
  }).join('');
  const savedRows = saved.map(a => row(a, sub(a), money(at(a), a.currency))).join('');
  return `<div class="acc-ph-acts"><button class="btn primary" data-a="account-add">${icon('plus')}${co ? t('Add company account') : t('Add account')}</button></div>
    ${day.length ? group('acc-day', t('Day to day'), day, dayRows) : ''}
    ${cards.length ? group('acc-cc', t('Credit cards'), cards, cardRows, true) : ''}
    ${group('acc-sv', t('Your savings'), saved, savedRows, false, saved.length ? '' : savingsNone())}
    ${co ? '' : accountsCover(cur)}`;
}
