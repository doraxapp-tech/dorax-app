/* Dorax Finance — "What if…?": a panel where three sliders try a change on, and the goal's date and the days of freedom answer at once.
   2026-10-07 (owner: "a projection module, what happens if…, with projected goal dates"). The sums are core/whatif.js. Nothing is saved while the
   sliders move; the one thing that can be kept is said on its button ("Add R$ 200 a month to this goal's plan").
   Shorter (owner, 2026-10-10: "the What if menu is very long, shorten it"): no sentence before the sliders (what it said, that nothing is saved,
   is now the last line), the goal is chosen on one line, the sliders sit closer, and each answer is today against the change side by side, in
   one line, without the bars under the days of freedom. */
const WI_STEP = 50;
/** What the three fields say, in cents. A field that cannot be read counts as nothing. */
function wiChange(d) { const c = v => { const n = typedAmount(String(v || '0')); return n === null || n < 0 ? 0 : n; }; return { less: c(d.less), more: c(d.more), once: c(d.once) }; }
/** The far end of "I spend less" (reais): what goes out today, less one step, so there is always a pace left to measure. */
function wiLessMax() { const burn = runway(B(), B().today, BCUR()).burn.amount; return burn > 0 ? Math.max(WI_STEP, Math.floor((burn - 100) / (WI_STEP * 100)) * WI_STEP) : 2000; }
/** The answer, redrawn as the sliders move (ahead.actions.js). It is worked out for the side the panel was opened on: the company's says
    "reserve" and "runway" (2026-10-07). */
function whatIfOut(d) {
  const co = inCompany(), cur = BCUR(), ch = wiChange(d), w = whatIf(B(), B().today, cur, d.goalId, ch), changed = w.extra > 0 || w.once > 0, span = days => rwFigure(days, co).span;
  const row = (label, value, cls, chip) => `<div class="wi-row ${cls || ''}"><span>${label}</span><b>${value}</b>${chip || ''}</div>`, cmp = (...cells) => `<div class="wi-cmp">${cells.join('')}</div>`;
  let goal;
  if (!w.goal) goal = `<div class="wi-block"><h3>${co ? t('The reserve’s date') : t('Your goal’s date')}</h3><p class="note">${co ? t('No reserve with a target yet. Create one and see its date move here.') : t('No goal with a target yet. Create one and see its date move here.')}</p><div><button class="btn sm" data-a="goal-new">${icon('plus')}${t('New goal')}</button></div></div>`;
  else {
    const g = w.goal, none = `<span class="muted">${t('No date yet')}</span>`;
    const chip = !changed ? '' : g.sooner > 0 ? `<span class="chip good"><i></i>${tn(g.sooner, '{n} month sooner', '{n} months sooner')}</span>` : !g.from && g.to ? `<span class="chip good"><i></i>${t('Now it has a date')}</span>` : '';
    goal = `<div class="wi-block"><h3>${esc(g.name)}</h3>${cmp(row(t('At today’s pace'), g.from ? fmt.month(g.from) : none),
      row(t('With this change'), g.reached ? t('Reached today') : g.to ? fmt.month(g.to) : none, changed && g.to ? 'to' : '', chip))}</div>`;
  }
  const yearTitle = co ? t('Company runway a year from now') : t('Days of freedom a year from now');
  const year = !w.year ? `<div class="wi-block"><h3>${yearTitle}</h3><p class="note">${co ? t('Say what the company’s costs are in a month and its runway shows here too.') : t('Tell Dorax what goes out each month and your days of freedom show here too.')}</p><div><button class="btn sm" data-a="runway-edit">${t('Set my numbers')}</button></div></div>`
    : `<div class="wi-block"><h3>${yearTitle}</h3>${cmp(row(t('At today’s pace'), span(w.year.from)), w.year.to === null ? '' : row(t('With this change'), span(w.year.to), changed ? 'to' : ''))}
      ${w.year.to === null ? `<p class="note">${t('With nothing going out there is no pace to measure.')}</p>` : ''}</div>`;
  return `${goal}${year}${w.goal && w.once > 0 ? `<p class="note">${t('The amount put aside once is not added to the plan. Record it in the goal the day it happens.')}</p>` : ''}
    <p class="note">${t('A simple sum: every month like this one, and no investment returns.')} ${t('Nothing is saved until you say so.')}</p>`;
}
/** The panel's buttons. Keeping the change is offered once there is a monthly amount and a goal to give it to. */
function whatIfFoot(d) {
  const co = inCompany(), ch = wiChange(d), extra = ch.less + ch.more, g = whatIfGoals(B(), B().today).find(x => x.id === d.goalId), v = { amount: fmt.money(extra, BCUR(), { trim: true }) };
  // no Close at the bottom, the X at the top closes; with nothing to keep there is no footer at all (2026-10-10: a shorter What if)
  return g && extra > 0 ? `<button class="btn primary" data-a="whatif-apply">${co ? t('Add {amount} a month to this reserve’s plan', v) : t('Add {amount} a month to this goal’s plan', v)}</button>` : '';
}
function whatIfDrawer(d) {
  const co = inCompany(), goals = whatIfGoals(B(), B().today), v = d.draft, sym = BCUR() === 'USD' ? 'US$' : 'R$';
  return `<div class="body wi">
    ${goals.length > 1 ? `<div class="field inline wi-pick"><label for="wi-goal">${t('Goal')}</label><select id="wi-goal" data-c="wi-goal">${options(goals.map(g => [g.id, g.name]), v.goalId)}</select></div>` : ''}
    ${obSlide('wi-less', co ? t('The company costs less each month') : t('I spend less each month'), 'less', v.less, wiLessMax(), WI_STEP, 'wi', sym)}
    ${obSlide('wi-more', co ? t('The company receives more each month') : t('I earn more each month'), 'more', v.more, 5000, WI_STEP, 'wi', sym)}
    ${obSlide('wi-once', co ? t('The company sets aside once, today') : t('I put aside once, today'), 'once', v.once, 20000, 100, 'wi', sym)}
    <div id="wi-out" class="wi-out" aria-live="polite">${whatIfOut(v)}</div></div>
  <footer id="wi-foot">${whatIfFoot(v)}</footer>`;
}
