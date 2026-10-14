/* Dorax Finance — clicks: the Journey out of debt (features/journey/journey.view.js; calculations in core/journey.js). Joined into A in app/actions.js. */
/** The page book's journey, made the first time something is written in it. */
function jMine() {
  const b = B(); if (!b.journey) b.journey = journeyEmpty();
  const j = b.journey; for (const k of ['debts', 'pays', 'sprints', 'ended']) if (!Array.isArray(j[k])) j[k] = []; if (!j.checks) j.checks = {};
  return j;
}
const jOpen = () => ({ kind: 'journey', title: t('Journey'), pop: true });
/** A challenge that ended, or was left: kept in the journey's list of them, the running one cleared (v227). */
function jEndS52(c) { const j = jMine(); j.ended.push({ kind: 's52', id: c.id, goalId: c.goalId, start: c.start, step: c.step, reverse: c.reverse, saved: c.saved, total: c.total, end: S.today }); j.save52 = null; }
function jEndNs(c) { const j = jMine(); j.ended.push({ kind: 'ns', id: c.id, start: c.start, length: c.length, marked: c.marked, end: S.today }); j.nospend = null; }
/** The first time (no sprint ever): the onboarding, a page over the whole screen (journey.view.js: renderJstart), at a step. */
function jstartOpen(step) { UI.sheet = false; UI.drawer = null; renderOverlay(); UI.jstart = { step: step || 0, done: false, error: null, draft: { start: S.today, days: 30, targetText: '' } }; jPushKnown(); renderJstart(true); }
/** Whether this device's notifications are known yet; when they become known, the open Journey panel is drawn again. */
const jPushKnown = () => { if ((UI.push || {}).known) return true; pushRefresh().then(() => { if (UI.jstart) renderJstart(); else if (UI.drawer && /^journey/.test(UI.drawer.kind)) renderOverlay(); }); return false; };
/** A whole day of the month, 1 to 31, or null when left empty; NaN when what was typed is not one. */
const dayTyped = txt => { const s = String(txt || '').trim(); if (!s) return null; const n = Number(s); return Number.isInteger(n) && n >= 1 && n <= 31 ? n : NaN; };
/** The amount of the first sprint, typed on the onboarding's page: kept as typed; a refusal shown under it goes as soon as it is fixed. */
const JOURNEY_CHANGES = {
  'jstart-target'(el) { const J = UI.jstart; if (!J) return; J.draft.targetText = el.value; if (J.error) { J.error = null; el.removeAttribute('aria-invalid'); el.removeAttribute('aria-describedby'); const m = $('js-err'); if (m) m.remove(); } },
};
const JOURNEY_ACTIONS = {
  /** The Journey: its onboarding until the first sprint (owner, 2026-10-10), then the panel. */
  // the first time, the way out of debt is told on a page of its own; someone who owes nothing, or who already took up a challenge, goes straight to the
  // panel, where the saving challenges come first (v227, owner, 2026-10-14: the Journey is also "a game for whoever has no debts"). A company's
  // Journey is the way out of debt alone: it keeps its first page.
  'journey-open'() { const b = B(), j = journeyOf(b), owes = journeyDebts(b, S.today, BCUR()).some(x => x.left > 0); if (!j.sprint && !j.sprints.length && (inCompany() || (owes && !(j.save52 || j.nospend || (j.ended || []).length)))) return jstartOpen(0); UI.sheet = false; UI.drawer = jOpen(); jPushKnown(); renderOverlay(); },
  /** A day with no new debt, marked by the person (owner's choice, 2026-10-10): today or yesterday; pressed again, unmarked. */
  'journey-mark'(ds) {
    const d = ds.d; if (d !== S.today && d !== addDays(S.today, -1)) return;
    const j = jMine(); if (j.checks[d]) delete j.checks[d]; else j.checks[d] = true;
    const n = journeyStreak(j, S.today), ns = !inCompany() && nsHas(j, d) ? nsNow(j, S.today) : null;      // in the days without spending, the mark is one of them (v227)
    toast(j.checks[d] ? (ns ? tn(ns.marked, 'Marked: {n} day without spending.', 'Marked: {n} days without spending.') : tn(n, 'Marked. Your streak: {n} day.', 'Marked. Your streak: {n} days.')) : t('Unmarked.')); render();
  },
  // ---------- the onboarding's page ----------
  'jstart-step'(ds) {
    const J = UI.jstart; if (!J) return jstartOpen(+ds.v || 0);
    const step = Math.max(0, Math.min(JSTART_STEPS - 1, +ds.v));
    if (step === 5 && !jNotifyOk()) return;      // the first sprint waits for notifications (step 4)
    Object.assign(J, { step, error: null }); renderJstart(true);
  },
  'jstart-close'() { UI.jstart = null; renderJstart(); render(); },
  /** The flame of the first step: today, marked for real (or unmarked). */
  'jstart-light'() { const j = jMine(); if (j.checks[S.today]) delete j.checks[S.today]; else j.checks[S.today] = true; save(); renderJstart(); },
  /** Notifications on, from the onboarding: this device, and the Journey's reminders with them. */
  async 'jstart-push'() {
    S.user.notify.journey = true;
    UI.push = { ...(UI.push || {}), busy: true }; renderJstart();
    const r = await PUSH.on();
    toast(r.ok ? t('Notifications are on for this device.') : r.why === 'denied' ? t('You did not allow notifications, so nothing was turned on.') : t('Notifications could not be turned on. Try again.'));
    await pushRefresh(); renderJstart();
  },
  'jstart-journey-on'() { S.user.notify.journey = true; save(); renderJstart(); },
  async 'jstart-recheck'() { await pushRefresh(); renderJstart(); },
  'jstart-days'(ds) { const J = UI.jstart; if (!J) return; J.draft.days = +ds.v; renderJstart(); },
  'jstart-use'(ds) { const J = UI.jstart; if (!J) return; J.draft.targetText = plain(+ds.v); J.error = null; renderJstart(); },
  /** The first sprint, started: the page celebrates, then opens the Journey. */
  'jstart-go'() {
    const J = UI.jstart; if (!J) return;
    const target = typedAmount(J.draft.targetText || '');
    if (!jNotifyOk()) return A['jstart-step']({ v: 4 });
    if (target === null || target <= 0) { J.error = t('Enter the amount to pay off in this sprint, greater than zero.'); renderJstart(); const el = $('sp-target'); if (el) el.focus(); return; }
    const j = jMine(); j.sprint = { id: newId('sp'), start: J.draft.start, days: J.draft.days, target };
    J.done = true; J.error = null; save(); renderJstart(true); confetti();
  },
  'jstart-finish'() { UI.jstart = null; renderJstart(); UI.drawer = jOpen(); render(); },
  // ---------- debts ----------
  /** The sprint's own button (v226, owner, 2026-10-14: "¿cómo agrego dinero aquí en Jornada? no sé"): what fills it is a payment of a debt or a card
      invoice, so it opens that payment when there is one thing owed, goes to "What you owe" when there are more, and to a new debt when nothing is owed. */
  'sprint-pay'() {
    const owed = journeyDebts(B(), S.today, BCUR()).filter(x => x.left > 0);
    if (!owed.length) return A['debt-new']({});
    if (owed.length === 1) return owed[0].kind === 'card' ? A['card-pay']({ id: owed[0].id, back: 'journey' }) : A['debt-pay']({ id: owed[0].id });
    const sec = $('jr-debts'); if (!sec) return;
    sec.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
    const b = sec.querySelector('[data-a="debt-pay"], [data-a="card-pay"]'); if (b) b.focus({ preventScroll: true });
  },
  'debt-new'(ds) { UI.drawer = { kind: 'debt-form', title: t('New debt'), isNew: true, pop: true, back: ds && ds.back === 'start' ? 'start' : null, draft: { id: null, name: '', owedText: '', rateText: '', minText: '', dueText: '' } }; renderOverlay(); const el = $('db-name'); if (el) el.focus(); },
  'debt-edit'(ds) {
    const j = jMine(), x = j.debts.find(k => k.id === ds.id); if (!x) return;
    UI.drawer = { kind: 'debt-form', title: t('Edit debt'), isNew: false, pop: true, draft: { id: x.id, name: x.name, owedText: plain(debtLeft(j, x)), rateText: x.rate ? String(x.rate).replace('.', S.settings.lang === 'en' ? '.' : ',') : '', minText: x.min ? plain(x.min) : '', dueText: x.due ? String(x.due) : '' } };
    renderOverlay();
  },
  'debt-save'() {
    const d = UI.drawer, g = d.draft, owed = typedAmount(g.owedText || ''), rateC = String(g.rateText || '').trim() ? typedAmount(g.rateText) : 0, min = String(g.minText || '').trim() ? typedAmount(g.minText) : 0, due = dayTyped(g.dueText);
    if (!String(g.name || '').trim()) return fail(t('Write what the debt is, for example “Bank loan”.'), 'db-name');
    if (owed === null || owed <= 0) return fail(t('Enter what is owed today, as an amount greater than zero.'), 'db-owed');
    if (rateC === null || rateC < 0 || rateC > 10000) return fail(t('Enter the interest a month as a number, for example 2,5.'), 'db-rate');
    if (min === null || min < 0) return fail(t('Enter the monthly payment as a number, for example 350.'), 'db-min');
    if (Number.isNaN(due)) return fail(t('The due day must be between 1 and 31.'), 'db-due');
    const j = jMine(), x = d.isNew ? { id: newId('db'), since: S.today } : j.debts.find(k => k.id === g.id); if (!x) return A['journey-open']();
    const paid = d.isNew ? 0 : debtPaid(j, x);
    Object.assign(x, { name: g.name.trim(), owed: owed + paid, rate: rateC ? rateC / 100 : null, min: min || null, due });      // what is typed is what it owes today
    if (d.isNew) j.debts.push(x);
    toast(d.isNew ? t('Debt added.') : t('Debt saved.'));
    if (d.back === 'start') { UI.drawer = null; render(); return renderJstart(); }      // from the onboarding: its page, under the form, with the debt listed
    UI.drawer = jOpen(); render();
  },
  'debt-delete'(ds) {
    const j = jMine(), x = j.debts.find(k => k.id === ds.id); if (!x) return;
    j.debts = j.debts.filter(k => k !== x); j.pays = j.pays.filter(p => p.debtId !== x.id);
    toast(t('{name} deleted.', { name: x.name })); UI.drawer = jOpen(); render();
  },
  /** The order of the list: where the money above the monthly payments goes first (the person's choice, never Dorax's). */
  'debt-move'(ds) {
    const j = jMine(), i = j.debts.findIndex(k => k.id === ds.id), k = i + (+ds.v); if (i < 0 || k < 0 || k >= j.debts.length) return;
    [j.debts[i], j.debts[k]] = [j.debts[k], j.debts[i]]; render();
  },
  'debt-pay'(ds) {
    const j = jMine(), x = j.debts.find(k => k.id === ds.id); if (!x) return;
    UI.sheet = false; UI.drawer = { kind: 'debt-pay', title: t('Pay {name}', { name: x.name }), pop: true, back: ds.back || null, draft: { debtId: x.id, amountText: x.min ? plain(Math.min(x.min, debtLeft(j, x))) : '', date: S.today } };
    renderOverlay(); const el = $('dp-amount'); if (el) { el.focus(); el.select(); }
  },
  'debt-pay-save'() {
    const d = UI.drawer, g = d.draft, amt = typedAmount(g.amountText || ''), j = jMine(), x = j.debts.find(k => k.id === g.debtId);
    if (!x) return A['journey-open']();
    if (amt === null || amt <= 0) return fail(t('Enter an amount greater than zero, for example 185,42.'), 'dp-amount');
    if (!parseDate(g.date)) return fail(t('Enter a valid date.'), 'dp-date');
    if (g.date > S.today) return fail(t('The date cannot be in the future.'), 'dp-date');
    j.pays.push({ id: newId('dp'), debtId: x.id, date: g.date, amount: amt });
    const left = debtLeft(j, x);
    toast(left ? t('Payment recorded. {name} owes {amount}.', { name: x.name, amount: fmt.money(left, BCUR()) }) : t('{name} is paid off.', { name: x.name }));
    UI.drawer = d.back === 'reminders' ? { kind: 'reminders', title: t('Notifications'), tab: 'rem' } : jOpen(); render();
  },
  // ---------- sprints ----------
  async 'sprint-new'(ds) {
    if (!(UI.push || {}).known) await pushRefresh();
    if (!jNotifyOk()) return jstartOpen(4);      // a sprint is never started with notifications off (owner, 2026-10-10)
    const s = jMine().sprint, last = jMine().sprints[jMine().sprints.length - 1], base = s || last;
    UI.drawer = { kind: 'sprint-form', title: s ? t('Change the sprint') : t('New sprint'), isNew: !s, pop: true, draft: { start: s ? s.start : S.today, days: base ? base.days : 30, targetText: base ? plain(base.target) : '' } };
    renderOverlay(); const el = $('sp-target'); if (el && !(ds && ds.keep)) el.focus();
  },
  'sprint-days'(ds) { UI.drawer.draft.days = +ds.v; renderOverlay(); },
  'sprint-use'(ds) { UI.drawer.draft.targetText = plain(+ds.v); renderOverlay(); },
  'sprint-save'() {
    const d = UI.drawer, g = d.draft, target = typedAmount(g.targetText || '');
    if (target === null || target <= 0) return fail(t('Enter the amount to pay off in this sprint, greater than zero.'), 'sp-target');
    if (![7, 14, 30].includes(g.days)) return fail(t('Choose how long the sprint lasts.'));
    if (d.isNew && !jNotifyOk()) return jstartOpen(4);
    const j = jMine(), first = !j.sprint && !j.sprints.length;
    j.sprint = d.isNew ? { id: newId('sp'), start: g.start, days: g.days, target } : { ...j.sprint, days: g.days, target };
    toast(first ? t('Your first sprint is on. It ends on {date}. See you tomorrow morning.', { date: fmt.date(addDays(g.start, g.days - 1)) }) : d.isNew ? t('Sprint started. It ends on {date}.', { date: fmt.date(addDays(g.start, g.days - 1)) }) : t('Sprint saved.')); UI.drawer = jOpen(); render();
  },
  /** A sprint whose last day has passed: kept with what was paid, and the next one opens with the same length and amount. */
  'sprint-close'() {
    const j = jMine(), s = sprintNow(B(), S.today, BCUR()); if (!s) return;
    j.sprints.push({ id: s.id, start: s.start, days: s.days, target: s.target, paid: s.paid }); j.sprint = null;
    A['sprint-new']({ keep: 1 });
  },
  // ---------- the saving challenges (v227, journey.view.js: jrChallenges; core/journey.js) ----------
  /** The 52 weeks: how much it goes up each week, the order, and the savings account its goal keeps the money in. */
  's52-new'() {
    if (inCompany()) return;
    const j = jMine(); if (j.save52 && !goalById(j.save52.goalId)) j.save52 = null;      // its goal was deleted in Goals: the challenge went with it
    if (j.save52) return A['journey-open']();
    const keep = goalSavings(null, BCUR());
    UI.sheet = false; UI.drawer = { kind: 's52-form', title: t('52 weeks'), isNew: true, pop: true, draft: { step: 100, reverse: false, accountId: keep.length === 1 ? keep[0].id : '' } };
    jPushKnown(); renderOverlay();
  },
  's52-step'(ds) { UI.drawer.draft.step = +ds.v; renderOverlay(); },
  's52-order'(ds) { UI.drawer.draft.reverse = ds.v === '1'; renderOverlay(); },
  /** Started: a goal of its own, its target the 52 weeks' total, its plan week by week in the months they fall in, kept in the account chosen. */
  's52-save'() {
    const d = UI.drawer, g = d.draft, a = acct(g.accountId);
    if (!S52_STEPS.includes(g.step)) return fail(t('Choose how much it goes up each week.'));
    if (!a || a.type !== 'savings') return fail(goalSavings(null, BCUR()).length ? t('Choose the savings account you keep it in.') : t('Add a savings account to keep it in.'), 's52-acct');
    if (!jNotifyOk()) return;
    const j = jMine(), c = { id: newId('c52'), start: S.today, step: g.step, reverse: !!g.reverse };
    const goal = { id: newId('g'), status: 'active', kind: 'goal', name: t('52-week challenge'), target: s52Total(c), deadline: ymOf(s52End(c)), accountId: a.id, currency: CURRENCIES.includes(a.currency) ? a.currency : bookCur(B()), plan: s52Plan(c), note: '', challenge: 's52' };
    B().goals.push(goal); j.save52 = { ...c, goalId: goal.id };
    toast(t('Challenge started. Week 1: {amount}.', { amount: s52Money(s52Amount(c, 1), goal.currency) })); UI.drawer = jOpen(); render();
  },
  /** "Put aside R$ 12": a contribution to its goal of what is due to be up to date, and back to the Journey. */
  's52-put'() {
    const c = s52Now(B(), S.today); if (!c) return;
    A['goal-move']({ id: c.goal.id, dir: 'in' }); UI.drawer.draft.amountText = c.toGo ? plain(c.toGo) : ''; UI.drawer.after = jOpen();
    renderOverlay(); const el = $('m-amount'); if (el) { el.focus(); el.select(); }
  },
  's52-end'() {
    const c = s52Now(B(), S.today); if (!c) return;
    confirmBox({ tone: 'neutral', title: t('Leave the 52 weeks?'), text: t('What you put aside stays in {name}, in Goals.', { name: c.goal.name }), label: t('Leave it'), run() { jEndS52(c); toast(t('Challenge left.')); UI.drawer = jOpen(); render(); } });
  },
  's52-close'() {
    const c = s52Now(B(), S.today); if (!c) return;
    jEndS52(c); if (c.done) confetti();
    toast(c.done ? t('Well done: {total} put aside in 52 weeks.', { total: s52Money(c.total, c.cur) }) : t('Challenge closed.')); UI.drawer = jOpen(); render();
  },
  /** The days without spending: how long. They start today. */
  'ns-new'() {
    if (inCompany()) return; if (jMine().nospend) return A['journey-open']();
    UI.sheet = false; UI.drawer = { kind: 'ns-form', title: t('Days without spending'), isNew: true, pop: true, draft: { length: 30 } };
    jPushKnown(); renderOverlay();
  },
  'ns-days'(ds) { UI.drawer.draft.length = +ds.v; renderOverlay(); },
  'ns-save'() {
    const g = UI.drawer.draft; if (![7, 14, 30].includes(g.length)) return fail(t('Choose how long it lasts.'));
    if (!jNotifyOk()) return;
    jMine().nospend = { id: newId('ns'), start: S.today, length: g.length };
    toast(t('Challenge started. It ends on {date}.', { date: fmt.date(addDays(S.today, g.length - 1)) })); UI.drawer = jOpen(); render();
  },
  'ns-end'() {
    const c = nsNow(jMine(), S.today); if (!c) return;
    confirmBox({ tone: 'neutral', title: t('Leave the days without spending?'), text: tn(c.marked, 'You have {n} day marked. Your streak stays as it is.', 'You have {n} days marked. Your streak stays as it is.'), label: t('Leave it'), run() { jEndNs(c); toast(t('Challenge left.')); UI.drawer = jOpen(); render(); } });
  },
  'ns-close'() {
    const c = nsNow(jMine(), S.today); if (!c) return;
    jEndNs(c); if (c.marked === c.length) confetti();
    toast(t('{a} of {b} days without spending. Closed.', { a: c.marked, b: c.length })); UI.drawer = jOpen(); render();
  },
  /** Notifications on from a challenge's form, as from the first page (jstart-push): this device, and the Journey's reminders with them. */
  async 'ch-push'() {
    S.user.notify.journey = true;
    UI.push = { ...(UI.push || {}), busy: true }; renderOverlay();
    const r = await PUSH.on();
    toast(r.ok ? t('Notifications are on for this device.') : r.why === 'denied' ? t('You did not allow notifications, so nothing was turned on.') : t('Notifications could not be turned on. Try again.'));
    await pushRefresh(); renderOverlay();
  },
  'ch-journey-on'() { S.user.notify.journey = true; save(); renderOverlay(); },
};
