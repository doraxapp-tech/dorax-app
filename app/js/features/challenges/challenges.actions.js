/* Dorax Finance — clicks: the saving challenges (challenges.view.js; core/challenges.js). CHALLENGE_ACTIONS joins A in app/actions.js.
   The household's only: everything here reads and writes state.challenges of the account itself (S), never a company's book. */
function chMine() { if (!S.challenges) S.challenges = challengesEmpty(); const c = S.challenges; if (!Array.isArray(c.ended)) c.ended = []; return c; }
/** A challenge that ended, or was left: kept in the list of them, the running one cleared. */
function chEndS52(c) { const ch = chMine(); ch.ended.push({ kind: 's52', id: c.id, goalId: c.goalId, start: c.start, step: c.step, reverse: c.reverse, saved: c.saved, total: c.total, end: S.today }); ch.save52 = null; }
function chEndNs(c) { const ch = chMine(); ch.ended.push({ kind: 'ns', id: c.id, start: c.start, length: c.length, marked: c.marked, end: S.today }); ch.nospend = null; }
/** After a 52-weeks change: Goals, where it lives. */
const chToGoals = () => { UI.drawer = null; if (UI.route !== 'goals') navigate('goals'); else render(); };
/** Marks a day without spending, or takes the mark off. */
function nsToggle(d) {
  const n = chMine().nospend; if (!n) return;
  n.marks = n.marks || {}; if (n.marks[d]) delete n.marks[d]; else n.marks[d] = true;
  const c = nsNow(S, S.today);
  toast(n.marks[d] ? tn(c.length, 'Marked: {a} of {n} day without spending.', 'Marked: {a} of {n} days without spending.', { a: c.marked }) : t('Unmarked.'));
  if (UI.drawer && UI.drawer.kind === 'ns-view') renderOverlay(); render();
}
const CHALLENGE_ACTIONS = {
  // ---------- the 52 weeks (Goals) ----------
  /** How much it goes up each week, the order, and the savings account its goal keeps the money in. */
  's52-new'() {
    if (inCompany()) return;
    const ch = chMine(); if (ch.save52 && !(S.goals || []).some(g => g.id === ch.save52.goalId)) ch.save52 = null;      // its goal was deleted in Goals: the challenge went with it
    if (ch.save52) return chToGoals();
    const keep = goalSavings(null, BCUR());
    UI.sheet = false; UI.drawer = { kind: 's52-form', title: t('52-week challenge'), isNew: true, pop: true, draft: { step: 100, reverse: false, accountId: keep.length === 1 ? keep[0].id : '' } };
    if (!(UI.push || {}).known) pushRefresh().then(() => { if (UI.drawer && UI.drawer.kind === 's52-form') renderOverlay(); });
    renderOverlay();
  },
  's52-step'(ds) { UI.drawer.draft.step = +ds.v; renderOverlay(); },
  's52-order'(ds) { UI.drawer.draft.reverse = ds.v === '1'; renderOverlay(); },
  /** Started: a goal of its own, its target the 52 weeks' total, its plan the weeks in the months they start in, kept in the account chosen. */
  's52-save'() {
    const d = UI.drawer, g = d.draft, a = acct(g.accountId);
    if (!S52_STEPS.includes(g.step)) return fail(t('Choose how much it goes up each week.'));
    if (!a || a.type !== 'savings') return fail(goalSavings(null, BCUR()).length ? t('Choose the savings account you keep it in.') : t('Add a savings account to keep it in.'), 's52-acct');
    const ch = chMine(), c = { id: newId('c52'), start: S.today, step: g.step, reverse: !!g.reverse };
    const goal = { id: newId('g'), status: 'active', kind: 'goal', name: t('52-week challenge'), target: s52Total(c), deadline: ymOf(s52End(c)), accountId: a.id, currency: CURRENCIES.includes(a.currency) ? a.currency : bookCur(S), plan: s52Plan(c), note: '', challenge: 's52' };
    S.goals.push(goal); ch.save52 = { ...c, goalId: goal.id };
    flash(goal.id); toast(t('Challenge started. Week 1: {amount}.', { amount: chMoney(s52Amount(c, 1), goal.currency) })); chToGoals();
  },
  /** "Put aside R$ 12": a contribution to its goal of what is due to be up to date. */
  's52-put'() {
    const c = s52Now(S, S.today); if (!c) return;
    A['goal-move']({ id: c.goal.id, dir: 'in' }); UI.drawer.draft.amountText = c.toGo ? plain(c.toGo) : '';
    renderOverlay(); const el = $('m-amount'); if (el) { el.focus(); el.select(); }
  },
  's52-end'() {
    const c = s52Now(S, S.today); if (!c) return;
    confirmBox({ tone: 'neutral', title: t('Leave the 52 weeks?'), text: t('What you put aside stays in {name}, as a goal.', { name: c.goal.name }), label: t('Leave it'), run() { chEndS52(c); toast(t('Challenge left.')); chToGoals(); } });
  },
  's52-close'() {
    const c = s52Now(S, S.today); if (!c) return;
    chEndS52(c); if (c.done) confetti();
    toast(c.done ? t('Well done: {total} put aside in 52 weeks.', { total: chMoney(c.total, c.cur) }) : t('Challenge closed.')); chToGoals();
  },
  // ---------- the days without spending (the summary) ----------
  'ns-new'() {
    if (inCompany()) return; if (chMine().nospend) return A['ns-view']();
    UI.sheet = false; UI.drawer = { kind: 'ns-form', title: t('Days without spending'), isNew: true, pop: true, draft: { length: 30 } };
    if (!(UI.push || {}).known) pushRefresh().then(() => { if (UI.drawer && UI.drawer.kind === 'ns-form') renderOverlay(); });
    renderOverlay();
  },
  'ns-days'(ds) { UI.drawer.draft.length = +ds.v; renderOverlay(); },
  'ns-save'() {
    const g = UI.drawer.draft; if (![7, 14, 30].includes(g.length)) return fail(t('Choose how long it lasts.'));
    chMine().nospend = { id: newId('ns'), start: S.today, length: g.length, marks: {} };
    toast(t('Challenge started. It ends on {date}.', { date: fmt.date(addDays(S.today, g.length - 1)) }));
    UI.drawer = null; if (UI.route !== 'dashboard') navigate('dashboard'); else render();
  },
  'ns-view'() { if (inCompany()) return; UI.sheet = false; UI.drawer = { kind: 'ns-view', title: t('Days without spending'), pop: true }; renderOverlay(); },
  /** "I spent nothing today", or a tap on today or yesterday in its details. A purchase recorded that day outside the fixed costs is said first: the
      person decides whether the day counts (owner's choice, 2026-10-14). Pressed again, the mark comes off. */
  'ns-mark'(ds) {
    const d = ds.d, c = nsNow(S, S.today); if (!c || c.done || (d !== S.today && d !== addDays(S.today, -1)) || !nsHas(c, d)) return;
    const seen = c.marks[d] ? [] : nsSpent(S, d, CUR);
    if (!seen.length) return nsToggle(d);
    const n = seen.length, what = seen.slice(0, 2).map(x => `${x.name} ${fmt.money(x.amount, CUR)}`).join(', ') + (n > 2 ? ' ' + t('and {n} more', { n: n - 2 }) : '');
    confirmBox({ tone: 'neutral', title: t('Mark the day anyway?'), text: tn(n, 'Dorax sees {n} purchase that day outside the fixed costs: {what}. You decide whether the day counts.', 'Dorax sees {n} purchases that day outside the fixed costs: {what}. You decide whether the day counts.', { what }), label: t('Mark it'), run() { nsToggle(d); } });
  },
  'ns-end'() {
    const c = nsNow(S, S.today); if (!c) return;
    confirmBox({ tone: 'neutral', title: t('Leave the days without spending?'), text: tn(c.marked, 'You have {n} day marked.', 'You have {n} days marked.'), label: t('Leave it'), run() { chEndNs(c); toast(t('Challenge left.')); UI.drawer = null; render(); } });
  },
  'ns-close'() {
    const c = nsNow(S, S.today); if (!c) return;
    chEndNs(c); if (c.marked === c.length) confetti();
    toast(t('{a} of {b} days without spending. Closed.', { a: c.marked, b: c.length })); UI.drawer = null; render();
  },
  // ---------- notifications, from a challenge's form ----------
  async 'ch-push'() {
    S.user.notify.challenges = true;
    UI.push = { ...(UI.push || {}), busy: true }; renderOverlay();
    const r = await PUSH.on();
    toast(r.ok ? t('Notifications are on for this device.') : r.why === 'denied' ? t('You did not allow notifications, so nothing was turned on.') : t('Notifications could not be turned on. Try again.'));
    await pushRefresh(); renderOverlay();
  },
  'ch-notify-on'() { S.user.notify.challenges = true; save(); renderOverlay(); },
};
