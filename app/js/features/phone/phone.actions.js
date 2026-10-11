/* Dorax Finance — clicks: the phone's own buttons (the round +, the quick things to do, the insight that opens). Joined into A in app/actions.js. */
const PHONE_ACTIONS = {
  // the round + in the bar at the foot: the list of things to do (quickSheet, phone.view.js)
  'nums-toggle'() { numsSet(!numsHidden()); render(); },
  quick() { UI.sheet = 'quick'; UI.quickAll = false; renderOverlay(); const el = quickFirst(); if (el) el.focus({ preventScroll: true }); },
  /** One of them, from the list or from the dashboard's row. An expense, an income or a transfer opens the transaction panel already set (on the
      company's side, in one of its accounts); paying a bill goes to the plan, where each bill has its button; putting money aside opens the goal
      when there is one, the goals when there are more; a new goal and a new fixed cost open their own panels; a statement goes to Imports. */
  'quick-go'(ds) {
    UI.sheet = false; const co = UI.space === 'business', v = ds.v;
    if (v === 'main') { const m = routeMain(UI.route); renderOverlay(); if (m) { const d = {}; m[1].replace(/data-(\w+)="([^"]*)"/g, (_, k, val) => { d[k] = val; }); A[m[0]](d); } return; }
    if (v === 'expense' || v === 'income' || v === 'transfer') {
      if (co && !S.accounts.some(k => k.scope === 'business')) { renderOverlay(); return needAccount(); }      // the company's money moves in a company account
      renderOverlay(); A['new-tx'](); if (!UI.drawer || UI.drawer.kind !== 'tx') return;
      const x = UI.drawer.draft, acc = co ? mainOf('business') || S.accounts.find(k => k.scope === 'business') : null; if (acc) x.accountId = acc.id;
      if (v === 'income') { x.type = 'income'; x.dir = 'in'; }
      if (v === 'transfer') x.type = 'transfer';
      txKind(x); renderOverlay(); const el = $('d-say') || $('d-amount'); if (el) el.focus(); return;
    }
    if (v === 'account') { renderOverlay(); return ACCOUNTS_ACTIONS['account-add'](); }
    if (v === 'pay') return navigate('plan');
    if (v === 'import') return navigate('imports');
    if (v === 'goal') { renderOverlay(); return A['goal-new']({}); }
    if (v === 'cost') { renderOverlay(); return A['line-new']({}); }
    if (v === 'limit') return A.limits();
    const live = inBook(pageBookKeyFor(), () => B().goals.filter(g => g.status === 'active'));
    if (live.length === 1) { renderOverlay(); return inBook(pageBookKeyFor(), () => A['goal-move']({ id: live[0].id, dir: 'in', book: pageBookKeyFor() })); }
    navigate('goals');
  },
  /** The day's insight, opened or folded again. */
  /** A fact of the day, tapped: what it is about (phoneInsight, features/phone/phone.view.js). Only a mark of freedom opens What if…?. */
  'ins-go'(ds) {
    const k = ds.k;
    if (k === 'pace' || k === 'mover') return A['filter-cat']({ cat: k === 'mover' ? ds.id || '' : '' });
    if (k === 'goal' && ds.id) return A['goal-open']({ id: ds.id });
    if (k === 'mark') return A.whatif({});
    if (k === 'day') return A['runway-view']();
    if (k === 'rate') { UI.repView = 'in'; return go('reports'); }
    go(k === 'streak' || k === 'goal' ? 'goals' : 'plan');      // the bills and the first steps: the plan; a run of months: the goals
  },
  'insight-open'() { UI.insightOpen = !UI.insightOpen; render(); const el = $('insight-open'); if (el) el.focus({ preventScroll: true }); },
  /** A curiosity's signal, opened into the notice itself. */
  'curio-open'() { if (!UI.curio) return; UI.curio.open = true; renderCurio(); const el = document.querySelector('#curio [data-a="curio-next"]'); if (el) el.focus({ preventScroll: true }); },
};
