/* Dorax Finance — screen: Accounts. */
// ---------- Accounts ----------
function acctCard(a) {
  const bal = accountBalance(S, a.id, S.today), n = S.transactions.filter(x => x.accountId === a.id).length, last = S.imports.find(i => i.accountId === a.id);
  const used = a.type === 'credit' && a.creditLimit ? Math.round(-bal * 100 / a.creditLimit) : null;
  return `<section class="card acct"><div class="row">${bankMark(a.institution)}<div style="min-width:0"><b style="font-weight:500">${esc(a.name)}</b><div class="note">${esc((ACCT_TYPES().find(x => x[0] === a.type) || [0, a.type])[1])} · ${a.currency}</div></div></div>
    ${a.purpose ? `<div class="note">${esc(a.purpose)}</div>` : ''}
    <div><div class="note">${a.type === 'credit' ? t('Current balance owed') : t('Balance')}</div><div class="bal num">${fmt.money(a.type === 'credit' ? -bal : bal, a.currency)}</div></div>
    ${used !== null ? `<div>${meter(used, used > 80 ? 'warn' : 'go')}<div class="note" style="margin-top:4px">${t('{pct} of {limit} limit used', { pct: fmt.pct(used), limit: fmt.money(a.creditLimit, a.currency, { round: true }) })}</div></div>` : ''}
    <div class="note">${tn(n, '{n} transaction', '{n} transactions')}${last ? ' · ' + t('last import {date}', { date: fmt.date(last.date, true) }) : ''}</div>
    <div class="row"><button class="btn sm" data-a="view-account" data-id="${a.id}">${t('View transactions')}</button><button class="btn sm ghost" data-a="edit-account" data-id="${a.id}">${t('Edit')}</button></div></section>`;
}
function viewAccounts() {
  const tot = (list, cur) => list.filter(a => a.currency === cur).reduce((s, a) => s + accountBalance(S, a.id, S.today), 0), biz = business();
  if (!S.accounts.length) return `<div class="card"><div class="empty"><b>${t('No accounts yet')}</b>${t('Add your first account to start importing statements.')}</div></div>`;
  return `<section class="tiles"><div class="card tile"><div class="label"><span>${t('Household net balance')}</span>${hint('accNet')}</div><div class="value num">${fmt.money(tot(personal(), CUR), CUR)}</div></div>
    ${[...new Set(biz.map(a => a.currency))].map(c => `<div class="card tile"><div class="label"><span>${t('Company')}, ${c}</span>${hint('accCompany')}</div><div class="value num">${fmt.money(tot(biz, c), c)}</div></div>`).join('')}
    <div class="card tile"><div class="label"><span>${t('Accounts')}</span>${hint('accCount')}</div><div class="value num">${S.accounts.length}</div></div></section>
  <p class="note">${t('Each currency is totalled separately and never converted. Company accounts never count toward household figures.')}</p>
  <h2 class="sec">${t('Household')} ${hint('accHouse')}</h2><div class="grid g-3">${personal().map(acctCard).join('')}</div>
  ${biz.length ? `<h2 class="sec">${t('Company (PJ)')} ${hint('accBiz')}</h2><div class="grid g-3">${biz.map(acctCard).join('')}</div>` : ''}`;
}
