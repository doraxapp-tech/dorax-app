/* Dorax Finance — the app's amounts, shown or hidden (owner, 2026-10-08: "the household's net balance with an eye beside it, to show or not the
   app's numbers"). Kept on this device, like a banking app's own "hide balances": somebody looking over a shoulder sees ••••• in place of every
   amount. Fields keep their figures (they are being typed), and what goes into a file (the calendar, a backup, an OFX) is written in full: set
   fmt.raw around it.
   It wraps fmt (ui/format.js) from outside rather than changing it, because format.js is also built into the server's reminders function
   (tools/build-functions.js), which has no eye and must not need to be deployed again for it. */
const NUMS_KEY = 'dorax-hide-nums';
let numsHide = (() => { try { return localStorage.getItem(NUMS_KEY) === '1'; } catch (e) { return false; } })();
const numsHidden = () => numsHide && !fmt.raw;
function numsSet(hide) { numsHide = !!hide; try { if (hide) localStorage.setItem(NUMS_KEY, '1'); else localStorage.removeItem(NUMS_KEY); } catch (e) { /* this visit only */ } }
(() => {
  const mark = cur => (SYMBOL[cur || BASE_CURRENCY] || cur) + ' •••••', money = fmt.money, axis = fmt.axis, unit = fmt.unit;
  fmt.money = function (cents, cur, opt) { return numsHidden() ? ((opt || {}).bare ? '•••••' : mark(cur)) : money.call(fmt, cents, cur, opt); };
  fmt.axis = function (cents) { return numsHidden() ? '•' : axis.call(fmt, cents); };
  fmt.unit = function (u, cur) { return numsHidden() ? mark(cur) : unit.call(fmt, u, cur); };
})();
