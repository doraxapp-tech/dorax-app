/* Dorax Finance — the household's summary on a computer in the summary's look (v199, owner, 2026-10-12: "push updates a la versión de ordenador",
   then "Todo, como el teléfono", with the side bar in the forest). The same parts as the phone's (features/phone/bosque.js), laid out for a wide
   screen:
     - the forest block under the top bar: the greeting and the household's net balance on the left, "You can spend" on the right with its lime strip
       at its foot; the grey page rises over the block's foot, as on the phone;
     - two columns on the page: the four round buttons, the accounts, what there is to pay, and the month's spending with the latest transactions on
       the left; the days of freedom beside the goals, and the insight of the day as a computer has it (its facts to page through), on the right;
     - the notices about the data after them, as on the phone.
   A month already over: its notice, the accounts and the latest transactions. Styles: css/look/look-land-desk.css. */
/** How wide the left column is on a page whose area is `work` px wide: the page's margins (css/look/look-land-desk.css, --bq-gut, with the 1400 px
    page of base/shell.css), less the right column (1 part to its 1.75, 300 px at least) and the 28 px between them. The chart in it is drawn that wide. */
const bqDeskMainW = work => { const gut = Math.max(32, (work - 1400) / 2 + 32), inner = work - 2 * gut, side = Math.max(300, (inner - 28) / 2.75); return Math.max(320, Math.round(inner - 28 - side)); };
// a window made wider or narrower: the summary is drawn again for its new columns (once the resizing stops)
let bqDeskT = 0, bqDeskW = 0;
addEventListener('resize', () => { clearTimeout(bqDeskT); bqDeskT = setTimeout(() => { const w = ((document.querySelector('.work') || {}).clientWidth) || 0; if (typeof bosqueOn === 'function' && bosqueOn() && !isPhone() && !UI.drawer && !UI.sheet && Math.abs(w - bqDeskW) > 24) { bqDeskW = w; render(); } }, 160); });
function bqHomeDesk(d) {
  bqDeskW = ((document.querySelector('.work') || {}).clientWidth) || 0;
  const notes = `${firstSteps()}${d.inProgress ? monthCloseCard() : ''}${companyAsk()}${d.openNote}`;
  UI.dashShown = [];      // no "Reorder the dashboard" in this look, as on the phone
  const top = `<section class="bq-dhero"><div class="bq-dh-l">${greeting()}<div class="bq-dbal">${barBalance()}</div></div>${d.inProgress ? `<div class="bq-dh-r">${bqFree()}</div>` : ''}</section>`;
  if (!d.inProgress) return `${top}${d.pastNote}<div class="bq-dgrid one"><div class="bq-dcol">${bqAccounts()}${bqHomeMoves()}</div></div>${notes}`;
  return `${top}<div class="bq-dgrid"><div class="bq-dcol">${bqActions()}${bqAccounts()}${bqTodo()}${bqHomeMoves()}</div><div class="bq-dcol side">${bqPair()}${insightCard()}</div></div>${notes}`;
}
