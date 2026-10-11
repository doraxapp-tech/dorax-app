/* Dorax Finance — screen: Accounts. */
// ---------- Accounts ----------
function acctCard(a) {
  const bal = accountBalance(S, a.id, S.today), n = S.transactions.filter(x => x.accountId === a.id).length, last = S.imports.find(i => i.accountId === a.id && i.status !== 'Undone');
  const used = a.type === 'credit' && a.creditLimit ? Math.round(-bal * 100 / a.creditLimit) : null;
  return `<section class="card acct"><div class="row">${bankMark(a.institution)}<div style="min-width:0"><b style="font-weight:500">${esc(a.name)}</b><div class="note">${esc((ACCT_TYPES().find(x => x[0] === a.type) || [0, a.type])[1])} · ${a.currency}</div></div>${canBeMain(a) && mainOf(a.scope) === a ? `<span class="chip good spacer"><i></i>${t('Main account')}</span>` : ''}</div>
    ${a.purpose ? `<div class="note">${esc(a.purpose)}</div>` : ''}
    <div><div class="note">${a.type === 'credit' ? t('Current balance owed') : t('Balance')}</div><div class="bal num">${fmt.money(a.type === 'credit' ? -bal : bal, a.currency)}</div></div>
    ${used !== null ? `<div>${meter(used, used > 80 ? 'warn' : 'go')}<div class="note" style="margin-top:4px">${t('{pct} of {limit} limit used', { pct: fmt.pct(used), limit: fmt.money(a.creditLimit, a.currency, { round: true }) })}</div></div>` : ''}
    <div class="note">${tn(n, '{n} transaction', '{n} transactions')}${last ? ' · ' + t('last import {date}', { date: fmt.date(last.date, true) }) : ''}</div>
    <div class="row"><button class="btn sm" data-a="view-account" data-id="${a.id}">${t('View transactions')}</button><button class="btn sm ghost" data-a="edit-account" data-id="${a.id}">${t('Edit')}</button></div></section>`;
}
// 2026-10-07: the page follows the side chosen in the menu, like the rest of the app: the household's accounts, or the company's.
function viewAccounts() {
  const co = UI.space === 'business', list = co ? business() : personal();
  if (!list.length) return `<div class="card"><div class="empty"><b>${co ? t('No company accounts yet') : t('No accounts yet')}</b>${co ? t('Add the company’s first account to plan its costs and keep its reserves in it.') : t('Add your first account to start importing statements.')}<div style="margin-top:12px"><button class="btn primary" data-a="account-add">${icon('plus')}${co ? t('Add company account') : t('Add account')}</button></div></div></div>`;
  // no figures on top, on the phone (owner, 2026-10-08: "remove from Accounts the KPI cards of the household's net balance, it is already in the bar on
  // top, and the number of accounts, it is irrelevant") nor on the computer (owner, 2026-10-09: "on the computer remove the KPI cards from the Accounts tab")
  const head = `<h2 class="sec">${co ? t('Company (PJ)') : t('Household')} ${hint(co ? 'accBiz' : 'accHouse')}</h2>`;
  // a phone's cards come in two parts, the accounts and the savings (features/accounts/wallet.js): the first part is headed "Accounts" (the side is said
  // in the top bar), the second "Your savings"
  const phHead = `<h2 class="sec">${t('Accounts')} ${hint(co ? 'accBiz' : 'accHouse')}</h2>`, sv = list.filter(a => a.type === 'savings');
  // the earlier design (Settings, "Accounts as cards" off): its cards, then the savings as rows
  const old = () => `<div class="grid g-3">${list.map(acctCard).join('')}</div><hr class="cc-div"><section class="cc-group sv-group" aria-labelledby="cc-h-savings">${savingsHead(sv, !isPhone())}${sv.length ? `<div class="sv-rows">${sv.map(savingsRow).join('')}</div>` : savingsNone()}</section>`;
  const cards = walletOn() ? walletAccounts(list) : old();      // the cards: features/accounts/wallet.js
  if (isPhone()) return `${walletOn() ? `${acctPhoneActs()}<div class="acc-head">${phHead}${acctViewSwitch()}</div>` : head}${cards}`;
  // a computer: the cards on the left, seven tenths of the width; on the right, what they add up to (accountsAside)
  return `${walletOn() ? '' : head}<div class="acc-cols"><div class="acc-main">${cards}</div><aside class="acc-side" aria-label="${t('What your accounts add up to')}">${accountsAside(list)}</aside></div>`;
}

// ---------- the column on the right, on a computer (owner, 2026-10-10: "Accounts & savings, why is it empty? Add more information in this tab on the
// computer: this web app is not only to tell the person what they already know, it is to help them improve financially. Make two columns 70/30: the
// cards on the left, and in the small one each account's logo, its name and how much it has saved; add the savings' totals") ----------
// Four short blocks, each worked out from the same balances as the cards: the savings one by one with their total and how they moved this month; how
// many months of spending they cover (the days of freedom of the summary, in months); what the side has, adds up to and owes; and each credit card's
// next invoice and how much of its limit is used. Nothing estimated is shown as a fact: an invoice still to close says it is an estimate.
const asideMark = a => a.institution && BANK_MARKS[a.institution] ? bankMark(a.institution) : `<span class="inst">${icon('wallet')}</span>`;
function accountsAside(list) {
  const co = UI.space === 'business', cur = co ? ((companyBooks(S)[0] || {}).cur || CUR) : CUR, at = (a, d) => accountBalance(S, a.id, d || S.today);
  const mine = list.filter(a => a.currency === cur), card = (id, title, body) => `<section class="card acc-box" id="${id}"><div class="card-b"><h2>${title}</h2>${body}</div></section>`;
  // 1. the savings, one by one, and their total; how they moved since the month began
  const sv = list.filter(a => a.type === 'savings'), curs = [...new Set(sv.map(a => a.currency))], monthStart = addDays(ymOf(S.today) + '-01', -1);
  const svMine = sv.filter(a => a.currency === cur), svNow = sum(svMine.map(a => at(a))), svWas = sum(svMine.map(a => at(a, monthStart))), moved = svNow - svWas;
  const savings = card('acc-savings', t('Your savings'), sv.length
    ? `<ul class="acc-list">${sv.map(a => `<li>${asideMark(a)}<span class="grow">${esc(a.name)}</span><b class="num">${fmt.money(at(a), a.currency)}</b></li>`).join('')}</ul>
      ${curs.map(c => `<div class="acc-total"><span>${curs.length > 1 ? t('Total saved in {cur}', { cur: c }) : t('Total saved')}</span><b class="num">${fmt.money(sum(sv.filter(a => a.currency === c).map(a => at(a))), c)}</b></div>`).join('')}
      ${moved ? `<p class="acc-note"><b class="num ${moved > 0 ? 'pos' : 'neg'}">${fmt.money(moved, cur, { sign: true })}</b> ${t('since {date}', { date: fmt.date(monthStart) })}</p>` : `<p class="acc-note">${t('No change since {date}.', { date: fmt.date(monthStart) })}</p>`}`
    : `<p class="acc-note">${t('No savings account yet.')}</p><button class="btn sm" data-a="acct-add-savings">${icon('plus')}${t('Add a savings account')}</button>`);
  // 2. how long the savings last at the pace of spending (the household's days of freedom, features/ahead)
  let cover = '';
  if (!co) {
    const r = runway(S, S.today, cur);
    if (r.days !== null && r.cushion.amount > 0) {
      const f = rwFigure(r.days, false);
      cover = card('acc-cover', t('How long your savings last'), `<p class="acc-big">${esc(f.span)}</p><p class="acc-note">${t('of spending, at {amount} a month.', { amount: fmt.money(r.burn.amount, cur, { trim: true }) })}</p>
        ${r.next ? `<p class="acc-note">${t('To reach {mark}: {amount} more saved.', { mark: rwMark(r.next.days), amount: `<b class="num">${fmt.money(r.next.missing, cur, { trim: true })}</b>` })}</p>` : ''}
        <button class="btn sm" data-a="runway-view" aria-haspopup="dialog">${t('See the days of freedom')}</button>`);
    }
  }
  // 3. what the side has, owes, and adds up to
  const spendable = mine.filter(a => a.type !== 'savings' && a.type !== 'credit'), cards = mine.filter(a => a.type === 'credit');
  const have = sum(spendable.map(a => at(a))), owed = sum(cards.map(a => at(a))), net = have + svNow + owed;
  const sumUp = card('acc-sum', co ? t('What the company has') : t('What you have'), `<div class="acc-row"><span>${t('To spend, in your accounts')}</span><b class="num">${fmt.money(have, cur)}</b></div>
    <div class="acc-row"><span>${t('Saved')}</span><b class="num">${fmt.money(svNow, cur)}</b></div>
    ${cards.length ? `<div class="acc-row"><span>${owed > 0 ? t('In your favour on cards') : t('Owed on cards')}</span><b class="num ${owed < 0 ? 'neg' : ''}">${fmt.money(owed, cur)}</b></div>` : ''}
    <div class="acc-total"><span>${t('Net balance')}</span><b class="num">${fmt.money(net, cur)}</b></div>`);
  // 4. each credit card: its next invoice still to pay, and how much of its limit is used
  const inv = co ? [] : cardInvoices(S, S.today, cur).filter(x => !x.paid);
  const cardBox = cards.length ? card('acc-cards', t('Your cards'), `<ul class="acc-list cards">${cards.map(a => {
    const x = inv.find(i => i.accountId === a.id), used = a.creditLimit ? Math.round(Math.max(0, -at(a)) * 100 / a.creditLimit) : null, m = cardMain(a);
    return `<li>${asideMark(m)}<span class="grow"><b>${esc(m.name)}</b><small>${x ? (x.estimate ? t('Next invoice ≈ {amount}, due {date}', { amount: fmt.money(x.amount, cur), date: fmt.date(x.date) }) : t('Invoice {amount}, due {date}', { amount: fmt.money(x.amount, cur), date: fmt.date(x.date) })) : a.dueDay ? t('Invoice paid') : t('No due date')}${used !== null ? ' · ' + t('{pct} of the limit used', { pct: fmt.pct(used) }) : ''}</small></span></li>`; }).join('')}</ul>`) : '';
  return savings + cover + sumUp + cardBox;
}
