/* Dorax Finance — Accounts & savings on a computer, in the summary's look (v203; owner, 2026-10-12: "cuentas y ahorros en ordenador está
   desperdiciando espacio con las tarjetas, quítalas de ahí, muestra información más relevante para el usuario"; on the proposal: "esta muy apretado
   todo aquí", "Puedes quitar esto y poner aquí información tipo 'Cuánto duran tus ahorros'", "demasiada info"; then "deja todo y publica todo").
   On the forest: the household's net balance and how it moved, how long the savings last (the days of freedom against 30 days, 3 months, 6 months
   and a year), and how it is shared: what there is to spend, what is saved, what is owed on cards. On the sheet: every account in one table (what
   it has today, what goes out of it this month by the Plan and the invoices, what it keeps after paying, its last statement), a card's row under the
   account it is paid from; then where the savings are, goal by goal, and each credit card's invoice with its button. A row opens the account's panel.
   The phone, the company and the previous look keep accounts.view.js. */

/** How long ago a day was, in words: "today", "1 day ago", "12 days ago". */
const dkAgo = d => { const n = Math.round((Date.parse(B().today) - Date.parse(d)) / 864e5); return n <= 0 ? t('today') : tn(n, '{n} day ago', '{n} days ago'); };
/** An account's last statement brought in, or none. */
const dkLastImport = a => (S.imports || []).filter(i => i.accountId === a.id && i.status !== 'Undone').map(i => i.date || i.at || '').filter(Boolean).sort().pop() || '';
/** What goes out of an account this month by the Plan (what is still to pay of its costs, not those charged to a card) and the invoices it pays. */
function dkOutOf(a) {
  const bk = B(), ym = ymOf(bk.today);
  const items = planProgress(bk, ym, CUR, bk.today).filter(p => p.toPay > 0 && !onCard(bk, p) && lineAcct(p) === a);
  const inv = cardInvoices(S, S.today, CUR).filter(c => !c.paid && c.amount > 0 && ymOf(c.date) === ym && cardDebitAcct(acct(c.accountId)) === a);
  return { items, inv, total: sum(items.map(p => p.toPay)) + sum(inv.map(c => c.amount)) };
}
/** The accounts in the order of the table: the main one first, then by kind and money; a card's credit and a savings' balance to spend under their
    account. Each row: { a, sub }. */
function dkAccRows(list) {
  const bal = a => accountBalance(S, a.id, S.today), main = mainOf('personal'), kind = a => ({ checking: 0, savings: 1, cash: 2, credit: 3 })[a.type] ?? 4;
  const top = list.filter(a => a.type !== 'credit' && !(a.savingsOf && list.includes(acct(a.savingsOf)))).sort((x, y) => (y === main) - (x === main) || kind(x) - kind(y) || bal(y) - bal(x));
  const rows = [];
  for (const a of top) { rows.push({ a }); const cr = cardCredit(a), sp = list.find(k => k.savingsOf === a.id); if (sp) rows.push({ a: sp, sub: true }); if (cr && list.includes(cr)) rows.push({ a: cr, sub: true }); }
  list.filter(a => a.type === 'credit' && !rows.some(r => r.a === a)).forEach(a => rows.push({ a }));
  return rows;
}
/** The table of accounts. */
function dkAccTable(list) {
  const today = S.today, ym = ymOf(today), main = mainOf('personal'), types = Object.fromEntries(ACCT_TYPES());
  const invs = cardInvoices(S, today, CUR), end = isoDate(ym, daysInMonth(ym));
  const row = ({ a, sub }) => {
    const bal = accountBalance(S, a.id, today), credit = a.type === 'credit', mark = dkMark(a), imp = dkLastImport(a);
    const chip = a === main ? dkPill(t('Main'), 'mint dk-mainchip') : credit ? dkPill(t('Credit')) : a.type === 'savings' ? dkPill(t('Savings')) : '';
    const who = `<div class="dk-who">${mark}<div><b>${esc(a.name)}</b> ${chip}<small>${esc([types[a.type], a.purpose].filter(Boolean).join(' · '))}</small></div></div>`;
    const stmt = imp ? `<span class="num"><i class="dk-dot ${Date.parse(today) - Date.parse(imp) > 40 * 864e5 ? 'old' : 'ok'}"></i>${fmt.date(imp)}</span><small>${esc(dkAgo(imp))}</small>` : `<span><i class="dk-dot hand"></i>${t('Balance typed in')}</span><small>${t('no statements yet')}</small>`;
    const go = `<button class="dk-go" data-a="card-view" data-id="${a.id}" ${credit ? 'data-fn="credit"' : ''} aria-label="${esc(t('Open {name}', { name: a.name }))}">${icon('right')}</button>`;
    if (credit) {
      const used = a.creditLimit ? Math.round(Math.max(0, -bal) * 100 / a.creditLimit) : null, now = invs.find(c => c.accountId === a.id && ymOf(c.date) === ym), next = invs.find(c => c.accountId === a.id && c.estimate && !c.paid);
      const out = now ? (now.paid ? dkPill(t('Invoice paid'), 'mint') : `<b class="num">${esc(t('Invoice {amount}', { amount: fmt.money(now.amount, CUR) }))}</b><small class="dk-due">${esc(t('due {date}', { date: fmt.date(now.date) }))} ${dkPill(esc(dkDays(now.days)), now.days < 0 ? 'crit' : now.days <= TODO_SOON ? 'warn' : '')}</small>`) : '<span class="dk-mute">—</span>';
      return `<tr class="${sub ? 'dk-sub-acc' : ''}"><td>${who}</td><td class="r"><b class="num dk-neg">${fmt.money(bal, CUR)}</b>${used !== null ? `<small class="num dk-due"><span class="dk-mini">${dkBar(used, used > 80 ? 'warn' : '')}</span><span>${esc(t('{pct} of {limit}', { pct: fmt.pct(used), limit: fmt.money(a.creditLimit, CUR, { round: true }) }))}</span></small>` : ''}</td>
        <td class="r">${out}</td><td class="r">${next ? `<span class="num dk-mute">${esc(t('Next ≈ {amount}', { amount: fmt.money(next.amount, CUR) }))}</span><small>${esc(t('on {date}, estimated', { date: fmt.date(next.date) }))}</small>` : '<span class="dk-mute">—</span>'}</td><td>${stmt}</td><td class="r">${go}</td></tr>`;
    }
    const o = dkOutOf(a), left = bal - o.total, spent = -sum(S.transactions.filter(x => x.accountId === a.id && x.type === 'expense' && x.status !== 'ignored' && ymOf(x.date) === ym).map(x => x.amount));
    const what = o.items.length && o.inv.length ? t('{n} from the Plan and the invoice of {date}', { n: o.items.length, date: fmt.date(o.inv[0].date) }) : o.items.length ? tn(o.items.length, '{n} cost from the Plan', '{n} costs from the Plan') : o.inv.length ? t('The invoice of {date}', { date: fmt.date(o.inv[0].date) }) : '';
    const out = o.total ? `<b class="num">${fmt.money(o.total, CUR)}</b><small>${esc(what)}</small>` : a.type === 'savings' ? '<span class="dk-mute">—</span>' : `<span class="dk-mute">${t('Nothing scheduled')}</span>${spent > 0 ? `<small class="num">${esc(t('{amount} spent this month', { amount: fmt.money(spent, CUR) }))}</small>` : ''}`;
    const keep = `<b class="num${left < 0 ? ' dk-neg' : ''}">${fmt.money(left, CUR)}</b>${o.total ? `<small>${left >= 0 ? dkPill(`${icon('check')}${t('Enough')}`, 'mint') : dkPill(esc(t('{amount} short', { amount: fmt.money(-left, CUR) })), 'crit')}</small>` : ''}`;
    return `<tr class="${sub ? 'dk-sub-acc' : ''}"><td>${who}</td><td class="r"><b class="num">${fmt.money(bal, CUR)}</b></td><td class="r">${out}</td><td class="r">${keep}</td><td>${stmt}</td><td class="r">${go}</td></tr>`;
  };
  return dkSec('acc-table', t('Your accounts'), esc(t('What each one has, what goes out of it this month and what it keeps')), `<a class="btn" href="#imports">${icon('upload')}${t('Import a statement')}</a>`,
    `${dkCard(`<div class="dk-tbl-wrap"><table class="dk-tbl acc"><thead><tr><th scope="col">${t('Account')}</th><th scope="col" class="r">${t('Balance today')}</th><th scope="col" class="r">${t('Goes out this month')}</th><th scope="col" class="r">${t('Left after paying')}</th><th scope="col">${t('Statement')}</th><th scope="col"><span class="sr">${t('Open')}</span></th></tr></thead><tbody>${dkAccRows(list).map(row).join('')}</tbody></table></div>`)}
    <p class="dk-foot dk-foot-in">${esc(t('“Left after paying”: today’s balance minus the bills and invoices the Plan takes from that account until {date}, not counting what comes in.', { date: fmt.date(end) }))}</p>`, hint('accHouse'));
}
/** Where the savings are: each savings account, its money shared between the goals kept in it, and the goals that do not say where they are. */
function dkAccSavings(list) {
  const bk = B(), sv = list.filter(a => a.type === 'savings'); if (!sv.length) return '';
  const goals = bk.goals.filter(g => g.status !== 'archived'), g = ['var(--dk-g1)', 'var(--dk-g2)', 'var(--dk-g3)', 'var(--dk-g4)'], m = v => fmt.money(v, CUR, { trim: true });
  const one = a => {
    const bal = accountBalance(S, a.id, S.today), in_ = goals.filter(x => x.accountId === a.id).map(x => ({ x, v: goalSaved(bk, x.id) })), set = sum(in_.map(r => r.v)), free = bal - set;
    const parts = in_.filter(r => r.v > 0), n = parts.length + (free > 0 ? 1 : 0);
    const bar = n ? `<div class="dk-split dk-onsheet" aria-hidden="true">${parts.map((r, i) => `<span class="${i === 0 ? 'first' : ''}${i === n - 1 ? ' last' : ''}" style="flex:${r.v} 1 0;background:${g[i % 4]}"></span>`).join('')}${free > 0 ? `<span class="ring${parts.length ? '' : ' first'} last" style="flex:${free} 1 0"></span>` : ''}</div>` : '';
    const state = free === 0 && set > 0 ? `<li class="dk-sv-st ok">${t('All set aside')}</li>` : free > 0 ? `<li class="dk-sv-st">${esc(t('{amount} with no goal', { amount: m(free) }))}</li>` : free < 0 ? `<li class="dk-sv-st warn">${esc(t('The goals add up to {amount} more than there is', { amount: m(-free) }))}</li>` : '';
    return `<div class="dk-sv"><div class="dk-sv-h">${dkMark(a)}<b>${esc(a.name)}</b><b class="num">${fmt.money(bal, CUR)}</b></div>${bar}
      <ul class="dk-sv-l">${in_.map((r, i) => `<li><i class="dk-dot" style="background:${r.v > 0 ? g[parts.indexOf(r) % 4] : 'var(--dk-g4)'}"></i>${esc(r.x.name)} <b class="num">${m(r.v)}</b></li>`).join('')}${state}</ul></div>`;
  };
  const lost = goals.filter(x => (!x.accountId || !acct(x.accountId)) && goalSaved(bk, x.id) > 0);
  const total = sum(sv.map(a => accountBalance(S, a.id, S.today)));
  return `<section class="dk-tile dk-box" id="acc-savings" aria-labelledby="acc-savings-h"><div class="dk-box-h"><div class="dk-sec-t"><div class="dk-h2"><h2 id="acc-savings-h">${t('Where your savings are')}</h2>${hint('accSavings')}</div><span class="dk-sub num">${esc(tn(sv.length, '{amount} in {n} account, shared between your goals', '{amount} in {n} accounts, shared between your goals', { amount: m(total) }))}</span></div></div>
    <div class="dk-svs">${sv.map(one).join('<span class="dk-rule"></span>')}</div>
    ${lost.map(x => `<div class="dk-lost">${icon('alert')}<span>${t('{name} ({amount}) does not say which account it is in.', { name: `<b>${esc(x.name)}</b>`, amount: m(goalSaved(bk, x.id)) })}</span><button class="btn" data-a="goal-edit" data-id="${x.id}">${t('Choose account')}</button></div>`).join('')}</section>`;
}
/** A credit card: its invoice of the month with the button to pay it, how much of its limit is used, the next invoice as estimated. */
function dkAccCard(a) {
  const bal = accountBalance(S, a.id, S.today), invs = cardInvoices(S, S.today, CUR).filter(c => c.accountId === a.id), ym = ymOf(S.today), now = invs.find(c => ymOf(c.date) === ym), next = invs.find(c => c.estimate && !c.paid && c !== now);
  const from = cardDebitAcct(a), used = a.creditLimit ? Math.round(Math.max(0, -bal) * 100 / a.creditLimit) : null;
  return `<section class="dk-tile dk-box" id="acc-card-${a.id}" aria-labelledby="acc-card-${a.id}-h"><div class="dk-box-h"><div class="dk-tile-h">${dkMark(a)}<span class="dk-tile-n"><b id="acc-card-${a.id}-h">${esc(a.name)}</b><small>${from ? esc(t('Paid from {name}', { name: from.name })) : t('Credit card')}</small></span></div></div>
    ${now ? `<div class="dk-inv"><div><span class="dk-sub">${esc(t('Invoice of {month}', { month: yrMonth(ym) }))}</span><b class="num">${fmt.money(now.amount, CUR)}</b><span>${now.paid ? dkPill(t('Invoice paid'), 'mint') : dkPill(esc(`${t('due {date}', { date: fmt.date(now.date) })} · ${dkDays(now.days)}`), now.days < 0 ? 'crit' : now.days <= TODO_SOON ? 'warn' : '')}</span></div>${now.paid ? '' : `<button class="btn primary" data-a="card-pay" data-id="${a.id}">${t('Record the payment')}</button>`}</div>` : `<p class="dk-note">${a.dueDay ? t('No invoice to pay this month.') : t('No due date')}</p>`}
    ${used !== null ? `<div class="dk-used"><div><span>${t('Limit used')}</span><span class="num"><b>${fmt.money(Math.max(0, -bal), CUR)}</b> ${esc(t('of {amount}', { amount: fmt.money(a.creditLimit, CUR, { round: true }) }))}</span></div>${dkBar(used, used > 80 ? 'warn' : '')}</div>` : ''}
    ${next ? `<div class="dk-nextinv"><span>${t('Next invoice, estimated')}</span><span class="num"><b>≈ ${fmt.money(next.amount, CUR)}</b> ${esc(t('on {date}', { date: fmt.date(next.date) }))}</span></div>` : ''}</section>`;
}
function dkAccounts(list) {
  const nowYm = ymOf(S.today), at = d => sum(list.filter(a => a.currency === CUR).map(a => accountBalance(S, a.id, d))), net = at(S.today);
  const prevEnd = isoDate(addMonths(nowYm, -1), daysInMonth(addMonths(nowYm, -1))), d1 = net - at(prevEnd), back = repMonths(B(), CUR, nowYm, 7), first = back.length > 2 ? back[0][0] : null;
  const d2 = first ? net - at(isoDate(first, daysInMonth(first))) : 0;
  const chips = `${d1 ? dkChip(esc(`${fmt.money(d1, CUR, { sign: true })} ${t('since {date}', { date: fmt.date(prevEnd) })}`), d1 > 0 ? 'go' : '') : ''}${first && d2 ? dkChip(esc(t('{change} since {month}', { change: fmt.money(d2, CUR, { sign: true }), month: yrMonth(first) })), d2 > 0 ? 'go' : 'neg') : ''}`;
  // how long the savings last (owner, on the proposal: "pon aquí información tipo 'Cuánto duran tus ahorros'")
  const r = runway(S, S.today, CUR); let side = '';
  if (r.days !== null && r.cushion.amount > 0) {
    const f = rwFigure(r.days, false), marks = [[30, t('30 days')], [90, t('3 months')], [180, t('6 months')], [365, t('1 year')]];
    const seg = ([d, l], i) => { const lo = i ? marks[i - 1][0] : 0, fill = Math.max(0, Math.min(1, (r.days - lo) / (d - lo))); return `<span class="dk-rw-s">${dkBar(fill * 100, 'lime')}<small>${esc(l)}</small></span>`; };
    side = `${dkSideHead('dk-last-h', t('How long your savings last'), dkLink('data-a="runway-view" aria-haspopup="dialog"', t('See the days of freedom')))}<b class="dk-mid">${esc(f.span)} <small>${t('of spending')}</small></b>
      <div class="dk-rw" role="img" aria-label="${esc(tn(r.days, '{n} day of freedom', '{n} days of freedom'))}">${marks.map(seg).join('')}</div>`;
  }
  const spend = list.filter(a => a.currency === CUR && a.type !== 'savings' && a.type !== 'credit'), sv = list.filter(a => a.currency === CUR && a.type === 'savings'), cards = list.filter(a => a.currency === CUR && a.type === 'credit');
  const v = xs => sum(xs.map(a => accountBalance(S, a.id, S.today))), names = xs => { const n = xs.map(a => a.name); return n.length > 2 ? t('{list} and {n} more', { list: n.slice(0, 2).join(', '), n: n.length - 2 }) : n.join(' ' + t('and') + ' '); };
  const owed = -v(cards), inv = cardInvoices(S, S.today, CUR).find(c => !c.paid && c.amount > 0 && ymOf(c.date) === nowYm);
  const parts = [{ label: t('To spend'), v: v(spend), color: '#B6DD62', sub: esc(names(spend)) }, { label: t('Saved'), v: v(sv), color: '#E8F3D2', sub: esc(names(sv)) },
    ...(cards.length ? [{ label: owed >= 0 ? t('Owed on cards') : t('In your favour on cards'), v: Math.abs(owed), color: '#FF8A80', neg: owed > 0, show: fmt.money(-owed, CUR), sub: inv ? esc(t('Invoice of {date}', { date: fmt.date(inv.date) })) : '' }] : [])];
  const band = dkBand('dk-shared-h', t('How it is shared'), `<span class="dk-band-r"><span class="num dk-band-s">${esc(t('{a} in accounts · {b} on cards', { a: fmt.money(v(spend) + v(sv), CUR), b: fmt.money(owed, CUR) }))}</span></span>`, dkSplit(parts, CUR));
  const hero = dkHero({ label: t('Household net balance'), big: fmt.money(net, CUR), neg: net < 0, k: 'net', chips, side, sideId: side ? 'dk-last-h' : '', band });
  const right = `${dkAccSavings(list)}${cards.map(dkAccCard).join('')}`;
  return `${hero}${dkSheet(`${dkAccTable(list)}${right ? dkGrid(right, 380) : ''}`)}`;
}
