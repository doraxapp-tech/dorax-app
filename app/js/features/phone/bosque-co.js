/* Dorax Finance — the company's summary in the summary's look (v214, owner, 2026-10-13: "actualiza la vista empresa en el backend, aún tienen la
   versión vieja"). The household's summary is features/phone/bosque.js (a phone) and bosque-desk.js (a computer); the company's has the same shapes
   and its own content, laid out its own way, so the change of side is seen and not only the numbers (owner, 2026-10-07):
     - a phone: under the net balance (and the currency, for a company with more than one), the block goes on into the month as a sum: the result
       large, what came in less the costs under it; the strip at its foot says what was transferred out (the owner's pay, a change of currency) and
       opens how it is counted. Then the four round buttons in the company's words, its accounts, what it has to pay, its runway beside its goals,
       its month's costs and latest transactions, the day's fact, and the company itself (its name, its kind, the way to edit it);
     - a computer: the header has the company's name, its net balance, the month's four figures (received, costs, result, transferred) and, at the
       right, how long its money lasts; the parts under it as the household's.
   The previous company summary (features/company/company.dashboard.js, features/phone/phone.company.js) stays for the look before this one
   (tests/pw.js: oldLook). Every figure comes from the same places as before (dashParts, features/dashboard/dashboard.view.js). */

/** The company itself: its name (or "Your company"), its kind, and the button that names or edits it, which is also where the side is turned off. */
function bqCoId() {
  const co = S.company || {}, name = (co.name || '').trim(), kind = companyKind(co.kind);
  return `<section class="bq-co-id" id="co-band"><span class="bq-co-ic" aria-hidden="true">${icon('briefcase')}</span><span class="bq-co-n"><b>${esc(name || t('Your company'))}</b>${kind ? `<small>${kind}</small>` : ''}</span>
    <button class="bq-co-edit" data-a="company-edit">${name ? t('Edit') : t('Name it')}</button></section>`;
}

/** A phone: the month as a sum, under the net balance, on the block; the strip at its foot is what was transferred out. */
function bqCoMonth(d) {
  const { m, cur, ym, sent, arrived } = d, money = v => fmt.money(v, cur), some = m.income || m.expenses;
  const s = some ? money(m.saved) : '—', cut = /^(.*\d)([.,]\d{2})$/.exec(s), big = cut ? `${esc(cut[1])}<small class="cents">${cut[2]}</small>` : esc(s);
  const sumLine = some ? `${t('Received')} <b class="num">${money(m.income)}</b> − ${t('Costs')} <b class="num">${money(m.expenses)}</b>` : t('Nothing received yet');
  const say = `${t('Transfers out')}: <b>${money(sent)}</b>${arrived ? `<br>${t('Came in: {amount}', { amount: `<b>${money(arrived)}</b>` })}` : ''}`;
  return `<section class="bq-free bq-co" id="co-month" aria-label="${esc(`${t('Result')} · ${fmt.month(ym)}`)}">
    <button class="bq-free-top bq-co-top" data-a="kpi-open" data-k="left" aria-haspopup="dialog"><span class="bq-chip">${t('Result')} · ${esc(mcMonth(ym))}</span>
      <b class="bq-co-v num${some && m.saved < 0 ? ' neg' : ''}">${big}</b><span class="bq-co-sum">${sumLine}</span></button>
    <button class="bq-free-foot" data-a="kpi-open" data-k="transfers" aria-haspopup="dialog"><span class="bq-say">${say}</span><span class="bq-go" aria-hidden="true">${bqSvg(BQ_OUT)}</span></button></section>`;
}

/** A phone: the company's summary in this look, always in the same order (no "Reorder the dashboard" here, as on the household's). */
function bqCompany(d) {
  UI.dashShown = [];
  const notes = `${companyNote()}${d.inProgress ? closeBanner() : ''}${d.openNote}`;
  if (d.empty) return `${bqCoMonth(d)}${bqActions()}${bqAccounts()}${notes}${companyEmptyCard(d)}${bqCoId()}`;
  if (!d.inProgress) return `${d.pastNote}${bqCoMonth(d)}${bqAccounts()}${bqHomeMoves()}${notes}${bqCoId()}`;
  return `${bqCoMonth(d)}${bqActions()}${bqAccounts()}${bqTodo()}${bqPair()}${bqHomeMoves()}${phoneInsight()}${notes}${bqCoId()}`;
}

/** A computer, at the right of the header: how long the company's money lasts at its pace, as "You can spend" is on the household's; its strip
    says the next mark and opens the runway. Nothing while it cannot be worked out yet (its card under the header says how to set it up). */
function bqCoRun() {
  const r = runway(B(), B().today, BCUR()); if (!r || r.days === null) return '';
  const days = r.days, next = RUNWAY_MARKS.find(x => x > days), months = days >= 60;
  const n = months ? fmt.num(runwayMonths(days)) : fmt.num(days), unit = months ? t('months') : t('days');
  const say = next ? t('Next goal: {mark}.', { mark: rwMark(next) }) : t('Past every goal: more than a year.');
  return `<section class="bq-free bq-co-run" id="co-run" aria-label="${esc(t('Company runway'))}"><div class="bq-free-top"><span class="bq-chip">${t('Company runway')}</span>
      <span class="fu-big"><span class="fu-n num">${n}</span> ${unit}</span></div>
    <button class="bq-free-foot" data-a="runway-view" aria-haspopup="dialog"><span class="bq-say">${say}</span><span class="bq-go" aria-hidden="true">${bqSvg(BQ_OUT)}</span></button></section>`;
}
/** A computer: the header on the block: the company, its net balance, the month's four figures, its runway at the right, the buttons. */
function bqCoDeskHero(d) {
  const { m, p, b, cur, ym, vsLabel, sent, arrived, inProgress } = d, money = v => fmt.money(v, cur);
  const stat = (k, label, value, sub, cls) => `<button class="bq-dk${cls ? ' ' + cls : ''}" data-a="kpi-open" data-k="${k}" aria-haspopup="dialog"><span class="bq-dk-k">${label}</span><b class="num">${value}</b><small>${sub || '&nbsp;'}</small></button>`;
  const figs = stat('income', t('Received'), money(m.income), t('Plan: {amount}', { amount: fmt.money(payTotal(b, ym), cur, { trim: true }) }))
    + stat('spending', t('Costs'), money(m.expenses), versus(m.expenses, p.expenses, vsLabel, false))
    + stat('left', t('Result'), m.income || m.expenses ? money(m.saved) : '—', m.income ? (m.rate === null ? t('Received minus costs') : t('{pct} of what was received', { pct: fmt.pct(m.rate) })) : m.expenses ? t('Received minus costs') : t('Nothing received yet'), (m.income || m.expenses) && m.saved < 0 ? 'neg' : '')
    + stat('transfers', t('Transfers out'), money(sent), arrived ? t('Came in: {amount}', { amount: fmt.money(arrived, cur, { trim: true }) }) : '');
  const run = inProgress ? bqCoRun() : '';
  return `<section class="bq-dhero bq-co-hero"><div class="bq-dh-l">${bqCoId()}<div class="bq-dbal">${barBalance()}</div></div>${run ? `<div class="bq-dh-r">${run}</div>` : ''}
    <div class="bq-dkpis" role="group" aria-label="${esc(fmt.month(ym))}">${figs}</div>${inProgress ? bqDeskActs() : dashOrderBtn() ? `<div class="bq-dacts">${dashOrderBtn()}</div>` : ''}</section>`;
}
/** A computer: the company's summary in this look. The parts under the header in the order the person chose, as the household's; the runway is in
    the header when it can be worked out, so not again under it. */
function bqCompanyDesk(d) {
  const { ym, inProgress, fresh } = d; bqDeskLast = bqWorkW();
  if (d.empty) return `${bqCoDeskHero(d)}${companyNote()}${inProgress ? `<div class="grid g-even">${runwayCard()}${insightCard()}</div>` : ''}${companyEmptyCard(d)}`;
  const inHero = inProgress && !!bqCoRun();
  const body = pcParts({ accounts: '', runway: inProgress && !inHero ? runwayCard() : '', insight: inProgress ? insightCard() : '', todo: inProgress ? bqDeskTodo() : '',
    goals: inProgress ? bqDeskGoals() : '', plan: d.planCard, planned: fresh ? plannedMonthCard(ym) : '', categories: fresh ? '' : d.catCard, received: fresh ? '' : d.inCard,
    trend: fresh ? '' : d.trendCard, recent: fresh ? '' : d.recentCard }, ['todo', 'goals']);
  return `${bqCoDeskHero(d)}${companyNote()}${inProgress ? closeBanner() : ''}${inProgress ? '' : d.pastNote}${d.openNote}${body}`;
}
