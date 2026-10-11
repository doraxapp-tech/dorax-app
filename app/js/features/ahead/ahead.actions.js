/* Dorax Finance — clicks: looking ahead (the days-of-freedom panel, and the dashboard's question about a company). Joined into A in app/actions.js. */
const AHEAD_ACTIONS = {
  // the estimate of what goes out in a month belongs to the side in use: the household's is user.spend, the company's is company.spend[currency]
  'runway-edit'() {
    const co = inCompany(), cur = BCUR(), now = co ? ((S.company || {}).spend || {})[cur] : S.user.spend;
    UI.drawer = { kind: 'runway', title: co ? t('Company runway') : t('Days of freedom'), book: bookKey(), draft: { spendText: now ? plain(now) : '' } };
    renderOverlay(); const el = $('rw-spend'); if (el) el.focus();
  },
  'runway-save'() {
    const txt = String(UI.drawer.draft.spendText || '').trim(), v = txt === '' ? 0 : typedAmount(txt), co = inCompany(), cur = BCUR();
    if (v === null || v < 0) return fail(t('Enter the amount as a number, for example 1500 or 9,90.'));
    if (co) { const sp = { ...((S.company || {}).spend || {}) }; if (v) sp[cur] = v; else delete sp[cur]; S.company.spend = sp; }
    else if (v) S.user.spend = v; else delete S.user.spend;
    UI.drawer = null; toast(v ? (co ? t('Saved. The company’s runway is counted with it.') : t('Saved. Your days of freedom are counted with it.')) : t('Estimate removed. Dorax counts with what is recorded.')); render();
  },
  /** The dashboard's question. Yes: the company's side, through its setup when it has nothing yet, and the Household | Company choice from then on.
      No: the question is put away and no choice is shown; the person's menu keeps "Open a company account" (co-open). */
  'co-answer'(ds, el) {
    S.user.company = ds.v === 'yes';
    if (!S.user.company) { toast(t('Got it. If that changes, “Open a company account” is in your menu.')); return render(); }
    delete S.user.coLater; A.space({ v: 'business' }, el);      // a tap on Yes: the loading screen first, then the company's side behind it
  },
  'co-open'() { UI.menu = false; UI.sheet = false; renderOverlay(); A['co-answer']({ v: 'yes' }); },
  /** "Another": the next insight in today's list. Nothing is remembered: tomorrow starts from the day's own again. */
  'insight-next'() { UI.insightSkip = (UI.insightSkip || 0) + 1; render(); const b = $('insight-next'); if (b) b.focus({ preventScroll: true }); insightSwap(); },
  /** Opens "What if…?" on a goal of the side in use: the one asked for, or the one reached first. */
  whatif(ds) {
    const bk = B(), goals = whatIfGoals(bk, bk.today), when = g => { const a = goalArrival(bk, g, bk.today); return a ? a.ym : '9'; };
    const g = goals.find(x => x.id === (ds && ds.id)) || goals.slice().sort((x, y) => when(x) < when(y) ? -1 : when(x) > when(y) ? 1 : 0)[0];
    UI.drawer = { kind: 'whatif', title: t('What if…?'), book: bookKey(), draft: { goalId: g ? g.id : '', less: '0', more: '0', once: '0' } };
    renderOverlay(); const el = $('wi-less-r'); if (el) el.focus({ preventScroll: true });
  },
  /** Keeps the monthly part of the change: the goal's plan rises by it from this month on. A goal with nothing planned ahead gets the amount from this
      month until it is reached or the year ends, the way the first-time setup plans a goal. The amount put aside once is not written anywhere. */
  'whatif-apply'() {
    const bk = B(), d = UI.drawer.draft, ch = wiChange(d), extra = ch.less + ch.more, g = whatIfGoals(bk, bk.today).find(x => x.id === d.goalId); if (!g || !extra) return;
    const nowYm = ymOf(bk.today), last = raiseGoalPlan(g, nowYm, extra);
    if (!last) { const a = goalArrival(bk, g, bk.today); if (a) setGoalPlan(g, nowYm, [a.ym, nowYm.slice(0, 4) + '-12'].sort()[0], extra); }
    UI.drawer = null; toast(t('Done. {name} now plans {amount} more a month.', { name: g.name, amount: fmt.money(extra, BCUR(), { trim: true }) })); render();
  },
  // curiosities (features/ahead/curios.view.js)
  'curio-close'() { UI.curio = null; renderCurio(); },
  /** Another one now, on request: it is written down like any other, so the day's count stays honest. */
  'curio-next'() { const id = curioNext(S, UI.space === 'business', UI.curio && UI.curio.id); if (!id) return; curioShown(S, id, S.today, Date.now()); UI.curio = { id, open: true }; inboxAdd({ kind: 'curio', id }); renderCurio(); const b = document.querySelector('#curio [data-a="curio-next"]'); if (b) b.focus({ preventScroll: true }); },
  /** "Fewer of these": one step down, said back with where to change it again. */
  'curio-less'() { const r = curioStep(S, 1); UI.curio = null; renderCurio(); toast(r === 'off' ? t('Done: no more curiosities. You can bring them back in your profile.') : t('Done: {rate}. You can change it in your profile.', { rate: curioRateLabel(r) })); },
};
/** The answer and the buttons of "What if…?" follow the sliders without the panel being redrawn under the person's fingers. */
function wiShow() { const d = UI.drawer && UI.drawer.draft, o = $('wi-out'), f = $('wi-foot'); if (!d) return; if (o) o.innerHTML = whatIfOut(d); if (f) f.innerHTML = whatIfFoot(d); }
const AHEAD_CHANGES = {
  'curio-rate'(el) { const u = S.user; u.curio = u.curio || {}; u.curio.rate = CURIO_RATES.includes(el.value) ? el.value : 'normal'; if (u.curio.rate === 'off') { UI.curio = null; renderCurio(); } render(); },
  wi(el) {
    UI.drawer.draft[el.dataset.k] = el.value;
    const r = el.dataset.range && $(el.dataset.range), c = r ? typedAmount(el.value) : null;
    if (r && c !== null && c >= 0) obRangeShow(r, Math.min(+r.max, Math.round(c / 100)));
    wiShow();
  },
  'wi-range'(el) { const n = +el.value, text = plain(n * 100); UI.drawer.draft[el.dataset.k] = text; const f = $(el.dataset.text); if (f) f.value = text; obRangeShow(el, n); wiShow(); },
  'wi-goal'(el) { UI.drawer.draft.goalId = el.value; wiShow(); },
};
