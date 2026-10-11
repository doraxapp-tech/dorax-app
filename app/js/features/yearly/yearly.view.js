/* Dorax Finance — what is paid once a year (Sprint 2; the calculations: core/yearly.js). On Goals, under the goals, "Yearly expenses": IPVA, IPTU,
   school, insurance, Christmas, each a card with what is set aside of what it costs, when it is due, and how much to set aside a month; the ideas to
   add one with a tap; its details with the months to come, one by one; "I paid it", which gives back what was set aside, records the expense and
   starts next year's. Said as for a child (owner, 2026-10-11), in one word for one thing.
   It is a goal underneath: it shows in the goals' monthly plan and in the hand-out of the savings payment, not among the goals' cards. In the bell
   (features/reminders/issues.view.js) in the month it is due, and after while it is not paid. Clicks: yearly.actions.js. Styles: css/screens/yearly.css.
   Texts: i18n/text/yearly.js. */
const yearlyAll = () => B().goals.filter(g => isYearly(g) && g.status === 'active');
const yrMoney = v => fmt.money(v, BCUR(), { trim: true });
/** A month in a sentence: "enero", or "enero de 2027" when it is not this year (lower case in Spanish and Portuguese, as in a sentence). */
const yrName = i => { const n = mon(i, true); return S.settings.lang === 'en' ? n : n.toLowerCase(); };
const yrMonth = ym => ym.slice(0, 4) === B().today.slice(0, 4) ? yrName(+ym.slice(5) - 1) : t('{month} {year}@long', { month: yrName(+ym.slice(5) - 1), year: ym.slice(0, 4) });
const yrIdeaName = k => t((YEARLY_IDEAS.find(x => x[0] === k) || [])[1] || '');
/** Where it stands, in a word: due this month, late, all set aside, or the month it is due. */
function yrChip(st) {
  if (st.late) return `<span class="chip crit"><i></i>${t('Not paid yet')}</span>`;
  if (st.now) return `<span class="chip warn"><i></i>${t('Due this month')}</span>`;
  if (st.ready) return `<span class="chip good"><i></i>${t('All set aside')}</span>`;
  return `<span class="chip">${esc(t('In {month}', { month: yrMonth(st.due) }))}</span>`;
}
/** The one line that says what to do. */
function yrSay(g, st) {
  if (st.late) return t('It was due in {month}. Did you pay it?', { month: yrMonth(st.due) });
  if (st.now) return st.ready ? t('It is due this month, and it is all set aside.') : t('It is due this month: {amount} still missing.', { amount: yrMoney(st.left) });
  if (st.ready) return t('It is all set aside for {month}.', { month: yrMonth(st.due) });
  return st.months === 1 ? t('Set aside {amount} this month.', { amount: yrMoney(st.share) }) : t('Set aside {amount} a month until {month}.', { amount: yrMoney(st.share), month: yrMonth(st.last) });
}
const yrDue = st => st.now || st.late || st.ready;
/** A yearly expense on Goals: its card opens its details; "I paid it" right there when it is due. */
function yearlyCard(g) {
  const st = yearlyState(B(), g, B().today);
  return `<section class="card yr-card${flashed(g.id)}"><button class="yr-main" data-a="yearly-open" data-id="${g.id}">
      <span class="yr-top"><span class="yr-ico" aria-hidden="true">${icon('calendar')}</span><b>${esc(g.name)}</b>${yrChip(st)}</span>
      <span class="yr-amt num">${yrMoney(st.saved)} <span class="muted">${t('of {amount}', { amount: yrMoney(st.target) })}</span></span>
      ${meter(st.pct, st.late ? 'crit' : 'go')}<span class="yr-say">${esc(yrSay(g, st))}</span></button>
    ${yrDue(st) ? `<div class="yr-foot"><button class="btn sm primary" data-a="yearly-pay" data-id="${g.id}">${icon('check')}${t('I paid it')}</button></div>` : ''}</section>`;
}
/** The ideas not added yet, a tap each; and one of the person's own. */
function yearlyIdeas(list) {
  const have = new Set(list.map(g => g.yearly.idea).filter(Boolean)), ideas = YEARLY_IDEAS.filter(x => !have.has(x[0]));
  return `<div class="yr-ideas" role="group" aria-label="${t('Add a yearly expense')}">${ideas.map(([k, , m]) => `<button class="yr-idea" data-a="yearly-new" data-v="${k}">${icon('plus')}<span>${esc(yrIdeaName(k))}${m ? ` <small>${esc(yrName(m - 1))}</small>` : ''}</span></button>`).join('')}
    <button class="yr-idea own" data-a="yearly-new">${icon('plus')}<span>${t('Another one')}</span></button></div>`;
}
/** "Yearly expenses" on Goals. */
function yearlySection() {
  if (inCompany()) return '';
  const list = yearlyAll();
  return `<section class="yr" id="yearly" aria-labelledby="yr-h"><h2 class="sec" id="yr-h">${t('Yearly expenses')}</h2>
    <p class="note yr-lead">${t('What you pay once a year, set aside a little each month, so it does not catch you without money.')}</p>
    ${list.length ? `<div class="yr-list">${list.map(yearlyCard).join('')}</div>` : ''}
    ${yearlyIdeas(list)}</section>`;
}
/** The months from now to when it is due, each with its share and whether it is set aside already. */
function yearlyMonthsStrip(g, st) {
  if (st.late) return '';
  const nowYm = ymOf(B().today), cells = [];
  for (let ym = nowYm; ym < st.due && cells.length < 12; ym = addMonths(ym, 1)) { const p = goalPlan(g, ym), d = goalMonth(B(), g.id, ym); cells.push(`<li class="${p && d >= p ? 'done' : ''}${ym === nowYm ? ' cur' : ''}"><span>${esc(mon(+ym.slice(5) - 1))}</span><b class="num">${p ? yrMoney(p) : '—'}</b>${p && d >= p ? `<i aria-label="${t('Set aside')}">${icon('check')}</i>` : ''}</li>`); }
  cells.push(`<li class="due"><span>${esc(mon(+st.due.slice(5) - 1))}</span><b>${t('You pay')}</b><i aria-hidden="true">${icon('coins')}</i></li>`);
  return `<ol class="yr-strip" aria-label="${t('The months until it is due')}">${cells.join('')}</ol>`;
}
function yearlyViewDrawer(d) {
  const g = goalById(d.id); if (!g || !isYearly(g)) return `<div class="body"><div class="empty"><b>${t('All set')}</b>${t('This is no longer happening.')}</div></div>`;
  const st = yearlyState(B(), g, B().today), kept = g.accountId && acct(g.accountId);
  return `<div class="body yr-view">
      <div class="yr-big"><span class="num">${yrMoney(st.saved)}</span> <span class="muted">${t('of {amount}', { amount: yrMoney(st.target) })}</span></div>
      ${meter(st.pct, st.late ? 'crit' : 'go')}
      <p class="yr-say">${esc(yrSay(g, st))}</p>
      <p class="note">${st.late ? '' : esc(t('It is due in {month}.', { month: yrMonth(st.due) })) + ' '}${kept ? esc(t('Kept in {name}.', { name: acct(g.accountId).name })) : ''} ${t('It comes back every year.')}</p>
      ${yearlyMonthsStrip(g, st)}
      <div class="row g-do">${!st.ready && st.toDo > 0 && kept ? `<button class="btn primary" data-a="yearly-put" data-id="${g.id}">${icon('plus')}${t('Set aside {amount}', { amount: yrMoney(st.toDo) })}</button>` : ''}
        <button class="btn${yrDue(st) || !kept || st.toDo <= 0 ? ' primary' : ''}" data-a="yearly-pay" data-id="${g.id}">${icon('check')}${t('I paid it')}</button></div></div>
    <footer><button class="btn sm" data-a="yearly-edit" data-id="${g.id}">${t('Edit')}</button><button class="btn sm ghost" data-a="goal-open" data-id="${g.id}">${t('Movements')}</button><button class="btn sm ghost spacer" data-a="close">${t('Close')}</button></footer>`;
}
/** What the form says as it is filled in: how much a month, from when, and what there will be by then. */
function yearlyPreview(x) {
  const cost = typedAmount(x.costText || ''), had = x.had != null ? x.had : typedAmount(x.savedText || '0') || 0, m = +x.month;
  if (!cost || cost <= 0 || !m) return t('Put in what it costs and the month it is due: Dorax tells you how much to set aside each month.');
  const due = yearlyDueFrom(m, B().today), nowYm = ymOf(B().today), left = Math.max(0, cost - had - (x.doneNow || 0)), months = yearlyMonths(due, nowYm), share = yearlyShare(left + (x.doneNow || 0), months);
  if (cost - had <= 0) return t('It is all set aside already.');
  if (due === nowYm) return t('It is due this month: set aside {amount} now.', { amount: `<b class="num">${yrMoney(cost - had)}</b>` });
  return t('Set aside {amount} a month from {from}. In {month} you will have {total}.', { amount: `<b class="num">${yrMoney(share)}</b>`, from: esc(yrName(+nowYm.slice(5) - 1)), month: esc(yrMonth(due)), total: `<b class="num">${yrMoney(cost)}</b>` });
}
function yearlyFormDrawer(d) {
  const x = d.draft, noSavings = !goalSavings(x.accountId).length;
  return `<div class="body yr-form">${d.error ? errBanner(d.error) : ''}<div class="form-grid">
      ${fld('yr-name', t('What is it?@yearly'), inp('yr-name', 'name', x.name, `placeholder="${t('e.g. IPVA, school, Christmas')}"`), 'full')}
      ${fld('yr-cost', tcur('How much is it? (R$)'), `<input type="text" id="yr-cost" value="${esc(x.costText)}" data-c="yearly-live" data-k="costText" data-live="1" inputmode="decimal" class="num" placeholder="0" autocomplete="off">`)}
      ${fld('yr-month', t('What month is it due?'), `<select id="yr-month" data-c="draft" data-k="month" data-rerender="1"><option value="">${t('Choose the month')}</option>${options(Array.from({ length: 12 }, (_, i) => [i + 1, mon(i, true)]), x.month)}</select>`)}
      ${fld('yr-acct', t('Where do you keep it?'), `<select id="yr-acct" data-c="draft" data-k="accountId">${acctOptions(x.accountId || '', x.accountId ? null : t('Choose a savings account'), goalSavings(x.accountId))}</select>${noSavings ? `<span class="note">${t('It is kept in a savings account, and you have none yet.')} <button type="button" class="linkbtn" data-a="goal-add-savings">${t('Add a savings account')}</button></span>` : ''}`)}
      ${d.isNew ? fld('yr-saved', tcur('Already set aside (R$)'), `<input type="text" id="yr-saved" value="${esc(x.savedText)}" data-c="yearly-live" data-k="savedText" data-live="1" inputmode="decimal" class="num" placeholder="0" autocomplete="off">`) : ''}</div>
      <p class="yr-preview" aria-live="polite">${yearlyPreview(x)}</p></div>
    <footer><button class="btn primary" data-a="yearly-save">${t('Save')}</button>${d.isNew ? '' : `<button class="btn ghost danger" data-a="yearly-delete">${t('Delete')}</button>`}<button class="btn ghost spacer" data-a="close">${t('Cancel')}</button></footer>`;
}
/** The accounts it can be paid with: this side's accounts with debit, cash, and its cards, in the savings account's currency. */
const yearlyPayWith = g => { const s = g.accountId && acct(g.accountId), cur = s ? s.currency : BCUR(); return goalAccounts().filter(a => a.currency === cur && a.id !== g.accountId && ['checking', 'cash', 'credit'].includes(a.type)); };
/** What "Done, I paid it" does, step by step, as the amount and the account are chosen. */
function yearlyPaySteps(d) {
  const g = goalById(d.id), x = d.draft, paid = typedAmount(x.amountText || '') || 0, back = Math.min(goalSaved(B(), g.id), paid), a = acct(x.payId), s = g.accountId && acct(g.accountId);
  return `${back > 0 && s ? `<li>${icon('coins')}<span>${t('{amount} comes out of what you set aside in {name}.', { amount: `<b class="num">${yrMoney(back)}</b>`, name: esc(s.name) })}</span></li>` : ''}
    ${paid > 0 && a ? `<li>${icon('check')}<span>${t('The payment of {amount} is recorded in {name}.', { amount: `<b class="num">${yrMoney(paid)}</b>`, name: esc(a.name) })}</span></li>` : ''}
    ${paid > 0 ? `<li>${icon('calendar')}<span>${t('Next year’s starts by itself: {amount} a month.', { amount: `<b class="num">${yrMoney(yearlyNextShare(g, paid, B().today))}</b>` })}</span></li>` : ''}`;
}
function yearlyPayDrawer(d) {
  const g = goalById(d.id); if (!g) return '';
  const x = d.draft;
  return `<div class="body yr-form">${d.error ? errBanner(d.error) : ''}<div class="form-grid">
      ${fld('yp-amount', tcur('How much did you pay? (R$)'), `<input type="text" id="yp-amount" value="${esc(x.amountText)}" data-c="yearly-live" data-k="amountText" data-live="1" inputmode="decimal" class="num" autocomplete="off">`)}
      ${fld('yp-date', t('When?'), `<input type="date" id="yp-date" value="${esc(x.date)}" data-c="draft" data-k="date" max="${B().today}">`)}
      ${fld('yp-acct', t('What did you pay it with?'), `<select id="yp-acct" data-c="draft" data-k="payId" data-rerender="1">${acctOptions(x.payId || '', x.payId ? null : t('Choose the account'), yearlyPayWith(g))}</select>`)}
      ${fld('yp-cat', t('Category'), `<select id="yp-cat" data-c="draft" data-k="cat">${catOptions(x.cat, { expenseOnly: true })}</select>`)}</div>
      <ul class="yr-steps" aria-live="polite">${yearlyPaySteps(d)}</ul></div>
    <footer><button class="btn primary" data-a="yearly-paid">${t('Done, I paid it')}</button><button class="btn ghost spacer" data-a="close">${t('Cancel')}</button></footer>`;
}
// ---------- in the bell: due this month, or late (features/reminders/issues.view.js) ----------
/** One row of the bell for each yearly expense due this month or not paid after it was due. */
const yearlyIssues = () => inBook('personal', () => yearlyAll().map(g => [g, yearlyState(B(), g, B().today)]).filter(([, st]) => st.now || st.late)
  .map(([g, st]) => ({ id: `issue:yearly:${g.id}:${st.due}`, kind: 'issue', what: 'yearly', level: st.late ? 'crit' : st.ready ? 'info' : 'warn', goalId: g.id, name: g.name, ym: st.due, amount: st.target, saved: st.saved, late: st.late })));
const yearlyIssueTitle = r => r.late ? t('{name}: not paid yet', { name: r.name }) : t('{name} is due this month', { name: r.name });
const yearlyIssueLine = r => r.saved >= r.amount ? t('{amount} set aside: all of it.', { amount: fmt.money(r.saved, BCUR(), { trim: true }) }) : t('{saved} set aside of {amount}.', { saved: fmt.money(r.saved, BCUR(), { trim: true }), amount: fmt.money(r.amount, BCUR(), { trim: true }) });
const yearlyIssueWhat = r => `<p>${r.late ? t('{name} was due in {month}, and Dorax has no payment of it yet.', { name: esc(r.name), month: yrMonth(r.ym) }) : t('{name} is due this month. You have {saved} set aside for it, of {amount}.', { name: esc(r.name), saved: `<b class="num">${fmt.money(r.saved, BCUR(), { trim: true })}</b>`, amount: `<b class="num">${fmt.money(r.amount, BCUR(), { trim: true })}</b>` })}</p>`;
const yearlyIssueFixes = r => [['yearly-pay', t('I paid it'), t('What you set aside comes out, the payment is recorded, and next year’s starts.')], ['yearly-view', t('See it'), t('What is set aside, and the months.')]];
