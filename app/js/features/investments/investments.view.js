/* Dorax Finance — Investments (FIIs): the position is replayed from purchases, sales and income received. Nothing here is typed as a total. */

const fiiKindLabel = k => ({ open: t('Opening position'), buy: t('Purchase'), sell: t('Sale'), income: t('Income received') }[k]);
const fiiQtyAt = (ticker, date) => { const p = fiiReplay(S.fii.moves, ticker, date); return p ? p.qty : 0; };
function simDraft() {
  if (!UI.sim) { const s = S.fii.sim || {}; UI.sim = { ticker: s.ticker || '', qtyText: s.qty ? String(s.qty) : '', priceText: s.price ? plain(s.price) : '', yieldText: s.lastYield ? plain(s.lastYield) : '' }; }
  return UI.sim;
}
function gainHtml(gain, pct) {
  if (!gain) return `<span class="muted">${fmt.money(0, CUR)}</span>`;
  return `<span class="${gain > 0 ? 'pos' : 'neg'}">${fmt.money(gain, CUR, { sign: true })}</span>${pct === null ? '' : ` <span class="pill ${gain > 0 ? 'up' : 'down'}">${gain > 0 ? '▲' : '▼'} ${fmt.pct(Math.abs(pct))}</span>`}`;
}
function fiiMoveText(m) {
  if (m.kind === 'income') { const q = fiiQtyAt(m.ticker, m.date); return q ? t('{unit} per quota on {n} quotas', { unit: fmt.unit(Math.round(m.amount * 100 / q)), n: q }) : ''; }
  return tn(m.qty, '{n} quota × {price}', '{n} quotas × {price}', { price: fmt.money(m.price, CUR) }) + (m.fees ? ' + ' + t('{amount} costs', { amount: fmt.money(m.fees, CUR) }) : '');
}
const fiiMoveAmount = m => m.kind === 'income' ? m.amount : m.kind === 'sell' ? m.qty * m.price - (m.fees || 0) : -(m.qty * m.price + (m.fees || 0));
function fiiAmountHtml(m) {
  const v = fiiMoveAmount(m);
  return m.kind === 'open' ? `<span class="muted">${fmt.money(-v, CUR)}</span>` : `<span class="${m.kind === 'income' ? 'pos' : ''}">${fmt.money(v, CUR, { sign: true })}</span>`;
}
const fiiNewestFirst = moves => fiiSorted(moves).reverse();

// ---------- the month: income received from every fund, recorded in one go ----------
function incDraft(ym) { if (!UI.inc || UI.inc.ym !== ym) UI.inc = { ym, vals: {}, date: S.today }; return UI.inc; }
function incRows(f, ym) {
  const d = incDraft(ym);
  return f.held.map(r => { const done = fiiIncomeMonth(S, ym, r.ticker), txt = d.vals[r.ticker], def = done ? 0 : r.monthly, v = txt == null ? def : typedAmount(txt || '0'); return { r, done, txt: txt == null ? (def ? plain(def) : '') : txt, now: v === null || v < 0 ? 0 : v }; });
}
function fiiIncomeCard(f) {
  const ym = ymOf(S.today), d = incDraft(ym), rows = incRows(f, ym), count = rows.filter(x => x.now > 0).length, open = rows.filter(x => !x.done).length;
  if (!rows.length) return '';
  return `<section class="card" id="fii-income"><div class="card-h"><h2>${t('Income of {month}', { month: fmt.month(ym) })}</h2>${hint('fiiMonth')}${open ? `<span class="chip">${tn(open, '{n} fund still to record', '{n} funds still to record')}</span>` : `<span class="chip good"><i></i>${t('All recorded')}</span>`}</div>
    <div class="card-b flush"><table class="tbl stackable dist"><thead><tr><th>FII</th><th class="r">${t('Last per quota')}</th><th class="r">${t('Already recorded')}</th><th class="r" style="min-width:130px">${t('Received now (R$)')}</th></tr></thead><tbody>
      ${rows.map(x => `<tr><td class="first"><b style="font-weight:500">${esc(x.r.ticker)}</b><div class="note">${tn(x.r.qty, '{n} quota', '{n} quotas')}</div></td><td class="amt-s wide meta" data-l="${t('Last per quota')}">${x.r.unit ? fmt.unit(x.r.unit) : '—'}</td><td class="amt-s wide meta" data-l="${t('Already recorded')}">${x.done ? fmt.money(x.done, CUR) : '—'}</td>
        <td class="amt"><input type="text" inputmode="decimal" class="num ${x.now ? '' : 'z'}" id="iv-${esc(x.r.ticker)}" aria-label="${t('Received now (R$)')}, ${esc(x.r.ticker)}" value="${esc(x.txt)}" style="width:120px;text-align:right" data-c="inc-val" data-id="${esc(x.r.ticker)}"></td></tr>`).join('')}
      <tr class="sumrow grand"><td class="first"><b>${t('Total')}</b></td><td class="wide meta"></td><td class="amt-s wide meta" data-l="${t('Already recorded')}">${fmt.money(sum(rows.map(x => x.done)), CUR)}</td><td class="amt" style="padding-right:26px">${fmt.money(sum(rows.map(x => x.now)), CUR)}</td></tr>
    </tbody></table></div>
    <div class="toolbar" style="border-top:1px solid var(--line);border-bottom:0"><span class="note">${t('Filled in with each fund’s last distribution. Change what was different before recording.')}</span>
      <span class="spacer row"><label class="sr" for="inc-date">${t('Date')}</label><input type="date" id="inc-date" value="${esc(d.date)}" data-c="inc-date" style="width:150px"><button class="btn primary" data-a="inc-register" ${count ? '' : 'disabled'}>${icon('check')}${count ? tn(count, 'Record {n} income', 'Record {n} incomes') : t('Nothing to record')}</button></span></div></section>`;
}

function fiiSimCard(f) {
  const s = simDraft(), tk = (s.ticker || '').trim().toUpperCase(), qty = typedCount(s.qtyText), price = typedAmount(s.priceText || ''), y = typedAmount(s.yieldText || '0') || 0;
  const ok = tk && Number.isInteger(qty) && qty > 0 && price > 0, r = ok ? fiiSimulate(S, tk, qty, price, y) : null;
  return `<section class="card" id="fii-sim"><div class="card-h"><h2>${t('Simulate a purchase')}</h2>${hint('fiiSim')}<span class="sub">${t('Nothing is recorded until you say so')}</span></div><div class="card-b stack" style="gap:14px">
    <div class="form-grid four">
      <div class="field"><label for="sim-ticker">FII</label><input type="text" id="sim-ticker" list="fii-list" value="${esc(s.ticker)}" placeholder="ABCD11" autocapitalize="characters" data-c="sim" data-k="ticker"><datalist id="fii-list">${fiiTickers(S).map(x => `<option value="${esc(x)}">`).join('')}</datalist></div>
      <div class="field"><label for="sim-qty">${t('Quotas')}</label><input type="text" inputmode="numeric" class="num" id="sim-qty" value="${esc(s.qtyText)}" data-c="sim" data-k="qtyText"></div>
      <div class="field"><label for="sim-price">${t('Price per quota (R$)')}</label><input type="text" inputmode="decimal" class="num" id="sim-price" value="${esc(s.priceText)}" data-c="sim" data-k="priceText"></div>
      <div class="field"><label for="sim-yield">${t('Last yield per quota (R$)')}</label><input type="text" inputmode="decimal" class="num" id="sim-yield" value="${esc(s.yieldText)}" data-c="sim" data-k="yieldText"></div>
    </div>
    ${r ? `<div class="flow two"><div><div class="note">${t('It would cost')}</div><div><b class="num">${fmt.money(r.cost, CUR)}</b></div></div>
        <div><div class="note">${t('Income a month at that yield')}</div><div><b class="num">${fmt.money(r.income, CUR)}</b>${r.yieldPct === null ? '' : ` <span class="muted">· ${fmt.pct(r.yieldPct)}</span>`}</div></div></div>
      <p class="note">${r.had ? t('You would hold {n} quotas of {ticker} at an average price of {price}.', { n: r.newQty, ticker: esc(tk), price: fmt.money(r.newAvg, CUR) }) + ' ' : ''}${t('Monthly income of the whole portfolio would go from {a} to {b}.', { a: fmt.money(f.monthly, CUR), b: fmt.money(f.monthly + r.income, CUR) })}</p>
      <div><button class="btn" data-a="fii-move" data-kind="buy" data-sim="1">${icon('check')}${t('Record it as a purchase')}</button></div>`
      : `<p class="note">${t('Enter a fund, the quotas and the price to see what the purchase would change.')}</p>`}
  </div></section>`;
}

function viewInvestments() {
  const f = fiiSummary(S, S.today), year = S.today.slice(0, 4), F = UI.fii, nowYm = ymOf(S.today);
  if (!S.fii.moves.length) return `<div class="card"><div class="empty"><b>${t('No FIIs yet')}</b>${t('Record a purchase, or the quotas you already hold, and the position is calculated from there.')}<div style="margin-top:12px"><button class="btn primary" data-a="fii-move" data-kind="buy">${icon('plus')}${t('Record movement')}</button></div></div></div>${fiiSimCard(f)}`;
  const quotas = sum(f.held.map(r => r.qty)), gone = f.rows.filter(r => !r.qty);
  const points = []; for (let y = addMonths(nowYm, -11); y <= nowYm; y = addMonths(y, 1)) points.push({ ym: y, value: fiiIncomeMonth(S, y, F.ticker || null), partial: y === nowYm });
  const list = fiiNewestFirst(S.fii.moves.filter(m => (!F.ticker || m.ticker === F.ticker) && (!F.kind || (F.kind === 'income') === (m.kind === 'income')) && (!F.month || ymOf(m.date) === F.month)));
  const mv = paged('fii-moves', list), shown = mv.rows;
  return `<section class="tiles">
      <div class="card tile"><div class="label"><span>${t('Invested')}</span>${hint('fiiInvested')}</div><div class="value num">${fmt.money(f.cost, CUR)}</div><div class="note">${tn(f.held.length, '{n} FII', '{n} FIIs')} · ${tn(quotas, '{n} quota', '{n} quotas')}</div></div>
      <div class="card tile"><div class="label"><span>${t('Value at today’s prices')}</span>${hint('fiiValue')}</div><div class="value num">${fmt.money(f.value, CUR)}</div><div class="note">${f.gain ? gainHtml(f.gain, f.gainPct) : t('Same as invested')}</div></div>
      <div class="card tile"><div class="label"><span>${t('Income received in {year}', { year })}</span>${hint('fiiIncome')}</div><div class="value num">${fmt.money(f.receivedYear, CUR)}</div><div class="note">${t('Since the start: {amount}', { amount: fmt.money(f.received, CUR) })}</div></div>
      <div class="card tile"><div class="label"><span>${t('Monthly income, last distribution')}</span>${hint('fiiMonthly')}</div><div class="value num">${fmt.money(f.monthly, CUR)}</div><div class="note">${f.yieldPct === null ? '—' : t('{pct} of the value a month', { pct: fmt.pct(f.yieldPct) })}</div></div></section>
  <section class="card"><div class="card-h"><h2>${t('Position')}</h2>${hint('fiiPosition')}<span class="sub">${t('Calculated from your movements')}</span></div>
    <div class="card-b flush"><div class="tbl-wrap"><table class="tbl stackable fii"><thead><tr><th>FII</th><th class="r">${t('Quotas')}</th><th class="r">${t('Average price')}</th><th class="r">${t('Price now (R$)')}</th><th class="r">${t('Value')}</th><th class="r">${t('Result')}</th><th class="r">${t('Last per quota')}</th><th class="r">${t('Income a month')}</th><th><span class="sr">${t('Actions')}</span></th></tr></thead><tbody>
    ${f.held.map(r => `<tr class="${flashed(r.ticker).trim()}"><td class="first"><button class="linkbtn" data-a="fii-open" data-id="${esc(r.ticker)}">${esc(r.ticker)}</button></td>
      <td class="amt-s hide-sm">${r.qty}</td><td class="amt-s hide-sm">${fmt.money(r.avg, CUR)}</td>
      <td class="amt-s hide-sm"><input type="text" inputmode="decimal" class="num" id="fp-${esc(r.ticker)}" aria-label="${t('Price now (R$)')}, ${esc(r.ticker)}" value="${plain(r.price)}" style="width:92px;text-align:right" data-c="fii-price" data-id="${esc(r.ticker)}"></td>
      <td class="amt">${fmt.money(r.value, CUR)}</td><td class="amt-s hide-sm">${gainHtml(r.gain, r.gainPct)}</td><td class="amt-s hide-sm">${r.unit ? fmt.unit(r.unit) : '<span class="muted">—</span>'}</td><td class="amt-s hide-sm">${fmt.money(r.monthly, CUR)}</td>
      <td class="sm-row meta">${tn(r.qty, '{n} quota', '{n} quotas')} · ${t('average {price}', { price: fmt.money(r.avg, CUR) })} · ${t('{amount} a month', { amount: fmt.money(r.monthly, CUR) })}</td>
      <td class="r hide-sm"><button class="btn sm ghost" data-a="fii-move" data-kind="buy" data-id="${esc(r.ticker)}">${t('Buy')}</button></td></tr>`).join('') || `<tr><td colspan="9"><div class="empty">${t('You hold no quotas now.')}</div></td></tr>`}
    ${f.held.length ? `<tr class="sumrow grand"><td class="first"><b>${t('Total')}</b></td><td class="amt-s hide-sm">${quotas}</td><td class="hide-sm"></td><td class="hide-sm"></td><td class="amt">${fmt.money(f.value, CUR)}</td><td class="amt-s hide-sm">${gainHtml(f.gain, f.gainPct)}</td><td class="hide-sm"></td><td class="amt-s hide-sm">${fmt.money(f.monthly, CUR)}</td><td class="sm-row meta">${t('Invested')} ${fmt.money(f.cost, CUR)} · ${t('{amount} a month', { amount: fmt.money(f.monthly, CUR) })}</td><td class="hide-sm"></td></tr>` : ''}
    </tbody></table></div></div>
    <div class="toolbar" style="border-top:1px solid var(--line);border-bottom:0"><span class="note">${t('Average price is what you paid per quota, costs included. Current prices are typed by hand: there is no market data in this version.')}${gone.length ? ' ' + t('No quotas now:') + ' ' + gone.map(r => `<button class="linkbtn" data-a="fii-open" data-id="${esc(r.ticker)}">${esc(r.ticker)}</button>`).join(', ') : ''}</span></div></section>
  <div class="grid g-even">
    ${fiiIncomeCard(f)}
    <section class="card"><div class="card-h"><h2>${t('Income received')}</h2>${hint('fiiReceived')}<span class="sub">${F.ticker ? esc(F.ticker) + ' · ' : ''}${t('Last 12 months')}</span></div>
      <div class="card-b">${colChart(points, F.month, CUR, 'fii-month')}</div></section>
  </div>
  ${fiiSimCard(f)}
  <section class="card" id="fii-moves"><div class="card-h"><h2>${t('Movements')}</h2>${hint('fiiMoves')}${F.month ? `<button class="chip" data-a="fii-month" data-ym="${F.month}">${fmt.month(F.month, true)} ${icon('x')}</button>` : ''}</div>
    <div class="toolbar"><label class="sr" for="fii-f-ticker">FII</label><select id="fii-f-ticker" data-c="fii-filter" data-k="ticker">${options([['', t('All FIIs')], ...fiiTickers(S).map(x => [x, x])], F.ticker)}</select>
      ${seg('fii-kind-filter', [['', t('All')], ['trade', t('Purchases and sales')], ['income', t('Distributions')]], F.kind, t('Type'))}</div>
    <div class="card-b flush">${shown.length ? `<table class="tbl stackable"><thead><tr><th>${t('Date')}</th><th>FII</th><th>${t('Type')}</th><th>${t('Detail')}</th><th class="r">${t('Amount')}</th><th><span class="sr">${t('Actions')}</span></th></tr></thead><tbody>
      ${shown.map(m => `<tr class="${flashed(m.id).trim()}"><td class="num meta hide-sm" style="white-space:nowrap">${m.kind === 'open' ? '—' : fmt.date(m.date, true)}</td><td class="first"><b style="font-weight:500">${esc(m.ticker)}</b><span class="sm-only muted"> · ${fiiKindLabel(m.kind)}</span></td><td class="hide-sm">${fiiKindLabel(m.kind)}</td>
        <td class="wide meta">${m.kind !== 'open' ? `<span class="sm-only">${fmt.date(m.date, true)} · </span>` : ''}${fiiMoveText(m)}${m.note ? ` · ${esc(m.note)}` : ''}</td><td class="amt">${fiiAmountHtml(m)}</td>
        <td class="r hide-sm"><button class="iconbtn" data-a="fii-delete" data-id="${m.id}" aria-label="${t('Delete')} ${esc(m.ticker)} ${fiiKindLabel(m.kind)}">${icon('x')}</button></td></tr>`).join('')}</tbody></table>
      ${mv.html}`
      : `<div class="empty"><b>${t('No movements match these filters')}</b></div>`}</div></section>
  <p class="note">${t('Monthly income repeats the last distribution of each fund on the quotas you hold today. It describes the past and is not a forecast or a recommendation. FII movements are records: they do not create transactions in your accounts.')}</p>`;
}

// ---------- drawers ----------
function fiiMoveDrawer(d) {
  const m = d.draft, tickers = fiiTickers(S), held = tickers.filter(x => fiiQtyAt(x) > 0), trade = m.kind !== 'income';
  const choices = m.kind === 'sell' ? held : tickers, isNew = m.kind === 'buy' && (m.ticker === '__new' || !tickers.length), tk = isNew ? (m.newTicker || '').trim().toUpperCase() : m.ticker;
  const qty = typedCount(m.qtyText), price = typedAmount(m.priceText || ''), fees = typedAmount(m.feesText || '0') || 0, amount = typedAmount(m.amountText || ''), opening = m.kind === 'buy' && m.opening;
  const qAt = tk && !isNew ? fiiQtyAt(tk, opening ? null : m.date) : 0;
  let line = '';
  if (trade && Number.isInteger(qty) && qty > 0 && price > 0) line = m.kind === 'sell' ? t('You receive {amount}.', { amount: fmt.money(qty * price - fees, CUR) }) + ' ' + t('You hold {n} quotas on that date.', { n: qAt })
    : t('Total: {amount}.', { amount: fmt.money(qty * price + (opening ? 0 : fees), CUR) });
  if (!trade && tk) line = qAt ? (amount > 0 ? t('{unit} per quota on {n} quotas', { unit: fmt.unit(Math.round(amount * 100 / qAt)), n: qAt }) + '.' : t('You hold {n} quotas on that date.', { n: qAt })) : t('You held no quotas of {ticker} on that date.', { ticker: esc(tk) });
  return `<div class="body">${d.error ? banner('crit', esc(d.error)) : ''}
    ${seg('fii-kind', [['buy', t('Purchase')], ['sell', t('Sale')], ['income', t('Income received')]], m.kind, t('Type'))}
    ${!choices.length && m.kind !== 'buy' ? banner('', m.kind === 'sell' ? t('You hold no quotas to sell.') : t('Record a purchase first.')) : `<div class="form-grid">
      ${tickers.length ? fld('fm-ticker', 'FII', `<select id="fm-ticker" data-c="draft" data-k="ticker" data-rerender="1">${options([...choices.map(x => [x, x]), ...(m.kind === 'buy' ? [['__new', t('New FII…')]] : [])], m.ticker)}</select>`, isNew ? '' : 'full') : ''}
      ${isNew ? fld('fm-new', t('Fund code'), inp('fm-new', 'newTicker', m.newTicker || '', 'placeholder="ABCD11" autocapitalize="characters" maxlength="8"'), tickers.length ? '' : 'full') : ''}
      ${m.kind === 'buy' ? `<div class="field full">${sw('fm-opening', m.opening, 'draft', 'data-k="opening" data-rerender="always"', t('I already held these quotas before using the app'))}</div>` : ''}
      ${trade ? fld('fm-qty', t('Quotas'), inp('fm-qty', 'qtyText', m.qtyText, 'inputmode="numeric" class="num" data-rerender="always"'))
        + fld('fm-price', opening ? t('Average price paid (R$)') : t('Price per quota (R$)'), inp('fm-price', 'priceText', m.priceText, 'inputmode="decimal" class="num" data-rerender="always" placeholder="0,00"'))
        : fld('fm-amount', t('Total received (R$)'), inp('fm-amount', 'amountText', m.amountText, 'inputmode="decimal" class="num" data-rerender="always" placeholder="0,00"'))}
      ${opening ? '' : fld('fm-date', t('Date'), `<input type="date" id="fm-date" value="${esc(m.date)}" data-c="draft" data-k="date" data-rerender="always">`)}
      ${trade && !opening ? fld('fm-fees', t('Costs and fees (R$, optional)'), inp('fm-fees', 'feesText', m.feesText, 'inputmode="decimal" class="num" data-rerender="always" placeholder="0"')) : ''}
      ${fld('fm-note', t('Note (optional)'), inp('fm-note', 'note', m.note), 'full')}</div>
    ${line ? `<p class="note"><b style="color:var(--ink)">${line}</b></p>` : ''}
    <p class="note">${opening ? t('An opening position has no date: it counts as held before every other movement.') : m.kind === 'income' ? t('Enter what was credited to you. The app works out the amount per quota from the quotas you held that day.') : t('The average price is recalculated with every purchase. A sale keeps the average price and records the result.')} ${t('It does not create a transaction in your accounts.')}</p>`}</div>
  <footer><button class="btn primary" data-a="fii-save" ${!choices.length && m.kind !== 'buy' ? 'disabled' : ''}>${m.kind === 'income' ? t('Record income') : m.kind === 'sell' ? t('Record sale') : t('Record purchase')}</button><button class="btn ghost spacer" data-a="${d.back ? 'fii-open' : 'close'}" data-id="${esc(d.back || '')}">${t('Cancel')}</button></footer>`;
}
function fiiViewDrawer(d) {
  const f = fiiSummary(S, S.today), r = f.rows.find(x => x.ticker === d.id), moves = fiiNewestFirst(S.fii.moves.filter(m => m.ticker === d.id)), a = S.fii.assets[d.id] || {};
  return `<div class="body">
    <div class="row"><span class="chip ${r.qty ? 'good' : ''}">${r.qty ? '<i></i>' + tn(r.qty, '{n} quota', '{n} quotas') : t('No quotas now')}</span><span class="note">${r.qty ? t('average {price}', { price: fmt.money(r.avg, CUR) }) : ''}</span></div>
    <div><div class="note">${t('Value at today’s prices')}</div><div class="bal num" style="font-size:26px;font-weight:500">${fmt.money(r.value, CUR)} <span class="muted" style="font-size:14px;font-weight:500">/ ${t('invested {amount}', { amount: fmt.money(r.cost, CUR) })}</span></div>
      ${r.qty ? `<div class="note" style="margin-top:4px">${t('Result')}: ${gainHtml(r.gain, r.gainPct)}</div>` : ''}</div>
    <div class="form-grid">
      ${fld('fv-price', t('Price now (R$)'), `<input type="text" inputmode="decimal" class="num" id="fv-price" value="${plain(r.price)}" data-c="fii-price" data-id="${esc(d.id)}">`)}
      ${r.last ? `<div class="field"><span>${t('Last distribution')}</span><div class="note" style="padding:9px 0">${fmt.unit(r.unit)} ${t('per quota')} · ${fmt.date(r.last.date, true)}</div></div>` : fld('fv-yield', t('Last yield per quota (R$)'), `<input type="text" inputmode="decimal" class="num" id="fv-yield" value="${plain(a.lastYield || 0)}" data-c="fii-yield" data-id="${esc(d.id)}">`)}
    </div>
    <p class="note">${a.priceDate ? t('Price updated on {date}.', { date: fmt.date(a.priceDate, true) }) : t('Price not updated in the app yet.')} ${r.last ? '' : t('The yield per quota is used until you record the first income.')}</p>
    <dl class="kv"><dt>${t('Income received')}</dt><dd class="num">${fmt.money(r.income, CUR)}</dd><dt>${t('Income a month')}</dt><dd class="num">${fmt.money(r.monthly, CUR)}${r.yieldPct === null ? '' : ` <span class="muted">· ${fmt.pct(r.yieldPct)}</span>`}</dd>
      ${r.realized ? `<dt>${t('Result of sales')}</dt><dd class="num ${r.realized > 0 ? 'pos' : 'neg'}">${fmt.money(r.realized, CUR, { sign: true })}</dd>` : ''}</dl>
    <div class="row"><button class="btn primary" data-a="fii-move" data-kind="buy" data-id="${esc(d.id)}" data-back="1">${icon('plus')}${t('Buy')}</button><button class="btn" data-a="fii-move" data-kind="sell" data-id="${esc(d.id)}" data-back="1" ${r.qty ? '' : 'disabled'}>${t('Sell')}</button><button class="btn" data-a="fii-move" data-kind="income" data-id="${esc(d.id)}" data-back="1">${t('Distribution')}</button></div>
    <div style="border-top:1px solid var(--line);padding-top:12px"><b style="font-weight:500">${t('Movements')}</b>
      <div class="list" style="margin-top:6px">${moves.map(m => `<div class="li"><span class="when" style="width:84px">${m.kind === 'open' ? '—' : fmt.date(m.date, true)}</span><span class="grow">${fiiKindLabel(m.kind)} <span class="muted">· ${fiiMoveText(m)}${m.note ? ' · ' + esc(m.note) : ''}</span></span><span class="num" style="font-weight:500">${fiiAmountHtml(m)}</span><button class="iconbtn" data-a="fii-delete" data-id="${m.id}" aria-label="${t('Delete')} ${fiiKindLabel(m.kind)}">${icon('x')}</button></div>`).join('') || `<div class="empty" style="padding:18px 0">${t('No movements yet')}</div>`}</div></div>
  </div>
  <footer><button class="btn sm ghost danger" data-a="fii-remove-ask">${t('Delete this FII')}</button><button class="btn sm ghost spacer" data-a="close">${t('Close')}</button></footer>`;
}
