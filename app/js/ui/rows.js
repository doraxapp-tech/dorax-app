/* Dorax Finance — shared: a transaction row and a plan row, used by several screens. */
const CUR = BASE_CURRENCY;
/** Transactions, on a computer (owner, 2026-10-09: "in the account column put the account's name beside the logo"): the bank's mark and the account's
    whole name (a card's credit named after its card), cut short with an ellipsis when the column is narrow. */
const txAcctTag = id => { const a = acct(id); return a ? acctTag({ ...a, name: acctName(a) }, true) : ''; };
function txRow(x, opt) {
  opt = opt || {};
  return `<tr class="click ${x.status === 'ignored' ? 'ignored' : ''}${flashed(x.id)}" data-a="open-tx" data-id="${x.id}" tabindex="0">
    <td class="num meta hide-sm" style="white-space:nowrap">${fmt.date(x.date)}</td>
    <td class="first"><div class="tx-main"><b>${esc(x.merchant)}${instTag(x)}</b>${opt.raw ? `<small>${esc(x.description)}</small>` : ''}</div></td>
    <td class="wide">${catLabel(x)} ${statusChip(x)}</td>
    <td class="wide meta t-acct">${opt.raw ? `<span class="muted acct-pc">${txAcctTag(x.accountId)}</span><span class="muted acct-ph">${acctTag(x.accountId)}</span>` : `<span class="muted">${acctTag(x.accountId)}</span>`}<span class="sm-only muted"> · ${fmt.date(x.date)}</span></td>
    <td class="amt">${amountHtml(x)}</td></tr>`;
}
const PLAN_STATUS = () => ({ over: ['crit', t('Over plan')], onplan: ['good', t('Plan used up')], paid: ['good', t('Paid')], under: ['info', t('Under plan')], unpaid: ['', t('Not paid yet')], late: ['warn', t('Late')], none: ['', t('Not planned')] });
function planRow(p) {
  const [cls, label] = PLAN_STATUS()[p.status];
  const right = p.status === 'over' ? t('{amount} over', { amount: fmt.money(-p.remaining, CUR) }) : p.status === 'onplan' ? '' : t('{amount} left', { amount: fmt.money(Math.max(0, p.remaining), CUR) });
  return `<div class="budget"><b style="font-weight:500">${esc(p.name)} <span class="chip ${cls}">${cls ? '<i></i>' : ''}${label}</span></b><span class="num">${fmt.money(p.spent, CUR)} <span class="muted">/ ${fmt.money(p.planned, CUR, { trim: true })}</span></span>
    ${meter(p.planned ? p.pct : (p.spent ? 100 : 0), p.status === 'over' ? 'crit' : 'ok')}<div class="meta"><span>${p.planned ? fmt.pct(Math.round(p.spent * 100 / p.planned)) : '—'}${p.due ? ' · ' + t('due day {d}', { d: p.due }) : ''}</span><span>${right}</span></div></div>`;
}
