/* Dorax Finance — clicks: what is paid once a year (yearly.view.js; the calculations: core/yearly.js). YEARLY_ACTIONS joins A in app/actions.js.
   A yearly expense is a goal with `yearly: { month, idea, cat }`; its money moves the way a goal's does (features/goals/goals.actions.js: a
   contribution is a transfer into its savings account, a withdrawal the way back). YEARLY_CHANGES joins C in app/changes.js. */
/** The category its payment goes to: the one used last time; else one whose name points to it; else Other. 'cat|sub', as catOptions writes it. */
function yearlyCatGuess(g) {
  if (g.yearly && g.yearly.cat) return g.yearly.cat;
  const want = { ipva: /auto|carro|car\b|veh|transporte|transport/i, insurance: /seguro|insurance|auto|carro|car\b|transporte/i, iptu: /casa|home|hogar|moradia|vivienda|housing/i,
    school: /educa|escola|escuela|school|colegio/i, supplies: /educa|escola|escuela|school|colegio|material/i, christmas: /regalo|presente|gift|navidad|natal|christmas/i }[g.yearly && g.yearly.idea];
  const cats = B().categories.filter(c => !c.income);
  if (want) { for (const c of cats) { const s = c.subs.find(x => want.test(x.name)); if (s) return catKey(c.id, s.id); } const c = cats.find(x => want.test(x.name)); if (c) return catKey(c.id); }
  const other = cats.find(c => c.id === 'other') || cats[cats.length - 1]; return other ? catKey(other.id) : '|';
}
const yearlyOpen = (id, extra) => { const g = goalById(id); UI.sheet = false; UI.drawer = { kind: 'yearly-view', title: g.name, id, ...(extra || {}) }; renderOverlay(); };
const YEARLY_ACTIONS = {
  /** A new one: from an idea (its name and usual month filled in), or of the person's own. */
  'yearly-new'(ds) {
    const idea = YEARLY_IDEAS.find(x => x[0] === ds.v), keep = goalSavings();
    UI.drawer = { kind: 'yearly-form', title: t('New yearly expense'), isNew: true, draft: { id: null, idea: idea ? idea[0] : '', name: idea ? t(idea[1]) : '', costText: '', month: idea && idea[2] ? String(idea[2]) : '', accountId: keep.length === 1 ? keep[0].id : '', savedText: '' } };
    renderOverlay(); const el = $(idea ? 'yr-cost' : 'yr-name'); if (el) el.focus();
  },
  'yearly-edit'(ds) {
    const g = goalById(ds.id); if (!g) return;
    const done = goalMonth(B(), g.id, ymOf(B().today));
    UI.drawer = { kind: 'yearly-form', title: t('Edit {name}', { name: g.name }), isNew: false, draft: { id: g.id, idea: g.yearly.idea || '', name: g.name, costText: plain(g.target || 0), month: String(g.yearly.month), accountId: g.accountId || '', had: goalSaved(B(), g.id) - done, doneNow: done } };
    renderOverlay();
  },
  'yearly-save'() {
    const d = UI.drawer, x = d.draft, cost = typedAmount(x.costText || ''), m = +x.month, had = d.isNew ? typedAmount(x.savedText || '0') : 0;
    if (!String(x.name || '').trim()) return fail(t('Write what it is, for example IPVA.'), 'yr-name');
    if (cost === null || cost <= 0) return fail(t('Write how much it is, for example 1800.'), 'yr-cost');
    if (!(m >= 1 && m <= 12)) return fail(t('Choose the month it is due.'), 'yr-month');
    if (!x.accountId || !acct(x.accountId)) return fail(goalSavings().length ? t('Choose the savings account you keep it in.') : t('Add a savings account to keep it in.'), 'yr-acct');
    if (had === null || had < 0) return fail(t('Enter the amount as a number, for example 1500 or 9,90.'), 'yr-saved');
    const nowYm = ymOf(B().today);
    const g = d.isNew ? { id: newId('g'), status: 'active', kind: 'goal', plan: {}, note: '', yearly: { idea: x.idea || null } } : goalById(x.id);
    const moved = !d.isNew && g.yearly.month !== m;
    Object.assign(g, { name: x.name.trim(), target: cost, accountId: x.accountId }); g.yearly.month = m;
    if (d.isNew || moved) g.deadline = yearlyDueFrom(m, B().today);
    if (d.isNew) {
      B().goals.push(g);
      if (had > 0) B().goalMoves.push({ id: newId('gm'), goalId: g.id, date: B().today, amount: had, accountId: g.accountId, start: true, ...appName('Starting balance', 'note') });
    }
    yearlyPlan(g, nowYm, Math.max(0, cost - (goalSaved(B(), g.id) - goalMonth(B(), g.id, nowYm))));
    flash(g.id); toast(d.isNew ? t('{name} added. Dorax plans it every month.', { name: g.name }) : t('{name} saved.', { name: g.name }));
    UI.drawer = { kind: 'yearly-view', title: g.name, id: g.id }; render();
  },
  'yearly-open'(ds) { if (goalById(ds.id)) yearlyOpen(ds.id); },
  /** "Set aside R$ 600": a contribution of this month's share, and back to its details. */
  'yearly-put'(ds) {
    const g = goalById(ds.id); if (!g) return; const st = yearlyState(B(), g, B().today);
    A['goal-move']({ id: g.id, dir: 'in' }); UI.drawer.draft.amountText = st.toDo ? plain(st.toDo) : ''; UI.drawer.after = { kind: 'yearly-view', title: g.name, id: g.id };
    renderOverlay(); const el = $('m-amount'); if (el) { el.focus(); el.select(); }
  },
  /** "I paid it": how much, when, with what, and in which category. */
  'yearly-pay'(ds) {
    const g = goalById(ds.id); if (!g) return;
    const with_ = yearlyPayWith(g), main = goalMoveFrom({ accountId: g.accountId }), first = with_.find(a => main && a.id === main.id) || with_.find(a => a.type !== 'credit') || with_[0];
    UI.sheet = false; UI.drawer = { kind: 'yearly-pay', title: t('Pay {name}', { name: g.name }), id: g.id, back: true, draft: { amountText: plain(g.target || 0), date: B().today, payId: first ? first.id : '', cat: yearlyCatGuess(g) } };
    renderOverlay(); const el = $('yp-amount'); if (el) { el.focus({ preventScroll: true }); el.select(); }
  },
  'yearly-paid'() {
    const d = UI.drawer, x = d.draft, g = goalById(d.id), paid = typedAmount(x.amountText || ''), a = acct(x.payId);
    if (!g) return A.close();
    if (paid === null || paid <= 0) return fail(t('Enter an amount greater than zero, for example 185,42.'), 'yp-amount');
    if (!parseDate(x.date) || x.date > B().today) return fail(t('Enter a valid date.'), 'yp-date');
    if (!a) return fail(t('Choose the account you paid it with.'), 'yp-acct');
    // 1. what was set aside comes back out of the savings account, into the account it was paid from (a card's: the main account)
    const back = Math.min(goalSaved(B(), g.id), paid), to = a.type === 'credit' ? goalMoveFrom({ accountId: g.accountId }) : a;
    if (back > 0 && g.accountId && acct(g.accountId)) { const mv = { id: newId('gm'), goalId: g.id, date: x.date, amount: -back, accountId: g.accountId, note: t('Paid') }; B().goalMoves.push(mv); goalTransfer(mv, to, g.name); }
    // 2. the payment itself, in its category
    const [cat, sub] = String(x.cat || '|').split('|'), tx = { id: newId('t'), accountId: a.id, date: x.date, description: g.name, merchant: g.name, amount: -paid, currency: a.currency, type: 'expense', categoryId: cat || null, subcategoryId: sub || null,
      status: 'confirmed', transferAccountId: null, recurring: false, notes: '', source: 'manual', sourceTxnId: null, confidence: null, splits: null, yearlyId: g.id };
    tx.fingerprint = fingerprint(tx.accountId, tx.date, tx.merchant, tx.amount); S.transactions.push(tx); S.transactions.sort((p, q) => p.date < q.date ? 1 : p.date > q.date ? -1 : 0);
    // 3. next year's
    g.yearly.cat = x.cat || null; yearlyRoll(g, paid, B().today);
    flash(g.id); toast(t('{name} paid. Next year’s has started: {amount} a month.', { name: g.name, amount: fmt.money(goalPlan(g, addMonths(ymOf(B().today), 1)), BCUR(), { trim: true }) }));
    UI.drawer = { kind: 'yearly-view', title: g.name, id: g.id }; UI.dist = null; render();
  },
  'yearly-delete'() {
    const g = goalById(UI.drawer.draft.id); if (!g) return;
    const saved = goalSaved(B(), g.id);
    confirmBox({ title: t('Delete {name}?', { name: g.name }), label: t('Delete'),
      text: saved > 0 ? t('Dorax stops planning it. The {amount} you set aside stay in your savings account.', { amount: fmt.money(saved, BCUR(), { trim: true }) }) : t('Dorax stops planning it.'),
      run() { const gone = new Set(B().goalMoves.filter(m => m.goalId === g.id).map(m => m.id)); S.transactions.forEach(k => { if (gone.has(k.goalMoveId)) delete k.goalMoveId; });
        B().goals = B().goals.filter(k => k !== g); B().goalMoves = B().goalMoves.filter(m => m.goalId !== g.id); UI.drawer = null; UI.dist = null; toast(t('{name} deleted.', { name: g.name })); render(); } });
  },
};
const YEARLY_CHANGES = {
  /** An amount, as it is typed: the form's sentence, or the payment's steps, follow it. */
  'yearly-live'(el) {
    const d = UI.drawer; if (!d || !d.draft) return; d.draft[el.dataset.k] = el.value;
    const p = document.querySelector(d.kind === 'yearly-pay' ? '.yr-steps' : '.yr-preview'); if (p) p.innerHTML = d.kind === 'yearly-pay' ? yearlyPaySteps(d) : yearlyPreview(d.draft);
  },
};
