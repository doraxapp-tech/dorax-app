/* Dorax Finance — the company's dashboard on a computer. The phone's is features/phone/phone.company.js; the household's is features/dashboard/dashboard.home.js.
   What the pages share (the month's figures, the cards) is in features/dashboard/dashboard.view.js. */

/** The company's month reads as a sum: received, less costs, is the result; what was moved out stands apart, because a transfer is not a cost. */
function companyTiles(d) {
  const { m, p, b, cur, ym, vsLabel, sent, arrived } = d, op = g => `<span class="op" aria-hidden="true">${g}</span>`;
  return `<section class="kpis eq" aria-label="${fmt.month(ym)}">
    ${statTile(t('Received'), fmt.money(m.income, cur), t('Plan: {amount}', { amount: fmt.money(payTotal(b, ym), cur, { trim: true }) }), t('Money that came into the company’s accounts in this currency this month. Transfers between your own accounts are not counted. “Plan” is the income planned for the month.'), '', 'income')}${op('−')}
    ${statTile(t('Costs'), fmt.money(m.expenses, cur), versus(m.expenses, p.expenses, vsLabel, false), t('What the company paid this month from its accounts in this currency, pending payments included. Transfers are not counted: money sent to your personal account, or changed into another currency, is not a cost. The percentage compares with the same period of the month before.'), '', 'spending')}${op('=')}
    ${statTile(t('Result'), m.income || m.expenses ? fmt.money(m.saved, cur) : '—', m.income ? (m.rate === null ? t('Received minus costs') : t('{pct} of what was received', { pct: fmt.pct(m.rate) })) : m.expenses ? t('Received minus costs') : t('Nothing received yet'), t('Received minus costs this month, before anything you take out for yourself. The percentage is the share of what was received that was not spent.'), 'sum', 'left')}
    ${statTile(t('Transfers out'), fmt.money(sent, cur), arrived ? t('Came in: {amount}', { amount: fmt.money(arrived, cur, { trim: true }) }) : '', t('Transfers out of the company’s accounts in this currency this month, such as what you paid yourself or changed into another currency. They are not costs. “Came in” is what arrived by transfer. A transfer between two of these accounts is left out when it names the other account.'), 'aside', 'transfers')}
  </section>`;
}
/** A company with nothing in this currency yet: what to add first. */
function companyEmptyCard(d) {
  return `<div class="card" id="co-empty"><div class="empty"><b>${t('Nothing for the company in {cur} yet', { cur: d.cur })}</b>${t('Add the company’s fixed costs and reserves, or import a statement of one of its accounts, and its month shows here.')}<div class="row" style="justify-content:center;margin-top:12px"><a class="btn primary" href="#plan">${t('Open plan')}</a><a class="btn" href="#imports">${t('Import a statement')}</a></div></div></div>`;
}
// The company's page is laid out its own way (owner, 2026-10-07: "two separate dashboards, and the company's a bit different in its design, so the
// change is seen and not only the numbers"): a band with the company's name, then the month as a sum (received, less costs, is the result), then
// the parts in the order chosen (features/phone/phone.summary.js, pcParts): by default its cards, its runway beside the insight of the day, what is
// due beside its reserves, plan against actual beside costs by category, and the months.
function companyDashboard(d) {
  const { ym, inProgress, fresh } = d;
  if (d.empty) return `${companyBand()}${companyNote()}${inProgress ? `<div class="grid g-even">${runwayCard()}${insightCard()}</div>` : ''}${companyEmptyCard(d)}`;
  const body = pcParts({ accounts: inProgress && walletOn() ? walletStack() : '', runway: inProgress ? runwayCard() : '', insight: inProgress ? insightCard() : '', todo: inProgress ? todoCard() : '',
    goals: inProgress ? goalsDashCard() : '', plan: d.planCard, planned: fresh ? plannedMonthCard(ym) : '', categories: fresh ? '' : d.catCard, received: fresh ? '' : d.inCard,
    trend: fresh ? '' : d.trendCard, recent: fresh ? '' : d.recentCard });
  return `${companyBand(dashOrderBtn())}${companyNote()}${closeBanner()}${d.openNote}${fresh ? '' : companyTiles(d)}${inProgress ? '' : d.pastNote}${body}`;
}
