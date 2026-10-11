/* Dorax Finance — clicks and fields: "Plan your month" (plan-guide.view.js). PLAN_GUIDE_ACTIONS joins A in app/actions.js; PLAN_GUIDE_CHANGES
   joins C in app/changes.js. Each step keeps what it asks when the person moves on: the income becomes an income row of the Plan from this month
   (when the Plan had none), the share is state.plan.savePct, and each category's figure a limit (limits.actions.js does the same for one). */
const pgFocus = () => { const el = $('pg-income') || $('pg-pct') || $('pg-r-0') || $('pg-h'); if (el) el.focus({ preventScroll: true }); };
const pgGo = step => { const d = UI.drawer; d.step = step; d.error = d.invalid = null; renderOverlay(); pgFocus(); };
/** A figure from a field: cents, null when it cannot be read, 0 when empty. */
const pgAmount = v => String(v || '').trim() === '' ? 0 : typedAmount(v);
/** One income row of the Plan, from this month to December, in the side's income group (as the account's first setup makes it). */
function pgAddIncome(v, ym) {
  const inc = B().categories.find(c => c.income); if (!inc) return false;
  let sub = inc.subs[0]; if (!sub) { sub = { id: newId('s'), ...appName('Salary') }; inc.subs.push(sub); }
  const y = +ym.slice(0, 4), m0 = +ym.slice(5) - 1;
  B().pay[y] = B().pay[y] || []; B().pay[y].push({ id: newId('pay'), ...appName('Salary'), sub: sub.id, half: 0, to: 'fixed', values: Array.from({ length: 12 }, (_, i) => i >= m0 ? v : 0) });
  return true;
}
const PLAN_GUIDE_ACTIONS = {
  /** The guide, from the start. fromLine: opened by "New fixed cost", which it can still go to. */
  'plan-guide'(ds) {
    const p = B().plan, saved = p.savePct, rows = {};
    p.guideSeen = true;
    for (const x of pgRows()) if (x.line) rows[pgKey(x)] = plain(planValue(B(), x.line, limYm()));
    UI.menu = false; UI.sheet = false;
    const step = ds && ds.step && monthPlan(B(), limYm()).income ? Math.min(2, +ds.step) : 0;      // "Keep a smaller share" opens on step 2 (features/reminders/issues)
    UI.drawer = { kind: 'plan-guide', title: t('Plan your month'), pop: true, full: true, step, fromLine: !!(ds && ds.fromLine), draft: { income: '', pct: saved ? String(saved) : '', rows } };
    render(); pgFocus();
  },
  'pg-next'() {
    const d = UI.drawer; if (!d || d.kind !== 'plan-guide') return;
    const ym = limYm();
    if (d.step === 0) {
      if (!monthPlan(B(), ym).income) {
        const v = pgAmount(d.draft.income);
        if (!v) return fail(t('Type what comes in each month. A rough figure works.'), 'pg-income');
        if (v === null || v < 0) return fail(t('Enter the amount as a number, for example 1500 or 9,90.'), 'pg-income');
        if (!pgAddIncome(v, ym)) return fail(t('Add your income in the Plan first.'));
      }
      return pgGo(1);
    }
    if (d.step === 1) {
      const raw = String(d.draft.pct || '').trim(), n = parseInt(raw.replace(/\D/g, ''), 10);
      if (raw && (isNaN(n) || n > 90)) return fail(t('Type a share between 0 and 90.'), 'pg-pct');
      B().plan.savePct = raw && n > 0 ? n : null;
      return pgGo(2);
    }
  },
  'pg-back'() { const d = UI.drawer; if (d && d.step > 0) pgGo(d.step - 1); },
  /** A share at a tap. */
  'pg-pct'(ds) { const d = UI.drawer; if (!d) return; d.draft.pct = String(ds.v); renderOverlay(); const el = document.querySelector(`.pg-chips [data-v="${ds.v}"]`); if (el) el.focus({ preventScroll: true }); },
  /** Each empty field takes its category's average. */
  'pg-avg'() {
    const d = UI.drawer; if (!d) return;
    document.querySelectorAll('.pg-row input[data-avg]').forEach(el => { if (!String(d.draft.rows[el.dataset.k] || '').trim()) d.draft.rows[el.dataset.k] = plain(+el.dataset.avg); });
    renderOverlay(); const el = $('pg-free'); if (el) el.scrollIntoView({ block: 'nearest' });
  },
  /** Step 3: every figure becomes its category's limit; a field emptied where there was one takes it off. */
  'pg-save'() {
    const d = UI.drawer; if (!d) return;
    const ym = limYm(), rows = pgRows(), vals = [];
    for (let i = 0; i < rows.length; i++) {
      const v = pgAmount(d.draft.rows[pgKey(rows[i])]);
      if (v === null || v < 0) return fail(t('Enter the limit as a number, for example 800 or 1200,50.'), 'pg-r-' + i);
      vals.push(v);
    }
    let n = 0;
    rows.forEach((x, i) => {
      const v = vals[i];
      if (!v) { if (x.line && planValue(B(), x.line, ym) > 0) limitRemove(B(), x.line, ym); return; }
      let l = x.line || x.bill || B().plan.lines.filter(k => k.pay === 'budget' && k.categoryId === x.cat.id && (k.subcategoryId || '') === limKey(x)).pop();
      if (x.bill) { l.pay = 'budget'; delete l.due; }
      else if (!l) { l = { id: newId('pl'), categoryId: x.cat.id, subcategoryId: limKey(x) || undefined, plan: {}, end: null, name: x.name, pay: 'budget', note: '' }; B().plan.lines.push(l); }
      else if (l.end && l.end < ym) l.end = null;
      setLinePlan(B(), l, ym, v); n++;
    });
    B().plan.guided = true;
    pgGo(3);
    if (n) toast(tn(n, '{n} limit saved.', '{n} limits saved.'));
  },
  /** The end: the Plan's limits card. */
  'pg-see'() { UI.drawer = null; renderOverlay(); navigate('plan'); const el = $('limits-card'); if (el) el.scrollIntoView({ block: 'start' }); },
  'pg-income-plan'() { UI.drawer = null; renderOverlay(); navigate('plan'); const el = document.querySelector('.payrows'); if (el) el.closest('section').scrollIntoView({ block: 'start' }); },
  /** From "New fixed cost": straight to it. */
  'pg-only-line'() { UI.drawer = null; renderOverlay(); A['line-new']({ skipGuide: '1' }); },
};
const PLAN_GUIDE_CHANGES = {
  /** The share, as it is typed: what it keeps a month. */
  'pg-pct'(el) { const d = UI.drawer; if (!d || d.kind !== 'plan-guide') return; d.draft.pct = el.value; const p = $('pg-save-say'); if (p) p.innerHTML = pgSaveSay(d); document.querySelectorAll('.pg-chips button').forEach(b => { const on = b.dataset.v === String(pgPct(d)) && el.value !== ''; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); }); },
  /** A category's figure, as it is typed: what is left without a job. */
  'pg-row'(el) { const d = UI.drawer; if (!d || d.kind !== 'plan-guide') return; d.draft.rows[el.dataset.k] = el.value; const f = pgFree(d), a = $('pg-free'), b = $('pg-to-spend'), c = $('pg-to-spend-say'); if (a) a.innerHTML = pgFreeSay(f); if (b) b.textContent = limMoney(f.toSpend); if (c) c.textContent = pgSpendSay(f); },
};
// Enter moves on, as in the account's first setup
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter' || !UI.drawer || UI.drawer.kind !== 'plan-guide' || UI.modal || !e.target.closest || !e.target.closest('.pg')) return;
  if (e.target.id === 'pg-income' || e.target.id === 'pg-pct') { e.preventDefault(); A['pg-next'](); save(); }
});
