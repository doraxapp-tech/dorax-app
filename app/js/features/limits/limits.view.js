/* Dorax Finance — spending limits: the overview (the month as planned, the limits filling up against the days of the month), its card on the Plan,
   the same overview as a panel, the panel that sets one limit, and the line each category shows on Categories & rules.
   Owner, 2026-10-10: "how do you put a limit on a category? I can't find that option, and if I can't find it, it is because it is hard to find"; then,
   having looked at Mobills and Organizze together: "yes, do it" to (1) a "today" mark on every bar, as Organizze's "Hoje"; (2) Mobills' "what has
   no job yet", worked out from the Plan instead of asked again; (3) the Plan in two: fixed bills, and limits.
   Where a limit is found: the Plan's card "Spending limits" (under the month's payments); Categories & rules (each category, its limit or "Set a
   limit"); a phone's +, the search ("limit", "budget") and Help, which open the overview as a panel; the profile's reminders ("See my limits").
   The guide "Plan your month" (plan-guide.view.js) sets several at once. Calculations: core/limits.js; clicks: limits.actions.js; styles:
   css/screens/limits.css. Money in the side's currency, whole reais. */
const limMoney = v => fmt.money(v, BCUR(), { trim: true });
const limYm = () => ymOf(B().today);
const limPace = () => monthPace(B().today);
/** Spending faster than the month runs: more than ten points past the share of the month already gone, still within the limit. */
const limFast = x => x.left >= 0 && x.pct >= limPace() + 10;
const limLevel = x => x.left < 0 ? 'crit' : x.pct >= BUDGET_NEAR || limFast(x) ? 'warn' : 'go';
/** A limit's bar, with the mark of today across it. */
const limMeter = x => `<div class="lim-bar">${meter(Math.min(100, x.pct), limLevel(x))}<i class="lim-today" style="left:${limPace()}%" aria-hidden="true"></i></div>`;
/** One limit in words: what is spent of it this month, or how far it went over; and when it runs ahead of the month, that too. */
const limSay = x => (x.left < 0 ? t('{over} over {limit} this month', { over: limMoney(-x.left), limit: limMoney(x.planned) }) : t('{spent} of {limit} this month', { spent: limMoney(x.spent), limit: limMoney(x.planned) }))
  + (limFast(x) ? ' · ' + t('faster than the month') : '');
const limNow = () => limitsNow(B(), limYm(), BCUR(), B().today);
const limKey = x => x.sub ? x.sub.id : '';
/** A target's name: a subcategory's own; the whole category's, or "Everything else in Home" when some of its subcategories have lines of their own. */
const limLabel = x => x.sub ? x.name : x.rest ? t('Everything else in {name}', { name: x.cat.name }) : x.name;
const limChev = () => `<span class="mr-chev" aria-hidden="true">${icon('right')}</span>`;
/** The targets worth offering: not a whole category whose subcategories all have lines of their own (it would count almost nothing). */
const limUsable = info => info.targets.filter(x => !(x.empty && !x.sub) || info.set.some(y => y.id === x.id));
const limDot = (c, sub) => catGlyph(c, '', sub && sub.id);      // the category's icon, or its subcategory's (ui/cat-icons.js)

/** On Categories & rules, under an expense category: its limit filling up (all its limits together when there are several), or the way to give it
    one. Nothing when it can have none. info: limitsNow()[cat.id]. */
function catLimitRow(info) {
  if (!info || !limUsable(info).length) return '';
  const c = info.cat;
  if (!info.set.length) return `<button class="linkbtn cat-lim-add" data-a="limit-open" data-cat="${c.id}" aria-label="${esc(t('Set a limit for {name}', { name: c.name }))}">${icon('plus')}${t('Set a limit')}</button>`;
  const one = info.set.length === 1 && !info.set[0].sub && !info.set[0].rest, x = one ? info.set[0] : { planned: info.planned, spent: info.spent, left: info.planned - info.spent, pct: Math.round(info.spent * 100 / info.planned) };
  const say = one ? limSay(x) : tn(info.set.length, '{n} limit · {say}', '{n} limits · {say}', { say: limSay(x) });
  return `<button class="cat-lim ${limLevel(x)}" data-a="limit-open" data-cat="${c.id}" data-sub="${limKey(info.set[0])}" aria-label="${esc(t('Limit for {name}', { name: c.name }) + ': ' + say)}"><span class="cat-lim-t">${icon('gauge')}<span>${say}</span></span>${limMeter(x)}</button>`;
}

/** The month as planned, Mobills' "what has no job yet" worked out from the Plan: what comes in, and how it splits into fixed bills, what is set
    aside, limits, and what is left without a job. In the colours of the summary's "Your month, as planned" (features/dashboard/dashboard.view.js). */
function limMonth(mp, quiet, edit) {      // quiet: without the line that says it is over (the bell's panel says it already); edit: "Change" beside the income (a computer's Plan)
  if (!mp.income) return `<div class="lim-month none"><p class="note">${t('Put in what comes in each month and Dorax shows how much of it has no job yet.')}</p></div>`;
  const parts = [[t('Fixed bills'), mp.bills, 'var(--s3)'], [mp.pct && mp.target >= mp.goals ? t('Savings ({pct}%)', { pct: mp.pct }) : t('Savings and goals'), mp.saving, 'var(--s1)'], [t('Limits'), mp.limits, 'var(--s5)'], [t('Not assigned yet'), Math.max(0, mp.free), 'var(--col-muted)']].filter(x => x[1] > 0);
  return `<div class="lim-month"><div class="lim-mh"><span class="note">${t('Comes in this month')}${edit ? ` <button type="button" class="linkbtn lim-edit" data-a="plan-income">${t('Change@verb')}</button>` : ''}</span><b class="num">${limMoney(mp.income)}</b></div>
      <div class="stackbar" role="img" aria-label="${esc(parts.map(x => `${x[0]} ${limMoney(x[1])}`).join(', '))}">${parts.map(x => `<span style="flex:${x[1]};background:${x[2]}"></span>`).join('')}</div>
      <div class="legend lim-legend">${parts.map(x => `<div class="legend-row still"><span class="dot" style="background:${x[2]}"></span><span>${x[0]}</span><span class="num">${limMoney(x[1])}</span><span class="pct num">${fmt.pct(Math.round(x[1] * 100 / mp.income))}</span></div>`).join('')}</div>
      ${mp.free < 0 && !quiet ? `<p class="note neg lim-over">${t('The plan uses {amount} more than the planned income.', { amount: limMoney(-mp.free) })}</p>` : ''}</div>`;
}
/** All the limits of the month in one bar, with today across it. */
function limTotal(by) {
  const all = Object.values(by).flatMap(i => i.set); if (!all.length) return '';
  const planned = sum(all.map(x => x.planned)), spent = sum(all.map(x => x.spent)), x = { planned, spent, left: planned - spent, pct: Math.round(spent * 100 / planned) };
  return `<div class="lim-total"><div class="lim-th"><b>${t('Your limits this month')}</b><span class="num">${limSay(x)}</span></div>
      <div class="lim-bar big">${meter(Math.min(100, x.pct), limLevel(x))}<i class="lim-today" style="left:${limPace()}%" aria-hidden="true"><span>${t('Today')}</span></i></div></div>`;
}
/** Every expense category in its usual order: its limits filling up, or "Set a limit". A category whose limits are on parts of it lists them under its name. */
function limRows(by) {
  const item = c => {
    const info = by[c.id];
    if (!limUsable(info).length) return `<li><div class="lim-c still">${limDot(c)}<span class="grow"><b>${esc(c.name)}</b><small>${t('Its costs are fixed bills in the Plan.')}</small></span></div></li>`;
    if (!info.set.length) return `<li><button class="lim-c" data-a="limit-open" data-cat="${c.id}" data-list="1">${limDot(c)}<span class="grow"><b>${esc(c.name)}</b></span><span class="lim-add">${icon('plus')}${t('Set a limit')}</span></button></li>`;
    const only = info.set.length === 1 && !info.set[0].sub && !info.set[0].rest ? info.set[0] : null;
    if (only) return `<li><button class="lim-c" data-a="limit-open" data-cat="${c.id}" data-sub="" data-list="1">${limDot(c)}<span class="grow"><b>${esc(c.name)}</b><small>${limSay(only)}</small>${limMeter(only)}</span>${limChev()}</button></li>`;
    const free = limUsable(info).filter(x => !info.set.some(y => y.id === x.id));
    return `<li class="lim-g"><div class="lim-gh">${limDot(c)}<b>${esc(c.name)}</b></div>
      ${info.set.map(x => `<button class="lim-c sub" data-a="limit-open" data-cat="${c.id}" data-sub="${limKey(x)}" data-list="1">${x.sub ? catGlyph(c, 'sm', x.sub.id) : ''}<span class="grow"><b>${esc(limLabel(x))}</b><small>${limSay(x)}</small>${limMeter(x)}</span>${limChev()}</button>`).join('')}
      ${free.length ? `<button class="lim-c sub more" data-a="limit-open" data-cat="${c.id}" data-sub="${limKey(free[0])}" data-list="1"><span class="lim-add">${icon('plus')}${t('Another limit in {name}', { name: esc(c.name) })}</span></button>` : ''}</li>`;
  };
  return `<ul class="lim-list">${B().categories.filter(c => !c.income).map(item).join('')}</ul>`;
}
const limAny = by => Object.values(by).some(i => i.set.length);
/** The invitation to the guide while the side has no limit (owner, 2026-10-10: "I myself didn't know, and the web app didn't even recommend it,
    knowing how important it is to have a spending limit"). */
const limInvite = () => `<div class="lim-invite"><span class="fl-ico">${icon('gauge')}</span><div class="grow"><b>${t('Give each category a monthly cap')}</b><p>${t('Three steps: what comes in, what you keep, and how much to spend on each category. Dorax lets you know at 80%.')}</p></div><button class="btn primary" data-a="plan-guide">${t('Plan my month')}</button></div>`;

/** On the Plan, under the month's payments: the limits, apart from the bills (owner, 2026-10-10: "yes, do it"). */
function planLimitsCard(noMonth) {      // noMonth: a computer's Plan shows the month in its own card beside it (features/plan/plan-desk.view.js)
  const by = limNow(), any = limAny(by), mp = monthPlan(B(), limYm());
  return `<section class="card" id="limits-card"><div class="card-h"><h2>${t('Spending limits')}</h2>${info(t('A monthly cap for what you spend in a category, apart from the bills. The line across each bar is today: past it, you are spending faster than the month goes by.'))}
      ${any ? `<div class="right"><button class="btn sm ghost" data-a="plan-guide">${icon('gauge')}${t('Plan again')}</button></div>` : ''}</div>
    <div class="card-b lim">${any ? '' : limInvite()}${noMonth ? '' : limMonth(mp)}${limTotal(by)}${limRows(by)}</div></section>`;
}
/** The same overview as a panel: from a phone's +, the search, Help and the profile. */
function limitsDrawer() {
  const by = limNow(), any = limAny(by);
  return `<div class="body lim">${any ? `<p class="note">${t('A monthly cap on what you spend in a category. Dorax lets you know when you reach 80% and if you go over.')}</p>` : limInvite()}
      ${limMonth(monthPlan(B(), limYm()))}${limTotal(by)}${limRows(by)}
      ${any ? `<button class="btn ghost lim-again" data-a="plan-guide">${icon('gauge')}${t('Plan my month again')}</button>` : ''}</div>`;
}

/** What is left of the limit being typed, for the rest of the month (updated as it is typed: limits.actions.js, 'limit-amount'). */
function limLeft(d) {
  const f = limForm(d); if (!f) return '';
  const v = typedAmount(d.draft.amountText || ''), so = f.spent ? t('This month so far: {amount}.', { amount: `<b class="num">${limMoney(f.spent)}</b>` }) : t('Nothing spent in it this month yet.');
  if (v === null || v <= 0) return so;
  const left = v - f.spent, days = daysInMonth(f.ym) - +B().today.slice(8) + 1;
  return so + ' ' + (left >= 0 ? tn(days, 'With this limit, {left} left for {n} day: about {day} a day.', 'With this limit, {left} left for {n} days: about {day} a day.', { left: `<b class="num">${limMoney(left)}</b>`, day: limMoney(Math.floor(left / days / 100) * 100) })
    : t('That is {over} less than you have already spent.', { over: `<b class="num">${limMoney(-left)}</b>` }));
}
/** The panel's category, its targets and the one chosen, and what that one has taken this month. null when the category is gone. */
function limForm(d) {
  const c = B().categories.find(k => k.id === d.catId); if (!c) return null;
  const ym = limYm(), targets = limitTargets(B(), c, ym), tg = targets.find(k => limKey(k) === d.draft.target) || limitDefault(targets, B(), ym); if (!tg) return null;
  const tt = categoryTotals(B(), ym, BCUR());
  return { c, ym, targets, tg, spent: tg.sub ? tt.bySub[tg.sub.id] || 0 : lineActual({ categoryId: c.id }, tt, linesLive(B(), ym)), has: !!tg.line && planValue(B(), tg.line, ym) > 0 };
}
/** A target as an option of "For": a bill that would become a limit says so. */
const limOption = (k, c) => [limKey(k), k.bill ? `${k.name} · ${t('now a bill')}` : k.sub ? k.name : k.rest ? t('Everything else in {name}', { name: c.name }) : t('The whole category')];
/** What the chosen target counts, when that is not plain: the rest of a category, or a bill that becomes a limit. */
function limCovers(f) {
  const x = f.tg;
  if (x.bill) return t('{name} is a bill of variable amount in your Plan ({amount}). With a limit it counts every purchase of the month and has no due day.', { name: esc(x.name), amount: limMoney(planValue(B(), x.bill, f.ym)) });
  if (x.sub || !x.rest) return '';
  const own = [...ownSubs(linesLive(B(), f.ym), { categoryId: f.c.id })].map(id => (f.c.subs.find(s => s.id === id) || {}).name).filter(Boolean);
  if (x.empty) return t('Every subcategory of {name} has its own line in the Plan, so this limit counts only what has no subcategory.', { name: esc(f.c.name) });
  const list = own.length > 3 ? t('{list} and {n} more', { list: own.slice(0, 3).map(esc).join(', '), n: own.length - 3 }) : own.map(esc).join(', ');
  return t('It counts what you spend in {name} outside its own lines in the Plan: {list}.', { name: esc(f.c.name), list });
}
/** The panel: for what (when the category can have more than one), the monthly amount, the average as a starting point, what is left. */
function limitDrawer(d) {
  const f = limForm(d); if (!f) return `<div class="body"><p class="note">${t('Its costs are fixed bills in the Plan.')}</p></div>`;
  const avg = limitAverage(B(), f.tg, f.ym, BCUR()), x = d.draft, alerts = reminderOptions(S).budgets, covers = limCovers(f);
  const forWhat = f.targets.length > 1 ? fld('lm-for', t('For'), `<select id="lm-for" data-c="limit-for">${options(f.targets.map(k => limOption(k, f.c)), limKey(f.tg))}</select>`) : '';
  return `<div class="body lim-form">${d.error ? errBanner(d.error) : ''}
      <div class="form-grid">${forWhat}
        ${fld('lm-amount', tcur('Each month (R$)'), `<input type="text" id="lm-amount" value="${esc(x.amountText)}" data-c="limit-amount" data-live="1" inputmode="decimal" class="num" placeholder="0" autocomplete="off" enterkeyhint="done">`, f.targets.length > 1 ? '' : 'full')}</div>
      ${covers ? `<p class="note lim-covers">${covers}</p>` : ''}
      ${avg ? `<button type="button" class="lim-avg" data-a="limit-avg" data-v="${avg.amount}">${t('Use {amount}', { amount: `<b class="num">${limMoney(avg.amount)}</b>` })}<small>${tn(avg.n, 'your average of the last {n} month with spending', 'your average of the last {n} months with spending')}</small></button>` : ''}
      <p class="note" id="lm-left" aria-live="polite">${limLeft(d)}</p>
      <p class="note">${t('From this month on.')} ${alerts ? t('Dorax lets you know when you reach 80% and if you go over.') : t('Alerts for limits are off in your profile, under Reminders.')}</p>
    </div>
    <footer><button class="btn primary" data-a="limit-save">${t('Save limit')}</button>${f.has ? `<button class="btn ghost danger" data-a="limit-remove">${t('Remove limit')}</button>` : ''}<button class="btn ghost spacer" data-a="close">${t('Cancel')}</button></footer>`;
}
