/* Dorax Finance — clicks: investments (FIIs): purchases, sales, income received. Joined into A in app/actions.js. */
const INVESTMENTS_ACTIONS = {
  // investments: purchases, sales and income received
  'fii-move'(ds) {
    const tickers = fiiTickers(S), sim = ds.sim ? simDraft() : null, simTk = sim ? sim.ticker.trim().toUpperCase() : '';
    const ticker = sim ? (tickers.includes(simTk) ? simTk : '__new') : ds.id || (ds.kind === 'buy' ? tickers[0] || '__new' : tickers.find(x => fiiQtyAt(x) > 0) || tickers[0] || '');
    UI.drawer = { kind: 'fii-move', title: t('Record movement'), back: ds.back ? ds.id : '',
      draft: { kind: ds.kind || 'buy', ticker, newTicker: sim && ticker === '__new' ? simTk : '', date: S.today, qtyText: sim ? sim.qtyText : '', priceText: sim ? sim.priceText : '', feesText: '', amountText: '', note: '', opening: false, yieldText: sim ? sim.yieldText : '' } };
    renderOverlay(); const el = $(ds.kind === 'income' ? 'fm-amount' : ticker === '__new' && !sim ? 'fm-new' : 'fm-qty'); if (el) el.focus();
  },
  'fii-kind'(ds) {
    const m = UI.drawer.draft, tickers = fiiTickers(S); m.kind = ds.v; UI.drawer.error = null;
    if (m.kind !== 'buy' && (m.ticker === '__new' || (m.kind === 'sell' && !fiiQtyAt(m.ticker)))) m.ticker = tickers.find(x => fiiQtyAt(x) > 0) || tickers[0] || '';
    overlayNow();
  },
  'fii-save'() {
    const d = UI.drawer, m = d.draft, isNew = m.kind === 'buy' && (m.ticker === '__new' || !fiiTickers(S).length), ticker = (isNew ? m.newTicker || '' : m.ticker).trim().toUpperCase(), opening = m.kind === 'buy' && m.opening;
    if (!/^[A-Z0-9]{4,8}$/.test(ticker)) return fail(t('Enter the fund code, for example ABCD11.'));
    if (!opening && !parseDate(m.date)) return fail(t('Enter a valid date.'));
    if (!opening && m.date > S.today) return fail(t('The date cannot be in the future.'));
    let move;
    if (m.kind === 'income') {
      const amount = typedAmount(m.amountText || '');
      if (amount === null || amount <= 0) return fail(t('Enter an amount greater than zero, for example 185,42.'));
      move = { ticker, kind: 'income', date: m.date, amount };
    } else {
      const qty = typedCount(m.qtyText), price = typedAmount(m.priceText || ''), fees = opening ? 0 : typedAmount(m.feesText || '0');
      if (!Number.isInteger(qty) || qty <= 0) return fail(t('Quotas must be a whole number greater than zero.'));
      if (price === null || price <= 0) return fail(t('Enter the price per quota, for example 9,80.'));
      if (fees === null || fees < 0) return fail(t('Enter the costs as a number, or leave them empty.'));
      move = { ticker, kind: opening ? 'open' : m.kind, date: opening ? '' : m.date, qty, price, fees };
      if (m.kind === 'sell' && !fiiValid(S, move)) return fail(t('You cannot sell more quotas than you hold on that date ({n}).', { n: fiiQtyAt(ticker, m.date) }));
    }
    const moveId = newId('fm'); S.fii.moves.push({ id: moveId, note: (m.note || '').trim(), ...move }); flash(moveId, ticker);
    const a = S.fii.assets[ticker] = S.fii.assets[ticker] || {}, y = typedAmount(m.yieldText || '');
    if (move.kind !== 'income' && (!a.price || (!opening && move.date >= (a.priceDate || '')))) { a.price = move.price; a.priceDate = opening ? null : move.date; }
    if (y > 0 && !a.lastYield) a.lastYield = y;
    toast({ open: t('Opening position recorded.'), buy: t('Purchase recorded.'), sell: t('Sale recorded.'), income: t('Income recorded.') }[move.kind]);
    UI.inc = null; UI.drawer = d.back ? { kind: 'fii-view', title: ticker, id: ticker } : null; render();
  },
  'fii-open'(ds) { if (!fiiTickers(S).includes(ds.id)) return A.close(); UI.drawer = { kind: 'fii-view', title: ds.id, id: ds.id }; renderOverlay(); },
  'fii-delete'(ds) {
    const m = S.fii.moves.find(x => x.id === ds.id); if (!m) return;
    if (!fiiValid(S, null, m.id)) return toast(t('A later sale depends on these quotas. Delete the sale first.'));
    confirmBox({ title: t('Delete this movement?'), text: t('{kind}, {ticker}: {detail}. The position is recalculated.', { kind: fiiKindLabel(m.kind), ticker: m.ticker, detail: m.kind === 'income' ? fmt.money(m.amount, CUR) : fiiMoveText(m) }), label: t('Delete movement'),
      run() {
        S.fii.moves = S.fii.moves.filter(x => x !== m); UI.inc = null; toast(t('Movement deleted.'));
        if (UI.drawer && UI.drawer.kind === 'fii-view' && !fiiTickers(S).includes(UI.drawer.id)) UI.drawer = null;
        render();
      } });
  },
  'fii-remove-ask'() {
    const id = UI.drawer.id, moves = S.fii.moves.filter(m => m.ticker === id), income = sum(moves.filter(m => m.kind === 'income').map(m => m.amount));
    confirmBox({ critical: moves.length > 0, title: t('Delete {name}?', { name: id }), label: t('Delete fund'),
      text: tn(moves.length, 'The fund and its {n} movement are deleted, including {amount} of income received. This can’t be undone.', 'The fund and its {n} movements are deleted, including {amount} of income received. This can’t be undone.', { amount: fmt.money(income, CUR) }),
      run() { S.fii.moves = S.fii.moves.filter(m => m.ticker !== id); delete S.fii.assets[id]; if (UI.fii.ticker === id) UI.fii.ticker = ''; UI.inc = null; UI.drawer = null; toast(t('{ticker} deleted with its movements.', { ticker: id })); render(); } });
  },
  'inc-register'() {
    const ym = ymOf(S.today), d = incDraft(ym), rows = incRows(fiiSummary(S, S.today), ym).filter(x => x.now > 0);
    if (!parseDate(d.date) || d.date > S.today) return toast(t('Choose a date that is not in the future.'));
    const ids = rows.map(x => { const id = newId('fm'); S.fii.moves.push({ id, ticker: x.r.ticker, kind: 'income', date: d.date, amount: x.now, note: '' }); return id; });
    UI.inc = null; flash(...ids); toast(tn(rows.length, '{n} income recorded: {amount}.', '{n} incomes recorded: {amount}.', { amount: fmt.money(sum(rows.map(x => x.now)), CUR) })); render();
  },
  'fii-month'(ds) { UI.fii.month = UI.fii.month === ds.ym ? null : ds.ym; UI.fii.limit = 30; render(); },
  'fii-kind-filter'(ds) { UI.fii.kind = ds.v; UI.fii.limit = 30; render(); },
};
