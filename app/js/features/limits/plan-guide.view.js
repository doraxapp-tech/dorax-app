/* Dorax Finance — "Plan your month": a short guide that teaches, by doing it, that each category can have a monthly cap.
   Owner, 2026-10-10, on Mobills: "when the person is going to put in a fixed cost, first they have to put a spending limit on the categories. I like it
   because it teaches the person that this can be done without saying it; in ours, how do we guide the person to know that? I myself didn't know, and
   the web app didn't even recommend it, knowing how important it is to have a spending limit. That in turn needs an income, and it asks what
   percentage of your salary you want to save each month."
   Three steps and an ending, on the whole screen of a phone and as a card in the middle of a computer:
     1. what comes in: the Plan's income for the month, or one figure that becomes the Plan's income row;
     2. what you keep: a share of that income (state.plan.savePct), with the goals' monthly amounts beside it;
     3. how much to spend on each category: one field per category (its limit, or the place a limit can go), with the average of the last months
        under each, and what has no job yet worked out as it is typed (what comes in, less the bills, less what is kept, less these limits);
     4. done: the month as planned, and the alerts at 80%.
   Each step keeps what it asks when the person moves on, so leaving halfway keeps what was said. Where it is offered: the Plan's limits card (while
   the side has none, and "Plan again" after), the first "New fixed cost" of a side with no limit (with "Only add the fixed cost"), the Plan's first
   visit, the first steps in the profile, the last screen of the account's first setup, the overview of limits, and Help.
   Clicks and fields: plan-guide.actions.js. Styles: css/screens/plan-guide.css. Texts: i18n/text/plan-guide.js. */
const PG_PCTS = [10, 15, 20, 30];
const pgKey = x => x.cat.id + '|' + limKey(x);
/** The rows of step 3: in each expense category its limits, or the one place its limit would go (core/limits.js: limitDefault). */
function pgRows() {
  const ym = limYm(), out = [];
  for (const c of B().categories.filter(k => !k.income)) {
    const ts = limitTargets(B(), c, ym); if (!ts.length) continue;
    const set = ts.filter(x => x.line && planValue(B(), x.line, ym) > 0);
    const first = limitDefault(ts, B(), ym);
    if (set.length) set.forEach(x => out.push(x)); else if (first && !(first.empty && !first.sub)) out.push(first);      // a whole whose parts are all bills counts almost nothing: not offered
  }
  return out;
}
/** What the guide's share keeps, worked out as it is typed: the larger of the goals' plan and that share of the income. */
const pgPct = d => { const n = parseInt(String(d.draft.pct || '').replace(/\D/g, ''), 10); return isNaN(n) ? 0 : Math.min(90, n); };
function pgSaving(d, mp) { const p = pgPct(d); return { pct: p, saving: Math.max(mp.goals, Math.round(mp.income * p / 100)) }; }
/** What step 3 leaves without a job, from the fields as typed: income, less the bills that stay bills, less what is kept, less the limits typed. */
function pgFree(d) {
  const mp = monthPlan(B(), limYm()), sv = pgSaving(d, mp), rows = pgRows(); let typed = 0, freed = 0;
  for (const x of rows) { const v = typedAmount(String(d.draft.rows[pgKey(x)] || '')) || 0; if (v > 0) { typed += v; if (x.bill) freed += planValue(B(), x.bill, limYm()); } }
  const billsLeft = mp.bills - freed, toSpend = mp.income - billsLeft - sv.saving;
  return { mp, sv, billsLeft, toSpend, typed, free: toSpend - typed };
}
const pgSpendSay = f => t('{income} comes in, less {bills} in fixed bills and {saving} kept', { income: limMoney(f.mp.income), bills: limMoney(f.billsLeft), saving: limMoney(f.sv.saving) });
const pgFreeSay = f => f.free >= 0 ? `${t('Not assigned yet')}: <b class="num">${limMoney(f.free)}</b>` : `<span class="neg">${t('Over by {amount}', { amount: `<b class="num">${limMoney(-f.free)}</b>` })}</span>`;
const pgHead = (n, title, lead) => `<p class="pg-step">${t('Step {n} of 3', { n })}</p><h3 class="pg-h" id="pg-h" tabindex="-1">${title}</h3>${lead ? `<p class="pg-lead">${lead}</p>` : ''}`;
function planGuideDrawer(d) {
  const step = d.step || 0, ym = limYm(), mp = monthPlan(B(), ym), x = d.draft, err = d.error ? errBanner(d.error) : '';
  if (step === 0) {
    const rows = payRows(B(), +ym.slice(0, 4)).filter(r => (r.values[+ym.slice(5) - 1] || 0) > 0);
    const body = mp.income
      ? `<div class="pg-big num">${limMoney(mp.income)}</div><ul class="pg-inc">${rows.map(r => `<li><span>${esc(r.name)}</span><span class="num">${limMoney(r.values[+ym.slice(5) - 1])}</span></li>`).join('')}</ul>
         <p class="note">${t('From your Plan.')} <button class="linkbtn" data-a="pg-income-plan">${t('Change it in the Plan')}</button></p>`
      : `<div class="form-grid">${fld('pg-income', tcur('Each month (R$)'), `<input type="text" id="pg-income" value="${esc(x.income)}" data-c="draft" data-k="income" inputmode="decimal" class="num" placeholder="0" autocomplete="off" enterkeyhint="next">`, 'full')}</div>
         <p class="note">${t('Your salary and any other money that comes in every month. In the Plan you can split it into two payments.')}</p>`;
    return `<div class="body pg">${err}${pgHead(1, t('What comes in each month'), mp.income ? '' : t('Everything starts here: the limits come out of what you earn.'))}${body}</div>
      <footer><button class="btn primary" data-a="pg-next">${t('Next')}</button>${d.fromLine ? `<button class="btn ghost" data-a="pg-only-line">${t('Only add the fixed cost')}</button>` : ''}<button class="btn ghost spacer" data-a="close">${t('Not now')}</button></footer>`;
  }
  if (step === 1) {
    const sv = pgSaving(d, mp);
    return `<div class="body pg">${err}${pgHead(2, t('How much do you want to keep each month?'), t('You keep it first; what is left is for spending.'))}
      <div class="pg-pct">${fld('pg-pct', t('Share of what comes in (%)'), `<input type="text" id="pg-pct" value="${esc(x.pct)}" data-c="pg-pct" data-live="1" inputmode="numeric" class="num" placeholder="0" autocomplete="off" enterkeyhint="next">`)}
        <div class="pg-chips" role="group" aria-label="${t('Share of what comes in (%)')}">${PG_PCTS.map(p => `<button type="button" class="chip-btn${String(sv.pct) === String(p) && x.pct !== '' ? ' on' : ''}" data-a="pg-pct" data-v="${p}" aria-pressed="${String(sv.pct) === String(p) && x.pct !== ''}">${p}%</button>`).join('')}</div></div>
      <p class="pg-say" id="pg-save-say" aria-live="polite">${pgSaveSay(d)}</p>
      ${mp.goals ? `<p class="note">${t('Your goals already set aside {amount} a month; the larger of the two counts.', { amount: limMoney(mp.goals) })}</p>` : ''}</div>
      <footer><button class="btn primary" data-a="pg-next">${t('Next')}</button><button class="btn ghost spacer" data-a="pg-back">${t('Back')}</button></footer>`;
  }
  if (step === 2) {
    const rows = pgRows(), f = pgFree(d), anyAvg = rows.some(r => limitAverage(B(), r, ym, BCUR()));
    const row = (r, i) => { const avg = limitAverage(B(), r, ym, BCUR()), k = pgKey(r), sub = r.bill ? t('now a bill of {amount}', { amount: limMoney(planValue(B(), r.bill, ym)) }) : avg ? t('average {amount}', { amount: limMoney(avg.amount) }) : '';
      return `<li class="pg-row"><label for="pg-r-${i}">${limDot(r.cat, r.sub)}<span class="grow"><b>${esc(r.sub ? r.name : limLabel(r))}</b><small>${esc(r.sub ? r.cat.name : '')}${r.sub && sub ? ' · ' : ''}${sub}</small></span></label>
        <input type="text" id="pg-r-${i}" value="${esc(x.rows[k] || '')}" data-c="pg-row" data-k="${esc(k)}" data-live="1" inputmode="decimal" class="num" placeholder="0" autocomplete="off"${avg ? ` data-avg="${avg.amount}"` : ''}></li>`; };
    return `<div class="body pg">${err}${pgHead(3, t('How much to spend on each category'), '')}
      <div class="pg-left"><span>${t('To spend this month')}</span><b class="num" id="pg-to-spend">${limMoney(f.toSpend)}</b><small id="pg-to-spend-say">${pgSpendSay(f)}</small></div>
      ${anyAvg ? `<button type="button" class="btn sm ghost pg-avg" data-a="pg-avg">${t('Use my averages')}</button>` : ''}
      <ul class="pg-rows">${rows.map(row).join('')}</ul>
      <p class="pg-free" id="pg-free" aria-live="polite">${pgFreeSay(f)}</p></div>
      <footer><button class="btn primary" data-a="pg-save">${t('Save limits')}</button><button class="btn ghost spacer" data-a="pg-back">${t('Back')}</button></footer>`;
  }
  return `<div class="body pg pg-end"><span class="pg-ok">${icon('check')}</span><h3 class="pg-h" id="pg-h" tabindex="-1">${t('Your month has a plan')}</h3>
      ${limMonth(mp)}
      <p class="note">${reminderOptions(S).budgets ? t('Dorax lets you know when a category reaches 80% of its limit, and if it goes over.') : t('Alerts for limits are off in your profile, under Reminders.')}</p></div>
    <footer><button class="btn primary" data-a="pg-see">${t('See my limits')}</button><button class="btn ghost spacer" data-a="close">${t('Close')}</button></footer>`;
}
/** Step 2's line under the share: what it keeps a month. */
function pgSaveSay(d) {
  const mp = monthPlan(B(), limYm()), sv = pgSaving(d, mp);
  return mp.income ? (sv.pct ? t('{pct}% is {amount} a month.', { pct: sv.pct, amount: `<b class="num">${limMoney(Math.round(mp.income * sv.pct / 100))}</b>` }) : t('Type a share, or tap one.')) : '';
}
