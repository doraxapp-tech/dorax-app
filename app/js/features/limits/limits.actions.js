/* Dorax Finance — clicks and fields: spending limits (limits.view.js). LIMIT_ACTIONS joins A in app/actions.js; LIMIT_CHANGES joins C in
   app/changes.js. A limit is saved as a line of the Plan spent in several purchases (pay: 'budget'): the one the category or subcategory already
   has (an ended one runs again), or a new one with its name. It changes from this month on; the months before keep what they had. */
/** What the field starts with: the target's limit, or the amount of the bill that would become it (the person's own figure); else nothing. */
const limText = (tg, ym) => { const l = tg && (tg.line || tg.bill), v = l ? planValue(B(), l, ym) : 0; return v > 0 ? plain(v) : ''; };
const limFocus = () => { const el = $('lm-amount'); if (el) { el.focus(); el.select(); } };
const LIMIT_ACTIONS = {
  /** The list of the side's limits: from a phone's +, the search and Help. */
  limits() { UI.menu = false; UI.sheet = false; UI.drawer = { kind: 'limits', title: t('Spending limits'), pop: true }; render(); },
  /** One category's limit. data-sub: the subcategory ('' the whole category); else the one that has a limit, else the first it can have. */
  'limit-open'(ds) {
    const c = B().categories.find(k => k.id === ds.cat); if (!c) return;
    const ym = ymOf(B().today), ts = limitTargets(B(), c, ym); if (!ts.length) return;
    const tg = (ds.sub != null && ts.find(k => limKey(k) === ds.sub)) || limitDefault(ts, B(), ym);
    UI.menu = false; UI.sheet = false;
    UI.drawer = { kind: 'limit', title: t('Limit for {name}', { name: c.name }), pop: true, catId: c.id, list: !!ds.list, draft: { target: limKey(tg), amountText: limText(tg, ym) } };
    render(); limFocus();
  },
  /** From the fixed cost form ("Something you buy several times a month?"): that category's limit instead. */
  'limit-from-line'() { const d = UI.drawer, c = d && d.draft && d.draft.catId; UI.drawer = null; A['limit-open']({ cat: c || (B().categories.find(k => !k.income) || {}).id }); },
  /** The average, as the amount. */
  'limit-avg'(ds) { const d = UI.drawer; if (!d || d.kind !== 'limit') return; d.draft.amountText = plain(+ds.v); d.error = d.invalid = null; renderOverlay(); limFocus(); },
  'limit-save'() {
    const d = UI.drawer, f = d && limForm(d); if (!f) return;
    const text = String(d.draft.amountText || '').trim(), v = typedAmount(text);
    if (!text) return fail(t('Enter the monthly limit.'), 'lm-amount');
    if (v === null || v <= 0) return fail(t('Enter the limit as a number, for example 800 or 1200,50.'), 'lm-amount');
    const key = limKey(f.tg);
    let l = f.tg.line || f.tg.bill || B().plan.lines.filter(k => k.pay === 'budget' && k.categoryId === f.c.id && (k.subcategoryId || '') === key).pop();
    if (f.tg.bill) { l.pay = 'budget'; delete l.due; }      // a bill of variable amount (a supermarket) becomes the limit: every purchase counts, no due day
    else if (!l) { l = { id: newId('pl'), categoryId: f.c.id, subcategoryId: key || undefined, plan: {}, end: null, name: f.tg.name, pay: 'budget', note: '' }; B().plan.lines.push(l); }
    else if (l.end && l.end < f.ym) l.end = null;      // a limit taken off before: it runs again from this month
    setLinePlan(B(), l, f.ym, v); flash(l.id);
    toast(t('Limit saved: {amount} a month for {name}.', { amount: limMoney(v), name: limLabel(f.tg) }));
    if (d.list) return A.back();      // opened from the list: back to it, where the limit now shows
    UI.drawer = null; render();
  },
  /** Taken off from this month on, with a way to undo it. */
  'limit-remove'() {
    const d = UI.drawer, f = d && limForm(d); if (!f || !f.tg.line) return;
    const l = f.tg.line, keep = JSON.parse(JSON.stringify(l)), at = B().plan.lines.indexOf(l), book = bookKey();
    limitRemove(B(), l, f.ym);
    UI.limitUndo = { keep, at, book };
    toast(t('Limit removed from {name}.', { name: limLabel(f.tg) }), { a: 'limit-undo', label: t('Undo') });
    if (d.list) return A.back();
    UI.drawer = null; render();
  },
  'limit-undo'() {
    const u = UI.limitUndo; if (!u) return; UI.limitUndo = null;
    inBook(u.book, () => { const lines = B().plan.lines, i = lines.findIndex(k => k.id === u.keep.id); if (i >= 0) lines[i] = u.keep; else lines.splice(Math.min(u.at, lines.length), 0, u.keep); });
    UI.toast = null; renderToast(); render();
  },
};
const LIMIT_CHANGES = {
  /** Another subcategory (or the whole category): its own limit in the field. */
  'limit-for'(el) { const d = UI.drawer; if (!d || d.kind !== 'limit') return; d.draft.target = el.value; const f = limForm(d); d.draft.amountText = f ? limText(f.tg, f.ym) : ''; d.error = d.invalid = null; renderOverlay(); const s = $('lm-for'); if (s) s.focus({ preventScroll: true }); },
  /** The amount, as it is typed: what it leaves for the rest of the month. */
  'limit-amount'(el) { const d = UI.drawer; if (!d || d.kind !== 'limit') return; d.draft.amountText = el.value; const p = $('lm-left'); if (p) p.innerHTML = limLeft(d); },
};
// Enter in the amount saves, as in the other short forms
document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'lm-amount' && UI.drawer && UI.drawer.kind === 'limit' && !UI.modal) { e.preventDefault(); A['limit-save'](); save(); } });
