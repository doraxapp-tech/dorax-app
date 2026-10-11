/* Dorax Finance — the company's dashboard on a phone. The computer's is features/company/company.dashboard.js; what the two share (the month's
   figures, the cards) is in features/dashboard/dashboard.view.js. */

// The company's band and the notices about its data, then the parts in the order chosen (features/phone/phone.summary.js). By default: its
// runway, the quick things to do in the company's words, the day's insight as a signal, its accounts, and its cards.
function phoneCompanyDashboard(d) {
  const { ym, inProgress, fresh } = d;
  if (d.empty) return `${companyBand()}${inProgress ? runwayCard() : ''}${quickRow()}${companyNote()}${inProgress ? phoneInsight() : ''}${companyEmptyCard(d)}`;
  return `${companyBand()}${inProgress ? '' : d.pastNote}${companyNote()}${closeBanner()}${d.openNote}` + phoneParts({
    runway: inProgress ? runwayCard() : '', quick: quickRow(), insight: inProgress ? phoneInsight() : '', accounts: phoneAccountsCard(),
    todo: inProgress ? todoCard() : '', goals: inProgress ? goalsDashCard() : '', plan: d.planCard, planned: fresh ? plannedMonthCard(ym) : '',
    categories: fresh ? '' : d.catCard, received: fresh ? '' : d.inCard, trend: fresh ? '' : d.trendCard, recent: fresh ? '' : d.recentCard });
}
