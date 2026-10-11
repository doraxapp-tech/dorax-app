/* Dorax Finance — what a figure of the summary is made of (owner, 2026-10-09: "when I click the KPI cards in Resumen, open a card in the middle of
   the screen that expands the information so the person understands the numbers shown; to see more, they can go to Reports").

   Each tile of the summary opens a card in the middle of the screen (a sheet from the bottom on a phone, like every panel): the figure again, one
   sentence of what it is, the sum that makes it (each part with its amount, then the total), what it is compared with, and the way to the page that
   goes further (Reports; for the bills still to pay, the Plan; for the balance, Accounts & savings too). Every amount is worked out from the same
   transactions as the tile, never estimated. The household's five tiles and the company's four. */

const KPI_KINDS = ['net', 'income', 'spending', 'left', 'unpaid', 'transfers'];
/** The tile's name, which is also the card's title. */
function kpiTitle(k, co) {
  return ({ net: t('Household net balance'), income: co ? t('Received') : t('Income'), spending: co ? t('Costs') : t('Spending'), left: co ? t('Result') : t('Left over'), unpaid: t('Still to pay'), transfers: t('Transfers out') })[k] || '';
}
/** A row of a sum: what it is, and its amount; a total row closes it. */
const kpiRow = (label, amount, cur, cls) => `<div class="kx-row${cls ? ' ' + cls : ''}"><span class="grow">${label}</span><b class="num">${fmt.money(amount, cur)}</b></div>`;
/** A bar of one part against the largest, in a colour of its own (a category wears its colour, as everywhere in the app). */
const kpiBar = (label, amount, max, cur, col, act) => { const inner = `<span class="kx-name">${label}</span><span class="kx-track"><i style="width:${max > 0 ? Math.max(2, amount * 100 / max) : 0}%;background:${col || 'var(--ink-3)'}"></i></span><b class="num">${fmt.money(amount, cur, { round: true })}</b>`;
  return act ? `<button class="kx-bar" ${act}>${inner}</button>` : `<div class="kx-bar">${inner}</div>`; };
const kpiSec = (title, body) => body ? `<div class="kx-sec"><h3>${title}</h3>${body}</div>` : '';

function kpiDrawer(d) {
  const x = dashParts(), { co, b, cur, ym, inProgress, m, p, vsLabel, unpaid } = x, k = d.k, month = fmt.month(ym);
  const change = (now, was, goodUp) => { if (!was) return ''; const pc = Math.round((now - was) * 1000 / Math.abs(was)) / 10; return `<p class="kx-vs ${pc === 0 ? '' : (pc > 0) === goodUp ? 'up' : 'down'}">${pc > 0 ? '▲' : pc < 0 ? '▼' : '•'} ${fmt.pct(Math.abs(pc))} ${esc(vsLabel)} <span class="muted">(${fmt.money(was, cur)})</span></p>`; };
  let big = '', say = '', body = '', go = [['reports', t('See more in Reports')]];
  if (k === 'net' && !co) {
    // what is had today: each account (a card with its own name), then what is owed on cards; and how it moved since the month began
    const mine = personal().filter(a => a.currency === cur), bal = (a, at) => accountBalance(S, a.id, at || S.today), net = sum(mine.map(a => bal(a)));
    const kept = mine.filter(a => a.type !== 'credit' && a.type !== 'savings' && !a.savingsOf), savingsAccts = mine.filter(a => a.type === 'savings'), spend = mine.filter(a => a.savingsOf), owed = mine.filter(a => a.type === 'credit');
    const name = a => esc(cardMain(a).name);
    const startEnd = isoDate(addMonths(ymOf(S.today), -1), 31), was = sum(mine.map(a => bal(a, startEnd)));
    big = fmt.money(net, cur);
    say = t('Everything in your household accounts in {cur} today, less what is owed on your cards. The company’s accounts and other currencies are not in it.', { cur });
    body = kpiSec(t('How it adds up'), kept.filter(a => bal(a)).map(a => kpiRow(name(a), bal(a), cur)).join('')
        + spend.filter(a => bal(a)).map(a => kpiRow(`${name(a)} <span class="muted">· ${t('Debit')}</span>`, bal(a), cur)).join('')
        + savingsAccts.filter(a => bal(a)).map(a => kpiRow(`${name(a)} <span class="muted">· ${t('Savings')}</span>`, bal(a), cur)).join('')
        + owed.filter(a => bal(a)).map(a => kpiRow(`${esc(a.name)} <span class="muted">· ${bal(a) < 0 ? t('owed on the card') : t('in your favour on the card')}</span>`, bal(a), cur, bal(a) < 0 ? 'neg' : '')).join('')
        + kpiRow(t('Household net balance'), net, cur, 'total'))
      + kpiSec(t('Since the month began'), `<p class="kx-note">${t('{change} since {date}, when it was {amount}.', { change: `<b class="num ${net - was < 0 ? 'neg' : 'pos'}">${fmt.money(net - was, cur, { sign: true })}</b>`, date: fmt.date(startEnd), amount: fmt.money(was, cur) })}</p>`);
    go = [['accounts', t('See Accounts & savings')], ['reports', t('See more in Reports')]];
  } else if (k === 'income') {
    // what came in this month, from where, against what was planned
    const planned = payTotal(b, ym), by = {};
    b.transactions.filter(t2 => t2.type === 'income' && inScope(b, t2, ym, cur)).forEach(t2 => { const key = (t2.subcategoryId && catName(t2.subcategoryId)) || (t2.categoryId && catName(t2.categoryId)) || t2.merchant || t('Other'); by[key] = (by[key] || 0) + t2.amount; });
    const src = Object.entries(by).filter(r => r[1] > 0).sort((a, c) => c[1] - a[1]), max = src.length ? src[0][1] : 0;
    big = fmt.money(m.income, cur);
    say = co ? t('Money that came into the company’s accounts in this currency in {month}. Transfers between your own accounts are not counted.', { month }) : t('Money that came into your household accounts in {month}. Transfers between your own accounts and the company’s accounts are not counted.', { month });
    body = kpiSec(t('Where it came from'), src.slice(0, 6).map(([n, v]) => kpiBar(esc(n), v, max, cur, 'var(--s1)')).join('') || `<p class="kx-note">${t('Nothing came in yet this month.')}</p>`)
      + (planned ? kpiSec(t('Against the plan'), `${meter(Math.min(100, m.income * 100 / planned), 'go')}<p class="kx-note">${t('{a} of {b} planned', { a: fmt.money(m.income, cur), b: fmt.money(planned, cur) })}${m.income < planned ? ' · ' + t('{amount} still to come', { amount: fmt.money(planned - m.income, cur) }) : ''}</p>`) : '')
      + kpiSec(t('Compared'), change(m.income, p.income, true));
  } else if (k === 'spending') {
    // what went out, on what, against the plan and the month before
    const { byCat } = categoryTotals(b, ym, cur), known = id => b.categories.find(c => c.id === id);
    const cats = Object.keys(byCat).filter(id => byCat[id] > 0).map(id => ({ id, name: known(id) ? known(id).name : (co ? t('Not filed yet') : t('Uncategorized')), v: byCat[id], col: known(id) ? catColor(id) : 'var(--col-muted)' })).sort((a, c) => c.v - a.v);
    const planned = b.plan && b.plan.lines ? planTotals(b, ym).expenses : 0, days = inProgress ? +S.today.slice(8) : daysInMonth(ym);
    big = fmt.money(m.expenses, cur);
    say = co ? t('What the company paid in {month} from its accounts in this currency, pending payments included. Transfers are not costs.', { month }) : t('What went out of your household accounts in {month}, pending expenses included. Transfers and money put into goals are not spending.', { month });
    body = kpiSec(co ? t('By group') : t('By category'), cats.slice(0, 6).map(c => kpiBar(`<span class="dot" style="background:${c.col}"></span>${esc(c.name)}`, c.v, cats[0].v, cur, c.col, `data-a="filter-cat" data-cat="${esc(known(c.id) ? c.id : 'none')}"`)).join('') || `<p class="kx-note">${t('Nothing went out yet this month.')}</p>`)
      + (planned ? kpiSec(t('Against the plan'), `${planMeter(m.expenses, planned)}<p class="kx-note">${t('{a} of {b} planned', { a: fmt.money(m.expenses, cur), b: fmt.money(planned, cur) })}</p>`) : '')
      + kpiSec(t('Compared'), `${change(m.expenses, p.expenses, false)}${m.expenses ? `<p class="kx-note">${t('{amount} a day on average, over {n} days.', { amount: fmt.money(Math.round(m.expenses / Math.max(1, days)), cur), n: days })}</p>` : ''}`);
  } else if (k === 'left') {
    // the subtraction itself, its share of what came in, and what was left in the months already closed
    const closed = repMonths(b, cur, addMonths(ymOf(S.today), -1), 6).filter(r => r[1].count), avg = closed.length ? Math.round(sum(closed.map(r => r[1].saved)) / closed.length) : null;
    big = m.income || m.expenses ? fmt.money(m.saved, cur) : '—';
    say = co ? t('What the company received minus what it cost in {month}, before anything you take out for yourself.', { month }) : t('Your income minus your spending in {month}. Money put into goals is not spending, so it is part of this figure.', { month });
    body = kpiSec(t('How it adds up'), kpiRow(kpiTitle('income', co), m.income, cur) + kpiRow(kpiTitle('spending', co), -m.expenses, cur, 'neg') + kpiRow(kpiTitle('left', co), m.saved, cur, 'total'))
      + kpiSec(t('Its share'), m.rate === null ? `<p class="kx-note">${t('Nothing came in yet, so there is no share to give.')}</p>` : `${meter(Math.max(0, Math.min(100, m.rate)), m.rate < 0 ? 'warn' : 'go')}<p class="kx-note">${co ? t('{pct} of what was received was not spent.', { pct: fmt.pct(m.rate) }) : t('{pct} of your income was not spent.', { pct: fmt.pct(m.rate) })}</p>`)
      + (avg === null ? '' : kpiSec(t('In the months before'), `<p class="kx-note">${tn(closed.length, 'In the last month: {amount}.', 'On average over the last {n} months: {amount} a month.', { amount: `<b class="num">${fmt.money(avg, cur)}</b>` })}</p>`));
  } else if (k === 'unpaid' && !co) {
    // the bills of the month with no payment yet, by date
    const xs = [...unpaid].sort((a, c) => (a.dueDate || '9') < (c.dueDate || '9') ? -1 : 1), total = sum(xs.map(z => z.toPay));
    big = xs.length ? fmt.money(total, cur) : '—';
    say = t('The fixed costs of {month} that have no payment yet, at their planned amounts. Card invoices are not in this figure.', { month });
    body = kpiSec(t('The bills'), xs.map(z => `<div class="kx-row${z.dueDate && z.dueDate < S.today ? ' late' : ''}"><span class="grow">${esc(z.name)} <span class="muted">· ${z.dueDate ? (z.dueDate < S.today ? t('late since {date}', { date: fmt.date(z.dueDate) }) : t('due {date}', { date: fmt.date(z.dueDate) })) : t('no due day')}</span></span><b class="num">${fmt.money(z.toPay, cur)}</b></div>`).join('') + (xs.length > 1 ? kpiRow(t('Total'), total, cur, 'total') : '') || `<p class="kx-note">${t('Every bill of the month is paid.')}</p>`);
    go = [['plan', t('See the Plan')]];
  } else if (k === 'transfers' && co) {
    big = fmt.money(x.sent, cur);
    say = t('Transfers out of the company’s accounts in this currency in {month}, such as what you paid yourself or changed into another currency. They are not costs.', { month });
    body = kpiSec(t('How it adds up'), kpiRow(t('Went out by transfer'), x.sent, cur) + kpiRow(t('Came in by transfer'), x.arrived, cur));
  }
  return `<div class="body kx"><div class="kx-big num">${big}</div><p class="kx-say">${say}</p>${body}</div>
    <footer>${go.map(([v, l], i) => `<button class="btn${i === 0 ? ' primary' : ''}" data-a="kpi-go" data-v="${v}">${l}${icon('right')}</button>`).join('')}<button class="btn ghost spacer" data-a="close">${t('Close')}</button></footer>`;
}
const KPI_ACTIONS = {
  /** A tile of the summary pressed: its card in the middle of the screen. */
  'kpi-open'(ds) { if (!KPI_KINDS.includes(ds.k)) return; UI.drawer = { kind: 'kpi', k: ds.k, pop: true, title: kpiTitle(ds.k, inCompany()) }; renderOverlay(); },
  /** The way further: Reports (on a phone, the view that holds this figure), the Plan, or Accounts & savings. */
  'kpi-go'(ds) { const k = UI.drawer && UI.drawer.k; UI.drawer = null; renderOverlay(); if (ds.v === 'reports') UI.repView = k === 'income' || k === 'left' ? 'in' : 'out'; navigate(ds.v); },
};
