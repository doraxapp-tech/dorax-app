/* Dorax Finance — the close of the month, guided (Sprint 3; the facts: core/month-close.js). In the first ten days of a month, while the month before
   has movements and its close has not been seen: a short note at the top of the summary ("October closed. See how it went: 3 steps") and a button
   on the bell's "October is closed". It opens on the whole screen of a phone, a card in the middle of a computer, as the onboarding does:
     1. how the month closed: what was left over (or spent above what came in), what came in and went out side by side, the month before, the limits;
     2. the goals: what each one got, against its plan;
     3. the month that starts: how much can be spent a day (features/dashboard/free-until.view.js), and the Plan;
     4. a celebration when it was met (confetti, said plainly); else, a kind word: every month starts again.
   Said as for a child (owner, 2026-10-11). The household's: the company's month is closed with its accountant. Clicks: month-close.actions.js.
   Styles: css/screens/month-close.css. Texts: i18n/text/month-close.js. */
const MC_DAYS = 10;
/** The month whose close is offered now: the one before, in the first ten days, when it has movements and its close was not seen; else ''. */
function mcOffered() {
  if (!UI.session || inCompany() || +S.today.slice(8) > MC_DAYS) return '';
  const ym = addMonths(ymOf(S.today), -1), seen = (S.user.closeSeen || {})[ym];
  return !seen && inBook('personal', () => monthSummary(B(), ym, BASE_CURRENCY).count > 0) ? ym : '';
}
/** A month in a sentence: "octubre" (lower case in Spanish and Portuguese). */
const mcMonth = ym => { const n = mon(+ym.slice(5) - 1, true); return S.settings.lang === 'en' ? n : n.toLowerCase(); };
/** A month at the start of a sentence or a title: "Septiembre". */
const mcMonthCap = ym => mon(+ym.slice(5) - 1, true);
const mcMoney = v => fmt.money(v, BASE_CURRENCY, { round: true });
/** The note at the top of the summary. */
function monthCloseCard() {
  const ym = mcOffered(); if (!ym) return '';
  return `<aside class="mc-ask" id="mc-ask" aria-labelledby="mc-ask-h"><span class="mc-ask-ico" aria-hidden="true">${icon('calendar')}</span>
    <span class="mc-ask-t"><b id="mc-ask-h">${t('{month} closed', { month: mcMonthCap(ym) })}</b><small>${t('See how it went, in 3 short steps.')}</small></span>
    <button class="btn sm primary" data-a="month-close" data-ym="${ym}">${t('See it')}</button><button class="iconbtn mc-ask-x" data-a="month-close-later" data-ym="${ym}" aria-label="${t('Not now')}">${icon('x')}</button></aside>`;
}
const mcHead = (n, title) => `<p class="pg-step">${t('Step {n} of 3', { n })}</p><h3 class="pg-h mc-h" id="mc-h" tabindex="-1">${title}</h3>`;
/** Step 1: how it closed. */
function mcStep1(c) {
  const top = Math.max(c.income, c.expenses, 1), bar = (cls, label, v) => `<li class="${cls}"><span class="mc-bl">${label}</span><span class="mc-track"><i style="width:${Math.max(2, Math.round(v * 100 / top))}%"></i></span><b class="num">${mcMoney(v)}</b></li>`;
  const big = c.saved >= 0 ? `<p class="mc-big good">${t('{amount} left over', { amount: `<span class="num">${mcMoney(c.saved)}</span>` })}</p>` : `<p class="mc-big">${t('{amount} more went out than came in', { amount: `<span class="num">${mcMoney(-c.saved)}</span>` })}</p>`;
  const before = c.before === null ? '' : `<p class="note">${c.before >= 0 ? t('In {month}, {amount} was left over.', { month: mcMonth(addMonths(c.ym, -1)), amount: mcMoney(c.before) }) : t('In {month}, {amount} more went out than came in.', { month: mcMonth(addMonths(c.ym, -1)), amount: mcMoney(-c.before) })}</p>`;
  const lims = !c.limits ? '' : `<p class="mc-lims">${c.over.length ? icon('alert') : icon('check')}<span>${c.over.length ? tn(c.limits - c.over.length, 'You kept {n} of your {k} limits.', 'You kept {n} of your {k} limits.', { k: c.limits }) + ' ' + t('Over: {list}.', { list: c.over.map(o => `${esc(o.name)} (${mcMoney(o.amount)})`).join(', ') }) : tn(c.limits, 'You kept your limit.', 'You kept all your {n} limits.')}</span></p>`;
  return `${mcHead(1, t('How {month} closed', { month: mcMonth(c.ym) }))}${big}
    <ul class="mc-bars">${bar('in', t('Came in'), c.income)}${bar('out', t('Went out'), c.expenses)}</ul>${before}${lims}`;
}
/** Step 2: the goals. */
function mcStep2(c) {
  if (!c.goals.length) return `${mcHead(2, t('Your goals in {month}', { month: mcMonth(c.ym) }))}<p class="note">${t('You had no goals receiving money this month. A goal gives your money a job: a trip, a reserve, the IPVA.')}</p>
    <button class="btn" data-a="month-close-go" data-v="goals">${t('Create a goal')}</button>`;
  const row = x => { const ok = x.done >= x.planned && x.planned > 0;
    return `<li class="${ok ? 'ok' : ''}"><span class="mc-gi" aria-hidden="true">${ok ? icon('check') : icon(x.yearly ? 'calendar' : 'flag')}</span><span class="grow"><b>${esc(x.name)}</b><small>${x.planned ? (ok ? t('{amount} set aside, as planned', { amount: mcMoney(x.done) }) : t('{amount} of the {plan} planned', { amount: mcMoney(Math.max(0, x.done)), plan: mcMoney(x.planned) })) : t('{amount} set aside', { amount: mcMoney(Math.max(0, x.done)) })}</small>
      ${x.target ? meter(Math.min(100, Math.round(x.saved * 100 / x.target)), 'go') : ''}</span></li>`; };
  return `${mcHead(2, t('Your goals in {month}', { month: mcMonth(c.ym) }))}
    <p class="mc-big${c.done >= c.planned ? ' good' : ''}">${t('{amount} set aside', { amount: `<span class="num">${mcMoney(c.done)}</span>` })}</p>
    ${c.planned ? `<p class="note">${c.done >= c.planned ? t('All that was planned, and the goals moved on.') : t('Of the {amount} planned.', { amount: mcMoney(c.planned) })}</p>` : ''}
    <ul class="mc-goals">${c.goals.map(row).join('')}</ul>`;
}
/** Step 3: the month that starts. */
function mcStep3(c) {
  const now = addMonths(c.ym, 1), r = freeUntil(B(), S.today, BASE_CURRENCY);
  const fig = !r ? '' : r.free > 0 ? `<p class="mc-lead">${t('This month you can spend')}</p>${fuBig(r)}<p class="fu-say">${fuSay(r)}</p>` : `<p class="mc-lead">${fuTitle(r)}</p>${fuBig(r)}<p class="fu-say">${fuSay(r)}</p>`;
  return `${mcHead(3, t('{month} starts', { month: S.settings.lang === 'en' ? mcMonthCap(now) : mcMonth(now) }))}${fig}
    <p class="note">${t('Your Plan for {month} is ready: the bills, what you keep and your limits.', { month: mcMonth(now) })} <button class="linkbtn" data-a="month-close-go" data-v="plan">${t('See the Plan')}</button></p>`;
}
/** The end: a celebration when it was met; else a kind word. */
function mcEnd(c) {
  if (c.met) return `<div class="mc-end good"><span class="mc-end-ico" aria-hidden="true">${icon('spark')}</span><h3 class="pg-h mc-h" id="mc-h" tabindex="-1">${t('You did it!')}</h3>
    <p>${c.limits ? t('{month} went as you planned it: money left over, your goals got what was planned, and you kept your limits.', { month: mcMonthCap(c.ym) }) : t('{month} went as you planned it: money left over, and your goals got what was planned.', { month: mcMonthCap(c.ym) })}</p></div>`;
  return `<div class="mc-end"><span class="mc-end-ico" aria-hidden="true">${icon('sun')}</span><h3 class="pg-h mc-h" id="mc-h" tabindex="-1">${t('{month} is behind you', { month: mcMonthCap(c.ym) })}</h3>
    <p>${t('It did not all go as planned, and that happens. Every month starts again: {month} is a new one.', { month: mcMonth(addMonths(c.ym, 1)) })}</p></div>`;
}
function monthCloseDrawer(d) {
  const c = inBook('personal', () => monthClose(B(), d.ym, BASE_CURRENCY)), step = d.step || 0;
  const body = [mcStep1, mcStep2, mcStep3, mcEnd][step](c), last = step === 3;
  return `<div class="body pg mc">${body}${last ? '' : `<ol class="mc-dots" aria-hidden="true">${[0, 1, 2].map(i => `<li class="${i === step ? 'on' : i < step ? 'done' : ''}"></li>`).join('')}</ol>`}</div>
    <footer>${last ? `<button class="btn primary" data-a="month-close-done">${t('Done')}</button>` : `<button class="btn primary" data-a="month-close-step" data-v="${step + 1}">${t('Next')}</button>`}
      ${step > 0 && !last ? `<button class="btn ghost" data-a="month-close-step" data-v="${step - 1}">${t('Back')}</button>` : ''}${last ? '' : `<button class="btn ghost spacer" data-a="month-close-done">${t('Close')}</button>`}</footer>`;
}
