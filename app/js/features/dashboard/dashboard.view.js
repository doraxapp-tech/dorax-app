/* Dorax Finance — screen: Dashboard. */
// ---------- Dashboard ----------
/** Before the first transaction there is nothing to chart, but there is a plan: where the month's income is meant to go. */
function plannedMonthCard(ym) {
  const income = payTotal(B(), ym), fixed = planTotals(B(), ym).expenses, goals = distribution(B(), ym).planned, left = income - fixed - goals, base = Math.max(income, fixed + goals);
  const parts = [[t('Fixed costs'), fixed, 'var(--s3)'], [t('Savings and goals'), goals, 'var(--s1)'], [t('Not assigned yet'), Math.max(0, left), 'var(--col-muted)']].filter(x => x[1] > 0);
  // shares are whole numbers that add up to 100 whenever the parts add up to the income (wholeShares, engine.js)
  wholeShares(parts.map(x => x[1]), base).forEach((p, i) => { parts[i][3] = p; });
  return `<section class="card" id="planned-month"><div class="card-h"><h2>${t('Your month, as planned')}</h2>${info(t('Your planned income for the month, split into fixed costs, savings and goals, and what has no job yet. Nothing here has been spent: it is the plan.'))}<span class="sub">${fmt.month(ym)}</span></div><div class="card-b">${base ? `
      <div class="note">${t('Planned income')}</div><div class="bal num" style="margin-bottom:14px">${fmt.money(income, BCUR())}</div>
      <div class="stackbar" role="img" aria-label="${esc(parts.map(x => `${x[0]} ${fmt.money(x[1], BCUR())}`).join(', '))}">${parts.map(x => `<span style="flex:${x[1]};background:${x[2]}"></span>`).join('')}</div>
      <div class="legend" style="margin-top:10px">${parts.map(x => `<div class="legend-row still"><span class="dot" style="background:${x[2]}"></span><span>${x[0]}</span><span class="num">${fmt.money(x[1], BCUR())}</span><span class="pct num">${fmt.pct(x[3])}</span></div>`).join('')}</div>
      ${left < 0 ? banner('warn', t('The plan uses {amount} more than the planned income.', { amount: fmt.money(-left, BCUR()) })) : ''}
      <p class="note" style="margin-top:12px">${t('Charts of what you actually spend appear here with your first payment or transaction.')}</p>
      <div class="row" style="margin-top:10px"><a class="btn sm" href="#plan">${t('Open plan')}</a><a class="btn sm ghost" href="#imports">${t('Import a statement')}</a></div>`
      : `<div class="empty"><b>${t('Nothing planned for {month}', { month: fmt.month(ym) })}</b>${t('Add your income and your fixed costs to see where the month goes.')}<div style="margin-top:12px"><a class="btn sm" href="#plan">${t('Open plan')}</a></div></div>`}</div></section>`;
}
/** One headline figure. The comparison names its period; a month in progress is compared with the same days of the month before, never with a whole month. */
function statTile(label, value, sub, tip) { return `<div class="kpi"><span class="label"><span>${label}</span>${tip ? info(tip) : ''}</span><span class="value">${value}</span><span class="delta">${sub || '&nbsp;'}</span></div>`; }
function versus(cur, prev, label, goodUp) {
  if (!prev) return '';
  const p = Math.round((cur - prev) * 1000 / Math.abs(prev)) / 10, cls = p === 0 ? '' : (p > 0) === goodUp ? 'up' : 'down';
  return `<span class="pill ${cls}">${p > 0 ? '▲' : p < 0 ? '▼' : '•'} ${fmt.pct(Math.abs(p))}</span> ${label}`;
}
/** A meter that keeps an overrun in proportion: the part within the plan stays neutral, only the part above it is red. */
function planMeter(spent, planned) {
  const pct = planned ? Math.round(spent * 100 / planned) : spent ? 100 : 0;
  if (spent <= planned || !planned) return meter(pct, 'ok');
  return `<div class="meter split" role="img" aria-label="${pct}%"><i style="width:${planned * 100 / spent}%"></i><em style="width:${(spent - planned) * 100 / spent}%"></em></div>`;
}
/** Investments on the dashboard: what the position is worth and what it paid, month by month. Records only: no prices are fetched. */
function fiiDashCard(ym) {
  if (!fiiTickers(S).length) return '';
  const f = fiiSummary(S, S.today), pts = []; for (let y = addMonths(ymOf(S.today), -5); y <= ymOf(S.today); y = addMonths(y, 1)) pts.push({ ym: y, value: fiiIncomeMonth(S, y), partial: y === ymOf(S.today) });
  return `<section class="card" id="fii-card"><div class="card-h"><h2>${t('Investments (FIIs)')}</h2>${info(t('The position is your quotas multiplied by the price you typed for each fund. Dorax does not fetch market prices. “Received” is the income you recorded for the month.'))}<span class="sub">${t('Income received, last 6 months')}</span><a class="right btn sm ghost" href="#investments">${t('Open investments')}</a></div>
    <div class="card-b"><div class="figure"><b>${fmt.money(f.value, CUR)}</b><span>${t('position at the prices you typed')} · ${t('{month}: {amount} received', { month: fmt.month(ym, 'bare'), amount: fmt.money(fiiIncomeMonth(S, ym), CUR) })}</span></div>
      ${pts.some(x => x.value) ? colChart(pts, ym, CUR) : `<div class="empty">${t('No income recorded yet.')}</div>`}</div></section>`;
}
// 2026-10-07 (owner, asked which gap to close first: "company dashboard"): the dashboard has the two sides, like Plan (Household | Company in the
// top bar, and the currency when the company has more than one). The company's side is the same page read from the company's book: what is due,
// its reserves, the month's four figures (received, costs, result, transfers out), plan against actual, costs by category, six months of
// what was received and of costs, and its latest transactions. One currency at a time, nothing converted, and never a household figure. On the household's side
// B() is S and BCUR() is CUR, so that side is what it was.
function viewDashboard() {
  const co = inCompany(), b = B(), cur = BCUR(), accts = co ? bookAccounts() : personal();
  const mine = co ? (x => accts.some(a => a.id === x.accountId)) : (x => !isBiz(x.accountId));      // the transactions this side counts
  const ym = S.month, nowYm = ymOf(S.today), prevYm = addMonths(ym, -1), inProgress = ym === nowYm, m = monthSummary(b, ym, cur);
  if (co ? !S.transactions.some(mine) && !b.plan.lines.length && !b.goals.length : !S.transactions.length && !S.plan.lines.length && !S.goals.length) {
    if (co) return `${greeting()}${companyNote()}<div class="card" id="co-empty"><div class="empty"><b>${t('Nothing for the company in {cur} yet', { cur })}</b>${t('Add the company’s fixed costs and reserves, or import a statement of one of its accounts, and its month shows here.')}<div class="row" style="justify-content:center;margin-top:12px"><a class="btn primary" href="#plan">${t('Open plan')}</a><a class="btn" href="#imports">${t('Import a statement')}</a></div></div></div>`;
    return `${greeting()}${firstSteps()}${S.isNew ? '' : `<div class="card"><div class="empty"><b>${t('No transactions yet')}</b>${t('Add an account, then import a statement or add a transaction to see your month here.')}<div class="row" style="justify-content:center;margin-top:12px"><a class="btn primary" href="#imports">${t('Import a statement')}</a></div></div></div>`}`;
  }
  // a month in progress is compared with the same days of the month before; a closed month with the whole month before
  const p = monthSummary(b, prevYm, cur, inProgress ? isoDate(prevYm, +S.today.slice(8)) : null), pl = fmt.month(prevYm, 'bare');
  const vsLabel = inProgress ? t('vs the same days of {month}', { month: pl }) : t('vs {month}', { month: pl });
  const { byCat } = categoryTotals(b, ym, cur);
  const cats = b.categories.filter(c => !c.income && byCat[c.id] > 0).map(c => ({ c, v: byCat[c.id] }));
  // a company movement is filed by hand, so what has no company category yet is shown as its own part, and leads to those transactions
  const loose = co ? sum(Object.keys(byCat).filter(k => !b.categories.some(c => c.id === k)).map(k => byCat[k])) : 0;
  if (loose > 0) cats.push({ c: { id: 'none', name: t('Not filed yet') }, v: loose });
  const col = c => c.id === 'none' ? 'var(--col-muted)' : catColor(c.id);
  const sorted = [...cats].sort((a, b) => b.v - a.v);
  // whole-number shares that add up to 100, each one its exact share rounded down or up (wholeShares, engine.js)
  wholeShares(sorted.map(x => x.v), m.expenses).forEach((p, i) => { sorted[i].pct = p; });
  const prog = planProgress(b, ym, cur, S.today), over = prog.filter(x => x.status === 'over'), overBy = sum(over.map(x => x.spent - x.planned));
  // one definition of "paid": a bill is a cost with one payment a month; a budget is spent across the month and is counted as used, not paid
  const groups = b.categories.filter(c => prog.some(x => x.categoryId === c.id && (x.planned || x.spent))).map(c => {
    const xs = prog.filter(x => x.categoryId === c.id), bills = xs.filter(x => x.bill && x.planned), buds = xs.filter(x => !x.bill && (x.planned || x.spent)), planned = sum(xs.map(x => x.planned)), spent = sum(xs.map(x => x.spent));
    return { c, planned, spent, pct: planned ? Math.round(spent * 1000 / planned) / 10 : 0, bills: bills.length, paid: bills.filter(x => x.spent > 0).length, budPlan: sum(buds.map(x => x.planned)), budSpent: sum(buds.map(x => x.spent)), buds: buds.length };
  });
  const trend = [], came = []; for (let y = addMonths(nowYm, -5); y <= nowYm; y = addMonths(y, 1)) { const s = monthSummary(b, y, cur); trend.push({ ym: y, value: s.expenses, partial: y === nowYm }); came.push({ ym: y, value: s.income, partial: y === nowYm }); }
  const recent = S.transactions.filter(x => ymOf(x.date) <= ym && mine(x)).slice(0, 5);
  const fresh = !S.transactions.some(mine);   // a plan but no transaction of this side yet
  const dist = distribution(b, ym), toGoals = sum(b.goals.map(g => goalMonth(b, g.id, ym)));
  const noOpening = S.clean && accts.length && accts.every(a => !a.opening);
  // company: what left and what arrived by transfer (the owner's pay, a change of currency). A move between two of these accounts is not one.
  const moved = co ? S.transactions.filter(x => x.type === 'transfer' && counts(x) && ymOf(x.date) === ym && mine(x) && !accts.some(a => a.id === x.transferAccountId)) : [], sent = -sum(moved.filter(x => x.amount < 0).map(x => x.amount)), arrived = sum(moved.filter(x => x.amount > 0).map(x => x.amount));

  const tiles = co ? `<section class="kpis" aria-label="${fmt.month(ym)}">
    ${statTile(t('Received'), fmt.money(m.income, cur), t('Plan: {amount}', { amount: fmt.money(payTotal(b, ym), cur, { trim: true }) }), t('Money that came into the company’s accounts in this currency this month. Transfers between your own accounts are not counted. “Plan” is the income planned for the month.'))}
    ${statTile(t('Costs'), fmt.money(m.expenses, cur), versus(m.expenses, p.expenses, vsLabel, false), t('What the company paid this month from its accounts in this currency, pending payments included. Transfers are not counted: money sent to your personal account, or changed into another currency, is not a cost. The percentage compares with the same period of the month before.'))}
    ${statTile(t('Result'), m.income || m.expenses ? fmt.money(m.saved, cur) : '—', m.income ? (m.rate === null ? t('Received minus costs') : t('{pct} of what was received', { pct: fmt.pct(m.rate) })) : m.expenses ? t('Received minus costs') : t('Nothing received yet'), t('Received minus costs this month, before anything you take out for yourself. The percentage is the share of what was received that was not spent.'))}
    ${statTile(t('Transfers out'), fmt.money(sent, cur), arrived ? t('Came in: {amount}', { amount: fmt.money(arrived, cur, { trim: true }) }) : '', t('Transfers out of the company’s accounts in this currency this month, such as what you paid yourself or changed into another currency. They are not costs. “Came in” is what arrived by transfer. A transfer between two of these accounts is left out when it names the other account.'))}
  </section>` : `<section class="kpis" aria-label="${fmt.month(ym)}">
    ${statTile(t('Income'), fmt.money(m.income, CUR), t('Plan: {amount}', { amount: fmt.money(payTotal(S, ym), CUR, { trim: true }) }), t('Money that came into your household accounts this month. Transfers between your own accounts and company (PJ) accounts are not counted. “Plan” is the income you planned for the month.'))}
    ${statTile(t('Spending'), fmt.money(m.expenses, CUR), versus(m.expenses, p.expenses, vsLabel, false), t('Expenses in your household accounts this month, pending ones included. Transfers, money put into goals and company (PJ) accounts are not counted. The percentage compares with the same period of the month before.'))}
    ${statTile(t('Left over'), m.income ? fmt.money(m.saved, CUR) : '—', m.income ? (m.rate === null ? t('Income minus spending') : t('{pct} of income', { pct: fmt.pct(m.rate) })) : t('No income recorded yet'), t('Income minus spending this month. The percentage is the share of your income that was not spent. Money put into goals is not spending, so it is part of this figure.'))}
    ${statTile(t('Put into goals'), fmt.money(toGoals, CUR), dist.planned ? t('of {amount} planned', { amount: fmt.money(dist.planned, CUR, { trim: true }) }) : '', t('Contributions minus withdrawals recorded in your goals and funds this month, next to what the plan sets aside. A starting balance is not counted.'))}
  </section>`;
  const planCard = `<section class="card" id="plan-card"><div class="card-h"><h2>${t('Plan vs actual')}</h2>${info(t('Each bar is what was spent against what the plan allows. A bill is paid once a month and counts as paid when a payment is recorded. A budget is spent little by little, so it shows how much is used.'))}${over.length ? `<span class="chip crit"><i></i>${t('{amount} over plan', { amount: fmt.money(overBy, cur) })}</span>` : groups.length ? `<span class="chip good"><i></i>${t('Nothing over plan')}</span>` : ''}<a class="right btn sm ghost" href="#plan">${t('Open plan')}</a></div>
      <div class="card-b">${groups.map(g => `<div class="budget"><b style="font-weight:500"><span class="cat"><span class="dot" style="background:${catColor(g.c.id)}"></span>${esc(g.c.name)}</span></b><span class="num">${fmt.money(g.spent, cur)} <span class="muted">/ ${fmt.money(g.planned, cur)}</span></span>${planMeter(g.spent, g.planned)}
        <div class="meta"><span>${fmt.pct(g.planned ? Math.round(g.spent * 100 / g.planned) : 0)}</span><span>${[g.bills ? t('{a} of {b} bills paid', { a: g.paid, b: g.bills }) : '', g.buds ? t('budgets: {a} of {b}', { a: fmt.money(g.budSpent, cur, { trim: true }), b: fmt.money(g.budPlan, cur, { trim: true }) }) : ''].filter(Boolean).join(' · ')}</span></div></div>`).join('') || `<div class="empty">${t('Nothing planned for {month}', { month: fmt.month(ym) })}</div>`}
        ${over.length ? `<ul class="over-list">${over.map(x => `<li><span>${esc(x.name)}</span><span class="num">${fmt.money(x.spent, cur)} <span class="muted">/ ${fmt.money(x.planned, cur, { trim: true })}</span></span><span class="num neg">${t('{amount} over', { amount: fmt.money(x.spent - x.planned, cur) })}</span></li>`).join('')}</ul>` : ''}</div></section>`;
  const catTitle = co ? t('Costs by category') : t('Spending by category');
  const catCard = `<section class="card" id="cat-card"><div class="card-h"><h2>${catTitle}</h2>${info(co ? t('Each company category’s share of this month’s costs. “Not filed yet” is what has no company category: choose it to file those transactions. Choose a category to see its transactions.') : t('Each category’s share of this month’s spending. Choose a category to see its transactions.'))}</div>
      <div class="card-b">${cats.length ? `
        <div class="stackbar" role="group" aria-label="${catTitle}">${cats.map(x => `<button style="flex:${x.v};background:${col(x.c)}" data-a="filter-cat" data-cat="${x.c.id}" data-tip="${esc(x.c.name)}: ${esc(fmt.money(x.v, cur))} (${fmt.pct(Math.round(x.v * 1000 / m.expenses) / 10)})" aria-label="${esc(x.c.name)} ${esc(fmt.money(x.v, cur))}"></button>`).join('')}</div>
        <div class="legend" style="margin-top:10px">${sorted.map(x => `<button class="legend-row" data-a="filter-cat" data-cat="${x.c.id}"><span class="dot" style="background:${col(x.c)}"></span><span>${esc(x.c.name)}</span><span class="num">${fmt.money(x.v, cur)}</span><span class="pct num">${fmt.pct(x.pct)}</span></button>`).join('')}</div>`
        : `<div class="empty"><b>${co ? t('No costs recorded') : t('No spending recorded')}</b>${co ? t('The company’s costs for this month will appear here.') : t('Expenses for this month will appear here.')}</div>`}
      </div></section>`;
  const trendCard = `<section class="card" id="trend-card"><div class="card-h"><h2>${co ? t('Costs by month') : t('Monthly spending')}</h2>${info(co ? t('What the company paid in each month from its accounts in this currency; transfers are not counted. The current month is still in progress, so its bar is shorter. Choose a bar to open that month.') : t('Total spending in your household accounts in each month; transfers between your own accounts are not counted. The current month is still in progress, so its bar is shorter. Choose a bar to open that month.'))}<span class="sub">${t('Last 6 months')}</span></div>
      <div class="card-b">${colChart(trend, ym, cur)}</div></section>`;
  const inCard = co && came.some(x => x.value) ? `<section class="card" id="in-card"><div class="card-h"><h2>${t('Received by month')}</h2>${info(t('What came into the company’s accounts in this currency in each month; transfers are not counted. The current month is still in progress, so its bar is shorter. Choose a bar to open that month.'))}<span class="sub">${t('Last 6 months')}</span></div>
      <div class="card-b">${colChart(came, ym, cur)}</div></section>` : '';
  const fii = co ? '' : fiiDashCard(ym);
  return `${greeting()}${co ? companyNote() : firstSteps()}${closeBanner()}
  ${noOpening ? banner('warn', `<b>${t('Account balances start at zero.')}</b> ${t('Enter the current balance of each account so the cash figures are real.')} <a class="btn sm" style="margin-left:6px" href="#accounts">${t('Open accounts')}</a>`) : ''}
  ${inProgress ? `<div class="grid g-2 now">${todoCard()}${goalsDashCard()}</div>`
    : `<div class="banner back" id="past-note">${icon('calendar')}<div class="grow">${t('You are looking at {month}. What is due now and your goals are on the current month.', { month: `<b>${fmt.month(ym)}</b>` })}</div><button class="btn sm" data-a="set-month" data-ym="${nowYm}">${t('Back to {month}', { month: fmt.month(nowYm) })}</button></div>`}
  ${fresh ? `<div class="grid g-2">${planCard}${plannedMonthCard(ym)}</div>` : `${tiles}
  <div class="grid g-even">${planCard}${catCard}</div>
  <div class="grid ${fii || inCard ? 'g-even' : ''}">${inCard}${trendCard}${fii}</div>
  <section class="card" id="recent-card"><div class="card-h"><h2>${t('Recent transactions')}</h2>${info(co ? t('The latest transactions in the company’s accounts in this currency. “Pending” is a transaction that is not confirmed yet; it already counts in the figures.') : t('The latest transactions in your household accounts. “Pending” is a transaction that is not confirmed yet; it already counts in the figures.'))}<span class="sub">${inProgress ? '' : t('Up to {month}', { month: fmt.month(ym) })}</span>${co ? `<button class="right btn sm ghost" id="co-all" data-a="filter-cat" data-cat="">${t('View all')}</button>` : `<a class="right btn sm ghost" href="#transactions">${t('View all')}</a>`}</div>
    <div class="card-b flush"><table class="tbl stackable"><thead><tr><th>${t('Date')}</th><th>${t('Merchant')}</th><th>${t('Category')}</th><th>${t('Account')}</th><th class="r">${t('Amount')}</th></tr></thead><tbody>${recent.map(x => txRow(x)).join('') || `<tr><td colspan="5"><div class="empty">${t('No transactions yet')}</div></td></tr>`}</tbody></table></div></section>`}`;
}
