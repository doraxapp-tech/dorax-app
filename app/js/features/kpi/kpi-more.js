/* Dorax Finance — every figure tile of the app opens what it is made of (owner, 2026-10-11: "in Plan, the KPI cards should open the pop-up in the
   middle of the screen and explain the breakdown, like the ones in Resumen; do this with all the KPIs: it is easier for the user and for me to just
   click and understand everything without having to look for anything").
   The summary's five (and the company's four) live in features/dashboard/kpi-explain.js; Reports' tiles open those same cards. Here: the Plan, Goals,
   Investments and Recurring, on a computer and on a phone. Each card says the figure again, one sentence of what it is, and the sum that makes it
   (each part with its amount, then the total), worked out from the same data as the tile: the total is always the tile's figure.
   A tile is made pressable with kpiTap (a button over the whole tile, under its (i), which keeps its own press). Styles: css/components/tile-tap.css. */

/** The button that makes a tile open its card. */
const kpiTap = (k, label, from) => `<button class="kpi-open" data-a="kpi-open" data-k="${k}"${from ? ` data-from="${from}"` : ''} aria-haspopup="dialog" aria-label="${esc(String(label).replace(/<[^>]+>/g, '') + ': ' + t('what this figure is made of'))}"></button>`;
const kxNote = text => `<p class="kx-note">${text}</p>`;
const kxMuted = text => ` <span class="muted">· ${text}</span>`;
/** Rows and their total (the total row only when there is more than one part). */
const kxSum = (rows, total, cur, totalLabel) => rows.join('') + (rows.length > 1 ? kpiRow(totalLabel || t('Total'), total, cur, 'total') : '');
/** Bars by category: each category in its colour, against the largest. */
function kxByCat(items, cur) {
  const by = {}; items.forEach(x => { const k = x.categoryId || 'other'; by[k] = (by[k] || 0) + x.v; });
  const rows = Object.entries(by).filter(r => r[1] > 0).sort((a, c) => c[1] - a[1]); if (rows.length < 2) return '';
  return kpiSec(t('By category'), rows.map(([id, v]) => { const c = B().categories.find(x => x.id === id); return kpiBar(`<span class="dot" style="background:${c ? catColor(id) : 'var(--col-muted)'}"></span>${esc(c ? c.name : t('Other'))}`, v, rows[0][1], cur, c ? catColor(id) : 'var(--col-muted)'); }).join(''));
}
const kxBills = () => planProgress(B(), B().month, BCUR(), B().today).filter(x => x.bill);
const kxDue = x => x.dueDate ? (x.dueDate < S.today && !x.spent ? t('late since {date}', { date: fmt.date(x.dueDate) }) : t('due {date}', { date: fmt.date(x.dueDate) })) : t('no due day');
const kxFii = () => fiiSummary(S, S.today);
const kxRec = () => recurringList(S, S.today);

const KPI_MORE = {
  // ---------- the Plan ----------
  'plan-fixed': {
    title: () => t('Fixed costs, {month}', { month: fmt.month(B().month, 'bare') }),
    draw() {
      const cur = BCUR(), xs = kxBills().filter(x => x.planned > 0).sort((a, c) => c.planned - a.planned), total = sum(xs.map(x => x.planned));
      return { big: fmt.money(total, cur), say: t('What the fixed costs of {month} should cost, at their planned amounts. The spending limits are not in it.', { month: fmt.month(B().month) }),
        body: kpiSec(t('The bills'), kxSum(xs.map(x => kpiRow(esc(x.name) + kxMuted(kxDue(x)), x.planned, cur)), total, cur) || kxNote(t('No fixed costs planned for this month.')))
          + kxByCat(xs.map(x => ({ categoryId: x.categoryId, v: x.planned })), cur) };
    },
  },
  'plan-paid': {
    title: () => t('Paid so far'),
    draw() {
      const cur = BCUR(), all = kxBills(), xs = all.filter(x => x.spent > 0).sort((a, c) => c.spent - a.spent), total = sum(all.map(x => x.spent)), left = sum(all.map(x => x.toPay));
      return { big: fmt.money(total, cur), say: t('What has been paid this month for the fixed costs of the Plan, as recorded in your transactions.'),
        body: kpiSec(t('Paid'), kxSum(xs.map(x => kpiRow(esc(x.name) + kxMuted(x.spent === x.planned ? t('as planned') : t('planned {amount}', { amount: fmt.money(x.planned, cur) })), x.spent, cur)), total, cur) || kxNote(t('Nothing paid yet this month.')))
          + (left ? kpiSec(t('Still to pay'), kxNote(tn(all.filter(x => x.toPay > 0).length, '{amount} in {n} bill.', '{amount} in {n} bills.', { amount: `<b class="num">${fmt.money(left, cur)}</b>` }))) : '') };
    },
  },
  'plan-left': {
    title: () => t('Still to pay'),
    draw() {
      const cur = BCUR(), xs = kxBills().filter(x => x.toPay > 0).sort((a, c) => (a.dueDate || '9') < (c.dueDate || '9') ? -1 : 1), total = sum(xs.map(x => x.toPay));
      return { big: fmt.money(total, cur), say: t('The fixed costs of {month} that have no payment yet, at their planned amounts, by due date.', { month: fmt.month(B().month) }),
        body: kpiSec(t('The bills'), xs.map(x => `<div class="kx-row${x.status === 'late' ? ' late' : ''}"><span class="grow">${esc(x.name)}${kxMuted(kxDue(x))}</span><b class="num">${fmt.money(x.toPay, cur)}</b></div>`).join('') + (xs.length > 1 ? kpiRow(t('Total'), total, cur, 'total') : '') || kxNote(t('Every bill of the month is paid.'))) };
    },
  },
  'plan-net': {
    title: () => B().plan.lines.some(l => l.pay === 'budget' && planValue(B(), l, B().month) > 0) ? t('Left after bills and limits') : t('Income minus fixed costs'),
    draw() {
      const cur = BCUR(), ym = B().month, pt = planTotals(B(), ym), bills = sum(kxBills().map(x => x.planned)), limits = pt.expenses - bills, net = pt.income - pt.expenses;
      return { big: `<span class="${net < 0 ? 'neg' : ''}">${fmt.money(net, cur)}</span>`, say: t('The income your Plan sets for the month’s costs, minus the fixed costs and the spending limits of {month}. It is what has no job yet.', { month: fmt.month(ym) }),
        body: kpiSec(t('How it adds up'), kpiRow(t('Income for the month’s costs'), pt.income, cur) + kpiRow(t('Fixed costs'), -bills, cur, 'neg') + (limits ? kpiRow(t('Spending limits'), -limits, cur, 'neg') : '') + kpiRow(KPI_MORE['plan-net'].title(), net, cur, 'total'))
          + (net < 0 ? kxNote(t('The plan uses {amount} more than this income.', { amount: fmt.money(-net, cur) })) : '') };
    },
  },
  // ---------- Goals ----------
  'goal-saved': {
    title: () => t('Set aside in goals and funds'),
    draw() {
      // each currency apart, the book's own first (v224: a goal is in its account's currency; nothing is converted)
      const live = B().goals.filter(g => g.status !== 'archived'), all = live.map(g => ({ g, v: goalSaved(B(), g.id), c: gCur(g) })).filter(x => x.v), own = bookCur(B());
      const cs = [...new Set(all.map(x => x.c))].sort((a, b) => (b === own) - (a === own));
      const part = c => { const gs = all.filter(x => x.c === c).sort((a, k) => k.v - a.v); return kpiSec(cs.length > 1 ? t('By goal, in {currency}', { currency: curName(c) }) : t('By goal'), kxSum(gs.map(x => kpiRow(esc(x.g.name) + kxMuted(x.g.kind === 'fund' ? t('Fund') : x.g.target ? t('of {amount}', { amount: fmt.money(x.g.target, c) }) : t('Goal')), x.v, c)), sum(gs.map(x => x.v)), c)); };
      return { big: goalSumsBig(live, g => goalSaved(B(), g.id)), say: t('Everything put into your goals and funds so far, less what was taken out. Archived goals are not in it.'),
        body: cs.map(part).join('') || kxNote(t('Nothing set aside yet.')) };
    },
  },
  'goal-plan': {
    title: () => t('Plan for {month}', { month: fmt.month(B().month, 'bare') }),
    draw() {
      const cur = BCUR(), d = distribution(B(), B().month), xs = d.rows.filter(r => r.planned > 0).sort((a, c) => c.planned - a.planned);
      return { big: fmt.money(d.planned, cur), say: t('What your Plan sets aside for each goal and fund in {month}.', { month: fmt.month(B().month) }),
        body: kpiSec(t('By goal'), kxSum(xs.map(r => kpiRow(esc(r.goal.name), r.planned, cur)), d.planned, cur) || kxNote(t('Nothing planned for this month.')))
          + (d.income ? kpiSec(t('Against the income for savings'), `${meter(Math.min(100, d.planned * 100 / d.income), d.planned > d.income ? 'warn' : 'go')}${kxNote(t('{a} of {b}', { a: fmt.money(d.planned, cur), b: fmt.money(d.income, cur) }))}`) : '') };
    },
  },
  'goal-done': {
    title: () => t('Recorded in {month}', { month: fmt.month(B().month, 'bare') }),
    draw() {
      const cur = BCUR(), d = distribution(B(), B().month), xs = d.rows.filter(r => r.done).sort((a, c) => c.done - a.done);
      return { big: fmt.money(d.done, cur), say: t('What you have actually put into your goals and funds in {month}, less what you took out.', { month: fmt.month(B().month) }),
        body: kpiSec(t('By goal'), kxSum(xs.map(r => kpiRow(esc(r.goal.name) + (r.planned ? kxMuted(t('planned {amount}', { amount: fmt.money(r.planned, cur) })) : ''), r.done, cur)), d.done, cur) || kxNote(t('Nothing recorded yet this month.')))
          + (d.pending ? kpiSec(t('Still to set aside'), kxNote(t('{amount} of this month’s plan.', { amount: `<b class="num">${fmt.money(d.pending, cur)}</b>` }))) : '') };
    },
  },
  'goal-rest': {
    title: () => B().remainderLabel,
    draw() {
      const cur = BCUR(), d = distribution(B(), B().month);
      return { big: `<span class="${d.remainder < 0 ? 'neg' : ''}">${fmt.money(d.remainder, cur)}</span>`, say: t('The income your Plan sends to savings in {month}, minus what is planned for the goals and funds.', { month: fmt.month(B().month) }),
        body: kpiSec(t('How it adds up'), kpiRow(t('Income for savings'), d.income, cur) + kpiRow(t('Planned for goals and funds'), -d.planned, cur, 'neg') + kpiRow(esc(B().remainderLabel), d.remainder, cur, 'total'))
          + (d.remainder < 0 ? kxNote(t('The goals take {amount} more than this income.', { amount: fmt.money(-d.remainder, cur) })) : '') };
    },
  },
  // ---------- Investments ----------
  'fii-invested': {
    title: () => t('Invested'),
    draw() {
      const f = kxFii(), xs = [...f.held].sort((a, c) => c.cost - a.cost);
      return { big: fmt.money(f.cost, CUR), say: t('What you paid for the quotas you hold today, costs included: the quotas times their average price.'),
        body: kpiSec(t('By fund'), kxSum(xs.map(r => kpiRow(`${esc(r.ticker)}${kxMuted(t('{n} × {price}', { n: r.qty, price: fmt.money(r.avg, CUR) }))}`, r.cost, CUR)), f.cost, CUR)) };
    },
  },
  'fii-value': {
    title: () => t('Value at today’s prices'),
    draw() {
      const f = kxFii(), xs = [...f.held].sort((a, c) => c.value - a.value);
      return { big: fmt.money(f.value, CUR), say: t('What your quotas are worth at the prices you typed in: the quotas times the price now.'),
        body: kpiSec(t('By fund'), kxSum(xs.map(r => kpiRow(`${esc(r.ticker)}${kxMuted(t('{n} × {price}', { n: r.qty, price: fmt.money(r.price, CUR) }))}`, r.value, CUR)), f.value, CUR))
          + kpiSec(t('Against what you paid'), kpiRow(t('Invested'), f.cost, CUR) + kpiRow(t('Result'), f.gain, CUR, `total ${f.gain < 0 ? 'neg' : ''}`)) };
    },
  },
  'fii-income': {
    title: () => t('Income received in {year}', { year: S.today.slice(0, 4) }),
    draw() {
      const f = kxFii(), year = S.today.slice(0, 4), by = {}, months = {};
      S.fii.moves.filter(m => m.kind === 'income' && m.date.slice(0, 4) === year).forEach(m => { by[m.ticker] = (by[m.ticker] || 0) + m.amount; months[ymOf(m.date)] = (months[ymOf(m.date)] || 0) + m.amount; });
      const rows = Object.entries(by).sort((a, c) => c[1] - a[1]), ms = Object.entries(months).sort(), max = Math.max(0, ...ms.map(r => r[1]));
      return { big: fmt.money(f.receivedYear, CUR), say: t('The income your funds paid in {year}, as recorded in Investments.', { year }),
        body: kpiSec(t('By fund'), kxSum(rows.map(([tk, v]) => kpiRow(esc(tk), v, CUR)), f.receivedYear, CUR) || kxNote(t('No income recorded this year.')))
          + (ms.length > 1 ? kpiSec(t('By month'), ms.map(([ym, v]) => kpiBar(fmt.month(ym, 'bare'), v, max, CUR, 'var(--s1)')).join('')) : '')
          + kpiSec(t('Since the start'), kxNote(`<b class="num">${fmt.money(f.received, CUR)}</b>`)) };
    },
  },
  'fii-monthly': {
    title: () => t('Monthly income, last distribution'),
    draw() {
      const f = kxFii(), xs = f.held.filter(r => r.monthly).sort((a, c) => c.monthly - a.monthly);
      return { big: fmt.money(f.monthly, CUR), say: t('What your funds would pay in a month if each paid again what it paid last time per quota: the quotas times the last payment per quota.'),
        body: kpiSec(t('By fund'), kxSum(xs.map(r => kpiRow(`${esc(r.ticker)}${kxMuted(t('{n} × {price}', { n: r.qty, price: fmt.unit(r.unit, CUR) }))}`, r.monthly, CUR)), f.monthly, CUR) || kxNote(t('No distribution recorded yet.')))
          + (f.yieldPct === null ? '' : kpiSec(t('Its share'), kxNote(t('{pct} of the value a month', { pct: fmt.pct(f.yieldPct) })))) };
    },
  },
  // ---------- Recurring ----------
  'rec-count': {
    title: () => t('Recurring payments'),
    draw() {
      const xs = kxRec();
      return { big: String(xs.length), say: t('The payments that come back every month: found in your transactions (the same merchant in at least 3 of the last 4 months) or added by you.'),
        body: kpiSec(t('The payments'), xs.map(r => kpiRow(esc(r.merchant) + kxMuted(r.source === 'manual' ? t('added by you') : t('found in your transactions')), r.amount, CUR)).join('') || kxNote(t('None found yet.'))) };
    },
  },
  'rec-total': {
    title: () => t('Monthly total'),
    draw() {
      const xs = [...kxRec()].sort((a, c) => c.amount - a.amount), total = sum(xs.map(r => r.amount));
      return { big: fmt.money(total, CUR), say: t('What your recurring payments add up to in a month, at their usual amounts.'),
        body: kpiSec(t('The payments'), kxSum(xs.map(r => kpiRow(esc(r.merchant), r.amount, CUR)), total, CUR) || kxNote(t('None found yet.')))
          + kxByCat(xs.map(r => ({ categoryId: r.categoryId, v: r.amount })), CUR) };
    },
  },
  'rec-due': {
    title: () => t('Due in the next 30 days'),
    draw() {
      const xs = kxRec().filter(r => dayDiff(r.next, S.today) <= 30), total = sum(xs.map(r => r.amount));
      return { big: fmt.money(total, CUR), say: t('The recurring payments expected in the next 30 days, by date, at their usual amounts.'),
        body: kpiSec(t('By date'), kxSum(xs.map(r => kpiRow(esc(r.merchant) + kxMuted(fmt.date(r.next)), r.amount, CUR)), total, CUR) || kxNote(t('Nothing due in the next 30 days.'))) };
    },
  },
  'rec-next': {
    title: () => t('Next payment'),
    draw() {
      const xs = kxRec().slice(0, 5);
      return { big: xs[0] ? fmt.date(xs[0].next) : '—', say: xs[0] ? t('{name} is the next recurring payment, on {date}.', { name: esc(xs[0].merchant), date: fmt.date(xs[0].next) }) : t('No recurring payment found yet.'),
        body: xs.length ? kpiSec(t('The next ones'), xs.map(r => kpiRow(esc(r.merchant) + kxMuted(fmt.date(r.next)), r.amount, CUR)).join('')) : '' };
    },
  },
};
/** The card of one of these tiles: the figure, what it is, the sum. */
function kpiMoreDrawer(d) {
  const x = KPI_MORE[d.k].draw();
  return `<div class="body kx"><div class="kx-big num">${x.big}</div><p class="kx-say">${x.say}</p>${x.body}</div>
    <footer>${(x.go || []).map(([v, l], i) => `<button class="btn${i === 0 ? ' primary' : ''}" data-a="kpi-go" data-v="${v}">${l}${icon('right')}</button>`).join('')}<button class="btn ghost spacer" data-a="close">${t('Close')}</button></footer>`;
}
