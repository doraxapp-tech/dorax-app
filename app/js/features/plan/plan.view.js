/* Dorax Finance — Fixed costs: this month's payments, the year plan, and the life of each line (create, change from a month, pay, end). */

const lineById = id => B().plan.lines.find(l => l.id === id);
const payKinds = () => [['fixed', t('One payment, same amount')], ['variable', t('One payment, amount changes')], ['budget', t('Several purchases in the month')]];
const payKindShort = k => ({ fixed: t('Fixed amount'), variable: t('Variable amount'), budget: t('Spent during the month') }[k]);
const cashAccounts = () => bookAccounts();
const lineAcct = l => { const a = l.accountId && acct(l.accountId); return (a && isBiz(a.id) === inCompany() && (!inCompany() || a.currency === BCUR()) ? a : cashAccounts()[0]) || null; };
const defaultPayDate = (l, ym) => ym === ymOf(B().today) ? B().today : isoDate(ym, l.due || 31);

function payChip(p, lastDate) {
  switch (p.status) {
    case 'paid': return `<span class="chip good"><i></i>${t('Paid')}${lastDate ? ' · ' + fmt.date(lastDate) : ''}</span>`;
    case 'over': return `<span class="chip crit"><i></i>${t('{amount} over', { amount: fmt.money(-p.remaining, BCUR()) })}</span>`;
    case 'late': return `<span class="chip warn"><i></i>${p.ym < ymOf(B().today) || !p.dueDate ? t('No payment recorded') : t('Was due on {date}', { date: fmt.date(p.dueDate) })}</span>`;
    case 'under': return `<span class="chip info"><i></i>${t('{amount} left', { amount: fmt.money(p.remaining, BCUR()) })}</span>`;
    case 'onplan': return `<span class="chip good"><i></i>${t('Plan used up')}</span>`;
    case 'unpaid': return !p.bill ? `<span class="chip">${t('Nothing spent yet')}</span>` : !p.dueDate ? `<span class="chip">${t('To pay')}</span>`
      : p.days === 0 ? `<span class="chip warn"><i></i>${t('Due today')}</span>` : p.days <= 5 ? `<span class="chip info"><i></i>${tn(p.days, 'Due in {n} day', 'Due in {n} days')}</span>` : `<span class="chip">${t('Due {date}', { date: fmt.date(p.dueDate) })}</span>`;
  }
  return '';
}
function payAction(p) {
  if (p.bill && p.spent) return `<button class="btn sm ghost" data-a="line-open" data-id="${p.id}" data-ym="${p.ym}">${t('Details')}</button>`;
  if (p.pay === 'fixed') return `<button class="btn sm soft" data-a="line-pay-now" data-id="${p.id}" data-ym="${p.ym}">${icon('check')}${t('Mark as paid')}</button>`;
  return `<button class="btn sm" data-a="line-pay" data-id="${p.id}" data-ym="${p.ym}">${icon('plus')}${p.bill ? t('Record payment') : t('Add expense')}</button>`;
}

// ---------- the month: what is paid and what is still to pay ----------
function payList(ym) {
  const prog = planProgress(B(), ym, BCUR(), B().today).filter(p => p.planned || p.spent);
  if (!prog.length) return `<section class="card" id="paylist"><div class="card-h"><h2>${t('Payments, {month}', { month: fmt.month(ym) })}</h2>${hint('planPayments')}</div><div class="empty"><b>${t('Nothing planned for {month}', { month: fmt.month(ym) })}</b>${t('Add your fixed costs once; every month they appear here to be marked as paid.')}<div class="row" style="margin-top:12px;justify-content:center"><button class="btn primary" data-a="line-new">${icon('plus')}${t('New fixed cost')}</button>${B().plan.lines.length || inCompany() ? '' : `<a class="btn" href="#imports">${t('Bring a spreadsheet')}</a>`}</div></div></section>`;
  const open = prog.filter(p => p.bill && !p.spent && p.planned), late = prog.filter(p => p.status === 'late');
  const rank = p => p.bill && !p.spent ? 0 : p.bill ? 2 : 1, key = p => p.dueDate || '9';
  const order = (a, b) => rank(a) - rank(b) || (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0);
  const last = p => { const x = linePayments(B(), p, ym, BCUR())[0]; return x ? x.t.date : null; };
  const flat = B().categories.flatMap(c => prog.filter(p => p.categoryId === c.id).sort(order)), pp = paged('paylist', flat), onPage = new Set(pp.rows.map(p => p.id));
  const group = c => {
    const xs = prog.filter(p => p.categoryId === c.id).sort(order), quick = xs.filter(p => p.pay === 'fixed' && !p.spent && p.planned), bills = xs.filter(p => p.bill && p.planned);
    return `<tr class="grp"><td class="first" colspan="5"><span class="cat"><span class="dot" style="background:${catColor(c.id)}"></span><b>${esc(c.name)}</b></span> <span class="note">${fmt.money(sum(xs.map(p => p.spent)), BCUR())} / ${fmt.money(sum(xs.map(p => p.planned)), BCUR(), { trim: true })}${bills.length ? ' · ' + t('{a} of {b} paid', { a: bills.filter(p => p.spent).length, b: bills.length }) : ''}</span></td>
        <td class="amt">${quick.length > 1 ? `<button class="btn sm" data-a="group-pay-now" data-cat="${c.id}" data-ym="${ym}">${icon('check')}${t('Mark {n} as paid', { n: quick.length })}</button>` : ''}</td></tr>
      ${xs.filter(p => onPage.has(p.id)).map(p => { const a = lineAcct(p); return `<tr class="${p.bill && p.spent ? 'done' : ''}${flashed(p.id)}"><td class="first"><button class="linkbtn" data-a="line-open" data-id="${p.id}" data-ym="${ym}">${esc(p.name)}</button><div class="note">${a ? esc(a.name) : t('No account')}${p.pay === 'fixed' ? '' : ' · ' + payKindShort(p.pay)}</div></td>
        <td class="num hide-sm">${p.dueDate ? fmt.date(p.dueDate) : p.bill && onCard(B(), p) ? `<span class="muted">${t('On the card')}</span>` : p.bill ? `<button class="linkbtn dim" data-a="due-days" data-id="${p.id}">${t('Set day')}</button>` : '<span class="muted">—</span>'}</td><td class="amt-s hide-sm">${fmt.money(p.planned, BCUR(), { trim: true })}</td><td class="amt-s hide-sm">${p.spent ? fmt.money(p.spent, BCUR()) : '<span class="muted">—</span>'}</td>
        <td class="sm-row meta">${t('Plan')} ${fmt.money(p.planned, BCUR(), { trim: true })}${p.spent && p.spent !== p.planned ? ' · ' + t('Paid') + ' ' + fmt.money(p.spent, BCUR()) : ''} ${payChip(p, p.spent ? last(p) : null)}</td>
        <td class="hide-sm">${payChip(p, p.spent ? last(p) : null)}</td><td class="amt">${payAction(p)}</td></tr>`; }).join('')}`;
  };
  return `<section class="card" id="paylist"><div class="card-h"><h2>${t('Payments, {month}', { month: fmt.month(ym) })}</h2>${hint('planPayments')}${late.length ? `<span class="chip warn"><i></i>${tn(late.length, '{n} late', '{n} late')}</span>` : ''}${open.length ? `<span class="chip">${tn(open.length, '{n} to pay', '{n} to pay')}</span>` : `<span class="chip good"><i></i>${t('All bills paid')}</span>`}
      <button class="right btn sm ${dueMissing() ? '' : 'ghost'}" data-a="due-days">${icon('calendar')}${t('Due days')}${dueMissing() ? ` <span class="count">${t('{n} missing', { n: dueMissing() })}</span>` : ''}</button></div>
    <div class="card-b flush"><table class="tbl stackable paylist"><thead><tr><th>${t('Fixed cost')}</th><th>${t('Due')}</th><th class="r">${t('Plan')}</th><th class="r">${t('Paid')}</th><th>${t('Status')}</th><th><span class="sr">${t('Actions')}</span></th></tr></thead><tbody>
      ${B().categories.filter(c => pp.rows.some(p => p.categoryId === c.id)).map(group).join('')}</tbody></table>${pp.html}</div>
    <div class="toolbar" style="border-top:1px solid var(--line);border-bottom:0"><span class="note">${t('“Mark as paid” records the planned amount as an expense in that line’s account. Importing the statement later does not count it twice: the app flags it as a possible duplicate.')}</span></div></section>`;
}

// ---------- screen ----------
function viewPlan() {
  const ym = B().month, nowM = ymOf(B().today), thisYear = +nowM.slice(0, 4), years = goalYears(B()), mode = UI.planMode;
  const year = years.includes(UI.planYear) ? UI.planYear : years.includes(thisYear) ? thisYear : years[0] || thisYear, lastYear = years[years.length - 1];
  const months = Array.from({ length: 12 }, (_, i) => year + '-' + String(i + 1).padStart(2, '0'));
  const totals = months.map(m => m <= nowM ? categoryTotals(B(), m, BCUR()) : null);
  const pv = (l, i) => (l.plan[year] || [])[i] || 0;
  const val = (l, i) => mode === 'plan' ? pv(l, i) : totals[i] ? (mode === 'actual' ? lineActual(l, totals[i]) : lineActual(l, totals[i]) - pv(l, i)) : null;
  const show = (v, kind) => v === null ? '<span class="z">—</span>' : mode === 'diff' ? (v === 0 ? '<span class="z">0</span>' : `<span class="${(kind === 'income') === (v > 0) ? 'pos' : 'neg'}">${fmt.money(v, null, { bare: true, trim: true, sign: true })}</span>`) : v === 0 ? '<span class="z">0</span>' : plain(v);
  const cur = i => months[i] === ym ? ' cur' : '';
  const row = l => `<tr class="${l.end && l.end < nowM ? 'muted-row' : ''}"><th scope="row"><span class="cat"><span class="dot" style="background:${catColor(l.categoryId)}"></span><button class="linkbtn" data-a="line-open" data-id="${l.id}">${esc(l.name)}</button></span>${l.end ? ` <span class="chip">${t('Ends {month}', { month: fmt.month(l.end, true) })}</span>` : ''}</th>
    ${months.map((m, i) => `<td class="c${cur(i)}">${mode === 'plan' ? `<input type="text" inputmode="decimal" class="${pv(l, i) ? '' : 'z'}" id="pl-${l.id}-${i}" aria-label="${esc(l.name)}, ${mon(i, true)} ${year}" value="${plain(pv(l, i))}" data-c="plan-cell" data-id="${l.id}" data-y="${year}" data-m="${i}">` : show(val(l, i), 'expense')}</td>`).join('')}
    <td class="c tot">${show(sum(months.map((m, i) => val(l, i))), 'expense')}</td></tr>`;
  const totalRow = (label, lines, cls) => `<tr class="sumrow ${cls || ''}"><th scope="row">${label}</th>${months.map((m, i) => { const vs = lines.map(l => val(l, i)); return `<td class="c${cur(i)}">${show(vs.some(v => v === null) ? null : sum(vs), 'expense')}</td>`; }).join('')}<td class="c tot">${show(sum(lines.flatMap(l => months.map((m, i) => val(l, i)))), 'expense')}</td></tr>`;
  const inc = payRows(B(), year, 'fixed'), exp = linesIn(B(), year);
  const pval = (r, i) => mode === 'plan' ? r.values[i] : totals[i] ? (mode === 'actual' ? payActual(B(), r, months[i], BCUR()) : payActual(B(), r, months[i], BCUR()) - r.values[i]) : null;
  const payRow = r => `<tr><th scope="row"><span class="cat"><span class="dot" style="background:var(--ink-3)"></span>${esc(r.name)}</span></th>
    ${months.map((m, i) => `<td class="c${cur(i)}">${mode === 'plan' ? `<input type="text" inputmode="decimal" class="${r.values[i] ? '' : 'z'}" id="py-${r.id}-${i}" aria-label="${esc(r.name)}, ${mon(i, true)} ${year}" value="${plain(r.values[i])}" data-c="pay-cell" data-id="${r.id}" data-y="${year}" data-m="${i}">` : show(pval(r, i), 'income')}</td>`).join('')}
    <td class="c tot">${show(sum(months.map((m, i) => pval(r, i))), 'income')}</td></tr>`;
  const incTotal = `<tr class="sumrow"><th scope="row">${t('Income for fixed costs')}</th>${months.map((m, i) => { const vs = inc.map(r => pval(r, i)); return `<td class="c${cur(i)}">${show(vs.some(v => v === null) ? null : sum(vs), 'income')}</td>`; }).join('')}<td class="c tot">${show(sum(inc.flatMap(r => months.map((m, i) => pval(r, i)))), 'income')}</td></tr>`;
  const expCats = B().categories.filter(c => exp.some(l => l.categoryId === c.id));
  // the year's remainder: income for fixed costs minus fixed costs, over the months that have figures (v39: the cell was empty, the same gap the owner's sheet had)
  const netYear = sum(months.map((m, i) => { const a = inc.map(r => pval(r, i)), b = exp.map(l => val(l, i)); return a.concat(b).some(x => x === null) ? 0 : sum(a) - sum(b); }));
  const netRow = `<tr class="sumrow grand"><th scope="row">${t('Income minus fixed costs')}</th>${months.map((m, i) => { const a = inc.map(r => pval(r, i)), b = exp.map(l => val(l, i)); const v = sum(a) - sum(b); return `<td class="c${cur(i)}">${a.concat(b).some(x => x === null) ? '<span class="z">—</span>' : mode === 'diff' ? show(v, 'income') : `<span class="${v < 0 ? 'neg' : ''}">${fmt.money(v, null, { bare: true, trim: true })}</span>`}</td>`; }).join('')}<td class="c tot">${mode === 'diff' ? show(netYear, 'income') : `<span class="${netYear < 0 ? 'neg' : ''}">${fmt.money(netYear, null, { bare: true, trim: true })}</span>`}</td></tr>`;
  const prog = planProgress(B(), ym, BCUR(), B().today), pt = planTotals(B(), ym), spent = sum(prog.map(x => x.spent)), toPay = sum(prog.map(x => x.toPay)), net = pt.income - pt.expenses;
  const emptyYear = !yearPlanned(B(), year), canCopy = emptyYear && yearPlanned(B(), year - 1) > 0;
  return `<section class="tiles">
      <div class="card tile"><div class="label"><span>${t('Fixed costs, {month}', { month: fmt.month(ym, 'bare') })}</span>${hint('planFixed')}</div><div class="value num">${fmt.money(pt.expenses, BCUR())}</div></div>
      <div class="card tile"><div class="label"><span>${t('Paid so far')}</span>${hint('planPaid')}</div><div class="value num">${fmt.money(spent, BCUR())}</div></div>
      <div class="card tile"><div class="label"><span>${t('Still to pay')}</span>${hint('planLeft')}</div><div class="value num">${fmt.money(toPay, BCUR())}</div></div>
      <div class="card tile"><div class="label"><span>${t('Income minus fixed costs')}</span>${hint('planNet')}</div><div class="value num ${net < 0 ? 'neg' : ''}">${fmt.money(net, BCUR())}</div></div></section>
  ${payList(ym)}
  ${incomePanel(ym)}
  <section class="card" id="plan-year"><div class="card-h"><h2>${t('Fixed costs {year}', { year })}</h2>${hint('planYear')}${yearStepper('plan-year', years, year)}
      ${year !== lastYear ? '' : yearEmpty(B(), lastYear) && lastYear > thisYear && years.length > 1 ? `<button class="btn sm ghost" data-a="goal-remove-year" data-v="${lastYear}">${t('Remove {year}', { year: lastYear })}</button>` : `<button class="btn sm ghost" data-a="goal-add-year">${icon('plus')}${t('Add {year}', { year: lastYear + 1 })}</button>`}
      <div class="right">${seg('plan-mode', [['plan', t('Plan')], ['actual', t('Actual')], ['diff', t('Difference')]], mode, t('Show'))}</div></div>
    ${emptyYear && B().plan.lines.length ? `<div class="card-b" style="padding-bottom:0">${banner('', `<b>${t('{year} has no fixed costs yet.', { year })}</b> ${canCopy ? t('Start it with the amounts of December {prev} and then change what is different.', { prev: year - 1 }) : t('Type the amounts in the grid, or open a line and set its amount from a month onwards.')}${canCopy ? `<div class="row" style="margin-top:8px"><button class="btn sm primary" data-a="plan-start-year" data-v="${year}">${t('Start {year} from December {prev}', { year, prev: year - 1 })}</button></div>` : ''}`)}</div>` : ''}
    <div class="card-b flush"><div class="tbl-wrap"><table class="tbl plan"><thead><tr><th></th>${months.map((m, i) => `<th class="c${cur(i)}"><button data-a="set-month" data-ym="${m}" ${m > nowM || m < minMonth() ? 'disabled' : ''}>${mon(i)}</button></th>`).join('')}<th class="c">${t('Year')}</th></tr></thead><tbody>
      <tr class="grp"><th scope="rowgroup" colspan="14">${t('Income')}</th></tr>${inc.map(payRow).join('') || `<tr><th scope="row" class="muted">${t('No income is routed to fixed costs')}</th><td colspan="13"></td></tr>`}${incTotal}
      ${expCats.map(c => `<tr class="grp"><th scope="rowgroup" colspan="14">${esc(c.name)}</th></tr>${exp.filter(l => l.categoryId === c.id).map(row).join('')}${totalRow(t('Total {name}', { name: esc(c.name) }), exp.filter(l => l.categoryId === c.id))}`).join('')}
      ${exp.length ? totalRow(t('Total fixed monthly costs'), exp, 'grand') + netRow : ''}
    </tbody></table></div></div>
    <div class="toolbar" style="border-top:1px solid var(--line);border-bottom:0"><span class="note">${!exp.length ? t('No fixed costs yet. Use “New fixed cost” to add the first one.') : mode === 'plan' ? t('Type in any cell to change one month. To change an amount from a month onwards, or to end a cost, open the line by its name.') : mode === 'actual' ? t('What was paid each month, from recorded payments and imported statements.') : t('Actual minus plan. Positive spending differences mean you spent more than planned.')}</span></div></section>`;
}

// ---------- drawers ----------
function lineFormDrawer(d) {
  const l = d.draft, amount = typedAmount(l.amountText || '0') || 0, planning = d.isNew || l.replan, lastYear = Math.max(+l.from.slice(0, 4), ...goalYears(B()));
  const before = d.isNew ? 0 : planValue(B(), lineById(l.id), l.from), pt = planTotals(B(), l.from), net = pt.income - pt.expenses - (planning ? amount - before : 0);
  return `<div class="body">${d.error ? banner('crit', esc(d.error)) : ''}<div class="form-grid">
    ${fld('l-name', t('Name'), inp('l-name', 'name', l.name, `placeholder="${inCompany() ? t('e.g. Accountant, taxes') : t('e.g. Seguro del carro')}"`), 'full')}
    ${fld('l-cat', t('Group'), `<select id="l-cat" data-c="draft" data-k="catId">${options(B().categories.filter(c => !c.income).map(c => [c.id, c.name]), l.catId)}</select>`)}
    ${fld('l-pay', t('How it is paid'), `<select id="l-pay" data-c="draft" data-k="pay" data-rerender="1">${options(payKinds(), l.pay)}</select>`)}
    ${fld('l-acct', t('Paid from'), `<select id="l-acct" data-c="draft" data-k="accountId" data-rerender="1">${acctOptions(l.accountId || '', cashAccounts().length ? '' : t('No account'), cashAccounts())}</select>`)}
    ${fld('l-due', t('Due day (optional)'), `<input type="number" id="l-due" min="1" max="31" inputmode="numeric" value="${esc(l.due)}" data-c="draft" data-k="due">`)}
    <p class="note full" style="margin:0">${l.pay === 'budget' ? t('A cost spent during the month has no due day and no reminder.') : acct(l.accountId) && acct(l.accountId).type === 'credit' ? t('Charged to a card, it is part of the card’s invoice. The invoice is what gets a due day and a reminder; leave this empty unless you want a reminder for this charge too.') : t('With a due day, the app reminds you before it is due and tells you when it is late.')}</p>
  </div>
  <div class="stack" style="gap:10px;border-top:1px solid var(--line);padding-top:14px"><b style="font-weight:500">${t('Monthly amount')}</b>
    ${d.isNew ? '' : sw('l-replan', l.replan, 'draft', 'data-k="replan" data-rerender="always"', t('Change the amount from a month onwards'))}
    ${planning ? `<div class="form-grid">${fld('l-amount', tcur('Each month (R$)'), inp('l-amount', 'amountText', l.amountText, 'inputmode="decimal" class="num" data-rerender="always" placeholder="0"'))}${ymPicker('l-from', 'from', l.from, t('Starting in'))}</div>
      <p class="note ${net < 0 ? 'neg' : ''}">${t('Applied from {month} to December {year}. Earlier months do not change.', { month: fmt.month(l.from), year: lastYear })} ${t('Income minus fixed costs in {month} after this: {amount}.', { month: fmt.month(l.from), amount: fmt.money(net, BCUR()) })}</p>`
      : `<p class="note">${t('The current amounts stay as they are. You can also change single months in the grid.')}</p>`}
  </div>
  ${d.isNew ? '' : `<div class="stack" style="gap:10px;border-top:1px solid var(--line);padding-top:14px"><b style="font-weight:500">${t('End of this cost')}</b><div class="form-grid">${ymPicker('l-end', 'end', l.end, t('Last month it is paid'), true)}</div>
    <p class="note">${t('After that month the plan is zero and the line leaves the following years. Payments already recorded are kept.')}</p></div>`}
  ${fld('l-note', t('Notes'), `<textarea id="l-note" data-c="draft" data-k="note">${esc(l.note || '')}</textarea>`)}</div>
  <footer><button class="btn primary" data-a="line-save">${d.isNew ? t('Add fixed cost') : t('Save')}</button><button class="btn ghost spacer" data-a="${d.isNew ? 'close' : 'line-open'}" data-id="${l.id || ''}">${t('Cancel')}</button></footer>`;
}
function lineViewDrawer(d) {
  const l = lineById(d.id), ym = d.ym || B().month, year = ym.slice(0, 4), p = planProgress(B(), ym, BCUR(), B().today).find(x => x.id === l.id), pays = linePayments(B(), l, null, BCUR()), a = lineAcct(l), cat = B().categories.find(c => c.id === l.categoryId);
  const monthPays = pays.filter(x => ymOf(x.t.date) === ym), paidYear = sum(pays.filter(x => x.t.date.slice(0, 4) === year).map(x => x.amount));
  const byMonth = {}; pays.forEach(x => { const k = ymOf(x.t.date); if (k < ymOf(B().today)) byMonth[k] = (byMonth[k] || 0) + x.amount; });
  const lastMonths = Object.keys(byMonth).sort().slice(-6), avg = lastMonths.length ? Math.round(sum(lastMonths.map(k => byMonth[k])) / lastMonths.length) : null, shown = pays.slice(0, 12);
  const canPay = !!a;
  return `<div class="body">
    <div class="row">${payChip(p, monthPays[0] ? monthPays[0].t.date : null) || `<span class="chip">${t('Not planned')}</span>`}<span class="note">${cat ? esc(cat.name) + ' · ' : ''}${payKindShort(l.pay)}${a ? ' · ' + esc(a.name) : ''}${l.due ? ' · ' + t('due day {d}', { d: l.due }) : ''}</span></div>
    <div><div class="note">${fmt.month(ym)}</div><div class="bal num" style="font-size:26px;font-weight:500">${fmt.money(p.spent, BCUR())} <span class="muted" style="font-size:14px;font-weight:500">/ ${fmt.money(p.planned, BCUR(), { trim: true })}</span></div>
      ${p.planned ? `<div style="margin-top:8px">${meter(p.pct, p.status === 'over' ? 'crit' : 'ok')}</div>` : ''}</div>
    <dl class="kv"><dt>${t('Planned in {year}', { year })}</dt><dd class="num">${fmt.money(sum(l.plan[year] || []), BCUR())}</dd><dt>${t('Paid in {year}', { year })}</dt><dd class="num">${fmt.money(paidYear, BCUR())}</dd>
      ${avg !== null && l.pay !== 'fixed' ? `<dt>${tn(lastMonths.length, 'Average of the last {n} month with payments', 'Average of the last {n} months with payments')}</dt><dd class="num">${fmt.money(avg, BCUR())}</dd>` : ''}
      ${l.end ? `<dt>${t('Last month it is paid')}</dt><dd>${fmt.month(l.end)}</dd>` : ''}${l.note ? `<dt>${t('Notes')}</dt><dd>${esc(l.note)}</dd>` : ''}</dl>
    <div class="row">${canPay ? `<button class="btn primary" data-a="line-pay" data-id="${l.id}" data-ym="${ym}" data-back="1">${icon('plus')}${l.pay === 'budget' ? t('Add expense') : t('Record payment')}</button>` : ''}<button class="btn" data-a="line-edit" data-id="${l.id}">${t('Edit')}</button></div>
    <div style="border-top:1px solid var(--line);padding-top:12px"><b style="font-weight:500">${t('Payments')}</b>
      ${pays.length ? `<div class="list" style="margin-top:6px">${shown.map(x => `<div class="li"><span class="when" style="width:84px">${fmt.date(x.t.date, true)}</span><span class="grow">${esc(acct(x.t.accountId).name)}${x.t.planLineId ? '' : ` <span class="muted">· ${esc(x.t.merchant)}</span>`}${x.t.notes ? ` <span class="muted">· ${esc(x.t.notes)}</span>` : ''}</span><span class="num" style="font-weight:500">${fmt.money(x.amount, BCUR())}</span>
          ${x.t.planLineId ? `<button class="iconbtn" data-a="pay-delete" data-id="${x.t.id}" aria-label="${t('Delete')} ${fmt.date(x.t.date, true)}">${icon('x')}</button>` : `<button class="iconbtn" data-a="open-tx" data-id="${x.t.id}" aria-label="${t('Edit transaction')} ${fmt.date(x.t.date, true)}">${icon('right')}</button>`}</div>`).join('')}</div>
          ${pays.length > shown.length ? `<div class="row" style="margin-top:8px"><span class="note">${t('Showing the last {a} of {b}.', { a: shown.length, b: pays.length })}</span><button class="btn sm ghost" data-a="filter-cat" data-cat="${l.subcategoryId || l.categoryId}" data-all="1">${t('View all')}</button></div>` : ''}`
        : `<div class="empty" style="padding:18px 0"><b>${t('No payments yet')}</b>${t('Payments recorded here and transactions imported from statements both appear in this list.')}</div>`}</div>
  </div>
  <footer>${l.end ? '' : `<button class="btn sm" data-a="line-edit" data-id="${l.id}" data-end="1">${t('End this cost')}</button>`}
    <button class="btn sm ghost danger spacer" data-a="line-delete-ask">${t('Delete')}</button></footer>`;
}
function linePayDrawer(d) {
  const m = d.draft, l = lineById(m.lineId), ym = parseDate(m.date) ? ymOf(m.date) : m.ym, p = planProgress(B(), ym, BCUR(), B().today).find(x => x.id === l.id), a = acct(m.accountId);
  return `<div class="body">${d.error ? banner('crit', esc(d.error)) : ''}
    <p class="note">${esc(l.name)} · ${fmt.month(ym)} · ${t('Plan')}: <b class="num" style="color:var(--ink)">${fmt.money(p.planned, BCUR())}</b>${p.spent ? ` · ${t('Paid')}: <b class="num" style="color:var(--ink)">${fmt.money(p.spent, BCUR())}</b>` : ''}</p>
    <div class="form-grid">
      ${fld('py-amount', tcur('Amount (R$)'), inp('py-amount', 'amountText', m.amountText, 'inputmode="decimal" class="num" placeholder="0,00"'))}
      ${fld('py-date', t('Date'), `<input type="date" id="py-date" value="${esc(m.date)}" data-c="draft" data-k="date" data-rerender="always">`)}
      ${fld('py-acct', t('Paid from'), `<select id="py-acct" data-c="draft" data-k="accountId" data-rerender="1">${acctOptions(m.accountId || '', '', cashAccounts())}</select>`, 'full')}
      ${fld('py-note', t('Note (optional)'), inp('py-note', 'note', m.note), 'full')}</div>
    <p class="note">${t('It is recorded as an expense in {account} and appears in Transactions. If you later import that account’s statement, the app flags the same payment as a possible duplicate.', { account: a ? esc(a.name) : '—' })}</p></div>
  <footer><button class="btn primary" data-a="pay-save">${l.pay === 'budget' ? t('Add expense') : t('Record payment')}</button><button class="btn ghost spacer" data-a="${d.back ? 'line-open' : 'close'}" data-id="${l.id}" data-ym="${m.ym}">${t('Cancel')}</button></footer>`;
}

// ---------- dashboard: what needs doing ----------
// Always about today, whatever month is being looked at: the bills still to pay in the next 30 days (each with its action), the card invoice,
// the savings still to hand out, the accountant's statements and last month's bills left without a payment.
// What is charged to a card is paid with the card's invoice, so the invoice is the row; a charge shows on its own only if it was given a day.
function todoCard() {
  const today = B().today, nowYm = ymOf(today), prevYm = addMonths(nowYm, -1);
  const bills = upcomingBills(B(), today, BCUR(), 30).filter(p => p.dueDate || !onCard(B(), p)), noDay = bills.filter(p => !p.dueDate).length;
  const inv = cardInvoices(B(), today, BCUR()).filter(c => !c.paid && c.amount > 0 && c.days <= 30).map(c => ({ card: true, id: c.accountId, name: t('{name}: invoice', { name: c.name }), dueDate: c.date, days: c.days, planned: c.amount, pay: c.estimate ? 'variable' : 'fixed', status: c.days < 0 ? 'late' : '' }));
  const rows = [...bills, ...inv].sort((x, y) => (x.dueDate || '9') < (y.dueDate || '9') ? -1 : (x.dueDate || '9') > (y.dueDate || '9') ? 1 : y.planned - x.planned);
  const total = sum(rows.map(p => p.planned)), shown = rows.slice(0, 6);
  const when = p => !p.dueDate ? `<span class="muted">${t('No day')}</span>` : p.status === 'late' || p.days < 0 ? `<span class="chip warn"><i></i>${t('Late')}</span>` : p.days === 0 ? `<span class="chip warn"><i></i>${t('Today')}</span>` : fmt.date(p.dueDate);
  // on a phone the action is the icon alone (its words stay for screen readers), so every row keeps to one line
  const btn = (ic, label, attrs) => `<button class="btn sm act" ${attrs} aria-label="${label}" data-tip="${label}">${icon(ic)}<span class="lbl" aria-hidden="true">${label}</span></button>`;
  const act = p => p.card ? btn('plus', t('Record the payment'), `data-a="card-pay" data-id="${p.id}"`)
    : !lineAcct(p) ? `<a class="btn sm ghost" href="#accounts">${t('Add account')}</a>`
      : p.pay === 'fixed' ? btn('check', t('Mark as paid'), `data-a="line-pay-now" data-id="${p.id}" data-ym="${p.ym}"`)
        : btn('plus', t('Record payment'), `data-a="line-pay" data-id="${p.id}" data-ym="${p.ym}"`);
  const bill = p => { const a = p.card ? null : lineAcct(p); return `<div class="li todo${p.dueDate ? '' : ' nod'}"><span class="when">${when(p)}</span><span class="grow"><b>${esc(p.name)}</b><small>${p.pay === 'variable' ? '≈ ' : ''}${fmt.money(p.planned, BCUR())}${a ? ' · ' + esc(a.name) : ''}</small></span>${act(p)}</div>`; };
  // the other things that wait: each is one row with the place where it is done
  const d = distribution(B(), nowYm), c = closeInfo(prevYm), past = reminders(B(), today, BCUR(), { bills: true, lead: 0, askDue: false }).find(r => r.kind === 'past'), other = [];
  if (past) other.push(`<div class="li todo"><span class="when"><span class="chip warn"><i></i>${fmt.month(past.ym, 'bare')}</span></span><span class="grow"><b>${tn(past.lines.length, '{n} bill from {month} has no payment', '{n} bills from {month} have no payment', { month: fmt.month(past.ym) })}</b><small>${fmt.money(past.amount, BCUR())} · ${esc(past.lines.slice(0, 3).map(x => x.name).join(', '))}</small></span>${btn('right', t('Open {month}', { month: fmt.month(past.ym, 'bare') }), `data-a="remind-month" data-ym="${past.ym}" data-route="plan"`)}</div>`);
  if (d.pending > 0) other.push(`<div class="li todo"><span class="when">${icon('flag')}</span><span class="grow"><b>${t('Savings for {month}', { month: fmt.month(nowYm) })}</b><small>${t('{amount} still to hand out', { amount: fmt.money(d.pending, BCUR()) })} · ${tn(d.rows.filter(r => r.pending > 0).length, '{n} goal', '{n} goals')}</small></span>${btn('right', t('Hand it out'), `data-a="remind-month" data-ym="${nowYm}" data-route="goals"`)}</div>`);
  if (c.total && !c.done) other.push(`<div class="li todo"><span class="when">${c.days < 0 ? `<span class="chip crit"><i></i>${t('Late')}</span>` : fmt.date(c.due)}</span><span class="grow"><b>${t('Statements to send')}</b><small>${fmt.month(c.ym)} · ${t('{sent} of {total} sent', { sent: c.sent, total: c.total })} · ${dueText(c)}</small></span><a class="btn sm act" href="#converter" aria-label="${t('Prepare statements')}">${icon('right')}<span class="lbl" aria-hidden="true">${t('Prepare statements')}</span></a></div>`);
  const n = rows.length + other.length;
  return `<section class="card" id="todo"><div class="card-h"><h2>${t('To do')}</h2>${info(t('The total is your unpaid bills and card invoices for the next 30 days, at their planned amounts. “≈” marks a bill whose amount changes from month to month. Savings to hand out are not in this total.'))}<span class="sub">${rows.length ? t('{amount} to pay in the next 30 days', { amount: fmt.money(total, BCUR()) }) : t('Next 30 days')}</span><a class="right btn sm ghost" href="#plan">${t('Open plan')}</a></div>
    <div class="card-b"><div class="list">${shown.map(bill).join('')}${other.join('') || (rows.length ? '' : `<div class="empty">${t('Nothing to pay or to do in the next 30 days.')}</div>`)}</div>
      ${rows.length > shown.length ? `<p class="note" style="margin-top:10px">${tn(rows.length - shown.length, 'And {n} more bill in the plan.', 'And {n} more bills in the plan.')}</p>` : ''}
      ${noDay ? `<div class="row" style="margin-top:10px"><span class="note grow" style="flex:1 1 180px">${tn(noDay, '{n} bill has no due day, so it has no date or reminder.', '{n} bills have no due day, so they have no date or reminder.')}</span><button class="btn sm ghost" data-a="due-days">${icon('calendar')}${t('Set due days')}</button></div>` : ''}
      ${B().plan.lines.length ? '' : `<div class="row" id="todo-empty" style="margin-top:10px"><span class="note grow" style="flex:1 1 180px">${t('No fixed costs yet. Add the bills you pay every month and each one shows here with its due day.')}</span><button class="btn sm" data-a="line-new">${icon('plus')}${t('New fixed cost')}</button><a class="btn sm ghost" href="#imports">${t('Bring a spreadsheet')}</a></div>`}</div></section>`;
}
