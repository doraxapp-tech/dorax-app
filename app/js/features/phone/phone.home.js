/* Dorax Finance — the household's dashboard on a phone. The computer's is features/dashboard/dashboard.home.js; what the two share (the month's
   figures, the cards) is in features/dashboard/dashboard.view.js. The panel at the top of the page greets, so this page does not. */

// Laid out for a thumb: what is still to be set up comes before anything else, with the other notices about the data; then the parts in the order
// the person chose (features/phone/phone.summary.js). By default: the days of freedom, the quick things to do as a row of round buttons to swipe,
// the day's insight as a signal, the accounts, and the cards a computer shows, one under the other.
function phoneHomeDashboard(d) {
  const { ym, inProgress, fresh } = d;
  return `${firstSteps()}${inProgress ? monthCloseCard() : ''}${inProgress ? '' : d.pastNote}${companyAsk()}${d.openNote}` + phoneParts({
    free: inProgress ? freeCard() : '', runway: inProgress ? runwayCard() : '', quick: inProgress ? quickRow() : '', insight: inProgress ? phoneInsight() : '', accounts: phoneAccountsCard(),
    todo: inProgress ? todoCard(true) : '', goals: inProgress ? goalsDashCard() : '', planned: fresh ? plannedMonthCard(ym) : '',
    categories: fresh ? '' : d.catCard, trend: fresh ? '' : d.trendCard, fii: fresh ? '' : d.fii, recent: fresh ? '' : d.recentCard });
}
