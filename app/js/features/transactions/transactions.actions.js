/* Dorax Finance — clicks: transactions: filters, pages, the form, splits. Joined into A in app/actions.js. */
const TX_RESET = { q: '', month: '', account: '', category: '', type: '', status: '', page: 1 };      // the side is the one on screen (transactions.view.js)
/** The other row of a payment to yourself (transaction-form.view.js): the household's income for the company's transfer, and the other way round. */
const linkedRow = x => x && x.linkId ? S.transactions.find(k => k.linkId === x.linkId && k !== x) || null : null;
/** The household's row of a payment to yourself, made or brought in line with the company's: the same day, what arrived, in the household's
    income group the person chose; it names the company (or its account) as where it came from. */
function homeRowSync(co, home, cents, key) {
  const [c, sub] = String(key || '|').split('|'), from = (S.company || {}).name || acct(co.accountId).name, row = linkedRow(co);
  const next = { accountId: home.id, date: co.date, description: co.description || co.merchant, merchant: from, amount: cents, currency: home.currency, type: 'income',
    categoryId: c || 'other', subcategoryId: sub || null, status: co.status === 'ignored' ? 'ignored' : 'confirmed', transferAccountId: co.accountId, linkId: co.linkId };
  if (row) Object.assign(row, next);
  else S.transactions.push({ id: newId('t'), recurring: false, notes: '', source: 'manual', sourceTxnId: null, confidence: null, splits: null, ...next });
  const r = row || S.transactions[S.transactions.length - 1]; r.fingerprint = fingerprint(r.accountId, r.date, r.merchant, r.amount);
}

/** A field the person set by hand: the sentence no longer writes over it. */
function txTouched(k) { const d = UI.drawer; (d.touched = d.touched || {})[k] = true; }
/** After the kind changed: the direction that goes with it, and no group of the other kind. */
function txKind(x) {
  if (x.type === 'income') x.dir = 'in'; else if (x.type === 'expense') x.dir = 'out';
  // a transfer leaves from the money in the account, not from the card's credit (owner, 2026-10-09): the credit chosen for an expense is let go;
  // the credit can still be chosen under "Leaves from"
  if (x.type === 'transfer') { const a = acct(x.accountId), m = a && a.type === 'credit' ? cardMain(a) : null; if (m && m !== a) { x.accountId = m.id; delete x.viaCard; } }
  const c = (isBiz(x.accountId) ? companyCats() : S.categories).find(k => k.id === (x.catKey || '|').split('|')[0]);
  if (c && (x.type === 'income' || x.type === 'expense') && !!c.income !== (x.type === 'income')) x.catKey = '|';
}
/** The sentence, read into the form (core/say.js). Only what it says is written; a field it does not mention goes back to what the panel opened
    with, and a field the person set by hand is left alone. */
function applySay(d) {
  const x = d.draft, base = d.base = d.base || { ...x }, hand = d.touched || {}, r = d.said = readSay(d.say, { today: S.today, accounts: sideAccounts((acct(base.accountId) || {}).scope), categories: S.categories, companyCategories: companyCats(), rules: S.rules, transactions: S.transactions, accountId: base.accountId });
  const put = (k, v) => { if (!hand[k]) x[k] = v; };
  if (!hand.accountId) delete x.viaCard;
  put('type', r.type || base.type); put('accountId', r.accountId || base.accountId);
  put('transferAccountId', r.toAccountId && r.toAccountId !== x.accountId ? r.toAccountId : base.transferAccountId);
  put('dir', x.type === 'income' ? 'in' : x.type === 'expense' ? 'out' : base.dir);
  put('date', r.date || base.date); put('amountText', r.amount != null ? plain(r.amount) : base.amountText);
  put('catKey', r.categoryId ? catKey(r.categoryId, r.subcategoryId) : base.catKey);
  if (x.type !== 'income' && x.type !== 'expense' && !hand.catKey) x.catKey = base.catKey;
  // with no name in the sentence ("recibí 3000"), the group's name stands for it, so the entry can still be saved as it is
  const [c, s] = x.catKey.split('|'), cat = (isBiz(x.accountId) ? companyCats() : S.categories).find(k => k.id === c), sub = cat && cat.subs.find(k => k.id === s);
  put('merchant', r.merchant || (r.categoryId && cat ? (sub || cat).name : r.amount != null && x.type === 'transfer' ? t('Transfer') : r.amount != null && x.type === 'income' ? t('Income') : base.merchant));
  txKind(x);
  // "débito" in the sentence: on a card with an account behind it, the expense comes out of that account (transaction-form.view.js)
  if (x.type === 'expense' && !hand.accountId && /\bd[ée]bito\b/i.test(d.say || '')) { const card = acct(x.accountId), deb = cardDebitAcct(card); if (deb) { x.viaCard = card.id; x.accountId = deb.id; if (!hand.merchant) x.merchant = x.merchant.replace(/\s*\bd[ée]bito\b\s*/i, ' ').trim() || x.merchant; } }
}

const TRANSACTIONS_ACTIONS = {
  'filter-cat'(ds) { Object.assign(UI.tx, TX_RESET, { month: ds.all ? '' : 'current', category: ds.cat }); UI.drawer = null; go('transactions'); },
  'filter-q'(ds) { Object.assign(UI.tx, TX_RESET, { month: 'current', q: ds.q || '' }); UI.drawer = null; go('transactions'); },      // a merchant's transactions of the month (Reports)
  /** An account's transactions, on its own side: an account of the other side takes the app to that side first. */
  'view-account'(ds) { const a = acct(ds.id); if (a && (a.scope === 'business') !== (UI.space === 'business')) toSideOf(a); Object.assign(UI.tx, TX_RESET, { account: ds.id }); go('transactions'); },
  /** Back to the view the table opens on: the month in the top bar, the side's accounts, nothing typed in the search. */
  'clear-filters'() { Object.assign(UI.tx, TX_DEFAULT, { page: 1 }); render(); const el = $('tx-filters-btn'); if (el) el.focus({ preventScroll: true }); },
  'tx-pairs'() { UI.drawer = { kind: 'pairs', title: t('Moves between your accounts?') }; renderOverlay(); },      // features/imports/pairs.js
  'pair-yes'(ds) { const e = S.transactions.find(x => x.id === ds.e), i = S.transactions.find(x => x.id === ds.i); if (e && i) makePair(e, i); toast(t('Made a transfer: it no longer counts as spending or as income.')); render(); renderOverlay(); },
  'pair-no'(ds) { S.pairsNo = (S.pairsNo || []).concat(pairKey({ id: ds.e }, { id: ds.i })); render(); renderOverlay(); },
  'tx-inbox'() { Object.assign(UI.tx, TX_DEFAULT, { month: '', category: 'none', page: 1 }); render(); const el = $('tx-card'); if (el) el.scrollIntoView({ block: 'start' }); },      // every row of the side without a category
  'tx-all-months'() { Object.assign(UI.tx, { month: '', page: 1 }); render(); const el = $('tx-filters-btn'); if (el) el.focus({ preventScroll: true }); },
  'tx-drop'(ds) { UI.tx[ds.k] = TX_DEFAULT[ds.k]; UI.tx.page = 1; render(); const el = document.querySelector('.fchip') || $('tx-filters-btn'); if (el) el.focus({ preventScroll: true }); },
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
    UI.drawer = { kind: 'tx', title: t('Edit transaction'), isNew: false, original: catKey(x.categoryId, x.subcategoryId), draft: { ...x, amountText: centsToDecimal(Math.abs(x.amount)), dir: x.amount < 0 ? 'out' : 'in', refund: x.type === 'expense' && x.amount > 0, catKey: catKey(x.categoryId, x.subcategoryId),
      splits: x.splits ? x.splits.map(s => ({ catKey: catKey(s.categoryId, s.subcategoryId), amountText: centsToDecimal(Math.abs(s.amount)) })) : null } };
    const home = linkedRow(x); if (home && isBiz(x.accountId)) Object.assign(UI.drawer.draft, { homeKey: catKey(home.categoryId, home.subcategoryId), homeAmountText: centsToDecimal(Math.abs(home.amount)) });      // paying yourself
    renderOverlay();
  },
  // 2026-10-09 (owner: "I went into the PJ side, added an income and it was recorded in the household account"): a new transaction starts in an
  // account of the side on screen, never the other's. Before, it always started in the household's main account, and the form then listed only
  // the household's accounts. The account filtered in Transactions comes first when it is on this side.
  'new-tx'() {
    const side = UI.space === 'business' ? 'business' : 'personal', mine = sideAccounts(side), f = acct(UI.tx.account);
    if (!mine.length) return needAccount();
    const start = f && mine.includes(f) ? f : mainOf(side, side === 'business' ? BCUR() : BASE_CURRENCY) || mainOf(side) || mine[0];
    UI.drawer = { kind: 'tx', title: t('Add transaction'), isNew: true, draft: { id: null, accountId: start.id, date: S.today, description: '', merchant: '', amountText: '', dir: 'out', type: 'expense', catKey: '|', status: 'confirmed', transferAccountId: null, recurring: false, notes: '', source: 'manual', sourceTxnId: null, confidence: null, splits: null } };
    renderOverlay(); const el = $('d-say') || $('d-amount'); if (el) el.focus();
  },
  /** The kind, from its three buttons. An expense goes out and an income comes in; a group that belongs to the other kind is let go. */
  'tx-type'(ds) { const d = UI.drawer, x = d.draft; x.type = ds.v; txTouched('type'); txKind(x); renderOverlayKeepFocus(); const el = document.querySelector(`.tx-kind [data-v="${ds.v}"]`); if (el) el.focus({ preventScroll: true }); },
  /** A group, at a touch. A second touch on the chosen one takes it off. */
  'tx-cat'(ds) { const x = UI.drawer.draft; x.catKey = x.catKey === ds.k ? '|' : ds.k; txTouched('catKey'); renderOverlayKeepFocus(); const el = [...document.querySelectorAll('.tx-pick[data-k]')].find(b => b.dataset.k === ds.k); if (el) el.focus({ preventScroll: true }); },
  // the month's limit for the expense's group (transaction-form.view.js): opened, saved as a line of the plan spent in several purchases, or let go
  'tx-limit-open'() { const d = UI.drawer; d.limitOpen = true; d.limitError = null; renderOverlayKeepFocus(); const el = $('d-limit'); if (el) el.focus(); },
  'tx-limit-cancel'() { const d = UI.drawer; d.limitOpen = false; d.limitText = ''; d.limitError = null; renderOverlayKeepFocus(); const el = document.querySelector('.tx-lim-add'); if (el) el.focus({ preventScroll: true }); },
  'tx-limit-save'() {
    const d = UI.drawer, x = d.draft, f = txLimitAt(x), v = typedAmount(d.limitText || ''); if (!f || f.l) return;
    if (v === null || v <= 0) { d.limitError = t('Enter the limit as a number, for example 800 or 1200,50.'); renderOverlayKeepFocus(); const el = $('d-limit'); if (el) el.focus(); return; }
    inBook(f.key, () => { const l = { id: newId('pl'), categoryId: f.c, subcategoryId: f.s || undefined, plan: {}, end: null, name: f.name, pay: 'budget', note: '' }; B().plan.lines.push(l); setLinePlan(B(), l, ymOf(x.date || S.today), v); });
    d.limitOpen = false; d.limitText = ''; d.limitError = null; save(); toast(t('Limit saved. You will find it in Plan.')); renderOverlayKeepFocus();
    const el = $('d-amount'); if (el) el.focus({ preventScroll: true });
  },
  /** Credit or debit for an expense on a card: debit records it in the account behind the card, credit back on the card. */
  'tx-pay'(ds) {
    const x = UI.drawer.draft, acc0 = acct(x.accountId), acc = acc0 && acc0.type !== 'credit' ? cardMain(acc0) : acc0, card = acct(x.viaCard) || (acc && acc.type === 'credit' ? acc : cardCredit(acc)); if (!card) return;      // the account itself chosen: its card's credit
    const deb = ds.v === 'debit' ? cardDebitEnsure(card) : cardDebitAcct(card); if (ds.v === 'debit' && !deb) return;      // no debit account yet: it is made now
    if (ds.v === 'debit') { x.viaCard = card.id; x.accountId = debitTarget(deb).id; } else { x.accountId = card.id; delete x.viaCard; }      // a savings account's debit: its balance to spend
    if (UI.drawer.kind === 'tx') txTouched('accountId'); renderOverlayKeepFocus(); const el = document.querySelector(`.tx-paywith [data-v="${ds.v}"]`); if (el) el.focus({ preventScroll: true });
  },
  /** A transfer's account: which of the card's money it is (transaction-form.view.js, txPockets). */
  'tx-pocket'(ds) { const x = UI.drawer.draft; x.accountId = ds.id; delete x.viaCard; txTouched('accountId'); renderOverlayKeepFocus(); const el = document.querySelector(`.tx-pocket [data-id="${ds.id}"]`); if (el) el.focus({ preventScroll: true }); },
  'tx-cats-all'() { UI.drawer.allCats = true; renderOverlayKeepFocus(); const el = $('d-cat'); if (el) el.focus({ preventScroll: true }); },
  'tx-more'() { const d = UI.drawer, open = document.querySelector('.tx-more').getAttribute('aria-expanded') === 'true'; d.more = !open; renderOverlayKeepFocus(); const el = document.querySelector('.tx-more'); if (el) el.focus({ preventScroll: true }); },
  'split-on'() { const x = UI.drawer.draft; x.splits = [{ catKey: x.catKey, amountText: x.amountText }, { catKey: '|', amountText: '0.00' }]; renderOverlay(); },
  'split-off'() { const x = UI.drawer.draft; x.catKey = x.splits[0].catKey; x.splits = null; renderOverlay(); },
  'split-add'() { UI.drawer.draft.splits.push({ catKey: '|', amountText: '0.00' }); renderOverlay(); },
  'split-remove'(ds) { UI.drawer.draft.splits.splice(+ds.i, 1); renderOverlay(); },
  'ask-delete'() {
    const x = S.transactions.find(k => k.id === UI.drawer.draft.id); if (!x) return;
    const hit = txGoalMove(x), pair = linkedRow(x), later = x.inst ? instGroup(S, x.inst.g).filter(k => k !== x && k.inst.i > x.inst.i) : [];      // an installment takes the ones after it (features/installments)      // a goal's contribution or withdrawal: its other row and the movement go with it (features/goals); paying yourself: the other side's row
    confirmBox({ title: t('Delete this transaction?'), text: t('{name}, {amount}, {date}. It stops counting in every total. This can’t be undone.', { name: x.merchant, amount: fmt.money(x.amount, x.currency), date: fmt.date(x.date, true) }) + (hit ? ' ' + t('It is a movement of the goal {name}: the goal and the other account change too.', { name: hit.goal ? hit.goal.name : '' }) : '') + (later.length ? ' ' + tn(later.length, 'It is installment {i} of {k}: the one after it goes too ({amount}). The ones before stay.', 'It is installment {i} of {k}: the {n} after it go too ({amount}). The ones before stay.', { i: x.inst.i, k: x.inst.n, amount: fmt.money(-sum(later.map(k => k.amount)), x.currency) }) : ''), label: t('Delete transaction'),
      run() { if (hit) goalMoveGone(hit.m, hit.book); S.transactions = S.transactions.filter(k => k !== x && k !== pair && !later.includes(k)); UI.drawer = null; toast(pair ? t('Deleted on both sides: the company’s transfer and the household’s income.') : t('Transaction deleted.')); render(); } });
  },

  'ignore-tx'() { const x = S.transactions.find(k => k.id === UI.drawer.draft.id), pair = linkedRow(x); x.status = x.status === 'ignored' ? 'confirmed' : 'ignored'; if (pair) pair.status = x.status; UI.drawer = null; toast(x.status === 'ignored' ? t('Transaction ignored. It no longer counts in totals.') : t('Transaction restored.')); render(); },
  'save-tx'() {
    const d = UI.drawer, x = d.draft;
    if (x.type === 'expense') x.accountId = cardRoute(x.accountId);      // a savings account whose card has credit only: on its invoice
    const homeAcct = toHome(x) ? acct(x.transferAccountId) : null; if (homeAcct) x.dir = 'out';      // paying yourself: always out of the company
    const abs = typedAmount(x.amountText), biz = isBiz(x.accountId);
    if (abs === null || abs === 0) return fail(t('Enter an amount greater than zero, for example 185,42.'), 'd-amount');
    if (!x.merchant.trim()) return fail(t('Enter a merchant or description.'), 'd-merchant');
    if (!parseDate(x.date)) return fail(t('Enter a valid date.'), 'd-date');
    const homeAmt = !homeAcct ? null : homeAcct.currency === acct(x.accountId).currency ? Math.abs(abs) : Math.abs(typedAmount(x.homeAmountText) || 0);
    if (homeAcct && !homeAmt) return fail(t('Enter what arrived at home, in {cur}.', { cur: homeAcct.currency }), 'd-home-amt');
    const sign = x.type === 'expense' ? (x.refund ? 1 : -1) : x.type === 'income' ? 1 : x.dir === 'in' ? 1 : -1, total = Math.abs(abs);
    let splits = null;
    if (x.splits && x.type !== 'transfer' && !biz) {
      const parts = x.splits.map(s => ({ k: s.catKey.split('|'), a: Math.abs(typedAmount(s.amountText) || 0) }));
      if (parts.reduce((s, p) => s + p.a, 0) !== total) return fail(t('The split lines must add up to the transaction total.'));
      if (parts.some(p => p.a === 0)) return fail(t('Every split line needs an amount.'));
      splits = parts.map(p => ({ categoryId: p.k[0] || 'other', subcategoryId: p.k[1] || null, amount: sign * p.a }));
    }
    // a company movement can be tied to one of the company's own fixed costs or income rows, never to a household category (and the other way round)
    const [c0, s0] = (splits ? catKey(splits[0].categoryId, splits[0].subcategoryId) : x.catKey || '|').split('|'), tree = biz ? companyCats() : S.categories, known = tree.find(k => k.id === c0);
    const c = known ? c0 : '', s = known && known.subs.some(k => k.id === s0) ? s0 : '', noCat = x.type === 'transfer' || (biz && !c);
    const prev = d.isNew ? null : S.transactions.find(k => k.id === x.id);
    if (d.isNew && d.said && d.said.amount != null && (d.say || '').trim()) x.source = 'say';      // written as a sentence: kept, so its use can be counted later
    const next = { id: x.id || newId('t'), accountId: x.accountId, date: x.date, description: x.description || x.merchant.trim(), merchant: x.merchant.trim(), amount: sign * total, currency: acct(x.accountId).currency, type: x.type,
      categoryId: noCat ? null : c || 'other', subcategoryId: noCat ? null : s || null, status: x.status, transferAccountId: x.type === 'transfer' ? x.transferAccountId || null : null,
      recurring: !!x.recurring, notes: x.notes, source: x.source, sourceTxnId: x.sourceTxnId, confidence: x.confidence, splits };
    next.fingerprint = fingerprint(next.accountId, next.date, next.merchant, next.amount);
    const was = prev && prev.accountId;
    const homeSide = prev && prev.linkId && !isBiz(prev.accountId);      // the household's row of a payment to yourself, edited on its own: it stays linked
    next.linkId = homeAcct ? (prev && prev.linkId) || newId('lk') : homeSide ? prev.linkId : null;
    if (homeSide && next.type === 'income') next.transferAccountId = prev.transferAccountId;
    if (prev && prev.linkId && !homeAcct && isBiz(prev.accountId)) S.transactions = S.transactions.filter(k => k === prev || k.linkId !== prev.linkId);      // no longer paying yourself: the household's row goes
    const parts = d.isNew ? instCount(x) : 1;      // in installments on a card: one row on each coming invoice (features/installments)
    if (prev) Object.assign(prev, next); else S.transactions.push(...instRows(next, parts, newId));
    if (homeAcct) homeRowSync(prev || next, homeAcct, homeAmt, x.homeKey || homeKeyDefault());
    if (prev && prev.goalMoveId) goalTxEdited(prev, was);      // a goal's transfer: the other row and the movement follow it
    S.transactions.sort((a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : 0);
    UI.rulePrompt = null;
    if (prev && !splits && !noCat && !biz && d.original !== catKey(next.categoryId, next.subcategoryId) && next.categoryId !== 'other') {
      const rule = matchRule(next.description, next.accountId, S.rules);
      if (!rule || rule.categoryId !== next.categoryId || (rule.subcategoryId || null) !== next.subcategoryId) {
        const key = normalizeText(next.merchant), count = S.transactions.filter(k => normalizeText(k.merchant) === key && k.categoryId === next.categoryId && (k.subcategoryId || null) === next.subcategoryId).length;
        const pattern = normalizeText(next.description).includes(key) ? key : normalizeText(next.description).split(' ').slice(0, 3).join(' ');
        UI.rulePrompt = { merchant: next.merchant, pattern, categoryId: next.categoryId, subcategoryId: next.subcategoryId, count, label: catName(next.subcategoryId || next.categoryId) };
      }
    }
    UI.drawer = null; flash(next.id); toast(prev ? t('Transaction saved.') : parts > 1 ? t('{n} installments of {amount} added, one on each invoice.', { n: parts, amount: fmt.money(instSplit(total, parts)[parts - 1], next.currency) }) : t('Transaction added.'));      // its row washes where it landed (2026-10-08)
    if (UI.rulePrompt && UI.route !== 'transactions') go('transactions'); else render();
  },
  'rule-from-prompt'() { const p = UI.rulePrompt; S.rules.push({ id: newId('r'), pattern: p.pattern, merchant: p.merchant, categoryId: p.categoryId, subcategoryId: p.subcategoryId, priority: 10, accountId: null, active: true, transfer: false }); UI.rulePrompt = null; toast(t('Rule created: “{pattern}” → {label}.', { pattern: p.pattern, label: p.label })); render(); },
  'dismiss-prompt'() { UI.rulePrompt = null; render(); },
};
