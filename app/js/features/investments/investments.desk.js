/* Dorax Finance — Investments on a computer, in the summary's look (v203; what the computer's pages are: features/desk/desk-kit.js).
   On the forest: what the FIIs are worth at today's prices against what was invested, what they pay a month (and how much of a group of the
   person's own fixed costs that already pays: "ya cubre el 23% de tus suscripciones"), and the distributions of the last twelve months as bars,
   this month's still to record as an outline. On the sheet: the position (how it is shared between the funds, then the table, today's price typed
   in), the month's distributions and the purchase simulator side by side, and the movements, a day's distributions together in one row that opens.
   Nothing here is a forecast or advice: what they pay a month repeats each fund's last distribution. The phone, the company and the previous look
   keep investments.view.js. */

/** A fund's round mark: the letters of its code between the first two and the "11" (DXLG11 → LG). */
const dkTicker = (tk, i) => { const s = String(tk).replace(/\d+$/, ''), two = s.length > 2 ? s.slice(-2) : s; return `<span class="dk-tk g${(i % 4) + 1}" aria-hidden="true">${esc(two)}</span>`; };
/** What the monthly income already pays of the person's own fixed costs: the smallest group of the Plan it does not cover yet; else the largest it
    does; with no Plan, the month's spending. null when it pays nothing. */
function dkFiiCovers(monthly) {
  if (!(monthly > 0)) return null;
  const bk = B(), ym = ymOf(bk.today), prog = planProgress(bk, ym, BCUR(), bk.today).filter(p => p.bill && p.planned > 0);
  const groups = bk.categories.filter(c => !c.income).map(c => ({ name: c.name, v: sum(prog.filter(p => p.categoryId === c.id).map(p => p.planned)) })).filter(g => g.v > 0).sort((a, b) => a.v - b.v);
  const up = groups.find(g => g.v > monthly);
  if (up) return { pct: Math.max(1, Math.round(monthly * 100 / up.v)), say: t('Already covers {pct} of your {name} ({amount} a month)', { pct: fmt.pct(Math.max(1, Math.round(monthly * 100 / up.v))), name: dkLower(up.name), amount: fmt.money(up.v, CUR) }) };
  if (groups.length) { const g = groups[groups.length - 1]; return { pct: 100, say: t('It already pays all your {name} ({amount} a month)', { name: dkLower(g.name), amount: fmt.money(g.v, CUR) }) }; }
  const r = runway(bk, bk.today, CUR), burn = r && r.burn && r.burn.amount;
  return burn > 0 ? { pct: Math.min(100, Math.max(1, Math.round(monthly * 100 / burn))), say: t('Already covers {pct} of what you spend in a month', { pct: fmt.pct(Math.round(monthly * 1000 / burn) / 10) }) } : null;
}
/** The distributions of the last twelve months, as bars on the forest; this month's, still to record, as an outline at its expected height. */
function dkFiiBars(f) {
  const nowYm = ymOf(S.today), pts = []; for (let i = 11; i >= 0; i--) { const ym = addMonths(nowYm, -i); pts.push({ ym, v: fiiIncomeMonth(S, ym) }); }
  const last = pts[11], expect = !last.v && f.monthly > 0 ? f.monthly : 0, top = Math.max(1, ...pts.map(p => p.v), expect) * 1.1, lastHit = pts.map(p => p.v > 0).lastIndexOf(true);
  const col = (p, i) => {
    const h = p.v ? Math.max(2, p.v * 100 / top) : 0, ex = i === 11 && expect ? expect * 100 / top : 0;
    const tag = i === lastHit ? `<b class="num" style="bottom:calc(${h}% + 6px)">${fmt.money(p.v, CUR)}</b>` : '';      // the last month paid, its figure on it
    return `<div class="dk-col${i === 11 ? ' now' : ''}"><div class="dk-col-b">${tag}${ex ? `<span class="dk-col-tag" style="bottom:calc(${ex}% + 6px)">${t('to record')}</span><i class="todo" style="height:${ex}%"></i>` : h ? `<i style="height:${h}%"></i>` : '<i class="zero"></i>'}</div><small>${esc(mon(+p.ym.slice(5) - 1))}</small></div>`;
  };
  const say = pts.map(p => `${fmt.month(p.ym)} ${fmt.money(p.v, CUR)}`).join(', ') + (expect ? ' · ' + t('{month}: about {amount} to record', { month: fmt.month(nowYm), amount: fmt.money(expect, CUR) }) : '');
  return `<div class="dk-cols" role="img" aria-label="${esc(say)}">${pts.map(col).join('')}</div>`;
}
/** The position: how it is shared between the funds, then the table with today's price to type. */
function dkFiiPosition(f) {
  const held = f.held.slice().sort((a, b) => b.value - a.value), gone = f.rows.filter(r => !r.qty), quotas = sum(f.held.map(r => r.qty));
  const idx = tk => held.findIndex(r => r.ticker === tk), total = sum(held.map(r => r.value)) || 1;
  const gain = (v, pct) => !v ? `<span class="dk-mute num">${fmt.money(0, CUR)}</span>` : `<span class="num ${v > 0 ? 'dk-pos' : 'dk-neg'}">${fmt.money(v, CUR, { sign: true })}</span>${pct === null ? '' : `<small class="num">${v > 0 ? '▲' : '▼'} ${fmt.pct(Math.abs(pct))}</small>`}`;
  const split = held.length > 1 ? `<div class="dk-card-top"><div class="dk-split dk-onsheet" aria-hidden="true">${held.map((r, i) => `<span class="g${(i % 4) + 1}${i === 0 ? ' first' : ''}${i === held.length - 1 ? ' last' : ''}" style="flex:${r.value} 1 0"></span>`).join('')}</div>
      <ul class="dk-keys">${held.map((r, i) => `<li class="num"><i class="dk-dot g${(i % 4) + 1}"></i>${esc(r.ticker)} <b>${fmt.pct(Math.round(r.value * 100 / total))}</b></li>`).join('')}</ul></div>` : '';
  const row = r => `<tr class="${flashed(r.ticker).trim()}"><td><div class="dk-who">${dkTicker(r.ticker, idx(r.ticker))}<button class="linkbtn dk-name" data-a="fii-open" data-id="${esc(r.ticker)}">${esc(r.ticker)}</button></div></td>
      <td class="r num">${r.qty}</td><td class="r num">${fmt.money(r.avg, CUR)}</td>
      <td class="r"><input type="text" inputmode="decimal" class="dk-fld num dk-price" id="fp-${esc(r.ticker)}" aria-label="${esc(t('Today’s price of {ticker}, in reais', { ticker: r.ticker }))}" value="${plain(r.price)}" data-c="fii-price" data-id="${esc(r.ticker)}"></td>
      <td class="r"><b class="num">${fmt.money(r.value, CUR)}</b></td><td class="r">${gain(r.gain, r.gainPct)}</td>
      <td class="r"><b class="num">${fmt.money(r.monthly, CUR)}</b>${r.unit ? `<small class="num">${esc(t('{unit} per quota', { unit: fmt.unit(r.unit) }))}</small>` : ''}</td>
      <td class="r"><button class="dk-go" data-a="fii-open" data-id="${esc(r.ticker)}" aria-label="${esc(t('Open {name}', { name: r.ticker }))}">${icon('right')}</button></td></tr>`;
  const body = held.length ? held.map(row).join('') + `<tr class="tot"><td><b>${t('Total')}</b></td><td class="r num"><b>${quotas}</b></td><td></td><td></td><td class="r num"><b>${fmt.money(f.value, CUR)}</b></td><td class="r">${gain(f.gain, f.gainPct)}</td><td class="r num"><b>${fmt.money(f.monthly, CUR)}</b></td><td></td></tr>`
    : `<tr><td colspan="8"><span class="dk-mute">${t('You hold no quotas now.')}</span></td></tr>`;
  const goneLine = gone.length ? `<p class="dk-card-note">${t('No quotas now:')} ${gone.map(r => `<button class="linkbtn" data-a="fii-open" data-id="${esc(r.ticker)}">${esc(r.ticker)}</button>`).join(', ')}</p>` : '';
  return dkSec('fii-position', t('Your position'), esc(t('It comes from your movements; you type today’s price')), '',
    dkCard(`${split}<div class="dk-tbl-wrap"><table class="dk-tbl fii"><thead><tr><th scope="col">FII</th><th scope="col" class="r">${t('Quotas')}</th><th scope="col" class="r">${t('Average price')}</th><th scope="col" class="r">${t('Today’s price')}</th><th scope="col" class="r">${t('Value')}</th><th scope="col" class="r">${t('Result')}</th><th scope="col" class="r">${t('A month')}</th><th scope="col"><span class="sr">${t('Open')}</span></th></tr></thead><tbody>${body}</tbody></table></div>${goneLine}`), hint('fiiPosition'));
}
/** The month's distributions, recorded in one go: each fund's last one as it comes, to change before recording. */
function dkFiiIncome(f) {
  const ym = ymOf(S.today), d = incDraft(ym), rows = incRows(f, ym), count = rows.filter(x => x.now > 0).length, open = rows.filter(x => !x.done).length;
  if (!rows.length) return '';
  const held = f.held.slice().sort((a, b) => b.value - a.value), idx = tk => held.findIndex(r => r.ticker === tk);
  const line = x => `<div class="dk-inc-row">${dkTicker(x.r.ticker, idx(x.r.ticker))}<div class="dk-inc-t"><b>${esc(x.r.ticker)}</b><small class="num">${x.done ? esc(t('{amount} recorded', { amount: fmt.money(x.done, CUR) })) : x.r.unit ? esc(t('{unit} × {n} quotas', { unit: fmt.unit(x.r.unit), n: x.r.qty })) : esc(tn(x.r.qty, '{n} quota', '{n} quotas'))}</small></div>
      <input type="text" inputmode="decimal" class="dk-fld num dk-amt ${x.now ? '' : 'z'}" id="iv-${esc(x.r.ticker)}" aria-label="${esc(t('Received from {ticker}, in reais', { ticker: x.r.ticker }))}" value="${esc(x.txt)}" data-c="inc-val" data-id="${esc(x.r.ticker)}"></div>`;
  return `<section class="dk-tile dk-box" id="fii-income" aria-labelledby="fii-income-h"><div class="dk-box-h"><div class="dk-sec-t"><div class="dk-h2"><h2 id="fii-income-h">${esc(t('Distributions of {month}', { month: yrMonth(ym) }))}</h2>${hint('fiiMonth')}</div><span class="dk-sub">${t('They come with each fund’s last distribution')}</span></div>${open ? dkPill(esc(tn(open, '{n} to record', '{n} to record')), 'warn') : dkPill(t('All recorded'), 'mint')}</div>
    <div class="dk-inc">${rows.map(line).join('')}<div class="dk-inc-tot"><b>${t('Total')}</b><b class="num">${fmt.money(sum(rows.map(x => x.now)), CUR)}</b></div></div>
    <div class="dk-box-f"><label class="dk-lbl">${t('Date')}<input type="date" class="dk-fld" id="inc-date" value="${esc(d.date)}" data-c="inc-date"></label><button class="btn primary" data-a="inc-register" ${count ? '' : 'disabled'}>${icon('check')}${count ? tn(count, 'Record {n} income', 'Record {n} incomes') : t('Nothing to record')}</button></div></section>`;
}
/** A purchase tried on: what it would cost, what it would pay a month, and the whole portfolio's month before and after. Nothing is recorded. */
function dkFiiSim(f) {
  const s = simDraft(), tk = (s.ticker || '').trim().toUpperCase(), qty = typedCount(s.qtyText), price = typedAmount(s.priceText || ''), y = typedAmount(s.yieldText || '0') || 0;
  const ok = tk && Number.isInteger(qty) && qty > 0 && price > 0, r = ok ? fiiSimulate(S, tk, qty, price, y) : null;
  const res = r ? `<div class="dk-sim-r"><div><span>${t('It would cost')}</span><b class="num">${fmt.money(r.cost, CUR)}</b></div><div><span>${t('It would pay a month')}</span><b class="num">${fmt.money(r.income, CUR)}${r.yieldPct === null ? '' : ` <small>${fmt.pct(r.yieldPct)}</small>`}</b></div></div>
      ${f.monthly + r.income > 0 ? `<div class="dk-sim-bar" role="img" aria-label="${esc(t('Monthly income of the whole portfolio would go from {a} to {b}.', { a: fmt.money(f.monthly, CUR), b: fmt.money(f.monthly + r.income, CUR) }))}"><span class="dk-split dk-onsheet" aria-hidden="true">${f.monthly ? `<span class="g1 first" style="flex:${f.monthly} 1 0"></span>` : ''}<span class="g3 last${f.monthly ? '' : ' first'}" style="flex:${r.income || 1} 1 0"></span></span>
        <span class="dk-note num">${t('A month: {a} today → {b} with this purchase', { a: `<b>${fmt.money(f.monthly, CUR)}</b>`, b: `<b>${fmt.money(f.monthly + r.income, CUR)}</b>` })}</span></div>` : ''}
      ${r.had ? `<p class="dk-note">${esc(t('You would hold {n} quotas of {ticker} at an average price of {price}.', { n: r.newQty, ticker: tk, price: fmt.money(r.newAvg, CUR) }))}</p>` : ''}
      <div><button class="btn" data-a="fii-move" data-kind="buy" data-sim="1">${icon('check')}${t('Record it as a purchase')}</button></div>`
    : `<p class="dk-note">${t('Enter a fund, the quotas and the price to see what the purchase would change.')}</p>`;
  return `<section class="dk-tile dk-box" id="fii-sim" aria-labelledby="fii-sim-h"><div class="dk-box-h"><div class="dk-sec-t"><div class="dk-h2"><h2 id="fii-sim-h">${t('Simulate a purchase')}</h2>${hint('fiiSim')}</div><span class="dk-sub">${t('Nothing is recorded until you say so')}</span></div></div>
    <div class="dk-sim-f"><label class="dk-lbl">FII<input type="text" class="dk-fld" id="sim-ticker" list="fii-list" value="${esc(s.ticker)}" placeholder="ABCD11" autocapitalize="characters" data-c="sim" data-k="ticker"><datalist id="fii-list">${fiiTickers(S).map(x => `<option value="${esc(x)}">`).join('')}</datalist></label>
      <label class="dk-lbl">${t('Quotas')}<input type="text" inputmode="numeric" class="dk-fld num" id="sim-qty" value="${esc(s.qtyText)}" data-c="sim" data-k="qtyText"></label>
      <label class="dk-lbl">${t('Price per quota (R$)')}<input type="text" inputmode="decimal" class="dk-fld num" id="sim-price" value="${esc(s.priceText)}" data-c="sim" data-k="priceText"></label>
      <label class="dk-lbl">${t('Last yield per quota (R$)')}<input type="text" inputmode="decimal" class="dk-fld num" id="sim-yield" value="${esc(s.yieldText)}" data-c="sim" data-k="yieldText"></label></div>
    <div class="dk-sim-out">${res}</div></section>`;
}
/** The movements, newest first; a day's distributions together in one row that opens into its funds. */
function dkFiiMoves() {
  const F = UI.fii, open = UI.dkDay || {};
  const list = fiiNewestFirst(S.fii.moves.filter(m => (!F.ticker || m.ticker === F.ticker) && (!F.kind || (F.kind === 'income') === (m.kind === 'income')) && (!F.month || ymOf(m.date) === F.month)));
  const groups = []; for (const m of list) { const g = groups[groups.length - 1]; if (m.kind === 'income' && g && g.kind === 'income' && g.date === m.date) g.xs.push(m); else groups.push({ kind: m.kind, date: m.date, xs: [m] }); }
  const pg = paged('fii-moves', groups);
  const del = m => `<button class="dk-go" data-a="fii-delete" data-id="${m.id}" aria-label="${esc(`${t('Delete')} ${m.ticker} ${fiiKindLabel(m.kind)}`)}">${icon('x')}</button>`;
  const one = m => `<tr class="${flashed(m.id).trim()}"><td class="num">${m.kind === 'open' ? '—' : fmt.date(m.date, true)}</td><td>${dkPill(esc(fiiKindLabel(m.kind)), m.kind === 'income' ? 'mint' : '')}</td><td><span class="dk-detail num"><b>${esc(m.ticker)}</b> · ${fiiMoveText(m)}${m.note ? ' · ' + esc(m.note) : ''}</span></td><td class="r"><b class="num">${fiiAmountHtml(m)}</b></td><td class="r">${del(m)}</td></tr>`;
  const grp = g => {
    if (g.xs.length === 1) return one(g.xs[0]);
    const on = !!open[g.date], tot = sum(g.xs.map(m => m.amount));
    return `<tr class="dk-day${on ? ' on' : ''}"><td class="num">${fmt.date(g.date, true)}</td><td>${dkPill(esc(`${t('Distributions')} · ${g.xs.length}`), 'mint')}</td><td><span class="dk-detail num">${g.xs.map(m => `${esc(m.ticker)} ${fmt.money(m.amount, CUR)}`).join(' · ')}</span></td><td class="r"><b class="num dk-pos">${fmt.money(tot, CUR, { sign: true })}</b></td>
      <td class="r"><button class="dk-go" data-a="dk-day" data-v="${g.date}" aria-expanded="${on}" aria-label="${esc(on ? t('Fold the distributions of {date}', { date: fmt.date(g.date, true) }) : t('Open the distributions of {date}', { date: fmt.date(g.date, true) }))}">${icon(on ? 'up' : 'down')}</button></td></tr>
      ${on ? g.xs.map(m => `<tr class="dk-sub-row"><td></td><td></td><td><span class="dk-detail num"><b>${esc(m.ticker)}</b> · ${fiiMoveText(m)}</span></td><td class="r num">${fiiAmountHtml(m)}</td><td class="r">${del(m)}</td></tr>`).join('') : ''}`;
  };
  const filters = `<label class="sr" for="fii-f-ticker">FII</label><select class="dk-fld dk-pillsel" id="fii-f-ticker" data-c="fii-filter" data-k="ticker">${options([['', t('All FIIs')], ...fiiTickers(S).map(x => [x, x])], F.ticker)}</select>
    ${seg('fii-kind-filter', [['', t('All')], ['trade', t('Purchases and sales')], ['income', t('Distributions')]], F.kind, t('Type'))}${F.month ? `<button class="chip" data-a="fii-month" data-ym="${F.month}">${fmt.month(F.month, true)} ${icon('x')}</button>` : ''}`;
  const body = groups.length ? `<div class="dk-tbl-wrap"><table class="dk-tbl"><thead><tr><th scope="col">${t('Date')}</th><th scope="col">${t('Type')}</th><th scope="col">${t('Detail')}</th><th scope="col" class="r">${t('Amount')}</th><th scope="col"><span class="sr">${t('Actions')}</span></th></tr></thead><tbody>${pg.rows.map(grp).join('')}</tbody></table></div>${pg.html}`
    : `<div class="dk-empty"><b>${t('No movements match these filters')}</b></div>`;
  return dkSec('fii-moves', t('Movements'), esc(t('A day’s distributions go together')), filters, dkCard(body), hint('fiiMoves'));
}
function dkInvestments() {
  const f = fiiSummary(S, S.today), nowYm = ymOf(S.today), quotas = sum(f.held.map(r => r.qty));
  if (!S.fii.moves.length) {
    const hero = dkHero({ label: t('Your FIIs are worth today'), big: fmt.money(0, CUR), chips: dkChip(t('No FIIs yet')), side: `${dkSideHead('dk-pay-h', t('Your first movement'))}<p class="dk-say">${t('Record a purchase, or the quotas you already hold, and the position is calculated from there.')}</p><div class="dk-acts"><button class="btn primary" data-a="fii-move" data-kind="buy">${icon('plus')}${t('Record movement')}</button></div>`, sideId: 'dk-pay-h' });
    return `${hero}${dkSheet(dkGrid(dkFiiSim(f), 380))}`;
  }
  const chips = `${f.gain ? dkChip(esc(t('{amount} · {pct} on what you invested', { amount: fmt.money(f.gain, CUR, { sign: true }), pct: fmt.pct(Math.abs(f.gainPct || 0)) })), f.gain > 0 ? 'go' : 'neg') : dkChip(t('Same as invested'))}${dkChip(esc(t('Invested {amount} · {a} · {b}', { amount: fmt.money(f.cost, CUR), a: tn(f.held.length, '{n} FII', '{n} FIIs'), b: tn(quotas, '{n} quota', '{n} quotas') })), '', 'fii-invested')}`;
  const cov = dkFiiCovers(f.monthly);
  const side = `${dkSideHead('dk-pay-h', t('They pay you a month'), dkLink('data-a="dk-go" data-to="fii-sim"', t('Simulate a purchase')))}${dkFig('fii-monthly', t('They pay you a month'), `<b class="dk-mid num">${fmt.money(f.monthly, CUR)}${f.yieldPct === null ? '' : ` <small>${esc(t('{pct} of the value', { pct: fmt.pct(f.yieldPct) }))}</small>`}</b>`)}
    ${cov ? `<div class="dk-cov" role="img" aria-label="${esc(cov.say)}">${dkBar(cov.pct, 'lime')}<span class="dk-say num">${esc(cov.say)}</span></div>` : ''}`;
  const rows = incRows(f, nowYm), toRecord = rows.some(x => !x.done && x.now > 0);
  const band = dkBand('dk-rec-h', t('Distributions received, last 12 months'), `<span class="dk-band-r">${dkFig('fii-income', t('Distributions received, last 12 months'), `<b class="num">${esc(t('{amount} in {year}', { amount: fmt.money(f.receivedYear, CUR), year: S.today.slice(0, 4) }))}</b>`)}${toRecord ? `<button class="btn primary" data-a="dk-go" data-to="fii-income">${icon('check')}${esc(t('Record those of {month}', { month: yrMonth(nowYm) }))}</button>` : ''}</span>`, dkFiiBars(f));
  const hero = dkHero({ label: t('Your FIIs are worth today'), big: fmt.money(f.value, CUR), k: 'fii-value', chips, side, sideId: 'dk-pay-h', band });
  return `${hero}${dkSheet(`${dkFiiPosition(f)}${dkGrid(`${dkFiiIncome(f)}${dkFiiSim(f)}`, 380)}${dkFiiMoves()}${dkFoot(t('Monthly income repeats the last distribution of each fund on the quotas you hold today. It describes the past and is not a forecast or a recommendation. FII movements are records: they do not create transactions in your accounts.'))}`)}`;
}
