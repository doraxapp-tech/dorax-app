/* Dorax Finance — asking, once, whether this device should get notifications.
   2026-10-07 (owner: "create a notification a little after the onboarding so the person turns notifications on").
   A moment after the first-time setup (or, for an account that was never asked on this device, a moment after a screen opens), a notice asks.
   "Turn on" does what the profile's button does (features/reminders/push.js): it has to be the person's own tap, because a browser shows its
   permission box only in answer to one. "Not now" puts it away; the profile keeps the switch. It is asked once per device, and only where the
   answer can still be yes: not where notifications are already on, blocked in the browser, or impossible.
   On an iPhone in a browser tab notifications cannot work yet (Apple allows them only from the Home Screen): there the notice says so and its
   button shows how to add Dorax to the Home Screen (features/install). */
const PUSH_ASK_KEY = 'dorax-push-asked';
let pushAskedNow = false;
function pushAsked() { if (pushAskedNow) return true; try { return localStorage.getItem(PUSH_ASK_KEY) === '1'; } catch (e) { return false; } }
function pushAskDone() { pushAskedNow = true; try { localStorage.setItem(PUSH_ASK_KEY, '1'); } catch (e) { /* asked again next visit, where the device keeps nothing */ } }
/** 'off' (it can be turned on here), 'install' (an iPhone that has to add the app first) or null (nothing to ask). */
async function pushAskDue() {
  if (pushAsked()) return null;
  const st = await PUSH.status();
  return st === 'off' || st === 'install' ? st : null;
}
/** The notice (drawn by curioCard, features/ahead/curios.view.js, in the corner the other notices use). */
function pushAskCard(c) {
  const ios = c.st === 'install';
  return `<aside class="curio nudge" id="curio" role="status" aria-label="${t('Notifications')}"><span class="fl-ico">${icon('bell')}</span><div class="grow"><b>${t('Want a heads-up before a bill is due?')}</b>
      <p>${ios ? t('Dorax can notify this iPhone before a bill’s due day, on the day, and if it is late. Apple allows that only once Dorax is on your Home Screen.') : t('Dorax can send a notification to this device before a bill’s due day, on the day, and if it is late. In your profile you choose what it reminds you of.')}</p>
      <div class="row"><button class="btn sm primary" data-a="push-ask-yes">${ios ? t('Show me how') : t('Turn on notifications')}</button><button class="btn sm ghost" data-a="push-ask-no">${t('Not now')}</button></div></div>
    <button class="btn ghost sm x" data-a="push-ask-no" aria-label="${t('Close')}">${icon('x')}</button></aside>`;
}
