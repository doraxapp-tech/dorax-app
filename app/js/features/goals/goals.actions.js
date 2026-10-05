/* Dorax Finance — clicks: savings and goals: goals, movements, the monthly hand-out, years. Joined into A in app/actions.js. */
const GOALS_ACTIONS = {
  'goal-year'(ds) { if (ds.v) UI.goalYear = +ds.v; render(); },
  'goal-mode'(ds) { UI.goalMode = ds.v; render(); },
  // goals
  'goal-new'() {
    const from = ymOf(S.today);
    UI.drawer = { kind: 'goal-form', title: t('New goal'), isNew: true, draft: { id: null, name: '', kind: 'goal', targetText: '', deadline: '', accountId: '', monthlyText: '', from, initialText: '', note: '', replan: true } };
    renderOverlay(); const el = $('g-name'); if (el) el.focus();
  },
  'goal-open'(ds) { if (!goalById(ds.id)) return A.close(); UI.drawer = { kind: 'goal-view', title: goalById(ds.id).name, id: ds.id }; renderOverlay(); },
  'goal-edit'(ds) {
    const g = goalById(ds.id), from = ymOf(S.today);
    UI.drawer = { kind: 'goal-form', title: t('Edit goal'), isNew: false, draft: { id: g.id, name: g.name, kind: g.kind, targetText: g.target ? plain(g.target) : '', deadline: g.deadline || '', accountId: g.accountId || '', monthlyText: plain(goalPlan(g, from)), from, note: g.note || '', replan: false } };
    renderOverlay();
  },
  'goal-suggest'(ds) { UI.drawer.draft.monthlyText = plain(+ds.v); renderOverlay(); },
  'goal-save'() {
    const d = UI.drawer, g = d.draft, target = typedAmount(g.targetText || ''), monthly = typedAmount(g.monthlyText || '0'), initial = typedAmount(g.initialText || '0');
    if (!g.name.trim()) return fail(t('Enter a name for the goal.'));
    if (g.kind === 'goal' && (target === null || target <= 0)) return fail(t('Enter the target as an amount greater than zero, or choose “Fund without a target”.'));
    if (monthly === null || monthly < 0 || initial === null || initial < 0) return fail(t('Enter the amount as a number, for example 1500 or 9,90.'));
    if (g.kind === 'goal' && g.deadline && (d.isNew || g.replan) && g.deadline < g.from) return fail(t('The target date is before the month the plan starts.'));
    const goal = d.isNew ? { id: newId('g'), status: 'active', plan: {} } : goalById(g.id);
    Object.assign(goal, { name: g.name.trim(), kind: g.kind, target: g.kind === 'goal' ? target : null, deadline: g.kind === 'goal' && g.deadline ? g.deadline : null, accountId: g.accountId || null, note: (g.note || '').trim() });
    if (d.isNew || g.replan) {
      const lastYear = Math.max(+g.from.slice(0, 4), ...goalYears(S)), to = goal.deadline || lastYear + '-12';
      for (const y in goal.plan) goal.plan[y] = goal.plan[y].map((v, i) => y + '-' + String(i + 1).padStart(2, '0') >= g.from ? 0 : v);
      setGoalPlan(goal, g.from, to, monthly);
    }
    if (d.isNew) { S.goals.push(goal); if (initial > 0) S.goalMoves.push({ id: newId('gm'), goalId: goal.id, date: S.today, amount: initial, accountId: goal.accountId, start: true, ...appName('Starting balance', 'note') }); }
    toast(d.isNew ? t('Goal created.') : t('Goal saved.')); UI.drawer = { kind: 'goal-view', title: goal.name, id: goal.id }; render();
  },
  'goal-status'(ds) {
    const g = goalById(ds.id); g.status = ds.v;
    toast({ paused: t('Goal paused. Its plan no longer takes money from the savings payment.'), active: t('Goal active again.'), done: t('Goal marked as completed.'), archived: t('Goal archived.') }[ds.v]);
    if (ds.v === 'done' || ds.v === 'archived') UI.showClosed = true;
    render();
  },
  'goal-delete-ask'() {
    const g = goalById(UI.drawer.id); if (!g) return;
    const n = S.goalMoves.filter(m => m.goalId === g.id).length;
    confirmBox({ critical: n > 0, title: t('Delete {name}?', { name: g.name }), label: t('Delete goal'),
      text: n ? tn(n, 'The goal, its plan and its {n} movement ({amount} saved) are deleted. Money in your accounts is not touched. This can’t be undone.', 'The goal, its plan and its {n} movements ({amount} saved) are deleted. Money in your accounts is not touched. This can’t be undone.', { amount: fmt.money(goalSaved(S, g.id), CUR) }) : t('The goal and its plan are deleted. This can’t be undone.'),
      run() { S.goals = S.goals.filter(k => k !== g); S.goalMoves = S.goalMoves.filter(m => m.goalId !== g.id); UI.drawer = null; UI.dist = null; toast(t('Goal deleted.')); render(); } });
  },

  'goal-move'(ds) {
    const g = goalById(ds.id);
    UI.drawer = { kind: 'goal-move', title: ds.dir === 'out' ? t('Withdraw from {name}', { name: g.name }) : t('Contribute to {name}', { name: g.name }), back: !!ds.back,
      draft: { goalId: g.id, dir: ds.dir, amountText: '', date: S.today, accountId: g.accountId || '', note: ds.initial ? t('Starting balance') : '', start: !!ds.initial } };
    renderOverlay(); const el = $('m-amount'); if (el) el.focus();
  },
  'move-save'() {
    const d = UI.drawer, m = d.draft, amt = typedAmount(m.amountText || ''), g = goalById(m.goalId);
    if (amt === null || amt <= 0) return fail(t('Enter an amount greater than zero, for example 185,42.'));
    if (!parseDate(m.date)) return fail(t('Enter a valid date.'));
    if (m.date > S.today) return fail(t('The date cannot be in the future.'));
    if (m.dir === 'out' && amt > goalSaved(S, g.id)) return fail(t('You cannot withdraw more than is saved ({amount}).', { amount: fmt.money(goalSaved(S, g.id), CUR) }));
    S.goalMoves.push({ id: newId('gm'), goalId: g.id, date: m.date, amount: m.dir === 'out' ? -amt : amt, accountId: m.accountId || null, note: (m.note || '').trim(), ...(m.start && m.dir !== 'out' ? { start: true } : {}) });
    flash(g.id); toast(m.dir === 'out' ? t('Withdrawal recorded.') : t('Contribution recorded.'));
    UI.drawer = d.back ? { kind: 'goal-view', title: g.name, id: g.id } : null; UI.dist = null; render();
  },
  'move-delete'(ds) {
    const m = S.goalMoves.find(x => x.id === ds.id); if (!m) return;
    if (m.amount > 0 && goalSaved(S, m.goalId) - m.amount < 0) return toast(t('Deleting this contribution would leave the goal below zero. Delete the withdrawal first.'));
    confirmBox({ title: t('Delete this movement?'), text: t('{kind} of {amount} on {date} in {name}. What is saved changes by that amount.', { kind: m.amount < 0 ? t('Withdrawal') : t('Contribution'), amount: fmt.money(Math.abs(m.amount), CUR), date: fmt.date(m.date, true), name: goalById(m.goalId).name }), label: t('Delete movement'),
      run() { S.goalMoves = S.goalMoves.filter(x => x !== m); UI.dist = null; toast(t('Movement deleted.')); render(); } });
  },
  'dist-register'() {
    const ym = S.month, draft = distDraft(ym), date = draft.date, done = []; let n = 0;
    if (!parseDate(date) || date > S.today) return toast(t('Choose a date that is not in the future.'));
    for (const r of distribution(S, ym).rows) {
      const txt = draft.vals[r.goal.id], v = txt == null ? r.pending : typedAmount(txt || '0');
      if (v > 0) { S.goalMoves.push({ id: newId('gm'), goalId: r.goal.id, date, amount: v, accountId: r.goal.accountId, note: '' }); n++; done.push(r.goal.id); }
    }
    UI.dist = null; flash(...done); toast(tn(n, '{n} contribution recorded.', '{n} contributions recorded.')); render();
  },
  // years are shared by income, goals and fixed costs
  'goal-add-year'() {
    const years = goalYears(S), last = years[years.length - 1], next = last + 1, prev = S.pay[last] || [];
    if (years.length > 1 && last > +S.today.slice(0, 4) && yearEmpty(S, last)) return toast(t('{year} has no plan yet. Fill it in before adding another year.', { year: last }));
    S.pay[next] = prev.map(r => ({ ...r, values: Array(12).fill(r.values[11] || 0) }));
    S.goals.forEach(g => { g.plan[next] = Array(12).fill(0); });
    UI[UI.route === 'plan' ? 'planYear' : 'goalYear'] = next; toast(t('{year} added. Income is copied from December; goals and fixed costs start at zero.', { year: next })); render();
  },
  'goal-remove-year'(ds) {
    const y = +ds.v, years = goalYears(S);
    if (y !== years[years.length - 1] || y <= +S.today.slice(0, 4) || !yearEmpty(S, y)) return;
    delete S.pay[y]; S.goals.forEach(g => { delete g.plan[y]; }); S.plan.lines.forEach(l => { delete l.plan[y]; });
    if (UI.goalYear === y) UI.goalYear = y - 1; if (UI.planYear === y) UI.planYear = y - 1; toast(t('{year} removed.', { year: y })); render();
  },
};
