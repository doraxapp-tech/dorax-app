/* Dorax Finance — pay day: the day an income is expected, given beside each income in the Plan (the first-time setup does not ask it: owner, 2026-10-07), and the notice that
   asks, on that day, whether to record it. The arithmetic is core/payday.js. Household only: a company's income does not come on a fixed day. */

/** The choices of a pay-day field: none, or a day of the month. */
const payDayOptions = () => [['', t('No fixed day')], ...Array.from({ length: 31 }, (_, i) => [String(i + 1), String(i + 1)])];
/** The payment to ask about now, if any: due by today, nothing recorded, not answered "I'll do it" this month, not put aside in this visit. */
function paydayDue() {
  if (inCompany()) return null;
  const said = S.user.payAsk || {}, ym = ymOf(S.today), skip = UI.paySkip || [];
  return payDue(S, S.today, CUR).find(g => said[g.key] !== ym && !skip.includes(g.key)) || null;
}
/** The notice (drawn by curioCard, features/ahead/curios.view.js, where the other notices are). */
function paydayCard(c) {
  const g = payDue(S, S.today, CUR).find(x => x.key === c.key); if (!g) return '';
  return `<aside class="curio nudge" id="curio" role="status" aria-label="${t('Pay day')}"><span class="fl-ico">${icon('coins')}</span><div class="grow"><b>${g.today ? t('Today is pay day.') : t('Pay day was on {date}.', { date: fmt.date(g.date) })}</b>
      <p>${t('Record {name}, {amount}? It opens ready to save: check the amount and the account.', { name: esc(g.name), amount: fmt.money(g.amount, CUR) })}</p>
      <div class="row"><button class="btn sm primary" data-a="payday-add" data-key="${esc(g.key)}">${t('Add transaction')}</button><button class="btn sm ghost" data-a="payday-skip" data-key="${esc(g.key)}">${t('I’ll do it')}</button></div></div>
    <button class="btn ghost sm x" data-a="payday-close" data-key="${esc(g.key)}" aria-label="${t('Close')}">${icon('x')}</button></aside>`;
}
