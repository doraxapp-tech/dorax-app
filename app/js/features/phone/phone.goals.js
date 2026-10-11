/* Dorax Finance — Savings & goals on a phone (owner, 2026-10-08: "in goals, of the 4 KPIs make the total bigger, 100% wide, with a bigger number,
   and the other 3 smaller under it, with horizontal scroll if needed. Under them 3 buttons, Create, Contribute, Withdraw: pressing one, a goal is
   chosen from the list to make the change. The goal cards under the buttons, with only the goal's name, the 'on plan' text and its figures; a tap
   opens the details with everything. Remove the savings hand-out from the phone. Goal: simplicity: on the phone the web app carries a lot of
   visual load, the actions are not very clear, there is a lot to read and digest").
   The computer's version is viewGoals (features/goals/goals.view.js); this replaces its top on a phone, and the monthly plan and "where the money
   is" stay under it as they were. The details panel (goalViewDrawer) keeps everything a card no longer says. */

/** The top of the screen: the total, the month's three figures as a row to swipe, the three actions, the goals as cards to tap. */
function phoneGoalsTop(open, closed, ym) {
  const d = distribution(B(), ym), total = sum(B().goals.filter(g => g.status !== 'archived').map(g => goalSaved(B(), g.id))), bare = fmt.month(ym, 'bare');
  return `<section class="card g-total"><span class="label"><span>${t('Set aside in goals and funds')}</span>${hint('goalSaved')}</span><span class="value num">${fmt.money(total, BCUR())}</span></section>
  <section class="kpis g-mini" aria-label="${fmt.month(ym)}">
    ${statTile(t('Plan for {month}', { month: bare }), fmt.money(d.planned, BCUR()), '', '')}
    ${statTile(t('Recorded in {month}', { month: bare }), fmt.money(d.done, BCUR()), '', '')}
    ${statTile(esc(B().remainderLabel), `<span class="${d.remainder < 0 ? 'neg' : ''}">${fmt.money(d.remainder, BCUR())}</span>`, '', '')}</section>
  <div class="g-acts" role="group" aria-label="${t('Goals and funds')}">
    <button class="btn" data-a="goal-new">${icon('plus')}${t('Create')}</button>
    <button class="btn primary" data-a="goal-pick" data-dir="in">${icon('coins')}${t('Contribute')}</button>
    <button class="btn" data-a="goal-pick" data-dir="out">${icon('wallet')}${t('Withdraw')}</button></div>
  <h2 class="sec">${t('Goals and funds')}</h2>
  <div class="g-list">${open.filter(g => !isYearly(g)).map(goalItem).join('') || `<div class="card"><div class="empty">${t('No active goals.')}</div></div>`}</div>
  ${closed.length ? `<div><button class="btn sm ghost" data-a="toggle-closed">${UI.showClosed ? t('Hide completed and archived') : t('Show completed and archived ({n})', { n: closed.length })}</button></div>${UI.showClosed ? `<div class="g-list">${closed.map(goalItem).join('')}</div>` : ''}` : ''}
  ${yearlySection()}`;
}
/** A goal as a card to tap: its name and how it stands against the plan, what is saved (of the target), the bar and how much is left. The date
    it is reached, the account, the buttons and the facts are in the details it opens. */
function goalItem(g) {
  const st = goalStatus(B(), g, B().today), live = g.status === 'active';
  return `<button class="card g-item${live ? '' : ' off'}${flashed(g.id)}" data-a="goal-open" data-id="${g.id}">
    <span class="g-top"><b>${esc(g.name)}</b>${goalChip(g, st)}${icon('right')}</span>
    <span class="g-amt num">${fmt.money(st.saved, BCUR())}${st.target !== null ? ` <span class="muted">/ ${fmt.money(st.target, BCUR(), { trim: true })}</span>` : ''}</span>
    ${st.target !== null ? `${meter(st.pct, 'go')}<span class="note">${fmt.pct(st.pct)}${st.remaining ? ' · ' + t('{amount} to go', { amount: fmt.money(st.remaining, BCUR()) }) : ''}</span>` : ''}
    ${g.accountId && acct(g.accountId) ? '' : `<span class="note g-no-acct">${t('Choose where it is kept')}</span>`}</button>`;      // a goal with no account yet: said on its card, chosen in its details
}
/** Which goal a contribution or a withdrawal is for: the goals that can take one (a withdrawal only from one with money in it). */
const goalPickList = dir => B().goals.filter(g => g.status === 'active' || (dir === 'out' && g.status === 'paused')).filter(g => dir === 'in' || goalSaved(B(), g.id) > 0);
function goalPickSheet() {
  const dir = UI.goalPick === 'out' ? 'out' : 'in';
  return `<div class="scrim" data-a="close"></div><div class="sheet g-pick" role="dialog" aria-label="${dir === 'out' ? t('Withdraw from which one?') : t('Contribute to which one?')}"><div class="grab" aria-hidden="true"></div>
    <h2>${dir === 'out' ? t('Withdraw from which one?') : t('Contribute to which one?')}</h2>
    <div class="g-pick-list">${goalPickList(dir).map(g => { const st = goalStatus(B(), g, B().today); return `<button data-a="goal-pick-go" data-id="${g.id}" data-dir="${dir}"><span class="grow"><b>${esc(g.name)}</b><small class="num">${fmt.money(st.saved, BCUR())}${st.target !== null ? ' / ' + fmt.money(st.target, BCUR(), { trim: true }) : ''}</small></span>${icon('right')}</button>`; }).join('')}</div></div>`;
}
const PHONE_GOAL_ACTIONS = {
  /** Contribute or Withdraw: one goal to choose goes straight to its panel; more open the list; none says why. */
  'goal-pick'(ds) {
    const dir = ds.dir === 'out' ? 'out' : 'in', list = goalPickList(dir);
    if (!list.length) return toast(dir === 'out' ? t('No goal has money to withdraw yet.') : t('No active goals.'));
    if (list.length === 1) return GOALS_ACTIONS['goal-move']({ id: list[0].id, dir });
    UI.goalPick = dir; UI.sheet = 'goal-pick'; renderOverlay(); const el = document.querySelector('.sheet.g-pick button'); if (el) el.focus({ preventScroll: true });
  },
  'goal-pick-go'(ds) { UI.sheet = false; UI.goalPick = null; GOALS_ACTIONS['goal-move']({ id: ds.id, dir: ds.dir }); },
};
