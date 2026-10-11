/* Dorax Finance — clicks: the Journey out of debt (features/journey/journey.view.js; calculations in core/journey.js). Joined into A in app/actions.js. */
/** The page book's journey, made the first time something is written in it. */
function jMine() {
  const b = B(); if (!b.journey) b.journey = journeyEmpty();
  const j = b.journey; for (const k of ['debts', 'pays', 'sprints']) if (!Array.isArray(j[k])) j[k] = []; if (!j.checks) j.checks = {};
  return j;
}
const jOpen = () => ({ kind: 'journey', title: t('Journey'), pop: true });
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
  'journey-open'() { const j = journeyOf(B()); if (!j.sprint && !j.sprints.length) return jstartOpen(0); UI.sheet = false; UI.drawer = jOpen(); jPushKnown(); renderOverlay(); },
  /** A day with no new debt, marked by the person (owner's choice, 2026-10-10): today or yesterday; pressed again, unmarked. */
  'journey-mark'(ds) {
    const d = ds.d; if (d !== S.today && d !== addDays(S.today, -1)) return;
    const j = jMine(); if (j.checks[d]) delete j.checks[d]; else j.checks[d] = true;
    const n = journeyStreak(j, S.today);
    toast(j.checks[d] ? tn(n, 'Marked. Your streak: {n} day.', 'Marked. Your streak: {n} days.') : t('Unmarked.')); render();
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
};
