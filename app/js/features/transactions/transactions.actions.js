/* Dorax Finance — clicks: transactions: filters, pages, the form, splits. Joined into A in app/actions.js. */
const TX_RESET = { q: '', month: '', scope: 'personal', account: '', category: '', type: '', status: '', page: 1 };

const TRANSACTIONS_ACTIONS = {
  'filter-cat'(ds) { Object.assign(UI.tx, TX_RESET, { month: ds.all ? '' : 'current', category: ds.cat }); UI.drawer = null; go('transactions'); },
  'view-account'(ds) { Object.assign(UI.tx, TX_RESET, { account: ds.id, scope: '' }); go('transactions'); },
  /** Back to the view the table opens on: the month in the top bar, household accounts, nothing typed in the search. */
  'clear-filters'() { Object.assign(UI.tx, TX_DEFAULT, { page: 1 }); render(); const el = $('tx-filters-btn'); if (el) el.focus({ preventScroll: true }); },
  'tx-all-months'() { Object.assign(UI.tx, { month: '', page: 1 }); render(); const el = $('tx-filters-btn'); if (el) el.focus({ preventScroll: true }); },
  'tx-drop'(ds) { UI.tx[ds.k] = TX_DEFAULT[ds.k]; if (ds.k === 'account') UI.tx.scope = TX_DEFAULT.scope; UI.tx.page = 1; render(); const el = document.querySelector('.fchip') || $('tx-filters-btn'); if (el) el.focus({ preventScroll: true }); },
  'tx-filters'() { const draft = {}; TX_KEYS.forEach(k => { draft[k] = UI.tx[k]; }); UI.drawer = { kind: 'tx-filters', title: t('Filters'), pop: true, draft }; renderOverlay(); const el = $('tx-month'); if (el) el.focus(); },
  'txf-clear'() { Object.assign(UI.drawer.draft, TX_DEFAULT); delete UI.drawer.draft.q; renderOverlayKeepFocus(); const el = $('tx-month'); if (el) el.focus(); },
  'txf-apply'() { Object.assign(UI.tx, UI.drawer.draft, { page: 1 }); UI.drawer = null; render(); const el = $('tx-filters-btn'); if (el) el.focus({ preventScroll: true }); },
  /** One page back or forward. The list is redrawn, its top is brought back into view, and the keyboard stays on the button that was pressed. */
  'tx-page'(ds) { UI.tx.page = (UI.tx.page || 1) + (ds.v === 'next' ? 1 : -1); $('tx-list').innerHTML = txList(); const card = $('tx-card');
    if (card && card.getBoundingClientRect().top < 0) card.scrollIntoView({ block: 'start', behavior: reducedMotion() ? 'auto' : 'smooth' });
    const same = document.querySelector(`.pager [data-v="${ds.v}"]`), el = same && !same.disabled ? same : document.querySelector('.pager button:not(:disabled)'); if (el) el.focus({ preventScroll: true }); },
  sort(ds) { if (UI.tx.sort === ds.k) UI.tx.dir *= -1; else { UI.tx.sort = ds.k; UI.tx.dir = ds.k === 'merchant' ? 1 : -1; } UI.tx.page = 1; $('tx-list').innerHTML = txList(); const el = document.querySelector(`#tx-list [data-a="sort"][data-k="${ds.k}"]`); if (el) el.focus({ preventScroll: true }); },
  // transactions
  'open-tx'(ds) {
    const x = S.transactions.find(k => k.id === ds.id); if (!x) return;
    UI.drawer = { kind: 'tx', title: t('Edit transaction'), isNew: false, original: catKey(x.categoryId, x.subcategoryId), draft: { ...x, amountText: centsToDecimal(Math.abs(x.amount)), dir: x.amount < 0 ? 'out' : 'in', catKey: catKey(x.categoryId, x.subcategoryId),
      splits: x.splits ? x.splits.map(s => ({ catKey: catKey(s.categoryId, s.subcategoryId), amountText: centsToDecimal(Math.abs(s.amount)) })) : null } };
    renderOverlay();
  },
  'new-tx'() {
    if (!S.accounts.length) return toast(t('Add an account first.'));
    UI.drawer = { kind: 'tx', title: t('Add transaction'), isNew: true, draft: { id: null, accountId: UI.tx.account || (personal()[0] || S.accounts[0]).id, date: S.today, description: '', merchant: '', amountText: '', dir: 'out', type: 'expense', catKey: '|', status: 'confirmed', transferAccountId: null, recurring: false, notes: '', source: 'manual', sourceTxnId: null, confidence: null, splits: null } };
    renderOverlay(); const el = $('d-merchant'); if (el) el.focus();
  },
  'split-on'() { const x = UI.drawer.draft; x.splits = [{ catKey: x.catKey, amountText: x.amountText }, { catKey: '|', amountText: '0.00' }]; renderOverlay(); },
  'split-off'() { const x = UI.drawer.draft; x.catKey = x.splits[0].catKey; x.splits = null; renderOverlay(); },
  'split-add'() { UI.drawer.draft.splits.push({ catKey: '|', amountText: '0.00' }); renderOverlay(); },
  'split-remove'(ds) { UI.drawer.draft.splits.splice(+ds.i, 1); renderOverlay(); },
  'ask-delete'() {
    const x = S.transactions.find(k => k.id === UI.drawer.draft.id); if (!x) return;
    confirmBox({ title: t('Delete this transaction?'), text: t('{name}, {amount}, {date}. It stops counting in every total. This can’t be undone.', { name: x.merchant, amount: fmt.money(x.amount, x.currency), date: fmt.date(x.date, true) }), label: t('Delete transaction'),
      run() { S.transactions = S.transactions.filter(k => k !== x); UI.drawer = null; toast(t('Transaction deleted.')); render(); } });
  },

  'ignore-tx'() { const x = S.transactions.find(k => k.id === UI.drawer.draft.id); x.status = x.status === 'ignored' ? 'confirmed' : 'ignored'; UI.drawer = null; toast(x.status === 'ignored' ? t('Transaction ignored. It no longer counts in totals.') : t('Transaction restored.')); render(); },
  'save-tx'() {
    const d = UI.drawer, x = d.draft, abs = typedAmount(x.amountText), biz = isBiz(x.accountId);
    if (!x.merchant.trim()) return fail(t('Enter a merchant or description.'));
    if (!parseDate(x.date)) return fail(t('Enter a valid date.'));
    if (abs === null || abs === 0) return fail(t('Enter an amount greater than zero, for example 185,42.'));
    const sign = x.type === 'expense' ? -1 : x.type === 'income' ? 1 : x.dir === 'in' ? 1 : -1, total = Math.abs(abs);
    let splits = null;
    if (x.splits && x.type !== 'transfer' && !biz) {
      const parts = x.splits.map(s => ({ k: s.catKey.split('|'), a: Math.abs(typedAmount(s.amountText) || 0) }));
      if (parts.reduce((s, p) => s + p.a, 0) !== total) return fail(t('The split lines must add up to the transaction total.'));
      if (parts.some(p => p.a === 0)) return fail(t('Every split line needs an amount.'));
      splits = parts.map(p => ({ categoryId: p.k[0] || 'other', subcategoryId: p.k[1] || null, amount: sign * p.a }));
    }
    const [c, s] = (splits ? catKey(splits[0].categoryId, splits[0].subcategoryId) : x.catKey).split('|'), noCat = x.type === 'transfer' || biz;
    const prev = d.isNew ? null : S.transactions.find(k => k.id === x.id);
    const next = { id: x.id || newId('t'), accountId: x.accountId, date: x.date, description: x.description || x.merchant.trim(), merchant: x.merchant.trim(), amount: sign * total, currency: acct(x.accountId).currency, type: x.type,
      categoryId: noCat ? null : c || 'other', subcategoryId: noCat ? null : s || null, status: x.status, transferAccountId: x.type === 'transfer' ? x.transferAccountId || null : null,
      recurring: !!x.recurring, notes: x.notes, source: x.source, sourceTxnId: x.sourceTxnId, confidence: x.confidence, splits };
    next.fingerprint = fingerprint(next.accountId, next.date, next.merchant, next.amount);
    if (prev) Object.assign(prev, next); else S.transactions.push(next);
    S.transactions.sort((a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : 0);
    UI.rulePrompt = null;
    if (prev && !splits && !noCat && d.original !== catKey(next.categoryId, next.subcategoryId) && next.categoryId !== 'other') {
      const rule = matchRule(next.description, next.accountId, S.rules);
      if (!rule || rule.categoryId !== next.categoryId || (rule.subcategoryId || null) !== next.subcategoryId) {
        const key = normalizeText(next.merchant), count = S.transactions.filter(k => normalizeText(k.merchant) === key && k.categoryId === next.categoryId && (k.subcategoryId || null) === next.subcategoryId).length;
        const pattern = normalizeText(next.description).includes(key) ? key : normalizeText(next.description).split(' ').slice(0, 3).join(' ');
        UI.rulePrompt = { merchant: next.merchant, pattern, categoryId: next.categoryId, subcategoryId: next.subcategoryId, count, label: catName(next.subcategoryId || next.categoryId) };
      }
    }
    UI.drawer = null; toast(prev ? t('Transaction saved.') : t('Transaction added.'));
    if (UI.rulePrompt && UI.route !== 'transactions') go('transactions'); else render();
  },
  'rule-from-prompt'() { const p = UI.rulePrompt; S.rules.push({ id: newId('r'), pattern: p.pattern, merchant: p.merchant, categoryId: p.categoryId, subcategoryId: p.subcategoryId, priority: 10, accountId: null, active: true, transfer: false }); UI.rulePrompt = null; toast(t('Rule created: “{pattern}” → {label}.', { pattern: p.pattern, label: p.label })); render(); },
  'dismiss-prompt'() { UI.rulePrompt = null; render(); },
};
