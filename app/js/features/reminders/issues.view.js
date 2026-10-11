/* Dorax Finance — what is wrong, in the bell (owner, 2026-10-10: "if something is wrong, or the person went over in the plan, for example 'the plan
   uses R$ 50 more than the planned income', it must be notified in the bell immediately; and a tap must say what is going on, how to solve it, and
   take the person with one tap to where it is solved").
   The issues of the plan (core/plan-issues.js), the transactions still without a category, and the spending limits at 80% or past them (core/budget-
   alerts.js) are rows of the bell that open: what is going on, in the person's own figures; the ways to solve it, each a tap that goes where it is
   solved; and "Not today". They count in the bell the moment they happen (issues.actions.js: issuesMaybe rings it and says so once) and leave it
   the moment they are solved. Clicks: issues.actions.js. Styles: css/components/issues.css. Texts: i18n/text/issues.js. */
/** The household's issues, then each company book's (with its book, so the bell lists them on their side), then the unfiled transactions. */
function issuesAll() {
  const out = inBook('personal', () => planIssues(B(), S.today, BASE_CURRENCY));
  const unc = typeof filteredTx === 'function' ? filteredTx({ ...TX_DEFAULT, month: '', category: 'none' }).filter(x => x.status !== 'ignored' && x.type === 'expense').length : 0;
  if (unc) out.push({ id: 'issue:uncat', kind: 'issue', what: 'uncat', level: 'info', n: unc });
  for (const b of companyBooks(S)) inBook(b.key, () => planIssues(B(), S.today, b.cur).forEach(x => out.push({ ...x, id: x.id + ':' + b.key, book: b.key, cur: b.cur })));
  out.push(...yearlyIssues());      // a yearly expense due this month, or not paid after (features/yearly)
  return out;
}
const issueCur = r => r.currency || r.cur || BASE_CURRENCY;
const issueMoney = (r, v) => fmt.money(v, issueCur(r), { trim: true });
const ISSUE_ICONS = { 'plan-over': 'alert', 'no-income': 'coins', short: 'wallet', negative: 'bank', uncat: 'tag', budget: 'gauge', yearly: 'calendar' };
const issueIcon = r => icon(r.kind === 'budget' ? 'gauge' : ISSUE_ICONS[r.what] || 'alert');
/** The row's title. */
function issueTitle(r) {
  if (r.what === 'yearly') return yearlyIssueTitle(r);
  if (r.kind === 'budget') return r.when === 'over' ? t('{name}: over the limit', { name: r.name }) : t('{name}: close to the limit', { name: r.name });
  return ({ 'plan-over': t('The plan uses more than comes in'), 'no-income': t('No income in the plan'), short: t('Not enough money'),
    negative: t('{name} is below zero', { name: r.name }), uncat: t('Transactions without a category') })[r.what];
}
/** The row's line: the fact, with its figure. */
function issueLine(r) {
  if (r.what === 'yearly') return yearlyIssueLine(r);
  if (r.kind === 'budget') return r.when === 'over' ? t('{amount} over this month’s limit.', { amount: issueMoney(r, r.amount) }) : tn(r.daysLeft, '{pct}% used: {amount} left for {n} day.', '{pct}% used: {amount} left for {n} days.', { pct: r.pct, amount: issueMoney(r, r.amount) });
  switch (r.what) {
    case 'plan-over': return t('{month}: the plan uses {amount} more than the planned income.', { month: fmt.month(r.ym), amount: issueMoney(r, r.amount) });
    case 'no-income': return t('{month} has {amount} planned and no income to pay for it.', { month: fmt.month(r.ym), amount: issueMoney(r, r.amount) });
    case 'short': return t('{amount} missing to pay everything {when}.', { amount: issueMoney(r, r.amount), when: fuWhen(r.free) });      // the words of "You can spend"
    case 'negative': return t('{name} shows {amount}.', { name: r.name, amount: issueMoney(r, r.amount) });
    case 'uncat': return tn(r.n, '{n} transaction has no category: limits and reports do not count it.', '{n} transactions have no category: limits and reports do not count them.');
  }
  return '';
}
const issueChev = () => `<span class="mr-chev" aria-hidden="true">${icon('right')}</span>`;
/** A row of the bell: the icon, what, the fact, and the way in. */
const issueRow = r => `<button class="rem iss ${r.level || ''}" data-a="issue-open" data-id="${esc(r.id)}"${r.book ? ` data-book="${r.book}"` : ''}><span class="iss-ico">${issueIcon(r)}</span><span class="grow"><b>${esc(issueTitle(r))}</b><small>${esc(issueLine(r))}</small></span>${issueChev()}</button>`;

/** The ways to solve it: [key, title, what it does]. issues.actions.js ('issue-fix') takes each one there. */
function issueFixes(r) {
  if (r.what === 'yearly') return yearlyIssueFixes(r);
  if (r.kind === 'budget') return [['budget-tx', t('See the purchases'), t('What went into {name} this month.', { name: r.name })], ['budget-raise', t('Change the limit'), t('If the limit was too tight for this month.')],
    ...(r.when === 'over' ? [['limits', t('Take it from another limit'), t('Lower another category by the same amount, and the month still fits.')]] : [])];
  switch (r.what) {
    case 'plan-over': return [['limits', t('Lower a limit'), t('The limits are the easiest part to move.')], ...(r.mp && r.mp.saving > 0 ? [['saving', t('Keep a smaller share'), t('What you keep now: {amount} a month.', { amount: issueMoney(r, r.mp.saving) })]] : []),
      ['income', t('Add an income you are missing'), t('A second payment, an extra, a rent you receive.')], ['bills', t('Review the fixed bills'), t('One you no longer pay, or that costs less now.')]];
    case 'no-income': return [['guide', t('Add what comes in each month'), t('One figure is enough to start; Dorax then shows what is left.')], ['income', t('Open the income in the Plan'), t('Two payments a month, or more than one source.')]];
    case 'short': return [['free', t('See what is due'), t('Bill by bill, until pay day.')], ['transfer', t('Move money from savings'), t('A transfer to your checking account.')], ['goals', t('Set aside less for a goal this month'), t('The goal moves on next month.')]];
    case 'negative': return [['account', t('See its movements'), t('A missing income or transfer shows there.')], ['account-edit', t('Fix its starting balance'), t('If the balance it started with is not right.')], ['transfer', t('Record an income or a transfer'), t('The money that came in and was not written down.')]];
    case 'uncat': return [['classify', t('File them'), t('Give each one its category; one tap each.')], ['rules', t('Make a rule'), t('So the next ones from the same place file themselves.')]];
  }
  return [];
}
/** What is going on, in the person's own figures. */
function issueWhat(r) {
  if (r.what === 'yearly') return yearlyIssueWhat(r);
  const m = v => `<b class="num">${issueMoney(r, v)}</b>`;
  if (r.kind === 'budget') {
    const days = r.daysLeft, per = days > 0 ? Math.floor(Math.max(0, r.planned - r.spent) / days / 100) * 100 : 0;
    return r.when === 'over' ? `<p>${tn(days, 'You have spent {spent} of the {limit} limit for {name} this month: {amount} over, with {n} day still to go.', 'You have spent {spent} of the {limit} limit for {name} this month: {amount} over, with {n} days still to go.', { spent: m(r.spent), limit: m(r.planned), name: esc(r.name), amount: m(r.amount) })}</p>`
      : `<p>${tn(days, 'You have used {pct}% of the {limit} limit for {name}, with {n} day still to go: about {day} a day keeps you inside it.', 'You have used {pct}% of the {limit} limit for {name}, with {n} days still to go: about {day} a day keeps you inside it.', { pct: r.pct, limit: m(r.planned), name: esc(r.name), day: m(per) })}</p>`;
  }
  switch (r.what) {
    case 'plan-over': return `<p>${t('In {month}, your fixed bills, what you keep and your limits add up to {amount} more than what you expect to receive.', { month: fmt.month(r.ym), amount: m(r.amount) })}</p>${inBook(r.book || 'personal', () => limMonth(r.mp, true))}`;
    case 'no-income': return `<p>${t('{month} has {amount} in bills and limits, and no income planned. Without it, Dorax cannot tell you what is left nor whether the plan fits.', { month: fmt.month(r.ym), amount: m(r.amount) })}</p>`;
    case 'short': { const f = r.free;      // the same steps as "You can spend" (features/dashboard/free-until.view.js), in the same words
      return `<p>${t('What you have today is not enough to pay everything {when}: {amount} missing.', { when: fuWhen(f), amount: m(r.amount) })}</p>
        <div class="iss-sum fu">${fuSteps(f)}</div>`; }
    case 'negative': return `<p>${t('{name} shows {amount} today. A checking or cash account below zero usually means a missing income or transfer, or a starting balance that is not right.', { name: esc(r.name), amount: m(r.amount) })}</p>`;
    case 'uncat': return `<p>${tn(r.n, '{n} transaction has no category. It counts in no limit and no report, so your month looks better than it is.', '{n} transactions have no category. They count in no limit and no report, so your month looks better than it is.')}</p>`;
  }
  return '';
}
/** The panel a row opens: what is going on, how to solve it (each a way there), "Not today". Opened from the bell: ‹ goes back to it. */
function issueDrawer(d) {
  const r = bellItems().find(x => x.id === d.id);
  if (!r) return `<div class="body iss-view"><div class="empty"><b>${t('All set')}</b>${t('This is no longer happening.')}</div></div><footer><button class="btn primary" data-a="reminders">${t('Back to the notifications')}</button></footer>`;
  return `<div class="body iss-view"><div class="iss-head ${r.level || ''}"><span class="iss-ico big">${issueIcon(r)}</span><b>${esc(issueTitle(r))}</b></div>
      <div class="iss-what">${issueWhat(r)}</div>
      <h3 class="iss-h">${t('How to solve it')}</h3>
      <div class="iss-fixes">${issueFixes(r).map(([k, title, say], i) => `<button class="iss-fix${i === 0 ? ' first' : ''}" data-a="issue-fix" data-v="${k}" data-id="${esc(r.id)}"${r.book ? ` data-book="${r.book}"` : ''}><span class="grow"><b>${title}</b><small>${say}</small></span>${issueChev()}</button>`).join('')}</div></div>
    <footer><button class="btn ghost" data-a="issue-snooze" data-id="${esc(r.id)}">${t('Not today')}</button><button class="btn ghost spacer" data-a="close">${t('Close')}</button></footer>`;
}
