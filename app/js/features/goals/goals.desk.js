/* Dorax Finance — Goals on a computer, in the summary's look (v203; what the computer's pages are: features/desk/desk-kit.js).
   On the forest: what is set aside in goals and funds, the month's savings payment still to hand out with its button, and when each goal with a
   date gets there at the planned pace (a line of time from today, a green check when it arrives by the date the person set). On the sheet: each
   goal, fund and yearly expense its own card (owner, 2026-10-12: "las metas cada una en una tarjeta independiente"; the date it gets there and the
   amount kept up on one line, as asked 2026-10-08), the dashed card to add one with the yearly ideas in it, then the hand-out of the savings payment.
   The monthly plan, month by month, is one click away in a wide panel (goalYearSection). The phone, the company and the previous look keep
   goals.view.js. */

/** A fund that is an emergency reserve, by its name: it says how many days of spending it covers on its own. */
const DK_EMERGENCY = /emerg|reserva|imprevist|colch[oó]n|rainy/i;
/** What the plan puts in a goal from this month on: this month's amount, or the first month ahead that has one. */
function dkGoalNext(g, nowYm) {
  for (let i = 0, ym = nowYm; i < 36; i++, ym = addMonths(ym, 1)) { const v = goalPlan(g, ym); if (v > 0) return { ym, v }; }
  return null;
}
/** One goal or fund as a card. */
function dkGoalCard(g) {
  const bk = B(), cur = gCur(g), nowYm = ymOf(bk.today), st = goalStatus(bk, g, bk.today), fund = st.target === null, live = g.status === 'active';      // in its own currency (v224)
  const a = fund || !live ? null : goalArrival(bk, g, bk.today), where = g.accountId && acct(g.accountId), next = dkGoalNext(g, nowYm), m = v => fmt.money(v, cur, { trim: true });
  const later = next && next.ym > nowYm && st.saved <= 0;
  const chip = g.status === 'paused' ? dkPill(t('Paused')) : g.status === 'done' ? dkPill(t('Completed'), 'mint') : g.status === 'archived' ? dkPill(t('Archived'))
    : st.state === 'reached' ? dkPill(t('Target reached'), 'mint') : fund && !where ? dkPill(t('No account'), 'warn')
      : later ? dkPill(esc(t('Starts in {month}', { month: yrMonth(next.ym) })))
        : a && a.late > 0 ? dkPill(esc(tn(a.late, '{n} month late', '{n} months late')), 'warn') : st.state === 'behind' ? dkPill(t('Behind plan'), 'warn')
          : fund ? dkPill(t('Up to date'), 'mint') : a ? dkPill(t('On time'), 'mint') : dkPill(t('No date yet'));
  const head = `<div class="dk-tile-h">${where ? dkMark(where) : `<span class="dk-ico ti" aria-hidden="true">${artOr(fund ? 'piggy-bank' : 'flag-banner', fund ? 'wallet' : 'flag')}</span>`}<span class="dk-tile-n"><b>${esc(g.name)}</b><small>${fund ? t('Fund') : t('Goal')} · ${where ? esc(where.name) : t('no account')}</small></span>${chip}</div>`;
  const value = `<div class="dk-tile-v"><b class="num">${m(st.saved)}</b>${fund ? '' : ` <span class="num">${esc(t('of {amount}', { amount: m(st.target) }))}</span>`}</div>`;
  let body, lines;
  if (!fund) {
    const keep = next ? (next.ym === nowYm ? t('keeping {amount} a month', { amount: m(next.v) }) : t('{amount} a month from {month}', { amount: m(next.v), month: yrMonth(next.ym) })) : a && a.pace ? t('keeping {amount} a month', { amount: m(a.pace) }) : '';
    const when = st.state === 'reached' ? t('Reached') : a ? [fmt.month(a.ym, true), keep].filter(Boolean).join(' · ') : t('Nothing planned ahead');
    body = dkBar(st.pct || 0);
    lines = [`${fmt.pct(Math.floor(st.pct || 0))}${st.remaining > 0 ? ' · ' + esc(t('{amount} to go', { amount: m(st.remaining) })) : ''}`, esc(when)];
  } else {
    const r = DK_EMERGENCY.test(g.name) ? runway(bk, bk.today, cur) : null, days = r && r.burn && r.burn.amount > 0 ? runwayDays(st.saved, r.burn.amount) : null;
    body = days !== null ? dkGoalCover(days) : '';
    const plan = goalPlan(g, nowYm);
    lines = [days !== null ? esc(tn(days, 'Covers {n} day of your spending', 'Covers {n} days of your spending')) : where ? esc(t('Kept in {name}', { name: where.name })) : esc(t('Tell us where you keep it to count it in your savings')),
      plan > 0 ? esc(t('+{amount} a month, as planned', { amount: m(plan) })) : esc(t('Nothing planned this month'))];
  }
  const acts = fund && !where ? `<button class="btn" data-a="goal-edit" data-id="${g.id}">${t('Choose account')}</button>` : live ? `<button class="btn" data-a="goal-move" data-id="${g.id}" data-dir="in">${icon('plus')}${t('Contribute')}</button>` : '';
  return `<article class="dk-tile dk-goal${flashed(g.id)}" id="dk-goal-${g.id}">${head}${value}${body}<div class="dk-tile-s num">${lines.map(l => `<span>${l}</span>`).join('')}</div>
    <div class="dk-tile-a">${acts}<button class="btn ghost" data-a="goal-open" data-id="${g.id}">${t('Details')}</button></div></article>`;
}
/** How many days a reserve covers, against the marks of 30 days and 3 months. */
function dkGoalCover(days) {
  const a = Math.min(1, days / 30), b = days > 30 ? Math.min(1, (days - 30) / 60) : 0;
  return `<div class="dk-cover" role="img" aria-label="${esc(tn(days, 'Covers {n} day of your spending', 'Covers {n} days of your spending'))}"><span class="dk-cover-a">${dkBar(a * 100)}<small>${t('30 days')}</small></span><span class="dk-cover-b">${dkBar(b * 100)}<small>${t('3 months')}</small></span></div>`;
}
/** A yearly expense (IPVA, school…) as a card: what is set aside of it, when it is due, the one thing to do. */
function dkYearlyCard(g) {
  const st = yearlyState(B(), g, B().today), kept = g.accountId && acct(g.accountId);
  const chip = st.late ? dkPill(t('Not paid yet'), 'crit') : st.now ? dkPill(t('Due this month'), 'warn') : st.ready ? dkPill(t('All set aside'), 'mint') : dkPill(esc(t('In {month}', { month: yrMonth(st.due) })));
  const act = yrDue(st) ? `<button class="btn primary" data-a="yearly-pay" data-id="${g.id}">${icon('check')}${t('I paid it')}</button>` : !st.ready && st.toDo > 0 && kept ? `<button class="btn" data-a="yearly-put" data-id="${g.id}">${icon('plus')}${esc(t('Set aside {amount}', { amount: yrMoney(st.toDo, gCur(g)) }))}</button>` : '';
  return `<article class="dk-tile dk-goal${flashed(g.id)}"><div class="dk-tile-h"><span class="dk-ico ti" aria-hidden="true">${artOr('calendar-dots', 'calendar')}</span><span class="dk-tile-n"><b>${esc(g.name)}</b><small>${t('Yearly expense')}${kept ? ' · ' + esc(kept.name) : ''}</small></span>${chip}</div>
    <div class="dk-tile-v"><b class="num">${yrMoney(st.saved, gCur(g))}</b> <span class="num">${esc(t('of {amount}', { amount: yrMoney(st.target, gCur(g)) }))}</span></div>${dkBar(st.pct || 0, st.late ? 'crit' : '')}
    <div class="dk-tile-s"><span>${esc(yrSay(g, st))}</span></div><div class="dk-tile-a">${act}<button class="btn ghost" data-a="yearly-open" data-id="${g.id}">${t('Details')}</button></div></article>`;
}
/** The dashed card: a new goal or fund, and the yearly expenses not added yet, a tap each. */
function dkGoalAdd() {
  const have = new Set(yearlyAll().map(g => g.yearly.idea).filter(Boolean)), ideas = inCompany() ? [] : YEARLY_IDEAS.filter(x => !have.has(x[0])).slice(0, 5);
  return `<div class="dk-add dk-goal-add"><button class="dk-add-main" data-a="goal-new"><span class="dk-ico mint" aria-hidden="true">${icon('plus')}</span>${t('New goal or fund')}</button>
    ${ideas.length ? `<span>${t('Do you pay something once a year? Set it aside a little each month:')}</span><div class="dk-ideas" role="group" aria-label="${t('Add a yearly expense')}">${ideas.map(([k]) => `<button class="dk-idea" data-a="yearly-new" data-v="${k}">${icon('plus')}${esc(yrIdeaName(k))}</button>`).join('')}<button class="dk-idea" data-a="yearly-new">${icon('plus')}${t('Another one')}</button></div>` : ''}</div>`;
}
/** When each goal with a target gets there at the planned pace: a line of time from this month, one lane each. */
function dkGoalTimes(goals) {
  const bk = B(), nowYm = ymOf(bk.today);
  const lanes = goals.filter(g => g.status === 'active' && g.kind === 'goal' && g.target > 0).map(g => ({ g, st: goalStatus(bk, g, bk.today), a: goalArrival(bk, g, bk.today) })).filter(x => x.a && x.st.state !== 'reached');
  if (!lanes.length) return '';
  const span = Math.max(3, Math.min(60, Math.max(...lanes.map(x => monthDiff(x.a.ym, nowYm)), ...lanes.map(x => x.g.deadline ? monthDiff(x.g.deadline, nowYm) : 0))));
  const pos = ym => Math.max(0, Math.min(100, Math.round(monthDiff(ym, nowYm) * 1000 / span) / 10)), m = (v, g) => fmt.money(v, gCur(g), { trim: true });      // each goal in its own currency (v224)
  const step = span <= 18 ? 3 : span <= 36 ? 6 : 12, ticks = [];
  for (let i = step; i < span; i += step) { const ym = addMonths(nowYm, i); ticks.push(`<span style="left:${pos(ym)}%">${esc(+ym.slice(5) === 1 || i === step ? fmt.month(ym, true) : mon(+ym.slice(5) - 1))}</span>`); }
  const lane = ({ g, st, a }) => {
    const next = dkGoalNext(g, nowYm), start = next && next.ym > nowYm && st.saved <= 0 ? next.ym : nowYm, p0 = pos(start), p1 = pos(a.ym), late = a.late !== null && a.late > 0, edge = p1 > 20;
    return `<div class="dk-lane"><div class="dk-lane-n"><b>${esc(g.name)}</b><small class="num">${esc(t('{saved} of {target}', { saved: m(st.saved, g), target: m(st.target, g) }))}${start > nowYm ? ' · ' + esc(t('starts in {month}', { month: yrMonth(start) })) : ''}</small></div>
      <div class="dk-lane-t"><span class="dk-lane-line"></span><span class="dk-lane-bar" style="left:${p0}%;width:${Math.max(1, p1 - p0)}%"></span>${late && g.deadline ? `<span class="dk-lane-due" style="left:${pos(g.deadline)}%" title="${esc(t('Your date: {month}', { month: fmt.month(g.deadline, true) }))}"></span>` : ''}<span class="dk-lane-dot${late ? ' late' : ''}" style="left:${p1}%"></span>
        <span class="dk-lane-l num${edge ? ' end' : ''}${late ? ' late' : ''}" style="${edge ? `right:calc(${100 - p1}% - 7px)` : `left:calc(${p1}% - 7px)`}">${esc(fmt.month(a.ym, true))}${late ? ` · ${esc(tn(a.late, '{n} month late', '{n} months late'))}` : icon('check')}</span></div></div>`;
  };
  const say = lanes.map(({ g, a }) => `${g.name}: ${fmt.month(a.ym)}${a.late > 0 ? ' (' + tn(a.late, '{n} month late', '{n} months late') + ')' : ''}`).join('; ');
  return dkBand('dk-when-h', t('When each goal gets there'), dkLink('data-a="goal-year-open"', t('Edit the plan month by month')),
    `<div class="dk-lanes" role="img" aria-label="${esc(say)}">${lanes.map(lane).join('')}<div class="dk-lane dk-lane-x"><span></span><div class="dk-lane-t"><span class="dk-lane-now">${t('Today')}</span>${ticks.join('')}</div></div></div>
    ${lanes.some(x => !(x.a.late > 0)) ? `<p class="dk-note">${t('The green check says it gets there by the date you set.')}</p>` : ''}`);
}
/** The hand-out of the month's savings payment: each goal's planned amount, to record in one go. */
function dkGoalDist(ym) {
  const bk = B(), cur = BCUR(), d = distribution(bk, ym), draft = distDraft(ym); if (!d.rows.length) return '';
  const now = d.rows.map(r => { const txt = draft.vals[r.goal.id], v = txt == null ? r.pending : typedAmount(txt || '0'); return { ...r, txt: txt == null ? plain(r.pending) : txt, now: v === null || v < 0 ? 0 : v }; }).filter(r => r.planned || r.done || draft.vals[r.goal.id] != null);
  const total = sum(now.map(r => r.now)), count = now.filter(r => r.now > 0).length, left = d.income - d.done - total, done = d.done > 0;
  const kept = d.rows.find(r => goalMoveFrom({ accountId: r.goal.accountId })), from = kept && goalMoveFrom({ accountId: kept.goal.accountId, fromId: draft.fromId });
  const mark = g => g.accountId && acct(g.accountId) ? dkMark(acct(g.accountId)) : `<span class="dk-ico ti" aria-hidden="true">${artOr(isYearly(g) ? 'calendar-dots' : g.kind === 'goal' ? 'flag-banner' : 'piggy-bank', isYearly(g) ? 'calendar' : g.kind === 'goal' ? 'flag' : 'wallet')}</span>`;
  const rows = now.map(r => `<tr><td><div class="dk-who">${mark(r.goal)}<div><b>${esc(r.goal.name)}</b><small>${r.goal.accountId && acct(r.goal.accountId) ? esc(acct(r.goal.accountId).name) : t('No account')}</small></div></div></td>
      <td class="r num">${fmt.money(r.planned, cur, { trim: true })}</td>${done ? `<td class="r num">${r.done ? fmt.money(r.done, cur) : '—'}</td>` : ''}
      <td class="r"><input type="text" inputmode="decimal" class="dk-fld dk-amt num ${r.now ? '' : 'z'}" id="dv-${r.goal.id}" aria-label="${esc(t('Record now in {name}, in {currency}', { name: r.goal.name, currency: curName(BCUR()) }))}" value="${esc(r.txt)}" data-c="dist-val" data-id="${r.goal.id}"></td></tr>`).join('');
  const foot = `<div class="dk-card-foot"><span class="dk-note num ${left < 0 ? 'neg' : ''}">${left < 0 ? esc(t('That is {amount} more than this income, counting what is already recorded this month.', { amount: fmt.money(-left, cur) })) : esc(t('Left after this: {amount} ({label}).', { amount: fmt.money(left, cur), label: bk.remainderLabel.toLowerCase() }))}</span>
      ${from ? `<label class="dk-lbl">${t('Comes out of')}<select class="dk-fld" id="dist-from" data-c="dist-from">${acctOptions(from.id, '', goalPayFrom(kept.goal.accountId))}</select></label>` : ''}
      <label class="dk-lbl">${t('Date')}<input type="date" class="dk-fld" id="dist-date" value="${esc(draft.date)}" data-c="dist-date"></label>
      <button class="btn primary" data-a="dist-register" ${count ? '' : 'disabled'}>${icon('check')}${count ? tn(count, 'Record {n} contribution', 'Record {n} contributions') : t('Nothing to record')}</button></div>`;
  return dkSec('dist', t('Hand out the savings payment of {month}', { month: yrMonth(ym) }), esc(t('It comes with what the plan says; change what you want before recording')), d.pending ? dkPill(esc(t('{amount} still to hand out', { amount: fmt.money(d.pending, cur) })), 'warn') : d.planned ? dkPill(t('Handed out'), 'mint') : '',
    dkCard(`<div class="dk-tbl-wrap"><table class="dk-tbl dist"><thead><tr><th scope="col">${t('Goal or fund')}</th><th scope="col" class="r">${t('Plan for the month')}</th>${done ? `<th scope="col" class="r">${t('Already recorded')}</th>` : ''}<th scope="col" class="r">${t('Record now')}</th></tr></thead><tbody>${rows}
      <tr class="tot"><td><b>${t('Total')}</b></td><td class="r num"><b>${fmt.money(d.planned, cur, { trim: true })}</b></td>${done ? `<td class="r num"><b>${fmt.money(d.done, cur)}</b></td>` : ''}<td class="r num"><b class="dk-tot">${fmt.money(total, cur)}</b></td></tr></tbody></table></div>${foot}`), hint('goalDist'));
}
/** The block at the right of the forest: the month's savings payment, what is still to hand out and the way to it. */
function dkGoalSide(ym) {
  const bk = B(), cur = BCUR(), d = distribution(bk, ym), n = d.rows.filter(r => r.planned > 0).length;
  const head = c => dkSideHead('dk-pay-h', t('Savings payment of {month}', { month: yrMonth(ym) }), c);
  if (!d.income && !d.planned) return `${head('')}<p class="dk-say">${t('No income is routed to savings this month.')}</p><div class="dk-acts"><button class="btn" data-a="plan-income">${t('Change income')}</button></div>`;
  const rest = d.remainder > 0 ? ' ' + t('The {amount} left over stays free.', { amount: fmt.money(d.remainder, cur, { trim: true }) }) : d.remainder < 0 ? ' ' + t('The plan asks {amount} more than this income.', { amount: fmt.money(-d.remainder, cur, { trim: true }) }) : '';
  if (d.pending > 0) return `${head(dkChip(t('To hand out'), 'warn'))}<b class="dk-mid num">${fmt.money(d.pending, cur, { trim: true })}${d.income ? ` <small>${esc(t('of the {amount} for savings', { amount: fmt.money(d.income, cur, { trim: true }) }))}</small>` : ''}</b>
    <p class="dk-say">${esc(tn(n, 'It goes to {n} goal or fund.', 'It goes to {n} goals and funds.') + rest)}</p><div class="dk-acts"><button class="btn primary" data-a="dk-go" data-to="dist">${icon('check')}${t('Hand it out now')}</button></div>`;
  return `${head(d.planned ? dkChip(t('Handed out'), 'go') : '')}${dkFig('goal-done', t('recorded this month'), `<b class="dk-mid num">${fmt.money(d.done, cur)} <small>${t('recorded this month')}</small></b>`)}<p class="dk-say">${esc(rest.trim() || t('Every goal has its share of the month.'))}</p>`;
}
function dkGoals() {
  const bk = B(), ym = bk.month, cur = BCUR(), nowYm = ymOf(bk.today);
  const live = bk.goals.filter(g => g.status === 'active' || g.status === 'paused'), closed = bk.goals.filter(g => g.status === 'done' || g.status === 'archived');
  const goals = live.filter(g => !isYearly(g)), years = live.filter(g => isYearly(g));
  // the total each currency apart; the month's plan is the book's own currency's (v224)
  const total = goalSumsBig(bk.goals.filter(g => g.status !== 'archived'), g => goalSaved(bk, g.id)), planned = sum(goalsHere(bk).filter(goalLive).map(g => goalPlan(g, nowYm)));
  const nGoal = goals.filter(g => g.kind === 'goal').length, nFund = goals.filter(g => g.kind !== 'goal').length;
  const chips = bk.goals.length ? `${planned ? dkChip(esc(t('+{amount} a month, as planned', { amount: fmt.money(planned, cur) })), 'go', 'goal-plan') : ''}${dkChip(esc(`${tn(nGoal, '{n} goal', '{n} goals')} · ${tn(nFund, '{n} fund', '{n} funds')}`))}` : dkChip(t('No goals yet'));
  const side = bk.goals.length ? dkGoalSide(ym) : `${dkSideHead('dk-pay-h', t('Your first goal'))}<p class="dk-say">${t('Create a goal with a target, or a fund for money you set aside every month.')}</p><div class="dk-acts"><button class="btn primary" data-a="goal-new">${icon('plus')}${t('New goal')}</button></div>`;
  const hero = dkHero({ label: t('Set aside in goals and funds'), big: total, k: bk.goals.length ? 'goal-saved' : '', chips, side, sideId: 'dk-pay-h', band: dkGoalTimes(goals) });
  const cards = `${goals.filter(g => g.kind === 'goal').map(dkGoalCard).join('')}${goals.filter(g => g.kind !== 'goal').map(dkGoalCard).join('')}${years.map(dkYearlyCard).join('')}${UI.showClosed ? closed.map(dkGoalCard).join('') : ''}${dkGoalAdd()}`;
  const more = closed.length ? `<button class="btn ghost" data-a="toggle-closed">${UI.showClosed ? t('Hide completed and archived') : t('Show completed and archived ({n})', { n: closed.length })}</button>` : '';
  const sec = dkSec('goal-cards', t('Goals and funds'), esc(t('A goal has an amount and a date; a fund grows with no date')), more, dkGrid(cards, 300), hint('goalCards'));
  return `${companyNote()}${hero}${dkSheet(`${sec}${dkGoalDist(ym)}${dkFoot(`${t('Your goals are plans; the real money is in your savings accounts.')} <a href="#accounts">${t('See Accounts & savings')}</a>`)}`)}`;
}
/** "Edit the plan month by month": the monthly plan in a wide panel. */
function goalYearDrawer() { return `<div class="body pyr">${goalYearSection(true)}</div>`; }
