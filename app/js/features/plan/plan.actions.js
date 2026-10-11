/* Dorax Finance — clicks: the plan: fixed costs, their payments, income rows. Joined into A in app/actions.js. */
const PLAN_ACTIONS = {
  'plan-mode'(ds) { UI.planMode = ds.v; render(); },
  'plan-year'(ds) { if (ds.v) UI.planYear = +ds.v; render(); },
  // fixed costs: create, change from a month, end, delete
  'plan-start-year'(ds) { const y = +ds.v; startPlanYear(B(), y); toast(t('{year} starts with the amounts of December {prev}. Change what is different.', { year: y, prev: y - 1 })); render(); },
  'line-new'(ds) {
    const cat = B().categories.find(c => !c.income); if (!cat) return toast(t('Add a category first.'));
    // 2026-10-10 (owner, on Mobills: "first they have to put a spending limit on the categories; it teaches that this can be done"): the first fixed
    // cost of a side with no limit opens "Plan your month" once, with "Only add the fixed cost" at its foot (features/limits/plan-guide.view.js)
    if (!(ds && ds.skipGuide) && !inCompany() && !B().plan.guideSeen && !B().plan.lines.some(l => l.pay === 'budget')) return A['plan-guide']({ fromLine: '1' });      // the household's (a company plans costs, not spending)
    UI.drawer = { kind: 'line-form', title: t('New fixed cost'), isNew: true, draft: { id: null, name: '', catId: cat.id, pay: 'fixed', due: '', accountId: (mainAcct() || cashAccounts()[0] || {}).id || '', amountText: '', from: ymOf(B().today), end: '', note: '', replan: true } };
    renderOverlay(); const el = $('l-name'); if (el) el.focus();
  },
  'line-open'(ds) { const l = lineById(ds.id); if (!l) return A.close(); UI.drawer = { kind: 'line-view', title: l.name, id: l.id, ym: ds.ym || (UI.drawer && UI.drawer.ym) || B().month }; renderOverlay(); },
  'line-edit'(ds) {
    const l = lineById(ds.id), from = ymOf(B().today), ym = UI.drawer && UI.drawer.ym;
    UI.drawer = { kind: 'line-form', title: t('Edit fixed cost'), isNew: false, ym, draft: { id: l.id, name: l.name, catId: l.categoryId, pay: l.pay, due: l.due || '', accountId: (lineAcct(l) || {}).id || '', amountText: plain(planValue(B(), l, from)), from, end: ds.end ? from : l.end || '', note: l.note || '', replan: false } };
    renderOverlay(); if (ds.end) { const el = $('l-end-m'); if (el) { el.focus(); el.scrollIntoView({ block: 'center' }); } }
  },
  'line-save'() {
    const d = UI.drawer, x = d.draft, name = x.name.trim(), amount = typedAmount(x.amountText || '0'), due = x.due === '' || x.due == null ? null : Math.round(+x.due), cat = B().categories.find(c => c.id === x.catId);
    if (!name) return fail(t('Enter a name for the fixed cost.'), 'l-name');
    if (!cat) return fail(t('Choose a group.'), 'l-cat');
    if ((d.isNew || x.replan) && !String(x.amountText || '').trim()) return fail(t('Enter what it costs each month.'), 'l-amount');
    if ((d.isNew || x.replan) && (amount === null || amount <= 0)) return fail(t('Enter the amount as a number greater than zero, for example 1500 or 9,90.'), 'l-amount');
    if (due === null && lineNeedsDue(x)) return fail(t('Enter the day it is due: without it the app cannot remind you or tell you when it is late.'), 'l-due');
    if (due !== null && !(due >= 1 && due <= 31)) return fail(t('The due day must be between 1 and 31.'), 'l-due');
    if (!d.isNew && x.replan && x.end && x.from > x.end) return fail(t('The amount starts after the last month this cost is paid.'));
    let l;
    if (d.isNew) { const sub = { id: newId('s'), name }; cat.subs.push(sub); l = { id: newId('pl'), categoryId: cat.id, subcategoryId: sub.id, plan: {}, end: null }; B().plan.lines.push(l); }
    else {
      l = lineById(x.id); const f = l.subcategoryId && catOf(l.subcategoryId);
      if (f && f.sub) f.sub.name = name;
      if (cat.id !== l.categoryId) {       // moving a line to another group takes its payments and rules with it
        if (f && f.sub) { f.cat.subs = f.cat.subs.filter(k => k !== f.sub); cat.subs.push(f.sub); const id = f.sub.id; B().transactions.forEach(k => { if (k.subcategoryId === id) k.categoryId = cat.id; (k.splits || []).forEach(sp => { if (sp.subcategoryId === id) sp.categoryId = cat.id; }); }); B().rules.forEach(r => { if (r.subcategoryId === id) r.categoryId = cat.id; }); }
        l.categoryId = cat.id;
      }
      if ((x.end || null) !== (l.end || null)) endLine(l, x.end || null);
    }
    Object.assign(l, { name, pay: x.pay, due: due || undefined, accountId: x.accountId || null, note: (x.note || '').trim() });
    if (d.isNew || x.replan) setLinePlan(B(), l, x.from, amount);
    toast(d.isNew ? t('Fixed cost added.') : t('Fixed cost saved.')); UI.drawer = { kind: 'line-view', title: l.name, id: l.id, ym: d.ym || B().month }; render();
  },
  'line-delete-ask'() {
    const l = lineById(UI.drawer.id); if (!l) return;
    confirmBox({ title: t('Delete {name}?', { name: l.name }), text: t('Its plan for every month and year is deleted. Payments already recorded stay in Transactions. To stop paying it and keep its history, end it instead.'), label: t('Delete fixed cost'),
      run() { B().plan.lines = B().plan.lines.filter(k => k !== l); UI.drawer = null; toast(t('Fixed cost deleted. Its transactions keep their category.')); render(); } });
  },

  // fixed costs: payments. A payment is an expense transaction in the line's account, so there is one source of truth for what was paid.
  'line-pay'(ds) {
    const l = lineById(ds.id), ym = ds.ym || B().month, a = lineAcct(l); if (!a) return needAccount();
    const p = planProgress(B(), ym, BCUR(), B().today).find(x => x.id === l.id);
    UI.drawer = { kind: 'line-pay', title: l.pay === 'budget' ? t('Expense in {name}', { name: l.name }) : t('Pay {name}', { name: l.name }), back: !!ds.back,
      draft: { lineId: l.id, ym, amountText: l.pay === 'fixed' && !p.spent && p.planned ? plain(p.planned) : '', date: defaultPayDate(l, ym), accountId: a.id, note: '' } };
    renderOverlay(); const el = $('py-amount'); if (el) { el.focus(); el.select(); }
  },
  'line-pay-now'(ds) {
    const l = lineById(ds.id), ym = ds.ym || B().month, a = lineAcct(l), v = planValue(B(), l, ym);
    if (!a) return needAccount();
    if (!v) return;
    UI.undo = [recordPayment(l, v, defaultPayDate(l, ym), a.id, '').id]; flash(l.id);
    if (ds.close) { UI.drawer = null; renderOverlay(); }      // from the details: done, back to the list, where the row now says it is paid
    toast(t('{name} paid: {amount} from {account}.', { name: l.name, amount: fmt.money(v, BCUR()), account: a.name }), { a: 'undo-pay', label: t('Undo') }); render();
  },
  'group-pay-now'(ds) {
    const rows = planProgress(B(), ds.ym, BCUR(), B().today).filter(p => p.categoryId === ds.cat && p.pay === 'fixed' && !p.spent && p.planned && lineAcct(p));
    if (!rows.length) return;
    UI.undo = rows.map(p => recordPayment(lineById(p.id), p.planned, defaultPayDate(p, ds.ym), lineAcct(p).id, '').id); flash(...rows.map(p => p.id));
    toast(tn(rows.length, '{n} payment recorded: {amount}.', '{n} payments recorded: {amount}.', { amount: fmt.money(sum(rows.map(p => p.planned)), BCUR()) }), { a: 'undo-pay', label: t('Undo') }); render();
  },
  'pay-save'() {
    const d = UI.drawer, m = d.draft, l = lineById(m.lineId), amt = typedAmount(m.amountText || '');
    if (amt === null || amt <= 0) return fail(t('Enter an amount greater than zero, for example 185,42.'), 'py-amount');
    if (!parseDate(m.date)) return fail(t('Enter a valid date.'), 'py-date');
    if (m.date > B().today) return fail(t('The date cannot be in the future.'), 'py-date');
    if (!acct(m.accountId)) return fail(t('Add an account first.'), 'py-acct');
    m.accountId = cardRoute(m.accountId);      // a savings account whose card has credit only: on its invoice
    recordPayment(l, amt, m.date, m.accountId, (m.note || '').trim()); flash(l.id);
    toast(l.pay === 'budget' ? t('Expense recorded.') : t('Payment recorded.')); UI.drawer = d.back ? { kind: 'line-view', title: l.name, id: l.id, ym: ymOf(m.date) } : null; render();
  },
  'pay-delete'(ds) {
    const x = B().transactions.find(k => k.id === ds.id); if (!x || !x.planLineId) return;
    confirmBox({ title: t('Delete this payment?'), text: t('{name}, {amount} on {date}, from {account}. It is removed from Transactions too.', { name: x.merchant, amount: fmt.money(-x.amount, x.currency), date: fmt.date(x.date, true), account: acct(x.accountId).name }), label: t('Delete payment'),
      run() { B().transactions = B().transactions.filter(k => k !== x); toast(t('Payment deleted.')); render(); } });
  },
  'undo-pay'() { const ids = new Set(UI.undo || []); B().transactions = B().transactions.filter(k => !ids.has(k.id)); UI.undo = UI.toast = null; renderToast(); render(); },

  // income
  'pay-copy'(ds) { const y = +ds.ym.slice(0, 4), m = +ds.ym.slice(5) - 1; payRows(B(), y).forEach(r => { for (let i = m + 1; i < 12; i++) r.values[i] = r.values[m]; }); toast(t('Amounts copied to the following months.')); render(); },
  'add-pay'(ds) { const inc = B().categories.find(c => c.income), sub = { id: newId('s'), ...appName('Other income') }; inc.subs.push(sub); const id = newId('pay'); B().pay[ds.y] = B().pay[ds.y] || []; B().pay[ds.y].push({ id, ...appName('Other income'), sub: sub.id, half: 0, to: 'fixed', values: Array(12).fill(0) }); if (isPhone()) { UI.drawer = { kind: 'pay-row', title: B().pay[ds.y].find(x => x.id === id).name, id, y: ds.y, ym: ds.ym || B().month }; render(); const f = $('pn-' + id); if (f) { f.focus(); f.select(); } return; } render(); const el = $('pn-' + id); if (el) { el.focus(); el.select(); } },
  'remove-pay'(ds) {
    const r = (B().pay[ds.y] || []).find(k => k.id === ds.id); if (!r) return;
    confirmBox({ title: t('Remove {name} from {year}?', { name: r.name, year: ds.y }), text: t('Its planned amounts for {year} are removed. Income already recorded in Transactions is not touched.', { year: ds.y }), label: t('Remove income'),
      run() { B().pay[ds.y] = B().pay[ds.y].filter(k => k !== r); UI.dist = null; render(); } });
  },
  // after a cell is edited: offer to repeat the value in the following months
  'fill-forward'() {
    const f = UI.fill; if (!f) return;
    const arr = f.kind === 'goal' ? goalById(f.id).plan[f.y] : f.kind === 'pay' ? B().pay[f.y].find(r => r.id === f.id).values : lineById(f.id).plan[f.y];
    for (let i = f.m + 1; i < 12; i++) arr[i] = f.v;
    UI.fill = UI.toast = UI.dist = null; renderToast(); render();
  },
};
function offerFill(kind, id, y, m, v, was, arr) {
  if (v === was || m >= 11 || arr.slice(m + 1).every(x => x === v)) return;
  UI.fill = { kind, id, y, m, v };
  toast(t('{month} set to {amount}.', { month: mon(m, true), amount: plain(v) }), { a: 'fill-forward', label: t('Use it until December') });
}
