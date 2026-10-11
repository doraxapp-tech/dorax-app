/* Dorax Finance — the household's dashboard on a computer. The phone's is features/phone/phone.home.js; the company's is features/company/company.dashboard.js.
   What the pages share (the month's figures, the cards) is in dashboard.view.js. */

/** Five figures: what the household has today, then the month's four. 2026-10-08 (owner: "remove the KPI card 'Put into goals' and add 'Household
    net balance' first, with a white background maybe"; then: "like the other cards, only the font green"): the net balance leads, a tile like the
    others with its amount in green; what went into goals this month is on the Goals page and its card.
    2026-10-09 (owner: "on the household net balance KPI card add a button with two arrows to see the household's total savings, or is a separate
    card better?"): neither. The savings are already inside the net balance, so the tile says how much of it is saved, on its second line: seen at a
    glance with no click, and read as a part of the balance. A flip would hide one of the two figures and make the balance seem to change, and the
    two arrows already mean Household | Company on a phone; a card of its own, beside the balance, would invite adding the two. */
function homeTiles(d) {
  const { m, p, ym, vsLabel, unpaid, nextDue, prog } = d, mine = personal().filter(a => a.currency === CUR), at = a => accountBalance(S, a.id, S.today);
  const net = mine.reduce((s, a) => s + at(a), 0), saved = mine.filter(a => a.type === 'savings').reduce((s, a) => s + at(a), 0);
  return `<section class="kpis" aria-label="${fmt.month(ym)}">
    ${statTile(t('Household net balance'), fmt.money(net, CUR), saved > 0 ? `<a class="kpi-saved" href="#accounts">${t('Of which {amount} in savings', { amount: `<b class="num">${fmt.money(saved, CUR, { trim: true })}</b>` })}</a>` : t('In your household accounts today'),
      saved > 0 ? t('What is in your household accounts in {cur} today: what is kept in them, less what is owed on cards. The savings are what your savings accounts hold, already counted in it. Company (PJ) accounts and other currencies are not counted.', { cur: CUR })
        : t('What is in your household accounts in {cur} today: what is kept in them, less what is owed on cards. Company (PJ) accounts and other currencies are not counted.', { cur: CUR }), 'net' + (net < 0 && !numsHidden() ? ' neg' : ''), 'net')}
    ${statTile(t('Income'), fmt.money(m.income, CUR), t('Plan: {amount}', { amount: fmt.money(payTotal(S, ym), CUR, { trim: true }) }), t('Money that came into your household accounts this month. Transfers between your own accounts and company (PJ) accounts are not counted. “Plan” is the income you planned for the month.'), '', 'income')}
    ${statTile(t('Spending'), fmt.money(m.expenses, CUR), versus(m.expenses, p.expenses, vsLabel, false), t('Expenses in your household accounts this month, pending ones included. Transfers, money put into goals and company (PJ) accounts are not counted. The percentage compares with the same period of the month before.'), '', 'spending')}
    ${statTile(t('Left over'), m.income ? fmt.money(m.saved, CUR) : '—', m.income ? (m.rate === null ? t('Income minus spending') : t('{pct} of income', { pct: fmt.pct(m.rate) })) : t('No income recorded yet'), t('Income minus spending this month. The percentage is the share of your income that was not spent. Money put into goals is not spending, so it is part of this figure.'), '', 'left')}
    ${statTile(t('Still to pay'), unpaid.length ? fmt.money(sum(unpaid.map(x => x.toPay)), CUR) : '—', unpaid.length ? tn(unpaid.length, '{n} bill', '{n} bills') + (nextDue ? ' · ' + t('next on {date}', { date: fmt.date(nextDue.dueDate) }) : '') : prog.some(x => x.bill && x.planned) ? t('Every bill of the month is paid') : t('No fixed costs yet'), t('The fixed costs of this month that have no payment yet, at their planned amounts. Card invoices are not in this figure.'), '', 'unpaid')}
  </section>`;
}
// The household's summary is direct (owner, 2026-10-07: "add the most important KPI cards and numbers; show To do when a date is near; remove
// Plan vs actual"): the figures first, then the parts in the order the person chose (features/phone/phone.summary.js, pcParts), by default the
// accounts' cards, the days of freedom beside the insight of the day, what is due soon (only then) beside the goals, where the money went and the
// latest movements. Plan against actual lives on the Plan page. The notices about the data stay above the parts, as on a phone.
// A person who has not finished the first steps sees them before anything else (owner, 2026-10-07: "nothing is more important than that").
function homeDashboard(d) {
  const { ym, inProgress, fresh } = d;
  const body = pcParts({ accounts: inProgress && walletOn() ? walletStack() : '', free: inProgress ? freeCard() : '', runway: inProgress ? runwayCard() : '', insight: inProgress ? insightCard() : '', todo: inProgress ? todoCard(true, 4) : '',
    goals: inProgress ? goalsDashCard() : '', planned: fresh ? plannedMonthCard(ym) : '', categories: fresh ? '' : d.catCard, trend: fresh ? '' : d.trendCard, fii: fresh ? '' : d.fii, recent: fresh ? '' : d.recentCard });
  return `${greeting(dashOrderBtn())}${firstSteps()}${inProgress ? monthCloseCard() : ''}${homeTiles(d)}${inProgress ? '' : d.pastNote}${companyAsk()}${d.openNote}${body}`;      // the close of last month, in its first days (features/month-close)
}
