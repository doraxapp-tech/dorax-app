/* Dorax Finance — the Plan on a computer, in the summary's look (v203; what the computer's pages are: features/desk/desk-kit.js).
   On the forest: what is still to pay this month, the next thing due with its button, and how what comes in is shared out (bills, savings, limits,
   what has no job yet). On the sheet: the month's payments (a strip of the month with the days things are due, the card's invoice among them; then
   the table, with what is charged to a card folded into one row, "See the N" to open it) and the spending limits (each a card with today's mark and
   what is left a day; a category with none, the way to give it one, with its average). The income and the year month by month stay one click away
   (plan-desk.view.js). The phone, the company and the previous look keep plan.view.js. */

/** The next thing due this month: the soonest unpaid bill with a day, or the card's invoice when it comes first. */
function dkPlanNext(bills, ym) {
  const bk = B(), cur = BCUR();
  const due = bills.filter(p => p.planned && !p.spent && p.dueDate).map(p => ({ p, date: p.dueDate, days: p.days }));
  const inv = cardInvoices(bk, bk.today, cur).filter(c => !c.paid && c.amount > 0 && ymOf(c.date) === ym).map(c => ({ c, date: c.date, days: c.days }));
  return [...due, ...inv].sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0)[0] || null;
}
/** The block at the right of the forest: the next thing due and its button; else what is missing (days) or that everything is paid. */
function dkPlanSide(bills, ym) {
  const bk = B(), cur = BCUR(), n = dkPlanNext(bills, ym), head = c => dkSideHead('dk-next-h', t('Next to fall due'), c);
  if (!n) {
    const open = bills.filter(p => p.planned && !p.spent);
    if (open.length) return `${head('')}<p class="dk-say">${tn(open.length, '{n} bill still to pay has no due day.', '{n} bills still to pay have no due day.')}</p><div class="dk-acts"><button class="btn" data-a="due-days">${icon('calendar')}${t('Set due days')}</button></div>`;
    return `${head(dkChip(t('All paid'), 'go'))}<p class="dk-say">${t('Every bill of the month is paid.')}</p>`;
  }
  const kind = n.days < 0 ? 'neg' : n.days <= TODO_SOON ? 'warn' : '';
  if (n.c) {
    const a = acct(n.c.accountId), from = a && cardDebitAcct(a);
    return `${head(dkChip(esc(dkDays(n.days)), kind))}<div class="dk-next">${dkMark(a)}<div class="dk-next-t"><b>${esc(t('{name}: invoice', { name: n.c.name }))}</b><span>${esc(t('Due on {date}', { date: fmt.date(n.c.date) }))}${from ? ' · ' + esc(t('from {name}', { name: from.name })) : ''}</span></div><b class="dk-next-v num">${n.c.estimate ? '≈ ' : ''}${fmt.money(n.c.amount, cur)}</b></div>
      <div class="dk-acts"><button class="btn primary" data-a="card-pay" data-id="${n.c.accountId}">${icon('plus')}${t('Record the payment')}</button></div>`;
  }
  const p = n.p, a = lineAcct(p);
  const btn = p.pay === 'fixed' ? `<button class="btn primary" data-a="line-pay-now" data-id="${p.id}" data-ym="${ym}">${icon('check')}${t('Mark as paid')}</button>` : `<button class="btn primary" data-a="line-pay" data-id="${p.id}" data-ym="${ym}">${icon('plus')}${t('Record payment')}</button>`;
  return `${head(dkChip(esc(dkDays(n.days)), kind))}<div class="dk-next">${dkMark(a)}<div class="dk-next-t"><b>${esc(p.name)}</b><span>${esc(t('Due on {date}', { date: fmt.date(p.dueDate) }))}${a ? ' · ' + esc(t('from {name}', { name: a.name })) : ''}</span></div><b class="dk-next-v num">${p.pay === 'fixed' ? '' : '≈ '}${fmt.money(p.planned, cur, { trim: true })}</b></div>
    <div class="dk-acts">${a ? btn : `<a class="btn" href="#accounts">${t('Add account')}</a>`}</div>`;
}
/** The band: how what comes in this month is shared out, as one bar. */
function dkPlanShare(ym) {
  const bk = B(), cur = BCUR(), mp = monthPlan(bk, ym), month = yrMonth(ym);
  const right = mp.income ? `<span class="dk-band-r"><b class="num">${fmt.money(mp.income, cur, { trim: true })}</b>${dkLink('data-a="plan-income"', t('Change income'))}</span>` : '';
  if (!mp.income) return dkBand('dk-share-h', t('How what comes in {month} is shared', { month }), right, `<div class="dk-none"><p class="dk-say">${t('Put in what comes in each month and Dorax shows how much of it has no job yet.')}</p><button class="btn primary" data-a="plan-income">${icon('plus')}${t('Add income')}</button></div>`);
  const pct = v => fmt.pct(Math.round(v * 100 / mp.income)), lines = linesLive(bk, ym), val = l => planValue(bk, l, ym);
  const nBills = lines.filter(l => l.pay !== 'budget' && val(l) > 0).length, lims = lines.filter(l => l.pay === 'budget' && val(l) > 0).map(l => l.name), nGoals = bk.goals.filter(g => goalLive(g) && goalPlan(g, ym) > 0).length;
  const limNames = lims.length > 2 ? t('{list} and {n} more', { list: lims.slice(0, 2).map(esc).join(', '), n: lims.length - 2 }) : lims.map(esc).join(lims.length === 2 ? ' ' + t('and') + ' ' : '');
  const parts = [
    { label: t('Fixed bills'), v: mp.bills, color: 'var(--lk-lime)', sub: `${pct(mp.bills)} · ${tn(nBills, '{n} payment', '{n} payments')}` },
    { label: t('Savings and goals'), v: mp.saving, color: 'var(--lk-mint)', sub: `${pct(mp.saving)}${nGoals ? ' · ' + tn(nGoals, '{n} goal or fund', '{n} goals and funds') : ''}` },
    { label: t('Spending limits'), v: mp.limits, color: 'var(--lk-soft-2)', sub: `${pct(mp.limits)}${limNames ? ' · ' + limNames : ''}` },
    mp.free >= 0 ? { label: t('Not assigned yet'), v: mp.free, color: 'ring', sub: `${pct(mp.free)} · ${t('for whatever comes up')}` }
      : { label: t('Over the income'), v: -mp.free, color: 'ring', neg: true, sub: t('The plan uses more than comes in') },
  ].filter(x => x.v > 0 || x.label === t('Fixed bills'));
  return dkBand('dk-share-h', t('How what comes in {month} is shared', { month }), right, dkSplit(parts, cur));
}
/** The strip of the month: the day each bill is due (filled), the card's invoice (an outline), what is paid (faded), today. */
function dkPlanStrip(bills, ym) {
  const bk = B(), cur = BCUR(), D = daysInMonth(ym), here = ym === ymOf(bk.today), today = here ? +bk.today.slice(8) : 0;
  const pos = d => Math.round((d - 1) * 1000 / Math.max(1, D - 1)) / 10;
  const marks = {};
  const add = (day, name, v, kind, paid) => { const k = String(day); (marks[k] || (marks[k] = { day, items: [] })).items.push({ name, v, kind, paid }); };
  bills.filter(p => p.planned && p.dueDate && ymOf(p.dueDate) === ym).forEach(p => add(+p.dueDate.slice(8), p.name, p.planned, 'bill', !!p.spent));
  cardInvoices(bk, bk.today, cur).filter(c => c.amount > 0 && ymOf(c.date) === ym).forEach(c => add(+c.date.slice(8), t('{name}: invoice', { name: c.name }), c.amount, 'card', !!c.paid));
  const list = Object.values(marks).sort((a, b) => a.day - b.day);
  if (!list.length) return '';
  const rows = [[], []]; list.forEach((m, i) => rows[i % 2].push(m));
  const label = (m, row, next) => {
    const p = pos(m.day), right = p > 78, room = next ? pos(next.day) - p : 100 - p, all = m.items, paid = all.every(x => x.paid), card = all.every(x => x.kind === 'card');
    const name = all.length > 1 ? `${all[0].name} ${t('and {n} more', { n: all.length - 1 })}` : all[0].name, amount = fmt.money(sum(all.map(x => x.v)), cur);
    const say = `${String(m.day).padStart(2, '0')} · ${name} · ${amount}${paid ? ' · ' + t('Paid') : ''}`;
    return `<span class="dk-m ${card ? 'inv' : 'bill'}${paid ? ' paid' : ''}" style="left:${p}%" aria-hidden="true"></span>
      <span class="dk-ml ${row ? 'down' : 'up'}${right ? ' end' : ''}${paid ? ' paid' : ''}" style="${right ? `right:calc(${100 - p}% - 7px)` : `left:calc(${p}% - 7px);max-width:calc(${room}% - 10px)`}" title="${esc(say)}"><b class="num">${String(m.day).padStart(2, '0')} · ${esc(name)}</b><span class="num">${paid ? icon('check') : ''}${amount}</span></span>`;
  };
  const say = list.map(m => `${m.day}: ${m.items.map(x => `${x.name} ${fmt.money(x.v, cur)}${x.paid ? ' (' + t('Paid') + ')' : ''}`).join(', ')}`).join('; ');
  return `<div class="dk-strip" role="img" aria-label="${esc((here ? t('Today is day {d}.', { d: today }) + ' ' : '') + say)}">
      <span class="dk-track"></span>${here ? `<span class="dk-past" style="width:${pos(today)}%"></span><span class="dk-today" style="left:${pos(today)}%"></span><span class="dk-today-l" style="left:${pos(today)}%">${t('Today')}</span>` : ''}
      ${today > 4 || !here ? `<span class="dk-end l num">1 ${esc(mon(+ym.slice(5) - 1).toLowerCase())}</span>` : ''}<span class="dk-end r num">${D} ${esc(mon(+ym.slice(5) - 1).toLowerCase())}</span>
      ${rows.map((r, row) => r.map((m, i) => label(m, row, r[i + 1])).join('')).join('')}</div>`;
}
/** The row of the bills that have no due day. */
function dkPlanNoDay(bills) {
  const no = bills.filter(p => p.planned && !p.dueDate && lineNeedsDue(p));
  if (!no.length) return '';
  const names = no.map(p => p.name), list = names.length > 3 ? t('{list} and {n} more', { list: names.slice(0, 3).map(esc).join(', '), n: names.length - 3 }) : names.map(esc).join(names.length > 1 ? ', ' : '');
  return `<div class="dk-noday">${dkPill(esc(tn(no.length, '{n} with no day', '{n} with no day')), 'warn')}<span>${tn(no.length, '{list} has no due day, so you get no reminder.', '{list} have no due day, so you get no reminder.', { list })}</span><button class="btn" data-a="due-days">${icon('calendar')}${t('Set due days')}</button></div>`;
}
/** The payments of the month: the strip, then the table, grouped by category; a category charged whole to a card is one row that opens. */
function dkPlanPayments(bills, ym) {
  const bk = B(), cur = BCUR(), fold = UI.dkFold || (UI.dkFold = {});
  const rank = p => p.bill && !p.spent ? 0 : p.bill ? 2 : 1, key = p => p.dueDate || '9', order = (a, b) => rank(a) - rank(b) || (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0);
  const last = p => { const x = linePayments(bk, p, ym, cur)[0]; return x ? x.t.date : null; };
  const cats = bk.categories.filter(c => bills.some(p => p.categoryId === c.id));
  const units = [];
  for (const c of cats) {
    const xs = bills.filter(p => p.categoryId === c.id).sort(order), onCardAll = xs.every(p => onCard(bk, p) && !p.dueDate), open = !!fold[c.id];
    if (onCardAll) units.push({ c, xs, folded: !open, group: true }); else xs.forEach(p => units.push({ c, xs, p }));      // folded or open, the card's costs stay on one page
  }
  const pp = paged('paylist', units);
  const head = (c, xs, card, folded) => {
    const quick = xs.filter(p => p.pay === 'fixed' && !p.spent && p.planned), withPlan = xs.filter(p => p.planned), paid = withPlan.filter(p => p.spent).length;
    const cards = [...new Set(xs.map(p => acct(p.accountId)).filter(a => a && a.type === 'credit').map(a => a.name))];
    const sub = card ? t('{amount} · {n} on {card}, paid with its invoice', { amount: fmt.money(sum(withPlan.map(p => p.planned)), cur), n: withPlan.length, card: cards.join(', ') || t('the card') }) : `${fmt.money(sum(withPlan.map(p => p.planned)), cur)} · ${tn(withPlan.length, '{n} fixed cost', '{n} fixed costs')}`;
    const btn = card ? `<button class="btn" data-a="dk-fold" data-cat="${c.id}" aria-expanded="${!folded}">${folded ? t('See the {n}', { n: xs.length }) : t('Hide')}${icon(folded ? 'down' : 'up')}</button>`
      : quick.length > 1 ? `<button class="btn" data-a="group-pay-now" data-cat="${c.id}" data-ym="${ym}">${icon('check')}${t('Mark {n} as paid', { n: quick.length })}</button>` : '';
    return `<tr class="grp"><td colspan="3"><div class="dk-who">${catGlyph(c)}<div><b>${esc(c.name)}</b><small class="num">${esc(sub)}</small></div></div></td>
      <td>${withPlan.length ? dkPill(esc(t('{a} of {b} paid', { a: paid, b: withPlan.length })), paid === withPlan.length ? 'mint' : '') : ''}</td><td class="r">${btn}</td></tr>`;
  };
  const row = p => {
    const a = lineAcct(p), due = p.dueDate ? `<span class="num">${fmt.date(p.dueDate)}</span>` : onCard(bk, p) ? `<span class="dk-mute">${t('On the card')}</span>` : `<button class="linkbtn dk-setday" data-a="due-days" data-id="${p.id}">${t('Set day')}</button>`;
    return `<tr class="${p.spent ? 'done' : ''}${flashed(p.id)}"><td><div class="dk-who">${dkMark(a)}<div><button class="linkbtn dk-name" data-a="line-open" data-id="${p.id}" data-ym="${ym}">${esc(p.name)}</button><small>${a ? esc(a.name) : t('No account')}${p.pay === 'fixed' ? '' : ' · ' + payKindShort(p.pay)}</small></div></div></td>
      <td>${due}</td><td class="r"><b class="num">${p.pay === 'fixed' ? '' : '≈ '}${fmt.money(p.planned, cur)}</b>${p.spent && p.spent !== p.planned ? `<small class="num">${t('Paid')} ${fmt.money(p.spent, cur)}</small>` : ''}</td><td>${payChip(p, p.spent ? last(p) : null)}</td><td class="r">${payAction(p)}</td></tr>`;
  };
  let out = '', prev = null;
  for (const u of pp.rows) {
    if (u.group) { out += head(u.c, u.xs, true, u.folded) + (u.folded ? '' : u.xs.map(row).join('')); prev = u.c.id; continue; }
    if (u.c.id !== prev) { out += head(u.c, u.xs, false, false); prev = u.c.id; }
    out += row(u.p);
  }
  const strip = dkPlanStrip(bills, ym), noDay = dkPlanNoDay(bills);
  return dkCard(`${strip || noDay ? `<div class="dk-card-top">${strip}${noDay}</div>` : ''}
    <div class="dk-tbl-wrap"><table class="dk-tbl paylist"><thead><tr><th scope="col">${t('Fixed cost')}</th><th scope="col">${t('Due')}</th><th scope="col" class="r">${t('Plan')}</th><th scope="col">${t('Status')}</th><th scope="col"><span class="sr">${t('Actions')}</span></th></tr></thead><tbody>${out}</tbody></table></div>${pp.html}`);
}
/** The spending limits, each a card: what it took of its cap, today across the bar, what is left a day; a category with none, the way to give one. */
function dkPlanLimits() {
  const bk = B(), cur = BCUR(), by = limNow(), here = ymOf(bk.today) === limYm(), day = +bk.today.slice(8), D = daysInMonth(limYm()), left = D - day + 1;
  const set = Object.values(by).flatMap(i => i.set.map(x => ({ ...x, cat: i.cat })));
  const tile = x => {
    const lv = limLevel(x), chip = x.left < 0 ? dkPill(esc(t('{amount} over', { amount: limMoney(-x.left) })), 'crit') : limFast(x) ? dkPill(esc(t('Faster than the month')), 'warn') : dkPill(esc(t('On track')), 'mint');
    const per = x.left > 0 && left > 0 ? Math.floor(x.left / left / 100) * 100 : 0;
    const say = x.left < 0 ? t('{over} over the limit', { over: limMoney(-x.left) }) : per ? t('{left} left · about {day} a day', { left: limMoney(x.left), day: limMoney(per) }) : t('{left} left', { left: limMoney(x.left) });
    return `<button class="dk-tile dk-lim" data-a="limit-open" data-cat="${x.cat.id}" data-sub="${limKey(x)}">
        <span class="dk-tile-h">${limDot(x.cat, x.sub)}<span class="dk-tile-n"><b>${esc(limLabel(x))}</b>${x.sub ? `<small>${esc(x.cat.name)}</small>` : ''}</span></span>
        <span class="dk-tile-v"><b class="num">${fmt.money(x.spent, cur)}</b> <span class="num">${esc(t('of {amount}', { amount: limMoney(x.planned) }))}</span></span>
        <span class="dk-lim-bar">${dkBar(Math.min(100, x.pct), lv === 'crit' ? 'crit' : lv === 'warn' ? 'warn' : '')}${here ? `<i class="dk-lim-today" style="left:${limPace()}%"></i>` : ''}</span>
        <span>${chip}</span><span class="dk-tile-s num">${say}</span></button>`;
  };
  const free = Object.values(by).filter(i => limUsable(i).length && !i.set.length).map(i => {
    const tg = limitDefault(limUsable(i), bk, limYm()), avg = tg && limitAverage(bk, tg, limYm(), cur);
    return `<button class="dk-add" data-a="limit-open" data-cat="${i.cat.id}">${limDot(i.cat)}<b>${esc(t('Set a limit on {name}', { name: i.cat.name }))}</b>${avg ? `<span class="num">${esc(t('You spend about {amount} a month', { amount: limMoney(avg.amount) }))}</span>` : ''}</button>`;
  });
  const planned = sum(set.map(x => x.planned)), spent = sum(set.map(x => x.spent));
  const sub = set.length ? `${esc(t('{spent} of {limit} spent', { spent: limMoney(spent), limit: limMoney(planned) }))}${here ? ' · ' + esc(t('day {d} of {n}', { d: day, n: D })) : ''}` : t('A monthly cap for what you spend in a category, apart from the bills.');
  return dkSec('limits-card', t('Spending limits'), sub, set.length ? `<button class="btn" data-a="plan-guide">${icon('gauge')}${t('Plan again')}</button>` : '',
    `${set.length ? '' : limInvite()}${set.length || free.length ? dkGrid(set.map(tile).join('') + free.join(''), 200) : ''}`, info(t('A monthly cap for what you spend in a category, apart from the bills. The line across each bar is today: past it, you are spending faster than the month goes by.')));
}
function dkPlan() {
  const bk = B(), ym = bk.month, cur = BCUR(), here = ym === ymOf(bk.today);
  const bills = planProgress(bk, ym, cur, bk.today).filter(p => p.bill && (p.planned || p.spent));
  const withPlan = bills.filter(p => p.planned), toPay = sum(bills.map(p => p.toPay)), total = sum(withPlan.map(p => p.planned)), paid = sum(bills.map(p => p.spent)), nPaid = withPlan.filter(p => p.spent).length;
  const chips = withPlan.length ? `${dkChip(esc(t('Paid {amount} · {a} of {b}', { amount: fmt.money(paid, cur), a: nPaid, b: withPlan.length })), '', 'plan-paid')}${dkChip(esc(t('Of {amount} in fixed costs', { amount: fmt.money(total, cur) })), '', 'plan-fixed')}${toPay ? '' : dkChip(esc(t('All paid')), 'go')}`
    : dkChip(esc(t('Nothing planned for {month}', { month: yrMonth(ym) })));
  const side = withPlan.length ? (here ? dkPlanSide(bills, ym) : '') : `${dkSideHead('dk-next-h', t('Your fixed costs'))}<p class="dk-say">${t('Add your fixed costs once; every month they appear here to be marked as paid.')}</p><div class="dk-acts"><button class="btn primary" data-a="line-new">${icon('plus')}${t('New fixed cost')}</button></div>`;
  const hero = dkHero({ label: t('Still to pay in {month}', { month: yrMonth(ym) }), big: fmt.money(toPay, cur), k: withPlan.length ? 'plan-left' : '', chips, side, sideId: side ? 'dk-next-h' : '', band: dkPlanShare(ym) });
  const pays = withPlan.length || bills.length ? dkSec('paylist', t('Payments of {month}', { month: yrMonth(ym) }), t('What goes out of your accounts this month, by date'), `<button class="btn" data-a="plan-year-open">${icon('grid')}${t('The year, month by month')}</button>`, dkPlanPayments(bills, ym), hint('planPayments')) : payList(ym);
  return `${companyNote()}${hero}${dkSheet(`${pays}${dkPlanLimits()}`)}`;
}
