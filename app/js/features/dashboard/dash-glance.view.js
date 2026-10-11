/* Dorax Finance — the summary on a computer, at a glance (owner, 2026-10-11, after the Plan: "do something similar to the summary; feel free to add
   or remove sections or info; make sure the user gets the most out of the summary at a glance").
   Under the month's figures, the parts three to a row (two on a narrower window), each one short enough that two rows fit in one screen:
     how much can be spent a day, what is due, the emergency fund; the goals, where the money went, the insight of the day.
   Each card says its one thing and opens the rest: "You can spend" opens how it was worked out, "To do" shows the next four and the way to the
   Plan, the categories show the five largest. What is not used day to day (the month by month chart, the funds, the latest transactions) waits in
   "Reorder the dashboard", one click away, each with its eye (features/phone/phone.summary.js: DASH_HIDDEN); a line at the foot names them.
   The accounts' cards and the latest transactions, when shown, take the whole width. Styles: css/screens/dash-glance.css. */
const DASH_FULL = ['accounts', 'recent'];
function pcGlance(parts) {
  const ids = dashOrder().filter(id => parts[id]), hid = dashHidden(), on = ids.filter(id => !hid.includes(id)), off = ids.filter(id => hid.includes(id));
  UI.dashShown = ids;      // what the list offers: every part with something to show, hidden or not
  const out = []; let row = [];
  const flush = () => { if (row.length) out.push(`<div class="dash-grid" data-n="${row.length}">${row.join('')}</div>`); row = []; };
  for (const id of on) { if (DASH_FULL.includes(id)) { flush(); out.push(parts[id]); } else row.push(parts[id]); }
  flush();
  return out.join('') + (off.length ? `<button class="dash-more" data-a="dash-order" aria-haspopup="dialog">${icon('plus')}<span>${t('Also for the summary: {list}', { list: esc(off.map(partName).join(', ')) })}</span></button>` : '');
}
