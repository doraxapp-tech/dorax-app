/* Dorax Finance — calculations: FIIs (position, average price, income). */
// ---------- FIIs ----------
// The position is never typed: it is replayed from movements. kind: 'open' (quotas held before using the app), 'buy', 'sell', 'income'.
// Money is integer cents; quotas are whole numbers. Average price is the weighted average cost, the usual Brazilian "preço médio".
/** Opening positions first, then by date; movements of the same day keep the order in which they were recorded. */
function fiiSorted(moves) {
  return moves.map((m, i) => [m, i]).sort((a, b) => (a[0].kind === 'open') !== (b[0].kind === 'open') ? (a[0].kind === 'open' ? -1 : 1)
    : a[0].date < b[0].date ? -1 : a[0].date > b[0].date ? 1 : a[1] - b[1]).map(x => x[0]);
}
/** Replays one ticker. Returns null when a sale would take the position below zero (used to validate before saving or deleting). */
function fiiReplay(moves, ticker, upTo) {
  const p = { ticker, qty: 0, cost: 0, realized: 0, income: 0, bought: 0, last: null };
  for (const m of fiiSorted(moves.filter(x => x.ticker === ticker))) {
    if (upTo && m.kind !== 'open' && m.date > upTo) break;
    if (m.kind === 'open' || m.kind === 'buy') { p.qty += m.qty; p.cost += m.qty * m.price + (m.fees || 0); p.bought += m.qty * m.price + (m.fees || 0); }
    else if (m.kind === 'sell') {
      if (m.qty > p.qty) return null;
      const out = Math.round(p.cost * m.qty / p.qty); p.cost -= out; p.qty -= m.qty; p.realized += m.qty * m.price - (m.fees || 0) - out;
    } else { p.income += m.amount; p.last = { date: m.date, amount: m.amount, qty: p.qty }; }
  }
  p.avg = p.qty ? Math.round(p.cost / p.qty) : 0;
  return p;
}
function fiiTickers(state) { return [...new Set([...Object.keys(state.fii.assets), ...state.fii.moves.map(m => m.ticker)])].sort(); }
/** Positions and totals. monthly = what the last distribution would pay on today's quotas: a description of the past, not a forecast. */
function fiiSummary(state, today) {
  const year = today.slice(0, 4), rows = fiiTickers(state).map(tk => {
    const p = fiiReplay(state.fii.moves, tk) || { ticker: tk, qty: 0, cost: 0, realized: 0, income: 0, avg: 0, last: null }, a = state.fii.assets[tk] || {};
    const price = a.price || p.avg, value = p.qty * price;
    // yield per quota in 1/10000 of a real, so sub-cent distributions are not lost
    const unit = p.last && p.last.qty ? Math.round(p.last.amount * 100 / p.last.qty) : (a.lastYield || 0) * 100;
    const monthly = p.last && p.last.qty ? Math.round(p.last.amount * p.qty / p.last.qty) : p.qty * (a.lastYield || 0);
    return { ...p, price, priceDate: a.priceDate || null, value, gain: value - p.cost, gainPct: p.cost ? Math.round((value - p.cost) * 1000 / p.cost) / 10 : null, unit, monthly,
      yieldPct: value ? Math.round(monthly * 10000 / value) / 100 : null, moves: state.fii.moves.filter(m => m.ticker === tk).length };
  });
  const held = rows.filter(r => r.qty > 0), cost = sum(held.map(r => r.cost)), value = sum(held.map(r => r.value)), monthly = sum(held.map(r => r.monthly));
  return { rows, held, cost, value, gain: value - cost, gainPct: cost ? Math.round((value - cost) * 1000 / cost) / 10 : null, monthly, yieldPct: value ? Math.round(monthly * 10000 / value) / 100 : null,
    received: sum(rows.map(r => r.income)), receivedYear: sum(state.fii.moves.filter(m => m.kind === 'income' && m.date.slice(0, 4) === year).map(m => m.amount)), realized: sum(rows.map(r => r.realized)) };
}
function fiiIncomeMonth(state, ym, ticker) { return sum(state.fii.moves.filter(m => m.kind === 'income' && ymOf(m.date) === ym && (!ticker || m.ticker === ticker)).map(m => m.amount)); }
/** Would the movements still make sense with this one added (or with `removeId` taken out)? */
function fiiValid(state, add, removeId) {
  const moves = state.fii.moves.filter(m => m.id !== removeId).concat(add ? [add] : []), tk = add ? add.ticker : (state.fii.moves.find(m => m.id === removeId) || {}).ticker;
  return !!fiiReplay(moves, tk);
}
/** What a purchase would change: cost, new average price, income at the given yield per quota. Nothing is recorded. */
function fiiSimulate(state, ticker, qty, price, yieldPerQuota) {
  const p = fiiReplay(state.fii.moves, ticker) || { qty: 0, cost: 0 }, cost = qty * price, newQty = p.qty + qty;
  return { cost, income: qty * yieldPerQuota, yieldPct: price ? Math.round(yieldPerQuota * 10000 / price) / 100 : null, newQty, newAvg: newQty ? Math.round((p.cost + cost) / newQty) : 0, had: p.qty };
}
