/* Dorax Finance — Savings & goals: create goals, hand out the savings payment each month, record contributions and withdrawals, follow progress. */

const goalById = id => S.goals.find(g => g.id === id);
const goalAcctName = g => g.accountId && acct(g.accountId) ? acct(g.accountId).name : t('No account linked');
const goalKinds = () => [['goal', t('Goal with a target')], ['fund', t('Fund without a target')]];
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
  if (st.state === 'behind') out.push(t('{amount} behind the plan to date.', { amount: fmt.money(-st.diff, CUR) }));
  if (st.state === 'ahead') out.push(t('{amount} ahead of the plan to date.', { amount: fmt.money(st.diff, CUR) }));
  if (st.target !== null && st.state !== 'reached') {
    if (st.projected) out.push(t('At the planned pace it is reached in {month}.', { month: fmt.month(st.projected) }));
    else out.push(t('The plan reaches {a}; {b} is not planned yet.', { a: fmt.money(st.planTotal, CUR), b: fmt.money(st.unplanned, CUR) }));
    if (st.overdue) out.push(t('The target date ({month}) has passed.', { month: fmt.month(g.deadline) }));
    else if (st.required !== null) out.push(t('To arrive by {month}: {amount} a month.', { month: fmt.month(g.deadline), amount: fmt.money(st.required, CUR) }));
  }
  return out;
}
function goalCard(g) {
  const st = goalStatus(S, g, S.today), live = g.status === 'active';
  return `<section class="card acct goal ${live ? '' : 'off'}${flashed(g.id)}"><div class="row" style="align-items:flex-start;flex-wrap:nowrap"><div class="grow" style="flex:1;min-width:0"><b style="font-weight:500;font-size:15px">${esc(g.name)}</b>
      <div class="note">${g.kind === 'goal' ? t('Goal') : t('Fund')} · ${esc(goalAcctName(g))}</div></div>${goalChip(g, st)}</div>
    <div><div class="note">${t('Saved')}</div><div class="bal num">${fmt.money(st.saved, CUR)}${st.target !== null ? ` <span class="muted" style="font-size:13px;font-weight:500">/ ${fmt.money(st.target, CUR, { trim: true })}</span>` : ''}</div></div>
    ${st.target !== null ? `<div>${meter(st.pct, 'go')}<div class="note" style="margin-top:4px">${fmt.pct(st.pct)}${st.remaining ? ' · ' + t('{amount} to go', { amount: fmt.money(st.remaining, CUR) }) : ''}${g.deadline ? ' · ' + t('by {month}', { month: fmt.month(g.deadline, true) }) : ''}</div></div>` : ''}
    <div class="row">${live ? `<button class="btn sm soft" data-a="goal-move" data-id="${g.id}" data-dir="in">${icon('plus')}${t('Contribute')}</button>` : ''}<button class="btn sm" data-a="goal-move" data-id="${g.id}" data-dir="out" ${st.saved > 0 ? '' : 'disabled'}>${t('Withdraw')}</button><button class="btn sm ghost" data-a="goal-open" data-id="${g.id}">${t('Details')}</button></div></section>`;
}

// ---------- monthly hand-out of the savings payment ----------
function distDraft(ym) {
  if (!UI.dist || UI.dist.ym !== ym) UI.dist = { ym, vals: {}, date: ym === ymOf(S.today) ? S.today : isoDate(ym, 15) };
  return UI.dist;
}
function distCard(ym) {
  const d = distribution(S, ym), draft = distDraft(ym);
  const now = d.rows.map(r => { const txt = draft.vals[r.goal.id], v = txt == null ? r.pending : typedAmount(txt || '0'); return { ...r, txt: txt == null ? plain(r.pending) : txt, now: v === null || v < 0 ? 0 : v }; });
  const total = sum(now.map(r => r.now)), count = now.filter(r => r.now > 0).length, left = d.income - d.done - total;
  if (!d.rows.length) return '';
  return `<section class="card" id="dist"><div class="card-h"><h2>${t('Hand out the savings payment, {month}', { month: fmt.month(ym) })}</h2>${hint('goalDist')}${d.pending ? `<span class="chip warn"><i></i>${t('{amount} still to hand out', { amount: fmt.money(d.pending, CUR) })}</span>` : d.planned ? `<span class="chip good"><i></i>${t('Handed out')}</span>` : `<span class="chip">${t('Nothing planned')}</span>`}</div>
    <div class="card-b flush"><table class="tbl stackable dist"><thead><tr><th>${t('Goal or fund')}</th><th class="r">${t('Plan')}</th><th class="r">${t('Already recorded')}</th><th class="r" style="min-width:130px">${t('Record now (R$)')}</th></tr></thead><tbody>
      ${now.map(r => `<tr><td class="first"><b style="font-weight:500">${esc(r.goal.name)}</b><div class="note">${esc(goalAcctName(r.goal))}</div></td><td class="amt-s wide meta" data-l="${t('Plan')}">${fmt.money(r.planned, CUR, { trim: true })}</td><td class="amt-s wide meta" data-l="${t('Already recorded')}">${r.done ? fmt.money(r.done, CUR) : '—'}</td>
        <td class="amt"><input type="text" inputmode="decimal" class="num ${r.now ? '' : 'z'}" id="dv-${r.goal.id}" aria-label="${esc(r.goal.name)}" value="${esc(r.txt)}" style="width:120px;text-align:right" data-c="dist-val" data-id="${r.goal.id}"></td></tr>`).join('')}
      <tr class="sumrow grand"><td class="first"><b>${t('Total')}</b></td><td class="amt-s wide meta" data-l="${t('Plan')}">${fmt.money(d.planned, CUR, { trim: true })}</td><td class="amt-s wide meta" data-l="${t('Already recorded')}">${fmt.money(d.done, CUR)}</td><td class="amt" style="padding-right:26px">${fmt.money(total, CUR)}</td></tr>
    </tbody></table></div>
    <div class="toolbar" style="border-top:1px solid var(--line);border-bottom:0">
      <span class="note">${t('Income for savings: {a}.', { a: fmt.money(d.income, CUR) })} <span class="${left < 0 ? 'neg' : ''}">${left < 0 ? t('That is {amount} more than this income, counting what is already recorded this month.', { amount: fmt.money(-left, CUR) }) : t('Left after this: {amount} ({label}).', { amount: fmt.money(left, CUR), label: esc(S.remainderLabel.toLowerCase()) })}</span> <a href="#plan">${t('Change income')}</a></span>
      <span class="spacer row"><label class="sr" for="dist-date">${t('Date')}</label><input type="date" id="dist-date" value="${esc(draft.date)}" data-c="dist-date" style="width:150px"><button class="btn primary" data-a="dist-register" ${count ? '' : 'disabled'}>${icon('check')}${count ? tn(count, 'Record {n} contribution', 'Record {n} contributions') : t('Nothing to record')}</button></span></div></section>`;
}

// ---------- screen ----------
function viewGoals() {
  const ym = S.month, nowYm = ymOf(S.today), years = goalYears(S), year = years.includes(UI.goalYear) ? UI.goalYear : (years.includes(+nowYm.slice(0, 4)) ? +nowYm.slice(0, 4) : years[0]), mode = UI.goalMode;
  const open = S.goals.filter(g => g.status === 'active' || g.status === 'paused'), closed = S.goals.filter(g => g.status === 'done' || g.status === 'archived');
  if (!S.goals.length) return `<div class="card"><div class="empty"><b>${t('No goals yet')}</b>${t('Create a goal with a target, or a fund for money you set aside every month.')}<div style="margin-top:12px"><button class="btn primary" data-a="goal-new">${icon('plus')}${t('New goal')}</button></div></div></div>`;
  const d = distribution(S, ym), totalSaved = sum(S.goals.filter(g => g.status !== 'archived').map(g => goalSaved(S, g.id)));
  // year grid
  const months = Array.from({ length: 12 }, (_, i) => year + '-' + String(i + 1).padStart(2, '0')), rem = allocRemainder(S, year), pays = payRows(S, year, 'savings');
  const cur = i => months[i] === ym ? ' cur' : '', past = i => months[i] <= nowYm;
  const show = v => v === null ? '<span class="z">—</span>' : mode === 'diff' ? (v === 0 ? '<span class="z">0</span>' : `<span class="${v > 0 ? 'pos' : 'neg'}">${fmt.money(v, null, { bare: true, trim: true, sign: true })}</span>`) : v === 0 ? '<span class="z">0</span>' : plain(v);
  const lastYear = years[years.length - 1], thisYear = +nowYm.slice(0, 4), lastEmpty = yearEmpty(S, lastYear);
  const gval = (g, i) => { const p = (g.plan[year] || [])[i] || 0; return mode === 'plan' ? p : past(i) ? (mode === 'actual' ? goalMonth(S, g.id, months[i]) : goalMonth(S, g.id, months[i]) - p) : null; };
  const gridRows = open.map(g => `<tr class="${g.status === 'paused' ? 'muted-row' : ''}"><th scope="row"><button class="linkbtn" data-a="goal-open" data-id="${g.id}">${esc(g.name)}</button>${g.status === 'paused' ? ` <span class="chip">${t('Paused')}</span>` : ''}</th>
    ${months.map((m, i) => `<td class="c${cur(i)}">${mode === 'plan' ? `<input type="text" inputmode="decimal" class="${(g.plan[year] || [])[i] ? '' : 'z'}" id="gp-${year}-${g.id}-${i}" aria-label="${esc(g.name)}, ${mon(i, true)}" value="${plain((g.plan[year] || [])[i] || 0)}" data-c="goal-cell" data-id="${g.id}" data-y="${year}" data-m="${i}">` : show(gval(g, i))}</td>`).join('')}
    <td class="c tot">${show(sum(months.map((m, i) => gval(g, i))))}</td></tr>`).join('');
  const payCells = r => r.values.map((v, i) => `<td class="c${cur(i)}">${mode === 'plan' ? `<input type="text" inputmode="decimal" class="${v ? '' : 'z'}" id="ap-${year}-${r.id}-${i}" aria-label="${esc(r.name)}, ${mon(i, true)}" value="${plain(v)}" data-c="pay-cell" data-id="${r.id}" data-y="${year}" data-m="${i}">` : show(v)}</td>`).join('');
  const byAcct = {}; S.goals.filter(g => g.status !== 'archived').forEach(g => { const k = g.accountId && acct(g.accountId) ? g.accountId : ''; (byAcct[k] = byAcct[k] || []).push(g); });
  return `<section class="tiles">
      <div class="card tile"><div class="label"><span>${t('Saved in goals and funds')}</span>${hint('goalSaved')}</div><div class="value num">${fmt.money(totalSaved, CUR)}</div></div>
      <div class="card tile"><div class="label"><span>${t('Plan for {month}', { month: fmt.month(ym, 'bare') })}</span>${hint('goalPlan')}</div><div class="value num">${fmt.money(d.planned, CUR)}</div></div>
      <div class="card tile"><div class="label"><span>${t('Recorded in {month}', { month: fmt.month(ym, 'bare') })}</span>${hint('goalDone')}</div><div class="value num">${fmt.money(d.done, CUR)}</div></div>
      <div class="card tile"><div class="label"><span>${esc(S.remainderLabel)}</span>${hint('goalRest')}</div><div class="value num ${d.remainder < 0 ? 'neg' : ''}">${fmt.money(d.remainder, CUR)}</div></div></section>
  ${distCard(ym)}
  <h2 class="sec">${t('Goals and funds')} ${hint('goalCards')}</h2>
  <div class="grid g-3">${open.map(goalCard).join('') || `<div class="card"><div class="empty">${t('No active goals.')}</div></div>`}</div>
  ${closed.length ? `<div><button class="btn sm ghost" data-a="toggle-closed">${UI.showClosed ? t('Hide completed and archived') : t('Show completed and archived ({n})', { n: closed.length })}</button></div>${UI.showClosed ? `<div class="grid g-3">${closed.map(goalCard).join('')}</div>` : ''}` : ''}
  <section class="card"><div class="card-h"><h2>${t('Monthly plan')}</h2>${hint('goalGrid')}${yearStepper('goal-year', years, year)}
      ${year !== lastYear ? '' : lastEmpty && lastYear > thisYear && years.length > 1 ? `<button class="btn sm ghost" data-a="goal-remove-year" data-v="${lastYear}">${t('Remove {year}', { year: lastYear })}</button>` : `<button class="btn sm ghost" data-a="goal-add-year">${icon('plus')}${t('Add {year}', { year: lastYear + 1 })}</button>`}<div class="right">${seg('goal-mode', [['plan', t('Plan')], ['actual', t('Actual')], ['diff', t('Difference')]], mode, t('Show'))}</div></div>
    <div class="card-b flush"><div class="tbl-wrap"><table class="tbl plan alloc"><thead><tr><th></th>${months.map((m, i) => `<th class="c${cur(i)}">${mon(i)}</th>`).join('')}<th class="c">${t('Year')}</th></tr></thead><tbody>
      ${mode === 'diff' ? '' : `<tr class="grp"><th scope="rowgroup" colspan="14">${t('Income for savings')}</th></tr>${pays.map(r => `<tr><th scope="row">${esc(r.name)}</th>${payCells(r)}<td class="c tot">${plain(sum(r.values))}</td></tr>`).join('') || `<tr><th scope="row" class="muted">${t('No income is routed to savings')}</th><td colspan="13"></td></tr>`}`}
      <tr class="grp"><th scope="rowgroup" colspan="14">${t('Goals and funds')}</th></tr>${gridRows}
      ${mode === 'plan' ? `<tr class="sumrow grand"><th scope="row">${esc(S.remainderLabel)}</th>${rem.map((v, i) => `<td class="c${cur(i)}">${v < 0 ? `<span class="neg">${fmt.money(v, null, { bare: true, trim: true })}</span>` : plain(v)}</td>`).join('')}<td class="c tot">${fmt.money(sum(rem), null, { bare: true, trim: true })}</td></tr>`
        : `<tr class="sumrow grand"><th scope="row">${t('Total')}</th>${months.map((m, i) => { const vs = open.map(g => gval(g, i)); return `<td class="c${cur(i)}">${show(vs.some(v => v === null) ? null : sum(vs))}</td>`; }).join('')}<td class="c tot">${show(sum(open.flatMap(g => months.map((m, i) => gval(g, i)))))}</td></tr>`}
    </tbody></table></div></div>
    <div class="toolbar" style="border-top:1px solid var(--line);border-bottom:0"><span class="note">${mode === 'plan' ? (rem.some(v => v < 0) ? t('Some months plan more than the income routed to savings.') : t('Type in any cell. Enter or the arrow keys move down the column; Tab moves across. The last row is income minus every goal and fund.')) : mode === 'actual' ? t('What was recorded each month. Withdrawals count as negative.') : t('Recorded minus planned. Negative means less was set aside than planned.')}</span></div></section>
  <section class="card"><div class="card-h"><h2>${t('Where the money is')}</h2>${hint('goalWhere')}<span class="sub">${t('Savings grouped by the account each goal is kept in')}</span></div><div class="card-b"><div class="list">
    ${Object.keys(byAcct).sort().reverse().map(k => { const gs = byAcct[k], total = sum(gs.map(g => goalSaved(S, g.id))), a = k && acct(k), hasTx = a && S.transactions.some(x => x.accountId === k);
      return `<div class="li"><div class="grow"><b style="font-weight:500">${a ? esc(a.name) : t('No account linked')}</b><div class="note">${gs.map(g => esc(g.name)).join(' · ')}${hasTx ? ' · ' + t('account balance in the app: {amount}', { amount: fmt.money(accountBalance(S, k, S.today), a.currency) }) : ''}</div></div><span class="num" style="font-weight:500">${fmt.money(total, CUR)}</span></div>`; }).join('')}</div></div></section>`;
}

// ---------- drawers ----------
const yearsAhead = () => { const y = +S.today.slice(0, 4), max = Math.max(y + 6, ...goalYears(S)); return Array.from({ length: max - y + 2 }, (_, i) => y - 1 + i); };
function ymPicker(id, key, value, label, optional) {
  const [y, m] = value ? value.split('-') : ['', ''];
  return `<div class="field"><label for="${id}-m">${label}</label><div class="row" style="flex-wrap:nowrap;gap:6px"><select id="${id}-m" data-c="draft-ym" data-k="${key}" data-part="m" aria-label="${label}">${options([...(optional ? [['', t('No date')]] : []), ...Array.from({ length: 12 }, (_, i) => [String(i + 1).padStart(2, '0'), mon(i, true)])], m)}</select>
    <select id="${id}-y" data-c="draft-ym" data-k="${key}" data-part="y" aria-label="${label} (${t('Year')})" ${value ? '' : 'disabled'} style="max-width:96px">${options(yearsAhead().map(v => [v, v]), y || S.today.slice(0, 4))}</select></div></div>`;
}
function goalFormDrawer(d) {
  const g = d.draft, target = typedAmount(g.targetText || ''), monthly = typedAmount(g.monthlyText || '0') || 0, initial = typedAmount(g.initialText || '0') || 0;
  const saved = d.isNew ? initial : goalSaved(S, g.id), months = g.deadline && g.from && g.deadline >= g.from ? monthDiff(g.deadline, g.from) + 1 : null;
  const suggest = g.kind === 'goal' && target > saved && months ? Math.ceil((target - saved) / months) : null;
  const planning = d.isNew || g.replan, cur = d.isNew ? 0 : goalPlan(goalById(g.id), g.from), remNow = allocRemainder(S, +g.from.slice(0, 4))[+g.from.slice(5) - 1] - (planning ? monthly - cur : 0);
  return `<div class="body">${d.error ? banner('crit', esc(d.error)) : ''}<div class="form-grid">
    ${fld('g-name', t('Name'), inp('g-name', 'name', g.name, `placeholder="${t('e.g. Viaje, Carro, Emergencias')}"`), 'full')}
    ${fld('g-kind', t('Type'), `<select id="g-kind" data-c="draft" data-k="kind" data-rerender="1">${options(goalKinds(), g.kind)}</select>`)}
    ${fld('g-acct', t('Kept in'), `<select id="g-acct" data-c="draft" data-k="accountId">${acctOptions(g.accountId || '', t('No account linked'), personal())}</select>`)}
    ${g.kind === 'goal' ? fld('g-target', t('Target (R$)'), inp('g-target', 'targetText', g.targetText, 'inputmode="decimal" class="num" data-rerender="always"')) + ymPicker('g-deadline', 'deadline', g.deadline, t('Target date'), true) : ''}
    ${d.isNew ? fld('g-initial', t('Already saved (R$)'), inp('g-initial', 'initialText', g.initialText, 'inputmode="decimal" class="num" data-rerender="always" placeholder="0"'), 'full') : ''}
  </div>
  <div class="stack" style="gap:10px;border-top:1px solid var(--line);padding-top:14px"><b style="font-weight:500">${t('Monthly plan')}</b>
    ${d.isNew ? '' : sw('g-replan', g.replan, 'draft', 'data-k="replan" data-rerender="always"', t('Change the monthly plan from a month onwards'))}
    ${planning ? `<div class="form-grid">${fld('g-monthly', t('Each month (R$)'), inp('g-monthly', 'monthlyText', g.monthlyText, 'inputmode="decimal" class="num" data-rerender="always" placeholder="0"'))}${ymPicker('g-from', 'from', g.from, t('Starting in'))}</div>
      ${suggest !== null ? `<div class="row"><span class="note">${t('To reach {a} by {month}: {b} a month for {n} months.', { a: fmt.money(target, CUR, { trim: true }), month: fmt.month(g.deadline), b: fmt.money(suggest, CUR), n: months })}</span><button class="btn sm" data-a="goal-suggest" data-v="${suggest}">${t('Use this amount')}</button></div>` : ''}
      <p class="note ${remNow < 0 ? 'neg' : ''}">${t('{label} in {month} after this: {amount}.', { label: esc(S.remainderLabel), month: fmt.month(g.from), amount: fmt.money(remNow, CUR) })} ${g.deadline && g.kind === 'goal' ? t('The plan is filled until {month}.', { month: fmt.month(g.deadline) }) : t('The plan is filled until December {year}.', { year: Math.max(+g.from.slice(0, 4), ...goalYears(S)) })}</p>` : `<p class="note">${t('The current plan stays as it is. You can also edit single months in the grid.')}</p>`}
  </div>
  ${fld('g-note', t('Notes'), `<textarea id="g-note" data-c="draft" data-k="note">${esc(g.note || '')}</textarea>`)}</div>
  <footer><button class="btn primary" data-a="goal-save">${d.isNew ? t('Create goal') : t('Save')}</button><button class="btn ghost spacer" data-a="${d.isNew ? 'close' : 'goal-open'}" data-id="${g.id || ''}">${t('Cancel')}</button></footer>`;
}
function goalViewDrawer(d) {
  const g = goalById(d.id), st = goalStatus(S, g, S.today), moves = S.goalMoves.map((m, i) => [m, i]).filter(x => x[0].goalId === g.id).sort((a, b) => a[0].date < b[0].date ? 1 : a[0].date > b[0].date ? -1 : b[1] - a[1]).map(x => x[0]), live = g.status === 'active';
  return `<div class="body">
    <div class="row">${goalChip(g, st)}<span class="note">${g.kind === 'goal' ? t('Goal') : t('Fund')} · ${esc(goalAcctName(g))}${g.deadline ? ' · ' + t('by {month}', { month: fmt.month(g.deadline) }) : ''}</span></div>
    <div><div class="bal num" style="font-size:26px;font-weight:500">${fmt.money(st.saved, CUR)}${st.target !== null ? ` <span class="muted" style="font-size:14px;font-weight:500">/ ${fmt.money(st.target, CUR, { trim: true })}</span>` : ''}</div>
      ${st.target !== null ? `<div style="margin-top:8px">${meter(st.pct, 'go')}<div class="note" style="margin-top:4px">${fmt.pct(st.pct)}${st.remaining ? ' · ' + t('{amount} to go', { amount: fmt.money(st.remaining, CUR) }) : ''}</div></div>` : ''}</div>
    <dl class="kv"><dt>${t('Planned to date')}</dt><dd class="num">${fmt.money(st.plannedToDate, CUR)}</dd><dt>${t('Plan this month')}</dt><dd class="num">${fmt.money(st.thisMonth, CUR)}</dd>${g.note ? `<dt>${t('Notes')}</dt><dd>${esc(g.note)}</dd>` : ''}</dl>
    ${goalFacts(g, st).length ? `<div>${goalFacts(g, st).map(f => `<div class="obs">${esc(f)}</div>`).join('')}</div>` : ''}
    ${live ? '' : `<p class="note">${t('Not receiving money from the plan.')}</p>`}
    <div class="row">${live ? `<button class="btn primary" data-a="goal-move" data-id="${g.id}" data-dir="in" data-back="1">${icon('plus')}${t('Contribute')}</button>` : ''}<button class="btn" data-a="goal-move" data-id="${g.id}" data-dir="out" data-back="1" ${st.saved > 0 ? '' : 'disabled'}>${t('Withdraw')}</button><button class="btn" data-a="goal-edit" data-id="${g.id}">${t('Edit')}</button></div>
    <div style="border-top:1px solid var(--line);padding-top:12px"><b style="font-weight:500">${t('Movements')}</b>
      ${moves.length ? `<div class="list" style="margin-top:6px">${moves.map(m => `<div class="li"><span class="when" style="width:84px">${fmt.date(m.date, true)}</span><span class="grow">${m.amount < 0 ? t('Withdrawal') : t('Contribution')}${m.note ? ` <span class="muted">· ${esc(m.note)}</span>` : ''}${m.accountId && acct(m.accountId) ? ` <span class="muted">· ${esc(acct(m.accountId).name)}</span>` : ''}</span><span class="num ${m.amount < 0 ? '' : 'pos'}" style="font-weight:500">${fmt.money(m.amount, CUR, { sign: true })}</span><button class="iconbtn" data-a="move-delete" data-id="${m.id}" aria-label="${t('Delete')} ${fmt.date(m.date, true)}">${icon('x')}</button></div>`).join('')}</div>`
        : `<div class="empty" style="padding:18px 0"><b>${t('No movements yet')}</b>${t('If you already have money set aside for this, record it as the starting balance.')}<div style="margin-top:10px"><button class="btn sm" data-a="goal-move" data-id="${g.id}" data-dir="in" data-back="1" data-initial="1">${t('Record starting balance')}</button></div></div>`}</div>
  </div>
  <footer>${g.status === 'active' ? `<button class="btn sm" data-a="goal-status" data-id="${g.id}" data-v="paused">${t('Pause')}</button><button class="btn sm" data-a="goal-status" data-id="${g.id}" data-v="done">${icon('check')}${t('Mark as completed')}</button>` : `<button class="btn sm" data-a="goal-status" data-id="${g.id}" data-v="active">${g.status === 'paused' ? t('Resume') : t('Reopen')}</button>`}
    ${g.status === 'archived' ? '' : `<button class="btn sm ghost" data-a="goal-status" data-id="${g.id}" data-v="archived">${t('Archive')}</button>`}
    <button class="btn sm ghost danger spacer" data-a="goal-delete-ask">${t('Delete')}</button></footer>`;
}
function goalMoveDrawer(d) {
  const m = d.draft, g = goalById(m.goalId), saved = goalSaved(S, g.id), out = m.dir === 'out';
  return `<div class="body">${d.error ? banner('crit', esc(d.error)) : ''}
    <p class="note">${esc(g.name)} · ${t('Saved')}: <b class="num" style="color:var(--ink)">${fmt.money(saved, CUR)}</b></p>
    <div class="form-grid">
      ${fld('m-amount', t('Amount (R$)'), inp('m-amount', 'amountText', m.amountText, 'inputmode="decimal" class="num" placeholder="0,00"'))}
      ${fld('m-date', t('Date'), `<input type="date" id="m-date" value="${esc(m.date)}" data-c="draft" data-k="date">`)}
      ${fld('m-acct', out ? t('Taken from') : t('Kept in'), `<select id="m-acct" data-c="draft" data-k="accountId">${acctOptions(m.accountId || '', t('No account linked'), personal())}</select>`, 'full')}
      ${fld('m-note', t('Note (optional)'), inp('m-note', 'note', m.note), 'full')}</div>
    ${out ? banner('', t('A withdrawal lowers what is saved in this goal. It does not create a transaction in your accounts.')) : `<p class="note">${t('A contribution records money set aside for this goal. It does not move money between your accounts by itself.')}</p>`}</div>
  <footer><button class="btn primary" data-a="move-save">${out ? t('Record withdrawal') : t('Record contribution')}</button><button class="btn ghost spacer" data-a="${d.back ? 'goal-open' : 'close'}" data-id="${g.id}">${t('Cancel')}</button></footer>`;
}

// ---------- dashboard card ----------
function goalsDashCard() {
  if (!S.goals.length) return '';
  const nowYm = ymOf(S.today), d = distribution(S, nowYm), live = S.goals.filter(g => g.status === 'active'), goals = live.filter(g => g.kind === 'goal').slice(0, 3), funds = live.filter(g => g.kind !== 'goal');
  const total = sum(S.goals.map(g => goalSaved(S, g.id))), fundTotal = sum(funds.map(g => goalSaved(S, g.id)));
  const pace = st => st.state === 'reached' ? t('Reached') : st.saved <= 0 ? t('Not started') : st.projected ? t('reached in {month} at the planned pace', { month: fmt.month(st.projected, true) }) : '';
  return `<section class="card" id="goals-card"><div class="card-h"><h2>${t('Savings & goals')}</h2>${info(t('Saved is the sum of the contributions you recorded, minus withdrawals. “Reached in” follows the amounts planned for the coming months.'))}<a class="right btn sm ghost" href="#goals">${t('Open goals')}</a></div>
    <div class="card-b"><div class="figure"><b>${fmt.money(total, CUR)}</b><span>${t('saved in goals and funds')}</span></div>
      ${goals.map(g => { const st = goalStatus(S, g, S.today); return `<div class="budget"><b style="font-weight:500">${esc(g.name)}</b><span class="num">${fmt.money(st.saved, CUR)} <span class="muted">/ ${fmt.money(st.target, CUR, { trim: true })}</span></span>${meter(st.pct, 'go')}<div class="meta"><span>${fmt.pct(st.pct)}</span><span>${pace(st)}</span></div></div>`; }).join('')}
      ${funds.length ? `<div class="budget funds"><b style="font-weight:500">${tn(funds.length, '{n} fund', '{n} funds')}</b><span class="num">${fmt.money(fundTotal, CUR)}</span><div class="meta"><span>${esc(funds.slice(0, 3).map(g => g.name).join(' · '))}${funds.length > 3 ? '…' : ''}</span></div></div>` : ''}</div></section>`;
}
