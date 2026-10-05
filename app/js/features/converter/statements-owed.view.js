/* Dorax Finance — converter: the state of the monthly statements list. */
// ---------- statements owed every month ----------
function closeInfo(ym) {
  const biz = needStatements(ym), st = S.closes[ym] || {}, sent = biz.filter(a => st[a.id] === 'sent').length, due = closeDue(ym, S.settings.closeDay), days = dayDiff(due, S.today);
  return { ym, biz, st, sent, total: biz.length, due, days, done: sent === biz.length };
}
function dueText(c) { return c.days < 0 ? tn(-c.days, '{n} day overdue', '{n} days overdue') : c.days === 0 ? t('due today') : tn(c.days, 'in {n} day', 'in {n} days'); }
function closeBanner() {
  const c = closeInfo(addMonths(ymOf(S.today), -1));
  if (!c.total || c.done || c.days > 3) return '';      // further away, it is a row in the dashboard's to-do card
  return banner(c.days < 0 ? 'crit' : 'warn', `<b>${esc(platLabel())}:</b> ${t('{month} statements are due by {date} ({when}). {sent} of {total} sent.', { month: fmt.month(c.ym), date: fmt.date(c.due, true), when: dueText(c), sent: c.sent, total: c.total })} <a class="btn sm" style="margin-left:6px" href="#converter">${t('Prepare statements')}</a>`);
}
