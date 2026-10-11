/* Dorax Finance — clicks: savings and goals: goals, movements, the monthly hand-out, years. Joined into A in app/actions.js. */
/** A goal's movement moves real money (owner, 2026-10-09): a contribution leaves an account with debit and goes into the savings account the goal is
    kept in, a withdrawal goes the way back. One transfer row in each account, both tied to the movement, so a statement imported later finds them
    (core/merchants.js: same account, amount and day) and deleting either one takes the other and the movement with it. */
function goalTransfer(move, from, goalName) {
  const s = acct(move.accountId); if (!from || !s) return;
  const into = move.amount > 0, amt = Math.abs(move.amount), src = debitTarget(from), merchant = into ? t('Contribution to {name}', { name: goalName }) : t('Withdrawal from {name}', { name: goalName });
  const row = (a, other, amount) => { const x = { id: newId('t'), accountId: a.id, date: move.date, description: merchant, merchant, amount, currency: a.currency, type: 'transfer', categoryId: null, subcategoryId: null,
    status: 'confirmed', transferAccountId: other.id, recurring: false, notes: '', source: 'goal', sourceTxnId: null, confidence: null, splits: null, goalMoveId: move.id }; x.fingerprint = fingerprint(x.accountId, x.date, x.merchant, x.amount); return x; };
  S.transactions.push(row(src, s, into ? -amt : amt), row(s, src, into ? amt : -amt));
  S.transactions.sort((a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : 0);
  move.fromId = from.id;
}
/** The goal movement a transfer row belongs to, in whichever book it is kept: { m, book, goal }. */
function txGoalMove(x) {
  let hit = null; if (!x || !x.goalMoveId) return null;
  everyBook(() => { const m = !hit && B().goalMoves.find(k => k.id === x.goalMoveId); if (m) hit = { m, book: bookKey(), goal: goalById(m.goalId) }; return []; });
  return hit;
}
/** Takes a movement away with its transfer rows. */
function goalMoveGone(m, book) {
  S.transactions = S.transactions.filter(x => x.goalMoveId !== m.id);
  inBook(book, () => { B().goalMoves = B().goalMoves.filter(k => k !== m); });
}
/** A transfer row of a movement was edited: the other row and the movement follow its amount and date. Changed into something else, or into another
    account, it stops being the movement's: both rows are let go and the movement stays as recorded. */
function goalTxEdited(x, was) {
  const pair = S.transactions.find(k => k !== x && k.goalMoveId === x.goalMoveId), hit = txGoalMove(x);
  if (!pair || !hit || x.type !== 'transfer' || x.accountId !== was) { delete x.goalMoveId; if (pair) delete pair.goalMoveId; return; }
  Object.assign(pair, { amount: -x.amount, date: x.date }); pair.fingerprint = fingerprint(pair.accountId, pair.date, pair.merchant, pair.amount);
  Object.assign(hit.m, { amount: Math.sign(hit.m.amount) * Math.abs(x.amount), date: x.date });
}
/** What the edit form shows as already saved: the goal's starting balance. */
const goalStartDraft = g => { const was = sum(B().goalMoves.filter(m => m.goalId === g.id && isStartMove(m)).map(m => m.amount)); return { initialText: was ? plain(was) : '', startWas: was }; };
/** Whether saving the goal's form changes its monthly plan: a new goal always; an edited one when the amount for the month chosen is not what the plan
    has for it (owner, 2026-10-10). Saved with the same amount, the plan stays as it is, with any single months edited in the grid. */
const goalReplan = (d, monthly) => d.isNew || monthly !== goalPlan(goalById(d.draft.id), d.draft.from);
const GOALS_ACTIONS = {
  'goal-year'(ds) { if (ds.v) UI.goalYear = +ds.v; render(); },
  'goal-mode'(ds) { UI.goalMode = ds.v; render(); },
  // goals
  'goal-new'() {
    const from = ymOf(B().today);
    UI.drawer = { kind: 'goal-form', title: t('New goal'), isNew: true, draft: { id: null, name: '', kind: 'goal', targetText: '', deadline: '', accountId: goalSavings().length === 1 ? goalSavings()[0].id : '', monthlyText: '', from, initialText: '', note: '' } };
    renderOverlay(); const el = $('g-name'); if (el) el.focus();
  },
  'goal-open'(ds) { UI.goalMenu = false; if (!goalById(ds.id)) return A.close(); UI.drawer = { kind: 'goal-view', title: goalById(ds.id).name, id: ds.id }; renderOverlay(); },
  'goal-edit'(ds) {
    if (isYearly(goalById(ds.id))) return A['yearly-edit'](ds);      // a yearly expense has its own form (features/yearly)
    UI.goalMenu = false; const g = goalById(ds.id), from = ymOf(B().today);
    UI.drawer = { kind: 'goal-form', title: t('Edit goal'), isNew: false, draft: { id: g.id, name: g.name, kind: g.kind, targetText: g.target ? plain(g.target) : '', deadline: g.deadline || '', accountId: g.accountId || (goalSavings().length === 1 ? goalSavings()[0].id : ''), monthlyText: plain(goalPlan(g, from)), from, note: g.note || '', ...goalStartDraft(g) } };
    renderOverlay();
  },
  'goal-add-savings'() {      // from the goal form: the account form for a savings account, and back to the goal with it chosen
    const back = UI.drawer; ACCOUNTS_ACTIONS['edit-account']({ id: '', scope: inCompany() ? 'business' : 'personal', cur: BCUR() });
    UI.drawer.draft.type = 'savings'; UI.drawer.back = back; renderOverlay(); const el = $('a-name'); if (el) el.focus();
  },
  'goal-suggest'(ds) { UI.drawer.draft.monthlyText = plain(+ds.v); renderOverlay(); },
  'goal-save'() {
    const d = UI.drawer, g = d.draft, target = typedAmount(g.targetText || ''), monthly = typedAmount(g.monthlyText || '0'), initial = typedAmount(g.initialText || '0');
    if (!g.name.trim()) return fail(t('Enter a name for the goal.'), 'g-name');
    if (g.kind === 'goal' && (target === null || target <= 0)) return fail(t('Enter the target as an amount greater than zero, or choose “Fund without a target”.'), 'g-target');
    if (!g.accountId || !acct(g.accountId)) return fail(goalSavings().length ? t('Choose the savings account the goal is kept in.') : t('Add a savings account to keep the goal in.'), 'g-acct');      // a goal's money is kept in a savings account (owner, 2026-10-09)
    if (monthly === null || monthly < 0 || initial === null || initial < 0) { if (initial === null || initial < 0) d.more = true; return fail(t('Enter the amount as a number, for example 1500 or 9,90.')); }      // the amount already saved is under More options
    const replan = goalReplan(d, monthly);
    if (g.kind === 'goal' && g.deadline && replan && g.deadline < g.from) return fail(t('The target date is before the month the plan starts.'));
    const starts = d.isNew ? [] : B().goalMoves.filter(m => m.goalId === g.id && isStartMove(m)), startWas = sum(starts.map(m => m.amount));
    if (!d.isNew && goalSaved(B(), g.id) - startWas + initial < 0) return fail(t('With that amount already saved the goal would go below zero. Delete a withdrawal first.'));
    const goal = d.isNew ? { id: newId('g'), status: 'active', plan: {} } : goalById(g.id);
    Object.assign(goal, { name: g.name.trim(), kind: g.kind, target: g.kind === 'goal' ? target : null, deadline: g.kind === 'goal' && g.deadline ? g.deadline : null, accountId: g.accountId || null, note: (g.note || '').trim() });
    if (replan) {
      const lastYear = Math.max(+g.from.slice(0, 4), ...goalYears(B())), to = goal.deadline || lastYear + '-12';
      for (const y in goal.plan) goal.plan[y] = goal.plan[y].map((v, i) => y + '-' + String(i + 1).padStart(2, '0') >= g.from ? 0 : v);
      setGoalPlan(goal, g.from, to, monthly);
    }
    if (d.isNew) B().goals.push(goal);
    if (initial !== startWas) {      // the starting balance: one movement, already in the account, so it moves no money
      B().goalMoves = B().goalMoves.filter(m => !starts.slice(1).includes(m));
      if (starts[0] && initial > 0) starts[0].amount = initial;
      else if (starts[0]) B().goalMoves = B().goalMoves.filter(m => m !== starts[0]);
      else B().goalMoves.push({ id: newId('gm'), goalId: goal.id, date: B().today, amount: initial, accountId: goal.accountId, start: true, ...appName('Starting balance', 'note') });
    }
    toast(d.isNew ? t('Goal created.') : t('Goal saved.')); UI.drawer = { kind: 'goal-view', title: goal.name, id: goal.id }; render();
  },
  'goal-status'(ds) {
    const g = goalById(ds.id); g.status = ds.v; UI.goalMenu = false;
    toast({ paused: t('Goal paused. Its plan no longer takes money from the savings payment.'), active: t('Goal active again.'), done: t('Goal marked as completed.'), archived: t('Goal archived.') }[ds.v]);
    if (ds.v === 'done' || ds.v === 'archived') UI.showClosed = true;
    render();
  },
  'goal-menu'() { UI.goalMenu = !UI.goalMenu; renderOverlay(); const el = UI.goalMenu ? document.querySelector('#goal-menu button') : $('goal-menu-btn'); if (el) el.focus(); },      // the rest of what is done to a goal (goals.view.js)
  'goal-delete-ask'() {
    UI.goalMenu = false; const g = goalById(UI.drawer.id); if (!g) return;
    const n = B().goalMoves.filter(m => m.goalId === g.id).length;
    confirmBox({ critical: n > 0, title: t('Delete {name}?', { name: g.name }), label: t('Delete goal'),
      text: n ? tn(n, 'The goal, its plan and its {n} movement ({amount} saved) are deleted. Money in your accounts is not touched. This can’t be undone.', 'The goal, its plan and its {n} movements ({amount} saved) are deleted. Money in your accounts is not touched. This can’t be undone.', { amount: fmt.money(goalSaved(B(), g.id), BCUR()) }) : t('The goal and its plan are deleted. This can’t be undone.'),
      run() { const gone = new Set(B().goalMoves.filter(m => m.goalId === g.id).map(m => m.id)); S.transactions.forEach(x => { if (gone.has(x.goalMoveId)) delete x.goalMoveId; });      // the money stays where it went
        B().goals = B().goals.filter(k => k !== g); B().goalMoves = B().goalMoves.filter(m => m.goalId !== g.id); UI.drawer = null; UI.dist = null; toast(t('Goal deleted.')); render(); } });
  },

  'goal-move'(ds) {
    UI.goalMenu = false; const g = goalById(ds.id);
    UI.drawer = { kind: 'goal-move', title: ds.dir === 'out' ? t('Withdraw from {name}', { name: g.name }) : t('Contribute to {name}', { name: g.name }), back: !!ds.back,
      draft: { goalId: g.id, dir: ds.dir, amountText: '', date: B().today, accountId: g.accountId || '', fromId: '', note: ds.initial ? t('Starting balance') : '', start: !!ds.initial } };
    renderOverlay(); const el = $('m-amount'); if (el) el.focus();
  },
  'move-save'() {
    const d = UI.drawer, m = d.draft, amt = typedAmount(m.amountText || ''), g = goalById(m.goalId);
    if (amt === null || amt <= 0) return fail(t('Enter an amount greater than zero, for example 185,42.'), 'm-amount');
    if (!parseDate(m.date)) return fail(t('Enter a valid date.'), 'm-date');
    if (m.date > B().today) return fail(t('The date cannot be in the future.'), 'm-date');
    if (m.dir === 'out' && amt > goalSaved(B(), g.id)) return fail(t('You cannot withdraw more than is saved ({amount}).', { amount: fmt.money(goalSaved(B(), g.id), BCUR()) }));
    const mv = { id: newId('gm'), goalId: g.id, date: m.date, amount: m.dir === 'out' ? -amt : amt, accountId: g.accountId || null, note: (m.note || '').trim(), ...(m.start && m.dir !== 'out' ? { start: true } : {}) };
    B().goalMoves.push(mv); goalTransfer(mv, goalMoveFrom(m), g.name);
    flash(g.id); toast(m.dir === 'out' ? t('Withdrawal recorded.') : t('Contribution recorded.'));
    UI.drawer = d.after || (d.back ? { kind: 'goal-view', title: g.name, id: g.id } : null); UI.dist = null; render();      // d.after: where it was opened from (a yearly expense, features/yearly)
  },
  'move-delete'(ds) {
    const m = B().goalMoves.find(x => x.id === ds.id); if (!m) return;
    if (m.amount > 0 && goalSaved(B(), m.goalId) - m.amount < 0) return toast(t('Deleting this contribution would leave the goal below zero. Delete the withdrawal first.'));
    const linked = S.transactions.some(x => x.goalMoveId === m.id), book = bookKey();
    confirmBox({ title: t('Delete this movement?'), text: t('{kind} of {amount} on {date} in {name}. What is saved changes by that amount.', { kind: m.amount < 0 ? t('Withdrawal') : t('Contribution'), amount: fmt.money(Math.abs(m.amount), BCUR()), date: fmt.date(m.date, true), name: goalById(m.goalId).name }) + (linked ? ' ' + t('Its transfer between the two accounts is deleted too.') : ''), label: t('Delete movement'),
      run() { goalMoveGone(m, book); UI.dist = null; toast(t('Movement deleted.')); render(); } });
  },
  'dist-register'() {
    const ym = B().month, draft = distDraft(ym), date = draft.date, done = []; let n = 0;
    if (!parseDate(date) || date > B().today) return toast(t('Choose a date that is not in the future.'));
    for (const r of distribution(B(), ym).rows) {
      const txt = draft.vals[r.goal.id], v = txt == null ? r.pending : typedAmount(txt || '0');
      if (v > 0) { const mv = { id: newId('gm'), goalId: r.goal.id, date, amount: v, accountId: r.goal.accountId, note: '' }; B().goalMoves.push(mv); goalTransfer(mv, goalMoveFrom({ accountId: mv.accountId, fromId: draft.fromId }), r.goal.name); n++; done.push(r.goal.id); }
    }
    UI.dist = null; flash(...done); toast(tn(n, '{n} contribution recorded.', '{n} contributions recorded.')); render();
  },
  // years are shared by income, goals and fixed costs
  'goal-add-year'() {
    const years = goalYears(B()), last = years[years.length - 1], next = last + 1, prev = B().pay[last] || [];
    if (years.length > 1 && last > +B().today.slice(0, 4) && yearEmpty(B(), last)) return toast(t('{year} has no plan yet. Fill it in before adding another year.', { year: last }));
    B().pay[next] = prev.map(r => ({ ...r, values: Array(12).fill(r.values[11] || 0) }));
    B().goals.forEach(g => { g.plan[next] = Array(12).fill(0); });
    UI[UI.route === 'plan' ? 'planYear' : 'goalYear'] = next; toast(t('{year} added. Income is copied from December; goals and fixed costs start at zero.', { year: next })); render();
  },
  'goal-remove-year'(ds) {
    const y = +ds.v, years = goalYears(B());
    if (y !== years[years.length - 1] || y <= +B().today.slice(0, 4) || !yearEmpty(B(), y)) return;
    delete B().pay[y]; B().goals.forEach(g => { delete g.plan[y]; }); B().plan.lines.forEach(l => { delete l.plan[y]; });
    if (UI.goalYear === y) UI.goalYear = y - 1; if (UI.planYear === y) UI.planYear = y - 1; toast(t('{year} removed.', { year: y })); render();
  },
};
