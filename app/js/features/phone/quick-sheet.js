/* Dorax Finance — the list the round + of a phone opens (app/overlay.js: quickSheet).
   Owner, 2026-10-10: "on the phone the middle button is out of control, it has too many buttons; filter them by tab". v149 made it three parts
   (the three recorded from anywhere, the screen's own, "All actions" folded). Owner, 2026-10-11: "the + button still has too many actions, leave
   only three: EXPENSE, INCOME, TRANSFER". So the list is a title and three big buttons side by side, the same on every screen and on both sides:
   + then "Expense" is always the same two taps. The focus starts on the expense.
   The rest is still one tap away where it belongs: the summary's row of round buttons keeps every one of them (phone.view.js: quickRow), paying a
   bill is on Plan, a goal on Goals, a statement on Imports. The things themselves and what each does: phone.view.js (quickItems) and
   phone.actions.js ('quick-go'). Styles: css/components/quick-sheet.css. */
const QUICK_BASE = ['expense', 'income', 'transfer'];
/** Where the focus starts when the list opens: the expense (phone.actions.js, quick). */
const quickFirst = () => document.querySelector('.sheet.quick .quick-base button') || document.querySelector('.sheet.quick button');
/** The three, in short words beside their icons; a screen reader hears what each does in full. */
const quickShort = (v, co) => ({ expense: co ? t('Cost') : t('Expense'), income: co ? t('Received') : t('Income'), transfer: t('Transfer') }[v]);
function quickSheet() {
  const co = UI.space === 'business', by = Object.fromEntries(quickItems().map(x => [x[0], x])), base = QUICK_BASE.filter(k => by[k]).map(k => by[k]);
  return `<div class="scrim" data-a="close"></div><div class="sheet quick" role="dialog" aria-label="${t('Add')}"><div class="grab" aria-hidden="true"></div><h2>${t('What do you want to do?')}</h2>
    <div class="quick-base" role="group" aria-label="${t('Record')}">${base.map((x, i) => `<button data-a="quick-go" data-v="${x[0]}" aria-label="${esc(x[2])}" style="--i:${i}"><span class="fl-ico">${icon(x[1])}</span><span>${quickShort(x[0], co)}</span></button>`).join('')}</div></div>`;
}
