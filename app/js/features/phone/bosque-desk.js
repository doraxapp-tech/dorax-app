/* Dorax Finance — the household's summary and Transactions on a computer, in the summary's look (v199, owner, 2026-10-12: "push updates a la versión
   de ordenador", "Todo, como el teléfono", the side bar "Verde bosque"; then v201, the same day: "lo que hiciste fue usar el mismo layout del celular…
   claramente se ve que es una versión agrandada de celular, no una versión web").
   So a computer keeps the phone's colours and shapes but its own layout, made for a wide screen and a pointer:
     - the summary's forest top is a dashboard's header: the greeting and the household's net balance, the month's four figures side by side under it
       (income against the plan, spending against the month before, what is left over, what is still to pay; each opens how it is worked out), "You can
       spend" at the right, and a row of buttons (expense, income, transfer, more, the order of the parts). Under it, on the grey, the computer's parts
       in the order the person chose ("Reorder the dashboard"): the cards, the days of freedom, the insight, what is due with its buttons, the goals,
       where the money went, the trend, the latest movements;
     - Transactions: a forest header with the switch (expenses, income, all), the month's figure, how it compares and the month, and the month's chart
       wide at its right; under it the computer's table, with its search and filters, its columns and its pages.
   The phone keeps its own (features/phone/bosque.js, bosque-moves.js). Styles: css/look/look-land-desk.css. */

/** How wide a part of a computer's page is: its area `work` px wide, less the page's margins (css/look/look-land-desk.css, --bq-gut, with the 1400
    px page of base/shell.css), shared between columns: `share` of what is left after `gap` px between them. The charts are drawn that wide. */
const bqDeskW = (work, share, gap) => { const gut = Math.max(32, (work - 1400) / 2 + 32); return Math.max(320, Math.round((work - 2 * gut - gap) * share)); };
const bqWorkW = () => ((document.querySelector('.work') || {}).clientWidth) || innerWidth;
// a window made wider or narrower: the page is drawn again for its new widths (once the resizing stops)
let bqDeskT = 0, bqDeskLast = 0;
addEventListener('resize', () => { clearTimeout(bqDeskT); bqDeskT = setTimeout(() => { const w = bqWorkW(); if (typeof landOn === 'function' && landOn() && !isPhone() && (UI.route === 'dashboard' || UI.route === 'transactions') && !UI.drawer && !UI.sheet && Math.abs(w - bqDeskLast) > 24) { bqDeskLast = w; render(); } }, 160); });

// ---------- the summary ----------
const BQ_SWAP = '<path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/>';
/** The row of buttons under the figures: the things to record first, More, and the order of the parts. */
function bqDeskActs() {
  const by = Object.fromEntries(quickItems().map(x => [x[0], x]));
  const one = (v, d, label, main) => by[v] ? `<button class="bq-dact${main ? ' main' : ''}" data-a="quick-go" data-v="${v}" aria-label="${esc(by[v][2])}">${bqSvg(d)}<span>${label}</span></button>` : '';
  return `<div class="bq-dacts">${one('expense', BQ_OUT, quickShort('expense'), true)}${one('income', BQ_IN, t('Inflow'))}${one('transfer', BQ_SWAP, t('Move money'))}<button class="bq-dact" data-a="quick-more" aria-haspopup="dialog">${icon('more')}<span>${t('More')}</span></button>${dashOrderBtn()}</div>`;
}
/** The header on the forest: greeting, net balance, the month's four figures, "You can spend", the buttons. */
function bqDeskHero(d) {
  const { m, p, ym, vsLabel, unpaid, nextDue, prog, inProgress } = d;
  const stat = (k, label, value, sub, cls) => `<button class="bq-dk${cls ? ' ' + cls : ''}" data-a="kpi-open" data-k="${k}" aria-haspopup="dialog"><span class="bq-dk-k">${label}</span><b class="num">${value}</b><small>${sub || '&nbsp;'}</small></button>`;
  const figs = stat('income', t('Income'), fmt.money(m.income, CUR), t('Plan: {amount}', { amount: fmt.money(payTotal(S, ym), CUR, { trim: true }) }))
    + stat('spending', t('Spending'), fmt.money(m.expenses, CUR), versus(m.expenses, p.expenses, vsLabel, false))
    + stat('left', t('Left over'), m.income ? fmt.money(m.saved, CUR) : '—', m.income ? (m.rate === null ? t('Income minus spending') : t('{pct} of income', { pct: fmt.pct(m.rate) })) : t('No income recorded yet'), m.income && m.saved < 0 ? 'neg' : '')
    + stat('unpaid', t('Still to pay'), unpaid.length ? fmt.money(sum(unpaid.map(x => x.toPay)), CUR) : '—', unpaid.length ? tn(unpaid.length, '{n} bill', '{n} bills') + (nextDue ? ' · ' + t('next on {date}', { date: fmt.date(nextDue.dueDate) }) : '') : prog.some(x => x.bill && x.planned) ? t('Every bill of the month is paid') : '');
  return `<section class="bq-dhero"><div class="bq-dh-l">${greeting()}<div class="bq-dbal">${barBalance()}</div></div>${inProgress ? `<div class="bq-dh-r">${bqFree()}</div>` : ''}
    <div class="bq-dkpis" role="group" aria-label="${esc(fmt.month(ym))}">${figs}</div>${inProgress ? bqDeskActs() : dashOrderBtn() ? `<div class="bq-dacts">${dashOrderBtn()}</div>` : ''}</section>`;
}
function bqHomeDesk(d) {
  const { ym, inProgress, fresh } = d; bqDeskLast = bqWorkW();
  // the computer's parts, in the order the person chose (pcParts: features/phone/phone.summary.js); "You can spend" and the figures are in the header
  const body = pcParts({ accounts: inProgress && walletOn() ? walletStack() : '', free: '', runway: inProgress ? runwayCard() : '', insight: inProgress ? insightCard() : '', todo: inProgress ? todoCard(true, 4) : '',
    goals: inProgress ? goalsDashCard() : '', planned: fresh ? plannedMonthCard(ym) : '', categories: fresh ? '' : d.catCard, trend: fresh ? '' : d.trendCard, fii: fresh ? '' : d.fii, recent: fresh ? '' : d.recentCard });
  return `${bqDeskHero(d)}${firstSteps()}${inProgress ? monthCloseCard() : ''}${inProgress ? '' : d.pastNote}${companyAsk()}${d.openNote}${body}`;
}

// ---------- Transactions ----------
/** The header on the forest: the switch, the figure, how it compares, the month; the month's chart wide at the right. It follows the search as it
    is typed (transactions.view.js: txLive), as the list does. */
function bqTxDeskTop() {
  bqDeskLast = bqWorkW();
  if (!UI.tx.bqSeen) { UI.tx.bqSeen = true; if (!UI.tx.type) UI.tx.type = 'expense'; }      // expenses first, the first time in a visit (as the phone)
  return `<section class="bq-dhero bq-dtx" id="bq-dtx" aria-label="${esc(t('Summary of what is listed'))}">${bqTxDeskIn()}</section>`;
}
function bqTxDeskIn() {
  const f = UI.tx, m = bqTxMonth(), kind = bqTxKind(), cur = txCurOf(f), p = bqSumParts(f, m, kind, cur, { W: bqDeskW(bqWorkW(), 1.7 / 2.7, 40) });
  const seg = [['expense', t('Expenses')], ['income', t('Income')], ['', t('All')]];
  const pager = m ? `<div class="bq-mon" role="group" aria-label="${t('Month')}"><button data-a="bq-tx-month" data-d="-1" aria-label="${t('Previous month')}" ${m <= minMonth() ? 'disabled' : ''}>${icon('left')}</button><span>${fmt.month(m, true)}</span><button data-a="bq-tx-month" data-d="1" aria-label="${t('Next month')}" ${m >= ymOf(S.today) ? 'disabled' : ''}>${icon('right')}</button></div>` : '';
  return `<div class="bq-dtx-l">
      <div class="bq-kind" role="group" aria-label="${t('What to show')}">${seg.map(([v, l]) => `<button data-a="bq-tx-kind" data-v="${v}" aria-pressed="${(v || 'all') === kind}">${l}</button>`).join('')}</div>
      <div class="bq-sum-l"><span class="bq-sum-k">${esc(p.label)}</span><b class="bq-sum-v num${p.neg ? ' neg' : ''}">${p.big}</b>${p.chip}</div>${pager}</div>
    <div class="bq-dtx-r">${p.chart}</div>`;
}
