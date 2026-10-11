/* Dorax Finance — screen: Dashboard. */
// ---------- Dashboard ----------
/** Before the first transaction there is nothing to chart, but there is a plan: where the month's income is meant to go. */
function plannedMonthCard(ym) {
  const income = payTotal(B(), ym), fixed = planTotals(B(), ym).expenses, goals = distribution(B(), ym).planned, left = income - fixed - goals, base = Math.max(income, fixed + goals);
  const parts = [[t('Fixed costs'), fixed, 'var(--s3)', 0, 'fixed-list'], [t('Goals'), goals, 'var(--s1)', 0, 'goal-list'], [t('Not assigned yet'), Math.max(0, left), 'var(--col-muted)']].filter(x => x[1] > 0);
  // on a phone, Fixed costs and Savings and goals open their list, and each line of it its details (owner, 2026-10-08; features/phone/phone.summary.js)
  const row = x => { const inner = `<span class="dot" style="background:${x[2]}"></span><span>${x[0]}</span><span class="num">${fmt.money(x[1], BCUR())}</span><span class="pct num">${fmt.pct(x[3])}</span>`;
    return !isPhone() ? `<div class="legend-row still">${inner}</div>` : x[4] ? `<button class="legend-row go" data-a="${x[4]}" data-ym="${ym}">${inner}${icon('right')}</button>` : `<div class="legend-row still go-pad">${inner}<span aria-hidden="true"></span></div>`; };
  // shares are whole numbers that add up to 100 whenever the parts add up to the income (wholeShares, engine.js)
  wholeShares(parts.map(x => x[1]), base).forEach((p, i) => { parts[i][3] = p; });
  return `<section class="card" id="planned-month"><div class="card-h"><h2>${t('Your month, as planned')}</h2>${info(t('Your planned income for the month, split into fixed costs, goals, and what has no job yet. Nothing here has been spent: it is the plan.'))}<span class="sub">${fmt.month(ym)}</span></div><div class="card-b">${base ? `
      <div class="note">${t('Planned income')}</div><div class="bal num" style="margin-bottom:14px">${fmt.money(income, BCUR())}</div>
      <div class="stackbar" role="img" aria-label="${esc(parts.map(x => `${x[0]} ${fmt.money(x[1], BCUR())}`).join(', '))}">${parts.map(x => `<span style="flex:${x[1]};background:${x[2]}"></span>`).join('')}</div>
      <div class="legend" style="margin-top:10px">${parts.map(row).join('')}</div>
      ${left < 0 ? banner('warn', t('The plan uses {amount} more than the planned income.', { amount: fmt.money(-left, BCUR()) })) : ''}
      <p class="note" style="margin-top:12px">${t('Charts of what you actually spend appear here with your first payment or transaction.')}</p>
      <div class="row" style="margin-top:10px"><a class="btn sm" href="#plan">${t('Open plan')}</a><a class="btn sm ghost" href="#imports">${t('Import a statement')}</a></div>`
      : `<div class="empty"><b>${t('Nothing planned for {month}', { month: fmt.month(ym) })}</b>${t('Add your income and your fixed costs to see where the month goes.')}<div style="margin-top:12px"><a class="btn sm" href="#plan">${t('Open plan')}</a></div></div>`}</div></section>`;
}
/** One headline figure. The comparison names its period; a month in progress is compared with the same days of the month before, never with a whole month. */
/** A figure as a tile. k: the tile opens a card that explains its figure (features/dashboard/kpi-explain.js): a button over the whole tile, under its
    (i) and its link, so each keeps its own press. */
function statTile(label, value, sub, tip, cls, k) { return `<div class="kpi${cls ? ' ' + cls : ''}${k ? ' tap' : ''}">${k ? `<button class="kpi-open" data-a="kpi-open" data-k="${k}" aria-haspopup="dialog" aria-label="${esc(String(label).replace(/<[^>]+>/g, '') + ': ' + t('what this figure is made of'))}"></button>` : ''}<span class="label"><span>${label}</span>${tip ? info(tip) : ''}</span><span class="value">${value}</span><span class="delta">${sub || '&nbsp;'}</span></div>`; }
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
  return `<section class="card" id="fii-card"><div class="card-h"><h2>${t('Investments (FIIs)')}</h2>${info(t('The position is your quotas multiplied by the price you typed for each fund. Dorax does not fetch market prices. “Received” is the income you recorded for the month.'))}<span class="sub">${t('Income received, last 6 months')}</span><a class="right btn sm go" href="#investments">${t('Open investments')}${icon('right')}</a></div>
    <div class="card-b"><div class="figure"><b>${fmt.money(f.value, CUR)}</b><span>${t('position at the prices you typed')} · ${t('{month}: {amount} received', { month: fmt.month(ym, 'bare'), amount: fmt.money(fiiIncomeMonth(S, ym), CUR) })}</span></div>
      ${pts.some(x => x.value) ? colChart(pts, ym, CUR) : `<div class="empty">${t('No income recorded yet.')}</div>`}</div></section>`;
}
// 2026-10-07 (owner, asked which gap to close first: "company dashboard"): the dashboard has the two sides, like Plan (Household | Company in the
// top bar, and the currency when the company has more than one). The company's side is the same page read from the company's book: what is due,
// its reserves, the month's four figures (received, costs, result, transfers out), plan against actual, costs by category, six months of
// what was received and of costs, and its latest transactions. One currency at a time, nothing converted, and never a household figure. On the household's side
// B() is S and BCUR() is CUR, so that side is what it was.
// ---------- the dashboards ----------
// 2026-10-07 (owner: "make sure the dashboards are not in the same file, they must be separate, and the mobile version too"). Four pages, four files:
//   the household's on a computer   features/dashboard/dashboard.home.js
//   the company's on a computer     features/company/company.dashboard.js
//   the household's on a phone      features/phone/phone.home.js
//   the company's on a phone        features/phone/phone.company.js
// This file keeps what they share: the month's figures worked out once (dashParts) and the cards more than one of them shows. Each page decides
// which cards it shows and in what order; changing one page does not touch the others.

/** The month of the side in use, worked out once: its figures, and the cards the pages choose from. */
function dashParts() {
  const co = inCompany(), b = B(), cur = BCUR(), accts = co ? bookAccounts() : personal();
  const mine = co ? (x => accts.some(a => a.id === x.accountId)) : (x => !isBiz(x.accountId));      // the transactions this side counts
  const ym = S.month, nowYm = ymOf(S.today), prevYm = addMonths(ym, -1), inProgress = ym === nowYm, m = monthSummary(b, ym, cur);
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
  const unpaid = prog.filter(x => x.bill && x.toPay > 0), nextDue = unpaid.filter(x => x.dueDate && x.dueDate >= S.today).sort((x, y) => x.dueDate < y.dueDate ? -1 : 1)[0];
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
  const planCard = `<section class="card" id="plan-card"><div class="card-h"><h2>${t('Plan vs actual')}</h2>${info(t('Each bar is what was spent against what the plan allows. A bill is paid once a month and counts as paid when a payment is recorded. A budget is spent little by little, so it shows how much is used.'))}${over.length ? `<span class="chip crit"><i></i>${t('{amount} over plan', { amount: fmt.money(overBy, cur) })}</span>` : groups.length ? `<span class="chip good"><i></i>${t('Nothing over plan')}</span>` : ''}<a class="right btn sm go" href="#plan">${t('Open plan')}${icon('right')}</a></div>
      <div class="card-b">${groups.map(g => `<div class="budget"><b style="font-weight:500"><span class="cat">${catGlyph(g.c, 'sm')}${esc(g.c.name)}</span></b><span class="num">${fmt.money(g.spent, cur)} <span class="muted">/ ${fmt.money(g.planned, cur)}</span></span>${planMeter(g.spent, g.planned)}
        <div class="meta"><span>${fmt.pct(g.planned ? Math.round(g.spent * 100 / g.planned) : 0)}</span><span>${[g.bills ? t('{a} of {b} bills paid', { a: g.paid, b: g.bills }) : '', g.buds ? t('budgets: {a} of {b}', { a: fmt.money(g.budSpent, cur, { trim: true }), b: fmt.money(g.budPlan, cur, { trim: true }) }) : ''].filter(Boolean).join(' · ')}</span></div></div>`).join('') || `<div class="empty">${t('Nothing planned for {month}', { month: fmt.month(ym) })}</div>`}
        ${over.length ? `<ul class="over-list">${over.map(x => `<li><span>${esc(x.name)}</span><span class="num">${fmt.money(x.spent, cur)} <span class="muted">/ ${fmt.money(x.planned, cur, { trim: true })}</span></span><span class="num neg">${t('{amount} over', { amount: fmt.money(x.spent - x.planned, cur) })}</span></li>`).join('')}</ul>` : ''}</div></section>`;
  const catTitle = co ? t('Costs by category') : t('Spending by category');
  const catCard = `<section class="card" id="cat-card"><div class="card-h"><h2>${catTitle}</h2>${info(co ? t('Each company category’s share of this month’s costs. “Not filed yet” is what has no company category: choose it to file those transactions. Choose a category to see its transactions.') : t('Each category’s share of this month’s spending. Choose a category to see its transactions.'))}</div>
      <div class="card-b">${cats.length ? `
        <div class="stackbar" role="group" aria-label="${catTitle}">${cats.map(x => `<button style="flex:${x.v};background:${col(x.c)}" data-a="filter-cat" data-cat="${x.c.id}" data-tip="${esc(x.c.name)}: ${esc(fmt.money(x.v, cur))} (${fmt.pct(Math.round(x.v * 1000 / m.expenses) / 10)})" aria-label="${esc(x.c.name)} ${esc(fmt.money(x.v, cur))}"></button>`).join('')}</div>
        <div class="legend" style="margin-top:10px">${sorted.slice(0, 5).map(x => `<button class="legend-row" data-a="filter-cat" data-cat="${x.c.id}"><span class="dot" style="background:${col(x.c)}"></span><span>${esc(x.c.name)}</span><span class="num">${fmt.money(x.v, cur)}</span><span class="pct num">${fmt.pct(x.pct)}</span></button>`).join('')}</div>${sorted.length > 5 ? `<a class="linkbtn cat-all" href="#reports">${t('See all {n} in Reports', { n: sorted.length })}${icon('right')}</a>` : ''}`
        : `<div class="empty"><b>${co ? t('No costs recorded') : t('No spending recorded')}</b>${co ? t('The company’s costs for this month will appear here.') : t('Expenses for this month will appear here.')}</div>`}
      </div></section>`;
  const trendCard = `<section class="card" id="trend-card"><div class="card-h"><h2>${co ? t('Costs by month') : t('Monthly spending')}</h2>${info(co ? t('What the company paid in each month from its accounts in this currency; transfers are not counted. The current month is still in progress, so its bar is shorter. Choose a bar to open that month.') : t('Total spending in your household accounts in each month; transfers between your own accounts are not counted. The current month is still in progress, so its bar is shorter. Choose a bar to open that month.'))}<span class="sub">${t('Last 6 months')}</span></div>
      <div class="card-b">${colChart(trend, ym, cur)}</div></section>`;
  const inCard = co && came.some(x => x.value) ? `<section class="card" id="in-card"><div class="card-h"><h2>${t('Received by month')}</h2>${info(t('What came into the company’s accounts in this currency in each month; transfers are not counted. The current month is still in progress, so its bar is shorter. Choose a bar to open that month.'))}<span class="sub">${t('Last 6 months')}</span></div>
      <div class="card-b">${colChart(came, ym, cur)}</div></section>` : '';
  const fii = co ? '' : fiiDashCard(ym);
  const recentCard = `<section class="card" id="recent-card"><div class="card-h"><h2>${t('Recent transactions')}</h2>${info(co ? t('The latest transactions in the company’s accounts in this currency. “Pending” is a transaction that is not confirmed yet; it already counts in the figures.') : t('The latest transactions in your household accounts. “Pending” is a transaction that is not confirmed yet; it already counts in the figures.'))}<span class="sub">${inProgress ? '' : t('Up to {month}', { month: fmt.month(ym) })}</span>${co ? `<button class="right btn sm go" id="co-all" data-a="filter-cat" data-cat="">${t('View all')}${icon('right')}</button>` : `<a class="right btn sm go" href="#transactions">${t('View all')}${icon('right')}</a>`}</div>
    <div class="card-b flush"><table class="tbl stackable"><thead><tr><th>${t('Date')}</th><th>${t('Merchant')}</th><th>${t('Category')}</th><th>${t('Account')}</th><th class="r">${t('Amount')}</th></tr></thead><tbody>${recent.map(x => txRow(x)).join('') || `<tr><td colspan="5"><div class="empty">${t('No transactions yet')}</div></td></tr>`}</tbody></table></div></section>`;
  const pastNote = `<div class="banner back" id="past-note">${icon('calendar')}<div class="grow">${t('You are looking at {month}. What is due now and your goals are on the current month.', { month: `<b>${fmt.month(ym)}</b>` })}</div><button class="btn sm" data-a="set-month" data-ym="${nowYm}">${t('Back to {month}', { month: fmt.month(nowYm) })}</button></div>`;
  // a card with credit and no due date for its invoice (owner, 2026-10-09: "inconceivable"): the forms now require it; one saved before is asked
  // for here, on its side's dashboard, with the way to give it
  const noDue = sideAccounts(co ? 'business' : 'personal').filter(a => a.type === 'credit' && !a.dueDay);
  const openNote = (noOpening ? banner('warn', `<b>${t('Account balances start at zero.')}</b> ${t('Enter the current balance of each account so the cash figures are real.')} <a class="btn sm" style="margin-left:6px" href="#accounts">${t('Open accounts')}</a>`) : '')
    + noDue.map(a => banner('warn', `<b>${t('{name} has no due date for its invoice.', { name: esc(acctName(a)) })}</b> ${t('Without it the app cannot remind you of the invoice or tell you when it is late.')} <button class="btn sm" style="margin-left:6px" data-a="edit-account" data-id="${a.id}">${t('Add the date')}</button>`)).join('');
  const empty = co && !S.transactions.some(mine) && !b.plan.lines.length && !b.goals.length && !payTotal(b, ym);      // a company with nothing in this currency yet
  return { co, b, cur, ym, nowYm, inProgress, m, p, vsLabel, prog, unpaid, nextDue, fresh, dist, toGoals, sent, arrived, empty, planCard, catCard, trendCard, inCard, fii, recentCard, pastNote, openNote };      // the cards are laid out two to a row by pcParts (features/phone/phone.summary.js)
}
/** The page: whose it is and on what it is read decide which of the four is drawn. A company with nothing yet is set up first (features/company). */
function viewDashboard() {
  const co = inCompany(), phone = isPhone();
  if (co && UI.coSetup) return viewCompanySetup();
  const d = dashParts();
  return co ? (phone ? phoneCompanyDashboard(d) : companyDashboard(d)) : (phone ? phoneHomeDashboard(d) : homeDashboard(d));
}
