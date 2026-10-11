/* Dorax Finance — the list the round + of a phone opens (app/overlay.js: quickSheet).
   Owner, 2026-10-10: "on the phone the middle button is out of control, it has too many buttons; filter them by tab, show the ones relevant to the tab
   the person is looking at, or find a better solution if there is one". Eleven things to do, all at once, on every screen, became three parts:
     - what this screen is for, two or three things ("In Plan": pay a bill, a fixed cost, a spending limit), with the screen's own "new" first when it
       has one (Investments: record a movement), and adding an account first while the side has none;
     - "All actions", folded: the rest, so nothing is lost, one tap away;
     - what is recorded from anywhere: an expense, money in, a transfer, three side by side at the foot of the list, right over the +, held there
       while the list scrolls. The list grows upwards from the foot, so the foot is the one place that never moves: + then "Expense" is the same two
       taps on every screen. It is also where the focus starts, on the expense.
   The summary's row of round buttons keeps all of them (phone.view.js: quickRow). The things themselves and what each does: phone.view.js
   (quickItems, quickList) and phone.actions.js ('quick-go'). Styles: css/components/quick-sheet.css. */
const QUICK_BASE = ['expense', 'income', 'transfer'];
/** Where the focus starts when the list opens: the expense (phone.actions.js, quick). */
const quickFirst = () => document.querySelector('.sheet.quick .quick-base button') || document.querySelector('.sheet.quick button');
/** What each screen is for. A screen not named here gets the summary's. */
const QUICK_FOR = { dashboard: ['pay', 'save', 'import'], transactions: ['import', 'account'], plan: ['pay', 'cost', 'limit'], goals: ['save', 'goal'], accounts: ['account', 'import'],
  reports: ['limit', 'import'], recurring: ['cost', 'pay'], categories: ['limit'], imports: ['import', 'account'], investments: [] };
/** The three that are always there, in short words beside their icons. */
const quickShort = (v, co) => ({ expense: co ? t('Cost') : t('Expense'), income: co ? t('Received') : t('Income'), transfer: t('Transfer') }[v]);
/** The parts: always, this screen's, the rest. */
function quickParts() {
  const all = quickList(), by = Object.fromEntries(all.map(x => [x[0], x])), co = UI.space === 'business';
  const none = co ? !bookAccounts().length : !personal().length;
  const want = [...(none ? ['account'] : []), ...(by.main ? ['main'] : []), ...(QUICK_FOR[UI.route] || QUICK_FOR.dashboard)];
  const here = [...new Set(want)].filter(k => by[k] && !QUICK_BASE.includes(k)).map(k => by[k]);
  return { base: QUICK_BASE.filter(k => by[k]).map(k => by[k]), here, rest: all.filter(x => !QUICK_BASE.includes(x[0]) && !here.includes(x)), co };
}
const quickBtn = (x, i, wide) => `<button data-a="quick-go" data-v="${x[0]}"${wide ? ' class="wide"' : ''} style="--i:${i}"><span class="fl-ico">${icon(x[1])}</span><span>${x[2]}</span></button>`;
const quickGrid = (xs, from) => `<div class="quick-grid">${xs.map((x, i) => quickBtn(x, from + i, x[0] === 'main' || (i === xs.length - 1 && xs.filter(y => y[0] !== 'main').length % 2 === 1))).join('')}</div>`;
function quickSheet() {
  const p = quickParts(), open = !!UI.quickAll, where = routeLabel(UI.route);
  return `<div class="scrim" data-a="close"></div><div class="sheet quick" role="dialog" aria-label="${t('Add')}"><div class="grab" aria-hidden="true"></div><h2>${t('What do you want to do?')}</h2>
    ${p.here.length ? `<h3 class="quick-h">${t('In {screen}', { screen: where })}</h3>${quickGrid(p.here, 0)}` : ''}
    ${p.rest.length ? `<button class="quick-all" data-a="quick-all" aria-expanded="${open}" aria-controls="quick-rest">${open ? t('Fewer actions') : t('All actions')}${icon(open ? 'up' : 'down')}</button>
      <div id="quick-rest"${open ? '' : ' hidden'}>${open ? quickGrid(p.rest, p.here.length) : ''}</div>` : ''}
    <div class="quick-base" role="group" aria-label="${t('Record')}">${p.base.map((x, i) => `<button data-a="quick-go" data-v="${x[0]}" aria-label="${esc(x[2])}" style="--i:${i}"><span class="fl-ico">${icon(x[1])}</span><span>${quickShort(x[0], p.co)}</span></button>`).join('')}</div></div>`;
}
const QUICK_SHEET_ACTIONS = {
  /** "All actions": the rest, folded in the same list. */
  'quick-all'() { UI.quickAll = !UI.quickAll; renderOverlay(); const el = document.querySelector('.quick-all'); if (el) el.focus({ preventScroll: true }); if (UI.quickAll) { const r = $('quick-rest'); if (r) r.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } },
};
