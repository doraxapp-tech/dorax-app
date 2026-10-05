/* Dorax Finance — screen: Reports. */
// ---------- Reports ----------
function recurringTotal(ym, upTo) {
  const keys = new Set(recurringList(S, S.today).map(r => r.accountId + '|' + normalizeText(r.merchant)));
  return -S.transactions.filter(x => x.type === 'expense' && x.status !== 'ignored' && x.currency === CUR && ymOf(x.date) === ym && (!upTo || x.date <= upTo) && keys.has(x.accountId + '|' + normalizeText(x.merchant))).reduce((s, x) => s + x.amount, 0);
}
function viewReports() {
  // a month in progress is compared with the same days of the month before, as on the dashboard; a closed month with the whole month before
  const ym = S.month, prevYm = addMonths(ym, -1), open = ym === ymOf(S.today), upTo = open ? isoDate(prevYm, +S.today.slice(8)) : null, m = monthSummary(S, ym, CUR), p = monthSummary(S, prevYm, CUR, upTo);
  const prevHead = fmt.month(prevYm, 'bare') + (open ? ' 1' + (+upTo.slice(8) > 1 ? '–' + +upTo.slice(8) : '') : '');
  if (!m.count) return `<div class="card"><div class="empty"><b>${t('No data for {month}', { month: fmt.month(ym) })}</b>${t('Reports are calculated from transactions. Import a statement or pick another month.')}</div></div>`;
  const a = categoryTotals(S, ym, CUR), b = categoryTotals(S, prevYm, CUR, upTo);
  const cats = S.categories.filter(c => !c.income && (a.byCat[c.id] || b.byCat[c.id])).sort((x, y) => (a.byCat[y.id] || 0) - (a.byCat[x.id] || 0));
  const lines = Object.entries(a.byLine).filter(l => l[1] > 0).sort((x, y) => y[1] - x[1]).slice(0, 8), max = Math.max(1, ...lines.map(l => l[1]));
  const obs = observations(S, ym, CUR, S.today, fmt, catName);
  const row = (label, cur, prev, strong) => {
    const diff = cur - prev, pc = prev ? Math.round(diff * 1000 / Math.abs(prev)) / 10 : null;
    return `<tr><td>${strong ? `<b style="font-weight:500">${label}</b>` : label}</td><td class="amt">${fmt.money(cur, CUR)}</td><td class="amt hide-sm"><span class="muted">${p.count ? fmt.money(prev, CUR) : '—'}</span></td>
      <td class="amt">${p.count ? fmt.money(diff, CUR, { sign: true }) : '—'}</td><td class="amt">${pc === null || !p.count ? '—' : `${pc > 0 ? '▲' : pc < 0 ? '▼' : ''} ${fmt.pct(Math.abs(pc))}`}</td></tr>`;
  };
  const cmp = paged('report', [row(t('Income'), m.income, p.income, true), row(t('Expenses'), m.expenses, p.expenses, true), row(t('Left over'), m.saved, p.saved, true), row(t('Recurring costs'), recurringTotal(ym), recurringTotal(prevYm, upTo), true),
    ...cats.map(c => row(`<span class="cat"><span class="dot" style="background:${catColor(c.id)}"></span>${esc(c.name)}</span>`, a.byCat[c.id] || 0, b.byCat[c.id] || 0))]);
  return `<section class="tiles">
      <div class="card tile"><div class="label"><span>${t('Income')}</span>${hint('repIncome')}</div><div class="value num">${fmt.money(m.income, CUR)}</div></div>
      <div class="card tile"><div class="label"><span>${t('Expenses')}</span>${hint('repExpenses')}</div><div class="value num">${fmt.money(m.expenses, CUR)}</div></div>
      <div class="card tile"><div class="label"><span>${t('Left over')}</span>${hint('repSaved')}</div><div class="value num">${fmt.money(m.saved, CUR)}</div></div>
      <div class="card tile"><div class="label"><span>${t('Left over, share of income')}</span>${hint('repRate')}</div><div class="value num">${m.rate === null ? '—' : fmt.pct(m.rate)}</div></div></section>
  <div class="grid g-even">
    <section class="card"><div class="card-h"><h2>${t('Largest expense lines')}</h2>${hint('repLargest')}<span class="sub">${t('Share of {amount}', { amount: fmt.money(m.expenses, CUR) })}</span></div><div class="card-b">
      ${lines.map(([id, v]) => `<div class="hbar" data-tip="${esc(catName(id))}: ${esc(fmt.money(v, CUR))}"><span>${esc(catName(id))}</span><div class="track"><i style="width:${v * 100 / max}%"></i></div><span class="num">${fmt.pct(Math.round(v * 100 / m.expenses))} <span class="muted">· ${fmt.money(v, CUR, { round: true })}</span></span></div>`).join('')}</div></section>
    <section class="card"><div class="card-h"><h2>${t('Observations')}</h2>${hint('repObs')}<span class="sub">${t('Calculated from your transactions')}</span></div><div class="card-b">
      ${obs.map(o => `<div class="obs">${esc(o)}</div>`).join('') || `<div class="empty">${t('Nothing notable this month.')}</div>`}
      <p class="note" style="margin-top:10px">${t('These are factual statements about your data, not recommendations.')}</p></div></section>
  </div>
  <section class="card"><div class="card-h"><h2>${t('Month-over-month comparison')}</h2>${hint('repCompare')}<span class="sub">${fmt.month(ym)} · ${open ? t('vs the same days of {month}', { month: fmt.month(prevYm, 'bare') }) : fmt.month(prevYm)}</span></div>
    <div class="card-b flush"><div class="tbl-wrap"><table class="tbl"><thead><tr><th></th><th class="r">${fmt.month(ym, 'bare')}</th><th class="r hide-sm">${prevHead}</th><th class="r">${t('Change')}</th><th class="r">%</th></tr></thead><tbody>
      ${cmp.rows.join('')}
    </tbody></table></div>${cmp.html}</div></section>
  <p class="note">${t('Reports are generated from transactions each time you open them. Transfers between your own accounts and all company accounts are excluded.')}</p>`;
}
