/* Dorax Finance — Goals (named Savings & goals until 2026-10-09: the savings, real money, are in Accounts & savings): create goals, hand out the savings payment each month, record contributions and withdrawals, follow progress. */

const goalById = id => B().goals.find(g => g.id === id);
/** A goal's account as it is drawn: the bank's mark and the rest of the account's name (ui/bank-mark.js). */
/** A goal's account in words (owner, 2026-10-09: "on the goal card remove the bank's logo and put the bank's name"): its name, with the bank when the
    name does not say it. */
const goalAcctName = a => { const n = String(a.name || ''), i = String(a.institution || ''); return esc(i && !n.toLowerCase().includes(i.toLowerCase()) ? `${n} (${i})` : n); };
const goalAcctTag = g => g.accountId && acct(g.accountId) ? goalAcctName(acct(g.accountId)) : esc(t('No account linked'));
/** On a goal's card and in its details: its account, or, for a goal with none (made at sign-up, or before an account was asked for), the way to choose it
    (owner, 2026-10-09: a goal is kept in a savings account; the form asks for it). */
const goalKept = g => g.accountId && acct(g.accountId) ? goalAcctTag(g) : `<button type="button" class="linkbtn g-pick-acct" data-a="goal-edit" data-id="${g.id}">${t('Choose where it is kept')}</button>`;
const goalKinds = () => [['goal', t('Goal with a target')], ['fund', t('Fund without a target')]];
// 2026-10-09 (owner: "'kept in' should only show the savings accounts, and a contribution to the goal is kept in that savings account, added to what
// is already there"). A goal's money sits in a savings account; a contribution is a transfer into it from an account with debit (the one picked last
// time, or the first), a withdrawal the way back. A goal kept elsewhere before then keeps its account in the list, so editing it changes nothing by itself.
const goalSavings = keep => { const list = goalAccounts().filter(a => a.type === 'savings'), k = keep && acct(keep); return k && !list.includes(k) ? [...list, k] : list; };
/** The accounts a contribution comes out of, or a withdrawal goes back to: this side's accounts with debit (or cash) in the savings account's currency. */
const goalPayFrom = savingsId => { const s = acct(savingsId); return s ? cardsOf(goalAccounts()).filter(a => a !== s && a.currency === s.currency && (cardHasDebit(a) || a.type === 'cash')) : []; };
/** The account the money of a movement comes from (or goes back to); none when it moves nothing: a starting balance, or no savings account. */
function goalMoveFrom(m) {
  const s = acct(m.accountId); if (m.start || !s || s.type !== 'savings') return null;
  const pay = goalPayFrom(s.id), last = [...B().goalMoves].reverse().find(x => x.fromId && pay.some(a => a.id === x.fromId));
  return pay.find(a => a.id === m.fromId) || pay.find(a => a === mainAcct()) || (last && acct(last.fromId)) || pay[0] || null;      // the main account first
}
function goalChip(g, st) {
  if (g.status === 'paused') return `<span class="chip">${t('Paused')}</span>`;
  if (g.status === 'done') return `<span class="chip good"><i></i>${t('Completed')}</span>`;
  if (g.status === 'archived') return `<span class="chip">${t('Archived')}</span>`;
  return { reached: `<span class="chip good"><i></i>${t('Target reached')}</span>`, nomoves: `<span class="chip">${t('No movements yet')}</span>`, behind: `<span class="chip warn"><i></i>${t('Behind plan')}</span>`,
    ahead: `<span class="chip info"><i></i>${t('Ahead of plan')}</span>`, ontrack: `<span class="chip good"><i></i>${t('On plan')}</span>` }[st.state];
}
/** Plain factual sentences about a goal: distance to plan, projection, pace needed. Never advice. */
function goalFacts(g, st) {
  const out = [];
  if (g.status !== 'active') return out;
  if (st.state === 'behind') out.push(t('{amount} behind the plan to date.', { amount: fmt.money(-st.diff, BCUR()) }));
  if (st.state === 'ahead') out.push(t('{amount} ahead of the plan to date.', { amount: fmt.money(st.diff, BCUR()) }));
  if (st.target !== null && st.state !== 'reached') {
    if (st.projected) out.push(t('At the planned pace it is reached in {month}.', { month: fmt.month(st.projected) }));
    else {
      out.push(t('The plan reaches {a}; {b} is not planned yet.', { a: fmt.money(st.planTotal, BCUR()), b: fmt.money(st.unplanned, BCUR()) }));
      const a = goalArrival(B(), g, B().today);      // the plan stops short: the date its last planned amount leads to, if it is kept up
      if (a) out.push(t('Keeping {amount} a month after the plan ends, it is reached in {month}.', { amount: fmt.money(a.pace, BCUR(), { trim: true }), month: fmt.month(a.ym) }));
    }
    if (st.overdue) out.push(t('The target date ({month}) has passed.', { month: fmt.month(g.deadline) }));
    else if (st.required !== null) out.push(t('To arrive by {month}: {amount} a month.', { month: fmt.month(g.deadline), amount: fmt.money(st.required, BCUR()) }));
  }
  return out;
}
// 2026-10-08 (owner: "reduce the goal and fund cards on the computer: under the dividing line leave only Contribute and Details, move the rest into
// Details"; "remove 'You get there in… / at the planned pace / On your date' everywhere: it is repeated in the details"). The card is the name,
// what is saved and how far it is; Withdraw, What if…? and the date it is reached (said once, in its facts) are in the details.
function goalCard(g) {
  const st = goalStatus(B(), g, B().today), live = g.status === 'active';
  return `<section class="card acct goal ${live ? '' : 'off'}${flashed(g.id)}"><div class="row" style="align-items:flex-start;flex-wrap:nowrap"><div class="grow" style="flex:1;min-width:0"><b style="font-weight:500;font-size:15px">${esc(g.name)}</b>
      <div class="note">${g.kind === 'goal' ? t('Goal') : t('Fund')} · ${goalKept(g)}</div></div>${goalChip(g, st)}</div>
    <div><div class="note">${t('Set aside')}</div><div class="bal num">${fmt.money(st.saved, BCUR())}${st.target !== null ? ` <span class="muted" style="font-size:13px;font-weight:500">/ ${fmt.money(st.target, BCUR(), { trim: true })}</span>` : ''}</div></div>
    ${st.target !== null ? `<div>${meter(st.pct, 'go')}<div class="note" style="margin-top:4px">${fmt.pct(st.pct)}${st.remaining ? ' · ' + t('{amount} to go', { amount: fmt.money(st.remaining, BCUR()) }) : ''}${g.deadline ? ' · ' + t('by {month}', { month: fmt.month(g.deadline, true) }) : ''}</div></div>` : ''}
    <div class="row g-foot">${live ? `<button class="btn sm later" data-a="goal-move" data-id="${g.id}" data-dir="in">${icon('plus')}${t('Contribute')}</button>` : ''}<button class="btn sm ghost" data-a="goal-open" data-id="${g.id}">${t('Details')}</button></div></section>`;
}

// ---------- monthly hand-out of the savings payment ----------
function distDraft(ym) {
  if (!UI.dist || UI.dist.ym !== ym || UI.dist.book !== bookKey()) UI.dist = { ym, book: bookKey(), vals: {}, date: ym === ymOf(B().today) ? B().today : isoDate(ym, 15) };
  return UI.dist;
}
function distCard(ym) {
  const d = distribution(B(), ym), draft = distDraft(ym);
  const now = d.rows.map(r => { const txt = draft.vals[r.goal.id], v = txt == null ? r.pending : typedAmount(txt || '0'); return { ...r, txt: txt == null ? plain(r.pending) : txt, now: v === null || v < 0 ? 0 : v }; });
  const total = sum(now.map(r => r.now)), count = now.filter(r => r.now > 0).length, left = d.income - d.done - total;
  if (!d.rows.length) return '';
  // where the month's contributions come out of, when a goal is kept in a savings account (owner, 2026-10-09)
  const kept = d.rows.find(r => goalMoveFrom({ accountId: r.goal.accountId })), from = kept && goalMoveFrom({ accountId: kept.goal.accountId, fromId: draft.fromId });
  const fromPick = from ? `<label for="dist-from" class="note">${t('Comes out of')}</label><select id="dist-from" data-c="dist-from" style="width:auto">${acctOptions(from.id, '', goalPayFrom(kept.goal.accountId))}</select>` : '';
  return `<section class="card" id="dist"><div class="card-h"><h2>${t('Hand out the savings payment, {month}', { month: fmt.month(ym) })}</h2>${hint('goalDist')}${d.pending ? `<span class="chip warn"><i></i>${t('{amount} still to hand out', { amount: fmt.money(d.pending, BCUR()) })}</span>` : d.planned ? `<span class="chip good"><i></i>${t('Handed out')}</span>` : `<span class="chip">${t('Nothing planned')}</span>`}</div>
    <div class="card-b flush"><table class="tbl stackable dist"><thead><tr><th>${t('Goal or fund')}</th><th class="r">${t('Plan')}</th><th class="r">${t('Already recorded')}</th><th class="r" style="min-width:130px">${tcur('Record now (R$)')}</th></tr></thead><tbody>
      ${now.map(r => `<tr><td class="first"><b style="font-weight:500">${esc(r.goal.name)}</b><div class="note">${goalAcctTag(r.goal)}</div></td><td class="amt-s wide meta" data-l="${t('Plan')}">${fmt.money(r.planned, BCUR(), { trim: true })}</td><td class="amt-s wide meta" data-l="${t('Already recorded')}">${r.done ? fmt.money(r.done, BCUR()) : '—'}</td>
        <td class="amt"><input type="text" inputmode="decimal" class="num ${r.now ? '' : 'z'}" id="dv-${r.goal.id}" aria-label="${esc(r.goal.name)}" value="${esc(r.txt)}" style="width:120px;text-align:right" data-c="dist-val" data-id="${r.goal.id}"></td></tr>`).join('')}
      <tr class="sumrow grand"><td class="first"><b>${t('Total')}</b></td><td class="amt-s wide meta" data-l="${t('Plan')}">${fmt.money(d.planned, BCUR(), { trim: true })}</td><td class="amt-s wide meta" data-l="${t('Already recorded')}">${fmt.money(d.done, BCUR())}</td><td class="amt" style="padding-right:26px">${fmt.money(total, BCUR())}</td></tr>
    </tbody></table></div>
    <div class="toolbar" style="border-top:1px solid var(--line);border-bottom:0">
      <span class="note">${t('Income for savings: {a}.', { a: fmt.money(d.income, BCUR()) })} <span class="${left < 0 ? 'neg' : ''}">${left < 0 ? t('That is {amount} more than this income, counting what is already recorded this month.', { amount: fmt.money(-left, BCUR()) }) : t('Left after this: {amount} ({label}).', { amount: fmt.money(left, BCUR()), label: esc(B().remainderLabel.toLowerCase()) })}</span> <a href="#plan">${t('Change income')}</a></span>
      <span class="spacer row">${fromPick}<label class="sr" for="dist-date">${t('Date')}</label><input type="date" id="dist-date" value="${esc(draft.date)}" data-c="dist-date" style="width:150px"><button class="btn primary" data-a="dist-register" ${count ? '' : 'disabled'}>${icon('check')}${count ? tn(count, 'Record {n} contribution', 'Record {n} contributions') : t('Nothing to record')}</button></span></div></section>`;
}

// ---------- screen ----------
function viewGoals() {
  const ym = B().month, nowYm = ymOf(B().today), years = goalYears(B()), year = years.includes(UI.goalYear) ? UI.goalYear : (years.includes(+nowYm.slice(0, 4)) ? +nowYm.slice(0, 4) : years[0]), mode = UI.goalMode;
  const open = B().goals.filter(g => g.status === 'active' || g.status === 'paused'), closed = B().goals.filter(g => g.status === 'done' || g.status === 'archived');
  if (!B().goals.length) return `${companyNote()}<div class="card"><div class="empty"><b>${t('No goals yet')}</b>${t('Create a goal with a target, or a fund for money you set aside every month.')}<div style="margin-top:12px"><button class="btn primary" data-a="goal-new">${icon('plus')}${t('New goal')}</button></div></div></div>${yearlySection()}`;
  const d = distribution(B(), ym), totalSaved = sum(B().goals.filter(g => g.status !== 'archived').map(g => goalSaved(B(), g.id)));
  // year grid
  const months = Array.from({ length: 12 }, (_, i) => year + '-' + String(i + 1).padStart(2, '0')), rem = allocRemainder(B(), year), pays = payRows(B(), year, 'savings');
  const cur = i => months[i] === ym ? ' cur' : '', past = i => months[i] <= nowYm;
  const show = v => v === null ? '<span class="z">—</span>' : mode === 'diff' ? (v === 0 ? '<span class="z">0</span>' : `<span class="${v > 0 ? 'pos' : 'neg'}">${fmt.money(v, null, { bare: true, trim: true, sign: true })}</span>`) : v === 0 ? '<span class="z">0</span>' : plain(v);
  const lastYear = years[years.length - 1], thisYear = +nowYm.slice(0, 4), lastEmpty = yearEmpty(B(), lastYear);
  const gval = (g, i) => { const p = (g.plan[year] || [])[i] || 0; return mode === 'plan' ? p : past(i) ? (mode === 'actual' ? goalMonth(B(), g.id, months[i]) : goalMonth(B(), g.id, months[i]) - p) : null; };
  const gridRows = open.map(g => `<tr class="${g.status === 'paused' ? 'muted-row' : ''}"><th scope="row"><button class="linkbtn" data-a="goal-open" data-id="${g.id}">${esc(g.name)}</button>${g.status === 'paused' ? ` <span class="chip">${t('Paused')}</span>` : ''}</th>
    ${months.map((m, i) => `<td class="c${cur(i)}">${mode === 'plan' ? `<input type="text" inputmode="decimal" class="${(g.plan[year] || [])[i] ? '' : 'z'}" id="gp-${year}-${g.id}-${i}" aria-label="${esc(g.name)}, ${mon(i, true)}" value="${plain((g.plan[year] || [])[i] || 0)}" data-c="goal-cell" data-id="${g.id}" data-y="${year}" data-m="${i}">` : show(gval(g, i))}</td>`).join('')}
    <td class="c tot">${show(sum(months.map((m, i) => gval(g, i))))}</td></tr>`).join('');
  const payCells = r => r.values.map((v, i) => `<td class="c${cur(i)}">${mode === 'plan' ? `<input type="text" inputmode="decimal" class="${v ? '' : 'z'}" id="ap-${year}-${r.id}-${i}" aria-label="${esc(r.name)}, ${mon(i, true)}" value="${plain(v)}" data-c="pay-cell" data-id="${r.id}" data-y="${year}" data-m="${i}">` : show(v)}</td>`).join('');
  const top = isPhone() ? phoneGoalsTop(open, closed, ym) : `<section class="tiles">
      <div class="card tile"><div class="label"><span>${t('Set aside in goals and funds')}</span>${hint('goalSaved')}</div><div class="value num">${fmt.money(totalSaved, BCUR())}</div></div>
      <div class="card tile"><div class="label"><span>${t('Plan for {month}', { month: fmt.month(ym, 'bare') })}</span>${hint('goalPlan')}</div><div class="value num">${fmt.money(d.planned, BCUR())}</div></div>
      <div class="card tile"><div class="label"><span>${t('Recorded in {month}', { month: fmt.month(ym, 'bare') })}</span>${hint('goalDone')}</div><div class="value num">${fmt.money(d.done, BCUR())}</div></div>
      <div class="card tile"><div class="label"><span>${esc(B().remainderLabel)}</span>${hint('goalRest')}</div><div class="value num ${d.remainder < 0 ? 'neg' : ''}">${fmt.money(d.remainder, BCUR())}</div></div></section>
  <h2 class="sec">${t('Goals and funds')} ${hint('goalCards')}</h2>
  <div class="grid g-3">${open.filter(g => !isYearly(g)).map(goalCard).join('') || `<div class="card"><div class="empty">${t('No active goals.')}</div></div>`}</div>
  ${closed.length ? `<div><button class="btn sm ghost" data-a="toggle-closed">${UI.showClosed ? t('Hide completed and archived') : t('Show completed and archived ({n})', { n: closed.length })}</button></div>${UI.showClosed ? `<div class="grid g-3">${closed.map(goalCard).join('')}</div>` : ''}` : ''}
  ${yearlySection()}
  ${distCard(ym)}`;      // the goals first (the yearly expenses under them: features/yearly), then the hand-out of the month's savings (owner, 2026-10-08)      // a phone has its own top, without the hand-out (features/phone/phone.goals.js)
  return deskCut(`${companyNote()}${top}
  <section class="card" id="goal-year"><div class="card-h"><h2>${t('Monthly plan')}</h2>${hint('goalGrid')}${yearStepper('goal-year', years, year)}
      ${year !== lastYear ? '' : lastEmpty && lastYear > thisYear && years.length > 1 ? `<button class="btn sm ghost" data-a="goal-remove-year" data-v="${lastYear}">${t('Remove {year}', { year: lastYear })}</button>` : `<button class="btn sm ghost" data-a="goal-add-year">${icon('plus')}${t('Add {year}', { year: lastYear + 1 })}</button>`}<div class="right">${seg('goal-mode', [['plan', t('Plan')], ['actual', t('Actual')], ['diff', t('Difference')]], mode, t('Show'))}</div></div>
    <div class="card-b flush"><div class="tbl-wrap"><table class="tbl plan alloc"><thead><tr><th></th>${months.map((m, i) => `<th class="c${cur(i)}">${mon(i)}</th>`).join('')}<th class="c">${t('Year')}</th></tr></thead><tbody>
      ${mode === 'diff' ? '' : `<tr class="grp"><th scope="rowgroup" colspan="14">${t('Income for savings')}</th></tr>${pays.map(r => `<tr><th scope="row">${esc(r.name)}</th>${payCells(r)}<td class="c tot">${plain(sum(r.values))}</td></tr>`).join('') || `<tr><th scope="row" class="muted">${t('No income is routed to savings')}</th><td colspan="13"></td></tr>`}`}
      <tr class="grp"><th scope="rowgroup" colspan="14">${t('Goals and funds')}</th></tr>${gridRows}
      ${mode === 'plan' ? `<tr class="sumrow grand"><th scope="row">${esc(B().remainderLabel)}</th>${rem.map((v, i) => `<td class="c${cur(i)}">${v < 0 ? `<span class="neg">${fmt.money(v, null, { bare: true, trim: true })}</span>` : plain(v)}</td>`).join('')}<td class="c tot">${fmt.money(sum(rem), null, { bare: true, trim: true })}</td></tr>`
        : `<tr class="sumrow grand"><th scope="row">${t('Total')}</th>${months.map((m, i) => { const vs = open.map(g => gval(g, i)); return `<td class="c${cur(i)}">${show(vs.some(v => v === null) ? null : sum(vs))}</td>`; }).join('')}<td class="c tot">${show(sum(open.flatMap(g => months.map((m, i) => gval(g, i)))))}</td></tr>`}
    </tbody></table></div></div>
    <div class="toolbar" style="border-top:1px solid var(--line);border-bottom:0"><span class="note">${mode === 'plan' ? (rem.some(v => v < 0) ? t('Some months plan more than the income routed to savings.') : t('Type in any cell. Enter or the arrow keys move down the column; Tab moves across. The last row is income minus every goal and fund.')) : mode === 'actual' ? t('What was recorded each month. Withdrawals count as negative.') : t('Recorded minus planned. Negative means less was set aside than planned.')}</span></div></section>
  <p class="note g-real" id="goal-money">${t('Your goals are plans; the real money is in your savings accounts.')} <a href="#accounts">${t('See Accounts & savings')}</a></p>`, 'goal-year', '<section class="card" id="goal-year">', '<p class="note g-real"');
}

// ---------- drawers ----------
const yearsAhead = () => { const y = +B().today.slice(0, 4), max = Math.max(y + 6, ...goalYears(B())); return Array.from({ length: max - y + 2 }, (_, i) => y - 1 + i); };
function ymPicker(id, key, value, label, optional) {
  const [y, m] = value ? value.split('-') : ['', ''];
  return `<div class="field"><label for="${id}-m">${label}</label><div class="row" style="flex-wrap:nowrap;gap:6px"><select id="${id}-m" data-c="draft-ym" data-k="${key}" data-part="m" aria-label="${label}">${options([...(optional ? [['', t('No date')]] : []), ...Array.from({ length: 12 }, (_, i) => [String(i + 1).padStart(2, '0'), mon(i, true)])], m)}</select>
    <select id="${id}-y" data-c="draft-ym" data-k="${key}" data-part="y" aria-label="${label} (${t('Year')})" ${value ? '' : 'disabled'} style="max-width:96px">${options(yearsAhead().map(v => [v, v]), y || B().today.slice(0, 4))}</select></div></div>`;
}
function goalFormDrawer(d) {
  const g = d.draft, target = typedAmount(g.targetText || ''), monthly = typedAmount(g.monthlyText || '0') || 0, initial = typedAmount(g.initialText || '0') || 0;
  const saved = d.isNew ? initial : goalSaved(B(), g.id) - (g.startWas || 0) + initial, months = g.deadline && g.from && g.deadline >= g.from ? monthDiff(g.deadline, g.from) + 1 : null;
  const suggest = g.kind === 'goal' && target > saved && months ? Math.ceil((target - saved) / months) : null;
  // the monthly amount is always in sight, editing too (owner, 2026-10-10: "editing a goal does not let me edit the contribution I want to make each
  // month"; before, it hid behind a switch, "Change the monthly plan from a month onwards"): it shows what the plan has for the month chosen, and
  // saving a different amount, or another month, changes the plan from that month on (goalReplan, features/goals/goals.actions.js)
  const cur = d.isNew ? 0 : goalPlan(goalById(g.id), g.from), remNow = allocRemainder(B(), +g.from.slice(0, 4))[+g.from.slice(5) - 1] - (monthly - cur);
  // 2026-10-09 (owner: "'already saved' goes beside the target date when the goal has a target, beside the type when it has none; 'kept in' goes above
  // the monthly plan"): the first part of the form holds what the goal is, what is already in it and where it is kept; the notes stay at its foot
  // the amount already saved is asked when editing too (owner, 2026-10-09): it is the goal's starting balance, already in the account, so it moves no money
  const savedIn = fld('g-initial', tcur('Already saved (R$)'), inp('g-initial', 'initialText', g.initialText, 'inputmode="decimal" class="num" data-rerender="always" placeholder="0"'));
  const noSavings = !goalSavings(g.accountId).length;
  return `<div class="body">${d.error ? errBanner(d.error) : ''}<div class="form-grid">
    ${fld('g-name', t('Name'), inp('g-name', 'name', g.name, `placeholder="${inCompany() ? t('e.g. Taxes, Reserve, Equipment') : t('e.g. Viaje, Carro, Emergencias')}"`), 'full')}
    ${fld('g-kind', t('Type'), `<select id="g-kind" data-c="draft" data-k="kind" data-rerender="1">${options(goalKinds(), g.kind)}</select>`)}
    ${g.kind === 'goal' ? fld('g-target', tcur('Target (R$)'), inp('g-target', 'targetText', g.targetText, 'inputmode="decimal" class="num" data-rerender="always"')) + ymPicker('g-deadline', 'deadline', g.deadline, t('Target date'), true) + savedIn : savedIn}
    ${fld('g-acct', t('Kept in'), `<select id="g-acct" data-c="draft" data-k="accountId" required aria-required="true">${acctOptions(g.accountId || '', g.accountId ? null : t('Choose a savings account'), goalSavings(g.accountId))}</select>${noSavings ? `<span class="note">${t('Goals are kept in a savings account, and you have none yet.')} <button type="button" class="linkbtn" data-a="goal-add-savings">${t('Add a savings account')}</button></span>` : ''}`, 'full')}
  </div>
  <div class="stack" style="gap:10px;border-top:1px solid var(--line);padding-top:14px"><b style="font-weight:500">${t('Monthly plan')}</b>
    <div class="form-grid">${fld('g-monthly', tcur('Each month (R$)'), inp('g-monthly', 'monthlyText', g.monthlyText, 'inputmode="decimal" class="num" data-rerender="always" placeholder="0"'))}${ymPicker('g-from', 'from', g.from, t('Starting in'))}</div>
      ${suggest !== null ? `<div class="row"><span class="note">${t('To reach {a} by {month}: {b} a month for {n} months.', { a: fmt.money(target, BCUR(), { trim: true }), month: fmt.month(g.deadline), b: fmt.money(suggest, BCUR()), n: months })}</span><button class="btn sm" data-a="goal-suggest" data-v="${suggest}">${t('Use this amount')}</button></div>` : ''}
      <p class="note ${remNow < 0 ? 'neg' : ''}">${t('{label} in {month} after this: {amount}.', { label: esc(B().remainderLabel), month: fmt.month(g.from), amount: fmt.money(remNow, BCUR()) })} ${g.deadline && g.kind === 'goal' ? t('The plan is filled until {month}.', { month: fmt.month(g.deadline) }) : t('The plan is filled until December {year}.', { year: Math.max(+g.from.slice(0, 4), ...goalYears(B())) })}</p>
  </div>
  ${foldMore(d, [(g.note || '').trim() ? t('Notes') : ''], `<div class="form-grid">
    ${fld('g-note', t('Notes'), `<textarea id="g-note" data-c="draft" data-k="note">${esc(g.note || '')}</textarea>`, 'full')}</div>`, 'goal-more-box')}</div>
  <footer><button class="btn primary" data-a="goal-save">${d.isNew ? t('Create goal') : t('Save')}</button><button class="btn ghost spacer" data-a="${d.isNew ? 'close' : 'goal-open'}" data-id="${g.id || ''}">${t('Cancel')}</button></footer>`;
}
// 2026-10-08 (owner: "the movements in the details are disorganised: the date on its own line, under it the movement with its amount and the x at the
// right, and a dividing line"). Each movement is two lines: its date, then what it was (contribution or withdrawal, its note, its account) with its
// amount and the way to delete it; a line between movements.
// 2026-10-09 (owner: "the goal's details have 8 buttons, this is too much, find the best way to organise it; on the phone the same"). What is done
// with the money stays in sight: Contribute, and Withdraw once there is something to withdraw (a paused or closed goal shows Resume or Reopen
// instead). What if…? goes with the facts it answers. The goal itself is looked after from the foot: Edit, and a menu with the rest (pause,
// mark as completed, archive, delete). The starting balance is "Already saved" in Edit.
function goalViewDrawer(d) {
  const g = goalById(d.id), st = goalStatus(B(), g, B().today), moves = B().goalMoves.map((m, i) => [m, i]).filter(x => x[0].goalId === g.id).sort((a, b) => a[0].date < b[0].date ? 1 : a[0].date > b[0].date ? -1 : b[1] - a[1]).map(x => x[0]), live = g.status === 'active';
  const facts = goalFacts(g, st), whatif = live && st.target !== null && st.state !== 'reached' && goalArrival(B(), g, B().today);
  const lead = live ? `<button class="btn primary" data-a="goal-move" data-id="${g.id}" data-dir="in" data-back="1">${icon('plus')}${t('Contribute')}</button>`
    : `<button class="btn primary" data-a="goal-status" data-id="${g.id}" data-v="active">${g.status === 'paused' ? t('Resume') : t('Reopen')}</button>`;
  const menu = [live && ['paused', t('Pause')], live && ['done', t('Mark as completed')], g.status !== 'archived' && ['archived', t('Archive')]].filter(Boolean);
  return `<div class="body">
    <div class="row">${goalChip(g, st)}<span class="note">${g.kind === 'goal' ? t('Goal') : t('Fund')} · ${goalKept(g)}${g.deadline ? ' · ' + t('by {month}', { month: fmt.month(g.deadline) }) : ''}</span></div>
    <div><div class="bal num" style="font-size:26px;font-weight:500">${fmt.money(st.saved, BCUR())}${st.target !== null ? ` <span class="muted" style="font-size:14px;font-weight:500">/ ${fmt.money(st.target, BCUR(), { trim: true })}</span>` : ''}</div>
      ${st.target !== null ? `<div style="margin-top:8px">${meter(st.pct, 'go')}<div class="note" style="margin-top:4px">${fmt.pct(st.pct)}${st.remaining ? ' · ' + t('{amount} to go', { amount: fmt.money(st.remaining, BCUR()) }) : ''}</div></div>` : ''}</div>
    <div class="row g-do">${lead}${st.saved > 0 ? `<button class="btn" data-a="goal-move" data-id="${g.id}" data-dir="out" data-back="1">${t('Withdraw')}</button>` : ''}</div>
    <dl class="kv"><dt>${t('Planned to date')}</dt><dd class="num">${fmt.money(st.plannedToDate, BCUR())}</dd><dt>${t('Plan this month')}</dt><dd class="num">${fmt.money(st.thisMonth, BCUR())}</dd>${g.note ? `<dt>${t('Notes')}</dt><dd>${esc(g.note)}</dd>` : ''}</dl>
    ${facts.length || whatif ? `<div>${facts.map(f => `<div class="obs">${esc(f)}</div>`).join('')}${whatif ? `<button type="button" class="linkbtn g-whatif" data-a="whatif" data-id="${g.id}">${t('What if…?')}</button>` : ''}</div>` : ''}
    ${live ? '' : `<p class="note">${t('Not receiving money from the plan.')}</p>`}
    <div style="border-top:1px solid var(--line);padding-top:12px"><b style="font-weight:500">${t('Movements')}</b>
      ${moves.length ? `<ul class="mv-list">${moves.map(m => `<li class="mv"><span class="mv-date num">${fmt.date(m.date, true)}</span><div class="mv-row"><span class="grow">${m.amount < 0 ? t('Withdrawal') : t('Contribution')}${m.note ? ` <span class="muted">· ${esc(m.note)}</span>` : ''}${m.accountId && acct(m.accountId) ? ` <span class="muted">· ${goalAcctName(acct(m.accountId))}</span>` : ''}</span><span class="num mv-amt ${m.amount < 0 ? '' : 'pos'}">${fmt.money(m.amount, BCUR(), { sign: true })}</span><button class="iconbtn" data-a="move-delete" data-id="${m.id}" aria-label="${t('Delete')} ${fmt.date(m.date, true)}">${icon('x')}</button></div></li>`).join('')}</ul>`
        : `<div class="empty" style="padding:18px 0"><b>${t('No movements yet')}</b>${t('If you already have money set aside for this, enter it in Edit, under “Already saved”.')}</div>`}</div>
  </div>
  <footer><button class="btn sm" data-a="goal-edit" data-id="${g.id}">${t('Edit')}</button>
    <div class="gmenu-wrap spacer"><button class="btn sm ghost" id="goal-menu-btn" data-a="goal-menu" aria-expanded="${!!UI.goalMenu}" aria-controls="goal-menu">${icon('more')}${t('More')}</button>
      ${UI.goalMenu ? `<div class="umenu gmenu" id="goal-menu" role="group" aria-label="${t('More')}">${menu.map(([v, label]) => `<button class="umenu-item" data-a="goal-status" data-id="${g.id}" data-v="${v}">${v === 'done' ? icon('check') : v === 'paused' ? icon('pause') : icon('archive')}<span>${label}</span></button>`).join('')}<button class="umenu-item out" data-a="goal-delete-ask">${icon('trash')}<span>${t('Delete')}</span></button></div>` : ''}</div></footer>`;
}
function goalMoveDrawer(d) {
  // where the money is kept is the goal's own (owner, 2026-10-09: "when contributing to a goal I chose Santander for when I created it, I should not
  // have to choose it again; to change where it is kept, edit the goal"): said, not asked; only where it comes out of (or goes back to) is asked
  const m = d.draft, g = goalById(m.goalId), saved = goalSaved(B(), g.id), out = m.dir === 'out';
  const s = acct(m.accountId), from = goalMoveFrom(m), pay = from ? goalPayFrom(s.id) : [], edit = `<button type="button" class="linkbtn" data-a="goal-edit" data-id="${g.id}">${t('Choose where it is kept')}</button>`;
  const say = from ? t('It leaves {from} and goes into {to}: both balances change.', { from: esc((out ? s : from).name), to: esc((out ? from : s).name) })
    : m.start ? t('The starting balance is already in the account, so no money moves.')
    : s && s.type === 'savings' ? t('No account with debit in this currency to move it from: it is recorded in the goal only.')
    : s ? `${t('{name} is not a savings account: it is recorded in the goal only.', { name: esc(s.name) })} ${edit}`
    : `${t('Without a savings account it is recorded in the goal only: no account balance changes.')} ${edit}`;
  return `<div class="body">${d.error ? errBanner(d.error) : ''}
    <p class="note">${esc(g.name)} · ${s ? goalAcctName(s) : esc(t('No account linked'))} · ${t('Set aside')}: <b class="num" style="color:var(--ink)">${fmt.money(saved, BCUR())}</b></p>
    <div class="form-grid">
      ${fld('m-amount', tcur('Amount (R$)'), inp('m-amount', 'amountText', m.amountText, 'inputmode="decimal" class="num" placeholder="0,00"'))}
      ${fld('m-date', t('Date'), `<input type="date" id="m-date" value="${esc(m.date)}" data-c="draft" data-k="date">`)}
      ${from ? fld('m-from', out ? t('Goes to') : t('Comes out of'), `<select id="m-from" data-c="draft" data-k="fromId" data-rerender="1">${acctOptions(from.id, '', pay)}</select>`, 'full') : ''}
      ${fld('m-note', t('Note (optional)'), inp('m-note', 'note', m.note), 'full')}</div>
    <p class="note" id="m-say">${say}</p></div>
  <footer><button class="btn primary" data-a="move-save">${out ? t('Record withdrawal') : t('Record contribution')}</button><button class="btn ghost spacer" data-a="${d.back ? 'goal-open' : 'close'}" data-id="${g.id}">${t('Cancel')}</button></footer>`;
}

// ---------- dashboard card ----------
function goalsDashCard() {
  if (!B().goals.length) return '';
  const nowYm = ymOf(B().today), d = distribution(B(), nowYm), live = B().goals.filter(g => g.status === 'active'), goals = live.filter(g => g.kind === 'goal' && !isYearly(g)).slice(0, 3), funds = live.filter(g => g.kind !== 'goal');
  const total = sum(B().goals.map(g => goalSaved(B(), g.id))), fundTotal = sum(funds.map(g => goalSaved(B(), g.id)));
  // on a phone each goal is something to tap, which opens its details, and the funds' line opens the list of funds (owner, 2026-10-08)
  const tap = isPhone(), go = tap ? icon('right') : '';
  const pace = (g, st) => { if (st.state === 'reached') return t('Reached'); const a = goalArrival(B(), g, B().today); return !a ? (st.saved <= 0 ? t('Not started') : '') : a.by === 'plan' ? t('reached in {month} at the planned pace', { month: fmt.month(a.ym, true) }) : t('reached in {month} keeping {amount} a month', { month: fmt.month(a.ym, true), amount: fmt.money(a.pace, BCUR(), { trim: true }) }); };
  return `<section class="card" id="goals-card"><div class="card-h"><h2>${t('Goals')}</h2>${info(t('Set aside is the sum of the contributions you recorded, minus withdrawals; the money itself is in your savings accounts. “Reached in” follows the amounts planned for the coming months.'))}<a class="right btn sm go" href="#goals">${t('Open goals')}${icon('right')}</a></div>
    <div class="card-b"><div class="figure"><b>${fmt.money(total, BCUR())}</b><span>${t('set aside in goals and funds')}</span></div>
      ${goals.map(g => { const st = goalStatus(B(), g, B().today), inner = `<b style="font-weight:500">${esc(g.name)}</b><span class="num">${fmt.money(st.saved, BCUR())} <span class="muted">/ ${fmt.money(st.target, BCUR(), { trim: true })}</span>${go}</span>${meter(st.pct, 'go')}<div class="meta"><span>${fmt.pct(st.pct)}</span><span>${pace(g, st)}</span></div>`;
        return tap ? `<button class="budget tap" data-a="goal-open" data-id="${g.id}">${inner}</button>` : `<div class="budget">${inner}</div>`; }).join('')}
      ${funds.length ? (inner => tap ? `<button class="budget funds tap" data-a="goal-list" data-kind="fund">${inner}</button>` : `<div class="budget funds">${inner}</div>`)(`<b style="font-weight:500">${tn(funds.length, '{n} fund', '{n} funds')}</b><span class="num">${fmt.money(fundTotal, BCUR())}${go}</span><div class="meta"><span>${esc(funds.slice(0, 3).map(g => g.name).join(' · '))}${funds.length > 3 ? '…' : ''}</span></div>`) : ''}</div></section>`;
}
